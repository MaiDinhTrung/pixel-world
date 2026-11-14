import Phaser from 'phaser';

import {
  ABSOLUTE_ZERO,
  ARCANE_CHAIN,
  ARROW_STORM,
  CYCLONE,
  DEADLY_BLOOM,
  FIRE_WALL,
  FLAME_BURST,
  GRAPPLE_CHAIN,
  ICE_LANCE,
  ICE_LANCE_CHILL,
  DIVINE_DOMAIN,
  PLAGUE_FLASK,
  SHADOW_STEP,
  SWORD_TEMPEST,
  TITAN_ROAR,
  VENOM_TRAP,
} from '../config/treeSkillsConfig';
import { pureDamage } from '../combat/damage/resolveDamage';
import { ELEMENT_COLORS, ELEMENT_PALETTE } from '../config/damageTypeConfig';
import { cssColor } from '../config/palette';
import { BossEnemy } from '../entities/BossEnemy';
import type { EnemyBase } from '../entities/EnemyBase';
import { castDivineDomain } from './divineDomain';
import { spawnBurst, spawnGlow, spawnHitSpark, spawnRing } from '../utils/effects';
import {
  damageInRadius,
  showFloatingText,
  skillHitInfo,
  spawnArrow,
  type SkillContext,
  type SkillDefinition,
} from './skills';

// Màu kỹ năng Fire/Ice lấy từ ELEMENT_PALETTE (nguồn duy nhất): thân = nhận diện, lõi = điểm nhấn sáng.
const FIRE_COLOR = ELEMENT_COLORS.fire;
const FIRE_CORE = ELEMENT_PALETTE.fire.core;
const ICE_COLOR = ELEMENT_COLORS.ice;
const ICE_CORE = ELEMENT_PALETTE.ice.core;

/**
 * Kỹ năng chủ động lấy từ cây kỹ năng. Chỉ dùng/gán được khi đã học node
 * (`requiresNode`). Cấp node (1–5) nhân sát thương qua `context.power`.
 * Số liệu ở `config/treeSkillsConfig.ts`.
 */

// ── Tiện ích dùng chung ───────────────────────────────────────────────────────

function aimPointOf(context: SkillContext, range: number): Phaser.Math.Vector2 {
  return (
    context.aimPoint ??
    new Phaser.Math.Vector2(
      context.player.x + context.aim.x * range * 0.7,
      context.player.y + context.aim.y * range * 0.7,
    )
  );
}

/** Ngữ cảnh với danh sách quái mới nhất (kỹ năng kéo dài cần quái sinh ra sau khi tung). */
function fresh(context: SkillContext): SkillContext {
  return { ...context, enemies: context.getEnemies() };
}

function alive(context: SkillContext): EnemyBase[] {
  return context.getEnemies().filter((enemy) => enemy.isAlive());
}

function inRadius(
  enemies: readonly EnemyBase[],
  x: number,
  y: number,
  radius: number,
): EnemyBase[] {
  return enemies.filter(
    (enemy) =>
      Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y) <= radius,
  );
}

/** Chạy `tick` mỗi `intervalMs` cho tới hết `durationMs`. */
function repeatFor(
  context: SkillContext,
  intervalMs: number,
  durationMs: number,
  tick: (elapsedMs: number) => void,
): void {
  const count = Math.max(1, Math.floor(durationMs / intervalMs));
  let index = 0;

  context.scene.time.addEvent({
    delay: intervalMs,
    repeat: count - 1,
    callback: () => {
      index += 1;
      tick(index * intervalMs);
    },
  });
}

function dmg(context: SkillContext): number {
  return context.player.getStats().damageMultiplier * context.power;
}

function rangedDmg(context: SkillContext): number {
  const stats = context.player.getStats();

  return stats.rangedDamageMultiplier * stats.damageMultiplier * context.power;
}

/** Khoảng cách từ điểm tới đoạn thẳng (dùng cho tường lửa). */
function distanceToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const abx = bx - ax;
  const aby = by - ay;
  const lengthSq = abx * abx + aby * aby;
  const t =
    lengthSq === 0
      ? 0
      : Phaser.Math.Clamp(((px - ax) * abx + (py - ay) * aby) / lengthSq, 0, 1);

  return Math.hypot(px - (ax + abx * t), py - (ay + aby * t));
}

function safeSpot(
  context: SkillContext,
  x: number,
  y: number,
): { x: number; y: number } | null {
  const bounds = context.scene.physics.world.bounds;
  const cx = Phaser.Math.Clamp(x, bounds.left + 24, bounds.right - 24);
  const cy = Phaser.Math.Clamp(y, bounds.top + 28, bounds.bottom - 28);
  const obstacles = context.scene.physics.overlapRect(
    cx - 12,
    cy - 16,
    24,
    32,
    false,
    true,
  );

  return obstacles.length === 0 ? { x: cx, y: cy } : null;
}

