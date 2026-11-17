import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { ViceHud, VicePrefs } from '../types'
import { hudAlt, hudSvg, money, PAST, payout, pick, starsText, VERBS, wordFor } from './hud'
import { COLOR_PROBLEMS, COLORS, GLASS, SCENE_MOVING, SCENE_STILL } from './look'
import { SCENE } from './scene'

// Vice Sunset: a GTA VI-inspired look for Claude Code. An animated Vice City
// sunset behind the app, a neon palette, a wanted-level HUD above the prompt,
// mission toasts and heist-flavored spinner words. The art is original.

const HUD0: ViceHud = { cash: 0, wanted: 0, missions: 0, lastGain: 0 }
const PREFS0: VicePrefs = { theme: true, motion: true, hud: true, toasts: true, verbs: true }

// Change a tag when its fields change: it declines what an earlier version stored.
const hud = atom({ plugin: 'vice-sunset', key: 'hud' } as const, HUD0, { shape: 'hud-1' })
const prefs = atom({ plugin: 'vice-sunset', key: 'prefs' } as const, PREFS0, { shape: 'prefs-1' })

// The same scene with every animation held where it stands.
const STILL = SCENE.replace('</style>', '*{animation-play-state:paused!important}</style>')

const PREF_NAMES = ['theme', 'motion', 'hud', 'toasts', 'verbs'] as const
type PrefName = (typeof PREF_NAMES)[number]
const LABEL: Record<PrefName, string> = {
  theme: 'Vice Sunset look',
  motion: 'Scene animation',
  hud: 'Wanted-level HUD',
  toasts: 'Mission toasts',
  verbs: 'Heist spinner words',
}

const USAGE = [
  'Usage:',
  '  /vice                 your stats and settings',
  '  /vice theme [on|off]  the colors and the animated sunset',
  '  /vice motion [on|off] animate the scene, or hold it still',
  '  /vice hud [on|off]    the wanted-level HUD above the prompt',
  '  /vice toasts [on|off] MISSION PASSED / BUSTED / WASTED toasts',
  '  /vice verbs [on|off]  heist words on the spinner',
  '  /vice reset           empty the bank and clear your record',
].join('\n')

const isPrefName = (s: string): s is PrefName => (PREF_NAMES as readonly string[]).includes(s)

const cleanPrefs = (o: unknown): Partial<VicePrefs> => {
  const out: Partial<VicePrefs> = {}
  if (o === null || typeof o !== 'object') return out
  for (const k of PREF_NAMES) {
    const v = (o as Record<string, unknown>)[k]
    if (typeof v === 'boolean') out[k] = v
  }
  return out
}

const isOurs = (name: string, plugin: string) => plugin === name || plugin.split('@')[0] === 'vice-sunset'

// What the app said the last time this module set the look, for /vice.
let lastLook = 'not set yet'

async function applyTheme($: EngineInterface) {
  const p = await read($, prefs)
  if (!p.theme) return
  const set = await $.theme.set({
    colors: COLORS,
    backdrop: { scene: p.motion ? SCENE_MOVING : SCENE_STILL, glass: GLASS },
  })
  lastLook = set.isDrawn ? 'drawn' : `not drawn: ${set.reason}`
  if (!set.isDrawn) $.ui.log(`vice-sunset: the look is not drawn here: ${set.reason}`, { to: 'debug' })
}

async function saveBank($: EngineInterface) {
  const h = await read($, hud)
  await $.store.set('bank', { cash: h.cash, missions: h.missions })
}

