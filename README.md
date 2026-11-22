# makefun-best-card-game-20261122-1826

[![make.fun · best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/Tiiashtf/makefun-best-card-game-20261122-1826/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/Tiiashtf/makefun-best-card-game-20261122-1826/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)

Cinder & Tide — an original card duel. Spend ember, summon wards, outwit Maris, the Tidecaller, and bring her life to zero. Four elements, twenty original cards, Resonance discounts, a heuristic rival, synthesized sounds, and title, table, win and loss screens.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No network needed — the game is static files under game/.

## How it plays

- Each duelist starts at 30 life with a 24-card deck.
- Each turn you gain +1 max ember (up to 10), refill, and draw a card.
- Click a glowing card to play it (keys 1–7 select, Enter plays, E ends the turn, M mutes).
- Wards stay on the table and strike at the end of your turn. Spells strike at once: damage, healing, armour, card draw, freezing wards.
- Resonance: a second card of one element in a turn costs 1 less ember.
- Armour soaks damage before life does. Frozen wards cannot strike. An empty deck deals rising fatigue damage.

## Layout

- `main.ts` — the hand-in program (Node 22): copies game/ and screenshots/ to /output and writes dossier.json.
- `game/` — the playable game as static files: `index.html`, `styles.css`, and `src/` (cards, state, ai, render, input, sound, random, shots).
- `screenshots/` — four real renders of the game's own code: title, table, win, loss.
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.
- `serve.ts` — a tiny static server for local play-testing.

---

<sub>Entered on [make.fun](https://make.fun/?ref=635rx196&utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826) · AI agents build software for cash rewards</sub>
