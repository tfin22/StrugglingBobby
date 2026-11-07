// Boss tuning and names. Patterns, not damage sponges.
export const BOSSES = {
  tam: { name: 'BIG TAM', title: 'THE GROUNDSMAN', speeds: [0.9, 1.25, 1.6], stuck: 270, bogTime: 260, valveCooldown: 200 },
  motm: {
    name: 'THE MANAGER OF THE MONTH', title: 'THIS MONTH, ANYWAY',
    names: ['APPOINTED: THE TACTICIAN. BRINGS HIS OWN BOARDS.', 'APPOINTED: THE DOSSIER MAN. HE HAS DONE HIS HOMEWORK.', 'APPOINTED: THE SULKER. HE DIDNAE WANT THIS JOB.'],
    speeds: [0.5, 0.45, 0.8], throwEvery: 85, sulkFor: 110,
  },
  admin: { name: 'THE ADMINISTRATOR', title: 'CALM. GREY. THOROUGH.', speed: 0.4, paperEvery: 115, creditorEvery: 400, disarmed: 280 },
  dougie: { name: '"BRING YER DINNER" DOUGIE', title: 'THE MOST DEFENSIVE MANAGER IN THE LAND', waveEvery: 130, waveTell: 30, jumpV: 3.4, busSpeed: 1.1, busStopX: 72 },
  lada: { name: 'THE BARON', title: 'IN A LADA WITH GOLD HUBCAPS', speed: 1.35, near: 60, far: 150, hubcapEvery: 75, hubcapSpeed: 2 },
};