export const register: Register = on => {
  // The turn in progress, on the main loop. Module values: a reload restarts them.
  let turnTools = 0
  let turnErrors = 0
  let turnCash = 0
  let verb: string = pick(VERBS)

  on('session.start', async ($, e, next) => {
    try {
      const bank = (await $.store.get('bank')) as { cash?: unknown; missions?: unknown } | undefined
      const cash = Number(bank?.cash ?? 0) || 0
      const missions = Number(bank?.missions ?? 0) || 0
      await update($, hud, h => ({
        ...h,
        cash: Math.max(h.cash, cash),
        missions: Math.max(h.missions, missions),
      }))
      const saved = cleanPrefs(await $.store.get('prefs'))
      await update($, prefs, p => ({ ...p, ...saved }))
      await $.command.register({
        name: 'vice',
        description: 'Vice Sunset: your bank, wanted level and the look\'s switches',
        argumentHint: '[theme|motion|hud|toasts|verbs on|off | reset]',
      })
      const unpainted = COLOR_PROBLEMS.find(line => line.startsWith("Desktop won't paint"))
      if (unpainted !== undefined) $.ui.log(`vice-sunset: ${unpainted}`, { to: 'debug' })
      await applyTheme($)
    } catch (err) {
      $.ui.log(`vice-sunset: start: ${String(err)}`, { to: 'debug' })
    }
    return next(e)
  })

  on('session.end', async ($, e, next) => {
    try {
      await saveBank($)
    } catch {
      // nothing to keep
    }
    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    if (e.agentId === undefined) {
      turnTools = 0
      turnErrors = 0
      turnCash = 0
      verb = pick(VERBS)
      try {
        await update($, hud, h => (h.lastGain === 0 ? h : { ...h, lastGain: 0 }))
      } catch {
        // the HUD waits for the next payout
      }
    }
    return next(e)
  })

  // Every tool call is a step of the job: one that goes through pays out,
  // one that fails or is refused draws heat.
  on('tool.call', async ($, e, next) => {
    const ran = await next(e)
    try {
      turnTools += 1
      if (ran.deny !== undefined || ran.isError === true) {
        turnErrors += 1
        const before = (await read($, hud)).wanted
        await update($, hud, h => ({ ...h, wanted: Math.min(5, h.wanted + 1) }))
        if (before === 4 && (await read($, prefs)).toasts) {
          $.ui.toast('★★★★★  MAXIMUM HEAT  ·  lay low and fix it', { timeoutMs: 4000 })
        }
      } else {
        const pay = payout(String(e.tool))
        turnCash += pay
        await update($, hud, h => ({ ...h, cash: h.cash + pay, lastGain: pay }))
      }
    } catch {
      // the HUD never gets in a tool's way
    }
    return ran
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    const out = await next(e)
    if (e.agentId !== undefined) return out
    try {
      const p = await read($, prefs)
      const toast = (text: string) => {
        if (p.toasts) $.ui.toast(text, { timeoutMs: 3800 })
      }
      if (e.reason === 'aborted') {
        toast('BUSTED  ·  mission called off')
      } else if (e.reason === 'error' || e.reason === 'refusal') {
        await update($, hud, h => ({ ...h, wanted: Math.min(5, h.wanted + 1) }))
        toast('WASTED  ·  the job went sideways')
      } else {
        const bonus = turnTools > 0 ? 250 + 50 * turnTools : 25
        const heat = (await read($, hud)).wanted
        const isClean = turnErrors === 0
        await update($, hud, h => ({
          ...h,
          cash: h.cash + bonus,
          missions: h.missions + 1,
          wanted: isClean ? 0 : h.wanted,
          lastGain: bonus + turnCash,
        }))
        if (turnTools > 0) {
          toast(`MISSION PASSED  ·  +${money(bonus + turnCash)}${isClean && heat > 0 ? '  ·  lost the cops' : ''}`)
        }
      }
      await saveBank($)
    } catch {
      // the bank catches up at the next turn
    }
    return out
  })

  // ---------------------------------------------------------------- drawing

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    const isMine = e.props.scene === SCENE_MOVING || e.props.scene === SCENE_STILL
    if (!isMine || !isOurs($.plugin.name, e.props.plugin)) return next(e)
    if (e.surface !== 'desktop' && e.surface !== 'mobile') return next(e)
    const { Svg } = $.ui.resolve(e)
    return (
      <Svg
        source={e.props.scene === SCENE_STILL ? STILL : SCENE}
        alt="A neon Vice City sunset: palm trees, a striped sun sinking behind the skyline, traffic on the causeway"
        isInteractive
      />
    )
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    if (!(await read($, prefs)).hud) return next(e)
    // Never name a value `h` in a file with JSX: `h` is what the tags compile to.
    const stats = await read($, hud)
    if (e.surface === 'terminal') {
      const { Box, Text } = $.ui.resolve(e)
      return (
        <Box flexDirection="row" gap={2}>
          {stats.wanted > 0 ? (
            <Text color="#ff4f7b">{starsText(stats.wanted)}</Text>
          ) : (
            <Text dimColor>{starsText(0)}</Text>
          )}
          <Text color="#3ddc84" bold>
            {money(stats.cash)}
          </Text>
          {stats.lastGain > 0 && <Text color="#9dffb5">+{money(stats.lastGain)}</Text>}
          <Text dimColor>{e.props.isWorking ? `on a job: ${verb}` : `${stats.missions} missions passed`}</Text>
        </Box>
      )
    }
    const { Svg } = $.ui.resolve(e)
    return <Svg source={hudSvg(stats, e.props.isWorking)} alt={hudAlt(stats)} />
  })

  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    if (e.props.message !== null || !(await read($, prefs)).verbs) return next(e)
    // The desktop names the step it is on (`Creating notes.md`): keep that.
    if (e.surface !== 'terminal' && e.props.word !== 'Working') return next(e)
    return next({ ...e, props: { ...e.props, word: verb } })
  })

  on('ui.render', { component: 'TurnDuration' }, async ($, e, next) => {
    if (!(await read($, prefs)).verbs) return next(e)
    return next({ ...e, props: { ...e.props, word: wordFor(PAST, e.requestId) } })
  })

  // ---------------------------------------------------------------- /vice

  on('command.run', { command: 'vice' }, async ($, e) => {
    const [what = '', value = ''] = e.args.trim().toLowerCase().split(/\s+/)
    if (what === '' || what === 'stats') {
      const h = await read($, hud)
      const p = await read($, prefs)
      const switches = PREF_NAMES.map(k => `${k} ${p[k] ? 'on' : 'off'}`).join(' · ')
      const surfaces = (await $.session.surfaces()).join(', ') || 'nothing yet'
      return {
        text:
          `Vice Sunset  ·  bank ${money(h.cash)}  ·  ${h.missions} missions passed  ·  heat ${starsText(h.wanted)}\n` +
          `Look: ${p.theme ? lastLook : 'off'}  ·  drawing on: ${surfaces}\n` +
          `Switches: ${switches}\n` +
          `/vice help lists the commands.`,
      }
    }
    if (what === 'reset') {
      await update($, hud, () => HUD0)
      await saveBank($)
      return { text: 'Fresh start: $0 in the bank, no missions on record, no heat.' }
    }
    if (isPrefName(what)) {
      const current = (await read($, prefs))[what]
      const isOn = value === 'on' ? true : value === 'off' ? false : !current
      await update($, prefs, p => ({ ...p, [what]: isOn }))
      await $.store.set('prefs', await read($, prefs))
      if (what === 'theme' && !isOn) await $.theme.clear()
      if ((what === 'theme' && isOn) || what === 'motion') await applyTheme($)
      return { text: `${LABEL[what]} ${isOn ? 'on' : 'off'}.` }
    }
    return { text: USAGE }
  })
}
