/**
 * Luật Elite THUẦN (Gói M3, docs/GAMEPLAY_LOOP_M.md §3c E1–E5): khi nào sinh, chọn affix, dẫn xuất archetype,
 * chọn điểm sinh, vị trí hộ tống. Không phụ thuộc Phaser/scene/entity, không ngẫu nhiên, không đọc thời gian hệ thống:
 * WorldScene truyền mọi đầu vào (số kill, số Elite đang sống, thời gian từ lần Elite trước) vào đây.
 * Số liệu ở `config/enemyConfig.ts` (ELITE_*).
 */
import {
  ELITE_AFFIXES,
  ELITE_AFFIX_ORDER,
  ELITE_HEALTH_MULT,
  ELITE_KILLS_INTERVAL,
  ELITE_MAX_ALIVE,
  ELITE_MIN_GAP_MS,
  ELITE_XP_MULT,
  ENEMY_ARCHETYPES,
  type ArchetypeId,
  type EliteAffixId,
  type EnemyArchetype,
} from '../config/enemyConfig';
import type { Point, RegionDef } from './worldGraph';

export interface EliteSpawnState {
  /** Số quái thường đã hạ trong vùng này kể từ lần Elite gần nhất của vùng (hoặc từ đầu lượt chơi). */
  readonly killsInRegion: number;
  /** Số Elite đang sống. */
  readonly aliveElites: number;
  /** Thời gian (ms) từ lần Elite xuất hiện gần nhất; chưa có Elite nào → `Infinity`. */
  readonly sinceLastEliteMs: number;
}

/**
 * Có nên sinh Elite ở vùng này lúc này không. Luôn false cho vùng an toàn hoặc vùng không có `eliteSlots`
 * (làng, Arena). Các ngưỡng đều TÍNH CẢ biên: đủ `ELITE_KILLS_INTERVAL` kill, còn chỗ dưới `ELITE_MAX_ALIVE`,
 * đã qua `ELITE_MIN_GAP_MS`.
 */
export function shouldSpawnElite(
  state: EliteSpawnState,
  region: Pick<RegionDef, 'safe' | 'eliteSlots'>,
): boolean {
  if (region.safe || region.eliteSlots.length === 0) {
    return false;
  }

  return (
    state.killsInRegion >= ELITE_KILLS_INTERVAL &&
    state.aliveElites < ELITE_MAX_ALIVE &&
    state.sinceLastEliteMs >= ELITE_MIN_GAP_MS
  );
}

/** Affix của Elite thứ `eliteIndex` (đếm từ 0): xoay vòng xác định theo `ELITE_AFFIX_ORDER`. */
export function pickEliteAffix(eliteIndex: number): EliteAffixId {
  const length = ELITE_AFFIX_ORDER.length;
  const index = Math.floor(eliteIndex);
  const wrapped = ((index % length) + length) % length;

  return ELITE_AFFIX_ORDER[wrapped];
}

/**
 * Archetype dẫn xuất của Elite: `healthMult × ELITE_HEALTH_MULT`, `speedMult × affix.speedMult` (nếu có),
 * `xpMult × ELITE_XP_MULT`; các trường khác giữ như archetype nền. Dùng làm `statProfile` của `Enemy` và cho `killXp`.
 * Hệ số nhận sát thương của affix `armored` KHÔNG nằm ở đây (là trạng thái của quái, xem `EnemyBase.damageTakenMult`).
 */
export function eliteArchetype(baseId: ArchetypeId, affix: EliteAffixId): EnemyArchetype {
  const base = ENEMY_ARCHETYPES[baseId];
  const speedMult = ELITE_AFFIXES[affix].speedMult ?? 1;

  return {
    ...base,
    healthMult: base.healthMult * ELITE_HEALTH_MULT,
    speedMult: base.speedMult * speedMult,
    xpMult: base.xpMult * ELITE_XP_MULT,
  };
}

function distanceSq(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;

  return dx * dx + dy * dy;
}

/**
 * Điểm sinh Elite: điểm GẦN người chơi nhất trong số các điểm cách người chơi ít nhất `minDistance`
 * (biên tính cả); không điểm nào đủ xa thì lấy điểm XA nhất; danh sách rỗng → null.
 * Hòa: giữ điểm đứng trước trong danh sách.
 */
export function pickEliteSpawnPoint<T extends Point>(
  points: readonly T[],
  player: Point,
  minDistance: number,
): T | null {
  const minSq = minDistance * minDistance;
  let nearestFar: T | null = null;
  let nearestFarSq = Infinity;
  let farthest: T | null = null;
  let farthestSq = -Infinity;

  for (const point of points) {
    const d = distanceSq(point, player);

    if (d >= minSq && d < nearestFarSq) {
      nearestFar = point;
      nearestFarSq = d;
    }

    if (d > farthestSq) {
      farthest = point;
      farthestSq = d;
    }
  }

  return nearestFar ?? farthest;
}

/** Độ lệch (so với Elite) của `count` quái hộ tống trên vòng bán kính `radius`: góc cố định `i·2π/count`. */
export function escortOffsets(count: number, radius: number): Point[] {
  const total = Math.floor(count);
  const offsets: Point[] = [];

  for (let i = 0; i < total; i += 1) {
    const angle = (i * Math.PI * 2) / total;

    offsets.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
  }

  return offsets;
}
