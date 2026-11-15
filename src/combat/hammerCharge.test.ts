import { describe, expect, it } from 'vitest';

import {
  HammerChargeMachine,
  type HammerChargeConfig,
  type HammerStrike,
} from './hammerCharge';

const CFG: HammerChargeConfig = {
  raiseMs: 170,
  readyMs: 1000,
  swingMs: 80,
  chargedSwingMs: 100,
  recoverMs: 230,
  chargedRecoverMs: 300,
  cooldownMs: 560,
  chargedCooldownMs: 700,
  chargeMoveFactor: 0.6,
  swingMoveFactor: 0.4,
  chargedSwingMoveFactor: 0.2,
};

function make(multiplier = 1): HammerChargeMachine {
  return new HammerChargeMachine(CFG, () => multiplier);
}

/** Chạy tick mỗi 10 ms trong [from, to], gom sự kiện: thời điểm ready và các impact. */
function run(
  m: HammerChargeMachine,
  from: number,
  to: number,
  step = 10,
): { ready: number[]; impacts: { at: number; strike: HammerStrike }[] } {
  const ready: number[] = [];
  const impacts: { at: number; strike: HammerStrike }[] = [];

  for (let t = from; t <= to; t += step) {
    const e = m.tick(t, 0);

    if (e.ready) {
      ready.push(t);
    }

    if (e.impact) {
      impacts.push({ at: t, strike: e.impact });
    }
  }

  return { ready, impacts };
}

