import Phaser from 'phaser';

import {
  DUAL_BLADES_ARC_HALF_DEGREES,
  DUAL_BLADES_COMBO_WINDOW_MS,
  DUAL_BLADES_COOLDOWN_MS,
  DUAL_BLADES_DAMAGE,
  DUAL_BLADES_FINISHER_GAP_MS,
  DUAL_BLADES_FINISHER_HIT_MULT,
  DUAL_BLADES_HIT_FRACTION,
  DUAL_BLADES_RANGE,
  DUAL_BLADES_SWING_MS,
  DUAL_BLADES_TRAIL_FADE_MS,
  DUAL_BLADES_TRAIL_THICKNESS,
} from '../config/combatConfig';
import { NEON } from '../config/palette';
import type { EnemyBase } from '../entities/EnemyBase';
import type { Player } from '../entities/Player';
import { VFXManager } from '../vfx/VFXManager';
import { advanceComboStep, resolveComboStep } from './dualBladesCombo';
import type { Weapon } from './Weapon';
import {
  createWeaponImage,
  placeWeaponImage,
  setWeaponMirror,
} from './weaponSprite';

/** Cầm ngược: góc (độ) mũi dao nghiêng ra ngoài khỏi hướng thẳng ra sau người khi đứng yên. */
const REVERSE_OUTWARD_DEGREES = 22;
/** Cầm ngược: khi chém, nắm tay lướt dọc cung ở bán kính (tầm chém − giá trị này) px. */
const REVERSE_REACH_INSET = 8;
/** Chiều dài lưỡi tính từ nắm tay tới mũi (px, theo art 33 px: grip ở x ≈ 6, mũi ở x ≈ 32). */
const BLADE_LENGTH = 26;
/** Màu vệt: dao chính cam lửa, dao phụ vàng hổ phách để phân biệt hai tay. */
const MAIN_COLOR = NEON.dualBlades;
const OFF_COLOR = 0xffc266;
const CORE_COLOR = 0xffffff;
/** Số đoạn thẳng xấp xỉ cung vệt chém. */
const TRAIL_SEGMENTS = 8;
/** Số Graphics vệt chém dùng lại (đòn kết cần tối đa 4 vệt cùng lúc). */
const TRAIL_POOL_SIZE = 6;
/** Độ dài vệt (tỉ lệ nửa góc cung) phía sau mũi dao. */
const TRAIL_SPAN_FRACTION = 1.1;

type Hand = 'main' | 'off';

/** Một nhát chém của một lưỡi: hoạt ảnh, vệt và hitbox độc lập với các nhát khác. */
interface Stroke {
  hand: Hand;
  /** Thời điểm bắt đầu vung. */
  at: number;
  base: number;
  halfArc: number;
  range: number;
  /** +1: quét từ −halfArc tới +halfArc; −1: ngược lại. */
  dir: number;
  damage: number;
  mirrored: boolean;
  /** Đã gây sát thương chưa — mỗi nhát chỉ một lần. */
  hitDone: boolean;
  thick: number;
  color: number;
  /** Đòn kết: có hiệu ứng điểm giao. */
  finisher: boolean;
  g: Phaser.GameObjects.Graphics | null;
}

/**
 * Song đao (Sát thủ cận chiến): combo 3 nhát liên kết — dao chính chém, dao phụ chém ngược chiều,
 * rồi đòn kết hai dao chém chéo nhau hai lượt. Mỗi lưỡi có vệt riêng; mỗi nhát một hitbox riêng chỉ
 * gây sát thương một lần, đúng lúc lưỡi dao quét qua giữa vệt. Không dùng tween/timer: mọi thứ chạy
 * theo thời gian trong `update`, nên đổi/huỷ vũ khí giữa chừng luôn sạch.
 */
export class DualBladesWeapon implements Weapon {
  readonly id = 'dual_blades';
  readonly name = 'SONG ĐAO';
  readonly energyCost = 0;

  private readonly scene: Phaser.Scene;
  private readonly player: Player;
  private readonly getEnemies: () => EnemyBase[];
  private readonly mainBlade: Phaser.GameObjects.Image;
  private readonly offBlade: Phaser.GameObjects.Image;
  private readonly trailPool: Phaser.GameObjects.Graphics[] = [];
  private strokes: Stroke[] = [];

  private cooldownUntil = 0;
  private lastAttackAt = -Infinity;
  /** Bước kế tiếp của combo (0 chính, 1 phụ, 2 đòn kết). */
  private nextStep = 0;

