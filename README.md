# Bobby Strugglin'

An Amiga-style homage to Rick Dangerous (Core Design, 1989), for a phone in
landscape. Bobby Strugglin', manager of Levenmouth Athletic, goes after the
club's only trophy. Personal project; not for publication. Every character,
club, ground, cup and sponsor is invented, and all art, sound, music and text
is made in code.

## Play

- Build, then open `dist/index.html` on the phone. It is one self-contained file.
- Touch: d-pad on the left; JUMP, KICK, PIE and SCARF on the right; pause at the top.
- Keyboard: arrows or WASD to move, Space jump, Z kick, X pie, C scarf, P pause,
  Shift+D (or `) debug. Gamepads work too.

## Develop

```
npm install
npm run dev        # vite --host, for testing on the phone over the LAN
npm test           # vitest: mechanics, traps, bosses, routes, fairness, soft-locks
npm run build      # dist/index.html (single file) + manifest, service worker, icons
npx vite-node scripts/solve.ts [zone]   # re-record the routes after editing screens
node scripts/check-layout.mjs           # touch controls never cover the play area
node scripts/smoke.mjs                  # end-to-end run in headless Chromium
```

## Layout

- `src/engine/` framebuffer, palette conversion and scaling, font, input, RNG
- `src/game/` the deterministic 50 Hz simulation (`world.ts`, `ents.ts`,
  `bosses.ts`), `tuning.ts`, the route solver and boss bots, saves
- `src/content/` everything that is data: palette, tiles, sprites, zones,
  traps, enemies, pickups, bosses, music, all text (`text/`), recorded routes
- `src/render/` drawing the world, the status strip and illustrations
- `src/scenes/` loading screen, title and attract mode, menus, play,
  cutscenes, the post-match interview, game over, credits, debug viewer
- `src/audio/` the Paula-style synth and tracker player

See `DECISIONS.md` for what was verified against Rick and why things work the
way they do.