// ── Đấu sĩ ────────────────────────────────────────────────────────────────────

export const TREE_LIVING_FORTRESS: SkillDefinition = {
  id: 'living_fortress',
  name: 'LĨNH VỰC THẦN MINH',
  icon: 'LV',
  description:
    'Dựng kết giới bán kính 160 trong 8 giây: tách bên trong khỏi bên ngoài. Không ai vượt được ranh giới (kể cả dash, dịch chuyển), đòn và đạn không xuyên qua. Hết giờ, kết giới tan.',
  unlockLevel: 1,
  requiresNode: 'living_fortress',
  cooldownMs: DIVINE_DOMAIN.cooldownMs,
  energyCost: DIVINE_DOMAIN.energy,
  color: 0xffd978,
  colorCss: '#ffd978',
  cast: castDivineDomain,
};

export const TREE_CYCLONE: SkillDefinition = {
  id: 'cyclone',
  name: 'LỐC XOÁY',
  icon: 'LX',
  description: 'Xoay kiếm 2 giây quanh người, đánh mọi kẻ trong bán kính 70 mỗi 0.35 giây.',
  unlockLevel: 1,
  requiresNode: 'whirlwind',
  cooldownMs: CYCLONE.cooldownMs,
  energyCost: CYCLONE.energy,
  color: 0xe8e6f0,
  colorCss: '#e8e6f0',
  cast: (context) => {
    const hit = () => {
      damageInRadius(
        fresh(context),
        context.player.x,
        context.player.y,
        CYCLONE.radius,
        CYCLONE.damage * dmg(context),
        0xe8e6f0,
      );
      spawnRing(
        context.scene,
        context.player.x,
        context.player.y,
        CYCLONE.radius,
        0xe8e6f0,
        220,
      );
    };

    // Mốc cấp 3: kéo dài thêm 0.5s. Cấp 5: nhịp cuối đẩy lùi mạnh.
    const durationMs = CYCLONE.durationMs + (context.level >= 3 ? 500 : 0);
    const ticks = Math.max(1, Math.floor(durationMs / CYCLONE.tickMs));
    let tickIndex = 0;

    hit();
    repeatFor(context, CYCLONE.tickMs, durationMs, () => {
      hit();
      tickIndex += 1;

      if (context.level >= 5 && tickIndex >= ticks) {
        for (const enemy of inRadius(
          alive(context),
          context.player.x,
          context.player.y,
          CYCLONE.radius,
        )) {
          const away = new Phaser.Math.Vector2(
            enemy.x - context.player.x,
            enemy.y - context.player.y,
          );

          if (away.lengthSq() > 0) {
            away.normalize().scale(36);
            enemy.setPosition(enemy.x + away.x, enemy.y + away.y);
          }
        }
      }
    });

    return true;
  },
};

export const TREE_SWORD_TEMPEST: SkillDefinition = {
  id: 'sword_tempest',
  name: 'BÃO KIẾM',
  icon: 'BK',
  description: '6 giây hoá kiếm linh: đòn cận chiến mạnh hơn 30% và đánh nhanh hơn 30%.',
  unlockLevel: 1,
  requiresNode: 'blade_storm',
  cooldownMs: SWORD_TEMPEST.cooldownMs,
  energyCost: SWORD_TEMPEST.energy,
  color: 0x9fe8ff,
  colorCss: '#9fe8ff',
  cast: (context) => {
    context.player.grantMeleeFury(
      context.time,
      SWORD_TEMPEST.durationMs,
      SWORD_TEMPEST.damageMult * context.power,
      SWORD_TEMPEST.attackSpeedMult,
    );
    spawnGlow(context.scene, context.player.x, context.player.y, 0x9fe8ff, 2.2, 500);
    spawnRing(context.scene, context.player.x, context.player.y, 80, 0x9fe8ff, 400);
    showFloatingText(context, 'BÃO KIẾM!', '#9fe8ff');

    return true;
  },
};

