export interface PickupType { name: string; points: number; balls?: number; pies?: number; lives?: number; msg: string; w: number; h: number }

export const PICKUPS: Record<string, PickupType> = {
  kitbag: { name: 'KIT BAG', points: 50, balls: 3, msg: 'KIT BAG. WEE ECK STRIKES AGAIN.', w: 14, h: 12 },
  piestall: { name: 'PIE STALL', points: 50, pies: 3, msg: "SENGA'S PIES. STILL WARM.", w: 16, h: 16 },
  bovril: { name: 'FLASK OF BOVRIL', points: 500, lives: 1, msg: 'A FLASK OF BOVRIL. EXTRA LIFE!', w: 8, h: 12 },
  programme: { name: 'MATCH PROGRAMME', points: 250, msg: 'A MATCH PROGRAMME. 1974. MINT.', w: 10, h: 12 },
  card: { name: 'FOOTBALL CARD', points: 200, msg: 'A FOOTBALL CARD. GOT, GOT, NEED.', w: 8, h: 10 },
  signedball: { name: 'SIGNED BALL', points: 500, msg: 'A SIGNED BALL. NOBODY KNOWS WHO.', w: 10, h: 10 },
  horseshoe: { name: 'LUCKY HORSESHOE', points: 300, msg: 'A LUCKY HORSESHOE. ABOUT TIME.', w: 10, h: 10 },
  mug: { name: 'COMMEMORATIVE MUG', points: 300, msg: 'A COMMEMORATIVE MUG. CHIPPED.', w: 10, h: 10 },
};
// Pickups that score but stay collected after a restart.
export const POINTS_PICKUPS = ['programme', 'card', 'signedball', 'horseshoe', 'mug', 'bovril'];
