import Phaser from 'phaser';

import {
  BONE_CAGE,
  BONE_MAGE,
  BONE_MAGE_SQUAD,
  SKELETON_SQUAD,
  BONE_MAGE_ATTACK_MS,
  BONE_MAGE_DAMAGE,
  BONE_MAGE_HEALTH,
  BONE_MAGE_LIFETIME_MS,
  BONE_MAGE_RANGE,
  BONE_SPIKE,
  CORPSE_BURST,
  NEC_COLOR,
  RAISE_SKELETON,
  SKELETON_ATTACK_MS,
  SKELETON_DAMAGE,
  SKELETON_HEALTH,
  SKELETON_LIFETIME_MS,
  SKELETON_REACH,
  WITHER,
} from '../config/necromancerConfig';
import { spawnBurst, spawnGlow, spawnHitSpark, spawnRing } from '../utils/effects';
import type { SkillContext, SkillDefinition } from './skills';

const COLOR_CSS = '#9b6bff';

interface SquadRule {
  readonly baseMax: number;
  readonly extraPerLevel: number;
  readonly healthPerLevel: number;
}

/** Số đồng minh tối đa của kỹ năng ở cấp `level` (cấp 0 và 1 như nhau). */
function squadMax(rule: SquadRule, level: number): number {
  return rule.baseMax + rule.extraPerLevel * Math.max(0, Math.floor(level) - 1);
}

function squadHealthMult(rule: SquadRule, level: number): number {
  return 1 + rule.healthPerLevel * Math.max(0, Math.floor(level) - 1);
}

function aimPointOf(context: SkillContext, range: number): Phaser.Math.Vector2 {
  return (
    context.aimPoint ??
    new Phaser.Math.Vector2(
      context.player.x + context.aim.x * range * 0.7,
      context.player.y + context.aim.y * range * 0.7,
    )
  );
}

export const NEC_BONE_SPIKE: SkillDefinition = {
  id: 'nec_bone_spike',
  name: 'GAI XƯƠNG',
  icon: 'GX',
  description: 'Gai xương trồi dưới chân mục tiêu gần nhất. Đau hơn với kẻ bị Héo Mòn.',
  unlockLevel: 1,
  cooldownMs: BONE_SPIKE.cooldownMs,
  energyCost: BONE_SPIKE.energy,
  color: NEC_COLOR,
  colorCss: COLOR_CSS,
  control: { kind: 'target', range: BONE_SPIKE.range, select: 'nearest' },
  cast: (context) => {
    const target = context.target;

    if (!target || !target.isAlive()) {
      return false;
    }

    const cursed = target.hasVulnerable('curse');
    const damage =
      BONE_SPIKE.damage *
      context.player.getStats().damageMultiplier * context.power *
      (cursed ? BONE_SPIKE.witherBonus : 1);

    target.takeDamage(damage, context.player.x, context.player.y);
    spawnHitSpark(context.scene, target.x, target.y, NEC_COLOR);
    spawnBurst(context.scene, target.x, target.y + 8, 0xe8e0c8, 8, 130);
    spawnRing(context.scene, target.x, target.y + 8, 26, NEC_COLOR, 240);

    return true;
  },
};

export const NEC_RAISE_SKELETON: SkillDefinition = {
  id: 'nec_raise_skeleton',
  name: 'DẬY BỘ XƯƠNG',
  icon: 'BX',
  description:
    'Tiêu 1 xác gần nhất để dựng bộ xương chiến đấu 60 giây. Giới hạn riêng 3 bộ xương; mỗi cấp +1 bộ xương, +20% máu, +10% sát thương.',
  unlockLevel: 3,
  cooldownMs: RAISE_SKELETON.cooldownMs,
  energyCost: RAISE_SKELETON.energy,
  color: 0xe8e0c8,
  colorCss: '#e8e0c8',
  needsCorpses: {
    count: RAISE_SKELETON.corpseCost,
    radius: RAISE_SKELETON.corpseRadius,
  },
  cast: (context) => {
    const used = context.corpses.consumeNearest(
      context.player.x,
      context.player.y,
      RAISE_SKELETON.corpseRadius,
      RAISE_SKELETON.corpseCost,
    );

    if (used.length === 0) {
      return false;
    }

    const where = used[0];
    const damageMult = context.player.getStats().damageMultiplier * context.power;

    context.minions.spawn(
      where.x,
      where.y,
      {
        kind: 'skeleton',
        lifetimeMs: SKELETON_LIFETIME_MS,
        health: SKELETON_HEALTH * squadHealthMult(SKELETON_SQUAD, context.level),
        damage: SKELETON_DAMAGE * damageMult,
        attackMs: SKELETON_ATTACK_MS,
        reach: SKELETON_REACH,
        color: 0xe8e0c8,
      },
      squadMax(SKELETON_SQUAD, context.level),
    );

    return true;
  },
};

export const NEC_WITHER: SkillDefinition = {
  id: 'nec_wither',
  name: 'HÉO MÒN',
  icon: 'HM',
  description: 'Nguyền vùng đất: kẻ trong vùng nhận thêm 20% sát thương trong 6 giây.',
  unlockLevel: 5,
  cooldownMs: WITHER.cooldownMs,
  energyCost: WITHER.energy,
  color: 0x7a3bd0,
  colorCss: '#7a3bd0',
  control: { kind: 'point', range: WITHER.range, radius: WITHER.radius },
  cast: (context) => {
    const point = aimPointOf(context, WITHER.range);

    for (const enemy of context.enemies) {
      if (
        enemy.isAlive() &&
        Phaser.Math.Distance.Between(point.x, point.y, enemy.x, enemy.y) <=
          WITHER.radius
      ) {
        enemy.applyVulnerable('curse', WITHER.vulnerableMult, WITHER.durationMs);
        spawnHitSpark(context.scene, enemy.x, enemy.y, 0x7a3bd0);
      }
    }

    spawnRing(context.scene, point.x, point.y, WITHER.radius, 0x7a3bd0, 500);
    spawnGlow(context.scene, point.x, point.y, 0x7a3bd0, 2.2, 600);

    return true;
  },
};

