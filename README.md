# Vice Sunset

A GTA VI-inspired look for Claude Code. All the art is original: no Rockstar logos, artwork or fonts. Not affiliated with Rockstar Games.

## What you get

- **An animated Vice City backdrop** (desktop and mobile apps). In dark mode it's a neon night: a striped synthwave sun sinking behind the skyline, palm trees swaying, traffic on the causeway, a police helicopter sweeping its searchlight, blinking tower beacons, a flickering VICE hotel sign and the city reflected in the bay. In light mode it's the same bay at golden hour. The scene follows your app's light or dark mode.
- **A neon color theme** for both modes: plum surfaces, hot-pink keywords, mint strings, cyan literals and sunset-amber variables.
- **A wanted-level HUD** above the prompt: five stars that flash red and blue, your bank balance in money green, a `+$` pop for each payout, and whether the crew is on a job.
- **Missions**: every tool call that goes through pays out (Write $600, Edit $400, Bash $250, Read $60, ...). A failed or refused call raises your wanted level. A finished turn is a mission passed, with a bonus. A clean mission loses the cops.
- **Toasts**: `MISSION PASSED · +$750`, `BUSTED` when you interrupt a turn, `WASTED` when a turn dies on an error.
- **Heist spinner words**: "Casing the joint", "Hotwiring the ride", "Laying low", ... (the desktop app keeps its own step names and only replaces the generic "Working").

Your bank and mission count are kept between sessions; the heat is not.

## Commands

| Command | What it does |
| --- | --- |
| `/vice` | Your bank, missions, heat and switches |
| `/vice theme on\|off` | The colors and the animated backdrop |
| `/vice motion on\|off` | Animate the scene, or hold it still (saves GPU and battery) |
| `/vice hud on\|off` | The wanted-level HUD above the prompt |
| `/vice toasts on\|off` | Mission toasts |
| `/vice verbs on\|off` | Heist words on the spinner |
| `/vice reset` | Empty the bank and clear your record |

The scene also holds still when your system asks for reduced motion.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install vice-sunset --marketplace Staexl/vice-sunset
```

Answer `y` to add the marketplace, then pick the user scope so every new session loads it.

From a shell:

```bash
claude plugin install vice-sunset --marketplace Staexl/vice-sunset
```

In the desktop app, where `/plugin` does not run: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `Staexl/vice-sunset`, then **Add plugin**.

A user-scope install also loads in the desktop app's Code sessions. The look appears once a session starts, after its first message. It doesn't show in the Chat tab, which doesn't run Claude Code.

To remove it:

```bash
claude plugin uninstall vice-sunset@vice-sunset
```

### Working on a copy

Clone this repository and install from your clone instead: `claude plugin install vice-sunset --marketplace <path to the clone>`. Claude Code then reads the mod straight from that folder, so a new session picks up your edits.

## Editing the scene

The backdrop is generated: edit `art/build-scene.mjs`, then run `node art/build-scene.mjs hooks` from this folder to rewrite `hooks/scene.ts`. The palette for each mode is at the top of that script.

The desktop app covers the whole window with tinted panels, so the scene is always seen through them. `GLASS` in `hooks/look.ts` sets that tint (no blur, 56%). A veil in the scene (`--read` in the script) calms the middle column, where the chat text sits.
