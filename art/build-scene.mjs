// build-scene.mjs: generates the Vice Sunset backdrop, one animated SVG that
// draws a golden-hour beach in light mode and a neon night in dark mode.
//
//   node art/build-scene.mjs hooks [--preview]      (from the mod's folder)
//
// Writes hooks/scene.ts (the string the mod draws) and, with --preview,
// scene-day.svg and scene-night.svg beside it to look at in a browser
// (delete those two afterwards: they are not part of the mod).
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT = process.argv[2] ?? '.'
const PREVIEW = process.argv.includes('--preview')

const W = 1600
const HT = 900
const H = 640 // the horizon

const f = n => {
  const r = Math.round(n * 10) / 10
  return String(Object.is(r, -0) ? 0 : r)
}
const P = (x, y) => `${f(x)} ${f(y)}`

function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const R = rng(20261117)
const rand = (a, b) => a + (b - a) * R()

// ---------------------------------------------------------------- palette
const DAY = {
  sky0: '#2a8fd2', sky1: '#5cb3e6', sky2: '#a6d7ea', sky3: '#f6d4c2', sky4: '#ffb796', sky5: '#ff9670',
  star: '0',
  sun0: '#fff8da', sun1: '#ffd47e', sun2: '#ff9d5c',
  glow: '#ffd9a3', glowop: '.8',
  cloud: '#fff6ef', cloudop: '.9', cloudlit: '#ffc3a8',
  far: '#a69bc9', farop: '.85',
  city0: '#5f5995', city1: '#47427c',
  win: '.14', neon: '.28', beacon: '.75',
  sea0: '#ffb48f', sea1: '#93d3dc', sea2: '#47aac6', sea3: '#227aa0', sea4: '#14587f',
  refl: '#fff3cf', reflop: '.85', mirror: '.2',
  bridge: '#37436d', lamp: '.35', car: '.5',
  palm: '#1d2244', palmfar: '#353d6a', ring: '#2c335d', rim: '#ffb27c', rimop: '.6',
  heli: '#272c4e', beam: '0', bird: '#2b3056',
  vig: 'rgba(70,25,55,.16)',
  read: 'rgba(255,247,242,.5)',
}
const NIGHT = {
  sky0: '#07041a', sky1: '#1c0b46', sky2: '#4a1471', sky3: '#9e2478', sky4: '#ea3d78', sky5: '#ff8a4f',
  star: '1',
  sun0: '#ffe56e', sun1: '#ff8f45', sun2: '#ff2f7e',
  glow: '#ff5f7e', glowop: '.62',
  cloud: '#3b1657', cloudop: '.82', cloudlit: '#ff6f93',
  far: '#2e1149', farop: '1',
  city0: '#180a2f', city1: '#0b0519',
  win: '.92', neon: '1', beacon: '1',
  sea0: '#f0497a', sea1: '#8b1f6f', sea2: '#3c1053', sea3: '#170927', sea4: '#090313',
  refl: '#ffb65e', reflop: '.95', mirror: '.4',
  bridge: '#0c0518', lamp: '1', car: '1',
  palm: '#0a0412', palmfar: '#180a29', ring: '#1b0c28', rim: '#ff5c8c', rimop: '.65',
  heli: '#0b0514', beam: '.13', bird: '#1b0a24',
  vig: 'rgba(4,0,14,.62)',
  read: 'rgba(12,5,26,.58)',
}
const vars = o => Object.entries(o).map(([k, v]) => `--${k}:${v}`).join(';')

// ---------------------------------------------------------------- sky + stars
const stops = (list) =>
  list.map(([o, v, op]) => `<stop offset="${o}" style="stop-color:var(--${v})${op !== undefined ? `;stop-opacity:${op}` : ''}"/>`).join('')

let stars = ''
for (let i = 0; i < 74; i++) {
  const x = rand(0, W)
  const y = 380 * Math.pow(R(), 1.7)
  const r = rand(0.55, 1.5)
  const tw = R() < 0.45
  stars += tw
    ? `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" class="tw" style="animation-duration:${f(rand(2.6, 6.5))}s;animation-delay:-${f(rand(0, 6))}s"/>`
    : `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" opacity="${f(rand(0.35, 0.95))}"/>`
}

// ---------------------------------------------------------------- clouds
function cloud(cx, cy, rx, ry, dur, delay) {
  let s = `<g class="drift" style="animation-duration:${dur}s;animation-delay:-${delay}s">`
  const parts = 3
  for (let i = 0; i < parts; i++) {
    const dx = (i - 1) * rx * 0.45 + rand(-rx * 0.08, rx * 0.08)
    const k = i === 1 ? 1 : 0.62
    s += `<ellipse cx="${f(cx + dx)}" cy="${f(cy + rand(-ry * 0.3, ry * 0.3))}" rx="${f(rx * 0.62 * k)}" ry="${f(ry * k)}" fill="url(#gCloud)"/>`
  }
  s += `<ellipse cx="${f(cx + rand(-rx * 0.1, rx * 0.1))}" cy="${f(cy + ry * 0.55)}" rx="${f(rx * 0.7)}" ry="${f(ry * 0.45)}" fill="url(#gCloudLit)"/>`
  return s + '</g>'
}
const clouds =
  cloud(430, 236, 280, 15, 130, 20) +
  cloud(1290, 292, 320, 19, 150, 70) +
  cloud(690, 412, 360, 13, 115, 40) +
  cloud(250, 506, 210, 11, 140, 10)
