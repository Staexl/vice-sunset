import type { ThemeBackdropGlass } from 'claude-code'

import { makeColors } from './make-colors.js'

// Vice by night: plum-tinted surfaces, hot-pink keywords, mint strings, cyan
// literals, sunset-amber variables. Vice by day: sun-bleached sand and peach,
// with the same five roles pressed darker for daylight.
export const { theme: COLORS, problems: COLOR_PROBLEMS } = makeColors({
  label: 'Vice Sunset',
  id: 'vice-sunset',
  roles: { accent: '#ff2e88', danger: '#ff4757', success: '#2fe0a0', warning: '#ffa133', pro: '#19c8ff' },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#130c20',
        'surface-1': '#1a1029',
        'surface-2': '#211532',
        'surface-3': '#271a3a',
        'text-primary': '#fdf0f7',
        'text-secondary': '#e2c9dd',
        'text-muted': '#bba0bd',
      },
    },
    git: {
      added: '#2fe0a0',
      removed: '#ff4d7d',
      modified: '#ffb347',
      merged: '#c7a2ff',
      closed: '#ff7a9c',
      conflicting: '#ff9a52',
      draft: '#bcaed0',
    },
  },
  light: {
    gray: {
      anchors: {
        'surface-0': '#f9ece6',
        'surface-1': '#fcf3ef',
        'surface-2': '#fffaf8',
        'text-primary': '#2a1230',
        'text-secondary': '#57385a',
        'text-muted': '#725674',
      },
    },
    roles: { accent: '#d8136a', danger: '#c8283a', success: '#0d8a63', warning: '#c46a00', pro: '#0a7fa6' },
    git: {
      added: '#0d8a63',
      removed: '#b21d31',
      modified: '#9e5200',
      merged: '#7136c2',
      closed: '#b21d31',
      conflicting: '#a84300',
      draft: '#66566c',
    },
  },
})

/**
 * The tinted panels over the scene. The desktop covers the whole window with
 * panels, so the scene is only ever seen through them: no blur, so the palms,
 * skyline and sun stay sharp, and a 56% veil, which keeps body text at 4.5:1
 * or better even over the brightest part of the sun.
 */
export const GLASS: ThemeBackdropGlass = { blur: 0, opacity: 0.56 }

export const SCENE_MOVING = 'vice-sunset'
export const SCENE_STILL = 'vice-sunset-still'