export const TREE_GRAPPLE_CHAIN: SkillDefinition = {
  id: 'grapple_chain',
  name: 'XÍCH KÉO',
  icon: 'XK',
  description: 'Ném xích kéo kẻ gần nhất và địch quanh nó về trước mặt. Với boss thì kéo bản thân tới.',
  unlockLevel: 1,
  requiresNode: 'grapple_chain',
  cooldownMs: GRAPPLE_CHAIN.cooldownMs,
  energyCost: GRAPPLE_CHAIN.energy,
  color: 0xb8c4d8,
  colorCss: '#b8c4d8',
  control: { kind: 'target', range: GRAPPLE_CHAIN.range, select: 'nearest' },
  cast: (context) => {
    const target = context.target;

    if (!target || !target.isAlive()) {
      return false;
    }

    const player = context.player;
    const direction = new Phaser.Math.Vector2(
      target.x - player.x,
      target.y - player.y,
    );

    if (direction.lengthSq() === 0) {
      return false;
    }

    direction.normalize();

    if (target instanceof BossEnemy) {
      // Boss quá nặng: tự kéo mình tới trước mặt nó.
      const spot = safeSpot(
        context,
        target.x - direction.x * GRAPPLE_CHAIN.holdDistance,
        target.y - direction.y * GRAPPLE_CHAIN.holdDistance,
      );

      if (spot) {
        spawnRing(context.scene, player.x, player.y, 40, 0xb8c4d8, 240);
        player.setPosition(spot.x, spot.y);
        player.cancelDash();
      }

      target.takeDamage(GRAPPLE_CHAIN.damage * dmg(context), player.x, player.y);
      spawnHitSpark(context.scene, target.x, target.y, 0xb8c4d8);

      return true;
    }

    const holdX = player.x + direction.x * GRAPPLE_CHAIN.holdDistance;
    const holdY = player.y + direction.y * GRAPPLE_CHAIN.holdDistance;
    // Mốc cấp 3: bán kính kéo +30. Cấp 5: kéo thêm một mục tiêu riêng biệt.
    const pullRadius = GRAPPLE_CHAIN.pullRadius + (context.level >= 3 ? 30 : 0);
    const caught = inRadius(alive(context), target.x, target.y, pullRadius);

    if (context.level >= 5) {
      let second: EnemyBase | undefined;
      let secondDistance: number = GRAPPLE_CHAIN.range;

      for (const enemy of alive(context)) {
        const distance = Phaser.Math.Distance.Between(
          player.x,
          player.y,
          enemy.x,
          enemy.y,
        );

        if (
          !caught.includes(enemy) &&
          !(enemy instanceof BossEnemy) &&
          distance < secondDistance
        ) {
          second = enemy;
          secondDistance = distance;
        }
      }

      if (second) {
        caught.push(
          ...inRadius(alive(context), second.x, second.y, pullRadius).filter(
            (enemy) => !caught.includes(enemy),
          ),
        );
      }
    }

    caught.forEach((enemy, index) => {
      const spot = safeSpot(
        context,
        holdX + (index % 3) * 14 - 14,
        holdY + Math.floor(index / 3) * 14,
      );

      if (spot) {
        enemy.setPosition(spot.x, spot.y);
        enemy.setVelocity(0, 0);
      }

      enemy.takeDamage(GRAPPLE_CHAIN.damage * dmg(context), player.x, player.y);
      enemy.applySlow(GRAPPLE_CHAIN.slowMult, GRAPPLE_CHAIN.slowMs);
      spawnHitSpark(context.scene, enemy.x, enemy.y, 0xb8c4d8);
    });
    spawnBurst(context.scene, holdX, holdY, 0xb8c4d8, 10, 130);

    return true;
  },
};

export const TREE_TITAN_ROAR: SkillDefinition = {
  id: 'titan_roar',
  name: 'TIẾNG GẦM CỰ NHÂN',
  icon: 'GC',
  description: 'Sau 0.6 giây gầm lên: choáng mọi địch trong 260 px (boss ít hơn) và xử tử địch dưới 20% máu.',
  unlockLevel: 1,
  requiresNode: 'titan_roar',
  cooldownMs: TITAN_ROAR.cooldownMs,
  energyCost: TITAN_ROAR.energy,
  color: 0xff9f5e,
  colorCss: '#ff9f5e',
  cast: (context) => {
    spawnRing(context.scene, context.player.x, context.player.y, 60, 0xff9f5e, TITAN_ROAR.windupMs);
    spawnGlow(context.scene, context.player.x, context.player.y, 0xff9f5e, 1.6, TITAN_ROAR.windupMs);

    context.scene.time.delayedCall(TITAN_ROAR.windupMs, () => {
      if (context.player.isDead()) {
        return;
      }

      const x = context.player.x;
      const y = context.player.y;

      for (const enemy of inRadius(alive(context), x, y, TITAN_ROAR.radius)) {
        enemy.applyStun(TITAN_ROAR.stunMs);

        if (
          !(enemy instanceof BossEnemy) &&
          enemy.getHealth() / enemy.getMaxHealth() < TITAN_ROAR.executeBelow
        ) {
          enemy.takeDamage(enemy.getHealth() + 1, x, y);
        }
      }

      spawnRing(context.scene, x, y, TITAN_ROAR.radius, 0xff9f5e, 450);
      spawnGlow(context.scene, x, y, 0xff9f5e, 4, 450);
      context.scene.cameras.main.shake(260, 0.01);
    });

    return true;
  },
};

// ── Pháp sư ───────────────────────────────────────────────────────────────────