// a thin streak across the sun's face, drawn just in front of it
const sunStreak = cloud(1170, 470, 230, 6, 100, 35)

// ---------------------------------------------------------------- sun
const SX = 1160
const SY = 548
const SR = 166
let bars = ''
for (let y = 470; y < 800; y += 18) bars += `<rect x="${SX - SR - 10}" y="${y}" width="${2 * SR + 20}" height="5.5"/>`

// ---------------------------------------------------------------- skyline
function bldgPath(b) {
  const { x, w, h, type } = b
  const top = H - h
  const r = x + w
  switch (type) {
    case 'stepped':
      return `M${P(x, H + 2)}V${f(top + 22)}H${f(x + w * 0.14)}V${f(top + 11)}H${f(x + w * 0.3)}V${f(top)}H${f(r - w * 0.3)}V${f(top + 11)}H${f(r - w * 0.14)}V${f(top + 22)}H${f(r)}V${f(H + 2)}Z`
    case 'slant':
      return `M${P(x, H + 2)}V${f(top + 20)}L${P(r, top)}V${f(H + 2)}Z`
    case 'slantL':
      return `M${P(x, H + 2)}V${f(top)}L${P(r, top + 20)}V${f(H + 2)}Z`
    case 'round':
      return `M${P(x, H + 2)}V${f(top + w / 2)}A${f(w / 2)} ${f(w / 2)} 0 0 1 ${P(r, top + w / 2)}V${f(H + 2)}Z`
    case 'crown':
      return `M${P(x, H + 2)}V${f(top)}H${f(x + w * 0.25)}V${f(top - 9)}H${f(r - w * 0.25)}V${f(top)}H${f(r)}V${f(H + 2)}Z`
    case 'spire':
      return `M${P(x, H + 2)}V${f(top)}H${f(x + w * 0.46)}V${f(top - 44)}H${f(x + w * 0.54)}V${f(top)}H${f(r)}V${f(H + 2)}Z`
    default:
      return `M${P(x, H + 2)}V${f(top)}H${f(r)}V${f(H + 2)}Z`
  }
}

const env = x => 46 + 250 * Math.exp(-(((x - 760) / 235) ** 2)) + 46 * Math.exp(-(((x - 470) / 70) ** 2))
const types = ['flat', 'flat', 'flat', 'crown', 'slant', 'slantL', 'stepped', 'round']

const near = []
for (let x = 372; x < 1392; ) {
  const w = rand(24, 60)
  const h = env(x + w / 2) * rand(0.72, 1.08)
  near.push({ x, w, h, type: types[Math.floor(R() * types.length)] })
  x += w + rand(-7, 3)
}
// landmarks: the towers the eye lands on
const landmarks = [
  { x: 700, w: 46, h: 304, type: 'spire', beacon: true },
  { x: 846, w: 54, h: 262, type: 'slant', neon: 'c' },
  { x: 948, w: 42, h: 200, type: 'stepped', neon: 'p' },
  { x: 548, w: 60, h: 172, type: 'flat', sign: true },
  { x: 1262, w: 38, h: 92, type: 'round', neon: 'p' },
  { x: 786, w: 34, h: 222, type: 'crown', beacon: true },
  { x: 1068, w: 30, h: 118, type: 'crown', beacon: true },
]
const allNear = [...near, ...landmarks]

const far = []
for (let x = 230; x < 1540; ) {
  const w = rand(20, 52)
  const h = ((30 + 120 * Math.exp(-(((x - 780) / 360) ** 2))) * rand(0.6, 1.2) + 34) * (1 - 0.45 * Math.exp(-(((x - 1160) / 170) ** 2)))
  far.push({ x, w, h, type: R() < 0.2 ? 'slant' : R() < 0.2 ? 'crown' : 'flat' })
  x += w + rand(-4, 6)
}

// lit windows, one path per color
const winPaths = { w1: '', w2: '', w3: '', wf: '' }
for (const b of allNear) {
  if (b.w < 26) continue
  const density = b.sign ? 0.5 : rand(0.14, 0.5)
  const cls = R() < 0.58 ? 'w1' : R() < 0.6 ? 'w2' : 'w3'
  const top = H - b.h + (b.type === 'stepped' ? 26 : b.type === 'slant' || b.type === 'slantL' ? 26 : b.type === 'round' ? b.w / 2 + 6 : 8)
  for (let y = top; y < H - 8; y += 9) {
    for (let x = b.x + 5; x < b.x + b.w - 7; x += 7) {
      if (b.sign && x > b.x + b.w * 0.62) continue // the sign hangs here
      if (R() > density) continue
      const key = R() < 0.03 ? 'wf' : cls
      winPaths[key] += `M${P(x, y)}h3v5h-3z`
    }
  }
}

