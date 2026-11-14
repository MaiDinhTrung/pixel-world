import Phaser from 'phaser';

import {
  DEATH_STAB_BEHIND_PX,
  DEATH_STAB_DAMAGE,
  DEATH_STAB_KILL_COOLDOWN_REDUCTION,
  DEATH_STAB_RANGE,
  DEATH_STAB_RETURN_MS,
  DEATH_STAB_SECOND_HIT_MS,
  DEATH_STAB_STUN_MS,
  VANISH_REFRESH_MS,
  SHADOW_DANCE_DAMAGE,
  SHADOW_DANCE_DASH_MS,
  SHADOW_DANCE_DASHES,
  SHADOW_DANCE_INVULN_PAD_MS,
  SHADOW_DANCE_STAR_POINTS,
  SHADOW_DANCE_STAR_SKIP,
  SHADOW_DANCE_ORBIT_RADIUS,
  SHADOW_DANCE_RANGE,
  SHADOW_DANCE_RETARGET_RADIUS,
  SHADOW_DANCE_SLASH_RADIUS,
  SHADOW_DANCE_STEALTH_MS,
  BERSERK_COOLDOWN_MS,
  BERSERK_DURATION_MS,
  SELF_DESTRUCT_COOLDOWN_MS,
  SELF_DESTRUCT_DAMAGE_MULT,
  SELF_DESTRUCT_FUSE_MS,
  SELF_DESTRUCT_PULL_BOSS_FACTOR,
  SELF_DESTRUCT_PULL_MIN_DISTANCE,
  SELF_DESTRUCT_PULL_SPEED,
  SELF_DESTRUCT_ENERGY_COST,
  SELF_DESTRUCT_RADIUS,
  SELF_DESTRUCT_UNLOCK_LEVEL,
  BLINK_COOLDOWN_MS,
  BLINK_DISTANCE,
  BLINK_ENERGY_COST,
  BLINK_INVULNERABLE_MS,
  CHARGE_COOLDOWN_MS,
  CHARGE_DAMAGE_REDUCTION,
  CHARGE_DISTANCE,
  CHARGE_DURATION_MS,
  CHARGE_ENERGY_COST,
  DUAL_GUARD_COOLDOWN_MS,
  DUAL_GUARD_START_ENERGY,
  FORTRESS_COOLDOWN_MS,
  FORTRESS_HP_MULT,
  FORTRESS_START_ENERGY,
  ELECTRIFY_ARC_INTERVAL_MS,
  ELECTRIFY_CHAIN_DAMAGE_RATIO,
  ELECTRIFY_CHAIN_MAX_TARGETS,
  ELECTRIFY_CHAIN_RADIUS,
  ELECTRIFY_PARALYZE_MS,
  ELECTRIFY_SLOW_MS,
  ELECTRIFY_SLOW_MULT,
  GROUND_SLAM_MAX_RANGE,
  MYRIAD_CHARGE_MS,
  MYRIAD_COOLDOWN_MS,
  MYRIAD_ENERGY_COST,
  MYRIAD_FINISH_DAMAGE_MULT,
  MYRIAD_FINISH_HALF_ARC_DEG,
  MYRIAD_FINISH_RANGE_MULT,
  MYRIAD_HALF_ARC_DEG,
  MYRIAD_PULSES,
  MYRIAD_PULSE_DAMAGE_MULT,
  MYRIAD_PULSE_INTERVAL_MS,
  MYRIAD_RANGE,
  MYRIAD_RECOVERY_MS,
  GROUND_SLAM_RADIUS,
  SHADOW_DASH_DISTANCE,
  SHADOW_DASH_DURATION_MS,
  SHADOW_DASH_GAP_MS,
  SHADOW_DASH_INVULNERABLE_MS,
  SHADOW_DASH_SPEED_BOOST,
  SHADOW_DASH_SPEED_BOOST_MS,
} from '../config/combatConfig';
import { TEXTURE_KEYS } from '../config/constants';
import { ELEMENT_COLORS } from '../config/damageTypeConfig';
import { cssColor } from '../config/palette';
import type { EnemyBase, HitInfo } from '../entities/EnemyBase';
import { pureDamage, type DamagePart } from '../combat/damage/resolveDamage';
import { BossEnemy } from '../entities/BossEnemy';
import type { Player } from '../entities/Player';
import type { SkillNodeId } from './tree/skillTreeTypes';
import type { CorpseManager } from '../systems/CorpseManager';
import type { MinionManager } from '../systems/MinionManager';
import {
  TREE_ABSOLUTE_ZERO,
  TREE_ARROW_STORM,
  TREE_CYCLONE,
  TREE_DEADLY_BLOOM,
  TREE_FIRE_WALL,
  TREE_FLAME_BURST,
  TREE_GRAPPLE_CHAIN,
  TREE_ARCANE_CHAIN,
  TREE_ICE_LANCE,
  TREE_LIVING_FORTRESS,
  TREE_PLAGUE_FLASK,
  TREE_SHADOW_STEP,
  TREE_SWORD_TEMPEST,
  TREE_TITAN_ROAR,
  TREE_VENOM_TRAP,
} from './treeSkills';
import {
  NEC_BONE_CAGE,
  NEC_BONE_MAGE,
  NEC_BONE_SPIKE,
  NEC_CORPSE_BURST,
  NEC_RAISE_SKELETON,
  NEC_WITHER,
} from './necromancerSkills';
import {
  spawnAfterimage,
  spawnBurst,
  spawnDust,
  spawnGlow,
  spawnHitSpark,
  spawnRing,
} from '../utils/effects';
import { nextProjectileId } from '../utils/projectile';
import type { SkillControl } from './skillControl';
import { startGroundSlamLeap } from './leap/GroundSlamLeap';
import { VFXManager } from '../vfx/VFXManager';
import type { VFXHandle } from '../vfx/vfxTypes';

const activeAuras = new Map<string, VFXHandle>();

/** Aura bám theo player trong `durationMs`; cast lại sẽ thay aura cũ. */
function attachAura(
  context: SkillContext,
  skillId: SkillId,
  kind: 'aura.shield' | 'aura.fury',
  tint: number,
  durationMs: number,
): void {
  activeAuras.get(skillId)?.stop();

  const handle = VFXManager.for(context.scene).attach(
    kind,
    context.player,
    tint,
  );

  activeAuras.set(skillId, handle);
  context.scene.time.delayedCall(durationMs, () => handle.stop());
}

export type SkillId =
  | 'shield_bash'
  | 'dual_guard'
  | 'fortress_stand'
  | 'whirlwind'
  | 'ground_slam'
  | 'iron_will'
  | 'war_cry'
  | 'blade_storm'
  | 'self_destruct'
  | 'triple_volley'
  | 'evasive_roll'
  | 'poison_trap'
  | 'arrow_rain'
  | 'hunters_mark'
  | 'storm_barrage'
  | 'arcane_nova'
  | 'blink'
  | 'frost_nova'
  | 'meteor'
  | 'arcane_shield'
  | 'void_rift'
  | 'nec_bone_spike'
  | 'nec_raise_skeleton'
  | 'nec_wither'
  | 'nec_corpse_burst'
  | 'nec_bone_mage'
  | 'nec_bone_cage'
  | 'living_fortress'
  | 'cyclone'
  | 'sword_tempest'
  | 'grapple_chain'
  | 'titan_roar'
  | 'flame_burst'
  | 'fire_wall'
  | 'ice_lance'
  | 'arcane_chain'
  | 'absolute_zero'
  | 'shadow_step'
  | 'venom_trap'
  | 'plague_flask'
  | 'deadly_bloom'
  | 'arrow_storm';

export interface SkillContext {
  /** Đạn của địch (để kỹ năng chặn/xoá đạn). */
  enemyBullets: Phaser.Physics.Arcade.Group;
  /** Danh sách quái mới nhất (kỹ năng kéo dài không nên dùng `enemies` đã chụp lúc tung). */
  getEnemies: () => EnemyBase[];
  /** Hệ số sát thương theo cấp kỹ năng (1 = cấp 0–1). */
  power: number;
  /** Cấp kỹ năng đã học (0–5; 0 và 1 như nhau). */
  level: number;
  /** Loại sát thương của skill đang tung (lấy từ `SkillDefinition.damageParts`). */
  parts?: readonly DamagePart[];
  /** Skill tự xử lý hiệu ứng (AoE, tự lan sét…): đòn chỉ mang loại, không kích hoạt thêm hiệu ứng nguyên tố. */
  noProc?: boolean;
  corpses: CorpseManager;
  minions: MinionManager;
  scene: Phaser.Scene;
  player: Player;
  aim: Phaser.Math.Vector2;
  /** true = hướng do người chơi kéo/khóa; false = hướng tự động (chạm nhanh). */
  aimExplicit?: boolean;
  moveDirection: Phaser.Math.Vector2;
  time: number;
  enemies: EnemyBase[];
  bullets: Phaser.Physics.Arcade.Group;
  /** Điểm ngắm (toạ độ world) khi kỹ năng kiểu `point`; chưa dùng ở bước này. */
  aimPoint?: Phaser.Math.Vector2;
  /** Mục tiêu đã chọn khi kỹ năng kiểu `target`; chưa dùng ở bước này. */
  target?: EnemyBase;
}

export interface SkillDefinition {
  readonly id: SkillId;
  readonly name: string;
  /** Ký hiệu ngắn hiển thị trên ô vuông kỹ năng. */
  readonly icon: string;
  readonly description: string;
  readonly unlockLevel: number;
  readonly cooldownMs: number;
  readonly energyCost: number;
  readonly color: number;
  readonly colorCss: string;
  /** Kiểu điều khiển; bỏ trống = `instant` (chạm là tung). */
  readonly control?: SkillControl;
  /** Kỹ năng bật/tắt: bấm lần nữa để dừng; `cast` chỉ chạy hiệu ứng bật, logic duy trì ở WorldScene. */
  readonly toggle?: boolean;
  /** Kỹ năng dùng lượt tích trữ của Player (hiện số lượt trên ô, hồi theo lượt). */
  readonly usesDashCharges?: boolean;
  /** Tung kỹ năng này không phá tàng hình. */
  readonly keepsStealth?: boolean;
  /** Kỹ năng từ cây: chỉ dùng/gán được khi đã học node này (cấp ≥ 1). */
  readonly requiresNode?: SkillNodeId;
  /** Kiểm tra TRƯỚC khi trừ EN/hồi chiêu; trả thông báo lỗi (tiếng Việt) hoặc null nếu dùng được. */
  readonly canCast?: (player: Player) => string | null;
  /** Loại sát thương của kỹ năng; bỏ trống = 100% vật lý. */
  readonly damageParts?: readonly DamagePart[];
  /** true = đòn chỉ mang loại, không kích hoạt hiệu ứng nguyên tố (xem `SkillContext.noProc`). */
  readonly damageNoProc?: boolean;
  /** Cần ít nhất `count` xác trong `radius` quanh người chơi; kiểm tra TRƯỚC khi trừ EN. */
  readonly needsCorpses?: { readonly count: number; readonly radius: number };
  cast(context: SkillContext): boolean;
}

/** Thông tin loại sát thương của skill đang tung (undefined = vật lý như cũ). */
export function skillHitInfo(
  context: SkillContext,
  noProc = false,
): HitInfo | undefined {
  return context.parts
    ? { parts: context.parts, noProc: noProc || context.noProc === true }
    : undefined;
}