export const NEC_CORPSE_BURST: SkillDefinition = {
  id: 'nec_corpse_burst',
  name: 'NỔ XÁC',
  icon: 'NX',
  description: 'Kích nổ tối đa 4 xác gần nhất: nổ diện rộng, mạnh hơn với xác của quái trâu.',
  unlockLevel: 7,
  cooldownMs: CORPSE_BURST.cooldownMs,
  energyCost: CORPSE_BURST.energy,
  color: 0xc35bff,
  colorCss: '#c35bff',
  needsCorpses: { count: 1, radius: CORPSE_BURST.range },
  cast: (context) => {
    const corpses = context.corpses.consumeNearest(
      context.player.x,
      context.player.y,
      CORPSE_BURST.range,
      CORPSE_BURST.maxCorpses,
    );

    if (corpses.length === 0) {
      return false;
    }

    const damageMult = context.player.getStats().damageMultiplier * context.power;

    for (const corpse of corpses) {
      const damage =
        (CORPSE_BURST.baseDamage +
          corpse.maxHealth * CORPSE_BURST.damagePerMaxHealth) *
        damageMult;

      for (const enemy of context.enemies) {
        if (
          enemy.isAlive() &&
          Phaser.Math.Distance.Between(corpse.x, corpse.y, enemy.x, enemy.y) <=
            CORPSE_BURST.blastRadius
        ) {
          enemy.takeDamage(damage, corpse.x, corpse.y);
          spawnHitSpark(context.scene, enemy.x, enemy.y, 0xc35bff);
        }
      }

      spawnRing(context.scene, corpse.x, corpse.y, CORPSE_BURST.blastRadius, 0xc35bff, 320);
      spawnBurst(context.scene, corpse.x, corpse.y, 0xc35bff, 14, 190);
      spawnGlow(context.scene, corpse.x, corpse.y, 0xc35bff, 1.8, 320);
    }

    context.scene.cameras.main.shake(140, 0.004);

    return true;
  },
};

export const NEC_BONE_MAGE: SkillDefinition = {
  id: 'nec_bone_mage',
  name: 'PHÁP SƯ XƯƠNG',
  icon: 'PS',
  description:
    'Tiêu 2 xác để dựng pháp sư xương bắn từ xa 60 giây. Giới hạn riêng 2 pháp sư; mỗi cấp +1 pháp sư, +20% máu, +10% sát thương.',
  unlockLevel: 9,
  cooldownMs: BONE_MAGE.cooldownMs,
  energyCost: BONE_MAGE.energy,
  color: 0xb48bff,
  colorCss: '#b48bff',
  needsCorpses: { count: BONE_MAGE.corpseCost, radius: BONE_MAGE.corpseRadius },
  cast: (context) => {
    const used = context.corpses.consumeNearest(
      context.player.x,
      context.player.y,
      BONE_MAGE.corpseRadius,
      BONE_MAGE.corpseCost,
    );

    if (used.length < BONE_MAGE.corpseCost) {
      return false;
    }

    context.minions.spawn(
      used[0].x,
      used[0].y,
      {
        kind: 'bone_mage',
        lifetimeMs: BONE_MAGE_LIFETIME_MS,
        health: BONE_MAGE_HEALTH * squadHealthMult(BONE_MAGE_SQUAD, context.level),
        damage: BONE_MAGE_DAMAGE * context.player.getStats().damageMultiplier * context.power,
        attackMs: BONE_MAGE_ATTACK_MS,
        reach: BONE_MAGE_RANGE,
        color: 0xb48bff,
      },
      squadMax(BONE_MAGE_SQUAD, context.level),
    );

    return true;
  },
};

export const NEC_BONE_CAGE: SkillDefinition = {
  id: 'nec_bone_cage',
  name: 'NHÀ TÙ XƯƠNG',
  icon: 'NT',
  description: 'Vòng xương làm chậm mạnh kẻ trong vùng 3 giây (boss kháng).',
  unlockLevel: 11,
  cooldownMs: BONE_CAGE.cooldownMs,
  energyCost: BONE_CAGE.energy,
  color: 0xe8e0c8,
  colorCss: '#e8e0c8',
  control: { kind: 'point', range: BONE_CAGE.range, radius: BONE_CAGE.radius },
  cast: (context) => {
    const point = aimPointOf(context, BONE_CAGE.range);

    for (const enemy of context.enemies) {
      if (
        enemy.isAlive() &&
        Phaser.Math.Distance.Between(point.x, point.y, enemy.x, enemy.y) <=
          BONE_CAGE.radius
      ) {
        enemy.applySlow(BONE_CAGE.slowMult, BONE_CAGE.durationMs);
      }
    }

    spawnRing(context.scene, point.x, point.y, BONE_CAGE.radius, 0xe8e0c8, 600);
    spawnBurst(context.scene, point.x, point.y, 0xe8e0c8, 16, 140);

    return true;
  },
};