export const TREE_FLAME_BURST: SkillDefinition = {
  id: 'flame_burst',
  damageParts: pureDamage('fire'),
  damageNoProc: true, // tự áp Thiêu riêng
  name: 'HỎA BẠO',
  icon: 'HB',
  description: 'Nổ lửa tại điểm ngắm (tầm 280, bán kính 70), gây thiêu 3 giây.',
  unlockLevel: 1,
  requiresNode: 'flame_burst',
  cooldownMs: FLAME_BURST.cooldownMs,
  energyCost: FLAME_BURST.energy,
  color: FIRE_COLOR,
  colorCss: cssColor(FIRE_COLOR),
  control: { kind: 'point', range: FLAME_BURST.range, radius: FLAME_BURST.radius },
  cast: (context) => {
    const point = aimPointOf(context, FLAME_BURST.range);
    // Mốc cấp 3: bán kính +20. Cấp 5: Thiêu cộng dồn 2 tầng (gấp đôi sát thương/giây).
    const radius = FLAME_BURST.radius + (context.level >= 3 ? 20 : 0);
    const hits = damageInRadius(
      context,
      point.x,
      point.y,
      radius,
      FLAME_BURST.damage * dmg(context),
      FIRE_COLOR,
    );

    for (const enemy of hits) {
      enemy.applyDot(
        'burn',
        FLAME_BURST.burnDps * dmg(context) * (context.level >= 5 ? 2 : 1),
        FLAME_BURST.burnMs,
      );
    }

    spawnRing(context.scene, point.x, point.y, radius, FIRE_COLOR, 350);
    spawnBurst(context.scene, point.x, point.y, FIRE_CORE, 16, 190);
    spawnGlow(context.scene, point.x, point.y, FIRE_COLOR, 2, 350);

    return true;
  },
};

export const TREE_FIRE_WALL: SkillDefinition = {
  id: 'fire_wall',
  damageParts: pureDamage('fire'),
  damageNoProc: true, // tự áp Thiêu riêng
  name: 'TƯỜNG LỬA',
  icon: 'TL',
  description: 'Dựng tường lửa dài 220 px trong 5 giây: đốt kẻ chạm vào và chặn đạn địch.',
  unlockLevel: 1,
  requiresNode: 'fire_wall',
  cooldownMs: FIRE_WALL.cooldownMs,
  energyCost: FIRE_WALL.energy,
  color: FIRE_COLOR,
  colorCss: cssColor(FIRE_COLOR),
  control: { kind: 'point', range: FIRE_WALL.range, radius: 60 },
  cast: (context) => {
    const point = aimPointOf(context, FIRE_WALL.range);
    // Tường vuông góc với hướng từ người chơi tới điểm đặt.
    const facing = Math.atan2(
      point.y - context.player.y,
      point.x - context.player.x,
    );
    const along = facing + Math.PI / 2;
    // Mốc cấp 3: tường dài thêm 40px. Cấp 5: địch bước qua bị chậm 20%.
    const wallLength = FIRE_WALL.length + (context.level >= 3 ? 40 : 0);
    const half = wallLength / 2;
    const ax = point.x - Math.cos(along) * half;
    const ay = point.y - Math.sin(along) * half;
    const bx = point.x + Math.cos(along) * half;
    const by = point.y + Math.sin(along) * half;
    const visual = context.scene.add
      .rectangle(point.x, point.y, wallLength, FIRE_WALL.thickness, FIRE_COLOR, 0.45)
      .setRotation(along)
      .setDepth(3);

    context.scene.tweens.add({
      targets: visual,
      alpha: { from: 0.25, to: 0.6 },
      duration: 160,
      yoyo: true,
      repeat: -1,
    });

    repeatFor(context, FIRE_WALL.tickMs, FIRE_WALL.durationMs, () => {
      for (const enemy of alive(context)) {
        if (
          distanceToSegment(enemy.x, enemy.y, ax, ay, bx, by) <=
          FIRE_WALL.thickness
        ) {
          enemy.takeDamage(
            FIRE_WALL.damage * dmg(context),
            point.x,
            point.y,
            skillHitInfo(context),
          );
          enemy.applyDot('burn', FIRE_WALL.burnDps * dmg(context), FIRE_WALL.burnMs);

          if (context.level >= 5) {
            enemy.applySlow(0.8, FIRE_WALL.tickMs * 2);
          }
        }
      }

      for (const bullet of context.enemyBullets.getChildren()) {
        if (
          bullet instanceof Phaser.Physics.Arcade.Sprite &&
          bullet.active &&
          distanceToSegment(bullet.x, bullet.y, ax, ay, bx, by) <=
            FIRE_WALL.thickness
        ) {
          bullet.disableBody(true, true);
        }
      }

      spawnBurst(context.scene, point.x, point.y, FIRE_CORE, 6, 90);
    });
    context.scene.time.delayedCall(FIRE_WALL.durationMs, () => {
      context.scene.tweens.killTweensOf(visual);
      visual.destroy();
    });

    return true;
  },
};

