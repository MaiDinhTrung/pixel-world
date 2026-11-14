import type { SkillId } from '../skills/skills';
import type { SkillNodeId } from '../skills/tree/skillTreeTypes';

/**
 * Skill live → node cây quyết định cấp của nó.
 * Chỉ ánh xạ khi hai bên là CÙNG một khả năng; id cũ không khớp tên
 * (`poison_trap` = Tàng Hình → node `vanish`, `arcane_shield` = Khoá Thời Gian → `time_lock`…)
 * mỗi node riêng nên nâng một node không làm mạnh nhầm skill khác.
 */
export const LIVE_SKILL_NODE: Readonly<Record<SkillId, SkillNodeId | null>> = {
  // Đấu sĩ
  shield_bash: 'shield_bash',
  dual_guard: null, // kỹ năng bật/tắt, chưa có node trong cây
  fortress_stand: null, // kỹ năng bật/tắt, chưa có node trong cây
  whirlwind: 'bastion_stance', // live "Thủ Thế" ≈ node "Thế Thủ Bất Động"
  ground_slam: 'ground_slam',
  iron_will: 'steel_body', // live "Ý Chí Sắt" (buff) ≠ node bị động iron_will
  war_cry: 'war_cry',
  blade_storm: 'colossus_form', // live "Cuồng Nộ" (thay Dạng Khổng Lồ) ≠ node "Bão Kiếm"
  self_destruct: null, // chưa có node trong cây
  // Sát thủ
  triple_volley: 'triple_volley',
  evasive_roll: 'evasive_roll',
  poison_trap: 'vanish', // live là Tàng Hình
  arrow_rain: 'blood_hunt', // live là Săn Máu
  hunters_mark: 'hunters_mark',
  storm_barrage: 'shadow_dance', // live "Vũ Điệu Bóng Tối" ≈ node "Vũ Điệu Bóng Đêm"
  // Pháp sư
  arcane_nova: 'arcane_nova',
  blink: 'blink',
  frost_nova: 'frost_nova',
  meteor: 'meteor',
  arcane_shield: 'time_lock', // live "Khoá Thời Gian" ≠ node "Khiên Phép" (bị động)
  void_rift: 'void_rift',
  // Triệu Hồn Sư: cả 6 kỹ năng có node (triệu hồi: số lượng/máu/sát thương; còn lại: sát thương/hồi chiêu)
  nec_bone_spike: 'nec_bone_spike',
  nec_raise_skeleton: 'nec_raise_skeleton',
  nec_wither: 'nec_wither',
  nec_corpse_burst: 'nec_corpse_burst',
  nec_bone_mage: 'nec_bone_mage',
  nec_bone_cage: 'nec_bone_cage',
  // Kỹ năng từ cây: cấp node chính là cấp kỹ năng.
  living_fortress: 'living_fortress',
  cyclone: 'whirlwind',
  sword_tempest: 'blade_storm',
  grapple_chain: 'grapple_chain',
  titan_roar: 'titan_roar',
  flame_burst: 'flame_burst',
  fire_wall: 'fire_wall',
  ice_lance: 'ice_lance',
  arcane_chain: 'arcane_chain',
  absolute_zero: 'absolute_zero',
  shadow_step: 'shadow_step',
  venom_trap: 'poison_trap',
  plague_flask: 'plague_flask',
  deadly_bloom: 'deadly_bloom',
  arrow_storm: 'storm_barrage',
};

/** Skill live đang dùng cấp của node này, hoặc null nếu node chưa có hiệu ứng. */
export function getLiveSkillForNode(nodeId: SkillNodeId): SkillId | null {
  for (const [skillId, mapped] of Object.entries(LIVE_SKILL_NODE)) {
    if (mapped === nodeId) {
      return skillId as SkillId;
    }
  }

  return null;
}