export function damageInRadius(
  context: SkillContext,
  x: number,
  y: number,
  radius: number,
  damage: number,
  color: number,
): EnemyBase[] {
  const hits: EnemyBase[] = [];

  for (const enemy of context.enemies) {
    if (!enemy.isAlive()) {
      continue;
    }

    if (Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y) <= radius) {
      enemy.takeDamage(damage, x, y, skillHitInfo(context));
      spawnHitSpark(context.scene, enemy.x, enemy.y, color);
      hits.push(enemy);
    }
  }

  return hits;
}

function damageInCone(
  context: SkillContext,
  angle: number,
  range: number,
  halfArc: number,
  damage: number,
  color: number,
): EnemyBase[] {
  const hits: EnemyBase[] = [];

  for (const enemy of context.enemies) {
    if (!enemy.isAlive()) {
      continue;
    }

    const dx = enemy.x - context.player.x;
    const dy = enemy.y - context.player.y;

    if (dx * dx + dy * dy > range * range) {
      continue;
    }

    const enemyAngle = Math.atan2(dy, dx);

    if (
      Math.abs(Phaser.Math.Angle.Wrap(enemyAngle - angle)) <= halfArc
    ) {
      enemy.takeDamage(
        damage,
        context.player.x,
        context.player.y,
        skillHitInfo(context),
      );
      spawnHitSpark(context.scene, enemy.x, enemy.y, color);
      hits.push(enemy);
    }
  }

  return hits;
}

function getMeleeSkillDamage(
  context: SkillContext,
  baseDamage: number,
): number {
  const stats = context.player.getStats();

  return (
    baseDamage *
    stats.meleeDamageMultiplier *
    stats.damageMultiplier * context.power
  );
}

export function applyStun(hits: readonly EnemyBase[], durationMs: number): void {
  for (const enemy of hits) {
    enemy.applyStun(durationMs);
  }
}

export function applySlow(
  hits: readonly EnemyBase[],
  multiplier: number,
  durationMs: number,
): void {
  for (const enemy of hits) {
    enemy.applySlow(multiplier, durationMs);
  }
}

export function showFloatingText(
  context: SkillContext,
  message: string,
  colorCss: string,
): void {
  const text = context.scene.add
    .text(context.player.x, context.player.y - 34, message, {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: colorCss,
      fontStyle: 'bold',
      stroke: '#05060a',
      strokeThickness: 3,
    })
    .setOrigin(0.5)
    .setDepth(4000);

  context.scene.tweens.add({
    targets: text,
    y: text.y - 20,
    alpha: 0,
    duration: 650,
    ease: 'Quad.easeOut',
    onComplete: () => text.destroy(),
  });
}

/** Hồi máu theo số địch trúng đòn, có giới hạn để không hồi quá mạnh. */
function healFromHits(
  context: SkillContext,
  hits: readonly EnemyBase[],
  perHit: number,
  cap: number,
): void {
  const amount = Math.min(cap, hits.length * perHit);

  if (amount <= 0) {
    return;
  }

  context.player.heal(amount);
  showFloatingText(context, `+${amount} HP`, '#4dffa6');
  spawnGlow(context.scene, context.player.x, context.player.y, 0x4dffa6, 1.2, 260);
}

export function spawnArrow(
  context: SkillContext,
  angle: number,
  damage: number,
  pierce: number,
  speed: number,
  chillMs = 0,
): void {
  const directionX = Math.cos(angle);
  const directionY = Math.sin(angle);
  const muzzleX = context.player.x + directionX * 22;
  const muzzleY = context.player.y + directionY * 22;

  const arrow = context.bullets.get(
    muzzleX,
    muzzleY,
    TEXTURE_KEYS.arrow,
  ) as Phaser.Physics.Arcade.Sprite | null;

  if (!arrow) {
    return;
  }

  const shotId = nextProjectileId();

  arrow.setData('shotId', shotId);
  arrow.setData('damage', damage);
  arrow.setData('pierce', pierce);
  arrow.setData('chillMs', chillMs);
  // Loại sát thương của skill (undefined = vật lý); WorldScene đọc khi đạn trúng.
  arrow.setData('dmgType', context.parts?.[0]?.type);
  arrow.enableBody(true, muzzleX, muzzleY, true, true);
  arrow.setDepth(9);
  arrow.setScale(1);
  arrow.setBlendMode(Phaser.BlendModes.ADD);
  arrow.setRotation(angle);
  arrow.setVelocity(directionX * speed, directionY * speed);

  context.scene.time.delayedCall(1200, () => {
    if (arrow.active && arrow.getData('shotId') === shotId) {
      arrow.disableBody(true, true);
    }
  });
}

function findSafeBlinkTarget(
  context: SkillContext,
  direction: Phaser.Math.Vector2,
  distance: number,
): { x: number; y: number } {
  const bounds = context.scene.physics.world.bounds;
  const startX = context.player.x;
  const startY = context.player.y;

  for (let step = distance; step >= 16; step -= 16) {
    const x = Phaser.Math.Clamp(
      startX + direction.x * step,
      bounds.left + 24,
      bounds.right - 24,
    );
    const y = Phaser.Math.Clamp(
      startY + direction.y * step,
      bounds.top + 28,
      bounds.bottom - 28,
    );
    const obstacles = context.scene.physics.overlapRect(
      x - 12,
      y - 16,
      24,
      32,
      false,
      true,
    );

    if (obstacles.length === 0) {
      return { x, y };
    }
  }

  return { x: startX, y: startY };
}

function findSafePosition(
  context: SkillContext,
  preferredX: number,
  preferredY: number,
): { x: number; y: number } {
  const bounds = context.scene.physics.world.bounds;
  const x = Phaser.Math.Clamp(
    preferredX,
    bounds.left + 24,
    bounds.right - 24,
  );
  const y = Phaser.Math.Clamp(
    preferredY,
    bounds.top + 28,
    bounds.bottom - 28,
  );
  const obstacles = context.scene.physics.overlapRect(
    x - 12,
    y - 16,
    24,
    32,
    false,
    true,
  );

  if (obstacles.length === 0) {
    return { x, y };
  }

  return { x: context.player.x, y: context.player.y };
}

// ─────────────────────────────────────────────────────────────────────────────
// ĐẤU SĨ: tank cận chiến. Mỗi skill một vai trò: lao+hất lùi, đâm xa, diện rộng,
// hồi phục/bất tử, áp chế (debuff). Chỉ Cuồng Nộ mới buff sát thương.
// ─────────────────────────────────────────────────────────────────────────────

const DUAL_GUARD: SkillDefinition = {
  id: 'dual_guard',
  name: 'SONG THỦ KHIÊN',
  icon: 'DG',
  description: 'Bật/tắt (bấm lại để dừng). Cần mang Khiên: dùng Khiên và vũ khí còn lại cùng lúc, giảm 25% sát thương nhận, chạy chậm 40%, tiêu hao EN liên tục. Đổi sang Khiên = cầm hai tay: giơ khiên đỡ 60% sát thương thường, chạy chậm 50%.',
  unlockLevel: 5,
  cooldownMs: DUAL_GUARD_COOLDOWN_MS,
  energyCost: DUAL_GUARD_START_ENERGY,
  color: 0x6bd0ff,
  colorCss: '#6bd0ff',
  toggle: true,
  keepsStealth: true,
  cast: (context) => {
    showFloatingText(context, 'SONG THỦ KHIÊN', '#6bd0ff');
    spawnGlow(context.scene, context.player.x, context.player.y, 0x6bd0ff, 1.4, 240);

    return true;
  },
};

const FORTRESS_STAND: SkillDefinition = {
  id: 'fortress_stand',
  name: 'BẤT ĐỘNG THÀNH LŨY',
  icon: 'FS',
  description: `Bật/tắt (bấm lại để dừng). Cần đang cầm Khiên: cắm khiên xuống đất dựng tường chắn phía trước, HP tường = máu tối đa x${FORTRESS_HP_MULT}. Đòn từ phía trước đánh vào tường; đòn từ phía sau hoặc ngoài cung chắn vẫn trúng người. Không thể di chuyển/dash/dịch chuyển, tiêu EN liên tục. Tường vỡ hoặc hết EN thì kết thúc.`,
  unlockLevel: 5,
  cooldownMs: FORTRESS_COOLDOWN_MS,
  energyCost: FORTRESS_START_ENERGY,
  color: 0x6bd0ff,
  colorCss: '#6bd0ff',
  toggle: true,
  keepsStealth: true,
  cast: (context) => {
    showFloatingText(context, 'BẤT ĐỘNG THÀNH LŨY', '#6bd0ff');

    return true;
  },
};

/**
 * Nhiễm điện: tê liệt ngắn rồi làm chậm, kèm tia điện giật quanh kẻ địch suốt thời gian chậm.
 * Chỉ là hiệu ứng trạng thái (applyStun/applySlow có sẵn; boss tự giảm hiệu lực), không đổi toạ độ quái.
 */
function electrify(
  context: SkillContext,
  enemy: EnemyBase,
  paralyzeMs: number,
  chain?: { damage: number; struck: ReadonlySet<EnemyBase> },
): void {
  const scene = context.scene;
  const vfx = VFXManager.for(scene);

  // Sét lan: tối đa N quái gần nhất trong bán kính (không phải quái đã bị đòn gốc) nhận sát thương giảm.
  // Dùng loại sát thương sét qua takeDamage → resolveDamage; noProc để không lan tiếp/kích hoạt thêm.
  if (chain && chain.damage > 0) {
    const neighbors = context
      .getEnemies()
      .filter(
        (other) =>
          other !== enemy &&
          other.isAlive() &&
          !chain.struck.has(other) &&
          Phaser.Math.Distance.Between(enemy.x, enemy.y, other.x, other.y) <=
            ELECTRIFY_CHAIN_RADIUS,
      )
      .sort(
        (a, b) =>
          Phaser.Math.Distance.Between(enemy.x, enemy.y, a.x, a.y) -
          Phaser.Math.Distance.Between(enemy.x, enemy.y, b.x, b.y),
      )
      .slice(0, ELECTRIFY_CHAIN_MAX_TARGETS);

    for (const other of neighbors) {
      vfx.lightningBolt(enemy.x, enemy.y - 6, other.x, other.y - 6, 0xfff6b0, 220);
      other.takeDamage(
        chain.damage * ELECTRIFY_CHAIN_DAMAGE_RATIO,
        enemy.x,
        enemy.y,
        { parts: pureDamage('lightning'), noProc: true },
      );
      spawnHitSpark(scene, other.x, other.y, 0xfff6b0);
    }
  }

  enemy.applyStun(Math.max(ELECTRIFY_PARALYZE_MS, paralyzeMs));
  enemy.applySlow(ELECTRIFY_SLOW_MULT, ELECTRIFY_SLOW_MS);

  scene.time.addEvent({
    delay: ELECTRIFY_ARC_INTERVAL_MS,
    repeat: Math.floor(ELECTRIFY_SLOW_MS / ELECTRIFY_ARC_INTERVAL_MS) - 1,
    callback: (): void => {
      if (!enemy.active || !enemy.isAlive()) {
        return;
      }

      const a = Math.random() * Math.PI * 2;
      const r = Phaser.Math.Between(16, 30);

      vfx.lightningBolt(
        enemy.x + Math.cos(a) * 6,
        enemy.y - 6 + Math.sin(a) * 6,
        enemy.x + Math.cos(a) * r,
        enemy.y - 6 + Math.sin(a) * r,
        0xfff6b0,
        120,
      );
    },
  });
}