export const TREE_ICE_LANCE: SkillDefinition = {
  id: 'ice_lance',
  damageParts: pureDamage('ice'),
  name: 'BĂNG THƯƠNG',
  icon: 'BT',
  description: 'Bắn thương băng xuyên tối đa 3 mục tiêu theo hướng ngắm.',
  unlockLevel: 1,
  requiresNode: 'ice_lance',
  cooldownMs: ICE_LANCE.cooldownMs,
  energyCost: ICE_LANCE.energy,
  color: ICE_COLOR,
  colorCss: cssColor(ICE_COLOR),
  control: { kind: 'directional', shape: 'line', range: ICE_LANCE.range, size: 24 },
  cast: (context) => {
    const stats = context.player.getStats();

    spawnArrow(
      context,
      context.aim.angle(),
      ICE_LANCE.damage * rangedDmg(context),
      ICE_LANCE.pierce + stats.bulletPierce + (context.level >= 3 ? 1 : 0),
      ICE_LANCE.speed * stats.bulletSpeedMultiplier,
      ICE_LANCE_CHILL.durationMs,
    );
    spawnHitSpark(
      context.scene,
      context.player.x + context.aim.x * 24,
      context.player.y + context.aim.y * 24,
      ICE_COLOR,
    );

    return true;
  },
};

export const TREE_ARCANE_CHAIN: SkillDefinition = {
  id: 'arcane_chain',
  damageParts: pureDamage('lightning'),
  damageNoProc: true, // tự lan sét
  name: 'XÍCH TINH',
  icon: 'XT',
  description:
    'Tia năng lượng đánh địch gần nhất rồi nảy sang các địch kế bên, yếu dần mỗi lần nảy.',
  unlockLevel: 1,
  requiresNode: 'arcane_chain',
  cooldownMs: ARCANE_CHAIN.cooldownMs,
  energyCost: ARCANE_CHAIN.energy,
  color: 0xc58bff,
  colorCss: '#c58bff',
  control: { kind: 'target', range: ARCANE_CHAIN.range, select: 'nearest' },
  cast: (context) => {
    const first = context.target;

    if (!first || !first.isAlive()) {
      return false;
    }

    const player = context.player;
    const maxHits =
      1 +
      ARCANE_CHAIN.baseBounces +
      (context.level >= ARCANE_CHAIN.extraBounceLevel ? 1 : 0);
    const hit = new Set<EnemyBase>();
    let damage = ARCANE_CHAIN.damage * dmg(context);
    let fromX = player.x;
    let fromY = player.y;
    let current: EnemyBase | undefined = first;

    while (current && hit.size < maxHits) {
      const target: EnemyBase = current;

      hit.add(target);
      target.takeDamage(damage, fromX, fromY, skillHitInfo(context));

      const link = context.scene.add
        .line(0, 0, fromX, fromY, target.x, target.y, 0xc58bff, 0.9)
        .setOrigin(0, 0)
        .setLineWidth(3)
        .setDepth(target.depth + 1);

      context.scene.tweens.add({
        targets: link,
        alpha: 0,
        duration: 260,
        onComplete: () => link.destroy(),
      });
      spawnHitSpark(context.scene, target.x, target.y, 0xc58bff);
      spawnGlow(context.scene, target.x, target.y, 0xc58bff, 1.2, 220);

      if (context.level >= ARCANE_CHAIN.pullLevel && target.isAlive()) {
        const toPlayer = new Phaser.Math.Vector2(
          player.x - target.x,
          player.y - target.y,
        );

        if (toPlayer.lengthSq() > 1) {
          toPlayer.normalize().scale(ARCANE_CHAIN.pullDistance);
          target.setPosition(target.x + toPlayer.x, target.y + toPlayer.y);
        }
      }

      damage *= ARCANE_CHAIN.falloff;
      fromX = target.x;
      fromY = target.y;

      let best: EnemyBase | undefined;
      let bestDistance: number = ARCANE_CHAIN.bounceRadius;

      for (const enemy of alive(context)) {
        if (hit.has(enemy)) {
          continue;
        }

        const distance = Phaser.Math.Distance.Between(
          fromX,
          fromY,
          enemy.x,
          enemy.y,
        );

        if (distance <= bestDistance) {
          best = enemy;
          bestDistance = distance;
        }
      }

      current = best;
    }

    return true;
  },
};

