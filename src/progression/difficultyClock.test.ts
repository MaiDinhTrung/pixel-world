import { describe, expect, it } from 'vitest';

import { MAX_THREAT_TIER, THREAT_INTERVAL_MS } from '../config/combatConfig';
import { decideBossAction, type BossTickAction } from '../world/bossArenaRules';
import { timeThreatTier } from '../world/worldGraph';
import {
  createRunSessionClock,
  newRunClockState,
  type RunClockState,
} from './difficultyClock';
import {
  captureRunSession,
  extractRunSceneState,
  type RunVitals,
} from './RunSession';

const FIRST_DELAY = 120000;
const RESPAWN = 150000;
const WARNING = 5000;
const ENTRY_DELAY = 2000;

function base(): RunClockState {
  return {
    runStartedAt: 1000,
    nextBossAt: 121000,
    bossNumber: 2,
    bossReady: false,
    bossWarningShown: false,
  };
}

function makePlayer() {
  const vitals: RunVitals = { health: 5, armor: 1, energy: 10 };

  return {
    getVitals: () => vitals,
    getDashChargeReadyAt: () => [0],
    getDashReadyAt: () => 0,
  };
}

describe('newRunClockState', () => {
  it('đúng 5 giá trị khởi tạo', () => {
    expect(newRunClockState(5000, FIRST_DELAY)).toEqual({
      runStartedAt: 5000,
      nextBossAt: 125000,
      bossNumber: 0,
      bossReady: false,
      bossWarningShown: false,
    });
  });
});

describe('DifficultyClock thời gian', () => {
  it('timeTier khớp timeThreatTier trên lưới điểm, biên, trần, âm', () => {
    const start = 7000;
    const clock = createRunSessionClock(newRunClockState(start, FIRST_DELAY));
    const elapsedList: number[] = [-5000, -1, 0, 1];

    for (let k = 1; k <= MAX_THREAT_TIER + 3; k += 1) {
      elapsedList.push(k * THREAT_INTERVAL_MS - 1, k * THREAT_INTERVAL_MS);
    }

    for (const elapsed of elapsedList) {
      expect(clock.timeTier(start + elapsed)).toBe(timeThreatTier(elapsed));
    }

    expect(clock.timeTier(start + THREAT_INTERVAL_MS - 1)).toBe(0);
    expect(clock.timeTier(start + THREAT_INTERVAL_MS)).toBe(1);
    expect(clock.timeTier(start + 1000 * THREAT_INTERVAL_MS)).toBe(MAX_THREAT_TIER);
    expect(clock.timeTier(start - 9999)).toBe(0);
  });

  it('elapsedMs = now - runStartedAt', () => {
    const clock = createRunSessionClock(base());

    expect(clock.elapsedMs(1000)).toBe(0);
    expect(clock.elapsedMs(4500)).toBe(3500);
    expect(clock.elapsedMs(500)).toBe(-500);
  });
});

describe('DifficultyClock lệnh', () => {
  it('markBossReady chỉ đổi bossReady', () => {
    const clock = createRunSessionClock(base());

    clock.markBossReady();
    expect(clock.snapshot()).toEqual({ ...base(), bossReady: true });
  });

  it('markWarningShown chỉ đổi bossWarningShown', () => {
    const clock = createRunSessionClock(base());

    clock.markWarningShown();
    expect(clock.snapshot()).toEqual({ ...base(), bossWarningShown: true });
  });

  it('onBossSpawned: bossReady=false, bossNumber+1, không đụng trường khác', () => {
    const clock = createRunSessionClock({
      ...base(),
      bossReady: true,
      bossWarningShown: true,
    });

    clock.onBossSpawned();
    expect(clock.snapshot()).toEqual({
      ...base(),
      bossReady: false,
      bossNumber: 3,
      bossWarningShown: true,
    });
  });

  it('onBossDefeated: nextBossAt=now+respawn, bossWarningShown=false, không đụng trường khác', () => {
    const clock = createRunSessionClock({
      ...base(),
      bossReady: true,
      bossWarningShown: true,
    });

    clock.onBossDefeated(50000, RESPAWN);
    expect(clock.snapshot()).toEqual({
      ...base(),
      bossReady: true,
      bossWarningShown: false,
      nextBossAt: 50000 + RESPAWN,
    });
  });

  it('getter phản ánh trạng thái hiện tại', () => {
    const clock = createRunSessionClock(base());

    clock.markBossReady();
    clock.onBossSpawned();
    expect(clock.bossNumber).toBe(3);
    expect(clock.bossReady).toBe(false);
    expect(clock.runStartedAt).toBe(1000);
    expect(clock.nextBossAt).toBe(121000);
    expect(clock.bossWarningShown).toBe(false);
  });
});

describe('DifficultyClock snapshot độc lập', () => {
  it('sửa snapshot không đổi clock', () => {
    const clock = createRunSessionClock(base());
    const snap = clock.snapshot();

    snap.bossNumber = 99;
    snap.bossReady = true;
    expect(clock.bossNumber).toBe(2);
    expect(clock.bossReady).toBe(false);
  });

  it('sửa trạng thái ban đầu không đổi clock', () => {
    const initial = base();
    const clock = createRunSessionClock(initial);

    initial.bossNumber = 50;
    initial.nextBossAt = 1;
    expect(clock.bossNumber).toBe(2);
    expect(clock.nextBossAt).toBe(121000);
  });

  it('hai snapshot liên tiếp là hai đối tượng khác nhau', () => {
    const clock = createRunSessionClock(base());

    expect(clock.snapshot()).not.toBe(clock.snapshot());
  });
});

