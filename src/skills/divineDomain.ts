import Phaser from 'phaser';

import {
  isInsideBarrier,
  setDomainBarrier,
  type DomainBarrier,
} from '../combat/domainBarrier';
import { DIVINE_DOMAIN } from '../config/treeSkillsConfig';
import type { EnemyBase } from '../entities/EnemyBase';
import { spawnBurst, spawnGlow, spawnRing } from '../utils/effects';
import type { SkillContext } from './skills';

/**
 * Lĩnh Vực Thần Minh: kết giới tròn cô lập bên trong khỏi bên ngoài.
 *
 * - Người chơi, địch (kể cả boss) và đồng minh đang ở trong lúc tung bị giữ lại bên trong;
 *   địch khác (kể cả sinh ra sau) bị giữ ở bên ngoài.
 * - Giữ bằng cách kẹp vị trí mỗi frame (POST_UPDATE) nên dash, teleport, kéo, đẩy
 *   đều không vượt được ranh giới mà không phải sửa từng kỹ năng.
 * - Đòn có nguồn và đích ở hai phía bị chặn ở `takeDamage` (xem `domainBarrier.ts`);
 *   đạn băng qua ranh giới bị huỷ.
 * - Boss và đồng minh cũng theo quy tắc đó: ở trong vùng lúc tung thì bị nhốt bên trong, ở ngoài thì không vào được.
 * - Hết giờ: gỡ chặn, không dịch chuyển ai nên không ai bị kẹt.
 */

const GOLD = 0xffd978;
const WHITE = 0xffffff;
const PALE_BLUE = 0x9fd4ff;

const RUNE_SEGMENTS = 24;
const GLYPHS = 12;

export function castDivineDomain(context: SkillContext): boolean {
  new DivineDomain(context);

  return true;
}

interface EdgeMote {
  readonly shape: Phaser.GameObjects.Rectangle;
  angle: number;
  t: number;
}

let current: DivineDomain | null = null;

class DivineDomain implements DomainBarrier {
  readonly x: number;
  readonly y: number;
  readonly radius = DIVINE_DOMAIN.radius;

  private readonly scene: Phaser.Scene;
  private readonly members = new Set<EnemyBase>();
  private readonly minionSides = new WeakMap<object, boolean>();
  private readonly base: Phaser.GameObjects.Graphics;
  private readonly runesOuter: Phaser.GameObjects.Graphics;
  private readonly runesInner: Phaser.GameObjects.Graphics;
  private readonly timer: Phaser.Time.TimerEvent;
  private readonly motes: EdgeMote[] = [];
  private rippleCount = 0;
  private lastRippleAt = 0;
  private tickAcc = 0;
  private ended = false;

  private readonly context: SkillContext;

  constructor(context: SkillContext) {
    this.context = context;
    current?.end(false);
    current = this;

    const { scene, player } = context;

    this.scene = scene;
    this.x = player.x;
    this.y = player.y;

    for (const enemy of context.getEnemies()) {
      if (enemy.isAlive() && isInsideBarrier(this, enemy.x, enemy.y)) {
        this.members.add(enemy);
      }
    }

    this.base = this.drawBase();
    this.runesOuter = this.drawRunes(this.radius - 22, RUNE_SEGMENTS, 0.9);
    this.runesInner = this.drawRunes(this.radius * 0.58, 6, 0.55, true);

    this.createMotes();

    player.addArmor(DIVINE_DOMAIN.armorOnCast);
    spawnRing(scene, this.x, this.y, this.radius, GOLD, 500);
    spawnGlow(scene, this.x, this.y, WHITE, 2.5, 500);

    // Hiện ra: giãn từ tâm ra; viền thở nhẹ trong suốt thời gian hiệu lực.
    this.base.setScale(0.2).setAlpha(0);
    scene.tweens.add({
      targets: this.base,
      scale: 1,
      alpha: 1,
      duration: 350,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        if (!this.ended) {
          scene.tweens.add({
            targets: this.base,
            alpha: 0.82,
            duration: 900,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          });
        }
      },
    });

