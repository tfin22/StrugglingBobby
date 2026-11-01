// Cutscenes, the cast card, How to Play, game over and credits.
export interface Panel { scene: string; lines: string[] }

export const CUTSCENES: Record<string, Panel[]> = {
  intro: [
    { scene: 'cabinet', lines: ['HARBOUR PARK, LEVENMOUTH.', 'HOME OF LEVENMOUTH ATHLETIC.', 'THE CLUB HAS WON ONE THING IN ITS HISTORY:', 'THE AULD CUP. 1938.'] },
    { scene: 'empty', lines: ['IT HAS SAT IN THIS CABINET EVER SINCE.', 'THE ONLY THING AT THE CLUB', "THAT'S NEVER BEEN SOLD.", 'UNTIL THIS MORNING.'] },
    { scene: 'note', lines: ['"TAKEN AS SECURITY.', 'KIND REGARDS,', 'THE BARON."'] },
    { scene: 'bobby', lines: ["BOBBY STRUGGLIN'.", 'MANAGER. KITMAN. PHYSIO.', 'OCCASIONAL GROUNDSMAN.', "HE'S BEEN STRUGGLIN'. HE'S GOING TO GET IT BACK."] },
  ],
  after1: [
    { scene: 'lada', lines: ['A LADA WITH GOLD HUBCAPS', 'PULLS AWAY FROM HARBOUR PARK.', 'IN THE BACK: A FUR HAT, A PHONE,', 'AND THE RECEIPTS FOR HALF THE LEAGUE.'] },
    { scene: 'phone', lines: ['BOBBY RINGS THE BARON.', 'THE BARON DOES NOT ANSWER.', 'THE BARON NEVER ANSWERS.'] },
  ],
  after2: [
    { scene: 'chairman', lines: ['THE CHAIRMAN CALLS A PRESS CONFERENCE.', '"I WANT TO MAKE IT CLEAR', 'THAT BOBBY HAS THE FULL BACKING', 'OF THE BOARD."'] },
    { scene: 'bag', lines: ['BOBBY PACKS A BAG.'] },
  ],
  after3: [
    { scene: 'stadium', lines: ['CUP FINAL DAY. THE NATIONAL STADIUM.', 'THE BARON HAS PUT THE AULD CUP ON SHOW.', 'AND HE HAS HIRED', '"BRING YER DINNER" DOUGIE TO MIND IT.'] },
  ],
  ending: [
    { scene: 'cuphome', lines: ['THE AULD CUP COMES HOME', 'TO HARBOUR PARK.', 'BACK IN ITS CABINET,', 'WHERE IT BELONGS.'] },
    { scene: 'pies', lines: ["SENGA'S PIES ARE ON THE HOUSE.", 'ONE EACH.', 'SHE IS COUNTING.'] },
    { scene: 'chairman', lines: ['THE CHAIRMAN WOULD LIKE TO SAY', 'THAT HE HAS EVERY CONFIDENCE', 'IN BOBBY.', 'BOBBY IS NO LONGER WORRIED. MOSTLY.'] },
  ],
};

export const CAST: { who: string; sprite: string; line: string }[] = [
  { who: "BOBBY STRUGGLIN'", sprite: 'bobby', line: 'MANAGER, KITMAN, PHYSIO. UNBEATEN IN OPTIMISM.' },
  { who: 'SENGA', sprite: 'senga', line: 'RUNS THE PIE HUT. PIES, GOSSIP, THE ODD HINT.' },
  { who: 'WEE ECK', sprite: 'eck', line: 'THE KITMAN. LEAVES KIT BAGS IN ODD PLACES.' },
  { who: 'THE CHAIRMAN', sprite: 'chairman', line: 'HAS EVERY CONFIDENCE IN BOBBY. UH-OH.' },
  { who: 'THE BARON', sprite: 'baron', line: 'FUR HAT. GOLD HUBCAPS. NEVER ANSWERS.' },
  { who: 'BIG TAM', sprite: 'tam', line: 'THE GROUNDSMAN. KEEP OFF THE GRASS.' },
  { who: 'THE MANAGER OF THE MONTH', sprite: 'motm1', line: 'THIS MONTH. AND THE NEXT. AND THE NEXT.' },
  { who: 'THE ADMINISTRATOR', sprite: 'administrator', line: 'CALM. GREY. HAS A CLIPBOARD.' },
  { who: '"BRING YER DINNER" DOUGIE', sprite: 'dougie', line: 'WILL PARK THE ACTUAL BUS.' },
];

export const HOW_TO_PLAY: string[] = [
  'MOVE WITH THE PAD. DOWN TO CROUCH AND CRAWL. UP AND DOWN ON LADDERS.',
  'JUMPS ARE COMMITTED. PICK YOUR DIRECTION BEFORE YOU GO, LIKE A TRANSFER.',
  'KICK: VOLLEY A BALL. LIMITED SUPPLY. WEE ECK LEAVES KIT BAGS.',
  'PIE: DROP A LIT SCOTCH PIE AND RUN. IT SHIFTS CRACKED WALLS. AND YOU.',
  'SCARF: A FLICK OF THE BLACK AND GOLD. SETS OFF TRAPS FROM A SAFE STEP AWAY, STUNS, PULLS LEVERS AND PUTS OUT A PIE YOU REGRET.',
  'EVERY TRAP HAS A TELL. A LOOSE BRICK. A CRACK. A HOLE IN THE WALL. LOOK FIRST.',
  "ONE HIT AND YOU'RE OFF. BACK TO THE START OF THE SCREEN, TOOLS REFUNDED.",
  'ONE SCREEN AT A TIME, LADS. ONE SCREEN AT A TIME.',
];

export const GAME_OVER = 'BOBBY HAS LEFT THE CLUB BY MUTUAL CONSENT.';

export const CREDITS: string[] = [
  "BOBBY STRUGGLIN'",
  '',
  'AN AMIGA-STYLE HOMAGE TO',
  'RICK DANGEROUS (CORE DESIGN, 1989)',
  '',
  'A PERSONAL PROJECT. NOT FOR PUBLICATION.',
  '',
  'ALL ART, SOUND, MUSIC AND WORDS',
  'MADE FROM SCRATCH, IN CODE.',
  '',
  'EVERY CHARACTER, CLUB, GROUND,',
  'CUP AND SPONSOR IS INVENTED.',
  '',
  'LEVENMOUTH ATHLETIC',
  'MANAGER: BOBBY STRUGGLIN\'',
  'PIES: SENGA',
  'KIT: WEE ECK',
  'CONFIDENCE: THE CHAIRMAN',
  '',
  'FOR EVERYONE WHO EVER STOOD',
  'ON A SCOTTISH TERRACE IN THE RAIN.',
  '',
  'STRUGGLIN\'. STILL STRUGGLIN\'.',
  'BUT NO\' TODAY.',
];

export const ZONE_CARDS = [
  { title: 'ZONE 1', name: 'HARBOUR PARK', sub: 'HOME. SUCH AS IT IS.' },
  { title: 'ZONE 2', name: "THE BARON'S BOARDROOM", sub: 'EVERY TROPHY HAS A RECEIPT.' },
  { title: 'ZONE 3', name: 'THE LIQUIDATION VAULTS', sub: 'NEWCO FC (FORMERLY OLDCO FC)' },
  { title: 'ZONE 4', name: 'THE NATIONAL STADIUM', sub: 'CUP FINAL DAY.' },
];
