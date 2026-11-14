import { getClassSkillNodes } from './skillTreeData';
import { evalScaling } from './skillTreeRules';
import type {
  ModifierStat,
  SkillLevels,
  SkillNodeDefinition,
  TreeClassId,
} from './skillTreeTypes';

/**
 * Tổng hợp hiệu ứng của các node BỊ ĐỘNG đã học, đọc thẳng từ `modifiers`
 * trong dữ liệu cây. Chỉ những `ModifierStat` có hook trong game mới được tính;
 * phần còn lại bị bỏ qua (xem `PASSIVE_IMPLEMENTED_STATS`).
 * Không phụ thuộc Phaser nên kiểm thử được.
 */
export const PASSIVE_IMPLEMENTED_STATS: readonly ModifierStat[] = [
  'maxArmor',
  'energyOnKill',
  'dodgeChance',
  'damagePerMissingHealth',
  'armorRegenSpeed',
  'energyOnHit',
  'attackSpeedPerStack',
  'damageFromBehind',
  'critChanceFromBehind',
  'critChanceFar',
  'critDamageFar',
  'attackSpeedAfterRoll',
  'energyAbsorb',
  'enemyDamageDealt',
  'enemyDamageDealtPerStack',
  'burnDamage',
  'poisonDamage',
  'poisonApplyChance',
  'chillDurationMs',
  'damageVsChilled',
  'energyRegenPerChilled',
  'castEchoChance',
  'damage',
];

/** Node bị động không có `modifiers` nhưng có hiệu ứng riêng đã nối (theo id). */
const PASSIVE_IMPLEMENTED_NODE_IDS: readonly string[] = ['shatter_ward'];

export interface PassiveBundle {
  /** Giáp tối đa cộng thêm. */
  maxArmor: number;
  /** Năng lượng hồi mỗi lần hạ gục. */
  energyOnKill: number;
  /** Xác suất né hoàn toàn một đòn (0–1). */
  dodgeChance: number;
  /** Sát thương cộng thêm cho mỗi điểm máu đã mất (0.025 = +2.5%/máu). */
  damagePerMissingHealth: number;
  /** Trần tổng sát thương cộng thêm từ máu đã mất (0.3 = +30%). */
  damagePerMissingHealthCap: number;
  /** Tăng tốc hồi giáp (0.16 = hồi nhanh hơn 16%). */
  armorRegenSpeed: number;
  /** Năng lượng hồi mỗi đòn trúng (qua hook `damaged`). */
  energyOnHit: number;
  /** Đà Chém: tốc đánh mỗi cộng dồn (0.04 = +4%), 0 = không có. */
  momentumPerStack: number;
  momentumMaxStacks: number;
  momentumDurationMs: number;
  /** Đánh Lén: sát thương cộng thêm / xác suất chí mạng khi đánh từ phía sau. */
  behindDamage: number;
  behindCritChance: number;
  /** Nhãn Quang: chí mạng khi mục tiêu ở xa hơn `farMinDistance`. */
  farCritChance: number;
  farCritDamage: number;
  farMinDistance: number;
  /** Rút Nhanh: tăng tốc bắn sau khi lăn (0.14 = +14%), trong `quickDrawWindowMs`. */
  quickDrawBonus: number;
  quickDrawWindowMs: number;
  /** Mốc cấp 5 của Rút Nhanh: áp dụng cả sau Ảnh Bộ. */
  quickDrawOnTeleport: boolean;
  /** Khiên Phép: tỉ lệ sát thương đổi sang EN (0.2 = 20%) và EN mỗi 1 sát thương. */
  energyAbsorb: number;
  energyPerDamage: number;
  /** Uy Nghiêm: aura quanh người chơi giảm sát thương địch gây ra (0.04 = -4%). */
  auraDamageReduction: number;
  auraRadius: number;
  auraFearChance: number;
  auraFearIcdMs: number;
  /** Độc Suy Nhược: giảm sát thương địch gây ra mỗi tầng Độc, trần `enfeebleCap`. */
  enfeeblePerStack: number;
  enfeebleCap: number;
  /** Mồi Lửa / Độc Tố / Băng Vĩnh Cửu: hệ số cộng thêm lên trạng thái. */
  burnDamage: number;
  poisonDamage: number;
  poisonApplyChance: number;
  poisonMaxStacks: number;
  chillExtraMs: number;
  damageVsChilled: number;
  /** Mồi Lửa: lan Thiêu khi địch chết (0 = chưa mở), số bước lan và bán kính. */
  burnSpreadHops: number;
  burnSpreadRadius: number;
  /** Tâm Băng: EN/s mỗi địch bị Lạnh gần đó (tối đa `chilledMaxCounted`). */
  energyRegenPerChilled: number;
  chilledMaxCounted: number;
  chilledRadius: number;
  /** Dư Chấn: xác suất vang lại skill, độ trễ, tỉ lệ sát thương, hồi chiêu nội bộ. */
  echoChance: number;
  echoDelayMs: number;
  echoDamageFraction: number;
  echoIcdMs: number;
  /** Quá Nhiệt: có mở không, Nhiệt tối đa, thời gian tan, phạt hồi EN, sát thương cộng thêm. */
  overheatMaxHeat: number;
  overheatDecayMs: number;
  overheatRegenPenalty: number;
  overheatDamageBonus: number;
  /** Giáp Vỡ Phản Chấn: cấp node (0 = chưa học) và hồi chiêu nội bộ. */
  shatterWardLevel: number;
  shatterWardIcdMs: number;
  /** Mốc cấp 5: Huyết Hận (Lốc Xoáy miễn EN), Đà Chém (sóng chém), Quân Luật (Tiếng Hô -2s). */
  bloodRageLevel: number;
  momentumLevel: number;
  warDisciplineLevel: number;
  /** Phản Xạ Ma: hồi chiêu hoàn lại mỗi lần né. */
  dodgeRefundMs: number;
  /** Nhãn Quang cấp 5: tầm bắn +10% (nhân tốc đạn). */
  rangeMult: number;
}

