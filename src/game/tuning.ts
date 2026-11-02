// Every tuning value in one place. Speeds are pixels per 50 Hz frame.
export const T = {
  // Movement
  walkSpeed: 1.5,
  crawlSpeed: 0.75,
  climbSpeed: 1.25,
  jumpVy: 4.1,          // take-off speed; fixed arc, committed direction
  jumpVx: 1.6,
  gravity: 0.24,
  apexHang: 0.55,       // gravity is gentler at the top of a jump: a moment of hang time
  apexBand: 0.9,
  maxFall: 4.5,
  lethalFall: 100,      // pixels from the peak of a fall; more than this kills
  jumpBuffer: 7,        // frames a jump press is remembered before landing
  coyote: 5,            // frames after stepping off a ledge when a jump still works
  hitW: 10, hitH: 22, crouchH: 10,
  ladderGrab: 6,        // how far from a ladder's centre Bobby can grab it

  // Tools
  kickFrames: 12, kickLaunchFrame: 4,
  ballSpeed: 5, ballLife: 110, ballBounces: 1,
  pieFuse: 100, pieRadius: 26, pieDropFrames: 10, blastFrames: 18,
  scarfFrames: 16, scarfHitFrom: 4, scarfHitTo: 9, scarfReach: 28,
  stunFrames: 150,

  // Counts (Rick started with six of everything: see DECISIONS.md)
  startLives: 6, startBalls: 6, startPies: 6,
  maxLives: 9, maxBalls: 9, maxPies: 9,
  kitbagBalls: 3, stallPies: 3,
  extraLifeEvery: 20000,

  // Death and restart
  deathFrames: 95, deathSkipAfter: 45,
  marchFrames: 60,
  refundOnRestart: true,

  // Screens
  scrollFrames: 10,
  crumbleDelay: 18, trapdoorDelay: 3,
  enemyMinSpawnDist: 56,

  // Traps
  dropShake: 18,
  dartSpeed: 4,
  giantBallSpeed: 1.4,
};