export const TREE_ABSOLUTE_ZERO: SkillDefinition = {
  id: 'absolute_zero',
  damageParts: pureDamage('ice'),
  damageNoProc: true, // tự làm chậm / đóng băng riêng
  name: 'ĐỘ KHÔNG TUYỆT ĐỐI',
  icon: 'ĐK',
  description:
    'Vùng bán kính 170 trong 4 giây: địch bị chậm, nhận thêm sát thương, đóng băng sau 1.5 giây và vỡ khi hết hạn.',
  unlockLevel: 1,
  requiresNode: 'absolute_zero',
  cooldownMs: ABSOLUTE_ZERO.cooldownMs,
  energyCost: ABSOLUTE_ZERO.energy,
  color: ICE_COLOR,
  colorCss: cssColor(ICE_COLOR),
  control: { kind: 'point', range: ABSOLUTE_ZERO.range, radius: ABSOLUTE_ZERO.radius },
  cast: (context) => {
    const point = aimPointOf(context, ABSOLUTE_ZERO.range);
    const frozen = new Set<EnemyBase>();
    const zone = context.scene.add
      .circle(point.x, point.y, ABSOLUTE_ZERO.radius, ICE_COLOR, 0.16)
      .setStrokeStyle(3, ICE_CORE, 0.8)
      .setDepth(3);

    spawnRing(context.scene, point.x, point.y, ABSOLUTE_ZERO.radius, ICE_CORE, 500);
    spawnGlow(context.scene, point.x, point.y, ICE_COLOR, 3.5, 500);

    repeatFor(context, 250, ABSOLUTE_ZERO.durationMs, (elapsed) => {
      for (const enemy of inRadius(alive(context), point.x, point.y, ABSOLUTE_ZERO.radius)) {
        enemy.applyChill(ABSOLUTE_ZERO.slowMult, 500);
        enemy.applyVulnerable('curse', ABSOLUTE_ZERO.vulnerableMult, 600);

        if (elapsed >= ABSOLUTE_ZERO.freezeAfterMs && !frozen.has(enemy)) {
          frozen.add(enemy);
          enemy.applyStun(ABSOLUTE_ZERO.freezeMs);
          spawnHitSpark(context.scene, enemy.x, enemy.y, ICE_CORE);
        }
      }
    });
    context.scene.time.delayedCall(ABSOLUTE_ZERO.durationMs, () => {
      damageInRadius(
        fresh(context),
        point.x,
        point.y,
        ABSOLUTE_ZERO.radius,
        ABSOLUTE_ZERO.shatterDamage * dmg(context),
        ICE_CORE,
      );
      spawnRing(context.scene, point.x, point.y, ABSOLUTE_ZERO.radius, ICE_CORE, 320);
      spawnBurst(context.scene, point.x, point.y, ICE_CORE, 24, 240);
      context.scene.cameras.main.shake(200, 0.006);
      zone.destroy();
    });

    return true;
  },
};

// ── Sát thủ ───────────────────────────────────────────────────────────────────

export const TREE_SHADOW_STEP: SkillDefinition = {
  id: 'shadow_step',
  name: 'ẢNH BỘ',
  icon: 'AB',
  description: 'Dịch ra sau địch gần nhất trong 300 px và đâm mạnh; đòn từ phía sau đau hơn.',
  unlockLevel: 1,
  requiresNode: 'shadow_step',
  cooldownMs: SHADOW_STEP.cooldownMs,
  energyCost: SHADOW_STEP.energy,
  color: 0x9d8cff,
  colorCss: '#9d8cff',
  control: { kind: 'target', range: SHADOW_STEP.range, select: 'nearest' },
  keepsStealth: true,
  cast: (context) => {
    const target = context.target;

    if (!target || !target.isAlive()) {
      return false;
    }

    const player = context.player;
    const direction = new Phaser.Math.Vector2(
      target.x - player.x,
      target.y - player.y,
    );

    if (direction.lengthSq() === 0) {
      return false;
    }

    direction.normalize();

    const behind = safeSpot(
      context,
      target.x + direction.x * SHADOW_STEP.behindDistance,
      target.y + direction.y * SHADOW_STEP.behindDistance,
    );
    const spot =
      behind ??
      safeSpot(
        context,
        target.x - direction.x * SHADOW_STEP.behindDistance,
        target.y - direction.y * SHADOW_STEP.behindDistance,
      );

    if (!spot) {
      return false;
    }

    spawnBurst(context.scene, player.x, player.y, 0x9d8cff, 10, 120);
    player.setPosition(spot.x, spot.y);
    player.cancelDash();
    player.grantInvulnerability(context.time, SHADOW_STEP.invulnerableMs);

    const bonus = behind ? SHADOW_STEP.backstabBonus : 1;

    target.takeDamage(
      SHADOW_STEP.damage * dmg(context) * bonus,
      spot.x,
      spot.y,
    );
    spawnHitSpark(context.scene, target.x, target.y, 0xffffff);
    spawnGlow(context.scene, spot.x, spot.y, 0x9d8cff, 1.4, 260);

    // Mốc cấp 5: hạ gục mục tiêu thì làm mới hồi chiêu (WorldScene đặt hồi chiêu sau khi cast).
    if (context.level >= 5 && !target.isAlive()) {
      context.scene.time.delayedCall(0, () =>
        context.scene.events.emit('skill-cooldown-reset', 'shadow_step'),
      );
    }

    return true;
  },
};

