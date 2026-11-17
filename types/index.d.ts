/** The HUD: the bank and missions persist across sessions, the heat does not. */
export type ViceHud = {
  /** Dollars in the bank. */
  cash: number
  /** Wanted stars, 0 to 5: errors and refusals raise it, a clean mission clears it. */
  wanted: number
  /** Turns that ended with an answer. */
  missions: number
  /** The payout that just landed, shown as a +$ pop beside the cash; 0 for none. */
  lastGain: number
}

/** What the person switched on or off with /vice. */
export type VicePrefs = {
  theme: boolean
  motion: boolean
  hud: boolean
  toasts: boolean
  verbs: boolean
}

declare module 'claude-code' {
  interface PluginState {
    'vice-sunset': { hud: Shaped<ViceHud>; prefs: Shaped<VicePrefs> }
  }
}