    setDomainBarrier(this);
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.update, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
    this.timer = scene.time.delayedCall(DIVINE_DOMAIN.durationMs, () =>
      this.end(true),
    );
  }

  /** Hiệu ứng gợn sóng khi đòn bên ngoài chạm kết giới (có giới hạn để nhẹ trên di động). */
  onBlocked(px: number, py: number): void {
    this.ripple(Math.atan2(py - this.y, px - this.x));
  }

  private ripple(angle: number): void {
    const now = this.scene.time.now;

    if (
      this.ended ||
      this.rippleCount >= DIVINE_DOMAIN.rippleMax ||
      now - this.lastRippleAt < DIVINE_DOMAIN.rippleThrottleMs
    ) {
      return;
    }

    this.lastRippleAt = now;
    this.rippleCount += 1;

    const g = this.scene.add.graphics({ x: this.x, y: this.y }).setDepth(4);

    g.lineStyle(5, WHITE, 0.95);
    g.beginPath();
    g.arc(0, 0, this.radius, angle - 0.4, angle + 0.4);
    g.strokePath();
    g.lineStyle(2, PALE_BLUE, 0.8);
    g.beginPath();
    g.arc(0, 0, this.radius - 5, angle - 0.55, angle + 0.55);
    g.strokePath();

    const sparkX = this.x + Math.cos(angle) * this.radius;
    const sparkY = this.y + Math.sin(angle) * this.radius;

    spawnBurst(this.scene, sparkX, sparkY, GOLD, 4, 70);

    this.scene.tweens.add({
      targets: g,
      scale: 1.07,
      alpha: 0,
      duration: 280,
      ease: 'Sine.easeOut',
      onComplete: () => {
        g.destroy();
        this.rippleCount -= 1;
      },
    });
  }

  private update = (time: number, delta: number): void => {
    if (this.ended) {
      return;
    }

    const { player } = this.context;

    this.runesOuter.rotation += delta * 0.0004;
    this.runesInner.rotation -= delta * 0.0007;
    this.updateMotes(delta);

    if (player.active && !player.isDead()) {
      this.constrain(player, true);
    }

    for (const enemy of this.context.getEnemies()) {
      if (!enemy.isAlive()) {
        this.members.delete(enemy);
        continue;
      }

      // Boss như mọi địch: ở trong lúc tung thì bị nhốt trong, ở ngoài thì không vào được.
      this.constrain(enemy, this.members.has(enemy));
    }

    // Đồng minh: phía của chúng chốt ở lần đầu thấy (ở trong lúc tung hoặc triệu hồi bên trong = bị nhốt trong).
    for (const minion of this.context.minions.getActive()) {
      let inside = this.minionSides.get(minion);

      if (inside === undefined) {
        inside = isInsideBarrier(this, minion.x, minion.y);
        this.minionSides.set(minion, inside);
      }

      this.constrain(minion, inside);
    }

    this.blockBullets(this.context.enemyBullets);
    this.blockBullets(this.context.bullets);

    this.tickAcc += delta;

    if (this.tickAcc >= DIVINE_DOMAIN.tickMs) {
      this.tickAcc = 0;

      // Mốc cấp 3: bên trong lĩnh vực, người chơi nhận ít sát thương hơn.
      if (this.context.level >= DIVINE_DOMAIN.damageReductionLevel) {
        player.grantDamageReduction(
          time,
          DIVINE_DOMAIN.tickMs * 2,
          DIVINE_DOMAIN.damageReduction,
        );
      }
    }
  };

  /** Kẹp thực thể vào phía của nó và triệt thành phần vận tốc hướng qua ranh giới. */
  private constrain(
    sprite: Phaser.Physics.Arcade.Sprite,
    inside: boolean,
  ): void {
    const dx = sprite.x - this.x;
    const dy = sprite.y - this.y;
    const dist = Math.hypot(dx, dy);
    const body = sprite.body as Phaser.Physics.Arcade.Body | null;
    // Bên ngoài: giữ thêm nửa bề rộng thân để boss to không đè vào trong kết giới.
    const limit = inside
      ? this.radius - DIVINE_DOMAIN.edgeMargin
      : this.radius + DIVINE_DOMAIN.edgeMargin + (body?.halfWidth ?? 0);

    if (inside ? dist <= limit : dist >= limit) {
      return;
    }

    const nx = dist > 0.001 ? dx / dist : 1;
    const ny = dist > 0.001 ? dy / dist : 0;

    sprite.setPosition(this.x + nx * limit, this.y + ny * limit);

    if (body) {
      const radial = body.velocity.x * nx + body.velocity.y * ny;

      if (inside ? radial > 0 : radial < 0) {
        body.velocity.x -= radial * nx;
        body.velocity.y -= radial * ny;
      }
    }

    if (dist - limit > 4 || limit - dist > 4) {
      this.ripple(Math.atan2(ny, nx));
    }
  }

  /** Huỷ đạn vừa băng qua ranh giới trong frame này (so vị trí trước/sau của body). */
  private blockBullets(group: Phaser.Physics.Arcade.Group): void {
    for (const bullet of group.getChildren()) {
      if (
        !(bullet instanceof Phaser.Physics.Arcade.Sprite) ||
        !bullet.active
      ) {
        continue;
      }

      const body = bullet.body as Phaser.Physics.Arcade.Body | null;

      if (!body) {
        continue;
      }

      const prevX = body.prev.x + body.halfWidth;
      const prevY = body.prev.y + body.halfHeight;

      if (
        isInsideBarrier(this, prevX, prevY) !==
        isInsideBarrier(this, bullet.x, bullet.y)
      ) {
        this.ripple(
          Math.atan2(bullet.y - this.y, bullet.x - this.x),
        );
        bullet.disableBody(true, true);
      }
    }
  }

  private drawBase(): Phaser.GameObjects.Graphics {
    const g = this.scene.add
      .graphics({ x: this.x, y: this.y })
      .setDepth(3);
    const r = this.radius;

    // Dải sáng mờ dọc viền để ranh giới nổi rõ.
    g.lineStyle(30, GOLD, 0.12).strokeCircle(0, 0, r - 4);
    g.lineStyle(18, GOLD, 0.2).strokeCircle(0, 0, r - 2);
    g.lineStyle(9, WHITE, 0.35).strokeCircle(0, 0, r - 1);
    g.fillStyle(PALE_BLUE, 0.1).fillCircle(0, 0, r);
    g.fillStyle(0xffe9a8, 0.07).fillCircle(0, 0, r * 0.62);
    g.lineStyle(5, GOLD, 1).strokeCircle(0, 0, r);
    g.lineStyle(1.5, WHITE, 0.9).strokeCircle(0, 0, r - 5);
    g.lineStyle(1, PALE_BLUE, 0.6).strokeCircle(0, 0, r - 12);

    return g;
  }

  /** Vòng hoa văn: các cung vàng/trắng xen kẽ và ký hiệu hình thoi; vẽ một lần, chỉ xoay. */
  private drawRunes(
    radius: number,
    count: number,
    alpha: number,
    star = false,
  ): Phaser.GameObjects.Graphics {
    const g = this.scene.add
      .graphics({ x: this.x, y: this.y })
      .setDepth(3)
      .setAlpha(alpha);

    if (star) {
      // Sao sáu cánh: hai tam giác lồng nhau.
      g.lineStyle(1.5, PALE_BLUE, 0.9);
      for (const offset of [0, Math.PI / 3]) {
        g.beginPath();
        for (let i = 0; i <= 3; i += 1) {
          const a = offset + (i * 2 * Math.PI) / 3 - Math.PI / 2;

          if (i === 0) {
            g.moveTo(Math.cos(a) * radius, Math.sin(a) * radius);
          } else {
            g.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
          }
        }
        g.strokePath();
      }
      g.lineStyle(1, GOLD, 0.8).strokeCircle(0, 0, radius * 0.55);

      return g;
    }

    const step = (Math.PI * 2) / count;

    for (let i = 0; i < count; i += 1) {
      g.lineStyle(2.5, i % 2 === 0 ? GOLD : WHITE, 0.9);
      g.beginPath();
      g.arc(0, 0, radius, i * step, i * step + step * 0.62);
      g.strokePath();
    }

    for (let i = 0; i < GLYPHS; i += 1) {
      const a = (i * Math.PI * 2) / GLYPHS;
      const gr = radius - 11;
      const cx = Math.cos(a) * gr;
      const cy = Math.sin(a) * gr;

      g.fillStyle(i % 3 === 0 ? WHITE : PALE_BLUE, 0.95);
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * 4, cy + Math.sin(a) * 4);
      g.lineTo(cx - Math.sin(a) * 3, cy + Math.cos(a) * 3);
      g.lineTo(cx - Math.cos(a) * 4, cy - Math.sin(a) * 4);
      g.lineTo(cx + Math.sin(a) * 3, cy - Math.cos(a) * 3);
      g.closePath();
      g.fillPath();
    }

    return g;
  }

  /** Tia sáng nhỏ bốc lên từ viền ngoài; tập đối tượng cố định, chỉ đổi vị trí/độ mờ mỗi frame. */
  private createMotes(): void {
    const colors = [GOLD, WHITE, PALE_BLUE];

    for (let i = 0; i < DIVINE_DOMAIN.edgeMoteCount; i += 1) {
      const shape = this.scene.add
        .rectangle(0, 0, 3, 14, colors[i % colors.length])
        .setDepth(4)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0);

      this.motes.push({
        shape,
        angle: Math.random() * Math.PI * 2,
        t: i / DIVINE_DOMAIN.edgeMoteCount,
      });
    }
  }

  private updateMotes(delta: number): void {
    const step = delta / DIVINE_DOMAIN.edgeMoteLifeMs;

    for (const mote of this.motes) {
      mote.t += step;

      if (mote.t >= 1) {
        mote.t -= 1;
        mote.angle = Math.random() * Math.PI * 2;
      }

      const t = mote.t;

      mote.shape
        .setPosition(
          this.x + Math.cos(mote.angle) * this.radius,
          this.y +
            Math.sin(mote.angle) * this.radius -
            t * DIVINE_DOMAIN.edgeMoteRise,
        )
        .setAlpha(Math.min(1, t * 5) * (1 - t * t))
        .setScale(1 - t * 0.4, 1 + t * 0.9);
    }
  }

  private onShutdown = (): void => {
    this.end(false);
  };

  /** Gỡ kết giới. `animate` = hiệu ứng tan thành hạt sáng (false khi đổi scene/ghi đè). */
  end(animate: boolean): void {
    if (this.ended) {
      return;
    }

    this.ended = true;
    this.timer.remove(false);
    this.scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.update, this);
    this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
    setDomainBarrier(null);
    this.members.clear();

    if (current === this) {
      current = null;
    }

    if (animate && this.scene.sys.isActive()) {
      const colors = [GOLD, WHITE, PALE_BLUE];

      for (let i = 0; i < 12; i += 1) {
        const a = (i / 12) * Math.PI * 2;

        spawnBurst(
          this.scene,
          this.x + Math.cos(a) * this.radius,
          this.y + Math.sin(a) * this.radius,
          colors[i % 3],
          5,
          90,
        );
      }

      spawnRing(this.scene, this.x, this.y, this.radius, WHITE, 300);
    }

    for (const mote of this.motes) {
      mote.shape.destroy();
    }
    this.motes.length = 0;

    this.scene.tweens.killTweensOf(this.base);
    for (const g of [this.base, this.runesOuter, this.runesInner]) {
      if (animate && this.scene.sys.isActive()) {
        this.scene.tweens.add({
          targets: g,
          alpha: 0,
          scale: g === this.base ? 1.1 : 1,
          duration: 300,
          onComplete: () => g.destroy(),
        });
      } else {
        g.destroy();
      }
    }
  }
}
