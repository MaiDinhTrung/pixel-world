import type {
  AreaShape,
  BranchDefinition,
  BranchId,
  DamageType,
  Prerequisite,
  Scaling,
  SkillEffect,
  SkillKind,
  SkillMilestone,
  SkillNodeDefinition,
  SkillNodeId,
  SkillTier,
  SkillUnlock,
  StatModifier,
  Synergy,
  SynergyParam,
  TreeClassId,
  Trigger,
} from './skillTreeTypes';

// ─────────────────────────────────────────────────────────────────────────────
// Helper dựng dữ liệu (giữ danh sách skill gọn và nhất quán).
// ─────────────────────────────────────────────────────────────────────────────

const sc = (base: number, perLevel = 0): Scaling => ({ base, perLevel });

const circle = (radius: Scaling): AreaShape => ({ kind: 'circle', radius });
const cone = (radius: Scaling, arcDeg: number): AreaShape => ({
  kind: 'cone',
  radius,
  arcDeg,
});
const line = (length: Scaling, width: number): AreaShape => ({
  kind: 'line',
  length,
  width,
});
const bolt = (
  speed: number,
  count?: Scaling,
  pierce?: Scaling,
): AreaShape => ({ kind: 'projectile', speed, count, pierce });

const dmg = (
  shape: AreaShape,
  pct: Scaling,
  damageType: DamageType,
  canCrit = false,
): SkillEffect => ({ type: 'damage', shape, pct, damageType, canCrit });

const status = (
  statusId: Extract<SkillEffect, { type: 'status' }>['status'],
  durationMs: Scaling,
  extra: { stacks?: Scaling; bossDurationMult?: number } = {},
): SkillEffect => ({ type: 'status', status: statusId, durationMs, ...extra });

const move = (
  mode: Extract<SkillEffect, { type: 'move' }>['mode'],
  distance: Scaling,
): SkillEffect => ({ type: 'move', mode, distance });

const summon = (
  kind: Extract<SkillEffect, { type: 'summon' }>['kind'],
  durationMs: Scaling,
  maxCount?: Scaling,
): SkillEffect => ({ type: 'summon', kind, durationMs, maxCount });

const mod = (
  stat: StatModifier['stat'],
  value: Scaling,
  cap?: number,
  condition?: string,
): StatModifier => ({ stat, value, cap, condition });

const buff = (
  durationMs: Scaling,
  ...modifiers: StatModifier[]
): SkillEffect => ({ type: 'buff', durationMs, modifiers });

const custom = (handlerId: string): SkillEffect => ({
  type: 'custom',
  handlerId,
});

const ms = (level: 3 | 5, description: string): SkillMilestone => ({
  level,
  description,
});

const syn = (
  source: SkillNodeId,
  param: SynergyParam,
  perLevel: number,
  cap: number,
): Synergy => ({ source, param, perLevel, cap });

const req = (skillId: SkillNodeId, level: number): Prerequisite => ({
  skillId,
  level,
});

// ─────────────────────────────────────────────────────────────────────────────
// Luật mở khoá theo tầng (xem tài liệu thiết kế, Giai đoạn 3).
// ─────────────────────────────────────────────────────────────────────────────

export const TIER2_MIN_CHAR_LEVEL = 8;
export const TIER2_BRANCH_POINTS = 5;
export const TIER3_MIN_CHAR_LEVEL = 20;
export const TIER3_BRANCH_POINTS = 12;