describe('DifficultyClock qua RunSession', () => {
  it('khứ hồi capture -> extract -> clock mới tương đương', () => {
    const clock = createRunSessionClock(base());

    clock.markBossReady();
    clock.markWarningShown();

    const session = captureRunSession(makePlayer(), {
      skillCooldownUntil: {},
      ...clock.snapshot(),
    });
    const restored = createRunSessionClock(extractRunSceneState(session));

    expect(restored.snapshot()).toEqual(clock.snapshot());
    expect(restored).not.toBe(clock);
  });

  it('đồng hồ không đặt lại khi mang qua RunSession; newRunClockState tạo mới', () => {
    const clock = createRunSessionClock(newRunClockState(1000, FIRST_DELAY));

    clock.onBossSpawned();

    const session = captureRunSession(makePlayer(), {
      skillCooldownUntil: {},
      ...clock.snapshot(),
    });
    const carried = createRunSessionClock(extractRunSceneState(session));

    expect(carried.runStartedAt).toBe(1000);
    expect(carried.nextBossAt).toBe(1000 + FIRST_DELAY);
    expect(carried.bossNumber).toBe(1);

    const fresh = createRunSessionClock(newRunClockState(900000, FIRST_DELAY));

    expect(fresh.runStartedAt).toBe(900000);
    expect(fresh.nextBossAt).toBe(900000 + FIRST_DELAY);
    expect(fresh.bossNumber).toBe(0);
  });
});

// ── Mô hình đối chiếu: trạng thái thuần theo logic inline cũ của WorldScene ──

class ModelState {
  runStartedAt: number;
  nextBossAt: number;
  bossNumber = 0;
  bossReady = false;
  bossWarningShown = false;

  constructor(now: number) {
    this.runStartedAt = now;
    this.nextBossAt = now + FIRST_DELAY;
  }

  apply(action: BossTickAction): void {
    if (action === 'spawn') {
      this.bossReady = false;
      this.bossNumber += 1;
    } else if (action === 'mark_ready') {
      this.bossReady = true;
    } else if (action === 'warn') {
      this.bossWarningShown = true;
    }
  }

  defeated(now: number): void {
    this.nextBossAt = now + RESPAWN;
    this.bossWarningShown = false;
  }
}

describe('DifficultyClock đối chiếu mô hình trạng thái thuần', () => {
  it('cùng chuỗi now: action và 5 trường bằng nhau từng bước', () => {
    const start = 3000;
    const clock = createRunSessionClock(newRunClockState(start, FIRST_DELAY));
    const model = new ModelState(start);
    let bossAlive = false;
    let inArena = false;
    let arenaEntryAt: number | null = null;
    const actions: BossTickAction[] = [];

    function step(now: number): void {
      const input = (c: {
        nextBossAt: number;
        bossReady: boolean;
        bossWarningShown: boolean;
      }) => ({
        inArena,
        now,
        nextBossAt: c.nextBossAt,
        bossAlive,
        bossReady: c.bossReady,
        bossWarningShown: c.bossWarningShown,
        warningMs: WARNING,
        arenaEntryAt,
        entrySpawnDelayMs: ENTRY_DELAY,
      });
      const fromClock = decideBossAction(input(clock));
      const fromModel = decideBossAction(input(model));

      expect(fromClock).toBe(fromModel);
      actions.push(fromClock);

      if (fromClock === 'spawn') {
        clock.onBossSpawned();
        bossAlive = true;
      } else if (fromClock === 'mark_ready') {
        clock.markBossReady();
      } else if (fromClock === 'warn') {
        clock.markWarningShown();
      }

      model.apply(fromModel);
      expect(clock.snapshot()).toEqual({
        runStartedAt: model.runStartedAt,
        nextBossAt: model.nextBossAt,
        bossNumber: model.bossNumber,
        bossReady: model.bossReady,
        bossWarningShown: model.bossWarningShown,
      });
    }

    // Map chính: đếm tới cảnh báo rồi hết giờ.
    for (let now = start; now <= start + FIRST_DELAY + 1000; now += 1000) {
      step(now);
    }

    expect(clock.bossReady).toBe(true);

    // Vào Arena rồi Boss ra sau độ trễ.
    inArena = true;
    arenaEntryAt = start + FIRST_DELAY + 10000;

    for (let now = arenaEntryAt; now <= arenaEntryAt + 4000; now += 500) {
      step(now);
    }

    expect(clock.bossNumber).toBe(1);
    expect(model.bossNumber).toBe(1);

    // Hạ Boss, lịch Boss kế, rồi cảnh báo và sinh Boss 2 khi còn ở Arena.
    const defeatedAt = arenaEntryAt + 20000;

    bossAlive = false;
    clock.onBossDefeated(defeatedAt, RESPAWN);
    model.defeated(defeatedAt);
    expect(clock.nextBossAt).toBe(model.nextBossAt);
    expect(clock.bossWarningShown).toBe(false);

    for (
      let now = defeatedAt;
      now <= defeatedAt + RESPAWN + 3000;
      now += 1000
    ) {
      step(now);
    }

    expect(actions).toContain('warn');
    expect(actions).toContain('mark_ready');
    expect(actions).toContain('spawn');
    expect(clock.bossNumber).toBe(2);
    expect(model.bossNumber).toBe(2);
  });
});
