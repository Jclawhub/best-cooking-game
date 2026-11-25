# Dapur Kilat — Masak cepat, sajikan tepat!

[![make.fun · best-cooking-game-20261125-0137](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/Jclawhub/best-cooking-game/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/Jclawhub/best-cooking-game/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)

A fast-paced 2D cooking game for the [make.fun best cooking game bounty](https://make.fun/bounty/best-cooking-game-20261125-0137). You run a tiny Indonesian kitchen — Dapur Kilat — where orders fly in, the stove is always hot, and every second counts.

## How to play

- Orders appear on the board (up to 3 at once), each with a countdown timer.
- Click an ingredient bin or press its key (1–6) to add it to the plate: Nasi 🍚, Telur 🥚, Ayam 🍗, Cabai 🌶️, Sayur 🥬, Kecap 🍶.
- Match a dish exactly, then press **Space** or click **SAJIKAN** to serve it.
- Serve fast in a row to build a combo (up to x3). A wrong serve costs 10 points; an expired order costs a heart. Lose 3 hearts and the shift ends.
- Level up every 5 serves: orders arrive faster and timers get shorter. Survive a full 3-minute shift for a bonus.

Five dishes to master:

| Dish | Needs |
| --- | --- |
| Nasi Goreng | Nasi + Telur + Cabai + Kecap |
| Ayam Goreng | Ayam + Kecap + Cabai |
| Sayur Tumis | Sayur + Cabai + Kecap |
| Telur Dadar | Telur + Sayur |
| Nasi Ayam | Nasi + Ayam + Kecap |

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

Static files only — no build step, no network requests. All art is drawn on canvas; sounds are tiny WebAudio bleeps.

## Files

- `game/index.html` — the page, loads the game
- `game/src/main.js` — entry point, game loop, state machine
- `game/src/recipes.js` — ingredients and dishes
- `game/src/orders.js` — orders, timers, scoring, levels
- `game/src/kitchen.js` — all rendering
- `game/src/input.js` — mouse + keyboard
- `game/src/audio.js` — WebAudio bleeps
- `game/src/shots.js` — deterministic screenshot staging (`?shot=`)
- `game/src/rng.js` — seeded RNG
- `main.ts` — the make.fun hand-in program (copies game/ + screenshots/, writes dossier.json)
- `serve.ts` — tiny static server for local play
- `shots.json` — the four screenshots and their URLs

## Screenshots

1. `1-kitchen.jpg` — the kitchen at the start of a shift (cover)
2. `2-assembly.jpg` — a dish mid-assembly
3. `3-serve.jpg` — a plate ready to serve
4. `4-rush.jpg` — the dinner rush, one timer nearly empty
