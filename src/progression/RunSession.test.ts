import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import type { RunClockState } from './difficultyClock';
import {
  applyRunSessionToPlayer,
  captureRunSession,
  isRunSession,
  type RunSession,
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

function clockState(): RunClockState {
  return {
    runStartedAt: 1000,
    nextBossAt: 99000,
    bossNumber: 2,
    bossReady: true,
    bossWarningShown: true,
  };
}

function validSession(): RunSession {
  const source = makePlayer({ health: 7, armor: 3, energy: 41.5 }, [0, 9000], 8800);

  return captureRunSession(source, {
    skillCooldownUntil: { ground_slam: 12345, blink: undefined },
    clock: clockState(),
  });
}

describe('RunSession', () => {
  it('chụp rồi áp giữ nguyên HP, giáp, năng lượng, hồi chiêu, dash và clock', () => {
    const session = validSession();
    const target = makePlayer({ health: 20, armor: 10, energy: 100 }, [0, 0], 0);

    applyRunSessionToPlayer(session, target);

    expect(target.state.vitals).toEqual({ health: 7, armor: 3, energy: 41.5 });
    expect(target.state.charges).toEqual([0, 9000]);
    expect(target.state.dashReadyAt).toBe(8800);
    expect(session.carry.skillCooldownUntil).toEqual({ ground_slam: 12345 });
    expect('blink' in session.carry.skillCooldownUntil).toBe(false);
    expect(session.clock).toEqual(clockState());
  });

  it('bản chụp độc lập với nguồn (sửa nguồn sau đó không đổi phiên)', () => {
    const source = makePlayer({ health: 5, armor: 1, energy: 10 }, [100], 0);
    const cooldowns: Record<string, number> = { a: 1 };
    const clock = clockState();
    const session = captureRunSession(source, { skillCooldownUntil: cooldowns, clock });

    source.state.vitals.health = 1;
    source.state.charges[0] = 999;
    cooldowns.a = 77;
    clock.bossNumber = 50;

    expect(session.carry.vitals?.health).toBe(5);
    expect(session.carry.dashChargeReadyAt).toEqual([100]);
    expect(session.carry.skillCooldownUntil.a).toBe(1);
    expect(session.clock.bossNumber).toBe(2);
  });

  it('applyRunSessionToPlayer bỏ qua vitals khi carry.vitals = null', () => {
    const session = validSession();

    session.carry.vitals = null;

    const target = makePlayer({ health: 20, armor: 10, energy: 100 }, [0], 0);

    applyRunSessionToPlayer(session, target);
    expect(target.state.vitals).toEqual({ health: 20, armor: 10, energy: 100 });
    expect(target.state.dashReadyAt).toBe(8800);
  });
});

describe('isRunSession', () => {
  it('chấp nhận bản hợp lệ (kể cả vitals null)', () => {
    const session = validSession();

    expect(isRunSession(session)).toBe(true);
    session.carry.vitals = null;
    expect(isRunSession(session)).toBe(true);
  });

  it('từ chối giá trị không phải phiên', () => {
    expect(isRunSession(null)).toBe(false);
    expect(isRunSession(undefined)).toBe(false);
    expect(isRunSession('run')).toBe(false);
    expect(isRunSession([])).toBe(false);
    expect(isRunSession({})).toBe(false);
  });

  it('từ chối thiếu carry hoặc clock', () => {
    const { clock, carry } = validSession();

    expect(isRunSession({ clock })).toBe(false);
    expect(isRunSession({ carry })).toBe(false);
  });

  it('từ chối NaN/Infinity ở số', () => {
    const a = validSession();
    a.clock.nextBossAt = Number.NaN;
    expect(isRunSession(a)).toBe(false);

    const b = validSession();
    b.carry.dashReadyAt = Number.POSITIVE_INFINITY;
    expect(isRunSession(b)).toBe(false);

    const c = validSession();
    if (c.carry.vitals) {
      c.carry.vitals.health = Number.NaN;
    }
    expect(isRunSession(c)).toBe(false);
  });

  it('từ chối vitals, dashChargeReadyAt, skillCooldownUntil, bossReady sai kiểu', () => {
    const a = validSession() as unknown as { carry: { vitals: unknown } };
    a.carry.vitals = 'full';
    expect(isRunSession(a)).toBe(false);

    const a2 = validSession() as unknown as { carry: { vitals: unknown } };
    a2.carry.vitals = { health: 1, armor: 1 };
    expect(isRunSession(a2)).toBe(false);

    const b = validSession() as unknown as { carry: { dashChargeReadyAt: unknown } };
    b.carry.dashChargeReadyAt = 'x';
    expect(isRunSession(b)).toBe(false);

    const b2 = validSession() as unknown as { carry: { dashChargeReadyAt: unknown } };
    b2.carry.dashChargeReadyAt = [1, 'y'];
    expect(isRunSession(b2)).toBe(false);

    const c = validSession() as unknown as { carry: { skillCooldownUntil: unknown } };
    c.carry.skillCooldownUntil = { ground_slam: 'soon' };
    expect(isRunSession(c)).toBe(false);

    const d = validSession() as unknown as { clock: { bossReady: unknown } };
    d.clock.bossReady = 1;
    expect(isRunSession(d)).toBe(false);

    const e = validSession() as unknown as { clock: { bossWarningShown: unknown } };
    e.clock.bossWarningShown = 'yes';
    expect(isRunSession(e)).toBe(false);
  });

  it('JSON khứ hồi vẫn hợp lệ', () => {
    const session = validSession();
    const copy: unknown = JSON.parse(JSON.stringify(session));

    expect(isRunSession(copy)).toBe(true);
    expect(copy).toEqual(session);
  });
});

describe('cấu trúc RunSession', () => {
  it('khóa carry và clock khớp whitelist, không có pendingRestore', () => {
    const session = validSession();

    expect(Object.keys(session).sort()).toEqual(['carry', 'clock']);
    expect(Object.keys(session.carry).sort()).toEqual(
      ['dashChargeReadyAt', 'dashReadyAt', 'skillCooldownUntil', 'vitals'].sort(),
    );
    expect(Object.keys(session.clock).sort()).toEqual(
      ['bossNumber', 'bossReady', 'bossWarningShown', 'nextBossAt', 'runStartedAt'].sort(),
    );
    expect('pendingRestore' in session).toBe(false);
  });
});

describe('khóa nguồn WorldScene (bẫy scene.restart giữ data cũ)', () => {
  const text = readFileSync(new URL('../scenes/WorldScene.ts', import.meta.url), 'utf8');

  it('restartRun truyền data tường minh, không gọi restart trần', () => {
    expect(text).toContain('scene.restart({');
    expect(text).not.toContain('scene.restart()');
  });

  it('startPortalTravel truyền ticket + clock trong scene.start, không truyền nguyên run', () => {
    const start = text.indexOf('private startPortalTravel');
    const end = text.indexOf('private updatePortalVisual');

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);

    const call = /scene\.start\(([^)]*)\)/.exec(text.slice(start, end));

    expect(call).not.toBeNull();

    const args = call?.[1] ?? '';

    expect(args).toMatch(/\bticket\b/);
    expect(args).toMatch(/\bclock\s*:/);
    expect(args).not.toMatch(/\brun\s*[:,]/);
  });

  it('P3d: listener RESUME đăng ký bằng phương thức có tên và gỡ trong SHUTDOWN (không tích luỹ qua restart)', () => {
    expect(text).toContain('this.events.on(Phaser.Scenes.Events.RESUME, this.handleResume, this)');
    expect(text).not.toMatch(/events\.on\(Phaser\.Scenes\.Events\.RESUME,\s*\(/);

    const shutdown = text.indexOf('this.events.once(Phaser.Scenes.Events.SHUTDOWN');
    const shutdownEnd = text.indexOf('\n    });', shutdown);

    expect(shutdown).toBeGreaterThan(-1);
    expect(text.slice(shutdown, shutdownEnd)).toContain(
      'this.events.off(Phaser.Scenes.Events.RESUME, this.handleResume, this)',
    );
  });

  it('P3d: resetPlayerRuntimeState đặt lại lastAim về (1, 0)', () => {
    const start = text.indexOf('private resetPlayerRuntimeState');
    const end = text.indexOf('\n  }', start);

    expect(start).toBeGreaterThan(-1);
    expect(text.slice(start, end)).toContain('this.lastAim.set(1, 0);');
    expect(text).toContain('lastAim = new Phaser.Math.Vector2(1, 0)');
  });
});
