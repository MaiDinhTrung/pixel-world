/**
 * Kiểu dữ liệu cho Skill Tree (thiết kế đã duyệt).
 * Không phụ thuộc Phaser: chỉ là dữ liệu + luật, dễ kiểm thử.
 */

/** Necromancer có 2 nhánh: Xương Cốt (triệu hồi) và Tử Khí (sát thương/khống chế từ xác). */
export type TreeClassId = 'knight' | 'ranger' | 'mage' | 'necromancer';

export type BranchId =
  | 'bulwark'
  | 'fury'
  | 'command'
  | 'pyre'
  | 'frost'
  | 'arcane'
  | 'shadow'
  | 'venom'
  | 'marksman'
  | 'bonecraft'
  | 'deathcraft';

export type SkillNodeId =
  // Triệu Hồn Sư · Xương Cốt
  | 'nec_raise_skeleton'
  | 'nec_bone_mage'
  // Triệu Hồn Sư · Tử Khí
  | 'nec_bone_spike'
  | 'nec_wither'
  | 'nec_corpse_burst'
  | 'nec_bone_cage'
  // Đấu sĩ · Thành Lũy
  | 'shield_bash'
  | 'iron_will'
  | 'bastion_stance'
  | 'shatter_ward'
  | 'living_fortress'
  // Đấu sĩ · Cuồng Huyết
  | 'whirlwind'
  | 'blood_rage'
  | 'ground_slam'
  | 'momentum'
  | 'blade_storm'
  // Đấu sĩ · Hiệu Lệnh
  | 'war_cry'
  | 'steel_body'
  | 'colossus_form'
  | 'war_discipline'
  | 'grapple_chain'
  | 'dread_presence'
  | 'titan_roar'
  // Pháp sư · Liệt Hỏa
  | 'flame_burst'
  | 'kindling'
  | 'fire_wall'
  | 'overheat'
  | 'meteor'
  // Pháp sư · Hàn Băng
  | 'frost_nova'
  | 'permafrost'
  | 'ice_lance'
  | 'time_lock'
  | 'cold_focus'
  | 'absolute_zero'
  // Pháp sư · Hư Không
  | 'arcane_nova'
  | 'arcane_shield'
  | 'blink'
  | 'arcane_chain'
  | 'spell_echo'
  | 'void_rift'
  // Sát thủ · Bóng Đêm
  | 'evasive_roll'
  | 'ambush'
  | 'shadow_step'
  | 'vanish'
  | 'blood_hunt'
  | 'phantom_reflex'
  | 'shadow_dance'
  // Sát thủ · Độc Thuật
  | 'poison_trap'
  | 'toxin_mastery'
  | 'plague_flask'
  | 'enfeebling_venom'
  | 'deadly_bloom'
  // Sát thủ · Xạ Thuật
  | 'triple_volley'
  | 'eagle_eye'
  | 'hunters_mark'
  | 'quick_draw'
  | 'storm_barrage';

export type SkillKind = 'active' | 'passive';

/** 1 = cơ bản, 2 = nâng cao, 3 = tối thượng. */
export type SkillTier = 1 | 2 | 3;

export type DamageType = 'physical' | 'fire' | 'frost' | 'arcane' | 'poison';

export type StatusId =
  | 'stun'
  | 'slow'
  | 'chill'
  | 'freeze'
  | 'burn'
  | 'poison'
  | 'fear'
  | 'mark';

/** Giá trị co giãn theo cấp: base + perLevel × (cấp − 1), hoặc bảng ghi đè tay. */
export interface Scaling {
  readonly base: number;
  readonly perLevel: number;
  readonly table?: readonly number[];
}

export type AreaShape =
  | { readonly kind: 'circle'; readonly radius: Scaling }
  | { readonly kind: 'cone'; readonly radius: Scaling; readonly arcDeg: number }
  | { readonly kind: 'line'; readonly length: Scaling; readonly width: number }
  | {
      readonly kind: 'projectile';
      readonly speed: number;
      readonly count?: Scaling;
      readonly pierce?: Scaling;
    };

