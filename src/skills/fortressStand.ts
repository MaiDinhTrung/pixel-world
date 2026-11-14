import Phaser from 'phaser';

import {
  damageWall,
  fortressMaxHp,
  setFortressWall,
  type FortressWall,
} from '../combat/fortressWall';
import {
  ENEMY_BULLET_DAMAGE,
  FORTRESS_ARC_HALF_DEGREES,
  FORTRESS_HEIGHT,
  FORTRESS_RADIUS,
  FORTRESS_THICKNESS,
} from '../config/combatConfig';
import type { Player } from '../entities/Player';
import { spawnBurst, spawnDust, spawnGlow, spawnRing } from '../utils/effects';
import { drawBrickBox, OUTLINE } from '../vfx/brickBox';

/**
 * Bất Động Thành Lũy: dựng một bức tường gạch khối (có chiều cao) ngay trước mặt người chơi,
 * HP riêng = máu tối đa × 5 lúc tung.
 *
 * - Chắn sát thương: chỉ đòn từ phía trước (±`FORTRESS_ARC_HALF_DEGREES`) bị đỡ, logic ở
 *   `combat/fortressWall.ts` (gọi từ `Player.takeDamage`). Đạn chạm thân tường bị tường nuốt.
 * - Chắn vật lý: dãy vật cản tĩnh dọc thân tường, quái (kể cả boss) không đi xuyên qua được.
 * - Hình ảnh: khối hộp chiếu xiên (mặt gạch xếp so le + mặt trên), HP càng thấp càng mờ và nứt.
 * - Vòng đời (EN, vũ khí, chết...) do `WorldScene.updateFortress` điều phối.
 *
 * Nhẹ cho mobile: một Graphics (chỉ vẽ lại khi HP/va chạm đổi), ~10 vật cản tĩnh,
 * hiệu ứng dùng pool `VFXManager`, mảnh gạch chỉ tạo một lần khi tường vỡ.
 */

const SHARD_COLORS = [0xa5b0c4, 0x8793a8, 0x66708a];
const SHARD_COUNT = 18;
/** Độ trong suốt tối thiểu khi tường sắp vỡ (HP càng thấp càng mờ). */
const MIN_ALPHA = 0.3;
/** Bước và cỡ vật cản tĩnh dọc thân tường (px); cỡ > bước để không hở khi tường chéo. */
const BLOCK_STEP = 14;
const BLOCK_SIZE = 24;

export interface FortressPhysics {
  readonly enemies: Phaser.Physics.Arcade.Group;
  readonly enemyBullets: Phaser.Physics.Arcade.Group;
}

interface Pt {
  x: number;
  y: number;
}

export class FortressStand implements FortressWall {
  readonly x: number;
  readonly y: number;
  readonly angle: number;
  readonly halfArc = Phaser.Math.DegToRad(FORTRESS_ARC_HALF_DEGREES);
  readonly maxHp: number;
  hp: number;

  private readonly scene: Phaser.Scene;
  private readonly player: Player;
  private readonly wall: Phaser.GameObjects.Graphics;
  private readonly blocks: Phaser.GameObjects.Zone[] = [];
  private readonly colliders: Phaser.Physics.Arcade.Collider[] = [];
  /** Hướng tới (dir) và hướng dọc bề ngang tường (perp). */
  private readonly dirX: number;
  private readonly dirY: number;
  private readonly perpX: number;
  private readonly perpY: number;
  /** Nửa bề ngang tường: khít với biên của góc chắn. */
  private readonly halfLength: number;
  /** Vector nhô lên của tường (chiếu xiên: ngả nhẹ về phía người để mặt trước luôn thấy). */
  private readonly extX: number;
  private readonly extY: number;
  private introDone = false;
  private flash = 0;
  private broken = false;
  private ended = false;

