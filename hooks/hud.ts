import type { ViceHud } from '../types'

// ---------------------------------------------------------------- words

/** What the spinner says while a turn runs. */
export const VERBS = [
  'Casing the joint',
  'Hotwiring the ride',
  'Cruising the strip',
  'Laying low',
  'Planning the heist',
  'Cracking the safe',
  'Losing the tail',
  'Tuning the ride',
  'Dodging the heat',
  'Counting the take',
  'Making the drop',
  'Scoping the job',
  'Burning rubber',
  'Calling in a favor',
  'Riding shotgun',
  'Running the getaway',
  'Chasing the sunset',
  'Working the angles',
  'Lining up the score',
  'Weaving through traffic',
  'Watching the mirrors',
  'Taking the causeway',
] as const

/** What closes a turn on the terminal: "<word> for 12s". */
export const PAST = [
  'Cruised',
  'Hustled',
  'Laid low',
  'Pulled the job',
  'Burned rubber',
  'Ran the heist',
  'Rode shotgun',
  'Outran the heat',
  'Cased the joint',
  'Made the drop',
] as const

const hash = (s: string) => {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

/** The same word for the same id, so a line keeps its word when redrawn. */
export const wordFor = (list: readonly string[], id: string): string => list[hash(id) % list.length] ?? ''

export const pick = (list: readonly string[]): string => list[Math.floor(Math.random() * list.length)] ?? ''

// ---------------------------------------------------------------- money

const PAY: Record<string, number> = {
  Write: 600,
  Edit: 400,
  MultiEdit: 500,
  NotebookEdit: 400,
  Bash: 250,
  PowerShell: 250,
  Read: 60,
  Grep: 80,
  Glob: 60,
  WebFetch: 150,
  WebSearch: 150,
  Agent: 1000,
  Task: 1000,
}

/** What a tool call that went through pays. */
export const payout = (tool: string) => PAY[tool] ?? (tool.startsWith('mcp__') ? 200 : 120)

export const money = (n: number) => `$${String(Math.max(0, Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`

export const starsText = (wanted: number) => '★'.repeat(wanted) + '☆'.repeat(5 - wanted)

export const hudAlt = (h: ViceHud) =>
  `Wanted level ${h.wanted} of 5, ${money(h.cash)} in the bank, ${h.missions} mission${h.missions === 1 ? '' : 's'} passed`

// ---------------------------------------------------------------- the HUD

const W = 420
const FONT = `'Arial Black','Segoe UI Black',Impact,sans-serif`

const STYLE = [
  `.cap{fill:rgba(13,6,24,.93);stroke:url(#edge);stroke-width:1.2}`,
  `.hi{stroke:rgba(255,255,255,.09);stroke-width:1}`,
  `.off{fill:rgba(255,255,255,.07);stroke:rgba(255,255,255,.42);stroke-width:1.1;stroke-linejoin:round}`,
  `.on{fill:#fff;stroke:#1a0b22;stroke-width:1.3;stroke-linejoin:round;animation:cop 1.1s steps(1) infinite}`,
  `@keyframes cop{0%{fill:#fff}25%{fill:#ff4766}50%{fill:#fff}75%{fill:#4d8dff}}`,
  `.cash{font:900 16px ${FONT};fill:#8df5a6;stroke:#06140b;stroke-width:3;paint-order:stroke;letter-spacing:.3px}`,
  `.pop{font:900 12.5px ${FONT};fill:#c6ffd4;stroke:#06140b;stroke-width:2.6;paint-order:stroke;opacity:0;animation:pop 2.6s ease-out forwards}`,
  `@keyframes pop{0%{opacity:0;transform:translateY(5px)}14%{opacity:1;transform:translateY(0)}70%{opacity:1}100%{opacity:0;transform:translateY(-5px)}}`,
  `.tag{font:700 10.5px 'Segoe UI','Helvetica Neue',Arial,sans-serif;letter-spacing:1.3px;fill:#ffd1ec;text-anchor:end}`,
  `.dot{fill:#ff2e88;animation:dot .9s ease-in-out infinite alternate}`,
  `@keyframes dot{from{opacity:.3}to{opacity:1}}`,
  `@media (prefers-reduced-motion:reduce){*{animation:none!important}.pop{opacity:1}}`,
].join('')

const starPoints = (cx: number, cy: number) => {
  const pts: string[] = []
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const r = i % 2 === 0 ? 7.6 : 3.3
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`)
  }
  return pts.join(' ')
}

// Arial Black's advances, near enough to place the +$ pop after the cash.
const widthOf = (s: string, size: number) =>
  [...s].reduce((w, c) => w + (c === ',' || c === '.' ? 0.333 : c === ' ' ? 0.333 : 0.667), 0) * size

/**
 * The HUD as one SVG: wanted stars that flash like a patrol car's lights,
 * the bank in money green, a +$ pop for the payout that just landed, and
 * what the crew is up to.
 */
export function hudSvg(h: ViceHud, isWorking: boolean): string {
  const stars = [0, 1, 2, 3, 4]
    .map(i => `<polygon points="${starPoints(18 + i * 19, 15)}" class="${i < h.wanted ? 'on' : 'off'}"/>`)
    .join('')
  const cash = money(h.cash)
  const cashX = 118
  const pop =
    h.lastGain > 0
      ? `<text x="${(cashX + widthOf(cash, 16) + 9).toFixed(1)}" y="19.6" class="pop">+${money(h.lastGain)}</text>`
      : ''
  const tag = isWorking ? 'ON A JOB' : `${h.missions} MISSION${h.missions === 1 ? '' : 'S'}`
  const dot = isWorking ? `<circle cx="${(W - 16 - widthOf(tag, 10.5) * 1.3 - 9).toFixed(1)}" cy="15" r="3.4" class="dot"/>` : ''
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="30" viewBox="0 0 ${W} 30">` +
    `<style>${STYLE}</style>` +
    `<defs><linearGradient id="edge" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#ff2e88"/><stop offset=".55" stop-color="#ffa133"/><stop offset="1" stop-color="#19c8ff"/></linearGradient></defs>` +
    `<rect class="cap" x=".75" y=".75" width="${W - 1.5}" height="28.5" rx="14.25"/>` +
    `<path class="hi" d="M15 2.2H${W - 15}"/>` +
    stars +
    `<text x="${cashX}" y="20.6" class="cash">${cash}</text>` +
    pop +
    dot +
    `<text x="${W - 16}" y="19" class="tag">${tag}</text>` +
    `</svg>`
  )
}
