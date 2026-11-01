import { ZoneDef } from './types';
export const ZONE4: ZoneDef = {
  n: 3, name: 'ZONE 4', sub: 'TEST', music: 'zone4',
  start: { screen: 'z4s01', x: 2, y: 9 },
  screens: [
    {
      id: 'z4s01', at: [0, 0], name: 'TEST SCREEN',
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