  constructor(
    scene: Phaser.Scene,
    player: Player,
    aim: Phaser.Math.Vector2,
    physics: FortressPhysics,
  ) {
    this.scene = scene;
    this.player = player;
    this.x = player.x;
    this.y = player.y;
    this.angle = aim.angle();
    this.maxHp = fortressMaxHp(player.getMaxHealth());
    this.hp = this.maxHp;

    this.dirX = Math.cos(this.angle);
    this.dirY = Math.sin(this.angle);
    this.perpX = -this.dirY;
    this.perpY = this.dirX;
    this.halfLength = FORTRESS_RADIUS * Math.tan(this.halfArc);
    this.extX = -this.dirX * FORTRESS_HEIGHT * 0.6;
    this.extY = -FORTRESS_HEIGHT;

    this.wall = scene.add
      .graphics()
      .setDepth(this.point(FORTRESS_RADIUS, 0).y + 6);
    this.redraw();

    // Triển khai: tường trồi lên từ mặt đất (trượt lên + hiện dần).
    this.wall.setAlpha(0).setY(28);
    scene.tweens.add({
      targets: this.wall,
      alpha: 1,
      y: 0,
      duration: 280,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.introDone = true;
        this.redraw();
      },
    });

    this.createBlocks(physics);

    const base = this.point(FORTRESS_RADIUS, 0);
    const left = this.point(FORTRESS_RADIUS, -this.halfLength);
    const right = this.point(FORTRESS_RADIUS, this.halfLength);

    spawnRing(scene, base.x, base.y, this.halfLength + 36, 0xb9c6de, 380);
    spawnDust(scene, base.x, base.y);
    spawnDust(scene, left.x, left.y);
    spawnDust(scene, right.x, right.y);
    spawnBurst(scene, base.x, base.y, 0xd8e6ff, 10, 140);
    scene.cameras.main.shake(200, 0.008);