export function createEmptyPassiveBundle(): PassiveBundle {
  return {
    maxArmor: 0,
    energyOnKill: 0,
    dodgeChance: 0,
    damagePerMissingHealth: 0,
    damagePerMissingHealthCap: 0,
    armorRegenSpeed: 0,
    energyOnHit: 0,
    momentumPerStack: 0,
    momentumMaxStacks: 0,
    momentumDurationMs: 0,
    behindDamage: 0,
    behindCritChance: 0,
    farCritChance: 0,
    farCritDamage: 0,
    farMinDistance: 300,
    quickDrawBonus: 0,
    quickDrawWindowMs: 0,
    quickDrawOnTeleport: false,
    energyAbsorb: 0,
    energyPerDamage: 4,
    auraDamageReduction: 0,
    auraRadius: 0,
    auraFearChance: 0,
    auraFearIcdMs: 10000,
    enfeeblePerStack: 0,
    enfeebleCap: 0,
    burnDamage: 0,
    poisonDamage: 0,
    poisonApplyChance: 0,
    poisonMaxStacks: 0,
    chillExtraMs: 0,
    damageVsChilled: 0,
    burnSpreadHops: 0,
    burnSpreadRadius: 90,
    energyRegenPerChilled: 0,
    chilledMaxCounted: 5,
    chilledRadius: 300,
    echoChance: 0,
    echoDelayMs: 600,
    echoDamageFraction: 0.5,
    echoIcdMs: 3000,
    overheatMaxHeat: 0,
    overheatDecayMs: 6000,
    overheatRegenPenalty: 0,
    overheatDamageBonus: 0,
    shatterWardLevel: 0,
    shatterWardIcdMs: 8000,
    bloodRageLevel: 0,
    momentumLevel: 0,
    warDisciplineLevel: 0,
    dodgeRefundMs: 0,
    rangeMult: 1,
  };
}

/** Node bị động có ít nhất một hiệu ứng đã được nối vào game. */
export function hasPassiveEffect(node: SkillNodeDefinition): boolean {
  return (
    node.kind === 'passive' &&
    (PASSIVE_IMPLEMENTED_NODE_IDS.includes(node.id) ||
      (node.modifiers ?? []).some((modifier) =>
        PASSIVE_IMPLEMENTED_STATS.includes(modifier.stat),
      ))
  );
}