// neon roof lines
let neon = ''
for (const b of landmarks.filter(b => b.neon)) {
  const top = H - b.h
  let d
  if (b.type === 'slant') d = `M${P(b.x, top + 20)}L${P(b.x + b.w, top)}`
  else if (b.type === 'stepped') d = `M${P(b.x, top + 22)}H${f(b.x + b.w * 0.14)}V${f(top + 11)}H${f(b.x + b.w * 0.3)}V${f(top)}H${f(b.x + b.w * 0.7)}V${f(top + 11)}H${f(b.x + b.w * 0.86)}V${f(top + 22)}H${f(b.x + b.w)}`
  else if (b.type === 'round') d = `M${P(b.x, top + b.w / 2)}A${f(b.w / 2)} ${f(b.w / 2)} 0 0 1 ${P(b.x + b.w, top + b.w / 2)}`
  else d = `M${P(b.x, top)}H${f(b.x + b.w)}`
  const c = b.neon === 'c' ? '#5ff3ff' : '#ff4fb0'
  neon += `<path d="${d}" stroke="${c}" stroke-width="8" opacity=".22"/><path d="${d}" stroke="${c}" stroke-width="2"/>`
}

// aviation beacons
let beacons = ''
for (const b of landmarks.filter(b => b.beacon)) {
  const x = b.x + b.w / 2
  const y = H - b.h - (b.type === 'spire' ? 46 : 11)
  const d = f(rand(0, 2.4))
  beacons += `<g class="blink" style="animation-delay:-${d}s"><circle cx="${f(x)}" cy="${f(y)}" r="7" fill="#ff2d4a" opacity=".3"/><circle cx="${f(x)}" cy="${f(y)}" r="2.2" fill="#ff3d57"/></g>`
}

// the hotel sign
const hotel = landmarks.find(b => b.sign)
const sx = hotel.x + hotel.w * 0.66
const sy = H - hotel.h + 16
const sign =
  `<g class="neon"><g class="flicker">` +
  `<rect x="${f(sx)}" y="${f(sy)}" width="17" height="78" rx="2" fill="#12061f" stroke="#ff4fb0" stroke-width="1.4"/>` +
  `<rect x="${f(sx - 3)}" y="${f(sy - 3)}" width="23" height="84" rx="4" fill="none" stroke="#ff4fb0" stroke-width="6" opacity=".2"/>` +
  ['V', 'I', 'C', 'E']
    .map((l, i) => `<text x="${f(sx + 8.5)}" y="${f(sy + 17 + i * 18)}">${l}</text>`)
    .join('') +
  `</g></g>`

const nearD = allNear.map(bldgPath).join('')
const farD = far.map(bldgPath).join('')

// ---------------------------------------------------------------- water
let streaks = ''
for (let i = 0; i < 16; i++) {
  const y = H + 5 + 3.1 * Math.pow(i, 1.45)
  const h = 1.4 + i * 0.33
  const w = 72 + i * 15 + rand(-16, 16)
  const x = SX - w / 2 + rand(-12, 12)
  streaks += `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(h / 2)}" fill-opacity="${f(1 - i * 0.035)}" class="sh" style="animation-duration:${f(rand(2.4, 4.6))}s;animation-delay:-${f(rand(0, 4))}s"/>`
}
let ripples = ''
for (const y of [652, 667, 688, 714, 748, 788, 834, 880]) {
  const a = Math.round(rand(20, 70))
  const b = Math.round(rand(30, 90))
  const c = Math.round(rand(6, 24))
  const d = 300 - a - b - c
  ripples += `<path d="M0 ${y}H${W}" style="stroke-dasharray:${a} ${b} ${c} ${d};animation-duration:${f(rand(16, 30))}s;animation-delay:-${f(rand(0, 20))}s"/>`
}

// ---------------------------------------------------------------- causeway
const DECK = 721
let pillars = ''
for (let x = -10; x < W + 20; x += 68) pillars += `M${P(x, DECK + 6)}h4v24h-4z`
let lamps = ''
for (let x = 30; x < W; x += 136) {
  lamps += `<path d="M${P(x, DECK - 1)}v-12h4" stroke="var(--bridge)" stroke-width="1.4" fill="none"/><circle cx="${f(x + 4.5)}" cy="${f(DECK - 13)}" r="6" fill="#ffd38a" opacity=".22"/><circle cx="${f(x + 4.5)}" cy="${f(DECK - 13)}" r="1.5" fill="#ffe2a8"/>`
}
let cars = ''
for (let i = 0; i < 7; i++) {
  const dur = f(rand(22, 34))
  const del = f(rand(0, 34))
  cars += `<g class="cl" style="animation-duration:${dur}s;animation-delay:-${del}s"><ellipse cx="800" cy="${DECK + 2.6}" rx="9" ry="3" fill="#fff1d0" opacity=".28"/><circle cx="798" cy="${DECK + 2.6}" r="1.3" fill="#fff8e6"/><circle cx="802.4" cy="${DECK + 2.6}" r="1.3" fill="#fff8e6"/></g>`
}
for (let i = 0; i < 7; i++) {
  const dur = f(rand(24, 36))
  const del = f(rand(0, 36))
  cars += `<g class="cr" style="animation-duration:${dur}s;animation-delay:-${del}s"><ellipse cx="800" cy="${DECK + 4.6}" rx="8" ry="2.6" fill="#ff3b52" opacity=".3"/><circle cx="798" cy="${DECK + 4.6}" r="1.2" fill="#ff4a5e"/><circle cx="802" cy="${DECK + 4.6}" r="1.2" fill="#ff4a5e"/></g>`
}

