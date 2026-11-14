import Phaser from 'phaser';

import {
  DAMAGE_NUMBER_COLORS,
  DAMAGE_NUMBER_CRIT_LIFE_MS,
  DAMAGE_NUMBER_CRIT_SCALE,
  DAMAGE_NUMBER_DEPTH,
  DAMAGE_NUMBER_DOT_FLUSH_MS,
  DAMAGE_NUMBER_DOT_LIFE_MS,
  DAMAGE_NUMBER_DOT_RISE,
  DAMAGE_NUMBER_DOT_SCALE,
  DAMAGE_NUMBER_HOLD_RATIO,
  DAMAGE_NUMBER_JITTER_X,
  DAMAGE_NUMBER_LANE_STEP,
  DAMAGE_NUMBER_LANE_WINDOW_MS,
  DAMAGE_NUMBER_LIFE_MS,
  DAMAGE_NUMBER_MAX_ACTIVE,
  DAMAGE_NUMBER_MAX_ACTIVE_TOUCH,
  DAMAGE_NUMBER_MERGE_MS,
  DAMAGE_NUMBER_PART_SPREAD_X,
  DAMAGE_NUMBER_PART_SPREAD_Y,
  DAMAGE_NUMBER_PART_STAGGER_MS,
  DAMAGE_NUMBER_PLAYER_SCALE,
  DAMAGE_NUMBER_POP_MS,
  DAMAGE_NUMBER_POP_SCALE,
  DAMAGE_NUMBER_RISE,
  DAMAGE_NUMBER_SCALE,
  DAMAGE_NUMBERS_ENABLED,
  PLAYER_PHYSICAL_NUMBER_COLOR,
  type DamageNumberKind,
} from '../config/damageNumberConfig';
import { isTouchDevice } from '../utils/device';
import { DAMAGE_FONT_KEYS } from './damageNumberFont';
import {
  consolidateParts,
  formatDamage,
  mergeKey,
  partOffset,
  type PartAmount,
} from './damageNumberLayout';

/** Độ ưu tiên khi hết slot: thấp hơn bị thu hồi trước. */
const PRIORITY_DOT = 0;
const PRIORITY_HIT = 1;
const PRIORITY_CRIT = 2;
const PRIORITY_PLAYER = 3;

interface Entry {
  readonly text: Phaser.GameObjects.BitmapText;
  active: boolean;
  font: string;
  /** Thời điểm bắt đầu hiện (có thể muộn hơn lúc tạo do so le giữa các số). */
  start: number;
  spawnedAt: number;
  life: number;
  baseX: number;
  baseY: number;
  rise: number;
  scale: number;
  value: number;
  crit: boolean;
  priority: number;
  mergeKey: string | null;
  popUntil: number;
}

interface PendingDot {
  value: number;
  flushAt: number;
  target: object;
  x: number;
  y: number;
  type: DamageNumberKind;
}

interface TargetState {
  id: number;
  laneAt: number;
  laneCount: number;
}

/**
 * Số sát thương nổi: một pool BitmapText dùng lại (không tạo/hủy khi chơi), tự cập nhật
 * bằng `update` thay vì tween. Chỉ hiển thị số đã tính xong; không tính sát thương.
 */
export class DamageNumberManager {
  private readonly scene: Phaser.Scene;
  private readonly pool: Entry[] = [];
  private readonly activeEntries: Entry[] = [];
  private readonly merges = new Map<string, Entry>();
  private readonly pendingDots = new Map<string, PendingDot>();
  private readonly targets = new WeakMap<object, TargetState>();
  private nextTargetId = 1;
  private readonly enabled = DAMAGE_NUMBERS_ENABLED;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    if (!this.enabled) {
      return;
    }

    const max = isTouchDevice()
      ? DAMAGE_NUMBER_MAX_ACTIVE_TOUCH
      : DAMAGE_NUMBER_MAX_ACTIVE;

    for (let i = 0; i < max; i += 1) {
      const text = scene.add
        .bitmapText(0, 0, DAMAGE_FONT_KEYS.normal, '0')
        .setOrigin(0.5)
        .setDepth(DAMAGE_NUMBER_DEPTH)
        .setActive(false)
        .setVisible(false);

      this.pool.push({
        text,
        active: false,
        font: DAMAGE_FONT_KEYS.normal,
        start: 0,
        spawnedAt: 0,
        life: 1,
        baseX: 0,
        baseY: 0,
        rise: 0,
        scale: 1,
        value: 0,
        crit: false,
        priority: PRIORITY_HIT,
        mergeKey: null,
        popUntil: 0,
      });
    }

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  /** Đòn trúng quái: mỗi phần (loại) một số; `crit` làm to và có quầng sáng. */
  spawnHit(
    target: object,
    x: number,
    y: number,
    parts: readonly PartAmount[],
    crit: boolean,
  ): void {
    if (!this.enabled) {
      return;
    }

    const shown = consolidateParts(parts);
    const state = this.getState(target);
    const now = this.scene.time.now;
    const laneY = this.takeLane(state, now);

    shown.forEach((part, index) => {
      const offset = partOffset(
        index,
        DAMAGE_NUMBER_PART_SPREAD_X,
        DAMAGE_NUMBER_PART_SPREAD_Y,
      );

      this.show({
        key: mergeKey(state.id, part.type, false),
        x: x + offset.x,
        y: y + offset.y + laneY,
        amount: part.amount,
        color: DAMAGE_NUMBER_COLORS[part.type],
        crit,
        dot: false,
        player: false,
        delay: index * DAMAGE_NUMBER_PART_STAGGER_MS,
      });
    });
  }