/**
 * XUNG PHONG (id cũ `shield_bash` giữ cho save cũ): đâm vũ khí về phía trước và lướt một đoạn,
 * gây sát thương lên MỌI kẻ địch chạm vào đường lướt (mỗi kẻ đúng một lần, qua takeDamage → resolveDamage).
 * Không dừng trước quái; chỉ tường/vật cản mới chặn lại (va chạm vật lý có sẵn của Player).
 */
const SHIELD_BASH: SkillDefinition = {
  id: 'shield_bash',
  name: 'XUNG PHONG',
  icon: 'XP',
  description: 'Đâm thương về phía trước và lướt 220 px, gây sát thương lên mọi kẻ địch trên đường lướt (mỗi kẻ một lần) và hất nhẹ về phía trước. Giảm 30% sát thương nhận khi lướt. Cấp 3: đường lướt rộng hơn. Kẻ bị đâm bị nhiễm điện: tê liệt ngắn rồi chậm 55% trong 2.5 giây, tia điện giật quanh người và lan sang tối đa 3 quái gần đó (bán kính 120) với 40% sát thương. Cấp 5: tê liệt 0.5 giây.',
  unlockLevel: 1,
  cooldownMs: CHARGE_COOLDOWN_MS,
  energyCost: CHARGE_ENERGY_COST,
  color: 0xffc46b,
  colorCss: '#ffc46b',
  control: {
    kind: 'directional',
    shape: 'line',
    range: CHARGE_DISTANCE,
    size: 56,
  },
  cast: (context) => {
    const direction =
      context.aim.lengthSq() > 0
        ? context.aim.clone().normalize()
        : new Phaser.Math.Vector2(1, 0);
    const player = context.player;
    const scene = context.scene;
    const damage = getMeleeSkillDamage(context, 3.3);
    // Mốc cấp 3: đường lướt rộng thêm 10px mỗi bên.
    const laneRadius = 34 + (context.level >= 3 ? 10 : 0);
    const stunMs = context.level >= 5 ? 500 : 0;
    const hitIds = new Set<EnemyBase>();
    const vfx = VFXManager.for(scene);
    let trailTimer = 0;
    let finished = false;

    player.grantDamageReduction(
      context.time,
      CHARGE_DURATION_MS + 120,
      CHARGE_DAMAGE_REDUCTION,
    );
    player.startSkillDash(
      direction,
      context.time,
      CHARGE_DURATION_MS,
      CHARGE_DISTANCE / (CHARGE_DURATION_MS / 1000),
      0,
    );
    player.playAttack(context.time, direction);
    player.setWeaponAimOverride(direction.x, direction.y);

    showFloatingText(context, 'XUNG PHONG!', '#ffc46b');
    // Đâm thương cỡ lớn (bảng màu vệt đâm của Liềm), bám theo người trong suốt đoạn lướt.
    const angle = direction.angle();
    // Hình lá: nhỏ sát người, to ở giữa, thu về mũi nhọn. Tầm giữ nguyên (140).
    const spear = vfx.spearThrust(player, angle, CHARGE_DURATION_MS + 120, 140, {
      thickMult: 1,
      sharp: true,
      rings: true,
    });
    const tipX = player.x + direction.x * 150;
    const tipY = player.y + direction.y * 150;

    // Sấm sét bùng ra từ mũi thương lúc đâm.
    vfx.lightningBolt(player.x, player.y - 4, tipX, tipY, 0xfff6b0, 220);

    for (let i = 0; i < 3; i += 1) {
      const a = angle + Phaser.Math.FloatBetween(-1.1, 1.1);
      const reach = Phaser.Math.Between(50, 90);

      vfx.lightningBolt(
        tipX,
        tipY,
        tipX + Math.cos(a) * reach,
        tipY + Math.sin(a) * reach,
        0xfff6b0,
        200,
      );
    }

    vfx.play('ring.shock', {
      x: tipX,
      y: tipY,
      radius: 50,
      tint: 0xff8fa3,
      durationMs: 260,
    });
    vfx.play('burst.sparks', { x: tipX, y: tipY, tint: 0xfff6b0, count: 10, speed: 190 });
    scene.cameras.main.shake(90, 0.004);
    spawnGlow(scene, tipX, tipY, 0xff8fa3, 2.2, 260);

    const finish = (): void => {
      if (finished) {
        return;
      }

      finished = true;
      scene.events.off(Phaser.Scenes.Events.UPDATE, update);
      scene.events.off(Phaser.Scenes.Events.SHUTDOWN, finish);

      // Mũi thương tự mờ dần; chỉ thu hồi sớm nếu người chơi chết giữa chừng.
      if (player.isDead() || !player.active) {
        spear.stop();
      }

      if (player.active) {
        player.clearWeaponAimOverride();
      }
    };

    const update = (_time: number, delta: number): void => {
      if (player.isDead() || !player.active || !player.isDashing(scene.time.now)) {
        finish();
        return;
      }

      // Quét kẻ địch chạm vào thân người đang lướt (đường lướt = quỹ đạo của chính Player).
      for (const enemy of context.getEnemies()) {
        if (!enemy.isAlive() || hitIds.has(enemy)) {
          continue;
        }

        if (
          Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y) >
          laneRadius
        ) {
          continue;
        }

        hitIds.add(enemy);
        enemy.takeDamage(
          damage,
          player.x - direction.x * 20,
          player.y - direction.y * 20,
          skillHitInfo(context),
        );
        spawnHitSpark(scene, enemy.x, enemy.y, 0xff8fa3);
        // Sét giật từ thương vào kẻ bị đâm và nảy ra một nhánh.
        vfx.lightningBolt(player.x, player.y - 4, enemy.x, enemy.y, 0xfff6b0, 200);
        vfx.lightningBolt(
          enemy.x,
          enemy.y,
          enemy.x + Phaser.Math.Between(-45, 45),
          enemy.y + Phaser.Math.Between(-45, 45),
          0xfff6b0,
          180,
        );

        electrify(context, enemy, stunMs, { damage, struck: hitIds });
      }

      trailTimer += delta;

      if (trailTimer >= 35) {
        trailTimer = 0;
        vfx.play('ghost.afterimage', {
          x: player.x,
          y: player.y,
          tint: 0xff8fa3,
          texture: player.texture.key,
          frame: String(player.frame.name),
        });
      }
    };

    scene.events.on(Phaser.Scenes.Events.UPDATE, update);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, finish);

    return true;
  },
};

/** Bảng màu vàng cam của Vạn Thương Ảnh (ngoài → lõi). */
const MYRIAD_COLORS = [0xff9a2e, 0xffb347, 0xffe08a, 0xffffff] as const;
const MYRIAD_COLOR = 0xffb347;

/**
 * VẠN THƯƠNG ẢNH (id cũ `whirlwind` giữ cho save cũ): tụ lực → liên hoàn → cú đâm cuối.
 * Sát thương CHỈ do các "đợt đâm" (MYRIAD_PULSES + cú cuối) gây ra, mỗi đợt một lần qua
 * `damageInCone` → `takeDamage` → `resolveDamage`. Bóng thương/dư ảnh chỉ là hình ảnh nên
 * số lượng hiệu ứng không làm tăng sát thương. Nhân vật đứng yên (root) suốt kỹ năng.
 */
