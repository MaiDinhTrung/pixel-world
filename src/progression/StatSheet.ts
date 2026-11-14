import {
  createEmptyAllocation,
  type StatAllocation,
  type StatId,
} from '../config/statConfig';
import {
  ATTACK_POWER_BASE,
  ATTACK_POWER_PER_POWER_POINT,
} from '../config/scaleConfig';
import { createBaseStats, type CombatStats } from './buffTypes';

/** Chuyển điểm thuộc tính đã cộng thành CombatStats cho Player/vũ khí/skill. */
export class StatSheet {
  private allocation: StatAllocation;

  constructor(allocation: StatAllocation = createEmptyAllocation()) {
    this.allocation = { ...allocation };
  }

  /** Bản sao bảng điểm đã cộng (để lưu / hiển thị). */
  getAllocation(): StatAllocation {
    return { ...this.allocation };
  }

  /** Cộng 1 điểm vào một chỉ số (việc trừ điểm còn lại do WorldScene xử lý). */
  addPoint(statId: StatId): void {
    this.allocation[statId] += 1;
  }

  /** Tính CombatStats từ bảng điểm — nơi duy nhất quy định mỗi điểm chỉ số đáng giá bao nhiêu. */
  getCombatStats(): CombatStats {
    const stats = createBaseStats();
    const allocation = this.allocation;

    // Sinh lực: mỗi điểm +1 máu tối đa
    stats.maxHealthBonus = allocation.vitality;
    // Phòng thủ: mỗi điểm +1 giáp tối đa
    stats.maxArmorBonus = allocation.guard;
    // Năng lượng: mỗi điểm +5 EN tối đa
    stats.maxEnergyBonus = allocation.energy * 5;
    // Sức mạnh: mỗi điểm +10 Sức đánh trên nền 100 (= +10% sát thương gốc)
    stats.damageMultiplier =
      1 + (allocation.power * ATTACK_POWER_PER_POWER_POINT) / ATTACK_POWER_BASE;
    // Tốc độ đánh: mỗi điểm −2% hồi chiêu, tối thiểu còn 35% (giảm tối đa 65%)
    stats.cooldownMultiplier = Math.max(0.35, 1 - allocation.haste * 0.02);
    // Nhanh nhẹn: mỗi điểm +2% tốc chạy
    stats.moveSpeedMultiplier = 1 + allocation.agility * 0.02;

    return stats;
  }
}