    setFortressWall(this);
  }

  isBroken(): boolean {
    return this.broken;
  }

  /** Điểm trong thế giới: `u` dọc hướng chắn tính từ người chơi, `v` dọc bề ngang tường. */
  private point(u: number, v: number): Pt {
    return {
      x: this.x + this.dirX * u + this.perpX * v,
      y: this.y + this.dirY * u + this.perpY * v,
    };
  }

  /** Dãy vật cản tĩnh dọc thân tường + va chạm với quái và đạn quái. */
  private createBlocks(physics: FortressPhysics): void {
    const world = this.scene.physics;
    const count = Math.max(2, Math.ceil((2 * this.halfLength) / BLOCK_STEP) + 1);

    for (let i = 0; i < count; i += 1) {
      const v = -this.halfLength + (i * 2 * this.halfLength) / (count - 1);
      const p = this.point(FORTRESS_RADIUS, v);
      const zone = this.scene.add.zone(p.x, p.y, BLOCK_SIZE, BLOCK_SIZE);

      world.add.existing(zone, true);
      this.blocks.push(zone);
    }

    // Quái không đi xuyên qua được (kể cả boss); chỉ chặn đi, không gây sát thương.
    this.colliders.push(world.add.collider(physics.enemies, this.blocks));

    // Đạn quái chạm thân tường: bị nuốt và trừ HP tường (không còn bay tới người).
    this.colliders.push(
      world.add.overlap(physics.enemyBullets, this.blocks, (bulletObject) => {
        if (
          this.ended ||
          !(bulletObject instanceof Phaser.Physics.Arcade.Sprite) ||
          !bulletObject.active
        ) {
          return;
        }

        const damage =
          (bulletObject.getData('damage') as number | undefined) ??
          ENEMY_BULLET_DAMAGE;

        damageWall(this, damage, bulletObject.x, bulletObject.y);
        bulletObject.disableBody(true, true);
      }),
    );
  }

  /** Đòn bị chặn: tia lửa va chạm tại điểm trên mặt tường nằm trên đường tới nguồn đòn. */
  onHit(_amount: number, fromX: number, fromY: number): void {
    const toSource = Math.atan2(fromY - this.y, fromX - this.x);
    const rel = Phaser.Math.Angle.Wrap(toSource - this.angle);
    const v = Phaser.Math.Clamp(
      FORTRESS_RADIUS * Math.tan(rel),
      -this.halfLength,
      this.halfLength,
    );
    const base = this.point(FORTRESS_RADIUS + FORTRESS_THICKNESS / 2, v);
    const hitX = base.x + this.extX * 0.5;
    const hitY = base.y + this.extY * 0.5;

    spawnBurst(this.scene, hitX, hitY, 0xd8e6ff, 6, 110);
    spawnGlow(this.scene, hitX, hitY, 0xb9c6de, 0.9, 140);

    this.flash = 1;
    this.redraw();
    this.scene.time.delayedCall(70, () => {
      if (!this.ended) {
        this.flash = 0;
        this.redraw();
      }
    });
  }

  onBreak(): void {
    this.broken = true;
  }

  /** Giữ người chơi đứng nguyên chỗ dù bị dash/teleport/đẩy (gọi mỗi POST_UPDATE). */
  lockPosition(): void {
    if (this.ended) {
      return;
    }

    if (this.player.x !== this.x || this.player.y !== this.y) {
      this.player.setPosition(this.x, this.y);
    }

    this.player.setVelocity(0, 0);
  }

  /** Gỡ tường và dọn hình/vật cản; `shatter` = vỡ thành mảnh gạch (HP về 0). */
  end(shatter: boolean): void {
    if (this.ended) {
      return;
    }

    this.ended = true;
    setFortressWall(null);
    this.scene.tweens.killTweensOf(this.wall);

    for (const collider of this.colliders) {
      collider.destroy();
    }

    for (const block of this.blocks) {
      block.destroy();
    }

    this.colliders.length = 0;
    this.blocks.length = 0;

    if (shatter) {
      this.spawnShards();
    } else {
      const base = this.point(FORTRESS_RADIUS, 0);

      spawnDust(this.scene, base.x, base.y);
    }

    this.wall.destroy();
  }

  private spawnShards(): void {
    const scene = this.scene;
    const centre = this.point(FORTRESS_RADIUS, 0);

    spawnRing(scene, centre.x, centre.y, this.halfLength + 44, 0xff8a8a, 420);
    spawnGlow(scene, centre.x, centre.y, 0xffffff, 1.6, 220);
    spawnDust(scene, centre.x, centre.y);
    scene.cameras.main.shake(260, 0.011);

    for (let i = 0; i < SHARD_COUNT; i += 1) {
      const v = Phaser.Math.FloatBetween(-this.halfLength, this.halfLength);
      const t = Phaser.Math.FloatBetween(0, 1);
      const base = this.point(FORTRESS_RADIUS, v);
      const startX = base.x + this.extX * t;
      const startY = base.y + this.extY * t;
      const size = Phaser.Math.Between(6, 14);
      const shard = scene.add
        .rectangle(startX, startY, size, size * 0.6, SHARD_COLORS[i % 3])
        .setStrokeStyle(1, OUTLINE)
        .setDepth(this.wall.depth + 2)
        .setRotation(Phaser.Math.FloatBetween(0, Math.PI));
      const dist = Phaser.Math.Between(30, 90);

      scene.tweens.add({
        targets: shard,
        x: startX + this.dirX * dist + Phaser.Math.Between(-14, 14),
        y: startY + this.dirY * dist + Phaser.Math.Between(10, 34),
        rotation: shard.rotation + Phaser.Math.FloatBetween(-4, 4),
        alpha: 0,
        duration: Phaser.Math.Between(360, 600),
        ease: 'Quad.easeIn',
        onComplete: () => shard.destroy(),
      });
    }
  }

  private redraw(): void {
    const ratio = this.maxHp > 0 ? this.hp / this.maxHp : 0;
    const g = this.wall;
    const half = FORTRESS_THICKNESS / 2;

    g.clear();
    drawBrickBox(g, {
      originX: this.x,
      originY: this.y,
      dirX: this.dirX,
      dirY: this.dirY,
      u0: FORTRESS_RADIUS - half,
      u1: FORTRESS_RADIUS + half,
      v0: -this.halfLength,
      v1: this.halfLength,
      extX: this.extX,
      extY: this.extY,
      height: FORTRESS_HEIGHT,
      flash: this.flash > 0,
      ratio,
    });

    // HP càng thấp tường càng mờ nhạt; hết HP thì vỡ (xử lý ở `end(true)`).
    if (this.introDone) {
      g.setAlpha(MIN_ALPHA + (1 - MIN_ALPHA) * Phaser.Math.Clamp(ratio, 0, 1));
    }
  }
}