  constructor(
    scene: Phaser.Scene,
    player: Player,
    getEnemies: () => EnemyBase[],
  ) {
    this.scene = scene;
    this.player = player;
    this.getEnemies = getEnemies;

    this.mainBlade = createWeaponImage(scene, 'dual_blades', player.x, player.y);
    this.offBlade = createWeaponImage(scene, 'dual_blades', player.x, player.y);

    for (let i = 0; i < TRAIL_POOL_SIZE; i += 1) {
      this.trailPool.push(scene.add.graphics().setVisible(false));
    }
  }

  setActive(active: boolean): void {
    this.mainBlade.setVisible(active);
    this.offBlade.setVisible(active);

    if (!active) {
      this.clearStrokes();
    }
  }

  update(time: number, aim: Phaser.Math.Vector2): void {
    placeWeaponImage(this.mainBlade, this.player, 'dual_blades', aim, {
      hand: 'main',
      rotate: false,
    });
    placeWeaponImage(this.offBlade, this.player, 'dual_blades', aim, {
      hand: 'off',
      rotate: false,
    });

    // Tư thế nghỉ; lưỡi nào đang chém sẽ bị ghi đè ngay bên dưới.
    this.poseReverseGrip(this.mainBlade, 'main', aim);
    this.poseReverseGrip(this.offBlade, 'off', aim);

    this.updateStrokes(time);
  }

  /**
   * Cầm NGƯỢC tay (lưỡi nằm dọc cẳng tay, mũi chỉ về phía sau người, không chĩa ra trước như kiếm):
   * xoay sprite thêm 180°, nghiêng mũi hơi ra ngoài phía bên của tay đó, và lật để mép sắc quay ra ngoài.
   */
  private poseReverseGrip(
    blade: Phaser.GameObjects.Image,
    hand: Hand,
    aim: Phaser.Math.Vector2,
  ): void {
    // Tay nằm bên nào của hướng ngắm (>0: bên vuông góc theo chiều kim đồng hồ). Dự phòng theo tay nếu gần trục.
    const lateral = (blade.x - this.player.x) * -aim.y + (blade.y - this.player.y) * aim.x;
    const sign = Math.abs(lateral) > 1 ? Math.sign(lateral) : hand === 'main' ? 1 : -1;

    blade.setRotation(
      aim.angle() + Math.PI - Phaser.Math.DegToRad(REVERSE_OUTWARD_DEGREES) * sign,
    );
    // Sau khi quay 180°, mép sắc (đáy art) quay về phía −vuông góc; lật khi tay ở bên +.
    setWeaponMirror(blade, sign > 0);
  }

  tryAttack(time: number, aim: Phaser.Math.Vector2): boolean {
    if (this.player.isDead() || time < this.cooldownUntil) {
      return false;
    }

    const stats = this.player.getStats();

    this.cooldownUntil =
      time +
      DUAL_BLADES_COOLDOWN_MS *
        stats.cooldownMultiplier *
        this.player.getMeleeAttackCooldownMultiplier(time);

    const step = resolveComboStep(
      this.nextStep,
      time - this.lastAttackAt,
      DUAL_BLADES_COMBO_WINDOW_MS,
    );

    this.nextStep = advanceComboStep(step);
    this.lastAttackAt = time;

    const base = aim.angle();
    const halfArc = Phaser.Math.DegToRad(
      DUAL_BLADES_ARC_HALF_DEGREES + stats.swordArcBonusDegrees,
    );
    const range = DUAL_BLADES_RANGE + stats.swordRangeBonus;
    const damage =
      (DUAL_BLADES_DAMAGE + stats.meleeDamageBonus) *
      stats.meleeDamageMultiplier *
      stats.damageMultiplier;
    const mirrored = aim.x < 0;
    const make = (
      hand: Hand,
      at: number,
      dir: number,
      mult: number,
      finisher: boolean,
    ): void => {
      this.strokes.push({
        hand,
        at,
        base,
        halfArc,
        range,
        dir,
        damage: damage * mult,
        mirrored,
        hitDone: false,
        thick: DUAL_BLADES_TRAIL_THICKNESS * (finisher ? 1.3 : 1),
        color: hand === 'main' ? MAIN_COLOR : OFF_COLOR,
        finisher,
        g: null,
      });
    };

    // Chiều tăng góc tương ứng "đi lên" trên màn hình: ngắm phải thì lên = góc giảm, ngắm trái thì ngược lại.
    const up = mirrored ? 1 : -1;

    if (step === 0) {
      // Dao tay phải (chính) hất từ dưới lên.
      make('main', time, up, 1, false);
    } else if (step === 1) {
      // Dao tay trái (phụ) cũng hất từ dưới lên, nối tiếp nhát trước.
      make('off', time, up, 1, false);
    } else {
      // Đòn kết: lượt 1 hai dao quét chéo nhau (chữ X: một dao lên, một dao xuống), lượt 2 đổi chiều.
      const gap = DUAL_BLADES_FINISHER_GAP_MS;
      const m = DUAL_BLADES_FINISHER_HIT_MULT;

      make('main', time, up, m, true);
      make('off', time, -up, m, true);
      make('main', time + gap, -up, m, true);
      make('off', time + gap, up, m, true);
    }

    return true;
  }