const BULWARK: SkillDefinition = {
  id: 'whirlwind',
  name: 'VẠN THƯƠNG ẢNH',
  icon: 'VT',
  description: 'Giữ nút kỹ năng và kéo để chọn hướng (chạm nhanh = theo hướng mặt). Tụ lực chớp nhoáng rồi liên tục đâm thương toả ra theo hình quạt phía trước, tạo hàng loạt bóng thương; kết thúc bằng một cú đâm cuối mạnh và vươn xa hơn. Đứng yên khi thi triển. Mỗi đợt đâm gây sát thương riêng cho mọi kẻ địch trong hình quạt phía trước; kẻ bị đâm bị nhiễm điện (tê liệt, chậm, bị điện giật) và sét lan sang tối đa 3 quái gần đó với 40% sát thương.',
  unlockLevel: 3,
  cooldownMs: MYRIAD_COOLDOWN_MS,
  energyCost: MYRIAD_ENERGY_COST,
  color: MYRIAD_COLOR,
  colorCss: '#ffb347',
  control: {
    kind: 'directional',
    shape: 'cone',
    range: MYRIAD_RANGE,
    size: MYRIAD_HALF_ARC_DEG * 2,
  },
  canCast: (player) => (player.isLeaping() ? 'ĐANG NHẢY' : null),
  cast: (context) => {
    const player = context.player;
    const scene = context.scene;
    const vfx = VFXManager.for(scene);
    // Hướng khóa lúc thả nút: hướng kéo; chạm nhanh thì hướng nhân vật đang quay mặt (không tự nhắm quái).
    const direction = new Phaser.Math.Vector2();

    if (context.aimExplicit) {
      direction.copy(context.aim);
    } else {
      player.getFacingVector(direction);
    }

    direction.normalize();

    const angle = direction.angle();
    // Mốc cấp 3: tầm +30. Cấp 5: cú cuối +30% sát thương.
    const range = MYRIAD_RANGE + (context.level >= 3 ? 30 : 0);
    const pulseDamage = getMeleeSkillDamage(context, MYRIAD_PULSE_DAMAGE_MULT);
    const finishDamage = getMeleeSkillDamage(
      context,
      MYRIAD_FINISH_DAMAGE_MULT * (context.level >= 5 ? 1.3 : 1),
    );
    const castMs =
      MYRIAD_CHARGE_MS +
      MYRIAD_PULSES * MYRIAD_PULSE_INTERVAL_MS +
      MYRIAD_RECOVERY_MS;
    let ended = false;
    const timers: Phaser.Time.TimerEvent[] = [];
    // Mỗi quái chỉ nhiễm điện/lan sét một lần cho mỗi lần dùng (8 đợt đâm không nhân hiệu ứng lên).
    const electrified = new Set<EnemyBase>();

    player.root(context.time, castMs + 40);
    player.lockAnimation(context.time + castMs);
    player.setWeaponAimOverride(-direction.x, -direction.y); // đưa thương ra sau
    player.playAttack(context.time, direction);

    const handX = (): number => player.x + direction.x * 12;
    const handY = (): number => player.y + direction.y * 12 - 4;

    // Giai đoạn 1 – Tụ lực: sáng dần ở đầu thương, hạt năng lượng hội tụ, bụi nhẹ.
    showFloatingText(context, 'VẠN THƯƠNG ẢNH!', '#ffb347');
    spawnGlow(scene, handX(), handY(), MYRIAD_COLOR, 1.6, MYRIAD_CHARGE_MS);
    vfx.play('burst.sparks', {
      x: handX(),
      y: handY(),
      tint: 0xffe08a,
      count: 6,
      speed: 60,
    });
    vfx.play('dust.puff', { x: player.x, y: player.y + 16 });

    const end = (): void => {
      if (ended) {
        return;
      }

      ended = true;
      scene.events.off(Phaser.Scenes.Events.SHUTDOWN, end);

      for (const timer of timers) {
        timer.remove(false);
      }

      if (player.active) {
        player.clearWeaponAimOverride();
        player.releaseAnimationLock();
      }
    };

    const strike = (
      damage: number,
      reach: number,
      halfArcDeg: number,
      finale: boolean,
    ): void => {
      if (ended) {
        return;
      }

      if (player.isDead() || !player.active) {
        end();
        return;
      }

      // Đợt đâm gây sát thương: đúng một lần cho mỗi quái trong vùng (qua pipeline sát thương hiện có).
      const hits = damageInCone(
        { ...context, enemies: context.getEnemies() },
        angle,
        reach,
        Phaser.Math.DegToRad(halfArcDeg),
        damage,
        MYRIAD_COLOR,
      );

      const struckNow = new Set<EnemyBase>(hits);

      for (const enemy of hits) {
        // Nhiễm điện + sét lan sang quái bên cạnh (lần đầu bị đâm); các đợt sau chỉ làm mới độ chậm.
        if (!electrified.has(enemy)) {
          electrified.add(enemy);
          electrify(context, enemy, 0, { damage, struck: struckNow });
        } else {
          enemy.applySlow(ELECTRIFY_SLOW_MULT, ELECTRIFY_SLOW_MS);
        }

        vfx.play('impact.hit', { x: enemy.x, y: enemy.y, tint: 0xffe08a });
        vfx.lightningBolt(
          enemy.x,
          enemy.y,
          enemy.x + Phaser.Math.Between(-28, 28),
          enemy.y + Phaser.Math.Between(-28, 28),
          0xfff6b0,
          120,
        );
      }

      // Hình ảnh (không gây sát thương): nhiều tia đâm toả ra theo hình quạt từ tay cầm.
      // Vùng sát thương (damageInCone) dùng cùng góc quạt nên hình ảnh khớp vùng trúng đòn.
      const lanes = finale ? 9 : 5;
      const fan = Phaser.Math.DegToRad(halfArcDeg * 0.9);
      const boltLanes = new Set<number>([
        Phaser.Math.Between(0, lanes - 1),
        Phaser.Math.Between(0, lanes - 1),
      ]);

      for (let i = 0; i < lanes; i += 1) {
        const t = (i / (lanes - 1)) * 2 - 1; // -1..1 từ mép trái tới mép phải quạt
        const laneAngle = angle + t * fan + Phaser.Math.FloatBetween(-0.04, 0.04);
        // Tia giữa dài nhất, tia mép ngắn hơn: quạt có hình mũi nhọn.
        const laneReach = reach * (1 - Math.abs(t) * 0.22) * Phaser.Math.FloatBetween(0.85, 1);
        const center = i === (lanes - 1) / 2;
        const anchor = { x: player.x, y: player.y, active: true };

        if (boltLanes.has(i) || (finale && center)) {
          // Sấm sét chạy dọc đường đâm (hình ảnh, không gây sát thương).
          const boltReach = laneReach * Phaser.Math.FloatBetween(0.6, 1);

          vfx.lightningBolt(
            anchor.x + Math.cos(laneAngle) * 14,
            anchor.y + Math.sin(laneAngle) * 14 - 4,
            anchor.x + Math.cos(laneAngle) * boltReach,
            anchor.y + Math.sin(laneAngle) * boltReach - 4,
            0xfff6b0,
            finale ? 220 : 130,
          );
        }

        vfx.spearThrust(
          anchor,
          laneAngle,
          finale ? 300 : 130,
          laneReach,
          // Tia giữa của cú cuối đủ 4 lớp; các tia còn lại 2 lớp để nhẹ cho mobile.
          {
            colors: MYRIAD_COLORS,
            thickMult: finale ? (center ? 1.56 : 0.49) : 0.3,
            simple: !(finale && center),
          },
        );
      }

      // Dư ảnh (pixel rõ nét, không làm nhoè).
      vfx.play('ghost.afterimage', {
        x: player.x,
        y: player.y,
        tint: MYRIAD_COLOR,
        texture: player.texture.key,
        frame: String(player.frame.name),
      });
      player.playAttack(scene.time.now, direction);
      player.setWeaponAimOverride(direction.x, direction.y);
    };

    // Giai đoạn 2 – Vạn Thương: các đợt đâm liên tiếp.
    let pulse = 0;

    timers.push(
      scene.time.delayedCall(MYRIAD_CHARGE_MS, () => {
        if (ended) {
          return;
        }

        timers.push(
          scene.time.addEvent({
            delay: MYRIAD_PULSE_INTERVAL_MS,
            repeat: MYRIAD_PULSES - 1,
            callback: () => {
              pulse += 1;
              strike(pulseDamage, range, MYRIAD_HALF_ARC_DEG, false);

              // Giai đoạn 3 – Kết thúc: cú đâm cuối ngay sau đợt cuối.
              if (pulse >= MYRIAD_PULSES) {
                timers.push(
                  scene.time.delayedCall(MYRIAD_PULSE_INTERVAL_MS, () => {
                    strike(
                      finishDamage,
                      range * MYRIAD_FINISH_RANGE_MULT,
                      MYRIAD_FINISH_HALF_ARC_DEG,
                      true,
                    );

                    const tipX = player.x + direction.x * range * 1.15;
                    const tipY = player.y + direction.y * range * 1.15;

                    vfx.play('ring.shock', {
                      x: tipX,
                      y: tipY,
                      radius: 60,
                      tint: MYRIAD_COLOR,
                      durationMs: 280,
                    });
                    // Bóng thương tan thành hạt sáng.
                    vfx.play('burst.sparks', {
                      x: tipX,
                      y: tipY,
                      tint: 0xffe08a,
                      count: 18,
                      speed: 200,
                    });
                    for (let i = 0; i < 5; i += 1) {
                      const a = angle + Phaser.Math.FloatBetween(-1.3, 1.3);
                      const len = Phaser.Math.Between(40, 85);

                      vfx.lightningBolt(
                        tipX,
                        tipY,
                        tipX + Math.cos(a) * len,
                        tipY + Math.sin(a) * len,
                        0xfff6b0,
                        240,
                      );
                    }

                    spawnGlow(scene, tipX, tipY, MYRIAD_COLOR, 2.4, 300);
                    scene.cameras.main.shake(120, 0.005);
                    timers.push(
                      scene.time.delayedCall(MYRIAD_RECOVERY_MS, end),
                    );
                  }),
                );
              }
            },
          }),
        );
      }),
    );

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, end);

    return true;
  },
};

const GROUND_SLAM: SkillDefinition = {
  id: 'ground_slam',
  name: 'ĐẬP ĐẤT',
  icon: 'GS',
  description: 'Giữ nút kỹ năng và kéo để chọn điểm đáp (chạm nhanh = nhảy theo hướng mặt). Nhân vật khuỵu xuống, bật cao, lao xuống đâm vũ khí vào đất: đâm thương xuống kèm sấm sét: sát thương diện rộng, hất tung quái nhỏ, choáng và nhiễm điện (chậm, bị điện giật). Không xuyên tường; boss không bị hất tung.',
  unlockLevel: 5,
  cooldownMs: 9000,
  energyCost: 20,
  color: 0xff9a3d,
  colorCss: '#ff9a3d',
  control: { kind: 'point', range: GROUND_SLAM_MAX_RANGE, radius: GROUND_SLAM_RADIUS },
  canCast: (player) => (player.isLeaping() ? 'ĐANG NHẢY' : null),
  cast: (context) => {
    const damage = getMeleeSkillDamage(context, 5);
    // Mốc cấp 3: bán kính +14.
    const radius = GROUND_SLAM_RADIUS + (context.level >= 3 ? 14 : 0);

    return startGroundSlamLeap(context, {
      color: 0xff8fa3, // cùng bảng màu hồng + sét với Xung Phong
      radius,
      // Một lần gọi damageInRadius = mỗi quái nhận sát thương đúng một lần (qua takeDamage → resolveDamage).
      onImpact: (x, y) => {
        const hits = damageInRadius(
          { ...context, enemies: context.getEnemies() },
          x,
          y,
          radius,
          damage,
          0xff8fa3,
        );

        // Nhiễm điện như Xung Phong: tê liệt, chậm và bị tia điện giật (quái bị hất tung vẫn choáng dài hơn).
        const struck = new Set<EnemyBase>(hits);

        for (const enemy of hits) {
          electrify(context, enemy, 0, { damage, struck });
        }

        showFloatingText(context, 'ĐẬP ĐẤT!', '#ff9a3d');

        return hits;
      },
    });
  },
};

const IRON_WILL: SkillDefinition = {
  id: 'iron_will',
  name: 'Ý CHÍ SẮT',
  icon: 'IW',
  description: 'Ý chí sắt: hồi 4 HP và bất tử 1.5 giây.',
  unlockLevel: 7,
  cooldownMs: 15000,
  energyCost: 15,
  color: 0x4dffa6,
  colorCss: '#4dffa6',
  cast: (context) => {
    // Mốc cấp 3: hồi +2 máu. Cấp 5: bất tử thêm 0.5s.
    context.player.heal(4 + (context.level >= 3 ? 2 : 0));
    context.player.grantInvulnerability(
      context.time,
      1500 + (context.level >= 5 ? 500 : 0),
    );
    showFloatingText(context, '+HP · BẤT TỬ', '#4dffa6');
    attachAura(context, 'iron_will', 'aura.shield', 0x4dffa6, 1500);
    spawnGlow(context.scene, context.player.x, context.player.y, 0x4dffa6, 2.2, 500);
    spawnRing(context.scene, context.player.x, context.player.y, 120, 0x4dffa6, 450);
    spawnBurst(context.scene, context.player.x, context.player.y, 0x4dffa6, 10, 110);

    return true;
  },
};

const WAR_CRY: SkillDefinition = {
  id: 'war_cry',
  name: 'ÁP CHẾ',
  icon: 'AC',
  description: 'Gầm vang áp chế quái xung quanh: choáng 0.5 giây, làm chậm 50% trong 3 giây và khiến chúng nhận thêm 20% sát thương trong 5 giây.',
  unlockLevel: 9,
  cooldownMs: 18000,
  energyCost: 22,
  color: 0xffd166,
  colorCss: '#ffd166',
  cast: (context) => {
    // Mốc cấp 3: bán kính +30.
    const radius = 155 + (context.level >= 3 ? 30 : 0);

    const damage = getMeleeSkillDamage(context, 1.5);
    const hits = damageInRadius(
      context,
      context.player.x,
      context.player.y,
      radius,
      damage,
      0xffd166,
    );

    applyStun(hits, 500);
    applySlow(hits, 0.5, 3000);

    // Mốc cấp 5: hiệu ứng nhận thêm sát thương kéo dài 7s thay vì 5s.
    for (const enemy of hits) {
      enemy.applyVulnerable('curse', 1.2, context.level >= 5 ? 7000 : 5000);
    }

    showFloatingText(context, 'ÁP CHẾ!', '#ffd166');
    spawnGlow(context.scene, context.player.x, context.player.y, 0xffd166, 2.4, 500);
    spawnRing(context.scene, context.player.x, context.player.y, radius, 0xffd166, 450);
    spawnBurst(context.scene, context.player.x, context.player.y, 0xffd166, 14, 150);

    return true;
  },
};