export type SkillEffect =
  | {
      readonly type: 'damage';
      readonly shape: AreaShape;
      /** % của đơn vị sát thương D. */
      readonly pct: Scaling;
      readonly damageType: DamageType;
      readonly canCrit: boolean;
    }
  | {
      readonly type: 'status';
      readonly status: StatusId;
      readonly durationMs: Scaling;
      readonly stacks?: Scaling;
      /** Hệ số thời gian áp lên boss (kháng khống chế). */
      readonly bossDurationMult?: number;
    }
  | {
      readonly type: 'move';
      readonly mode: 'dash' | 'teleport' | 'pull' | 'push';
      readonly distance: Scaling;
    }
  | {
      readonly type: 'summon';
      readonly kind: 'trap' | 'zone' | 'wall' | 'afterimage' | 'banner';
      readonly durationMs: Scaling;
      readonly maxCount?: Scaling;
    }
  | {
      readonly type: 'buff';
      readonly durationMs: Scaling;
      readonly modifiers: readonly StatModifier[];
    }
  | {
      readonly type: 'execute';
      readonly thresholdPct: Scaling;
      readonly bossImmune: boolean;
    }
  /** Cơ chế quá đặc thù: xử lý bằng handler riêng theo id. */
  | { readonly type: 'custom'; readonly handlerId: string };

export type ModifierStat =
  | 'maxArmor'
  | 'armorRegenSpeed'
  | 'damage'
  | 'damagePerMissingHealth'
  | 'attackSpeed'
  | 'attackSpeedPerStack'
  | 'critChance'
  | 'critDamage'
  | 'critChanceFar'
  | 'critDamageFar'
  | 'damageFromBehind'
  | 'critChanceFromBehind'
  | 'dodgeChance'
  | 'damageTaken'
  | 'energyAbsorb'
  | 'energyRegenPerChilled'
  | 'energyOnHit'
  | 'energyOnKill'
  | 'burnDamage'
  | 'poisonDamage'
  | 'poisonApplyChance'
  | 'chillDurationMs'
  | 'damageVsChilled'
  | 'enemyDamageDealt'
  | 'enemyDamageDealtPerStack'
  | 'attackSpeedAfterRoll'
  | 'castEchoChance';

export interface StatModifier {
  readonly stat: ModifierStat;
  readonly value: Scaling;
  /** Trần cứng của tổng bonus (cùng đơn vị với value). */
  readonly cap?: number;
  readonly condition?: string;
}

export interface Trigger {
  readonly on: 'hit' | 'kill' | 'armorBroken' | 'dodge' | 'cast' | 'roll';
  readonly icdMs?: Scaling;
  readonly chance?: Scaling;
}

export interface Prerequisite {
  readonly skillId: SkillNodeId;
  readonly level: number;
}

export type SynergyParam =
  | 'damagePct'
  | 'radius'
  | 'durationMs'
  | 'cooldownMs';

/** Mỗi cấp của skill nguồn cộng `perLevel` điểm % vào tham số của skill này. */
export interface Synergy {
  readonly source: SkillNodeId;
  readonly param: SynergyParam;
  readonly perLevel: number;
  readonly cap: number;
}

export interface SkillMilestone {
  readonly level: 3 | 5;
  readonly description: string;
}

export interface SkillUnlock {
  readonly minCharLevel: number;
  /** Số điểm đã đầu tư trong cùng nhánh. */
  readonly branchPoints: number;
  readonly requires: readonly Prerequisite[];
}

export interface SkillNodeDefinition {
  readonly id: SkillNodeId;
  readonly name: string;
  readonly classId: TreeClassId;
  readonly branchId: BranchId;
  readonly kind: SkillKind;
  readonly tier: SkillTier;
  readonly maxLevel: number;
  readonly description: string;
  readonly unlock: SkillUnlock;
  readonly energyCost?: Scaling;
  readonly cooldownMs?: Scaling;
  readonly range?: Scaling;
  /** Hiệu ứng chủ động, hoặc hiệu ứng kích hoạt của passive (đi cùng trigger). */
  readonly effects?: readonly SkillEffect[];
  readonly modifiers?: readonly StatModifier[];
  readonly trigger?: Trigger;
  /** Tham số phụ (trần cộng dồn, bán kính aura...). */
  readonly params?: Readonly<Record<string, Scaling>>;
  readonly milestones: readonly SkillMilestone[];
  readonly synergies: readonly Synergy[];
  readonly ui: {
    readonly icon: string;
    readonly treePos: { readonly col: number; readonly row: number };
  };
  /** Gợi ý animation / hiệu ứng pixel art. */
  readonly fx: string;
}

export interface BranchDefinition {
  readonly id: BranchId;
  readonly classId: TreeClassId;
  readonly name: string;
  readonly role: string;
  readonly index: 0 | 1 | 2;
}

/** Trạng thái cây kỹ năng của một nhân vật (phần lưu trong save). */
export type SkillLevels = Partial<Record<SkillNodeId, number>>;