// ---------------------------------------------------------------- palms
// One frond in its own space: the base at 0,0, pointing right (+x), with
// gravity pulling its rachis and leaflets down (+y).
function frond({ angle, length, droop, leafLen, seed, spacing = 5.6 }) {
  const Rr = rng(seed)
  const N = 56
  const step = length / N
  let x = 0
  let y = 0
  let a = (angle * Math.PI) / 180
  const pts = []
  for (let i = 0; i <= N; i++) {
    pts.push({ x, y, a })
    const t = i / N
    a += (Math.PI / 2 - a) * droop * (0.003 + 0.045 * t * t)
    x += Math.cos(a) * step
    y += Math.sin(a) * step
  }
  // the rachis, tapered
  const left = []
  const right = []
  pts.forEach((p, i) => {
    const t = i / N
    const w = 4.6 * Math.pow(1 - t, 0.85) + 0.6
    const nx = -Math.sin(p.a)
    const ny = Math.cos(p.a)
    left.push(P(p.x + (nx * w) / 2, p.y + (ny * w) / 2))
    right.push(P(p.x - (nx * w) / 2, p.y - (ny * w) / 2))
  })
  let d = `M${left.join('L')}L${right.reverse().join('L')}Z`
  // leaflets
  const start = 0.11
  let acc = 0
  for (let i = 1; i < N; i++) {
    acc += step
    const t = i / N
    if (t < start || acc < spacing) continue
    acc = 0
    const p = pts[i]
    const u = (t - start) / (1 - start)
    const envl = Math.pow(Math.sin(Math.PI * (0.08 + u * 0.9)), 0.7)
    for (const s of [-1, 1]) {
      const L = leafLen * envl * (1 - 0.3 * t) * (0.78 + 0.44 * Rr())
      if (L < 5) continue
      const spread = ((s < 0 ? 42 : 58) * Math.PI) / 180 * (1 - 0.3 * u)
      const d0 = p.a + s * spread
      const c0x = Math.cos(d0)
      const c0y = Math.sin(d0)
      const g = s < 0 ? 1.25 : 0.95
      let vx = c0x
      let vy = c0y + g
      const vl = Math.hypot(vx, vy)
      vx /= vl
      vy /= vl
      const Cx = p.x + c0x * L * 0.5
      const Cy = p.y + c0y * L * 0.5
      const Tx = Cx + vx * L * 0.62
      const Ty = Cy + vy * L * 0.62
      const w = (2.6 + 2 * (1 - t)) * (leafLen / 64)
      const ax = Math.cos(p.a)
      const ay = Math.sin(p.a)
      let px = -(Ty - p.y)
      let py = Tx - p.x
      const pl = Math.hypot(px, py) || 1
      px /= pl
      py /= pl
      d +=
        `M${P(p.x + ax * w * 0.6, p.y + ay * w * 0.6)}` +
        `Q${P(Cx + px * w * 0.5, Cy + py * w * 0.5)} ${P(Tx, Ty)}` +
        `Q${P(Cx - px * w * 0.5, Cy - py * w * 0.5)} ${P(p.x - ax * w * 0.6, p.y - ay * w * 0.6)}Z`
    }
  }
  return d
}

const FRONDS = {
  fUp: frond({ angle: -64, length: 205, droop: 1.15, leafLen: 52, seed: 11 }),
  fArc: frond({ angle: -30, length: 245, droop: 1.55, leafLen: 64, seed: 23 }),
  fSide: frond({ angle: -6, length: 250, droop: 2.0, leafLen: 68, seed: 37 }),
  fHang: frond({ angle: 28, length: 210, droop: 2.4, leafLen: 58, seed: 41 }),
}

function cubic(p0, p1, p2, p3, t) {
  const u = 1 - t
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ]
}