/**
 * CUỒNG NỘ (thay Dạng Khổng Lồ). ID cũ `blade_storm` được giữ để save cũ vẫn hợp lệ.
 * Toàn bộ logic trạng thái (BERSERK → EXHAUSTED → NORMAL, hệ số HP/giáp/sát thương,
 * hủy khi chết) nằm ở `Player`; skill chỉ kích hoạt và dựng hiệu ứng.
 */
const BERSERK: SkillDefinition = {
  id: 'blade_storm',
  name: 'CUỒNG NỘ',
  icon: 'CN',
  description: 'Cuồng nộ 40 giây: HP tối đa ×3, +50% sát thương, +50% mọi loại giáp. Hết hiệu lực: HP còn đúng 1 và Kiệt Quệ 30 giây (giảm 50% sát thương gây ra). Không dùng được khi đang Cuồng Nộ/Kiệt Quệ.',
  unlockLevel: 11,
  cooldownMs: BERSERK_COOLDOWN_MS,
  energyCost: 0,
  color: 0xff4d3d,
  colorCss: '#ff4d3d',
  canCast: (player) =>
    player.canStartBerserk()
      ? null
      : player.getRageState() === 'berserk'
        ? 'ĐANG CUỒNG NỘ'
        : 'ĐANG KIỆT QUỆ',
  cast: (context) => {
    const player = context.player;

    if (!player.startBerserk(context.time)) {
      return false;
    }

    const radius = 200;

    // Gỡ aura/hiện thông báo theo trạng thái; gọi cả khi chết (không báo Kiệt Quệ lúc đã chết).
    player.onRageStateChange = (state) => {
      if (state !== 'berserk') {
        activeAuras.get('blade_storm')?.stop();
      }

      if (player.isDead() || !player.active) {
        return;
      }

      if (state === 'exhausted') {
        showFloatingText(context, 'KIỆT QUỆ · 1 HP', '#8a8f9c');
      } else if (state === 'normal') {
        showFloatingText(context, 'HẾT KIỆT QUỆ', '#cfd3dd');
      }
    };

    showFloatingText(context, 'CUỒNG NỘ!', '#ff4d3d');
    attachAura(context, 'blade_storm', 'aura.fury', 0xff4d3d, BERSERK_DURATION_MS);
    VFXManager.for(context.scene).play('ground.crack', {
      x: player.x,
      y: player.y,
      radius,
      angle: Math.random() * Math.PI * 2,
      tint: 0xff4d3d,
    });
    spawnRing(context.scene, player.x, player.y, radius, 0xff4d3d, 550);
    spawnRing(context.scene, player.x, player.y, radius * 0.7, 0xffd166, 700);
    spawnGlow(context.scene, player.x, player.y, 0xff4d3d, 3.4, 600);
    spawnBurst(context.scene, player.x, player.y, 0xff4d3d, 22, 210);
    context.scene.cameras.main.flash(180, 255, 80, 60, false);
    context.scene.cameras.main.shake(220, 0.007);

    return true;
  },
};

/** Vụ nổ kiểu bom: chớp trắng → quả cầu lửa → sóng xung kích → tia lửa, khói, vết cháy. */
function playBombExplosion(
  scene: Phaser.Scene,
  x: number,
  y: number,
  radius: number,
): void {
  const fireball = (
    color: number,
    toScale: number,
    duration: number,
    delay: number,
    alpha: number,
  ): void => {
    const circle = scene.add
      .circle(x, y, radius * 0.5, color, alpha)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(4000)
      .setScale(0.1);

    scene.tweens.add({
      targets: circle,
      scale: toScale,
      alpha: 0,
      duration,
      delay,
      ease: 'Cubic.easeOut',
      onComplete: () => circle.destroy(),
    });
  };

  fireball(0xffffff, 2.0, 160, 0, 1); // chớp trắng chói
  fireball(0xffd166, 2.0, 380, 0, 0.9); // lõi vàng
  fireball(0xff7a1a, 2.0, 520, 40, 0.8); // quả cầu lửa cam
  fireball(0xc4260f, 2.0, 700, 90, 0.6); // viền đỏ sẫm

  spawnRing(scene, x, y, radius, 0xffe0a0, 320);
  spawnRing(scene, x, y, radius * 1.25, 0xff7a1a, 520);
  spawnGlow(scene, x, y, 0xfff0b0, 5, 420);
  spawnBurst(scene, x, y, 0xffd166, 36, 320);
  spawnBurst(scene, x, y, 0xff5a1f, 28, 200);

  for (let i = 0; i < 10; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * radius * 0.8;

    spawnDust(
      scene,
      x + Math.cos(angle) * dist,
      y + Math.sin(angle) * dist,
      i % 2 === 0 ? 0x3a3a42 : 0x6b6b75,
    );
  }

  VFXManager.for(scene).play('ground.crack', {
    x,
    y,
    radius: radius * 0.9,
    angle: Math.random() * Math.PI * 2,
    tint: 0x2a2a30,
  });
  scene.cameras.main.flash(260, 255, 230, 160, false);
  scene.cameras.main.shake(420, 0.016);
}

/**
 * TỰ BẠO: nổ quanh người, mỗi mục tiêu nhận `maxHealthSnapshot × hệ số` (không chia đều),
 * đi qua `EnemyBase.takeDamage` → `resolveDamage` (giáp vật lý/kháng của quái vẫn áp dụng).
 * Nạp quả cầu năng lượng 3s rồi nổ; sát thương được áp xong TRƯỚC khi người chơi chết,
 * và vụ nổ vẫn xảy ra nếu người chơi chết trong lúc nạp.
 * Trong BERSERK snapshot là HP đã ×3; trong EXHAUSTED là HP gốc.
 */