  destroy(): void {
    this.clearStrokes();

    for (const g of this.trailPool) {
      g.destroy();
    }

    this.trailPool.length = 0;
    this.mainBlade.destroy();
    this.offBlade.destroy();
  }

  private clearStrokes(): void {
    this.strokes = [];

    for (const g of this.trailPool) {
      g.clear().setVisible(false);
    }
  }

  /** Chạy mọi nhát chém: xoay lưỡi, vẽ vệt, gây sát thương một lần, dọn nhát đã xong. */
  private updateStrokes(time: number): void {
    const fadeEnd = DUAL_BLADES_SWING_MS + DUAL_BLADES_TRAIL_FADE_MS;
    const alive: Stroke[] = [];

    for (const stroke of this.strokes) {
      const elapsed = time - stroke.at;

      if (elapsed < 0) {
        alive.push(stroke);
        continue;
      }

      const t = Phaser.Math.Clamp(elapsed / DUAL_BLADES_SWING_MS, 0, 1);

      if (elapsed >= fadeEnd) {
        this.releaseTrail(stroke);
        continue;
      }

      if (elapsed < DUAL_BLADES_SWING_MS) {
        const blade = stroke.hand === 'main' ? this.mainBlade : this.offBlade;

        // Ease-out như cũ: dao bật nhanh rồi chậm lại cuối nhát.
        const theta =
          stroke.base + stroke.halfArc * stroke.dir * this.sweep(t);
        const reach = Math.max(12, stroke.range - REVERSE_REACH_INSET);

        // Nắm tay lướt dọc cung chém; lưỡi chỉ THEO chiều lướt (mũi dẫn đầu, núm cán đi sau — không
        // còn cảm giác văng ra từ cán). Mép sắc quay ra ngoài, xa người (lật khi dir = +1).
        // `theta` là góc của MŨI dao (khớp với vệt chém); nắm tay đi sau mũi một góc `lead`.
        const lead = Math.atan2(BLADE_LENGTH, reach);
        const gripAngle = theta - stroke.dir * lead;

        blade.setPosition(
          this.player.x + Math.cos(gripAngle) * reach,
          this.player.y + Math.sin(gripAngle) * reach,
        );
        blade.setRotation(gripAngle + stroke.dir * Math.PI * 0.5);
        setWeaponMirror(blade, stroke.dir === 1);
      }

      if (!stroke.hitDone && t >= DUAL_BLADES_HIT_FRACTION) {
        stroke.hitDone = true;
        this.hitEnemies(stroke);
      }

      this.drawTrail(stroke, elapsed);
      alive.push(stroke);
    }

    this.strokes = alive;
  }

  /** Vị trí quét (−1..1) của lưỡi theo tiến độ t (0..1) với ease Cubic.Out. */
  private sweep(t: number): number {
    return -1 + 2 * Phaser.Math.Easing.Cubic.Out(t);
  }

  private acquireTrail(stroke: Stroke): Phaser.GameObjects.Graphics | null {
    if (stroke.g) {
      return stroke.g;
    }

    const free = this.trailPool.find((g) => !g.visible);

    if (!free) {
      return null; // Hết slot: bỏ vệt, sát thương vẫn tính bình thường.
    }

    stroke.g = free.setVisible(true);
    return free;
  }

  private releaseTrail(stroke: Stroke): void {
    stroke.g?.clear().setVisible(false);
    stroke.g = null;
  }

