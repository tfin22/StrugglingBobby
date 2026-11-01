# Decisions

Where the spec said "verify", or a mechanic was ambiguous, this is what was
checked and chosen. Pick what feels best on a touchscreen and closest to the
Amiga Rick; write it down here.

## Verified against Rick Dangerous

| Spec item | What Rick did | What we do |
|---|---|---|
| Screen layout | 320x200. The xrick source describes the play map as a 256-wide area inside the 320x200 screen, offset 32 px from the left, with the status counters (score, lives, bullets, bombs) on a line at the top. | 320x200 framebuffer. Status strip 24 px at the top (counts on one line, the room name on the next). Play area 256x176 at x=32, black borders either side, as on Rick's screen. |
| Tile grid | xrick builds maps from 8x8 tiles. | 16x16 tiles, as the spec asks: chunkier on a phone and quicker to author. A screen is 16x11 tiles. |
| Palette | 16 colours on screen. | 16 shared colours (sprites, text) + 16 per zone = 32 active colours per zone, plus a per-scanline copper sky. All 12-bit Amiga RGB in `src/content/palette.ts`. |
| Flip or scroll | Rick moves between map sections with a quick push-scroll (xrick has `scroll_up`/`scroll_down`) rather than a hard flip. | A 10-frame push-scroll in all four directions. |
| Starting counts | Six bullets and six sticks of dynamite (xrick man page; contemporary reviews). Lives are given as six in most sources (one Spectrum review says eight). | 6 lives, 6 balls, 6 pies. Caps of 9 so a count is always one digit. All in `tuning.ts`. |
| Controls | Joystick moves, jumps (up), ducks and crawls (down). Fire + forwards/up fires the pistol, fire + down lays dynamite, fire + left/right pokes with the stick. | Modern controls are separate buttons. The "1989 controls" option mirrors Rick: up jumps, fire+up kicks, fire+down drops a pie, fire+side flicks the scarf. |

Sources: the xrick source (`draw.c`, man page) and contemporary reviews found
via web search (c64-wiki, textfiles.com review, breadbox64).

## Movement

- **Jump**: fixed arc, about 27 px high and 48 px long (1.6 px/frame across,
  3.6 px/frame up, gravity 0.24). That clears a two-tile gap and climbs a
  one-tile step. Direction is committed at take-off; brushing a wall mid-jump
  no longer kills the sideways motion, so a jump from right beside a step
  still lands on it (found by the solver; it felt broken otherwise).
- **Falls**: walking off a ledge of up to five tiles is safe; a fall of more
  than 80 px from its highest point kills. Jumping off adds height, so jump
  down at most three tiles.
- **Crouch** hitbox is 10 px tall, so darts at standing height pass over and
  one-tile tunnels can be crawled.
- **Ladders**: up or down to grab, step off sideways at a floor, drop off the
  bottom. The top rung acts as a floor. Pushing up mid-air grabs a ladder
  (modern controls only).
