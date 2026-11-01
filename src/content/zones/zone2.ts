import { ZoneDef } from './types';
export const ZONE2: ZoneDef = {
  n: 1, name: 'ZONE 2', sub: 'TEST', music: 'zone2',
  start: { screen: 'z2s01', x: 2, y: 9 },
  screens: [
    {
      id: 'z2s01', at: [0, 0], name: 'TEST SCREEN',
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