const SELF_DESTRUCT: SkillDefinition = {
  id: 'self_destruct',
  name: 'TỰ BẠO',
  icon: 'TB',
  description: 'Hy sinh bản thân: tạo quả cầu năng lượng bao quanh người, đứng yên và hút kẻ địch trong vòng về phía bạn, sau 3 giây phát nổ. Mỗi kẻ địch trong vùng nhận sát thương bằng 200% HP tối đa lúc kích hoạt (tính cả khi đang Cuồng Nộ). Sau vụ nổ nhân vật tử trận.',
  unlockLevel: SELF_DESTRUCT_UNLOCK_LEVEL,
  cooldownMs: SELF_DESTRUCT_COOLDOWN_MS,
  energyCost: SELF_DESTRUCT_ENERGY_COST,
  color: 0xffb02e,
  colorCss: '#ffb02e',
  canCast: (player) =>
    player.isDead() || player.isInSafeZone() ? 'KHÔNG THỂ DÙNG LÚC NÀY' : null,
  cast: (context) => {
    const player = context.player;

    if (player.isDead() || player.isInSafeZone()) {
      return false;
    }

    // Chụp HP tối đa NGAY lúc kích hoạt (không dùng HP hiện tại, không đổi theo Cuồng Nộ về sau).
    const maxHealthSnapshot = player.getMaxHealth();
    const damage = maxHealthSnapshot * SELF_DESTRUCT_DAMAGE_MULT;
    const scene = context.scene;
    let lastX = player.x;
    let lastY = player.y;

    // Đứng yên suốt thời gian nạp.
    player.root(context.time, SELF_DESTRUCT_FUSE_MS);

    // Quả cầu năng lượng bao quanh người, bám theo và phình dần trong thời gian nạp.
    const orb = scene.add
      .circle(lastX, lastY, SELF_DESTRUCT_RADIUS * 0.35, 0xffb02e, 0.35)
      .setStrokeStyle(2, 0xfff0b0, 0.9)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(player.depth + 1);
    const core = scene.add
      .circle(lastX, lastY, 10, 0xfff0b0, 0.8)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(player.depth + 2);
    const warning = scene.add
      .circle(lastX, lastY, SELF_DESTRUCT_RADIUS, 0xffb02e, 0.06)
      .setStrokeStyle(1, 0xffb02e, 0.5)
      .setDepth(2);
    const tween = scene.tweens.add({
      targets: orb,
      scale: { from: 0.8, to: 1.5 },
      alpha: { from: 0.3, to: 0.7 },
      duration: SELF_DESTRUCT_FUSE_MS,
      ease: 'Sine.easeIn',
    });
    const pulse = scene.tweens.add({
      targets: core,
      scale: { from: 0.8, to: 2.2 },
      duration: 220,
      yoyo: true,
      repeat: -1,
    });
    const startedAt = scene.time.now;
    // Bám theo người chơi còn sống; khi đã chết thì giữ nguyên chỗ cuối cùng.
    // Nhấp nháy đỏ/trắng như bom đếm ngược: càng gần lúc nổ càng dồn dập.
    const follow = (_time: number, delta: number): void => {
      if (!player.isDead() && player.active) {
        lastX = player.x;
        lastY = player.y;
      }

      // Hút địch trong vòng về phía tâm; dịch trực tiếp vị trí vì AI quái ghi đè vận tốc mỗi frame.
      for (const enemy of context.getEnemies()) {
        if (!enemy.isAlive()) {
          continue;
        }

        const dx = lastX - enemy.x;
        const dy = lastY - enemy.y;
        const dist = Math.hypot(dx, dy);

        if (dist > SELF_DESTRUCT_RADIUS || dist <= SELF_DESTRUCT_PULL_MIN_DISTANCE) {
          continue;
        }

        const step = Math.min(
          dist - SELF_DESTRUCT_PULL_MIN_DISTANCE,
          SELF_DESTRUCT_PULL_SPEED *
            (enemy instanceof BossEnemy ? SELF_DESTRUCT_PULL_BOSS_FACTOR : 1) *
            (delta / 1000),
        );

        enemy.setPosition(
          enemy.x + (dx / dist) * step,
          enemy.y + (dy / dist) * step,
        );
      }

      const progress = Phaser.Math.Clamp(
        (scene.time.now - startedAt) / SELF_DESTRUCT_FUSE_MS,
        0,
        1,
      );
      const blinkMs = Phaser.Math.Linear(380, 70, progress * progress);
      const hot = Math.floor((scene.time.now - startedAt) / blinkMs) % 2 === 0;

      orb.setFillStyle(hot ? 0xff3b1f : 0xfff0b0, hot ? 0.45 : 0.6);
      orb.setStrokeStyle(2, hot ? 0xffd166 : 0xff3b1f, 0.95);
      core.setFillStyle(hot ? 0xffffff : 0xff3b1f, 0.9);
      orb.setPosition(lastX, lastY);
      core.setPosition(lastX, lastY);
      warning.setPosition(lastX, lastY);
    };

    scene.events.on(Phaser.Scenes.Events.UPDATE, follow);
    showFloatingText(context, 'TỰ BẠO · 3s', '#ffb02e');
    spawnGlow(scene, lastX, lastY, 0xffb02e, 2, 400);

    scene.time.delayedCall(SELF_DESTRUCT_FUSE_MS, () => {
      scene.events.off(Phaser.Scenes.Events.UPDATE, follow);
      tween.stop();
      pulse.stop();
      orb.destroy();
      core.destroy();
      warning.destroy();

      // Vụ nổ vẫn xảy ra dù người chơi đã chết trong lúc nạp.
      damageInRadius(
        { ...context, enemies: context.getEnemies() },
        lastX,
        lastY,
        SELF_DESTRUCT_RADIUS,
        damage,
        0xffb02e,
      );

      playBombExplosion(scene, lastX, lastY, SELF_DESTRUCT_RADIUS);

      // Tử trận sau cùng (bỏ qua nếu đã chết) theo luồng Death/Respawn thông thường.
      player.sacrifice();
    });

    return true;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// PHÁP SƯ: dịch chuyển, AoE, khống chế.
// ─────────────────────────────────────────────────────────────────────────────

const ARCANE_NOVA: SkillDefinition = {
  id: 'arcane_nova',
  damageParts: pureDamage('lightning'),
  damageNoProc: true, // AoE đã trúng nhiều đích, lan sét sẽ nhân đôi sát thương
  name: 'BÙNG NỔ PHÉP',
  icon: 'AN',
  description: 'Nổ diện rộng 190 px và làm chậm 45% trong 2.5 giây.',
  unlockLevel: 1,
  cooldownMs: 6000,
  energyCost: 28,
  color: 0x9d5cff,
  colorCss: '#9d5cff',
  cast: (context) => {
    const damage = 4 * context.player.getStats().damageMultiplier * context.power;
    // Mốc cấp 3: bán kính +20. Cấp 5: đẩy lùi mạnh, hất địch ra xa.
    const radius = 190 + (context.level >= 3 ? 20 : 0);
    const hits = damageInRadius(
      context,
      context.player.x,
      context.player.y,
      radius,
      damage,
      0x9d5cff,
    );

    applySlow(hits, 0.55, 2500);

    if (context.level >= 5) {
      for (const enemy of hits) {
        const away = new Phaser.Math.Vector2(
          enemy.x - context.player.x,
          enemy.y - context.player.y,
        );

        if (away.lengthSq() > 0) {
          away.normalize().scale(45);
          enemy.setPosition(enemy.x + away.x, enemy.y + away.y);
        }
      }
    }
    spawnRing(context.scene, context.player.x, context.player.y, radius, 0x9d5cff, 400);
    spawnGlow(context.scene, context.player.x, context.player.y, 0x9d5cff, 3.2, 380);
    spawnBurst(context.scene, context.player.x, context.player.y, 0x9d5cff, 14, 200);
    context.scene.cameras.main.flash(140, 140, 80, 255, false);
    context.scene.cameras.main.shake(140, 0.005);

    return true;
  },
};

const BLINK: SkillDefinition = {
  id: 'blink',
  name: 'DỊCH CHUYỂN',
  icon: 'BL',
  description: 'Kỹ năng tuỳ chọn: dịch chuyển 200 px, nổ và làm chậm quái tại vị trí cũ. Chỉ bất tử 0.15 giây.',
  unlockLevel: 9,
  cooldownMs: BLINK_COOLDOWN_MS,
  energyCost: BLINK_ENERGY_COST,
  color: 0x5fe0ff,
  colorCss: '#5fe0ff',
  control: {
    kind: 'directional',
    shape: 'line',
    range: BLINK_DISTANCE,
    size: 40,
  },
  cast: (context) => {
    const stats = context.player.getStats();
    const direction =
      context.aim.lengthSq() > 0
        ? context.aim.clone().normalize()
        : new Phaser.Math.Vector2(1, 0);
    const originX = context.player.x;
    const originY = context.player.y;
    const target = findSafeBlinkTarget(context, direction, BLINK_DISTANCE);
    const hits = damageInRadius(
      context,
      originX,
      originY,
      100,
      2 * stats.damageMultiplier * context.power,
      0x5fe0ff,
    );

    applySlow(hits, 0.5, 1500);
    spawnRing(context.scene, originX, originY, 100, 0x5fe0ff, 300);
    spawnBurst(context.scene, originX, originY, 0x5fe0ff, 10, 120);

    context.player.setPosition(target.x, target.y);
    context.player.cancelDash();
    context.player.grantInvulnerability(
      context.time,
      BLINK_INVULNERABLE_MS,
    );

    spawnGlow(context.scene, target.x, target.y, 0x5fe0ff, 1.4, 300);
    spawnRing(context.scene, target.x, target.y, 70, 0x5fe0ff, 260);

    return true;
  },
};

const FROST_NOVA: SkillDefinition = {
  id: 'frost_nova',
  damageParts: pureDamage('ice'),
  name: 'SÓNG BĂNG',
  icon: 'FN',
  description: 'Sóng băng 210 px: sát thương, đóng băng 1.8 giây rồi làm chậm.',
  unlockLevel: 3,
  cooldownMs: 9000,
  energyCost: 26,
  color: ELEMENT_COLORS.ice,
  colorCss: cssColor(ELEMENT_COLORS.ice),
  cast: (context) => {
    const damage = 3.5 * context.player.getStats().damageMultiplier * context.power;
    // Mốc cấp 3: bán kính +20.
    const radius = 210 + (context.level >= 3 ? 20 : 0);
    const hits = damageInRadius(
      context,
      context.player.x,
      context.player.y,
      radius,
      damage,
      ELEMENT_COLORS.ice,
    );

    applyStun(hits, 1800);
    for (const enemy of hits) {
      enemy.applyChill(0.5, 3000);
    }
    spawnRing(context.scene, context.player.x, context.player.y, radius, ELEMENT_COLORS.ice, 420);
    spawnGlow(context.scene, context.player.x, context.player.y, ELEMENT_COLORS.ice, 2.6, 400);
    spawnBurst(context.scene, context.player.x, context.player.y, ELEMENT_COLORS.ice, 16, 180);

    return true;
  },
};

const METEOR: SkillDefinition = {
  id: 'meteor',
  damageParts: pureDamage('fire'),
  name: 'THIÊN THẠCH',
  icon: 'ME',
  description: 'Thiên thạch rơi sau 0.7 giây: sát thương lớn, choáng 1.2 giây.',
  unlockLevel: 7,
  cooldownMs: 15000,
  energyCost: 35,
  color: ELEMENT_COLORS.fire,
  colorCss: cssColor(ELEMENT_COLORS.fire),
  control: { kind: 'point', range: 260, radius: 150 },
  cast: (context) => {
    const stats = context.player.getStats();
    const bounds = context.scene.physics.world.bounds;
    const targetX = Phaser.Math.Clamp(
      context.aimPoint?.x ?? context.player.x + context.aim.x * 260,
      bounds.left + 160,
      bounds.right - 160,
    );
    const targetY = Phaser.Math.Clamp(
      context.aimPoint?.y ?? context.player.y + context.aim.y * 260,
      bounds.top + 160,
      bounds.bottom - 160,
    );

    spawnRing(context.scene, targetX, targetY, 150, ELEMENT_COLORS.fire, 700);
    spawnGlow(context.scene, targetX, targetY, ELEMENT_COLORS.fire, 1.8, 700);

    context.scene.time.delayedCall(700, () => {
      const hits = damageInRadius(
        context,
        targetX,
        targetY,
        150,
        8 * stats.damageMultiplier * context.power,
        ELEMENT_COLORS.fire,
      );

      applyStun(hits, 1200);
      applySlow(hits, 0.5, 2500);

      // Mốc cấp 3: thêm 2 mảnh thiên thạch phụ rơi hai bên.
      if (context.level >= 3) {
        for (const side of [-1, 1]) {
          const shardX = targetX + side * 110;

          context.scene.time.delayedCall(260, () => {
            damageInRadius(
              { ...context, enemies: context.getEnemies() },
              shardX,
              targetY,
              80,
              8 * stats.damageMultiplier * context.power * 0.4,
              ELEMENT_COLORS.fire,
            );
            spawnRing(context.scene, shardX, targetY, 80, ELEMENT_COLORS.fire, 280);
            spawnBurst(context.scene, shardX, targetY, ELEMENT_COLORS.fire, 8, 140);
          });
        }
      }

      spawnBurst(context.scene, targetX, targetY, ELEMENT_COLORS.fire, 18, 220);
      spawnRing(context.scene, targetX, targetY, 150, ELEMENT_COLORS.fire, 320);
      spawnGlow(context.scene, targetX, targetY, ELEMENT_COLORS.fire, 3, 380);
      context.scene.cameras.main.flash(160, 255, 120, 90, false);
      context.scene.cameras.main.shake(180, 0.006);
    });

    return true;
  },
};

/** ID cũ `arcane_shield` được giữ để save cũ vẫn hợp lệ. */
const CHRONO_LOCK: SkillDefinition = {
  id: 'arcane_shield',
  name: 'KHOÁ THỜI GIAN',
  icon: 'CL',
  description: 'Khoá thời gian 280 px: đóng băng quái 2.2 giây, bản thân bất tử 1.2 giây.',
  unlockLevel: 5,
  cooldownMs: 18000,
  energyCost: 30,
  color: 0xc58cff,
  colorCss: '#c58cff',
  cast: (context) => {
    const radius = 280;
    const hits = damageInRadius(
      context,
      context.player.x,
      context.player.y,
      radius,
      2 * context.player.getStats().damageMultiplier * context.power,
      0xc58cff,
    );

    // Mốc cấp 3: bất tử thêm 0.3s. Cấp 5: choáng lâu hơn 0.5s.
    applyStun(hits, 2200 + (context.level >= 5 ? 500 : 0));
    context.player.grantInvulnerability(
      context.time,
      1200 + (context.level >= 3 ? 300 : 0),
    );
    spawnGlow(context.scene, context.player.x, context.player.y, 0xc58cff, 3, 700);
    spawnRing(context.scene, context.player.x, context.player.y, radius, 0xc58cff, 700);
    spawnRing(context.scene, context.player.x, context.player.y, radius * 0.65, 0x5fe0ff, 550);
    spawnBurst(context.scene, context.player.x, context.player.y, 0xc58cff, 18, 160);
    context.scene.cameras.main.flash(150, 170, 120, 255, false);

    return true;
  },
};

const VOID_RIFT: SkillDefinition = {
  id: 'void_rift',
  damageParts: pureDamage('dark'),
  name: 'KHE NỨT HƯ KHÔNG',
  icon: 'VR',
  description: '3 đợt diện rộng tại điểm ngắm, mỗi đợt làm chậm 65% trong 2.6 giây.',
  unlockLevel: 11,
  cooldownMs: 22000,
  energyCost: 45,
  color: 0xb35cff,
  colorCss: '#b35cff',
  cast: (context) => {
    const stats = context.player.getStats();
    const bounds = context.scene.physics.world.bounds;
    const targetX = Phaser.Math.Clamp(
      context.player.x + context.aim.x * 280,
      bounds.left + 140,
      bounds.right - 140,
    );
    const targetY = Phaser.Math.Clamp(
      context.player.y + context.aim.y * 280,
      bounds.top + 140,
      bounds.bottom - 140,
    );
    const damage = 3.5 * stats.damageMultiplier * context.power;

    spawnRing(context.scene, targetX, targetY, 170, 0xb35cff, 900);
    spawnGlow(context.scene, targetX, targetY, 0xb35cff, 1.8, 800);

    for (let tick = 0; tick < 3; tick += 1) {
      context.scene.time.delayedCall(500 + tick * 450, () => {
        const hits = damageInRadius(
          context,
          targetX,
          targetY,
          170,
          damage,
          0xb35cff,
        );

        applySlow(hits, 0.35, 2600);

        if (tick === 2) {
          applyStun(hits, 700);
        }

        spawnRing(context.scene, targetX, targetY, 170, 0xb35cff, 300);
        spawnBurst(context.scene, targetX, targetY, 0xb35cff, 12, 160);
      });
    }

    context.scene.cameras.main.shake(180, 0.005);

    // Mốc cấp 3: kết thúc bằng vụ nổ 200% sát thương.
    if (context.level >= 3) {
      context.scene.time.delayedCall(500 + 3 * 450, () => {
        damageInRadius(
          { ...context, enemies: context.getEnemies() },
          targetX,
          targetY,
          170,
          damage * 2,
          0xb35cff,
        );
        spawnRing(context.scene, targetX, targetY, 170, 0xffffff, 380);
        spawnBurst(context.scene, targetX, targetY, 0xb35cff, 20, 220);
      });
    }

    return true;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SÁT THỦ: tàn hình, tốc biến, cơ động, hút máu.
// ─────────────────────────────────────────────────────────────────────────────

const SHADOW_VOLLEY: SkillDefinition = {
  id: 'triple_volley',
  name: 'LOẠT BÓNG TỐI',
  icon: 'SV',
  description: 'Bắn 5 tia bóng tối xòe về phía ngắm.',
  unlockLevel: 1,
  cooldownMs: 5000,
  energyCost: 12,
  color: 0x7dff9a,
  colorCss: '#7dff9a',
  cast: (context) => {
    const stats = context.player.getStats();
    const damage =
      2 * stats.rangedDamageMultiplier * stats.damageMultiplier * context.power;
    const pierce = 1 + stats.bulletPierce;
    const speed = 900 * stats.bulletSpeedMultiplier;
    const baseAngle = context.aim.angle();

    for (let i = 0; i < 5; i += 1) {
      const angle = baseAngle + Phaser.Math.DegToRad((i - 2) * 6);
      // Mốc cấp 3: tên giữa xuyên thêm 1 mục tiêu.
      spawnArrow(
        context,
        angle,
        damage,
        pierce + (i === 2 && context.level >= 3 ? 1 : 0),
        speed,
      );
    }

    spawnHitSpark(
      context.scene,
      context.player.x + context.aim.x * 24,
      context.player.y + context.aim.y * 24,
      0x7dff9a,
    );

    return true;
  },
};

/** ID cũ `evasive_roll` được giữ để save cũ vẫn hợp lệ. */
const EVASIVE_ROLL: SkillDefinition = {
  id: 'evasive_roll',
  name: 'LƯỚT BÓNG',
  icon: 'ER',
  description: 'Lướt 170 px, bất tử 0.22 giây, xuyên quái, không phá tàng hình. Tích tối đa 2 lượt, mỗi lượt hồi 4.5 giây.',
  unlockLevel: 3,
  cooldownMs: SHADOW_DASH_GAP_MS,
  energyCost: 0,
  color: 0x5fe0ff,
  colorCss: '#5fe0ff',
  usesDashCharges: true,
  keepsStealth: true,
  cast: (context) => {
    if (!context.player.tryConsumeDashCharge(context.time)) {
      showFloatingText(context, 'HẾT LƯỢT', '#8b8fa3');
      return false;
    }

    const direction =
      context.moveDirection.lengthSq() > 0
        ? context.moveDirection.clone()
        : context.aim.clone();

    context.player.startSkillDash(
      direction,
      context.time,
      SHADOW_DASH_DURATION_MS,
      SHADOW_DASH_DISTANCE / (SHADOW_DASH_DURATION_MS / 1000),
      // Mốc cấp 3: bất tử +0.1s.
      SHADOW_DASH_INVULNERABLE_MS + (context.level >= 3 ? 100 : 0),
    );

    // Mốc cấp 5: để lại khói làm quái quanh điểm xuất phát chậm hẳn 1.5s.
    if (context.level >= 5) {
      const smoke = context.getEnemies().filter(
        (enemy) =>
          enemy.isAlive() &&
          Phaser.Math.Distance.Between(
            context.player.x,
            context.player.y,
            enemy.x,
            enemy.y,
          ) <= 150,
      );

      applySlow(smoke, 0.3, 1500);
      spawnRing(context.scene, context.player.x, context.player.y, 150, 0x8b8fa3, 500);
    }
    context.player.grantSpeedBoost(
      context.time,
      SHADOW_DASH_SPEED_BOOST_MS,
      SHADOW_DASH_SPEED_BOOST,
    );
    spawnBurst(
      context.scene,
      context.player.x,
      context.player.y,
      0x5fe0ff,
      8,
      100,
    );
    spawnGlow(context.scene, context.player.x, context.player.y, 0x5fe0ff, 1.2, 220);

    return true;
  },
};

/** ID cũ `poison_trap` được giữ để save cũ vẫn hợp lệ. */
const VANISH: SkillDefinition = {
  id: 'poison_trap',
  name: 'TÀNG HÌNH',
  icon: 'VN',
  description:
    'Bật/tắt: tàng hình không giới hạn thời gian, giảm 30% tốc chạy và tiêu 10 EN mỗi giây. Ra đòn hoặc dùng kỹ năng khác sẽ phá tàng hình. Cấp 3: tiêu EN giảm 25%.',
  unlockLevel: 5,
  cooldownMs: 3000,
  energyCost: 8,
  color: 0x9d5cff,
  colorCss: '#9d5cff',
  cast: (context) => {
    // Chỉ mở đầu trạng thái; WorldScene.updateVanish gia hạn mỗi frame và trừ EN theo giây.
    context.player.grantStealth(context.time, VANISH_REFRESH_MS);
    showFloatingText(context, 'TÀNG HÌNH', '#c58cff');
    spawnGlow(context.scene, context.player.x, context.player.y, 0x9d5cff, 2.2, 420);
    spawnRing(context.scene, context.player.x, context.player.y, 110, 0x9d5cff, 400);
    spawnBurst(context.scene, context.player.x, context.player.y, 0x9d5cff, 16, 120);

    return true;
  },
};

/** ID cũ `arrow_rain` được giữ để save cũ vẫn hợp lệ. */
const BLOOD_HUNT: SkillDefinition = {
  id: 'arrow_rain',
  name: 'SĂN MÁU',
  icon: 'BH',
  description: 'Tốc biến 220 px, bùng nổ sát thương tại điểm đến và hút 1 HP mỗi kẻ địch trúng đòn.',
  unlockLevel: 7,
  cooldownMs: 14000,
  energyCost: 22,
  color: 0xff5e6c,
  colorCss: '#ff5e6c',
  control: { kind: 'directional', shape: 'line', range: 220, size: 40 },
  cast: (context) => {
    const stats = context.player.getStats();
    const direction =
      context.aim.lengthSq() > 0
        ? context.aim.clone().normalize()
        : new Phaser.Math.Vector2(1, 0);
    const target = findSafeBlinkTarget(context, direction, 220);
    const damage =
      5 * stats.rangedDamageMultiplier * stats.damageMultiplier * context.power;

    spawnBurst(
      context.scene,
      context.player.x,
      context.player.y,
      0xff5e6c,
      12,
      120,
    );
    context.player.setPosition(target.x, target.y);
    context.player.cancelDash();
    context.player.grantInvulnerability(context.time, 300);

    const hits = damageInRadius(
      context,
      target.x,
      target.y,
      // Mốc cấp 3: bán kính +15.
      135 + (context.level >= 3 ? 15 : 0),
      damage,
      0xff5e6c,
    );

    // Mốc cấp 5: hút máu nhiều hơn.
    healFromHits(
      context,
      hits,
      context.level >= 5 ? 2 : 1,
      context.level >= 5 ? 6 : 3,
    );
    spawnRing(context.scene, target.x, target.y, 135, 0xff5e6c, 350);
    spawnGlow(context.scene, target.x, target.y, 0xff5e6c, 1.8, 320);
    spawnBurst(context.scene, target.x, target.y, 0xff5e6c, 14, 150);
    context.scene.cameras.main.shake(120, 0.004);

    return true;
  },
};

/**
 * ID cũ `hunters_mark` được giữ để save cũ vẫn hợp lệ.
 * Nhảy ra sau lưng mục tiêu, đâm hai đao (choáng + sát thương lớn) rồi dịch chuyển về chỗ cũ.
 * Bất tử và đứng yên suốt kỹ năng; mọi bước chạy bằng `delayedCall` nên tự dọn khi scene tắt.
 */
const MARK_OF_DEATH: SkillDefinition = {
  id: 'hunters_mark',
  name: 'NHÁT ĐAO ĐOẠT MỆNH',
  icon: 'MD',
  description:
    'Nhảy ra sau lưng mục tiêu, đâm hai thanh đao gây sát thương lớn và choáng 0.5 giây, rồi dịch chuyển về vị trí cũ. Bất tử trong lúc thực hiện.',
  unlockLevel: 9,
  cooldownMs: 12000,
  energyCost: 14,
  color: 0xffe066,
  colorCss: '#ffe066',
  control: { kind: 'target', range: DEATH_STAB_RANGE, select: 'nearest' },
  cast: (context) => {
    const { player, scene } = context;
    const target =
      context.target && context.target.isAlive()
        ? context.target
        : nearestAliveEnemy(
            context.getEnemies(),
            player.x,
            player.y,
            DEATH_STAB_RANGE,
          );

    if (!target) {
      return false;
    }

    const origin = { x: player.x, y: player.y };
    const direction = new Phaser.Math.Vector2(
      target.x - player.x,
      target.y - player.y,
    );

    if (direction.lengthSq() === 0) {
      direction.set(1, 0);
    }

    direction.normalize();

    // Phía sau lưng = phía đối diện với người chơi so với mục tiêu.
    const behind = findSafePosition(
      context,
      target.x + direction.x * DEATH_STAB_BEHIND_PX,
      target.y + direction.y * DEATH_STAB_BEHIND_PX,
    );
    const stabAngle = Math.atan2(target.y - behind.y, target.x - behind.x);
    const half = getMeleeSkillDamage(context, DEATH_STAB_DAMAGE) / 2;
    const vfx = VFXManager.for(scene);
    let finished = false;
    let rewarded = false;

    player.grantInvulnerability(
      context.time,
      DEATH_STAB_RETURN_MS + 150,
    );
    player.cancelDash();
    player.setImmobilized(true);

    // Nhảy ra sau lưng.
    spawnAfterimage(
      scene,
      origin.x,
      origin.y,
      player.texture.key,
      0xffe066,
      String(player.frame.name),
    );
    spawnBurst(scene, origin.x, origin.y, 0xffe066, 10, 120);
    player.setPosition(behind.x, behind.y);
    player.setFacingOverride(Math.cos(stabAngle), Math.sin(stabAngle));
    player.playAttack(
      scene.time.now,
      new Phaser.Math.Vector2(Math.cos(stabAngle), Math.sin(stabAngle)),
    );

    const stab = (bladeIndex: number): void => {
      if (finished || player.isDead()) {
        return;
      }

      // Hai đao đâm chéo nhau: lệch ±28° so với hướng đâm.
      const offset = (bladeIndex === 0 ? -1 : 1) * Phaser.Math.DegToRad(28);

      if (target.isAlive()) {
        target.takeDamage(half, behind.x, behind.y, skillHitInfo(context));

        // Hạ gục bằng chiêu này: giảm hồi chiêu. Hoãn 1 tick vì WorldScene đặt hồi chiêu SAU khi cast trả về.
        if (!target.isAlive() && !rewarded) {
          rewarded = true;
          scene.time.delayedCall(0, () => {
            scene.events.emit('skill-cooldown-reduce', 'hunters_mark', DEATH_STAB_KILL_COOLDOWN_REDUCTION);
            showFloatingText(context, `HỒI CHIÊU -${Math.round(DEATH_STAB_KILL_COOLDOWN_REDUCTION * 100)}%`, '#ffe066');
          });
        }

        if (bladeIndex === 0) {
          target.applyStun(DEATH_STAB_STUN_MS);
        }

        vfx.play('impact.hit', { x: target.x, y: target.y, tint: 0xffe066 });
      }

      vfx.play('slash.arc', {
        x: target.x,
        y: target.y,
        angle: stabAngle + offset,
        scale: 0.9,
        tint: 0xfff2a8,
      });
      vfx.play('burst.sparks', {
        x: target.x,
        y: target.y,
        tint: 0xffe066,
        count: 8,
        speed: 130,
      });
      scene.cameras.main.shake(80, 0.004);
    };

    const returnBack = (): void => {
      if (finished) {
        return;
      }

      finished = true;
      player.setImmobilized(false);
      player.clearFacingOverride();

      if (player.isDead()) {
        return;
      }

      const spot = findSafePosition(context, origin.x, origin.y);

      spawnAfterimage(
        scene,
        player.x,
        player.y,
        player.texture.key,
        0xffe066,
        String(player.frame.name),
      );
      player.setPosition(spot.x, spot.y);
      spawnBurst(scene, spot.x, spot.y, 0xffe066, 10, 120);
      spawnGlow(scene, spot.x, spot.y, 0xffe066, 1.2, 220);
    };

    stab(0);
    scene.time.delayedCall(DEATH_STAB_SECOND_HIT_MS, () => stab(1));
    scene.time.delayedCall(DEATH_STAB_RETURN_MS, returnBack);

    return true;
  },
};

/**
 * ID cũ `storm_barrage` được giữ để save cũ vẫn hợp lệ.
 * Lướt nhanh quanh mục tiêu `SHADOW_DANCE_DASHES` lần; mỗi lần cắt qua mục tiêu là một nhát chém lớn.
 * Bất tử suốt lúc lướt. Chạy theo chuỗi `delayedCall` (tự dọn khi scene tắt) và luôn trả người chơi về trạng thái bình thường.
 */
const SHADOW_DANCE: SkillDefinition = {
  id: 'storm_barrage',
  name: 'VŨ ĐIỆU BÓNG TỐI',
  icon: 'SD',
  description:
    'Lướt cực nhanh quanh mục tiêu 10 lần, mỗi lần cắt qua là một nhát chém sát thương lớn; bất tử khi lướt, kết thúc tàng hình 1.5 giây.',
  unlockLevel: 11,
  cooldownMs: 22000,
  energyCost: 32,
  color: 0x8a5cff,
  colorCss: '#8a5cff',
  control: { kind: 'target', range: SHADOW_DANCE_RANGE, select: 'nearest' },
  cast: (context) => {
    const { player, scene } = context;
    const stats = player.getStats();
    const damage =
      SHADOW_DANCE_DAMAGE *
      stats.rangedDamageMultiplier *
      stats.damageMultiplier *
      context.power;
    const initial =
      context.target && context.target.isAlive()
        ? context.target
        : nearestAliveEnemy(
            context.getEnemies(),
            player.x,
            player.y,
            SHADOW_DANCE_RANGE,
          );

    if (!initial) {
      return false;
    }

    const totalMs = SHADOW_DANCE_DASHES * SHADOW_DANCE_DASH_MS;
    let target: EnemyBase = initial;
    // Hình ngôi sao: các đỉnh nằm đều trên vòng tròn quanh mục tiêu; lượt lướt thứ k đi tới đỉnh (k × SKIP) mod POINTS
    // nên đường lướt nối đỉnh cách nhau SKIP bước — 5 đỉnh, bước 2 = sao năm cánh, cắt qua gần tâm.
    let starBase = Math.atan2(player.y - target.y, player.x - target.x);
    let starStep = 0;
    let finished = false;

    player.grantInvulnerability(
      context.time,
      totalMs + SHADOW_DANCE_INVULN_PAD_MS,
    );
    player.setImmobilized(true);
    player.cancelDash();
    spawnGlow(scene, player.x, player.y, 0x8a5cff, 1.4, 260);

    const finish = (): void => {
      if (finished) {
        return;
      }

      finished = true;
      player.setImmobilized(false);
      player.clearFacingOverride();

      if (!player.isDead()) {
        player.grantStealth(scene.time.now, SHADOW_DANCE_STEALTH_MS);
        spawnGlow(scene, player.x, player.y, 0x8a5cff, 1.8, 320);
      }
    };

    const dash = (index: number): void => {
      if (finished) {
        return;
      }

      if (player.isDead() || index >= SHADOW_DANCE_DASHES) {
        finish();
        return;
      }

      // Mục tiêu chết giữa chừng: chuyển sang quái gần nhất quanh nó; hết quái thì kết thúc sớm.
      if (!target.isAlive()) {
        const next = nearestAliveEnemy(
          context.getEnemies(),
          target.x,
          target.y,
          SHADOW_DANCE_RETARGET_RADIUS,
        );

        if (!next) {
          finish();
          return;
        }

        target = next;
        starBase = Math.atan2(player.y - target.y, player.x - target.x);
        starStep = 0;
      }

      const from = { x: player.x, y: player.y };
      const vertex =
        (starStep * SHADOW_DANCE_STAR_SKIP) % SHADOW_DANCE_STAR_POINTS;
      const vertexAngle =
        starBase + (vertex * Math.PI * 2) / SHADOW_DANCE_STAR_POINTS;

      starStep += 1;
      const to = findSafePosition(
        context,
        target.x + Math.cos(vertexAngle) * SHADOW_DANCE_ORBIT_RADIUS,
        target.y + Math.sin(vertexAngle) * SHADOW_DANCE_ORBIT_RADIUS,
      );
      const slashAngle = Math.atan2(to.y - from.y, to.x - from.x);
      const slashX = target.x;
      const slashY = target.y;
      let slashed = false;

      player.setFacingOverride(Math.cos(slashAngle), Math.sin(slashAngle));
      spawnAfterimage(
        scene,
        from.x,
        from.y,
        player.texture.key,
        0x8a5cff,
        String(player.frame.name),
      );

      // Một tween duy nhất lo cả chuyển động lẫn nhát chém ở giữa quãng lướt.
      scene.tweens.addCounter({
        from: 0,
        to: 1,
        duration: SHADOW_DANCE_DASH_MS,
        onUpdate: (tween) => {
          if (finished || player.isDead()) {
            return;
          }

          const t = tween.getValue() ?? 1;

          player.setPosition(
            Phaser.Math.Linear(from.x, to.x, t),
            Phaser.Math.Linear(from.y, to.y, t),
          );

          if (!slashed && t >= 0.5) {
            slashed = true;
            shadowDanceSlash(
              context,
              slashX,
              slashY,
              slashAngle,
              damage,
            );

            // Hút máu nhẹ ở lượt giữa và lượt cuối.
            if (index === 4 || index === SHADOW_DANCE_DASHES - 1) {
              player.heal(1);
            }
          }
        },
        onComplete: () => {
          if (!finished && !player.isDead()) {
            player.setPosition(to.x, to.y);
          }

          dash(index + 1);
        },
      });
    };

    scene.cameras.main.shake(120, 0.004);
    dash(0);

    return true;
  },
};

/** Quái còn sống gần (x, y) nhất trong bán kính `radius`; null nếu không có. */
function nearestAliveEnemy(
  enemies: readonly EnemyBase[],
  x: number,
  y: number,
  radius: number,
): EnemyBase | null {
  let best: EnemyBase | null = null;
  let bestDistance = radius;

  for (const enemy of enemies) {
    if (!enemy.isAlive()) {
      continue;
    }

    const distance = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);

    if (distance <= bestDistance) {
      best = enemy;
      bestDistance = distance;
    }
  }

  return best;
}

/** Một nhát chém của Vũ Điệu Bóng Tối: sát thương vùng nhỏ quanh mục tiêu + hiệu ứng vệt chém. */
function shadowDanceSlash(
  context: SkillContext,
  x: number,
  y: number,
  angle: number,
  damage: number,
): void {
  const vfx = VFXManager.for(context.scene);
  let hits = 0;

  for (const enemy of context.getEnemies()) {
    if (!enemy.isAlive()) {
      continue;
    }

    if (
      Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y) >
      SHADOW_DANCE_SLASH_RADIUS
    ) {
      continue;
    }

    enemy.takeDamage(damage, x, y, skillHitInfo(context));
    vfx.play('impact.hit', { x: enemy.x, y: enemy.y, tint: 0xc9a8ff });
    hits += 1;
  }

  vfx.play('slash.arc', { x, y, angle, scale: 1.1, tint: 0xb48cff });
  vfx.play('burst.sparks', {
    x,
    y,
    tint: 0x8a5cff,
    count: hits > 0 ? 8 : 4,
    speed: 130,
  });
}

export const SKILLS: Record<SkillId, SkillDefinition> = {
  shield_bash: SHIELD_BASH,
  dual_guard: DUAL_GUARD,
  fortress_stand: FORTRESS_STAND,
  whirlwind: BULWARK,
  ground_slam: GROUND_SLAM,
  iron_will: IRON_WILL,
  war_cry: WAR_CRY,
  blade_storm: BERSERK,
  self_destruct: SELF_DESTRUCT,
  triple_volley: SHADOW_VOLLEY,
  evasive_roll: EVASIVE_ROLL,
  poison_trap: VANISH,
  arrow_rain: BLOOD_HUNT,
  hunters_mark: MARK_OF_DEATH,
  storm_barrage: SHADOW_DANCE,
  arcane_nova: ARCANE_NOVA,
  blink: BLINK,
  frost_nova: FROST_NOVA,
  meteor: METEOR,
  arcane_shield: CHRONO_LOCK,
  void_rift: VOID_RIFT,
  nec_bone_spike: NEC_BONE_SPIKE,
  nec_raise_skeleton: NEC_RAISE_SKELETON,
  nec_wither: NEC_WITHER,
  nec_corpse_burst: NEC_CORPSE_BURST,
  nec_bone_mage: NEC_BONE_MAGE,
  nec_bone_cage: NEC_BONE_CAGE,
  living_fortress: TREE_LIVING_FORTRESS,
  cyclone: TREE_CYCLONE,
  sword_tempest: TREE_SWORD_TEMPEST,
  grapple_chain: TREE_GRAPPLE_CHAIN,
  titan_roar: TREE_TITAN_ROAR,
  flame_burst: TREE_FLAME_BURST,
  fire_wall: TREE_FIRE_WALL,
  ice_lance: TREE_ICE_LANCE,
  arcane_chain: TREE_ARCANE_CHAIN,
  absolute_zero: TREE_ABSOLUTE_ZERO,
  shadow_step: TREE_SHADOW_STEP,
  venom_trap: TREE_VENOM_TRAP,
  plague_flask: TREE_PLAGUE_FLASK,
  deadly_bloom: TREE_DEADLY_BLOOM,
  arrow_storm: TREE_ARROW_STORM,
};

export function getSkill(id: SkillId): SkillDefinition {
  return SKILLS[id];
}