// A trunk from its base (p0) to the crown (p3), its rings, and the rim of
// sunset light along the side that faces the sun.
function trunk({ p0, p1, p2, p3, w0, w1, rimSide }) {
  const N = 44
  const L = []
  const Rt = []
  const rim = []
  const rings = []
  for (let i = 0; i <= N; i++) {
    const t = i / N
    const [x, y] = cubic(p0, p1, p2, p3, t)
    const [x2, y2] = cubic(p0, p1, p2, p3, Math.min(1, t + 0.01))
    const [x1, y1] = cubic(p0, p1, p2, p3, Math.max(0, t - 0.01))
    let tx = x2 - x1
    let ty = y2 - y1
    const tl = Math.hypot(tx, ty)
    tx /= tl
    ty /= tl
    const nx = -ty
    const ny = tx
    const w = (w0 + (w1 - w0) * Math.pow(t, 0.75)) * (1 + 0.35 * Math.exp(-t * 14))
    const lx = x + (nx * w) / 2
    const ly = y + (ny * w) / 2
    const rx = x - (nx * w) / 2
    const ry = y - (ny * w) / 2
    L.push(P(lx, ly))
    Rt.push(P(rx, ry))
    const sx = rimSide > 0 ? x - nx * w * 0.36 : x + nx * w * 0.36
    const sy = rimSide > 0 ? y - ny * w * 0.36 : y + ny * w * 0.36
    rim.push(P(sx, sy))
    if (i % 2 === 1 && t < 0.97) {
      rings.push(`M${P(lx, ly)}Q${P(x - tx * w * 0.32, y - ty * w * 0.32)} ${P(rx, ry)}`)
    }
  }
  return {
    body: `M${L.join('L')}L${Rt.reverse().join('L')}Z`,
    rings: rings.join(''),
    rim: `M${rim.join('L')}`,
  }
}

// [symbol, rotate, scale, mirror, dur]
const CROWN = [
  ['fUp', -36, 0.82, false],
  ['fUp', -34, 0.78, true],
  ['fUp', -6, 1, false],
  ['fUp', -8, 0.95, true],
  ['fArc', 0, 1.04, false],
  ['fArc', -2, 1, true],
  ['fSide', 4, 1, false],
  ['fSide', 6, 1.04, true],
  ['fArc', 16, 0.86, false],
  ['fHang', 0, 0.92, false],
  ['fHang', 4, 0.94, true],
]