function unlockFor(
  tier: SkillTier,
  requires: readonly Prerequisite[],
): SkillUnlock {
  if (tier === 1) {
    return { minCharLevel: 1, branchPoints: 0, requires };
  }

  if (tier === 2) {
    return {
      minCharLevel: TIER2_MIN_CHAR_LEVEL,
      branchPoints: TIER2_BRANCH_POINTS,
      requires,
    };
  }

  return {
    minCharLevel: TIER3_MIN_CHAR_LEVEL,
    branchPoints: TIER3_BRANCH_POINTS,
    requires,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Nhánh
// ─────────────────────────────────────────────────────────────────────────────

export const BRANCHES: Record<BranchId, BranchDefinition> = {
  bulwark: { id: 'bulwark', classId: 'knight', name: 'Thành Lũy', role: 'Phòng thủ · phản đòn', index: 0 },
  fury: { id: 'fury', classId: 'knight', name: 'Cuồng Huyết', role: 'Sát thương cận chiến', index: 1 },
  command: { id: 'command', classId: 'knight', name: 'Hiệu Lệnh', role: 'Khống chế đám đông', index: 2 },
  pyre: { id: 'pyre', classId: 'mage', name: 'Liệt Hỏa', role: 'Sát thương theo thời gian · bùng nổ', index: 0 },
  frost: { id: 'frost', classId: 'mage', name: 'Hàn Băng', role: 'Khống chế · combo vỡ băng', index: 1 },
  arcane: { id: 'arcane', classId: 'mage', name: 'Hư Không', role: 'Cơ động · năng lượng · phòng thân', index: 2 },
  shadow: { id: 'shadow', classId: 'ranger', name: 'Bóng Đêm', role: 'Ám sát · né tránh', index: 0 },
  venom: { id: 'venom', classId: 'ranger', name: 'Độc Thuật', role: 'Sát thương tích dần · làm yếu địch', index: 1 },
  marksman: { id: 'marksman', classId: 'ranger', name: 'Xạ Thuật', role: 'Bắn xa · chí mạng', index: 2 },
  bonecraft: { id: 'bonecraft', classId: 'necromancer', name: 'Xương Cốt', role: 'Triệu hồi đội quân xương', index: 0 },
  deathcraft: { id: 'deathcraft', classId: 'necromancer', name: 'Tử Khí', role: 'Nguyền rủa · nổ xác · khống chế', index: 1 },
};

export const CLASS_BRANCHES: Record<TreeClassId, readonly BranchId[]> = {
  knight: ['bulwark', 'fury', 'command'],
  mage: ['pyre', 'frost', 'arcane'],
  ranger: ['shadow', 'venom', 'marksman'],
  necromancer: ['bonecraft', 'deathcraft'],
};

// ─────────────────────────────────────────────────────────────────────────────
// Bộ dựng skill
// ─────────────────────────────────────────────────────────────────────────────

interface NodeInput {
  id: SkillNodeId;
  name: string;
  branch: BranchId;
  tier: SkillTier;
  description: string;
  icon: string;
  fx: string;
  requires?: readonly Prerequisite[];
  energyCost?: Scaling;
  cooldownMs?: Scaling;
  range?: Scaling;
  effects?: readonly SkillEffect[];
  modifiers?: readonly StatModifier[];
  trigger?: Trigger;
  params?: Readonly<Record<string, Scaling>>;
  milestones?: readonly SkillMilestone[];
  synergies?: readonly Synergy[];
}

function build(kind: SkillKind, input: NodeInput): SkillNodeDefinition {
  const branch = BRANCHES[input.branch];
  // Mọi node tối đa 5 cấp (kể cả tối thượng). Bảng `table` ngắn hơn 5 sẽ giữ
  // giá trị cuối từ cấp tương ứng trở đi (xem evalScaling).
  const maxLevel = 5;
  // Hàng = tầng; cột = 2 × chỉ số nhánh (+1 cho bị động), Ultimate đứng giữa.
  const col =
    input.tier === 3
      ? branch.index * 2 + 0.5
      : branch.index * 2 + (kind === 'passive' ? 1 : 0);

  return {
    id: input.id,
    name: input.name,
    classId: branch.classId,
    branchId: input.branch,
    kind,
    tier: input.tier,
    maxLevel,
    description: input.description,
    unlock: unlockFor(input.tier, input.requires ?? []),
    energyCost: input.energyCost,
    cooldownMs: input.cooldownMs,
    range: input.range,
    effects: input.effects,
    modifiers: input.modifiers,
    trigger: input.trigger,
    params: input.params,
    milestones: input.milestones ?? [],
    synergies: input.synergies ?? [],
    ui: { icon: input.icon, treePos: { col, row: input.tier - 1 } },
    fx: input.fx,
  };
}

const active = (input: NodeInput): SkillNodeDefinition => build('active', input);
const passive = (input: NodeInput): SkillNodeDefinition => build('passive', input);

// ─────────────────────────────────────────────────────────────────────────────
// ĐẤU SĨ
// ─────────────────────────────────────────────────────────────────────────────

const KNIGHT_SKILLS: readonly SkillNodeDefinition[] = [
  // ── Thành Lũy ──
  active({
    id: 'shield_bash', name: 'Thuẫn Kích', branch: 'bulwark', tier: 1, icon: 'SB',
    description: 'Lao 90px về hướng ngắm rồi đập khiên: gây sát thương, choáng và đẩy lùi.',
    energyCost: sc(15), cooldownMs: sc(6000), range: sc(90),
    effects: [
      move('dash', sc(90)),
      dmg(cone(sc(90), 150), sc(110, 12), 'physical'),
      status('stun', sc(600), { bossDurationMult: 0.25 }),
    ],
    milestones: [
      ms(3, 'Choáng +0.3s, đẩy lùi xa hơn.'),
      ms(5, 'Mỗi kẻ trúng cho +4 giáp tạm thời (tối đa 12).'),
    ],
    synergies: [syn('iron_will', 'damagePct', 5, 25)],
    fx: 'Lao 3 frame có ảnh mờ xanh; khiên phóng to 1 frame rồi chớp trắng; bụi và rung màn hình 2px.',
  }),
  passive({
    id: 'iron_will', name: 'Ý Chí Sắt', branch: 'bulwark', tier: 1, icon: 'IW',
    description: '+1 giáp tối đa mỗi cấp và hồi giáp nhanh hơn.',
    modifiers: [mod('maxArmor', sc(1, 1)), mod('armorRegenSpeed', sc(0.08, 0.08))],
    milestones: [ms(5, 'Khi giáp về 0, kháng đẩy lùi 50% trong 3s.')],
    fx: 'Viền khiên sáng nhẹ mỗi khi hồi một điểm giáp.',
  }),
  active({
    id: 'bastion_stance', name: 'Thế Thủ Bất Động', branch: 'bulwark', tier: 2, icon: 'BS',
    requires: [req('shield_bash', 3)],
    description: 'Giương khiên 4s: chặn 70% sát thương từ phía trước và phản đạn; phía sau không được che. Di chuyển rất chậm.',
    energyCost: sc(25), cooldownMs: sc(12000),
    effects: [
      buff(sc(4000), mod('damageTaken', sc(-0.7, -0.02), -0.8, 'front120')),
      custom('bastion_reflect_projectiles'),
    ],
    milestones: [
      ms(3, 'Thời gian +1s.'),
      ms(5, 'Kết thúc bằng xung kích hình nón bằng 50% sát thương đã chặn.'),
    ],
    synergies: [syn('shatter_ward', 'damagePct', 4, 20)],
    fx: 'Khiên thành tấm chắn lớn trong suốt; đạn bị phản bắn ra tia sáng nhỏ.',
  }),
  passive({
    id: 'shatter_ward', name: 'Giáp Vỡ Phản Chấn', branch: 'bulwark', tier: 2, icon: 'SW',
    requires: [req('iron_will', 3)],
    description: 'Khi giáp bị đánh về 0, tạo xung kích bán kính 110 gây sát thương và đẩy lùi.',
    trigger: { on: 'armorBroken', icdMs: sc(8000, -500) },
    effects: [dmg(circle(sc(110)), sc(90), 'physical'), move('push', sc(60))],
    milestones: [ms(5, 'Xung kích cũng hồi 2 giáp.')],
    fx: 'Giáp vỡ thành 6 mảnh pixel xanh; vòng sóng trắng.',
  }),
  active({
    id: 'living_fortress', name: 'Lĩnh Vực Thần Minh', branch: 'bulwark', tier: 3, icon: 'LF',
    requires: [req('bastion_stance', 1), req('shatter_ward', 1)],
    description: 'Dựng kết giới bán kính 160 trong 8s: nhốt mọi kẻ bên trong, chặn đòn và đạn từ ngoài; không ai vượt được ranh giới bằng dash hay dịch chuyển. Hết giờ kết giới tan.',
    energyCost: sc(40), cooldownMs: sc(75000),
    effects: [
      summon('zone', sc(8000)),
      custom('domain_isolate_inside_outside'),
    ],
    milestones: [
      ms(3, 'Bên trong lĩnh vực bạn nhận -20% sát thương.'),
    ],
    synergies: [syn('shatter_ward', 'radius', 5, 25)],
    fx: 'Kết giới tròn vàng kim–trắng–xanh nhạt với hoa văn xoay; gợn sóng khi đòn ngoài chạm vào; tan thành hạt sáng.',
  }),

  // ── Cuồng Huyết ──
  active({
    id: 'whirlwind', name: 'Lốc Xoáy', branch: 'fury', tier: 1, icon: 'WW',
    description: 'Xoay kiếm 2s, bán kính 70, đánh mỗi 0.35s; di chuyển ở 60% tốc độ.',
    energyCost: sc(22), cooldownMs: sc(7000),
    effects: [dmg(circle(sc(70)), sc(60, 10), 'physical')],
    params: { durationMs: sc(2000), tickMs: sc(350), moveSpeedMult: sc(0.6) },
    milestones: [ms(3, 'Kéo dài thêm 0.5s.'), ms(5, 'Nhịp cuối đẩy lùi.')],
    synergies: [syn('war_cry', 'damagePct', 3, 15)],
    fx: '8 frame xoay, vệt cung trắng nhiều lớp, bụi tung theo chân.',
  }),
  passive({
    id: 'blood_rage', name: 'Huyết Hận', branch: 'fury', tier: 1, icon: 'BR',
    description: 'Mỗi điểm máu đã mất tăng sát thương (tối đa +30%).',
    modifiers: [mod('damagePerMissingHealth', sc(0.025, 0.005), 0.3)],
    milestones: [ms(5, 'Dưới 30% HP, Lốc Xoáy miễn EN một lần mỗi 20s.')],
    fx: 'Viền đỏ nhịp tim quanh nhân vật khi thấp máu.',
  }),
  active({
    id: 'ground_slam', name: 'Chấn Địa', branch: 'fury', tier: 2, icon: 'GS',
    requires: [req('whirlwind', 3), req('blood_rage', 1)],
    description: 'Nhảy tới điểm ngắm (tầm 220) rồi nện xuống, nổ bán kính 100: sát thương và choáng.',
    energyCost: sc(28), cooldownMs: sc(10000), range: sc(220),
    effects: [
      move('dash', sc(220)),
      dmg(circle(sc(100)), sc(170, 12), 'physical'),
      status('stun', sc(800), { bossDurationMult: 0.25 }),
    ],
    milestones: [
      ms(3, 'Bán kính +20, vệt nứt làm chậm 2s.'),
      ms(5, 'Dư chấn lần 2 sau 0.5s với 60% sát thương.'),
    ],
    synergies: [syn('whirlwind', 'damagePct', 4, 20), syn('blood_rage', 'damagePct', 3, 15)],
    fx: 'Bóng đổ phóng to báo trước; vết nứt đất vẽ tay; 6–8 mảnh đá văng.',
  }),
  passive({
    id: 'momentum', name: 'Đà Chém', branch: 'fury', tier: 2, icon: 'MO',
    requires: [req('blood_rage', 3)],
    description: 'Mỗi đòn trúng cho +4% tốc đánh, cộng dồn tối đa 5 lần trong 3s. Bị trúng đòn thì mất hết.',
    modifiers: [mod('attackSpeedPerStack', sc(0.04))],
    params: { maxStacks: sc(5), durationMs: sc(3000) },
    milestones: [ms(3, 'Trần cộng dồn tăng lên 7.'), ms(5, 'Khi đầy cộng dồn, đòn thường bắn sóng chém.')],
    fx: 'Mỗi cộng dồn là một chấm đỏ trên thanh HUD.',
  }),
  active({
    id: 'blade_storm', name: 'Bão Kiếm', branch: 'fury', tier: 3, icon: 'BL',
    requires: [req('ground_slam', 1), req('momentum', 1)],
    description: '6s hoá kiếm linh: tầm kiếm ×1.8, đòn xuyên thấu, mỗi đòn bắn thêm sóng kiếm 3 hướng, +30% tốc đánh.',
    energyCost: sc(40), cooldownMs: sc(70000),
    effects: [
      buff(sc(6000, 2000), mod('attackSpeed', sc(0.3))),
      custom('blade_storm_spectral_blade'),
    ],
    milestones: [ms(3, 'Sóng kiếm xuyên toàn bộ. (Lv2: +2s.)')],
    synergies: [syn('momentum', 'damagePct', 4, 20)],
    fx: 'Kiếm có hào quang xanh trắng lớn bất thường; ảnh mờ 3 lớp theo chuyển động.',
  }),

  // ── Hiệu Lệnh ──
  active({
    id: 'war_cry', name: 'Tiếng Hô Chiến', branch: 'command', tier: 1, icon: 'WC',
    description: 'Địch thường trong bán kính 140 hoảng sợ 1.5s và bỏ chạy; bản thân +15% sát thương trong 5s.',
    energyCost: sc(20), cooldownMs: sc(12000),
    effects: [
      status('fear', sc(1500, 200)),
      buff(sc(5000), mod('damage', sc(0.15))),
    ],
    params: { radius: sc(140, 10) },
    milestones: [ms(3, 'Bán kính và thời gian sợ tăng thêm.'), ms(5, 'Địch đang sợ nhận thêm +20% sát thương.')],
    fx: 'Sóng âm hình vòng cung; địch hiện dấu "!" rồi chạy.',
  }),
  passive({
    id: 'war_discipline', name: 'Quân Luật', branch: 'command', tier: 1, icon: 'WD',
    description: 'Mỗi đòn trúng hồi Energy; hạ gục địch hồi thêm 2 EN.',
    modifiers: [mod('energyOnHit', sc(0.75, 0.25)), mod('energyOnKill', sc(2))],
    milestones: [ms(5, 'Hồi chiêu Tiếng Hô Chiến -2s.')],
    fx: 'Đốm sáng vàng bay từ quái về người chơi.',
  }),
  active({
    id: 'grapple_chain', name: 'Xích Kéo', branch: 'command', tier: 2, icon: 'GC',
    requires: [req('war_cry', 3)],
    description: 'Ném xích (tầm 260) kéo kẻ đầu tiên và địch quanh nó về trước mặt. Với boss/elite thì kéo bản thân tới.',
    energyCost: sc(18), cooldownMs: sc(9000), range: sc(260),
    effects: [
      move('pull', sc(260)),
      dmg(line(sc(260), 12), sc(80, 10), 'physical'),
      status('slow', sc(1000)),
    ],
    params: { pullRadius: sc(50, 0) },
    milestones: [ms(3, 'Bán kính kéo +30.'), ms(5, 'Kéo được 2 mục tiêu riêng biệt.')],
    synergies: [syn('dread_presence', 'radius', 4, 20)],
    fx: 'Xích thép pixel dài 6 mắt; móc găm vào địch có tia lửa.',
  }),
  passive({
    id: 'dread_presence', name: 'Uy Nghiêm', branch: 'command', tier: 2, icon: 'DP',
    requires: [req('war_discipline', 3)],
    description: 'Aura bán kính 120: địch gần gây ít sát thương hơn và có cơ hội hoảng sợ khi bước vào.',
    modifiers: [mod('enemyDamageDealt', sc(-0.04, -0.04))],
    params: { auraRadius: sc(120), fearChance: sc(0.08, 0.08), fearIcdMs: sc(10000) },
    fx: 'Quầng tối mờ quanh chân; địch gần chững lại một nhịp.',
  }),
  active({
    id: 'titan_roar', name: 'Tiếng Gầm Cự Nhân', branch: 'command', tier: 3, icon: 'TR',
    requires: [req('grapple_chain', 1), req('dread_presence', 1)],
    description: 'Khởi động 0.6s. Bán kính 260: choáng 1.5s mọi địch không phải boss và xử tử địch dưới 20% HP.',
    energyCost: sc(45), cooldownMs: sc(80000),
    effects: [
      status('stun', sc(1500), { bossDurationMult: 0.25 }),
      { type: 'execute', thresholdPct: sc(20, 5), bossImmune: true },
    ],
    params: { radius: sc(260), windupMs: sc(600) },
    milestones: [ms(3, 'Xử tử 30%; mỗi mạng hạ hồi 1 giáp.')],
    synergies: [syn('war_discipline', 'radius', 3, 15), syn('dread_presence', 'radius', 3, 15)],
    fx: 'Nhân vật phình to 1 frame; sóng âm vòng tròn gần kín màn hình; rung mạnh.',
  }),

  // ── Kỹ năng cũ được đưa vào cây (cấp node = cấp kỹ năng) ──
  active({
    id: 'steel_body', name: 'Kim Thân', branch: 'bulwark', tier: 2, icon: 'KT',
    requires: [req('shield_bash', 3)],
    description: 'Hồi 4 HP, bất tử 1.5s, +3 giáp tối đa và +15% sát thương cận chiến trong 20s.',
    energyCost: sc(15), cooldownMs: sc(15000),
    effects: [buff(sc(20000), mod('maxArmor', sc(3)))],
    milestones: [ms(3, 'Hồi máu +2.'), ms(5, 'Bất tử thêm 0.5s.')],
    synergies: [syn('iron_will', 'damagePct', 3, 15)],
    fx: 'Vầng sáng xanh lục bọc quanh người; vòng khiên nở ra.',
  }),
  active({
    id: 'colossus_form', name: 'Dạng Khổng Lồ', branch: 'fury', tier: 2, icon: 'CF',
    requires: [req('blood_rage', 3)],
    description: 'Hoá khổng lồ 12s: +50% sát thương, +40% tốc đánh cận chiến, +6 giáp, giảm 35% sát thương nhận; nện nổ choáng khi biến hình.',
    energyCost: sc(35), cooldownMs: sc(26000),
    effects: [
      dmg(circle(sc(200)), sc(400, 10), 'physical'),
      status('stun', sc(900), { bossDurationMult: 0.25 }),
    ],
    milestones: [ms(3, 'Kéo dài thêm 2s.'), ms(5, 'Hồi thêm máu khi biến hình.')],
    synergies: [syn('blood_rage', 'damagePct', 3, 15)],
    fx: 'Thân phình to, nứt đất cam đỏ; rung màn hình.',
  }),
];

// ─────────────────────────────────────────────────────────────────────────────
// PHÁP SƯ
// ─────────────────────────────────────────────────────────────────────────────

const MAGE_SKILLS: readonly SkillNodeDefinition[] = [
  // ── Liệt Hỏa ──
  active({
    id: 'flame_burst', name: 'Hỏa Bạo', branch: 'pyre', tier: 1, icon: 'FB',
    description: 'Nổ lửa tại điểm ngắm (tầm 280, bán kính 70), gây Thiêu 3s.',
    energyCost: sc(18), cooldownMs: sc(4000), range: sc(280),
    effects: [
      dmg(circle(sc(70)), sc(130, 10), 'fire', true),
      status('burn', sc(3000), { stacks: sc(1) }),
    ],
    milestones: [ms(3, 'Bán kính +20.'), ms(5, 'Thiêu cộng dồn 2 tầng.')],
    fx: 'Vòng lửa 4 frame cam đỏ rồi vàng; tàn lửa bay lên.',
  }),
  passive({
    id: 'kindling', name: 'Mồi Lửa', branch: 'pyre', tier: 1, icon: 'KI',
    description: 'Thiêu gây thêm sát thương. Kẻ đang cháy chết sẽ lan Thiêu cho địch gần đó (từ Lv3).',
    modifiers: [mod('burnDamage', sc(0.1, 0.1))],
    params: { spreadRadius: sc(90) },
    milestones: [ms(3, 'Kích hoạt lan Thiêu khi địch chết.'), ms(5, 'Lan thêm 1 bước.')],
    fx: 'Ngọn lửa nhỏ trên đầu địch; tia lửa nhảy sang kẻ bên cạnh.',
  }),
  active({
    id: 'fire_wall', name: 'Tường Lửa', branch: 'pyre', tier: 2, icon: 'FW',
    requires: [req('flame_burst', 3)],
    description: 'Dựng tường lửa dài 220px trong 5s, gây sát thương mỗi giây, gắn Thiêu và chặn đạn địch.',
    energyCost: sc(28), cooldownMs: sc(10000), range: sc(260),
    effects: [
      summon('wall', sc(5000)),
      dmg(line(sc(220, 10), 20), sc(60, 6), 'fire'),
      status('burn', sc(3000)),
    ],
    milestones: [ms(3, 'Tường dài +40px.'), ms(5, 'Địch bước qua bị chậm 20%.')],
    synergies: [syn('flame_burst', 'damagePct', 4, 20), syn('kindling', 'damagePct', 3, 15)],
    fx: 'Tường lửa 6 frame lập loè; bóng chiếu ấm lên nền.',
  }),
  passive({
    id: 'overheat', name: 'Quá Nhiệt', branch: 'pyre', tier: 2, icon: 'OH',
    requires: [req('kindling', 3)],
    description: 'Mỗi skill Hỏa cộng 1 Nhiệt (tối đa 5, tan sau 6s). Đủ 5: skill Hỏa kế tiếp miễn EN và mạnh hơn. Khi Nhiệt ≥3, hồi EN -30%.',
    modifiers: [mod('damage', sc(0.5, 0.075), undefined, 'heat5')],
    params: { maxHeat: sc(5), decayMs: sc(6000), energyRegenPenalty: sc(0.3) },
    milestones: [ms(5, 'Miễn EN và +80% sát thương.')],
    fx: 'Thanh Nhiệt 5 ô cam đỏ dưới thanh Energy; đầy thì nhấp nháy.',
  }),
  active({
    id: 'meteor', name: 'Thiên Thạch', branch: 'pyre', tier: 3, icon: 'ME',
    requires: [req('fire_wall', 1), req('overheat', 1)],
    description: 'Vạch báo 1.2s rồi thiên thạch rơi bán kính 130, kích nổ toàn bộ Thiêu còn lại trên địch trong vùng và để lại dung nham 4s.',
    energyCost: sc(60), cooldownMs: sc(75000), range: sc(300),
    effects: [
      dmg(circle(sc(130)), sc(300, 60), 'fire', true),
      custom('meteor_detonate_burn'),
      summon('zone', sc(4000)),
    ],
    params: { telegraphMs: sc(1200) },
    milestones: [ms(3, 'Thêm 2 mảnh thiên thạch phụ.')],
    synergies: [syn('flame_burst', 'damagePct', 5, 25)],
    fx: 'Bóng lớn dần trên nền; thiên thạch 3 frame xoay rồi nổ lửa kèm hit-stop 60ms.',
  }),

  // ── Hàn Băng ──
  active({
    id: 'frost_nova', name: 'Băng Hoàn', branch: 'frost', tier: 1, icon: 'FN',
    description: 'Xả vòng băng bán kính 110 quanh mình, gây Lạnh (chậm 35% trong 3s).',
    energyCost: sc(18), cooldownMs: sc(6000),
    effects: [
      dmg(circle(sc(110)), sc(90, 10), 'frost', true),
      status('chill', sc(3000)),
    ],
    milestones: [ms(3, 'Bán kính +20.'), ms(5, 'Địch gần tâm bị đóng băng 0.8s.')],
    fx: 'Vòng tinh thể xanh lan rộng 5 frame; địch bị phủ băng trắng.',
  }),
  passive({
    id: 'permafrost', name: 'Băng Vĩnh Cửu', branch: 'frost', tier: 1, icon: 'PF',
    description: 'Địch bị Lạnh chịu thêm sát thương từ bạn; thời gian Lạnh dài hơn.',
    modifiers: [mod('damageVsChilled', sc(0.04, 0.04)), mod('chillDurationMs', sc(300, 300))],
    fx: 'Hơi lạnh toả quanh địch bị Lạnh.',
  }),
  active({
    id: 'ice_lance', name: 'Băng Thương', branch: 'frost', tier: 2, icon: 'IL',
    requires: [req('frost_nova', 3)],
    description: 'Bắn thương băng xuyên 3 mục tiêu, mạnh hơn lên kẻ bị Lạnh; kẻ đóng băng bị vỡ và nổ nhỏ.',
    energyCost: sc(16), cooldownMs: sc(4000), range: sc(420),
    effects: [
      dmg(bolt(520, sc(1), sc(3)), sc(140, 10), 'frost', true),
      status('chill', sc(2500)),
      custom('shatter_frozen_aoe'),
    ],
    milestones: [ms(3, 'Xuyên 4 mục tiêu.'), ms(5, 'Vỡ băng cũng gây Lạnh lan.')],
    synergies: [syn('frost_nova', 'damagePct', 6, 30)],
    fx: 'Thương pixel dài với đuôi sáng xanh; địch vỡ thành mảnh băng.',
  }),
  passive({
    id: 'cold_focus', name: 'Tâm Băng', branch: 'frost', tier: 2, icon: 'CF',
    requires: [req('permafrost', 3)],
    description: 'Mỗi địch bị Lạnh gần bạn (tối đa 5) cho thêm EN/s.',
    modifiers: [mod('energyRegenPerChilled', sc(0.6, 0.1))],
    params: { maxCounted: sc(5), radius: sc(300) },
    milestones: [ms(5, 'Mỗi địch đóng băng giảm hồi chiêu skill Băng 0.5s.')],
    fx: 'Hạt sáng xanh bay từ địch bị Lạnh về người chơi.',
  }),
  active({
    id: 'absolute_zero', name: 'Độ Không Tuyệt Đối', branch: 'frost', tier: 3, icon: 'AZ',
    requires: [req('ice_lance', 1), req('cold_focus', 1)],
    description: 'Vùng bán kính 170 trong 4s: địch bị Lạnh rồi đóng băng sau 1.5s và nhận thêm sát thương. Hết hạn thì toàn bộ địch đóng băng vỡ.',
    energyCost: sc(60), cooldownMs: sc(80000), range: sc(300),
    effects: [
      summon('zone', sc(4000)),
      status('freeze', sc(2500), { bossDurationMult: 0.25 }),
      dmg(circle(sc(170, 25)), sc(200, 40), 'frost', true),
    ],
    milestones: [ms(3, 'Vùng +50px.')],
    synergies: [syn('permafrost', 'damagePct', 4, 20)],
    fx: 'Màn hình tối đi, tuyết rơi, vùng sáng xanh; vỡ băng kèm hit-stop 60ms.',
  }),

  // ── Hư Không ──
  active({
    id: 'arcane_nova', name: 'Tinh Bạo', branch: 'arcane', tier: 1, icon: 'AN',
    description: 'Xả sóng năng lượng 360° bán kính 100, đẩy lùi 60px và cắt ngang cú bắn đang telegraph của quái xa.',
    energyCost: sc(15), cooldownMs: sc(5000),
    effects: [dmg(circle(sc(100)), sc(100, 10), 'arcane', true), move('push', sc(60))],
    milestones: [ms(3, 'Bán kính +20.'), ms(5, 'Đẩy lùi mạnh hơn và hất địch vào nhau.')],
    fx: 'Vòng tím nở rộng 4 frame; tia lấp lánh toả ra.',
  }),
  passive({
    id: 'arcane_shield', name: 'Khiên Phép', branch: 'arcane', tier: 1, icon: 'AS',
    description: 'Một phần sát thương nhận được hấp thụ bằng Energy (1 sát thương = 4 EN). Chỉ hoạt động khi còn EN.',
    modifiers: [mod('energyAbsorb', sc(0.2, 0.05), 0.4)],
    params: { energyPerDamage: sc(4) },
    milestones: [ms(5, 'Hấp thụ cả đạn địch.')],
    fx: 'Khiên mờ tím quanh người; vỡ thành hạt khi hết EN.',
  }),
  active({
    id: 'blink', name: 'Dịch Chuyển', branch: 'arcane', tier: 2, icon: 'BL',
    requires: [req('arcane_nova', 3)],
    description: 'Tức thời tới 200px, miễn nhiễm 0.15s, để lại dư ảnh nổ sau 1.5s (từ Lv3).',
    energyCost: sc(20), cooldownMs: sc(7000), range: sc(200, 20),
    effects: [
      move('teleport', sc(200, 20)),
      summon('afterimage', sc(1500)),
      dmg(circle(sc(80)), sc(80, 8), 'arcane'),
    ],
    milestones: [ms(3, 'Dư ảnh phát nổ.'), ms(5, 'Có thể dịch chuyển lần 2 trong 1s.')],
    synergies: [syn('arcane_nova', 'damagePct', 4, 20)],
    fx: 'Biến mất theo cột pixel dọc; hiện lại có hạt tím.',
  }),
  active({
    id: 'arcane_chain', name: 'Xích Tinh', branch: 'arcane', tier: 2, icon: 'AC',
    requires: [req('arcane_nova', 3)],
    description: 'Phóng tia năng lượng vào địch gần nhất trong 360px, rồi nảy sang tối đa 3 địch khác trong 150px; mỗi lần nảy yếu đi 15%.',
    energyCost: sc(20), cooldownMs: sc(6000), range: sc(360),
    effects: [dmg(circle(sc(150)), sc(110, 10), 'arcane', true)],
    params: { bounces: sc(3) },
    milestones: [ms(3, 'Nảy thêm 1 lần.'), ms(5, 'Mỗi lần nảy làm địch bị hất nhẹ về phía bạn.')],
    synergies: [syn('arcane_nova', 'damagePct', 4, 20)],
    fx: 'Tia tím gấp khúc nối các địch; mỗi điểm nảy nháy sáng.',
  }),
  passive({
    id: 'spell_echo', name: 'Dư Chấn', branch: 'arcane', tier: 2, icon: 'SE',
    requires: [req('arcane_shield', 3)],
    description: 'Cơ hội skill chủ động vang lại sau 0.6s tại cùng điểm với 50% sát thương, miễn EN. Không áp dụng cho Ultimate.',
    modifiers: [mod('castEchoChance', sc(0.11, 0.03))],
    params: { delayMs: sc(600), damageFraction: sc(0.5, 0.05), icdMs: sc(3000) },
    milestones: [ms(5, 'Bản vang lại gây 70% sát thương.')],
    fx: 'Ảnh mờ của hiệu ứng skill chạy lại, màu nhạt hơn.',
  }),
  active({
    id: 'void_rift', name: 'Khe Nứt Hư Không', branch: 'arcane', tier: 3, icon: 'VR',
    requires: [req('blink', 1), req('spell_echo', 1)],
    description: 'Hố đen 5s bán kính 200 kéo địch vào tâm và gây sát thương mỗi 0.5s. Thiêu/Lạnh trong hố tick nhanh hơn.',
    energyCost: sc(55), cooldownMs: sc(75000), range: sc(300),
    effects: [
      summon('zone', sc(5000)),
      move('pull', sc(200)),
      dmg(circle(sc(200)), sc(40, 15), 'arcane'),
    ],
    params: { tickMs: sc(500), endBurstPct: sc(0, 100), bossPullMult: sc(0.25) },
    milestones: [ms(3, 'Kết thúc bằng vụ nổ 200% sát thương.')],
    fx: 'Xoáy pixel đen tím; địch bị kéo xoắn ốc; tâm sáng trắng.',
  }),

  // ── Kỹ năng cũ được đưa vào cây (cấp node = cấp kỹ năng) ──
  active({
    id: 'time_lock', name: 'Khoá Thời Gian', branch: 'frost', tier: 2, icon: 'TL',
    requires: [req('frost_nova', 3)],
    description: 'Khoá thời gian 280px: choáng 2.2s mọi địch trong vùng, bản thân bất tử 1.2s.',
    energyCost: sc(30), cooldownMs: sc(18000),
    effects: [
      dmg(circle(sc(280)), sc(60, 10), 'arcane'),
      status('stun', sc(2200), { bossDurationMult: 0.25 }),
    ],
    milestones: [ms(3, 'Bất tử thêm 0.3s.'), ms(5, 'Choáng lâu hơn 0.5s.')],
    synergies: [syn('frost_nova', 'damagePct', 3, 15)],
    fx: 'Vòng tím-xanh lan rộng, màn hình lóe sáng; địch đóng băng giữa chừng.',
  }),
];

// ─────────────────────────────────────────────────────────────────────────────
// SÁT THỦ
// ─────────────────────────────────────────────────────────────────────────────

const RANGER_SKILLS: readonly SkillNodeDefinition[] = [
  // ── Bóng Đêm ──
  active({
    id: 'evasive_roll', name: 'Lộn Né Bóng', branch: 'shadow', tier: 1, icon: 'ER',
    description: 'Lăn 140px, bất tử 0.35s; đòn đánh tiếp theo trong 2s nhận +40% sát thương (Tập kích).',
    energyCost: sc(12), cooldownMs: sc(4000), range: sc(140),
    effects: [
      move('dash', sc(140)),
      buff(sc(2000), mod('damage', sc(0.4), undefined, 'nextAttackOnly')),
    ],
    params: { invulnerableMs: sc(350, 50) },
    milestones: [ms(3, 'Bất tử +0.1s.'), ms(5, 'Để lại khói làm quái xa mất mục tiêu 1.5s.')],
    fx: 'Nhân vật cuộn, để lại 2 bóng mờ tối.',
  }),
  passive({
    id: 'ambush', name: 'Đánh Lén', branch: 'shadow', tier: 1, icon: 'AM',
    description: 'Đòn trúng từ phía sau (±60°) hoặc vào địch đang cast gây thêm sát thương và tăng xác suất chí mạng.',
    modifiers: [
      mod('damageFromBehind', sc(0.33, 0.08)),
      mod('critChanceFromBehind', sc(0.07, 0.02)),
    ],
    fx: 'Dấu "×" nhỏ nháy trên địch khi có đòn đánh lén.',
  }),
  active({
    id: 'shadow_step', name: 'Ảnh Bộ', branch: 'shadow', tier: 2, icon: 'SS',
    requires: [req('evasive_roll', 3)],
    description: 'Dịch chuyển ra sau địch gần nhất trong 300px và đâm: chí mạng đảm bảo khi đòn đến từ phía sau.',
    energyCost: sc(22), cooldownMs: sc(8000), range: sc(300),
    effects: [move('teleport', sc(300)), dmg(cone(sc(40), 90), sc(180, 12), 'physical', true)],
    milestones: [ms(5, 'Nếu hạ gục thì reset hồi chiêu.')],
    synergies: [syn('evasive_roll', 'damagePct', 5, 25), syn('ambush', 'damagePct', 4, 20)],
    fx: 'Cột bóng pixel đen tại chỗ cũ; vệt đâm trắng ở điểm đến.',
  }),
  passive({
    id: 'phantom_reflex', name: 'Phản Xạ Ma', branch: 'shadow', tier: 2, icon: 'PR',
    requires: [req('ambush', 3)],
    description: 'Cơ hội né hoàn toàn đòn đánh (tối đa 25%). Né thành công giảm 1s hồi chiêu skill kế tiếp.',
    modifiers: [mod('dodgeChance', sc(0.085, 0.025), 0.25)],
    trigger: { on: 'dodge' },
    params: { cooldownRefundMs: sc(1000) },
    milestones: [ms(5, 'Để lại ảnh giả thu hút địch 1.5s.')],
    fx: 'Nhân vật mờ đi 1 frame khi né; chữ "MISS" nhỏ.',
  }),
  active({
    id: 'shadow_dance', name: 'Vũ Điệu Bóng Đêm', branch: 'shadow', tier: 3, icon: 'SD',
    requires: [req('shadow_step', 1), req('phantom_reflex', 1)],
    description: '6s tàng hình: mỗi lần bấm đánh dịch chuyển tới địch kế tiếp và đâm chí mạng. Mỗi mạng hạ kéo dài thêm 1s (tối đa +3s). Bị trúng đòn thì kết thúc.',
    energyCost: sc(50), cooldownMs: sc(70000),
    effects: [
      buff(sc(6000), mod('attackSpeed', sc(0.2))),
      move('teleport', sc(300)),
      dmg(cone(sc(40), 90), sc(130, 30), 'physical', true),
    ],
    params: { extendPerKillMs: sc(1000), maxExtendMs: sc(3000) },
    milestones: [ms(3, '+20% tốc đánh.')],
    synergies: [syn('ambush', 'damagePct', 4, 20)],
    fx: 'Nhân vật hoá bóng đen, màn hình tối nhẹ; mỗi cú đâm có vệt trắng chéo.',
  }),

  // ── Độc Thuật ──
  active({
    id: 'poison_trap', name: 'Bẫy Độc', branch: 'venom', tier: 1, icon: 'PT',
    description: 'Đặt bẫy (tối đa 2 cái cùng lúc). Khi địch chạm, nổ mây độc bán kính 80 trong 4s và gắn 1 tầng Độc.',
    energyCost: sc(14), cooldownMs: sc(5000), range: sc(200),
    effects: [
      summon('trap', sc(20000), sc(2)),
      dmg(circle(sc(80)), sc(20, 3), 'poison'),
      status('poison', sc(4000), { stacks: sc(1) }),
    ],
    milestones: [ms(3, 'Đặt được thêm 1 bẫy cùng lúc.'), ms(5, 'Bẫy kích hoạt giữ chân địch 0.6s.')],
    fx: 'Bẫy gai nhỏ; mây độc xanh lá 4 frame.',
  }),
  passive({
    id: 'toxin_mastery', name: 'Độc Tố', branch: 'venom', tier: 1, icon: 'TM',
    description: 'Độc gây thêm sát thương; đòn đánh thường có cơ hội gắn 1 tầng Độc.',
    modifiers: [mod('poisonDamage', sc(0.1, 0.1)), mod('poisonApplyChance', sc(0.14, 0.04))],
    params: { maxStacks: sc(3) },
    milestones: [ms(3, 'Trần cộng dồn Độc +1.'), ms(5, 'Trần cộng dồn Độc +1.')],
    fx: 'Mũi tên bọc xanh lá; giọt độc nhỏ.',
  }),
  active({
    id: 'plague_flask', name: 'Bình Dịch', branch: 'venom', tier: 2, icon: 'PF',
    requires: [req('poison_trap', 3)],
    description: 'Ném bình (tầm 260), nổ mây độc bán kính 100 trong 5s, gắn ngay 2 tầng Độc và làm chậm 15%.',
    energyCost: sc(20), cooldownMs: sc(9000), range: sc(260),
    effects: [
      summon('zone', sc(5000)),
      dmg(circle(sc(100)), sc(25, 4), 'poison'),
      status('poison', sc(4000), { stacks: sc(2) }),
      status('slow', sc(2000)),
    ],
    milestones: [ms(5, 'Địch chết trong mây sinh ra mây nhỏ.')],
    synergies: [syn('poison_trap', 'damagePct', 3, 15)],
    fx: 'Bình xoay trong không trung; mây xanh dày hơn bẫy.',
  }),
  passive({
    id: 'enfeebling_venom', name: 'Độc Suy Nhược', branch: 'venom', tier: 2, icon: 'EV',
    requires: [req('toxin_mastery', 3)],
    description: 'Mỗi tầng Độc làm địch gây ít sát thương hơn và chậm hơn (tổng giảm tối đa 25%).',
    modifiers: [mod('enemyDamageDealtPerStack', sc(-0.01, -0.01), -0.25)],
    milestones: [ms(5, 'Từ 5 tầng, địch bị tê liệt (hồi chiêu tấn công +30%).')],
    fx: 'Địch bị độc có vệt xanh nhạt chảy xuống.',
  }),
  active({
    id: 'deadly_bloom', name: 'Hoa Tử Thần', branch: 'venom', tier: 3, icon: 'DB',
    requires: [req('plague_flask', 1), req('enfeebling_venom', 1)],
    description: 'Gieo hạt ở điểm ngắm (tầm 300). Sau 1.5s nở bán kính 140 và kích nổ mọi tầng Độc trong vùng, tiêu hết tầng.',
    energyCost: sc(50), cooldownMs: sc(70000), range: sc(300),
    effects: [
      dmg(circle(sc(140, 20)), sc(120, 20), 'poison'),
      custom('bloom_detonate_poison_stacks'),
    ],
    params: { pctPerStack: sc(60, 20), windupMs: sc(1500) },
    milestones: [ms(3, 'Bán kính +40.')],
    synergies: [syn('poison_trap', 'damagePct', 3, 15), syn('toxin_mastery', 'damagePct', 4, 20)],
    fx: 'Hạt nứt rồi hoa tím xanh nở 5 frame; bào tử bay ra.',
  }),

  // ── Xạ Thuật ──
  active({
    id: 'triple_volley', name: 'Loạt Ba Tên', branch: 'marksman', tier: 1, icon: 'TV',
    description: 'Bắn 3 tên toả 20°, mỗi tên 70% sát thương.',
    energyCost: sc(14), cooldownMs: sc(4000),
    effects: [dmg(bolt(680, sc(3)), sc(70, 8), 'physical', true)],
    milestones: [ms(3, 'Tên giữa xuyên 2 mục tiêu.'), ms(5, 'Thành 5 tên.')],
    synergies: [syn('eagle_eye', 'damagePct', 4, 20)],
    fx: 'Tên có vệt trắng, bay song song với cánh quạt rộng dần.',
  }),
  passive({
    id: 'eagle_eye', name: 'Nhãn Quang', branch: 'marksman', tier: 1, icon: 'EE',
    description: 'Đạn bay xa trên 300px nhận thêm xác suất và sát thương chí mạng.',
    modifiers: [mod('critChanceFar', sc(0.03, 0.03)), mod('critDamageFar', sc(0.05, 0.05))],
    params: { minDistance: sc(300) },
    milestones: [ms(5, 'Tầm bắn +10%.')],
    fx: 'Dấu ngắm nhỏ sáng khi mục tiêu ở xa.',
  }),
  active({
    id: 'hunters_mark', name: 'Nhát Đao Đoạt Mệnh', branch: 'marksman', tier: 2, icon: 'HM',
    requires: [req('triple_volley', 3)],
    description: 'Nhảy ra sau lưng một kẻ trong 450px, đâm hai đao gây sát thương lớn và choáng 0.5s, rồi dịch chuyển về vị trí cũ. Bất tử trong lúc thực hiện.',
    energyCost: sc(16), cooldownMs: sc(10000), range: sc(450),
    effects: [status('mark', sc(8000))],
    milestones: [ms(5, 'Mốc cấp 5 của bản cũ (Dấu lan) không còn áp dụng.')],
    synergies: [syn('eagle_eye', 'damagePct', 3, 15)],
    fx: 'Hai vệt đao chéo nhau sau lưng địch, tia lửa vàng; để lại dư ảnh ở vị trí cũ.',
  }),
  passive({
    id: 'quick_draw', name: 'Rút Nhanh', branch: 'marksman', tier: 2, icon: 'QD',
    requires: [req('eagle_eye', 3)],
    description: 'Sau khi lăn hoặc dịch chuyển, 2s tiếp theo bắn nhanh hơn và phát bắn đầu tiên không tốn EN.',
    modifiers: [mod('attackSpeedAfterRoll', sc(0.14, 0.04))],
    trigger: { on: 'roll' },
    params: { windowMs: sc(2000) },
    milestones: [ms(5, 'Áp dụng cả sau Ảnh Bộ.')],
    fx: 'Tay phát sáng vàng nhẹ trong khung thời gian hiệu lực.',
  }),
  active({
    id: 'storm_barrage', name: 'Bão Tên', branch: 'marksman', tier: 3, icon: 'SB',
    requires: [req('hunters_mark', 1), req('quick_draw', 1)],
    description: '4s bắn liên tục theo hướng ngắm, di chuyển chậm 40%: khoảng 16 mũi xuyên hàng ngang, mỗi mũi 55% sát thương, +20% xác suất chí mạng.',
    energyCost: sc(50), cooldownMs: sc(75000),
    effects: [
      buff(sc(4000), mod('critChance', sc(0.2))),
      dmg(bolt(760, sc(16, 5), sc(2)), sc(55, 10), 'physical', true),
    ],
    milestones: [ms(3, 'Mũi cuối nổ nhỏ.')],
    synergies: [syn('eagle_eye', 'damagePct', 3, 15), syn('quick_draw', 'damagePct', 3, 15)],
    fx: 'Cung phát sáng; mũi tên xếp thành dải liên tục.',
  }),

  // ── Kỹ năng cũ được đưa vào cây (cấp node = cấp kỹ năng) ──
  active({
    id: 'vanish', name: 'Tàng Hình', branch: 'shadow', tier: 2, icon: 'VN',
    requires: [req('evasive_roll', 3)],
    description: 'Tàng hình 3.5s, tăng 40% tốc chạy. Ra đòn sẽ phá tàng hình.',
    energyCost: sc(18), cooldownMs: sc(14000),
    effects: [buff(sc(3500))],
    milestones: [ms(3, 'Kéo dài thêm 1s.'), ms(5, 'Đòn đầu sau khi hiện hình gây thêm sát thương.')],
    synergies: [syn('ambush', 'damagePct', 3, 15)],
    fx: 'Nhân vật mờ đi thành bóng tím; bụi khói quanh chân.',
  }),
  active({
    id: 'blood_hunt', name: 'Săn Máu', branch: 'marksman', tier: 2, icon: 'BH',
    requires: [req('triple_volley', 3)],
    description: 'Tốc biến 220px, bùng nổ sát thương tại điểm đến và hút 1 HP mỗi kẻ địch trúng đòn.',
    energyCost: sc(22), cooldownMs: sc(14000), range: sc(220),
    effects: [dmg(circle(sc(135)), sc(500, 10), 'physical', true), move('teleport', sc(220))],
    milestones: [ms(3, 'Bán kính +15.'), ms(5, 'Hút máu nhiều hơn.')],
    synergies: [syn('eagle_eye', 'damagePct', 3, 15)],
    fx: 'Vệt đỏ xé ngang; bùng nổ đỏ thẫm tại điểm đến.',
  }),
];

// ─────────────────────────────────────────────────────────────────────────────
// TRIỆU HỒN SƯ (số liệu thực nằm ở config/necromancerConfig.ts: SKELETON_SQUAD, BONE_MAGE_SQUAD)
// ─────────────────────────────────────────────────────────────────────────────

const NECROMANCER_SKILLS: readonly SkillNodeDefinition[] = [
  active({
    id: 'nec_raise_skeleton', name: 'Dậy Bộ Xương', branch: 'bonecraft', tier: 1, icon: 'BX',
    description: 'Dựng bộ xương chiến đấu 60s từ xác. Mỗi cấp: +1 bộ xương tối đa (gốc 3), +20% máu, +10% sát thương.',
    energyCost: sc(12), cooldownMs: sc(4000),
    effects: [summon('banner', sc(60000), sc(3, 1))],
    fx: 'Xương trồi lên từ xác, vòng tím nhạt.',
  }),
  active({
    id: 'nec_bone_mage', name: 'Pháp Sư Xương', branch: 'bonecraft', tier: 1, icon: 'PS',
    description: 'Dựng pháp sư xương bắn xa 60s. Mỗi cấp: +1 pháp sư tối đa (gốc 2), +20% máu, +10% sát thương.',
    energyCost: sc(30), cooldownMs: sc(10000),
    effects: [summon('banner', sc(60000), sc(2, 1))],
    fx: 'Pháp sư xương bọc ánh tím.',
  }),
  // ── Tử Khí ──
  active({
    id: 'nec_bone_spike', name: 'Gai Xương', branch: 'deathcraft', tier: 1, icon: 'GX',
    description: 'Gai xương đâm mục tiêu gần nhất, đau hơn với kẻ bị Héo Mòn. Mỗi cấp: +10% sát thương, −4% hồi chiêu.',
    energyCost: sc(10), cooldownMs: sc(2500),
    effects: [dmg(circle(sc(26)), sc(100, 10), 'physical')],
    fx: 'Gai xương trồi dưới chân mục tiêu.',
  }),
  active({
    id: 'nec_wither', name: 'Héo Mòn', branch: 'deathcraft', tier: 1, icon: 'HM',
    description: 'Nguyền vùng đất: kẻ trong vùng chịu thêm sát thương. Mỗi cấp: −4% hồi chiêu.',
    energyCost: sc(18), cooldownMs: sc(9000),
    effects: [status('mark', sc(6000))],
    fx: 'Vòng tím lan trên mặt đất.',
  }),
  active({
    id: 'nec_corpse_burst', name: 'Nổ Xác', branch: 'deathcraft', tier: 2, icon: 'NX',
    requires: [req('nec_bone_spike', 1)],
    description: 'Kích nổ tối đa 4 xác gần nhất, nổ diện rộng. Mỗi cấp: +10% sát thương, −4% hồi chiêu.',
    energyCost: sc(28), cooldownMs: sc(12000),
    effects: [dmg(circle(sc(90)), sc(100, 10), 'arcane')],
    fx: 'Xác nổ thành cầu tím.',
  }),
  active({
    id: 'nec_bone_cage', name: 'Nhà Tù Xương', branch: 'deathcraft', tier: 2, icon: 'NT',
    requires: [req('nec_wither', 1)],
    description: 'Vòng xương làm chậm mạnh kẻ trong vùng (boss kháng). Mỗi cấp: −4% hồi chiêu.',
    energyCost: sc(24), cooldownMs: sc(14000),
    effects: [status('slow', sc(3000), { bossDurationMult: 0.5 })],
    fx: 'Vòng xương trắng khép lại.',
  }),
];

// ─────────────────────────────────────────────────────────────────────────────
// Xuất
// ─────────────────────────────────────────────────────────────────────────────

export const ALL_SKILL_NODES: readonly SkillNodeDefinition[] = [
  ...KNIGHT_SKILLS,
  ...MAGE_SKILLS,
  ...RANGER_SKILLS,
  ...NECROMANCER_SKILLS,
];

export const SKILL_NODES: Readonly<Record<SkillNodeId, SkillNodeDefinition>> =
  Object.fromEntries(
    ALL_SKILL_NODES.map((node) => [node.id, node]),
  ) as Record<SkillNodeId, SkillNodeDefinition>;

export function getSkillNode(id: SkillNodeId): SkillNodeDefinition {
  return SKILL_NODES[id];
}

export function isSkillNodeId(value: unknown): value is SkillNodeId {
  return typeof value === 'string' && value in SKILL_NODES;
}

export function getClassSkillNodes(
  classId: TreeClassId,
): readonly SkillNodeDefinition[] {
  return ALL_SKILL_NODES.filter((node) => node.classId === classId);
}

export function getBranchSkillNodes(
  branchId: BranchId,
): readonly SkillNodeDefinition[] {
  return ALL_SKILL_NODES.filter((node) => node.branchId === branchId);
}
