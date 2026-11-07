// One of these every time Bobby dies. Tagged by cause and (optionally) zone.
// `next` is said instead if he dies again on the same screen straight after.
import { DeathCause } from '../../game/types';

export interface DeathLine { t: string; c: (DeathCause | 'any')[]; z?: number[]; next?: string }

export const DEATH_LINES: DeathLine[] = [
  // Any death
  { t: "THEY THINK IT'S ALL OVER...", c: ['any'], next: '...IT IS NOW.' },
  { t: 'HIBSED IT THERE.', c: ['any'] },
  { t: 'PLEASING.', c: ['any'] },
  { t: 'A GAME OF TWO HALVES. BOTH BAD.', c: ['any'] },
  { t: 'THE BOARD HAS EVERY CONFIDENCE IN BOBBY.', c: ['any'] },
  { t: 'SACKED BY TEXT.', c: ['any'] },
  { t: 'SQUEAKY BUM TIME. THE SQUEAK WON.', c: ['any'] },
  { t: 'OFFSIDE. ALSO DEAD.', c: ['any'] },
  { t: "WENT FOR IT. SHOULDNAE HAVE.", c: ['any'] },
  { t: 'VAR CHECK COMPLETE: STILL DEAD.', c: ['any'] },
  { t: "STRUGGLIN'. STILL STRUGGLIN'.", c: ['any'] },
  { t: "HE'LL BE DISAPPOINTED WITH THAT.", c: ['any'] },
  { t: "NO' THE WAY HE'D HAVE WANTED TO GO.", c: ['any'] },
  { t: 'THE FOURTH OFFICIAL HAS INDICATED: NO MORE BOBBY.', c: ['any'] },
  { t: "WE'LL TAKE THE POSITIVES. THERE ARE NONE.", c: ['any'] },
  { t: 'ONE GAME AT A TIME. THAT WAS THE GAME.', c: ['any'] },
  { t: 'RELEGATION FORM.', c: ['any'] },
  { t: 'A SOFT ONE TO LOSE.', c: ['any'] },
  { t: 'THE CHAIRMAN WILL BE IN TOUCH.', c: ['any'] },
  { t: 'A REAL SIX-POINTER. HE GOT NIL.', c: ['any'] },
  { t: 'GIVEN THE SPONGE. NOT ENOUGH SPONGE.', c: ['any'] },
  { t: 'BACK TO THE DRAWING BOARD. THE DRAWING BOARD IS ALSO BROKEN.', c: ['any'] },
  { t: "THE KIT MAN'S SEEN WORSE. NOT MUCH WORSE.", c: ['any'] },
  { t: 'NIL-NIL. AT BEST.', c: ['any'] },
  { t: 'A DRENCHING. IN FIFE, THAT IS SAYING SOMETHING.', c: ['any'], z: [0] },
  { t: 'THE SPONSORS HAVE ASKED FOR THEIR LOGO BACK.', c: ['any'], z: [1] },
  { t: 'SET OFF THE PYRO. AND BOBBY.', c: ['any'], z: [3] },

  // The giant ball
  { t: 'ROUND, LEATHER AND UNSTOPPABLE.', c: ['ball'] },
  { t: 'FLATTENED BY THE BEAUTIFUL GAME.', c: ['ball'] },
  { t: "THE BALL'S YOUR FRIEND, THEY SAID.", c: ['ball'] },
  { t: 'HEADED IT CLEAR. WITH HIS WHOLE BODY.', c: ['ball'] },
  { t: 'SHOULD HAVE KEPT IT ON THE DECK.', c: ['ball'] },
  { t: 'LACED UP AND LAID OUT.', c: ['ball'] },
  { t: 'IT WAS A CUP FINAL BALL. HE WAS A CUP FINAL BOBBY.', c: ['ball'], z: [3] },

  // Crushed
  { t: 'FLAT BACK FOUR. FLAT BOBBY ONE.', c: ['crushed'] },
  { t: "PANCAKED. IT WASNAE EVEN PANCAKE DAY.", c: ['crushed'] },
  { t: "THAT'S GONE RIGHT ON HIS HEID.", c: ['crushed'] },
  { t: 'UNDER PRESSURE. LITERALLY.', c: ['crushed'] },
  { t: 'SQUASHED LIKE A TITLE CHALLENGE.', c: ['crushed'] },
  { t: "THE ROOF'S COME IN. AGAIN.", c: ['crushed'], z: [0] },
  { t: 'THE STAND WAS CONDEMNED IN 1987. NOW SO IS BOBBY.', c: ['crushed', 'fall'], z: [0] },
  { t: 'BURIED IN PAPERWORK. AS USUAL.', c: ['crushed'], z: [2] },
  { t: 'THE BOARD HAVE COME DOWN ON HIM. HARD.', c: ['crushed'], z: [1] },
  { t: 'CRUSHED BY DEBT. LIKE EVERYBODY ELSE DOWN HERE.', c: ['crushed'], z: [2] },
  { t: 'SHREDDED. LIKE THE EVIDENCE.', c: ['crushed'], z: [1, 2] },

  // Falls
  { t: "THAT'S A RELEGATION.", c: ['fall'] },
  { t: 'DROPPED. LIKE THE CLUB IN 1994.', c: ['fall'] },
  { t: 'A LONG BALL. BOBBY WAS THE BALL.', c: ['fall'] },
  { t: 'TOOK A TUMBLE. NO PENALTY.', c: ['fall'] },
  { t: 'FELL THROUGH THE FLOOR. LIKE THE ATTENDANCE.', c: ['fall'] },
  { t: 'GRAVITY: UNBEATEN AT HOME.', c: ['fall'] },
  { t: 'THE TRAPDOOR WAS ON THE AGENDA. ITEM ONE.', c: ['fall'], z: [1] },
  { t: 'FREEFALL. LIKE THE SHARE PRICE.', c: ['fall'], z: [1, 2] },

  // Darts and hot tea
  { t: 'BULLSEYE. BOBBY WAS THE BULL.', c: ['dart'] },
  { t: "SHOULD HAVE DUCKED. HE'S USUALLY GOOD AT THAT.", c: ['dart'] },
  { t: 'THROUGH ON GOAL. THE DART WAS.', c: ['dart'] },
  { t: 'TWO SUGARS AND A FUNERAL.', c: ['dart'], z: [0] },
  { t: 'NAILED ON. IN EVERY SENSE.', c: ['dart'] },
  { t: "THE SUPPORTERS CLUB SAYS SORRY. IT DOESNAE MEAN IT.", c: ['dart'] },
  { t: 'HIT ON THE BREAK.', c: ['dart'] },

  // Studs and spikes
  { t: 'STUDS UP. RED CARD.', c: ['spike'] },
  { t: 'STRAIGHT RED. SEVERAL OF THEM.', c: ['spike'] },
  { t: 'TWO-FOOTED. FROM THE FLOOR.', c: ['spike'] },
  { t: 'AN AGRICULTURAL CHALLENGE.', c: ['spike'] },
  { t: 'LEFT HIS FOOT IN. ALL OF IT.', c: ['spike'] },
  { t: "THE GROUNDSMAN'S AERATED HIM.", c: ['spike'], z: [0] },
  { t: "THAT'S A BOOKING. FOR THE UNDERTAKER.", c: ['spike'] },

  // His own pie
  { t: "THAT'S A PIE TOO FAR.", c: ['pie'] },
  { t: 'SCOTCH PIE 1, BOBBY 0.', c: ['pie'] },
  { t: 'HOT IN THE MIDDLE. LIKE BOBBY NOW.', c: ['pie'] },
  { t: 'SHOULD HAVE LET IT COOL.', c: ['pie'] },
  { t: 'AN OWN GOAL. WITH GRAVY.', c: ['pie'] },
  { t: 'MINCED.', c: ['pie'] },
  { t: 'SENGA WILL BE GUTTED.', c: ['pie'] },

  // Enemies
  { t: 'TACKLED FROM BEHIND. NOTHING GIVEN.', c: ['enemy'] },
  { t: 'LOST THE SECOND BALL.', c: ['enemy'] },
  { t: 'MAN-MARKED. TO DEATH.', c: ['enemy'] },
  { t: 'BEATEN AT THE NEAR POST. BY A WASP.', c: ['enemy'] },
  { t: 'NUTMEGGED BY THE CLUB CAT.', c: ['enemy'], z: [0] },
  { t: 'OUTMUSCLED BY A SAUSAGE ROLL.', c: ['enemy'], z: [0] },
  { t: 'SERVED WITH AN INVOICE. AND THEN SOME.', c: ['enemy'], z: [2] },
  { t: "THE INFLATABLE WAS HARMLESS. THE FAN WASNAE.", c: ['enemy'], z: [3] },
  { t: 'NOT IN THE BUDGET.', c: ['enemy'], z: [1, 2] },

  // Bosses
  { t: 'PARKED THE BUS. IT RAN HIM OVER.', c: ['boss', 'crushed'], z: [3] },
  { t: 'TEN MEN BEHIND THE BALL. ONE ON TOP OF BOBBY.', c: ['boss'], z: [3] },
  { t: 'A CLEARANCE. BOBBY WAS CLEARED.', c: ['boss'], z: [3] },
  { t: 'ROLLED. LIKE A FRESH PITCH.', c: ['boss', 'crushed'], z: [0] },
  { t: 'KEEP OFF THE GRASS. HE MEANT IT.', c: ['boss'], z: [0] },
  { t: 'MANAGER OF THE MONTH: NOT BOBBY.', c: ['boss'], z: [1] },
  { t: "SACKED AGAIN. IT'S NO' EVEN THE END OF THE MONTH.", c: ['boss'], z: [1] },
  { t: 'PUT INTO ADMINISTRATION.', c: ['boss'], z: [2] },
  { t: 'THE ADMINISTRATOR HAS NOTED HIS PASSING. IN TRIPLICATE.', c: ['boss'], z: [2] },
  { t: 'BEATEN BY A TACTICS BOARD. A WEE MAGNET DID IT.', c: ['boss'], z: [1] },
];
