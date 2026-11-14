import {
  SKILL_NODES,
  getBranchSkillNodes,
  getSkillNode,
} from './skillTreeData';
import type {
  BranchId,
  Scaling,
  SkillLevels,
  SkillNodeDefinition,
  SkillNodeId,
  SynergyParam,
} from './skillTreeTypes';

/** Hồi điểm miễn phí đến hết level này. */
export const FREE_RESPEC_MAX_LEVEL = 10;
/** Tổng bonus synergy tối đa lên một tham số (đơn vị: %). */
export const SYNERGY_TOTAL_CAP = 60;
/** Trần cấp skill kể cả khi cộng thêm từ trang bị. */
export const GEAR_LEVEL_HARD_CAP: Readonly<Record<1 | 2 | 3, number>> = {
  1: 7,
  2: 7,
  3: 5,
};

// ── Điểm kỹ năng ─────────────────────────────────────────────────────────────

/**
 * Tổng SP đã nhận tới một level: đúng 1 SP mỗi level từ Lv2 (Lv1 = 0).
 * Luôn suy ra từ level, không lưu bộ đếm, nên nạp save hay xử lý Level Up
 * nhiều lần cũng không thể cộng trùng.
 */
export function getTotalSkillPoints(characterLevel: number): number {
  if (!Number.isFinite(characterLevel)) {
    return 0;
  }

  return Math.max(0, Math.floor(characterLevel) - 1);
}

export function getSpentSkillPoints(levels: SkillLevels): number {
  let spent = 0;

  for (const value of Object.values(levels)) {
    spent += value ?? 0;
  }

  return spent;
}

export function getUnspentSkillPoints(
  characterLevel: number,
  levels: SkillLevels,
): number {
  return Math.max(
    0,
    getTotalSkillPoints(characterLevel) - getSpentSkillPoints(levels),
  );
}

export function getSkillLevel(levels: SkillLevels, id: SkillNodeId): number {
  return levels[id] ?? 0;
}

export function getBranchPoints(
  levels: SkillLevels,
  branchId: BranchId,
): number {
  let points = 0;

  for (const node of getBranchSkillNodes(branchId)) {
    points += getSkillLevel(levels, node.id);
  }

  return points;
}

// ── Mở khoá và học skill ─────────────────────────────────────────────────────

export interface UnlockStatus {
  readonly unlocked: boolean;
  /** Lý do chưa mở khoá (hiển thị trong UI). */
  readonly reasons: readonly string[];
}

export function getUnlockStatus(
  node: SkillNodeDefinition,
  characterLevel: number,
  levels: SkillLevels,
): UnlockStatus {
  const reasons: string[] = [];
  const { unlock } = node;

  if (characterLevel < unlock.minCharLevel) {
    reasons.push(`Cần level nhân vật ${unlock.minCharLevel}`);
  }

  // Điểm tính cho yêu cầu nhánh không gồm chính skill này, để không tự mở khoá.
  const branchPoints =
    getBranchPoints(levels, node.branchId) - getSkillLevel(levels, node.id);

  if (branchPoints < unlock.branchPoints) {
    reasons.push(
      `Cần ${unlock.branchPoints} điểm trong nhánh (đang có ${branchPoints})`,
    );
  }

  for (const prerequisite of unlock.requires) {
    if (getSkillLevel(levels, prerequisite.skillId) < prerequisite.level) {
      const target = getSkillNode(prerequisite.skillId);

      reasons.push(`Cần ${target.name} cấp ${prerequisite.level}`);
    }
  }

  return { unlocked: reasons.length === 0, reasons };
}

export type LearnResult =
  | { readonly ok: true; readonly levels: SkillLevels }
  | { readonly ok: false; readonly reason: string };

/** Học hoặc nâng cấp một skill thêm 1 cấp. Không sửa object truyền vào. */
export function learnSkill(
  id: SkillNodeId,
  characterLevel: number,
  levels: SkillLevels,
): LearnResult {
  const node = SKILL_NODES[id];

  if (!node) {
    return { ok: false, reason: 'Kỹ năng không tồn tại' };
  }

  if (getSkillLevel(levels, id) >= node.maxLevel) {
    return { ok: false, reason: 'Đã đạt cấp tối đa' };
  }

  if (getUnspentSkillPoints(characterLevel, levels) <= 0) {
    return { ok: false, reason: 'Hết điểm kỹ năng' };
  }

  const status = getUnlockStatus(node, characterLevel, levels);

  if (!status.unlocked) {
    return { ok: false, reason: status.reasons[0] ?? 'Chưa mở khoá' };
  }

  return {
    ok: true,
    levels: { ...levels, [id]: getSkillLevel(levels, id) + 1 },
  };
}

export function canRespecFree(characterLevel: number): boolean {
  return characterLevel <= FREE_RESPEC_MAX_LEVEL;
}

/** Hồi toàn bộ điểm (chi phí do nơi gọi quyết định, xem canRespecFree). */
export function respecAll(): SkillLevels {
  return {};
}

// ── Giá trị theo cấp, synergy ────────────────────────────────────────────────

