import { ZoneDef } from './types';
export const ZONE3: ZoneDef = {
  n: 2, name: 'ZONE 3', sub: 'TEST', music: 'zone3',
  start: { screen: 'z3s01', x: 2, y: 9 },
  screens: [
    {
      id: 'z3s01', at: [0, 0], name: 'TEST SCREEN',
      map: [
        '################',
        '#::::::::::::::#',
        '#::::::::::::::#',
        '#:::::::::::H::#',
        '#----:::::::H::#',
        '#:::::::####H###',
        '#:::::::::::H::#',
        '#:::::::::::H::#',
        '#::::::::::::::#',
        '#::::::::^^::::#',
        '################',
      ],
      ents: [{ t: 'kitbag', x: 3, y: 9 }, { t: 'trap', type: 'lamp', x: 6, y: 1 }],
    },
  ],
};