function palm({ id, p0, p1, p2, p3, w0, w1, scale, rimSide, far }) {
  const t = trunk({ p0, p1, p2, p3, w0, w1, rimSide })
  const fill = far ? 'palmfar' : 'palm'
  let crown = ''
  for (const [sym, rot, sc, mir] of CROWN) {
    const dur = f(rand(5.2, 8.6))
    const del = f(rand(0, 8))
    crown += `<g transform="${mir ? 'scale(-1 1) ' : ''}rotate(${rot}) scale(${sc})"><use href="#${sym}" class="fl" style="animation-duration:${dur}s;animation-delay:-${del}s"/></g>`
  }
  const nuts = [
    [-6, 9, 7.5],
    [5, 11, 8],
    [-1, 17, 7],
    [9, 4, 6],
  ]
    .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`)
    .join('')
  return (
    `<g class="trunk" style="transform-origin:${f(p0[0])}px ${f(p0[1])}px;animation-duration:${f(rand(8, 11))}s;animation-delay:-${f(rand(0, 8))}s">` +
    `<path d="${t.body}" style="fill:var(--${fill})"/>` +
    `<path d="${t.rings}" class="rings"/>` +
    `<path d="${t.rim}" class="rim" stroke="url(#gRim${id})"/>` +
    `<g transform="translate(${f(p3[0])} ${f(p3[1])}) scale(${scale})" style="fill:var(--${fill})">` +
    `<g class="crown" style="animation-duration:${f(rand(8, 12))}s;animation-delay:-${f(rand(0, 8))}s">${crown}${nuts}</g>` +
    `</g></g>`
  )
}

const PALMS = [
  { id: 'a', p0: [92, 968], p1: [140, 730], p2: [226, 486], p3: [318, 318], w0: 36, w1: 14, scale: 1.14, rimSide: 1, side: 'l' },
  { id: 'd', p0: [214, 968], p1: [210, 836], p2: [190, 716], p3: [168, 620], w0: 19, w1: 8, scale: 0.56, rimSide: 1, far: true, side: 'l' },
  { id: 'c', p0: [1462, 968], p1: [1470, 812], p2: [1488, 668], p3: [1508, 552], w0: 21, w1: 9, scale: 0.66, rimSide: -1, far: true, side: 'r' },
  { id: 'b', p0: [1566, 968], p1: [1520, 728], p2: [1442, 506], p3: [1372, 352], w0: 34, w1: 13, scale: 1.06, rimSide: -1, side: 'r' },
]
const rimGradients = PALMS.map(
  p =>
    `<linearGradient id="gRim${p.id}" gradientUnits="userSpaceOnUse" x1="0" y1="${p.p3[1]}" x2="0" y2="${p.p0[1]}"><stop offset="0" style="stop-color:var(--rim)"/><stop offset=".55" style="stop-color:var(--rim);stop-opacity:.35"/><stop offset="1" style="stop-color:var(--rim);stop-opacity:0"/></linearGradient>`,
).join('')
const palmsL = PALMS.filter(p => p.side === 'l').map(palm).join('')
const palmsR = PALMS.filter(p => p.side === 'r').map(palm).join('')

// ---------------------------------------------------------------- sky life
const heli =
  `<g class="heli"><g class="bob">` +
  `<path class="beam" d="M797 184L716 598H792Z" fill="url(#gBeam)"/>` +
  `<path d="M785 175q5-10 19-9q10 1 13 9q-1 6-10 7h-17q-6 0-5-7zM814 172l27-3.4v3.4l-25 4.2zM839 165h2.4v9h-2.4zM788 186h25M792 181.5v4.5M806 181.5v4.5" style="fill:var(--heli);stroke:var(--heli)" stroke-width="1.3"/>` +
  `<rect class="rotor" x="777" y="163" width="48" height="1.8" rx=".9" style="fill:var(--heli)"/>` +
  `<circle class="blink" cx="789" cy="182" r="1.5" fill="#ff3049"/>` +
  `</g></g>`

const birdShape = 'M-8 -3Q-4 -1.2 0 1.6Q4 -1.2 8 -3'
const birds =
  `<g class="birds">` +
  [
    [0, 0, 0.62],
    [20, 9, 0.7],
    [38, -3, 0.66],
    [-17, 12, 0.74],
    [56, 14, 0.6],
  ]
    .map(
      ([dx, dy, d]) =>
        `<g transform="translate(${800 + dx} ${386 + dy})"><path d="${birdShape}" class="flap" style="animation-duration:${d}s"/></g>`,
    )
    .join('') +
  `</g>`

// ---------------------------------------------------------------- style
const CSS = `
:root{${vars(DAY)}}
@media (prefers-color-scheme:dark){:root{${vars(NIGHT)}}}
*{transform-box:view-box}
.stars{fill:#fff;opacity:var(--star)}
.tw{animation:tw 4s ease-in-out infinite}
@keyframes tw{0%,100%{opacity:1}50%{opacity:.2}}
.glow{opacity:var(--glowop);transform-origin:${SX}px ${SY}px;animation:pulse 9s ease-in-out infinite alternate}
@keyframes pulse{from{transform:scale(.93)}to{transform:scale(1.06)}}
.bars{animation:bars 3.4s linear infinite}
@keyframes bars{to{transform:translateY(-18px)}}
.drift{animation:drift 120s ease-in-out infinite alternate}
@keyframes drift{from{transform:translateX(-46px)}to{transform:translateX(46px)}}
.far{fill:var(--far);opacity:var(--farop)}
.wins{opacity:var(--win)}
.w1{fill:#ffd27f}.w2{fill:#8ef2ff}.w3{fill:#ff8fca}.wf{fill:#ffe6a8;animation:winf 7s steps(1) infinite}
@keyframes winf{0%,44%{opacity:1}45%{opacity:.1}52%{opacity:1}77%{opacity:.1}79%{opacity:1}}
.neon{opacity:var(--neon);fill:none;stroke-linecap:round;stroke-linejoin:round}
.flicker{animation:flick 11s steps(1) infinite}
@keyframes flick{0%,61%{opacity:1}62%{opacity:.3}63%{opacity:1}64%{opacity:.3}66%{opacity:1}88%{opacity:1}89%{opacity:.45}90%{opacity:1}}
.neon text{font:900 15px 'Arial Black','Segoe UI Black',Impact,sans-serif;text-anchor:middle;fill:#ffd1ec;stroke:#ff4fb0;stroke-width:1.1;paint-order:stroke}
.beacons{opacity:var(--beacon)}
.blink{animation:blink 2.4s steps(1) infinite}
@keyframes blink{0%{opacity:1}50%{opacity:.08}}
.sea{fill:url(#gSea)}
.streaks{fill:url(#gStreak);opacity:var(--reflop)}
.sh{transform-box:fill-box;transform-origin:center;animation:sh 3.4s ease-in-out infinite alternate}
@keyframes sh{from{transform:scaleX(.8);opacity:.5}to{transform:scaleX(1.08);opacity:1}}
.ripples{fill:none;stroke:var(--refl);stroke-width:1.1;opacity:calc(var(--reflop)*.32)}
.ripples path{animation:rip 22s linear infinite}
@keyframes rip{to{stroke-dashoffset:-600}}
.mirror{opacity:var(--mirror)}
.bridge{fill:var(--bridge)}
.lamps{opacity:var(--lamp)}
.cars{opacity:var(--car)}
.cl{animation:cl 28s linear infinite}
@keyframes cl{from{transform:translateX(900px)}to{transform:translateX(-900px)}}
.cr{animation:cr 30s linear infinite}
@keyframes cr{from{transform:translateX(-900px)}to{transform:translateX(900px)}}
.trunk{animation:trunk 9s ease-in-out infinite alternate}
@keyframes trunk{from{transform:rotate(-.7deg)}to{transform:rotate(.8deg)}}
.crown{transform-origin:0 0;animation:crown 10s ease-in-out infinite alternate}
@keyframes crown{from{transform:rotate(-1.6deg)}to{transform:rotate(1.9deg)}}
.fl{transform-origin:0 0;animation:fl 6s ease-in-out infinite alternate}
@keyframes fl{from{transform:rotate(-2.4deg)}to{transform:rotate(2.6deg)}}
.rings{fill:none;stroke:var(--ring);stroke-width:1.3}
.rim{fill:none;stroke-width:2.2;opacity:var(--rimop);stroke-linecap:round}
.heli{animation:heli 74s linear infinite;animation-delay:-26s}
@keyframes heli{0%{transform:translateX(-1000px)}62%,100%{transform:translateX(1000px)}}
.bob{animation:bob 3.2s ease-in-out infinite alternate}
@keyframes bob{from{transform:translateY(-3px)}to{transform:translateY(3px)}}
.beam{opacity:var(--beam);transform-origin:797px 184px;animation:sweep 9s ease-in-out infinite alternate}
@keyframes sweep{from{transform:rotate(-9deg)}to{transform:rotate(12deg)}}
.rotor{transform-box:fill-box;transform-origin:center;animation:rotor .16s linear infinite alternate}
@keyframes rotor{from{transform:scaleX(1)}to{transform:scaleX(.18)}}
.birds{fill:none;stroke:var(--bird);stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;animation:birds 92s linear infinite;animation-delay:-12s}
@keyframes birds{0%{transform:translate(1000px,0)}30%{transform:translate(0,-26px)}58%,100%{transform:translate(-1000px,10px)}}
.flap{transform-origin:0 0;animation:flap .7s ease-in-out infinite alternate}
@keyframes flap{from{transform:scaleY(1)}to{transform:scaleY(-.55)}}
.vig{fill:url(#gVig)}
.read{fill:url(#gRead)}
@media (max-aspect-ratio:3/2){.pr{transform:translateX(-90px)}}
@media (max-aspect-ratio:5/4){.pl{transform:translateX(90px)}.pr{transform:translateX(-175px)}.sunpos{transform:translateX(-40px)}}
@media (max-aspect-ratio:1/1){.pl{transform:translateX(170px)}.pr{transform:translateX(-255px)}.sunpos{transform:translateX(-150px)}}
@media (max-aspect-ratio:3/4){.pl{transform:translateX(245px)}.pr{transform:translateX(-335px)}.sunpos{transform:translateX(-215px)}}
@media (max-aspect-ratio:9/16){.pl{transform:translateX(305px)}.pr{transform:translateX(-395px)}.sunpos{transform:translateX(-265px)}}
@media (prefers-reduced-motion:reduce){*{animation-play-state:paused!important}}
`
  .replace(/\n/g, '')
  .replace(/\s*([{};:,])\s*/g, '$1')
  .replace(/;}/g, '}')

// ---------------------------------------------------------------- defs
const DEFS =
  `<linearGradient id="gSky" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="${H}">${stops([
    [0, 'sky0'],
    [0.28, 'sky1'],
    [0.5, 'sky2'],
    [0.67, 'sky3'],
    [0.83, 'sky4'],
    [1, 'sky5'],
  ])}</linearGradient>` +
  `<radialGradient id="gGlow" cx="${SX}" cy="${SY}" r="540" gradientUnits="userSpaceOnUse">${stops([
    [0, 'glow', 1],
    [0.32, 'glow', 0.55],
    [1, 'glow', 0],
  ])}</radialGradient>` +
  `<linearGradient id="gSun" gradientUnits="userSpaceOnUse" x1="0" y1="${SY - SR}" x2="0" y2="${SY + SR}">${stops([
    [0, 'sun0'],
    [0.42, 'sun1'],
    [0.78, 'sun2'],
  ])}</linearGradient>` +
  `<linearGradient id="gSunCover" gradientUnits="userSpaceOnUse" x1="0" y1="${SY - SR}" x2="0" y2="${H}"><stop offset=".3" stop-color="#fff"/><stop offset=".52" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
  `<mask id="mSun" maskUnits="userSpaceOnUse" x="${SX - SR - 10}" y="${SY - SR - 10}" width="${2 * SR + 20}" height="${2 * SR + 20}">` +
  `<rect x="${SX - SR - 10}" y="${SY - SR - 10}" width="${2 * SR + 20}" height="${2 * SR + 20}" fill="#fff"/>` +
  `<g class="bars">${bars}</g>` +
  `<rect x="${SX - SR - 10}" y="${SY - SR - 10}" width="${2 * SR + 20}" height="${2 * SR + 20}" fill="url(#gSunCover)"/>` +
  `</mask>` +
  `<radialGradient id="gCloud">${stops([
    [0, 'cloud', 'var(--cloudop)'],
    [0.6, 'cloud', 'calc(var(--cloudop)*.7)'],
    [1, 'cloud', 0],
  ])}</radialGradient>` +
  `<radialGradient id="gCloudLit">${stops([
    [0, 'cloudlit', 0.75],
    [1, 'cloudlit', 0],
  ])}</radialGradient>` +
  `<linearGradient id="gCity" gradientUnits="userSpaceOnUse" x1="0" y1="330" x2="0" y2="${H}">${stops([
    [0, 'city0'],
    [1, 'city1'],
  ])}</linearGradient>` +
  `<linearGradient id="gSea" gradientUnits="userSpaceOnUse" x1="0" y1="${H}" x2="0" y2="${HT}">${stops([
    [0, 'sea0'],
    [0.06, 'sea1'],
    [0.3, 'sea2'],
    [0.68, 'sea3'],
    [1, 'sea4'],
  ])}</linearGradient>` +
  `<linearGradient id="gStreak">${stops([
    [0, 'refl', 0],
    [0.5, 'refl', 1],
    [1, 'refl', 0],
  ])}</linearGradient>` +
  `<linearGradient id="gHz">${stops([
    [0, 'refl', 0],
    [0.72, 'refl', 0.9],
    [1, 'refl', 0],
  ])}</linearGradient>` +
  `<linearGradient id="gMirror" gradientUnits="userSpaceOnUse" x1="0" y1="${H}" x2="0" y2="${H + 150}"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
  `<mask id="mMirror" maskUnits="userSpaceOnUse" x="0" y="${H}" width="${W}" height="160"><rect x="0" y="${H}" width="${W}" height="160" fill="url(#gMirror)"/></mask>` +
  `<linearGradient id="gBeam" gradientUnits="userSpaceOnUse" x1="0" y1="184" x2="0" y2="598"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
  `<radialGradient id="gVig" cx=".5" cy=".46" r=".78">${stops([
    [0.52, 'vig', 0],
    [1, 'vig'],
  ])}</radialGradient>` +
  `<linearGradient id="gRead" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${W}" y2="0">${stops([
    [0.17, 'read', 0],
    [0.3, 'read', 1],
    [0.58, 'read', 1],
    [0.7, 'read', 0],
  ])}</linearGradient>` +
  rimGradients +
  Object.entries(FRONDS)
    .map(([id, d]) => `<path id="${id}" d="${d}"/>`)
    .join('')

// ---------------------------------------------------------------- compose
const SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${HT}" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">` +
  `<style>${CSS}</style>` +
  `<defs>${DEFS}</defs>` +
  `<rect width="${W}" height="${HT}" fill="url(#gSky)"/>` +
  `<g class="stars">${stars}</g>` +
  `<g class="sunpos"><circle class="glow" cx="${SX}" cy="${SY}" r="540" fill="url(#gGlow)"/></g>` +
  clouds +
  `<g class="sunpos"><circle cx="${SX}" cy="${SY}" r="${SR}" fill="url(#gSun)" mask="url(#mSun)"/>${sunStreak}</g>` +
  heli +
  `<path class="far" d="${farD}"/>` +
  `<g id="city"><path d="${nearD}" fill="url(#gCity)"/>` +
  `<g class="wins"><path class="w1" d="${winPaths.w1}"/><path class="w2" d="${winPaths.w2}"/><path class="w3" d="${winPaths.w3}"/><path class="wf" d="${winPaths.wf}"/></g>` +
  `<g class="neon">${neon}</g>${sign}<g class="beacons">${beacons}</g></g>` +
  birds +
  `<rect class="sea" y="${H}" width="${W}" height="${HT - H}"/>` +
  `<g class="mirror" mask="url(#mMirror)"><use href="#city" transform="matrix(1 0 0 -.5 0 ${H * 1.5})"/></g>` +
  `<rect y="${H - 1.2}" width="${W}" height="2.4" fill="url(#gHz)" opacity=".85"/>` +
  `<g class="sunpos"><g class="streaks">${streaks}</g></g>` +
  `<g class="ripples">${ripples}</g>` +
  `<g class="bridge"><rect x="-20" y="${DECK}" width="${W + 40}" height="6"/><rect x="-20" y="${DECK - 3}" width="${W + 40}" height="1.2"/><path d="${pillars}"/></g>` +
  `<g class="lamps">${lamps}</g>` +
  `<g class="cars">${cars}</g>` +
  `<rect class="read" width="${W}" height="${HT}"/>` +
  `<g class="pl">${palmsL}</g>` +
  `<g class="pr">${palmsR}</g>` +
  `<rect class="vig" width="${W}" height="${HT}"/>` +
  `</svg>`

writeFileSync(
  join(OUT, 'scene.ts'),
  `// Generated by art/build-scene.mjs. Edit that script, not this file.\n` +
    `export const SCENE = ${JSON.stringify(SVG)}\n`,
)
if (PREVIEW) {
  writeFileSync(join(OUT, 'scene-day.svg'), SVG.replace('@media (prefers-color-scheme:dark){', '@media not all{'))
  writeFileSync(
    join(OUT, 'scene-night.svg'),
    SVG.replace('@media (prefers-color-scheme:dark){', '@media all{'),
  )
}
console.log(`scene: ${SVG.length} characters (limit 131072)`)