interface Trap {
  x: number;
  y: number;
  marker: Phaser.GameObjects.Arc;
  timer: Phaser.Time.TimerEvent;
}

const trapsByScene = new WeakMap<Phaser.Scene, Trap[]>();

function spawnPoisonCloud(
  context: SkillContext,
  x: number,
  y: number,
  radius: number,
  durationMs: number,
  tickMs: number,
  poisonDps: number,
  poisonMs: number,
  slowMult: number,
): void {
  const cloud = context.scene.add
    .circle(x, y, radius, 0x6bdc4a, 0.2)
    .setStrokeStyle(2, 0x6bdc4a, 0.6)
    .setDepth(3);

  spawnRing(context.scene, x, y, radius, 0x6bdc4a, 350);
  spawnBurst(context.scene, x, y, 0x6bdc4a, 14, 120);

  const apply = () => {
    for (const enemy of inRadius(alive(context), x, y, radius)) {
      enemy.applyDot('poison', poisonDps * dmg(context), poisonMs);

      if (slowMult < 1) {
        enemy.applySlow(slowMult, tickMs * 2);
      }
    }
  };

  apply();
  repeatFor(context, tickMs, durationMs, apply);
  context.scene.time.delayedCall(durationMs, () => cloud.destroy());
}

export const TREE_VENOM_TRAP: SkillDefinition = {
  id: 'venom_trap',
  name: 'BẪY ĐỘC',
  icon: 'BĐ',
  description: 'Đặt bẫy (tối đa 2 cái). Khi địch chạm, nổ mây độc bán kính 80 trong 4 giây và nhiễm độc.',
  unlockLevel: 1,
  requiresNode: 'poison_trap',
  cooldownMs: VENOM_TRAP.cooldownMs,
  energyCost: VENOM_TRAP.energy,
  color: 0x6bdc4a,
  colorCss: '#6bdc4a',
  control: { kind: 'point', range: VENOM_TRAP.range, radius: VENOM_TRAP.cloudRadius },
  cast: (context) => {
    const point = aimPointOf(context, VENOM_TRAP.range);
    const traps = trapsByScene.get(context.scene) ?? [];

    trapsByScene.set(context.scene, traps);

    const remove = (trap: Trap) => {
      trap.timer.remove(false);
      trap.marker.destroy();

      const index = traps.indexOf(trap);

      if (index !== -1) {
        traps.splice(index, 1);
      }
    };

    // Mốc cấp 3: đặt thêm 1 bẫy cùng lúc.
    const maxTraps = VENOM_TRAP.maxTraps + (context.level >= 3 ? 1 : 0);

    while (traps.length >= maxTraps) {
      remove(traps[0]);
    }

    const marker = context.scene.add
      .circle(point.x, point.y, 8, 0x6bdc4a, 0.8)
      .setStrokeStyle(2, 0xd4ffc4, 0.9)
      .setDepth(2);
    const trap: Trap = {
      x: point.x,
      y: point.y,
      marker,
      timer: context.scene.time.addEvent({
        delay: 100,
        loop: true,
        callback: () => {
          const triggered = alive(context).some(
            (enemy) =>
              Phaser.Math.Distance.Between(trap.x, trap.y, enemy.x, enemy.y) <=
              VENOM_TRAP.triggerRadius,
          );

          if (!triggered) {
            return;
          }

          remove(trap);

          // Mốc cấp 5: bẫy kích hoạt giữ chân địch 0.6s.
          if (context.level >= 5) {
            for (const enemy of inRadius(
              alive(context),
              trap.x,
              trap.y,
              VENOM_TRAP.cloudRadius,
            )) {
              enemy.applyStun(600);
            }
          }

          spawnPoisonCloud(
            context,
            trap.x,
            trap.y,
            VENOM_TRAP.cloudRadius,
            VENOM_TRAP.cloudMs,
            VENOM_TRAP.tickMs,
            VENOM_TRAP.poisonDps,
            VENOM_TRAP.poisonMs,
            1,
          );
        },
      }),
    };

    traps.push(trap);
    context.scene.time.delayedCall(VENOM_TRAP.lifetimeMs, () => {
      if (traps.includes(trap)) {
        remove(trap);
      }
    });
    spawnRing(context.scene, point.x, point.y, 24, 0x6bdc4a, 220);

    return true;
  },
};