- **Keyboard**: the spec asks for both WASD and `D` as the debug key. `D`
  moves right; **Shift+D** or **`** toggles the debug overlay.
- **Input latch**: a key or tap shorter than one 50 Hz frame still counts
  once (a quick tap of KICK used to be lost).

## Death, restart and checkpoints

- One hit kills. Death animation, whistle, a death line in a box, and Bobby
  is back at the screen's entry point within two seconds (a tap skips the
  last part).
- The checkpoint is where Bobby first stands on a new screen, never mid-air.
  If he dies before landing on a screen, he restarts on the previous one.
- **Refunds**: tools used on a screen come back on a restart (the checkpoint
  stores the counts).
- **No soft-locks**: on entering a screen, counts are topped up to that
  screen's `needs` ("Wee Eck left a kit bag" / "Senga's sent a pie down"), so
  a restart can never leave Bobby short. A test proves each screen can be
  beaten with only its `needs`.
- Points pickups (programmes, cards, mugs...) stay collected after a restart;
  kit bags and pie stalls come back.
- **1989 mode** restarts at the start of the zone, as the spec says (harsher
  than Rick, who had checkpoints within levels).
- **2026 mode**: unlimited continues from the last screen; the score resets on
  a continue, so continues never reach the league table.

## Tools

- **Ball**: low (shin height) and fast, 5 px/frame, bounces off one wall then
  goes. Hits small enemies, drops loose objects, pops inflatables.
- **Pie**: 2-second fuse, blast radius 26 px. Blows weak walls and crumbling
  floors, kills enemies, sets off loose objects, and kills Bobby if he's still
  close. Pies fall off ledges.
- **Scarf**: unlimited, short (28 px), hits only on frames 4-9 of the flick,
  as a fixed rectangle. Triggers objects and tripwires from a safe step away,
  stuns enemies (harmless while stunned), pulls levers, breaks CCTV, snuffs out
  a lit pie and puts it back in stock.

## Traps and enemies

- Every trap type in `content/traps.ts` has a tell (text and drawn art); a test
  checks it. Falling objects sway on a cable and shake before they drop;
  studs show holes; darts come from visible holes, boards and urns; crushers
  flash a light; jets drip or spark; rotten floors are cracked; trapdoors
  show a hinge.
- **The giant ball** rolls at 1.4 px/frame, just slower than Bobby's walk:
  keep moving and you outrun it, stop and it gets you. If it is rolling the
  same way when Bobby leaves the screen, it follows him to the next one
  (unless it would have fallen in a pit on the way).
- **Seagulls** steal one pie, never a life. **Stewards** walk Bobby back to the
  previous screen; no life lost. Enemies never start within 56 px of where
  Bobby enters (tested on every screen).

## Bosses

Short pattern fights; each has a scripted "bot" that beats it the intended
way, which is how the route tests prove them beatable.

- **Big Tam**: scarf a sprinkler valve to make a bog; when the roller sticks
  (about 5 seconds), drop a pie beside it. Three hits, faster each time. The
  stuck window was lengthened from 3.4 s when the bot showed a pie couldn't go
  off in time.
- **Manager of the Month**: two balls each; a short "on the phone to his agent"
  pause between hits. The Tactician throws boards; the Dossier Man needs his
  dossier scarfed away first; the Sulker can only be hit while he storms
  across the room. A kit bag arrives with each new appointment.
- **The Administrator**: paperwork falls in patterns after a fluttering tell;
  creditors are sent from the far side. Scarf his clipboard away, then pie the
  vault door. He finds a spare clipboard after the first hit, so it takes two
  full cycles (the first version was beaten in seven seconds).
- **"Bring Yer Dinner" Dougie**: his two defenders jump together when he shouts
  "PUSH UP!"; kick through the gap. A blocked ball is cleared straight back at
  Bobby (jump it). Three dents, the team gets on the bus, scarf the handbrake,
  get clear, pie the bus in the open.
- **The finale**: the Baron's Lada round the running track, dropping gold
  hubcaps to jump, until it stalls on the final bend.

## Zones and screens

- 67 hand-authored screens: Harbour Park 22, the boardroom 15, the vaults 14,
  the national stadium 16. The spec suggests 25-35 per zone "(tuning)"; this
  first round prioritised every screen being tested and fair. Screens are pure
  data in `src/content/zones/`, and the solver checks any new one.
- Room names are in the status strip; every one is filled in.

## Proving it: the route solver

- `src/game/solver.ts` is a best-first search over Bobby's moves (walk, jump,
  climb, crawl, wait, kick, pie-and-run, scarf) using the real deterministic
  simulation, guided by a gravity-aware distance map to the next screen's edge.
- Boss screens use the bots in `src/game/bots.ts`.
- `npx vite-node scripts/solve.ts` records one route per zone into
  `src/content/routes/data.ts`. The attract demo plays them; the tests replay
  them.
- Bugs it found in the content (all fixed): a sausage roll at a screen
  entrance, a creditor stuck inside a bench, a scoreboard Bobby's head was
  inside, ladders off by one column, a mower that made a screen impossible.

## Presentation

- **Scaling**: integer in device pixels where it wastes less than about 16%
  of the space, otherwise fractional, nearest-neighbour. Only the 256-wide play
  area has to fit beside the controls; the black side borders may sit under
  them. A layout check (`scripts/check-layout.mjs`) confirms no button covers
  the play area at five phone sizes including 844x390.
- **CRT mode**: CSS scanlines and vignette over the canvas plus a small blurred
  copy blended on top for bloom. Costs almost nothing.
- **Sound**: every sample is generated at startup as 8-bit data; four music
  channels plus effects through a gentle low-pass. Music can be switched off
  for effects only. All tunes are original.
- **PWA in a single file**: `dist/index.html` is self-contained and works
  opened straight from the phone's storage. The build also writes
  `manifest.webmanifest`, `sw.js` and two icons beside it; when the folder is
  served over http(s) the game installs to the home screen, runs fullscreen in
  landscape and works offline.
- Everything in `localStorage` is under `bs.*` and versioned; Options has a
  reset.