  /** Một tick DoT: cộng dồn theo mục tiêu + loại, hiện một số mỗi `DOT_FLUSH_MS`. */
  spawnDot(
    target: object,
    x: number,
    y: number,
    type: DamageNumberKind,
    amount: number,
  ): void {
    if (!this.enabled || !(amount > 0)) {
      return;
    }

    const key = mergeKey(this.getState(target).id, type, true);
    const pending = this.pendingDots.get(key);

    if (pending) {
      pending.value += amount;
      pending.x = x;
      pending.y = y;

      return;
    }

    this.pendingDots.set(key, {
      value: amount,
      flushAt: this.scene.time.now + DAMAGE_NUMBER_DOT_FLUSH_MS,
      target,
      x,
      y,
      type,
    });
  }

  /** Hiện ngay số DoT còn dồn của một mục tiêu (gọi khi mục tiêu chết). */
  flushTarget(target: object): void {
    const state = this.targets.get(target);

    if (!state) {
      return;
    }

    for (const [key, pending] of this.pendingDots) {
      if (pending.target === target) {
        this.pendingDots.delete(key);
        this.showDot(pending, state);
      }
    }
  }

  /** Số sát thương người chơi nhận (đã gồm giáp + HP). */
  spawnPlayerHit(
    target: object,
    x: number,
    y: number,
    type: DamageNumberKind,
    amount: number,
  ): void {
    if (!this.enabled) {
      return;
    }

    const state = this.getState(target);

    this.show({
      key: mergeKey(state.id, type, false),
      x,
      y: y + this.takeLane(state, this.scene.time.now),
      amount,
      color:
        type === 'physical'
          ? PLAYER_PHYSICAL_NUMBER_COLOR
          : DAMAGE_NUMBER_COLORS[type],
      crit: false,
      dot: false,
      player: true,
      delay: 0,
    });
  }

  update(time: number): void {
    if (!this.enabled) {
      return;
    }

    for (const [key, pending] of this.pendingDots) {
      if (time >= pending.flushAt) {
        this.pendingDots.delete(key);
        this.showDot(pending, this.getState(pending.target));
      }
    }

    for (let i = this.activeEntries.length - 1; i >= 0; i -= 1) {
      const entry = this.activeEntries[i];
      const elapsed = time - entry.start;

      if (elapsed < 0) {
        continue;
      }

      const t = elapsed / entry.life;

      if (t >= 1) {
        this.release(entry, i);
        continue;
      }

      const text = entry.text;
      const eased = 1 - (1 - t) * (1 - t);
      const pop = time < entry.popUntil
        ? 1 + (DAMAGE_NUMBER_POP_SCALE - 1) * ((entry.popUntil - time) / DAMAGE_NUMBER_POP_MS)
        : 1;
      // Chí mạng rung nhẹ trong 150 ms đầu.
      const shake = entry.crit && elapsed < 150
        ? Math.sin(elapsed * 0.09) * 1.5
        : 0;

      text.setVisible(true);
      text.setPosition(entry.baseX + shake, entry.baseY - entry.rise * eased);
      text.setScale(entry.scale * pop);
      text.setAlpha(
        t < DAMAGE_NUMBER_HOLD_RATIO
          ? 1
          : 1 - (t - DAMAGE_NUMBER_HOLD_RATIO) / (1 - DAMAGE_NUMBER_HOLD_RATIO),
      );
    }
  }

  destroy(): void {
    for (const entry of this.pool) {
      entry.text.destroy();
    }

    this.pool.length = 0;
    this.activeEntries.length = 0;
    this.merges.clear();
    this.pendingDots.clear();
  }

  private getState(target: object): TargetState {
    let state = this.targets.get(target);

    if (!state) {
      state = { id: this.nextTargetId, laneAt: -Infinity, laneCount: 0 };
      this.nextTargetId += 1;
      this.targets.set(target, state);
    }

    return state;
  }

  /** Số mới trên cùng một mục tiêu còn gần số cũ thì đẩy lên một làn để không chồng. */
  private takeLane(state: TargetState, now: number): number {
    if (now - state.laneAt > DAMAGE_NUMBER_LANE_WINDOW_MS) {
      state.laneCount = 0;
    }

    const lane = state.laneCount % 4;

    state.laneAt = now;
    state.laneCount += 1;

    return -lane * DAMAGE_NUMBER_LANE_STEP;
  }