export const TREE_PLAGUE_FLASK: SkillDefinition = {
  id: 'plague_flask',
  name: 'BÌNH DỊCH',
  icon: 'BD',
  description: 'Ném bình tại điểm ngắm: mây độc bán kính 100 trong 5 giây, nhiễm độc nặng và làm chậm nhẹ.',
  unlockLevel: 1,
  requiresNode: 'plague_flask',
  cooldownMs: PLAGUE_FLASK.cooldownMs,
  energyCost: PLAGUE_FLASK.energy,
  color: 0x8bd94a,
  colorCss: '#8bd94a',
  control: { kind: 'point', range: PLAGUE_FLASK.range, radius: PLAGUE_FLASK.radius },
  cast: (context) => {
    const point = aimPointOf(context, PLAGUE_FLASK.range);

    spawnPoisonCloud(
      context,
      point.x,
      point.y,
      PLAGUE_FLASK.radius,
      PLAGUE_FLASK.durationMs,
      PLAGUE_FLASK.tickMs,
      PLAGUE_FLASK.poisonDps,
      PLAGUE_FLASK.poisonMs,
      PLAGUE_FLASK.slowMult,
    );

    return true;
  },
};

export const TREE_DEADLY_BLOOM: SkillDefinition = {
  id: 'deadly_bloom',
  name: 'HOA TỬ THẦN',
  icon: 'HT',
  description: 'Gieo hạt tại điểm ngắm. Sau 1.5 giây nở bán kính 140, kẻ đang nhiễm độc chịu thêm sát thương lớn.',
  unlockLevel: 1,
  requiresNode: 'deadly_bloom',
  cooldownMs: DEADLY_BLOOM.cooldownMs,
  energyCost: DEADLY_BLOOM.energy,
  color: 0xd05bff,
  colorCss: '#d05bff',
  control: { kind: 'point', range: DEADLY_BLOOM.range, radius: DEADLY_BLOOM.radius },
  cast: (context) => {
    const point = aimPointOf(context, DEADLY_BLOOM.range);
    const seed = context.scene.add
      .circle(point.x, point.y, 7, 0xd05bff, 0.9)
      .setDepth(2);

    spawnRing(context.scene, point.x, point.y, DEADLY_BLOOM.radius, 0xd05bff, DEADLY_BLOOM.windupMs);

    context.scene.time.delayedCall(DEADLY_BLOOM.windupMs, () => {
      seed.destroy();

      for (const enemy of inRadius(alive(context), point.x, point.y, DEADLY_BLOOM.radius)) {
        const poisoned = enemy.hasDot('poison');
        const amount =
          (DEADLY_BLOOM.baseDamage +
            (poisoned ? DEADLY_BLOOM.damagePerPoisonedEnemy : 0)) *
          dmg(context);

        if (poisoned) {
          enemy.clearDot('poison');
        }

        enemy.takeDamage(amount, point.x, point.y);
        spawnHitSpark(context.scene, enemy.x, enemy.y, 0xd05bff);
      }

      spawnRing(context.scene, point.x, point.y, DEADLY_BLOOM.radius, 0xd05bff, 350);
      spawnBurst(context.scene, point.x, point.y, 0xd05bff, 22, 220);
      spawnGlow(context.scene, point.x, point.y, 0xd05bff, 3, 380);
      context.scene.cameras.main.shake(180, 0.006);
    });

    return true;
  },
};

export const TREE_ARROW_STORM: SkillDefinition = {
  id: 'arrow_storm',
  name: 'BÃO TÊN',
  icon: 'BT',
  description: '4 giây bắn liên tục theo hướng đã ngắm, mỗi mũi xuyên 2 mục tiêu.',
  unlockLevel: 1,
  requiresNode: 'storm_barrage',
  cooldownMs: ARROW_STORM.cooldownMs,
  energyCost: ARROW_STORM.energy,
  color: 0x7dff9a,
  colorCss: '#7dff9a',
  cast: (context) => {
    const stats = context.player.getStats();
    const baseAngle = context.aim.angle();
    const fire = () => {
      if (context.player.isDead()) {
        return;
      }

      const spread = Phaser.Math.DegToRad(
        Phaser.Math.FloatBetween(-ARROW_STORM.spreadDegrees, ARROW_STORM.spreadDegrees),
      );

      spawnArrow(
        context,
        baseAngle + spread,
        ARROW_STORM.damage * rangedDmg(context),
        ARROW_STORM.pierce + stats.bulletPierce,
        ARROW_STORM.speed * stats.bulletSpeedMultiplier,
      );
    };

    fire();
    repeatFor(context, ARROW_STORM.intervalMs, ARROW_STORM.durationMs, fire);
    showFloatingText(context, 'BÃO TÊN!', '#7dff9a');

    return true;
  },
};
