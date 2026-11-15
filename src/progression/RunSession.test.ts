import { describe, expect, it } from 'vitest';

import {
  applyRunSessionToPlayer,
  captureRunSession,
  createRunSession,
  extractRunSceneState,
  isRestorable,
  type RunVitals,
} from './RunSession';

function makePlayer(vitals: RunVitals, charges: number[], dashReadyAt: number) {
  const state = { vitals, charges, dashReadyAt };

  return {
    state,
    getVitals: () => state.vitals,
    getDashChargeReadyAt: () => [...state.charges],
    getDashReadyAt: () => state.dashReadyAt,
    setVitals: (v: RunVitals) => {
      state.vitals = { ...v };
    },
    setDashChargeReadyAt: (r: readonly number[]) => {
      state.charges = [...r];
    },
    setDashReadyAt: (r: number) => {
      state.dashReadyAt = r;
    },
  };
}

describe('RunSession', () => {
  it('lượt mới: đồng hồ Boss tính từ now, chưa chờ khôi phục', () => {
    const session = createRunSession(5000, 120000);

    expect(session.nextBossAt).toBe(125000);
    expect(session.runStartedAt).toBe(5000);
    expect(session.bossNumber).toBe(0);
    expect(session.bossReady).toBe(false);
    expect(isRestorable(session)).toBe(false);
  });

  it('chụp rồi áp giữ nguyên HP, giáp, năng lượng, hồi chiêu, dash, bossNumber, nextBossAt', () => {
    const source = makePlayer({ health: 7, armor: 3, energy: 41.5 }, [0, 9000], 8800);
    const session = captureRunSession(source, {
      skillCooldownUntil: { ground_slam: 12345, blink: undefined },
      runStartedAt: 1000,
      nextBossAt: 99000,
      bossNumber: 2,
      bossReady: true,
      bossWarningShown: true,
    });

    expect(isRestorable(session)).toBe(true);

    const target = makePlayer({ health: 20, armor: 10, energy: 100 }, [0, 0], 0);

    applyRunSessionToPlayer(session, target);
    const scene = extractRunSceneState(session);

    expect(target.state.vitals).toEqual({ health: 7, armor: 3, energy: 41.5 });
    expect(target.state.charges).toEqual([0, 9000]);
    expect(target.state.dashReadyAt).toBe(8800);
    expect(scene.skillCooldownUntil).toEqual({ ground_slam: 12345 });
    expect(scene.nextBossAt).toBe(99000);
    expect(scene.bossNumber).toBe(2);
    expect(scene.bossReady).toBe(true);
    expect(scene.bossWarningShown).toBe(true);
    expect(scene.runStartedAt).toBe(1000);
  });

  it('bản chụp độc lập với nguồn (sửa nguồn sau đó không đổi phiên)', () => {
    const source = makePlayer({ health: 5, armor: 1, energy: 10 }, [100], 0);
    const cooldowns: Record<string, number> = { a: 1 };
    const session = captureRunSession(source, {
      skillCooldownUntil: cooldowns,
      runStartedAt: 0,
      nextBossAt: 1,
      bossNumber: 0,
      bossReady: false,
      bossWarningShown: false,
    });

    source.state.vitals.health = 1;
    source.state.charges[0] = 999;
    cooldowns.a = 77;

    expect(session.vitals?.health).toBe(5);
    expect(session.dashChargeReadyAt).toEqual([100]);
    expect(session.skillCooldownUntil.a).toBe(1);
  });
});