  /**
   * Vệt mảnh hai đầu thuôn nhọn bám theo mũi dao: đa giác lưỡi liềm (độ dày ~ sin) + lõi trắng mảnh.
   * Sau khi dao chém xong, vệt co về mũi dao và mờ dần.
   */
  private drawTrail(stroke: Stroke, elapsed: number): void {
    const g = this.acquireTrail(stroke);

    if (!g) {
      return;
    }

    const swingT = Phaser.Math.Clamp(elapsed / DUAL_BLADES_SWING_MS, 0, 1);
    const fade = Phaser.Math.Clamp(
      (elapsed - DUAL_BLADES_SWING_MS) / DUAL_BLADES_TRAIL_FADE_MS,
      0,
      1,
    );
    const head = stroke.base + stroke.halfArc * stroke.dir * this.sweep(swingT);
    const start = stroke.base - stroke.halfArc * stroke.dir;
    const spanMax = stroke.halfArc * TRAIL_SPAN_FRACTION;
    // Đuôi lùi lại sau mũi dao nhưng không vượt quá điểm xuất phát; co dần khi mờ.
    const back = Math.min(spanMax, Math.abs(head - start)) * (1 - fade);
    const tail = head - back * stroke.dir;
    const outer = stroke.range - 2;
    const outerPts: Phaser.Math.Vector2[] = [];
    const innerPts: Phaser.Math.Vector2[] = [];
    const corePts: Phaser.Math.Vector2[] = [];

    for (let i = 0; i <= TRAIL_SEGMENTS; i += 1) {
      const u = i / TRAIL_SEGMENTS;
      const angle = tail + (head - tail) * u;
      // Hai đầu nhọn: dày nhất ở giữa, nghiêng nhẹ về phía mũi dao để thấy hướng chém.
      const w = stroke.thick * Math.pow(Math.sin(Math.PI * u), 0.85);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      outerPts.push(new Phaser.Math.Vector2(cos * outer, sin * outer));
      innerPts.push(new Phaser.Math.Vector2(cos * (outer - w), sin * (outer - w)));
      corePts.push(
        new Phaser.Math.Vector2(cos * (outer - w * 0.35), sin * (outer - w * 0.35)),
      );
    }

    const alpha = 1 - fade;

    g.clear()
      .setPosition(this.player.x, this.player.y)
      .setDepth(this.player.y + 22)
      .setAlpha(alpha);
    g.fillStyle(stroke.color, 0.9);
    g.fillPoints([...outerPts, ...innerPts.reverse()], true, true);
    g.lineStyle(1, CORE_COLOR, 0.9);
    g.strokePoints(corePts, false, false);
  }

  private hitEnemies(stroke: Stroke): void {
    const rangeSq = stroke.range * stroke.range;
    let hits = 0;

    for (const enemy of this.getEnemies()) {
      if (!enemy.isAlive()) {
        continue;
      }

      const dx = enemy.x - this.player.x;
      const dy = enemy.y - this.player.y;

      if (dx * dx + dy * dy > rangeSq) {
        continue;
      }

      const angleToEnemy = Math.atan2(dy, dx);

      if (
        Math.abs(Phaser.Math.Angle.Wrap(angleToEnemy - stroke.base)) >
        stroke.halfArc
      ) {
        continue;
      }

      enemy.takeDamage(stroke.damage, this.player.x, this.player.y);
      VFXManager.for(this.scene).play('impact.hit', {
        x: enemy.x,
        y: enemy.y,
        tint: stroke.color,
      });
      hits += 1;
    }

    // Chớp sáng ở điểm giao chỉ phát một lần: ở lượt đầu của dao chính (dao chính hất lên).
    const upDir = stroke.mirrored ? 1 : -1;

    if (stroke.finisher && stroke.dir === upDir && stroke.hand === 'main') {
      // Điểm giao của hai vệt: chớp sáng nhỏ + vài mảnh để đòn kết nổi bật.
      const x = this.player.x + Math.cos(stroke.base) * stroke.range * 0.7;
      const y = this.player.y + Math.sin(stroke.base) * stroke.range * 0.7;
      const vfx = VFXManager.for(this.scene);

      vfx.play('glow.flash', { x, y, tint: CORE_COLOR, scale: 0.6, durationMs: 160 });
      vfx.play('burst.sparks', {
        x,
        y,
        tint: MAIN_COLOR,
        count: hits > 0 ? 8 : 4,
        speed: 110,
      });
    }
  }
}
