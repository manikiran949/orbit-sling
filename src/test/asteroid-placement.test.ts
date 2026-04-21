import { describe, it, expect } from 'vitest';
import { createInitialState } from '@/game/engine';

/**
 * Asteroids must never spawn inside a planet's orbit sphere — the rocket's
 * capture spiral passes through that zone, so an asteroid there is an
 * unavoidable collision. generateAsteroid enforces this; this test runs many
 * independent initial-state generations and checks the invariant across all
 * spawned asteroids.
 */
describe('asteroid placement', () => {
  it('never places an asteroid inside any planet orbit sphere', () => {
    const RUNS = 500;
    const CANVAS_H = 600;
    // Engine uses a 20-unit safety buffer; we check with a smaller slack so
    // we're testing the invariant, not the engine's chosen buffer.
    const MIN_SLACK = 4;

    const violations: string[] = [];
    let totalAsteroids = 0;

    for (let i = 0; i < RUNS; i++) {
      const state = createInitialState(CANVAS_H);
      totalAsteroids += state.asteroids.length;

      for (const a of state.asteroids) {
        for (const p of state.planets) {
          const dist = Math.hypot(a.x - p.x, a.y - p.y);
          const forbidden = p.orbitRadius + a.radius + MIN_SLACK;
          if (dist < forbidden) {
            violations.push(
              `run ${i}: asteroid(${a.x.toFixed(0)},${a.y.toFixed(0)} r=${a.radius.toFixed(1)}) ` +
              `vs planet(${p.x.toFixed(0)},${p.y.toFixed(0)} orbitR=${p.orbitRadius.toFixed(1)}) ` +
              `dist=${dist.toFixed(1)} forbidden<${forbidden.toFixed(1)}`
            );
            break;
          }
        }
      }
    }

    expect(totalAsteroids).toBeGreaterThan(0);
    if (violations.length > 0) {
      throw new Error(
        `${violations.length} asteroid placement violations out of ${totalAsteroids} asteroids:\n` +
        violations.slice(0, 10).join('\n')
      );
    }
  });

  it('handles dense planet fields without falling back to overlapping placements', () => {
    // Higher run count stresses the retry + null-fallback path. If the random
    // search ever fails to find a safe spot in a dense layout, it returns null
    // and the caller skips instead of forcing a bad asteroid. We assert the
    // same invariant across many runs at varied canvas heights.
    const heights = [480, 600, 800, 1000];
    const PER_HEIGHT = 150;
    const MIN_SLACK = 4;

    for (const h of heights) {
      for (let i = 0; i < PER_HEIGHT; i++) {
        const state = createInitialState(h);
        for (const a of state.asteroids) {
          for (const p of state.planets) {
            const dist = Math.hypot(a.x - p.x, a.y - p.y);
            const forbidden = p.orbitRadius + a.radius + MIN_SLACK;
            expect(dist, `h=${h} run=${i}`).toBeGreaterThanOrEqual(forbidden);
          }
        }
      }
    }
  });
});