  private showDot(pending: PendingDot, state: TargetState): void {
    this.show({
      key: null,
      x: pending.x + (state.id % 2 === 0 ? 14 : -14),
      y: pending.y,
      amount: pending.value,
      color: DAMAGE_NUMBER_COLORS[pending.type],
      crit: false,
      dot: true,
      player: false,
      delay: 0,
    });
  }

  private show(args: {
    key: string | null;
    x: number;
    y: number;
    amount: number;
    color: number;
    crit: boolean;
    dot: boolean;
    player: boolean;
    delay: number;
  }): void {
    const now = this.scene.time.now;

    // Gộp vào số cùng khoá vừa xuất hiện: cộng dồn rồi nảy lại.
    if (args.key !== null && !args.dot) {
      const existing = this.merges.get(args.key);

      if (
        existing &&
        existing.active &&
        existing.mergeKey === args.key &&
        now - existing.spawnedAt <= DAMAGE_NUMBER_MERGE_MS &&
        existing.crit === args.crit
      ) {
        existing.value += args.amount;
        this.applyText(existing);
        existing.popUntil = now + DAMAGE_NUMBER_POP_MS;

        return;
      }
    }

    const label = formatDamage(args.amount);

    if (label === '') {
      return;
    }

    const priority = args.player
      ? PRIORITY_PLAYER
      : args.dot
        ? PRIORITY_DOT
        : args.crit
          ? PRIORITY_CRIT
          : PRIORITY_HIT;
    const entry = this.acquire(priority);

    if (!entry) {
      return;
    }

    const font = args.crit ? DAMAGE_FONT_KEYS.crit : DAMAGE_FONT_KEYS.normal;

    if (entry.font !== font) {
      entry.text.setFont(font);
      entry.font = font;
    }

    entry.active = true;
    entry.start = now + args.delay;
    entry.spawnedAt = now + args.delay;
    entry.life = args.crit
      ? DAMAGE_NUMBER_CRIT_LIFE_MS
      : args.dot
        ? DAMAGE_NUMBER_DOT_LIFE_MS
        : DAMAGE_NUMBER_LIFE_MS;
    entry.rise = args.dot ? DAMAGE_NUMBER_DOT_RISE : DAMAGE_NUMBER_RISE;
    entry.scale = args.crit
      ? DAMAGE_NUMBER_CRIT_SCALE
      : args.dot
        ? DAMAGE_NUMBER_DOT_SCALE
        : args.player
          ? DAMAGE_NUMBER_PLAYER_SCALE
          : DAMAGE_NUMBER_SCALE;
    entry.baseX = args.x + Phaser.Math.Between(-DAMAGE_NUMBER_JITTER_X, DAMAGE_NUMBER_JITTER_X);
    entry.baseY = args.y;
    entry.value = args.amount;
    entry.crit = args.crit;
    entry.priority = priority;
    entry.mergeKey = args.key !== null && !args.dot ? args.key : null;
    entry.popUntil = entry.start + DAMAGE_NUMBER_POP_MS;

    entry.text
      .setActive(true)
      .setTint(args.color)
      .setAlpha(args.dot ? 0.75 : 1)
      .setPosition(entry.baseX, entry.baseY)
      .setScale(entry.scale * DAMAGE_NUMBER_POP_SCALE);
    // Chưa tới giờ bắt đầu (so le) thì ẩn; `update` sẽ bật khi tới lượt.
    entry.text.setVisible(args.delay <= 0);

    this.applyText(entry);
    this.activeEntries.push(entry);

    if (entry.mergeKey) {
      this.merges.set(entry.mergeKey, entry);
    }
  }

  private applyText(entry: Entry): void {
    const label = formatDamage(entry.value) + (entry.crit ? '!' : '');

    if (entry.text.text !== label) {
      entry.text.setText(label);
    }
  }

  /** Lấy một slot rảnh; hết thì thu hồi số có độ ưu tiên thấp (và cũ) hơn, không thì bỏ qua. */
  private acquire(priority: number): Entry | null {
    for (const entry of this.pool) {
      if (!entry.active) {
        return entry;
      }
    }

    let victimIndex = -1;

    for (let i = 0; i < this.activeEntries.length; i += 1) {
      const candidate = this.activeEntries[i];

      if (candidate.priority > priority) {
        continue;
      }

      if (
        victimIndex < 0 ||
        candidate.priority < this.activeEntries[victimIndex].priority ||
        (candidate.priority === this.activeEntries[victimIndex].priority &&
          candidate.spawnedAt < this.activeEntries[victimIndex].spawnedAt)
      ) {
        victimIndex = i;
      }
    }

    if (victimIndex < 0) {
      return null;
    }

    const victim = this.activeEntries[victimIndex];

    this.release(victim, victimIndex);

    return victim;
  }

  private release(entry: Entry, index: number): void {
    entry.active = false;
    entry.text.setActive(false).setVisible(false);

    if (entry.mergeKey && this.merges.get(entry.mergeKey) === entry) {
      this.merges.delete(entry.mergeKey);
    }

    entry.mergeKey = null;
    this.activeEntries.splice(index, 1);
  }
}