export function evalScaling(scaling: Scaling, level: number): number {
  const index = Math.max(1, Math.floor(level));

  if (scaling.table && scaling.table.length > 0) {
    return scaling.table[Math.min(index, scaling.table.length) - 1];
  }

  return scaling.base + scaling.perLevel * (index - 1);
}

/** Cấp hiệu dụng: cấp đã học cộng thêm từ trang bị, bị chặn bởi trần cứng. */
export function getEffectiveLevel(
  node: SkillNodeDefinition,
  learnedLevel: number,
  gearBonusLevels = 0,
): number {
  if (learnedLevel <= 0) {
    return 0;
  }

  return Math.min(
    GEAR_LEVEL_HARD_CAP[node.tier],
    learnedLevel + Math.max(0, gearBonusLevels),
  );
}

/** Tổng bonus synergy (đơn vị %) lên một tham số, mỗi nguồn có trần riêng. */
export function getSynergyBonus(
  node: SkillNodeDefinition,
  param: SynergyParam,
  levels: SkillLevels,
): number {
  let total = 0;

  for (const synergy of node.synergies) {
    if (synergy.param !== param) {
      continue;
    }

    const sourceLevel = getSkillLevel(levels, synergy.source);

    total += Math.min(synergy.cap, synergy.perLevel * sourceLevel);
  }

  return Math.min(SYNERGY_TOTAL_CAP, total);
}

export interface ResolvedSkill {
  readonly id: SkillNodeId;
  readonly level: number;
  readonly energyCost: number;
  readonly cooldownMs: number;
  readonly range: number;
  /** Hệ số nhân sát thương từ synergy (1 = không có). */
  readonly damageSynergyMult: number;
  readonly radiusSynergyMult: number;
  readonly durationSynergyMult: number;
  readonly cooldownSynergyMult: number;
  /** Các mốc đặc biệt (Lv3/Lv5) đã đạt. */
  readonly milestonesReached: readonly number[];
}

/** Tính chỉ số hiệu dụng của một skill từ trạng thái cây. */
export function resolveSkill(
  id: SkillNodeId,
  levels: SkillLevels,
  gearBonusLevels = 0,
): ResolvedSkill | null {
  const node = SKILL_NODES[id];
  const learned = getSkillLevel(levels, id);

  if (!node || learned <= 0) {
    return null;
  }

  const level = getEffectiveLevel(node, learned, gearBonusLevels);
  const evalOrZero = (scaling: Scaling | undefined): number =>
    scaling ? evalScaling(scaling, level) : 0;

  return {
    id,
    level,
    energyCost: evalOrZero(node.energyCost),
    cooldownMs: evalOrZero(node.cooldownMs),
    range: evalOrZero(node.range),
    damageSynergyMult: 1 + getSynergyBonus(node, 'damagePct', levels) / 100,
    radiusSynergyMult: 1 + getSynergyBonus(node, 'radius', levels) / 100,
    durationSynergyMult: 1 + getSynergyBonus(node, 'durationMs', levels) / 100,
    cooldownSynergyMult: Math.max(
      0.4,
      1 - getSynergyBonus(node, 'cooldownMs', levels) / 100,
    ),
    milestonesReached: node.milestones
      .filter((milestone) => level >= milestone.level)
      .map((milestone) => milestone.level),
  };
}

// ── Chuẩn hoá dữ liệu save ───────────────────────────────────────────────────

/**
 * Làm sạch skillLevels đọc từ save: bỏ ID lạ/sai lớp, ép cấp về [0, max],
 * rồi dựng lại cây từng cấp một theo thứ tự tầng. Chỉ những cấp hợp lệ
 * (đủ điều kiện mở khoá và còn ngân sách SP) được giữ; phần còn lại bị bỏ,
 * không xoá cả cây.
 */
export function normalizeSkillLevels(
  value: unknown,
  classId: SkillNodeDefinition['classId'],
  characterLevel: number,
): SkillLevels {
  if (!value || typeof value !== 'object') {
    return {};
  }

  const requested: SkillLevels = {};

  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const node = SKILL_NODES[key as SkillNodeId];

    if (!node || node.classId !== classId) {
      continue;
    }

    if (typeof raw !== 'number' || !Number.isFinite(raw)) {
      continue;
    }

    const level = Math.min(node.maxLevel, Math.floor(raw));

    if (level > 0) {
      requested[node.id] = level;
    }
  }

  const budget = getTotalSkillPoints(characterLevel);
  const ordered = (Object.keys(requested) as SkillNodeId[])
    .map((id) => SKILL_NODES[id])
    .sort(
      (a, b) =>
        a.tier - b.tier ||
        a.ui.treePos.row - b.ui.treePos.row ||
        a.ui.treePos.col - b.ui.treePos.col,
    );
  const result: SkillLevels = {};
  let spent = 0;

  for (const node of ordered) {
    const wanted = requested[node.id] ?? 0;

    for (let level = 1; level <= wanted; level += 1) {
      // Điều kiện kiểm tra khi node này đang ở cấp `level − 1`.
      const before: SkillLevels = { ...result, [node.id]: level - 1 };

      if (
        spent >= budget ||
        !getUnlockStatus(node, characterLevel, before).unlocked
      ) {
        break;
      }

      result[node.id] = level;
      spent += 1;
    }
  }

  return result;
}