export function computePassiveBundle(
  classId: TreeClassId,
  levels: SkillLevels,
): PassiveBundle {
  const bundle = createEmptyPassiveBundle();

  for (const node of getClassSkillNodes(classId)) {
    const level = levels[node.id] ?? 0;

    if (node.kind !== 'passive' || level <= 0) {
      continue;
    }

    if (node.id === 'shatter_ward') {
      bundle.shatterWardLevel = level;
      bundle.shatterWardIcdMs = node.trigger?.icdMs
        ? evalScaling(node.trigger.icdMs, level)
        : bundle.shatterWardIcdMs;
    }

    const param = (key: string, fallback: number): number =>
      node.params?.[key] ? evalScaling(node.params[key], level) : fallback;

    switch (node.id) {
      case 'blood_rage':
        bundle.bloodRageLevel = level;
        break;
      case 'momentum':
        bundle.momentumLevel = level;
        break;
      case 'war_discipline':
        bundle.warDisciplineLevel = level;
        break;
      case 'eagle_eye':
        bundle.rangeMult = level >= 5 ? 1.1 : 1;
        break;
      case 'phantom_reflex':
        bundle.dodgeRefundMs = param('cooldownRefundMs', 1000);
        break;
      default:
        break;
    }

    for (const modifier of node.modifiers ?? []) {
      const value = evalScaling(modifier.value, level);

      switch (modifier.stat) {
        case 'maxArmor':
          bundle.maxArmor += value;
          break;
        case 'energyOnKill':
          bundle.energyOnKill += value;
          break;
        case 'dodgeChance':
          bundle.dodgeChance += Math.min(value, modifier.cap ?? 1);
          break;
        case 'damagePerMissingHealth':
          bundle.damagePerMissingHealth += value;
          bundle.damagePerMissingHealthCap += modifier.cap ?? 0.3;
          break;
        case 'attackSpeedPerStack': {
          const maxStacks = node.params?.maxStacks
            ? evalScaling(node.params.maxStacks, level)
            : 5;
          const durationMs = node.params?.durationMs
            ? evalScaling(node.params.durationMs, level)
            : 3000;

          bundle.momentumPerStack += value;
          // Mốc cấp 3: trần cộng dồn tăng lên 7.
          bundle.momentumMaxStacks = Math.max(
            bundle.momentumMaxStacks,
            maxStacks + (level >= 3 ? 2 : 0),
          );
          bundle.momentumDurationMs = Math.max(bundle.momentumDurationMs, durationMs);
          break;
        }
        case 'damageFromBehind':
          bundle.behindDamage += value;
          break;
        case 'critChanceFromBehind':
          bundle.behindCritChance += value;
          break;
        case 'critChanceFar':
          bundle.farCritChance += value;
          bundle.farMinDistance = node.params?.minDistance
            ? evalScaling(node.params.minDistance, level)
            : bundle.farMinDistance;
          break;
        case 'critDamageFar':
          bundle.farCritDamage += value;
          break;
        case 'attackSpeedAfterRoll':
          bundle.quickDrawBonus += value;
          bundle.quickDrawWindowMs = Math.max(
            bundle.quickDrawWindowMs,
            node.params?.windowMs ? evalScaling(node.params.windowMs, level) : 2000,
          );
          bundle.quickDrawOnTeleport ||= level >= 5;
          break;
        case 'energyAbsorb':
          bundle.energyAbsorb += Math.min(value, modifier.cap ?? 0.4);
          bundle.energyPerDamage = param('energyPerDamage', 4);
          break;
        case 'enemyDamageDealt':
          bundle.auraDamageReduction += -value;
          bundle.auraRadius = Math.max(bundle.auraRadius, param('auraRadius', 120));
          bundle.auraFearChance += param('fearChance', 0);
          bundle.auraFearIcdMs = param('fearIcdMs', bundle.auraFearIcdMs);
          break;
        case 'enemyDamageDealtPerStack':
          bundle.enfeeblePerStack += -value;
          bundle.enfeebleCap += -(modifier.cap ?? -0.25);
          break;
        case 'burnDamage':
          bundle.burnDamage += value;
          // Lan Thiêu mở ở cấp 3; cấp 5 lan thêm 1 bước.
          bundle.burnSpreadHops = level >= 5 ? 2 : level >= 3 ? 1 : 0;
          bundle.burnSpreadRadius = param('spreadRadius', bundle.burnSpreadRadius);
          break;
        case 'poisonDamage':
          bundle.poisonDamage += value;
          bundle.poisonMaxStacks = Math.max(
            bundle.poisonMaxStacks,
            param('maxStacks', 3) + (level >= 3 ? 1 : 0) + (level >= 5 ? 1 : 0),
          );
          break;
        case 'poisonApplyChance':
          bundle.poisonApplyChance += value;
          break;
        case 'chillDurationMs':
          bundle.chillExtraMs += value;
          break;
        case 'damageVsChilled':
          bundle.damageVsChilled += value;
          break;
        case 'energyRegenPerChilled':
          bundle.energyRegenPerChilled += value;
          bundle.chilledMaxCounted = param('maxCounted', bundle.chilledMaxCounted);
          bundle.chilledRadius = param('radius', bundle.chilledRadius);
          break;
        case 'castEchoChance':
          bundle.echoChance += value;
          bundle.echoDelayMs = param('delayMs', bundle.echoDelayMs);
          bundle.echoDamageFraction =
            level >= 5 ? 0.7 : param('damageFraction', bundle.echoDamageFraction);
          bundle.echoIcdMs = param('icdMs', bundle.echoIcdMs);
          break;
        case 'damage':
          // Chỉ Quá Nhiệt dùng điều kiện "heat5": thưởng sát thương khi Nhiệt đầy.
          if (modifier.condition === 'heat5') {
            bundle.overheatDamageBonus += value;
            bundle.overheatMaxHeat = param('maxHeat', 5);
            bundle.overheatDecayMs = param('decayMs', 6000);
            bundle.overheatRegenPenalty = param('energyRegenPenalty', 0.3);
          }
          break;
        case 'energyOnHit':
          bundle.energyOnHit += value;
          break;
        case 'armorRegenSpeed':
          bundle.armorRegenSpeed += value;
          break;
        default:
          break;
      }
    }
  }

  bundle.maxArmor = Math.floor(bundle.maxArmor);
  bundle.dodgeChance = Math.min(bundle.dodgeChance, 0.5);

  return bundle;
}

/** Sát thương nhân thêm theo máu đã mất (1 = không có). */
export function getMissingHealthDamageMult(
  bundle: PassiveBundle,
  missingHealth: number,
): number {
  if (bundle.damagePerMissingHealth <= 0 || missingHealth <= 0) {
    return 1;
  }

  return (
    1 +
    Math.min(
      bundle.damagePerMissingHealthCap,
      bundle.damagePerMissingHealth * missingHealth,
    )
  );
}
