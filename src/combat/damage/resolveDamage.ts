import {
  ARMOR_PEN_MAX,
  CRIT_CHANCE_MAX,
  CRIT_MULT_BASE,
  CRIT_MULT_MAX,
  MIN_TAKEN_RATIO,
  POOL_SHARE_ELEMENTAL,
  POOL_SHARE_PHYSICAL,
  RES_IGNORE_MAX,
  RES_MIN,
  RES_CAP_PLAYER,
  TYPE_DAMAGE_MAX,
  type DamageType,
  type ElementType,
} from '../../config/damageTypeConfig';

/**
 * Hàm thuần của hệ sát thương (không import Phaser) để test được.
 * Chưa nối vào game: GĐ1 của thiết kế 6 loại sát thương.
 */

export type Rng = () => number;

/** Một phần của đòn đánh: loại + tỉ lệ (tổng các `ratio` của một đòn = 1). */
export interface DamagePart {
  readonly type: DamageType;
  readonly ratio: number;
}

/** Đòn thuần vật lý — mặc định cho mọi nguồn chưa gắn loại. */
export const PHYSICAL_ONLY: readonly DamagePart[] = [
  { type: 'physical', ratio: 1 },
];

/** Đòn thuần một loại — dùng để gắn loại cho vũ khí / kỹ năng. */
export const pureDamage = (type: DamageType): readonly DamagePart[] => [
  { type, ratio: 1 },
];

export interface Attacker {
  /** Cộng sát thương theo loại (0.2 = +20%). */
  readonly typeDamage?: Partial<Record<DamageType, number>>;
  readonly critChance?: number;
  /** Cộng vào hệ số chí mạng nền (0.3 → 1.8). */
  readonly critBonus?: number;
  /** Tỉ lệ giáp/bể giáp bị bỏ qua. */
  readonly armorPen?: number;
  /** Điểm kháng bị bỏ qua (0.2 = 20 điểm %). */
  readonly resPen?: number;
}

export interface Defender {
  /** Giảm sát thương vật lý của quái (0.2 = −20%). */
  readonly physReduction?: number;
  readonly resist?: Partial<Record<ElementType, number>>;
  /** Điểm kháng bị trừ do debuff (Giáp Vỡ…). */
  readonly resShred?: number;
  readonly resCap?: number;
}

export interface PartResult {
  readonly type: DamageType;
  readonly raw: number;
  readonly final: number;
}

export interface ResolvedDamage {
  readonly parts: readonly PartResult[];
  readonly total: number;
  readonly crit: boolean;
}

const clamp = (v: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, v));

/** Làm tròn ngẫu nhiên: 2.3 → 2 (70%) hoặc 3 (30%); kỳ vọng giữ nguyên. */
export function stochasticRound(value: number, rng: Rng = Math.random): number {
  const whole = Math.floor(value);

  return whole + (rng() < value - whole ? 1 : 0);
}

/** Kháng hiệu dụng của người phòng thủ với một nguyên tố, sau xuyên/giảm kháng. */
export function effectiveResist(
  type: ElementType,
  attacker: Attacker,
  defender: Defender,
): number {
  const base = defender.resist?.[type] ?? 0;
  const ignore = Math.min(
    RES_IGNORE_MAX,
    Math.max(0, (attacker.resPen ?? 0) + (defender.resShred ?? 0)),
  );

  return clamp(base - ignore, RES_MIN, defender.resCap ?? RES_CAP_PLAYER);
}

/** Tính sát thương của một đòn lên mục tiêu (chưa làm tròn). */
export function resolveDamage(
  base: number,
  parts: readonly DamagePart[],
  attacker: Attacker,
  defender: Defender,
  rng: Rng = Math.random,
): ResolvedDamage {
  const critChance = clamp(attacker.critChance ?? 0, 0, CRIT_CHANCE_MAX);
  const crit = critChance > 0 && rng() < critChance;
  const critMult = crit
    ? Math.min(CRIT_MULT_MAX, CRIT_MULT_BASE + (attacker.critBonus ?? 0))
    : 1;
  const armorPen = clamp(attacker.armorPen ?? 0, 0, ARMOR_PEN_MAX);
  const results: PartResult[] = [];
  let total = 0;

  for (const part of parts) {
    const typeBonus = clamp(attacker.typeDamage?.[part.type] ?? 0, 0, TYPE_DAMAGE_MAX);
    const raw = base * part.ratio * (1 + typeBonus) * critMult;
    const final =
      part.type === 'physical'
        ? raw * (1 - clamp(defender.physReduction ?? 0, 0, 1) * (1 - armorPen))
        : raw * (1 - effectiveResist(part.type, attacker, defender));

    results.push({ type: part.type, raw, final });
    total += final;
  }

  return { parts: results, total, crit };
}

/**
 * Sàn chống bất tử: tích mọi hệ số giảm (khiên chắn, Song Thủ, aura, kháng…)
 * không được làm sát thương thấp hơn `minRatio` × sát thương gốc.
 */
export function applyDamageFloor(
  raw: number,
  reduced: number,
  minRatio = MIN_TAKEN_RATIO,
): number {
  return Math.max(reduced, raw * minRatio);
}

export interface PoolSplit {
  readonly toPool: number;
  readonly toHealth: number;
}

/**
 * Chia sát thương người chơi nhận giữa bể giáp và HP (số nguyên).
 * Đòn ≥ 1 (trừ khi damage = 0); xuyên giáp làm bể giáp đỡ ít đi.
 */
export function splitPlayerDamage(
  damage: number,
  type: DamageType,
  pool: number,
  armorPen = 0,
  rng: Rng = Math.random,
): PoolSplit {
  if (damage <= 0) {
    return { toPool: 0, toHealth: 0 };
  }

  const total = Math.max(1, stochasticRound(damage, rng));
  const share =
    (type === 'physical' ? POOL_SHARE_PHYSICAL : POOL_SHARE_ELEMENTAL) *
    (1 - clamp(armorPen, 0, ARMOR_PEN_MAX));
  const toPool = Math.min(Math.max(0, pool), Math.round(total * share));

  return { toPool, toHealth: total - toPool };
}