describe('Búa: máy trạng thái 2 kiểu', () => {
  it('tap ngắn: raise rồi swing thường, impact đúng 250 ms sau nhấn', () => {
    const m = make();

    expect(m.press(1000, 0)).toBe(true);
    expect(m.getPhase()).toBe('raise');
    expect(m.release(1050, 0)).toBe(false);
    expect(m.tick(1169, 0).impact).toBeNull();
    expect(m.getPhase()).toBe('raise');
    expect(m.tick(1170, 0).impact).toBeNull();
    expect(m.getPhase()).toBe('swing');
    expect(m.getStrike()).toBe('normal');
    expect(m.tick(1249, 0).impact).toBeNull();
    expect(m.tick(1250, 0).impact).toBe('normal');
    expect(m.getPhase()).toBe('recover');
  });

  it('thả ở 169/170/171 ms đều ra đòn thường, không trễ thêm', () => {
    const expected: Record<number, number> = { 169: 250, 170: 250, 171: 251 };

    for (const held of [169, 170, 171]) {
      const m = make();

      m.press(0, 0);
      expect(m.release(held, 0)).toBe(false);

      const { impacts } = run(m, held, 400, 1);

      expect(impacts).toEqual([{ at: expected[held], strike: 'normal' }]);
    }
  });

  it('thả ở 999 ms là thường, 1000 ms là tích lực', () => {
    const a = make();

    a.press(0, 0);
    a.tick(500, 0);
    expect(a.release(999, 0)).toBe(false);
    expect(a.getStrike()).toBe('normal');

    const b = make();

    b.press(0, 0);
    b.tick(500, 0);
    expect(b.release(1000, 0)).toBe(true);
    expect(b.getStrike()).toBe('charged');
    // Sự kiện ready vẫn được báo ở tick kế tiếp (đúng một lần).
    expect(b.tick(1000, 0).ready).toBe(true);
    expect(b.tick(1001, 0).ready).toBe(false);
  });

  it('giữ 0-5000 ms: đúng một sự kiện ready, không impact, ready giữ vô hạn', () => {
    const m = make();

    m.press(0, 0);

    const { ready, impacts } = run(m, 0, 5000);

    expect(ready).toEqual([1000]);
    expect(impacts).toEqual([]);
    expect(m.getPhase()).toBe('ready');
  });

  it('press lặp mỗi frame khi pha khác idle không khởi động lại, không đổi mốc nhấn', () => {
    const m = make();

    expect(m.press(100, 0)).toBe(true);

    for (let t = 116; t < 1500; t += 16) {
      expect(m.press(t, 0)).toBe(false);
    }

    expect(m.getPressTime()).toBe(100);
    expect(m.getPhase()).toBe('ready');
  });

  it('press khi chưa hết cooldown bị từ chối; cooldown đặt lúc bắt đầu swing với hệ số nhân', () => {
    const m = make(0.5);

    m.press(0, 0);
    m.release(300, 0); // hold -> swing thường bắt đầu ở 300
    expect(m.getCooldownUntil()).toBe(300 + 560 * 0.5);
    run(m, 300, 700);
    expect(m.getPhase()).toBe('idle');
    expect(m.press(579, 0)).toBe(false);
    expect(m.press(580, 0)).toBe(true);

    const c = make(2);

    c.press(0, 0);
    c.tick(1000, 0);
    c.release(1200, 0);
    expect(c.getCooldownUntil()).toBe(1200 + 700 * 2);
  });

  it('thời gian tới ready không bị hệ số cooldown rút ngắn', () => {
    const m = make(0.1);

    m.press(0, 0);
    expect(run(m, 0, 2000).ready).toEqual([1000]);
  });

  it('cancel ở từng pha về idle, không impact, không cooldown', () => {
    const setups: ((m: HammerChargeMachine) => void)[] = [
      (m) => {
        m.press(0, 0);
      },
      (m) => {
        m.press(0, 0);
        m.tick(500, 0);
      },
      (m) => {
        m.press(0, 0);
        m.tick(1500, 0);
      },
    ];

    for (const setup of setups) {
      const m = make();

      setup(m);
      m.cancel();
      expect(m.getPhase()).toBe('idle');
      expect(m.getCooldownUntil()).toBe(0);
      expect(run(m, 0, 3000).impacts).toEqual([]);
      expect(m.getMoveFactor()).toBe(1);
    }

    // Cancel khi đang swing / recover: không impact nữa, nhưng cooldown đã đặt từ lúc bắt đầu swing.
    const s = make();

    s.press(0, 0);
    s.release(300, 0);
    s.cancel();
    expect(s.getPhase()).toBe('idle');
    expect(run(s, 300, 3000).impacts).toEqual([]);

    const r = make();

    r.press(0, 0);
    r.release(300, 0);
    r.tick(380, 0);
    expect(r.getPhase()).toBe('recover');
    r.cancel();
    expect(r.getPhase()).toBe('idle');
    expect(run(r, 380, 3000).impacts).toEqual([]);
  });

  it('cancel khi đang raise có releasePending thì không giáng', () => {
    const m = make();

    m.press(0, 0);
    m.release(50, 0);
    expect(m.isReleasePending()).toBe(true);
    m.cancel();
    expect(m.isReleasePending()).toBe(false);
    expect(run(m, 50, 1000).impacts).toEqual([]);
  });

  it('hệ số tốc chạy theo pha khớp bảng', () => {
    const m = make();

    expect(m.getMoveFactor()).toBe(1);
    m.press(0, 0);
    expect(m.getMoveFactor()).toBe(0.6); // raise
    m.tick(500, 0);
    expect(m.getPhase()).toBe('hold');
    expect(m.getMoveFactor()).toBe(0.6);
    m.tick(1000, 0);
    expect(m.getPhase()).toBe('ready');
    expect(m.getMoveFactor()).toBe(0.6);
    m.release(1000, 0);
    expect(m.getPhase()).toBe('swing');
    expect(m.getMoveFactor()).toBe(0.2);
    m.tick(1100, 0);
    expect(m.getPhase()).toBe('recover');
    expect(m.getMoveFactor()).toBe(0.2);
    m.tick(1400, 0);
    expect(m.getPhase()).toBe('idle');
    expect(m.getMoveFactor()).toBe(1);

    m.press(2000, 0);
    m.release(2300, 0);
    expect(m.getMoveFactor()).toBe(0.4); // swing thường
    m.tick(2380, 0);
    expect(m.getMoveFactor()).toBe(0.4); // recover thường
  });

  it('strikeAngle lấy từ hướng ngắm lúc bắt đầu swing', () => {
    // Thả ở hold: chốt tại lúc thả.
    const a = make();

    a.press(0, 1);
    a.tick(300, 2);
    a.release(400, 3);
    a.tick(450, 4);
    expect(a.getStrikeAngle()).toBe(3);

    // Thả trong raise: chốt tại lúc hết raise (tick đầu tiên vượt mốc).
    const b = make();

    b.press(0, 1);
    b.release(50, 2);
    b.tick(100, 5);
    b.tick(170, 6);
    b.tick(200, 7);
    expect(b.getStrikeAngle()).toBe(6);
  });

  it('mỗi swing đúng một impact mang đúng loại', () => {
    const m = make();

    m.press(0, 0);
    m.release(100, 0);

    const normal = run(m, 100, 1000);

    expect(normal.impacts).toHaveLength(1);
    expect(normal.impacts[0].strike).toBe('normal');

    m.press(2000, 0);
    run(m, 2000, 3500);
    m.release(3500, 0);

    const charged = run(m, 3500, 5000);

    expect(charged.impacts).toHaveLength(1);
    expect(charged.impacts[0]).toEqual({ at: 3600, strike: 'charged' });
  });

  it('tick nhảy thời gian lớn vẫn phát đủ ready rồi impact đúng một lần', () => {
    const m = make();

    m.press(0, 0);
    m.release(1500, 0);

    const e = m.tick(1500, 0);

    expect(e.ready).toBe(true);
    expect(m.tick(9999, 0)).toEqual({ ready: false, impact: 'charged' });
    expect(m.getPhase()).toBe('idle');
  });
});
