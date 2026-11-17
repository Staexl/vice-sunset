import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

// The engine beneath the mod, as far as these tests need it.
function world(on: On) {
  mock.store(on)
  const toasts: string[] = []
  const themes: unknown[] = []
  on('command.register', () => ({ value: { command: 'vice' } }))
  on('theme.set', (_, e) => {
    themes.push(e)
    return { value: { isDrawn: true, requestId: 'theme-1' } }
  })
  on('theme.clear', () => ({ value: { isDrawn: false, reason: 'cleared' } }))
  on('ui.toast', (_, e) => {
    toasts.push(e.text)
    return { value: undefined }
  })
  on('ui.log', () => ({ value: undefined }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', (_, e) => ({ text: e.answer }))
  return { toasts, themes }
}

const BAND = {
  plugin: 'vice-sunset',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isCollapsed: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 90,
    scroll: { offset: 0, bodyRows: 10 },
    view: {},
  },
} as const

const done = (turnId: string) =>
  ({ answer: 'done', durationMs: 1200, isAborted: false, turnId, reason: 'answer' }) as const

const START = { cwd: '/', surface: 'desktop', isInteractive: true } as const

const run = (args: string) =>
  ({
    command: 'vice',
    args,
    origin: { kind: 'composer' },
    presentation: { isFullscreen: false, columns: 100 },
  }) as const

test('the session starts in the Vice Sunset look', async ($, on) => {
  const { themes } = world(on)
  await $.session.start(START)

  expect(themes.length).toBe(1)
  expect(JSON.stringify(themes[0])).toContain('"scene":"vice-sunset"')
})

test('a job pays out, a failure draws heat, a clean mission loses the cops', async ($, on) => {
  const { toasts } = world(on)
  let isFailing = false
  on('tool.call', () => (isFailing ? { result: {}, isError: true } : { result: {} }))

  await $.session.start(START)
  await $.turn.start({ text: 'ship it', turnId: 't1' })
  await $.tool.call({ tool: 'Edit', file_path: '/a.ts', old_string: 'a', new_string: 'b' })
  isFailing = true
  await $.tool.call({ tool: 'Bash', command: 'false' })
  await $.turn.complete(done('t1'))

  // Edit $400, then the bonus: $250 + $50 for each of the two calls.
  expect(toasts).toEqual(['MISSION PASSED  ·  +$750'])

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    if (surface === 'terminal') {
      expect((await ui.find({ type: 'Text', text: /^\$/ }))?.text).toBe('$750')
      expect((await ui.find({ type: 'Text', text: /★/ }))?.text).toBe('★☆☆☆☆')
    } else {
      const hud = await ui.find({ type: 'Svg' })
      expect(String(hud?.props.alt)).toBe('Wanted level 1 of 5, $750 in the bank, 1 mission passed')
    }
    await ui.unmount()
  }

  isFailing = false
  await $.turn.start({ text: 'again', turnId: 't2' })
  await $.tool.call({ tool: 'Read', file_path: '/a.ts' })
  await $.turn.complete(done('t2'))

  expect(toasts[1]).toBe('MISSION PASSED  ·  +$360  ·  lost the cops')
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(String((await ui.find({ type: 'Svg' }))?.props.alt)).toBe(
    'Wanted level 0 of 5, $1,110 in the bank, 2 missions passed',
  )
  await ui.unmount()
})

test('an interrupted turn is BUSTED', async ($, on) => {
  const { toasts } = world(on)
  await $.session.start(START)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.turn.complete({ ...done('t1'), isAborted: true, reason: 'aborted' })

  expect(toasts).toEqual(['BUSTED  ·  mission called off'])
})

test('the backdrop is the sunset, held still once motion is off', async ($, on) => {
  world(on)
  await $.session.start(START)
  const backdrop = (scene: string, plugin: string) =>
    ({
      plugin: 'vice-sunset',
      component: 'Backdrop',
      surface: 'desktop',
      props: { scene, plugin, glass: { blur: 22, opacity: 0.7 } },
    }) as const

  let ui = await $.ui.mount(backdrop('vice-sunset', 'vice-sunset'))
  const moving = String((await ui.find({ type: 'Svg' }))?.props.source)
  expect(moving).toContain('prefers-color-scheme:dark')
  expect(moving).not.toContain('animation-play-state:paused!important}</style>')
  await ui.unmount()

  ui = await $.ui.mount(backdrop('vice-sunset-still', 'vice-sunset'))
  expect(String((await ui.find({ type: 'Svg' }))?.props.source)).toContain('animation-play-state:paused!important}</style>')
  await ui.unmount()

  // Another mod's scene is left to that mod.
  ui = await $.ui.mount(backdrop('lagoon', 'other-mod'))
  expect(await ui.find({ type: 'Svg' })).toBe(undefined)
  await ui.unmount()
})

test('/vice switches parts off and on', async ($, on) => {
  const { themes, toasts } = world(on)
  on('tool.call', () => ({ result: {} }))
  on('session.surfaces', () => ({ value: ['desktop'] }))
  await $.session.start(START)

  expect((await $.command.run(run('hud off'))).text).toBe('Wanted-level HUD off.')
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await ui.find({ type: 'Svg' })).toBe(undefined)
  await ui.unmount()

  expect((await $.command.run(run('motion off'))).text).toBe('Scene animation off.')
  expect(JSON.stringify(themes.at(-1))).toContain('"scene":"vice-sunset-still"')

  await $.command.run(run('toasts off'))
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.tool.call({ tool: 'Read', file_path: '/a.ts' })
  await $.turn.complete(done('t1'))
  expect(toasts).toEqual([])

  expect((await $.command.run(run('nonsense'))).text).toContain('Usage:')
  const stats = String((await $.command.run(run(''))).text)
  expect(stats).toContain('missions passed')
  expect(stats).toContain('Look: drawn  ·  drawing on: desktop')
})
