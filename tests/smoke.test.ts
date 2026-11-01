import { describe, it, expect } from 'vitest';
import { newWorld, step } from '../src/game/world';
import { IN_R, IN_J } from '../src/game/consts';

describe('smoke', () => {
  it('walks and jumps without throwing', () => {
    const w = newWorld({ zone: 0, seed: 1 });
    for (let i = 0; i < 200; i++) step(w, i % 40 === 0 ? IN_R | IN_J : IN_R);
    expect(w.frame).toBe(200);
  });
});
