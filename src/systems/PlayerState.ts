import type { WeaponId } from '../combat/Weapon';
import type { CharacterId } from '../config/characters';
import {
  STAT_DEFINITIONS,
  STAT_POINTS_PER_LEVEL,
  type StatAllocation,
  type StatId,
} from '../config/statConfig';
import { WEAPON_INFO, isWeaponId } from '../config/weaponInfo';
import {
  GEAR_INFO,
  MAX_GEAR_LEVEL,
  isGearId,
  type GearId,
  type GearLevels,
  type GearSlot,
} from '../config/gearConfig';
import {
  MAX_SOCKETS,
  type GearSockets,
  type GemCounts,
} from '../config/gemConfig';
import { allocateItemUid } from '../progression/ItemIds';
import type {
  GearInstance,
  ItemInstance,
  WeaponInstance,
} from '../progression/ItemInstance';
import { LevelSystem } from '../progression/LevelSystem';
import { StatSheet } from '../progression/StatSheet';
import { validateSaveV8, type CharacterSaveV8 } from '../progression/saveV8';
import type { SkillId } from '../skills/skills';
import {
  canRespecFree,
  getSpentSkillPoints,
  getTotalSkillPoints,
  learnSkill,
  respecAll,
} from '../skills/tree/skillTreeRules';
import { getClassSkillNodes } from '../skills/tree/skillTreeData';
import type { SkillLevels, SkillNodeId } from '../skills/tree/skillTreeTypes';

/**
 * PlayerState (Gói C1): luật kho đồ / trang bị / cấp đồ của người chơi, THUẦN.
 * Đã nối vào WorldScene: vũ khí từ C2a, trang bị + cấp đồ từ C2b, tiến trình
 * (cấp, điểm chỉ số, cây và ô kỹ năng) từ C3. Không đụng engine đồ họa, không toast; mọi thao tác trả
 * kết quả dạng { ok: true, ... } | { ok: false, reason }. API theo defId; uid
 * chỉ là định danh bên trong và trên đĩa. Không dùng ngẫu nhiên hay thời gian.
 */

/** Luật gán một kỹ năng vào ô (lấy từ SkillDefinition lúc nối vào scene). */
export interface SkillRule {
  unlockLevel: number;
  /** Kỹ năng từ cây: phải học node này (cấp >= 1) mới dùng/gán được. */
  requiresNode?: SkillNodeId;
}

/** Luật theo lớp nhân vật (lấy từ CHARACTERS lúc nối vào scene). */
export interface PlayerRules {
  allowedWeapons: readonly WeaponId[];
  startingWeapons: readonly [WeaponId, WeaponId];
  startingGear: Readonly<Record<GearSlot, GearId>>;
  /** Mọi kỹ năng gán được của lớp (skills + treeSkills), khóa theo SkillId. */
  skills: Readonly<Partial<Record<SkillId, SkillRule>>>;
}

export type Fail<R extends string> = { ok: false; reason: R };

/** Ảnh chụp kinh tế do VillageService giữ, ghép vào save lúc lưu. */
export interface PlayerEconomy {
  gold: number;
  gems: GemCounts;
  sockets: GearSockets;
}

type WeaponSlot = 0 | 1;

/** isWeaponId/isGearId dùng `in` nên nhận cả khóa prototype (toString...); ở đây chỉ nhận khóa sở hữu. */
function knownWeapon(id: unknown): id is WeaponId {
  return (
    isWeaponId(id) && Object.prototype.hasOwnProperty.call(WEAPON_INFO, id)
  );
}

function knownGear(id: unknown): id is GearId {
  return isGearId(id) && Object.prototype.hasOwnProperty.call(GEAR_INFO, id);
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export class PlayerState {
  private items: Record<string, ItemInstance>;
  /** uid theo thứ tự thêm (vũ khí và trang bị có thể xen kẽ). */
  private bag: string[];
  private equippedWeaponUids: [string | null, string | null];
  private equippedGearUids: Record<GearSlot, string | null>;
  private nextItemSeq: number;
  private readonly rules: PlayerRules;
  // Tiến trình (C3): mỗi trường chỉ một chủ là PlayerState.
  private readonly levelSystem: LevelSystem;
  private statPoints: number;
  private readonly statSheet: StatSheet;
  private skillLoadout: [SkillId, SkillId, SkillId];
  private extraLoadout: (SkillId | null)[];
  private skillLevels: SkillLevels;

  private constructor(
    items: Record<string, ItemInstance>,
    bag: string[],
    equippedWeaponUids: [string | null, string | null],
    equippedGearUids: Record<GearSlot, string | null>,
    nextItemSeq: number,
    rules: PlayerRules,
    progress: {
      levelSystem: LevelSystem;
      statPoints: number;
      statSheet: StatSheet;
      skillLoadout: [SkillId, SkillId, SkillId];
      extraLoadout: (SkillId | null)[];
      skillLevels: SkillLevels;
    },
  ) {
    this.items = items;
    this.bag = bag;
    this.equippedWeaponUids = equippedWeaponUids;
    this.equippedGearUids = equippedGearUids;
    this.nextItemSeq = nextItemSeq;
    this.rules = rules;
    this.levelSystem = progress.levelSystem;
    this.statPoints = progress.statPoints;
    this.statSheet = progress.statSheet;
    this.skillLoadout = progress.skillLoadout;
    this.extraLoadout = progress.extraLoadout;
    this.skillLevels = progress.skillLevels;
  }

  /**
   * Nạp từ save v8, chuẩn hóa đúng như WorldScene.create hiện tại: lọc vũ khí
   * ngoài lớp, thêm vũ khí khởi đầu còn thiếu, chọn lại hai ô vũ khí. Giữ uid
   * trên đĩa; vũ khí khởi đầu mới thêm được cấp uid mới từ nextItemSeq.
   * Trang bị giữ nguyên như save (không lọc).
   */
  static fromSave(save: CharacterSaveV8, rules: PlayerRules): PlayerState {
    const items = cloneJson(save.items);
    const bag = [...save.bag];
    let nextItemSeq = save.nextItemSeq;
    const allowed = rules.allowedWeapons;

    // Lọc vũ khí không thuộc lớp (uid bị bỏ không bao giờ được cấp lại).
    for (const uid of [...bag]) {
      const item = items[uid];

      if (item && item.kind === 'weapon' && !allowed.includes(item.defId)) {
        delete items[uid];
        bag.splice(bag.indexOf(uid), 1);
      }
    }

    const weaponUidOf = (defId: WeaponId): string | undefined =>
      bag.find((uid) => {
        const item = items[uid];

        return item?.kind === 'weapon' && item.defId === defId;
      });

    // Bảo đảm luôn có vũ khí khởi đầu.
    for (const starting of rules.startingWeapons) {
      if (weaponUidOf(starting) === undefined) {
        const allocated = allocateItemUid('weapon', nextItemSeq);

        nextItemSeq = allocated.nextItemSeq;
        items[allocated.uid] = {
          uid: allocated.uid,
          kind: 'weapon',
          defId: starting,
          level: 1,
        };
        bag.push(allocated.uid);
      }
    }

    // Như keepIfAllowed của WorldScene, đọc defId từ save gốc (trước khi lọc).
    const keepIfAllowed = (uid: string | null): WeaponId | null => {
      const item = uid === null ? undefined : save.items[uid];

      return item && item.kind === 'weapon' && allowed.includes(item.defId)
        ? item.defId
        : null;
    };
    const firstEquip = keepIfAllowed(save.equippedWeapons[0]);
    const secondEquip = keepIfAllowed(save.equippedWeapons[1]);
    const first: WeaponId =
      firstEquip ??
      (secondEquip === rules.startingWeapons[0]
        ? rules.startingWeapons[1]
        : rules.startingWeapons[0]);
    const second: WeaponId | null =
      secondEquip === firstEquip ? null : secondEquip;
    const firstUid = weaponUidOf(first);
    const secondUid = second === null ? undefined : weaponUidOf(second);

    return new PlayerState(
      items,
      bag,
      [firstUid ?? null, secondUid ?? null],
      {
        hat: save.equippedGear.hat,
        armor: save.equippedGear.armor,
        boots: save.equippedGear.boots,
      },
      nextItemSeq,
      rules,
      {
        levelSystem: new LevelSystem({
          level: save.level,
          xp: save.xp,
          xpToNext: save.xpToNext,
        }),
        statPoints: save.statPoints,
        statSheet: new StatSheet({ ...save.stats }),
        skillLoadout: [
          save.skillLoadout[0],
          save.skillLoadout[1],
          save.skillLoadout[2],
        ],
        extraLoadout: [...save.extraSkills],
        skillLevels: { ...save.skillLevels },
      },
    );
  }

  // ---------------------------------------------------------------- tra cứu nội bộ

  private findUid(kind: 'weapon' | 'gear', defId: string): string | undefined {
    return this.bag.find((uid) => {
      const item = this.items[uid];

      return item !== undefined && item.kind === kind && item.defId === defId;
    });
  }

  private weaponItem(id: WeaponId): WeaponInstance | undefined {
    const uid = this.findUid('weapon', id);
    const item = uid === undefined ? undefined : this.items[uid];

    return item?.kind === 'weapon' ? item : undefined;
  }

  private gearItem(id: GearId): GearInstance | undefined {
    const uid = this.findUid('gear', id);
    const item = uid === undefined ? undefined : this.items[uid];

    return item?.kind === 'gear' ? item : undefined;
  }

  private defOfUid(uid: string | null): string | null {
    const item = uid === null ? undefined : this.items[uid];

    return item ? item.defId : null;
  }

  private addItem(item: ItemInstance): void {
    this.items[item.uid] = item;
    this.bag.push(item.uid);
  }

  private removeItem(uid: string): void {
    delete this.items[uid];
    this.bag = this.bag.filter((entry) => entry !== uid);
  }

  // ---------------------------------------------------------------- vũ khí

  ownsWeapon(id: WeaponId): boolean {
    return this.weaponItem(id) !== undefined;
  }

  /** Vũ khí trong túi, theo thứ tự thêm. */
  getWeapons(): WeaponId[] {
    const result: WeaponId[] = [];

    for (const uid of this.bag) {
      const item = this.items[uid];

      if (item?.kind === 'weapon') {
        result.push(item.defId);
      }
    }

    return result;
  }

  getEquippedWeapons(): [WeaponId | null, WeaponId | null] {
    return [
      this.defOfUid(this.equippedWeaponUids[0]) as WeaponId | null,
      this.defOfUid(this.equippedWeaponUids[1]) as WeaponId | null,
    ];
  }

  private isWeaponEquipped(id: WeaponId): boolean {
    return this.getEquippedWeapons().includes(id);
  }

  addWeapon(id: WeaponId): { ok: true } | Fail<'owned' | 'unknown_id'> {
    if (!knownWeapon(id)) {
      return { ok: false, reason: 'unknown_id' };
    }

    if (this.ownsWeapon(id)) {
      return { ok: false, reason: 'owned' };
    }

    const allocated = allocateItemUid('weapon', this.nextItemSeq);

    this.nextItemSeq = allocated.nextItemSeq;
    this.addItem({
      uid: allocated.uid,
      kind: 'weapon',
      defId: id,
      level: 1,
    });

    return { ok: true };
  }

  removeWeapon(
    id: WeaponId,
  ): { ok: true } | Fail<'not_owned' | 'equipped'> {
    const item = this.weaponItem(id);

    if (!item) {
      return { ok: false, reason: 'not_owned' };
    }

    if (this.isWeaponEquipped(id)) {
      return { ok: false, reason: 'equipped' };
    }

    this.removeItem(item.uid);

    return { ok: true };
  }

  /** Thứ tự kiểm đúng như WorldScene.equipWeaponFromInventory. */
  equipWeapon(
    id: WeaponId,
    slot: WeaponSlot,
  ): { ok: true } | Fail<'not_allowed' | 'not_owned' | 'in_other_slot'> {
    if (!this.rules.allowedWeapons.includes(id)) {
      return { ok: false, reason: 'not_allowed' };
    }

    const item = this.weaponItem(id);

    if (!item) {
      return { ok: false, reason: 'not_owned' };
    }

    const otherSlot: WeaponSlot = slot === 0 ? 1 : 0;

    if (this.equippedWeaponUids[otherSlot] === item.uid) {
      return { ok: false, reason: 'in_other_slot' };
    }

    this.equippedWeaponUids[slot] = item.uid;

    return { ok: true };
  }

  unequipWeapon(slot: WeaponSlot): { ok: true; id: WeaponId } | Fail<'empty'> {
    const uid = this.equippedWeaponUids[slot] ?? null;
    const def = this.defOfUid(uid);

    if (uid === null || def === null) {
      return { ok: false, reason: 'empty' };
    }

    this.equippedWeaponUids[slot] = null;

    return { ok: true, id: def as WeaponId };
  }

  discardWeapon(id: WeaponId): { ok: true } | Fail<'not_owned' | 'equipped'> {
    const item = this.weaponItem(id);

    if (!item) {
      return { ok: false, reason: 'not_owned' };
    }

    if (this.isWeaponEquipped(id)) {
      return { ok: false, reason: 'equipped' };
    }

    this.removeItem(item.uid);

    return { ok: true };
  }

  // ---------------------------------------------------------------- trang bị + cấp

  ownsGear(id: GearId): boolean {
    return this.gearItem(id) !== undefined;
  }

  /** Trang bị trong túi, theo thứ tự thêm. */
  getGear(): GearId[] {
    const result: GearId[] = [];

    for (const uid of this.bag) {
      const item = this.items[uid];

      if (item?.kind === 'gear') {
        result.push(item.defId);
      }
    }

    return result;
  }

  getEquippedGear(): Record<GearSlot, GearId | null> {
    return {
      hat: this.defOfUid(this.equippedGearUids.hat) as GearId | null,
      armor: this.defOfUid(this.equippedGearUids.armor) as GearId | null,
      boots: this.defOfUid(this.equippedGearUids.boots) as GearId | null,
    };
  }

  private isGearEquipped(id: GearId): boolean {
    return Object.values(this.getEquippedGear()).includes(id);
  }

  /** Chỉ các món có cấp > 1 (đúng quy ước normalizer v7). */
  getGearLevels(): GearLevels {
    const levels: GearLevels = {};

    for (const uid of this.bag) {
      const item = this.items[uid];

      if (item?.kind === 'gear' && item.level > 1) {
        levels[item.defId] = item.level;
      }
    }

    return levels;
  }

  /** Cấp món đồ; món không có trong túi trả 1 (như getGearItemLevel). */
  getGearLevel(id: GearId): number {
    return this.gearItem(id)?.level ?? 1;
  }

  /** Kẹp [1, MAX_GEAR_LEVEL], làm tròn xuống; NaN coi là 1. */
  setGearLevel(
    id: GearId,
    level: number,
  ): { ok: true } | Fail<'not_owned'> {
    const item = this.gearItem(id);

    if (!item) {
      return { ok: false, reason: 'not_owned' };
    }

    item.level = PlayerState.clampLevel(level);

    return { ok: true };
  }

  private static clampLevel(level: number): number {
    const value = Number.isNaN(level) ? 1 : Math.floor(level);

    return Math.min(MAX_GEAR_LEVEL, Math.max(1, value));
  }

  private insertGear(id: GearId): GearInstance {
    const allocated = allocateItemUid('gear', this.nextItemSeq);
    const item: GearInstance = {
      uid: allocated.uid,
      kind: 'gear',
      defId: id,
      level: 1,
      sockets: [],
    };

    this.nextItemSeq = allocated.nextItemSeq;
    this.addItem(item);

    return item;
  }

  addGear(id: GearId): { ok: true } | Fail<'owned' | 'unknown_id'> {
    if (!knownGear(id)) {
      return { ok: false, reason: 'unknown_id' };
    }

    if (this.ownsGear(id)) {
      return { ok: false, reason: 'owned' };
    }

    this.insertGear(id);

    return { ok: true };
  }

  /** Luật grantBossLoot: lên max(tier+1, cấp hiện tại+1), kẹp MAX; thêm món nếu chưa có. */
  rewardGear(
    id: GearId,
    tier: number,
  ): { ok: true; level: number } | Fail<'unknown_id'> {
    if (!knownGear(id)) {
      return { ok: false, reason: 'unknown_id' };
    }

    const item = this.gearItem(id) ?? this.insertGear(id);
    const safeTier = Number.isNaN(tier) ? 0 : tier;
    const level = PlayerState.clampLevel(
      Math.max(safeTier + 1, item.level + 1),
    );

    item.level = level;

    return { ok: true, level };
  }

  removeGear(id: GearId): { ok: true } | Fail<'not_owned' | 'equipped'> {
    const item = this.gearItem(id);

    if (!item) {
      return { ok: false, reason: 'not_owned' };
    }

    if (this.isGearEquipped(id)) {
      return { ok: false, reason: 'equipped' };
    }

    this.removeItem(item.uid);

    return { ok: true };
  }

  /** Thứ tự kiểm đúng như WorldScene.equipGearFromInventory. */
  equipGear(
    id: GearId,
  ):
    | { ok: true; slot: GearSlot }
    | Fail<'unknown_id' | 'not_owned' | 'already_equipped'> {
    if (!knownGear(id)) {
      return { ok: false, reason: 'unknown_id' };
    }

    const item = this.gearItem(id);

    if (!item) {
      return { ok: false, reason: 'not_owned' };
    }

    const slot = GEAR_INFO[id].slot;

    if (this.equippedGearUids[slot] === item.uid) {
      return { ok: false, reason: 'already_equipped' };
    }

    this.equippedGearUids[slot] = item.uid;

    return { ok: true, slot };
  }

  unequipGear(slot: GearSlot): { ok: true; id: GearId } | Fail<'empty'> {
    const uid = this.equippedGearUids[slot] ?? null;
    const def = this.defOfUid(uid);

    if (uid === null || def === null) {
      return { ok: false, reason: 'empty' };
    }

    this.equippedGearUids[slot] = null;

    return { ok: true, id: def as GearId };
  }

  discardGear(id: GearId): { ok: true } | Fail<'not_owned' | 'equipped'> {
    const item = this.gearItem(id);

    if (!item) {
      return { ok: false, reason: 'not_owned' };
    }

    if (this.isGearEquipped(id)) {
      return { ok: false, reason: 'equipped' };
    }

    this.removeItem(item.uid);

    return { ok: true };
  }

  /**
   * Lỗ ngọc đọc từ instance gear lúc nạp, để scene giao cho VillageService.
   * Chỉ trả món có mảng không rỗng (quy ước normalizer v7); bản sao sâu.
   */
  getLoadedSockets(): GearSockets {
    const sockets: GearSockets = {};

    for (const uid of this.bag) {
      const item = this.items[uid];

      if (item?.kind === 'gear' && item.sockets.length > 0) {
        sockets[item.defId] = [...item.sockets];
      }
    }

    return sockets;
  }

  // ---------------------------------------------------------------- tiến trình (C3)

  /** Đối tượng LevelSystem do PlayerState giữ (Hud đọc; không ai khác được giữ bản thứ hai). */
  getLevelSystem(): LevelSystem {
    return this.levelSystem;
  }

  getLevel(): number {
    return this.levelSystem.getLevel();
  }

  /**
   * Cộng XP. Lên cấp thì cộng STAT_POINTS_PER_LEVEL điểm chỉ số mỗi cấp.
   * Điểm kỹ năng không lưu bộ đếm: luôn suy ra từ level.
   */
  grantExperience(amount: number): {
    previousLevel: number;
    level: number;
    levelsGained: number;
    statPointsGained: number;
  } {
    const previousLevel = this.levelSystem.getLevel();
    const levelsGained = this.levelSystem.addXp(amount);
    const statPointsGained = levelsGained * STAT_POINTS_PER_LEVEL;

    if (levelsGained > 0) {
      this.statPoints += statPointsGained;
    }

    return {
      previousLevel,
      level: this.levelSystem.getLevel(),
      levelsGained,
      statPointsGained,
    };
  }

  getStatPoints(): number {
    return this.statPoints;
  }

  /** Cộng điểm chỉ số chưa tiêu; bỏ qua số không hợp lệ (<= 0, NaN, vô hạn). */
  addStatPoints(n: number): void {
    if (Number.isFinite(n) && n > 0) {
      this.statPoints += Math.floor(n);
    }
  }

  /** Tiêu 1 điểm chỉ số (thứ tự kiểm như WorldScene.addStatPoint: hết điểm trước). */
  spendStatPoint(
    statId: StatId,
  ): { ok: true } | Fail<'no_points' | 'unknown_stat'> {
    if (this.statPoints <= 0) {
      return { ok: false, reason: 'no_points' };
    }

    if (!STAT_DEFINITIONS.some((definition) => definition.id === statId)) {
      return { ok: false, reason: 'unknown_stat' };
    }

    this.statPoints -= 1;
    this.statSheet.addPoint(statId);

    return { ok: true };
  }

  getAllocation(): StatAllocation {
    return this.statSheet.getAllocation();
  }

  /** StatSheet do PlayerState giữ (chỉ đọc getCombatStats/getAllocation; thay đổi qua spendStatPoint). */
  getStatSheet(): StatSheet {
    return this.statSheet;
  }

  /** Bản sao các cấp node đã học. */
  getSkillLevels(): SkillLevels {
    return { ...this.skillLevels };
  }

  /** Cấp đã học của một node (0 nếu chưa học). */
  getSkillLevel(nodeId: SkillNodeId): number {
    return this.skillLevels[nodeId] ?? 0;
  }

  /** Điểm kỹ năng: tổng nhận (level − 1), đã tiêu, còn lại. Không lưu, luôn tính lại. */
  getSkillPointSummary(): { earned: number; spent: number; available: number } {
    const earned = getTotalSkillPoints(this.levelSystem.getLevel());
    const spent = getSpentSkillPoints(this.skillLevels);

    return { earned, spent, available: Math.max(0, earned - spent) };
  }

  /**
   * Học hoặc nâng 1 cấp. Lý do từ chối là chuỗi hiển thị nguyên văn (như
   * WorldScene.learnSkillNode). Thất bại không đổi dữ liệu.
   */
  learnSkillNode(
    id: SkillNodeId,
    characterId: CharacterId,
  ): { ok: true } | Fail<string> {
    const node = getClassSkillNodes(characterId).find(
      (entry) => entry.id === id,
    );

    if (!node) {
      return { ok: false, reason: 'Kỹ năng không thuộc lớp này' };
    }

    const result = learnSkill(id, this.levelSystem.getLevel(), this.skillLevels);

    if (!result.ok) {
      return { ok: false, reason: result.reason };
    }

    this.skillLevels = { ...result.levels };

    return { ok: true };
  }

  /** Hồi toàn bộ điểm kỹ năng; miễn phí tới Lv10, sau đó bị từ chối. */
  respecSkills(): { ok: true } | Fail<'not_free'> {
    if (!canRespecFree(this.levelSystem.getLevel())) {
      return { ok: false, reason: 'not_free' };
    }

    this.skillLevels = respecAll();

    return { ok: true };
  }

  /** 7 ô: 0–2 chính, 3–6 phụ (null = trống). Bản sao. */
  getSlotIds(): (SkillId | null)[] {
    return [...this.skillLoadout, ...this.extraLoadout];
  }

  private isSkillNodeLearned(rule: SkillRule): boolean {
    return (
      !rule.requiresNode || (this.skillLevels[rule.requiresNode] ?? 0) >= 1
    );
  }

  private applySlotIds(slots: readonly (SkillId | null)[]): void {
    this.skillLoadout = [
      slots[0] as SkillId,
      slots[1] as SkillId,
      slots[2] as SkillId,
    ];
    this.extraLoadout = slots.slice(3, 7);
  }

  /**
   * Gán kỹ năng vào ô 0–6 (0–2 chính, 3–6 phụ); kỹ năng đã nằm ở ô khác thì hoán đổi.
   * Thứ tự kiểm như WorldScene.assignSkillToSlot. 'not_learned' ưu tiên 'level_locked'
   * khi cả hai cùng đúng (đúng như toast cũ).
   */
  assignSkill(
    skillId: SkillId,
    slot: number,
  ):
    | { ok: true }
    | Fail<
        | 'invalid_slot'
        | 'unknown_skill'
        | 'not_learned'
        | 'level_locked'
        | 'same_slot'
        | 'main_slot_empty'
      > {
    const slots = this.getSlotIds();

    if (!Number.isInteger(slot) || slot < 0 || slot >= slots.length) {
      return { ok: false, reason: 'invalid_slot' };
    }

    const rule = Object.prototype.hasOwnProperty.call(this.rules.skills, skillId)
      ? this.rules.skills[skillId]
      : undefined;

    if (!rule) {
      return { ok: false, reason: 'unknown_skill' };
    }

    const learned = this.isSkillNodeLearned(rule);

    if (this.levelSystem.getLevel() < rule.unlockLevel || !learned) {
      return {
        ok: false,
        reason: rule.requiresNode && !learned ? 'not_learned' : 'level_locked',
      };
    }

    const existingSlot = slots.indexOf(skillId);

    if (existingSlot === slot) {
      return { ok: false, reason: 'same_slot' };
    }

    const replaced = slots[slot] ?? null;

    // Ô chính (0–2) không được để trống: không hoán đổi nếu sẽ làm trống ô chính.
    if (existingSlot !== -1 && existingSlot < 3 && replaced === null) {
      return { ok: false, reason: 'main_slot_empty' };
    }

    slots[slot] = skillId;

    if (existingSlot !== -1) {
      slots[existingSlot] = replaced;
    }

    this.applySlotIds(slots);

    return { ok: true };
  }

  /** Bỏ kỹ năng khỏi ô phụ (3–6). */
  clearSkillSlot(slot: number): { ok: true } | Fail<'invalid_slot' | 'empty'> {
    const slots = this.getSlotIds();

    if (!Number.isInteger(slot) || slot < 3 || slot >= slots.length) {
      return { ok: false, reason: 'invalid_slot' };
    }

    if (!slots[slot]) {
      return { ok: false, reason: 'empty' };
    }

    slots[slot] = null;
    this.applySlotIds(slots);

    return { ok: true };
  }

  // ---------------------------------------------------------------- lưu

  /**
   * Dựng save v8: tiến trình (cấp/XP, điểm chỉ số, kỹ năng) và kho đồ lấy từ
   * PlayerState; mọi trường còn lại lấy từ `base` (sao chép sâu);
   * gold/gems từ economy; lỗ ngọc từng món = economy.sockets[defId] cắt tối đa
   * MAX_SOCKETS (món không có trong túi bị bỏ). Kết quả luôn qua validateSaveV8;
   * lỗi → ném Error (lỗi lập trình, không phải đầu vào người dùng).
   */
  toSave(economy: PlayerEconomy, base: CharacterSaveV8): CharacterSaveV8 {
    const out = cloneJson(base);
    const items: Record<string, ItemInstance> = {};

    for (const uid of this.bag) {
      const item = this.items[uid];

      if (!item) {
        continue;
      }

      if (item.kind === 'weapon') {
        items[uid] = { uid, kind: 'weapon', defId: item.defId, level: 1 };
      } else {
        items[uid] = {
          uid,
          kind: 'gear',
          defId: item.defId,
          level: item.level,
          sockets: cloneJson(
            (economy.sockets[item.defId] ?? []).slice(0, MAX_SOCKETS),
          ),
        };
      }
    }

    out.gold = economy.gold;
    out.gems = cloneJson(economy.gems);
    out.items = items;
    out.bag = [...this.bag];
    out.equippedWeapons = [
      this.equippedWeaponUids[0],
      this.equippedWeaponUids[1],
    ];
    out.equippedGear = {
      hat: this.equippedGearUids.hat,
      armor: this.equippedGearUids.armor,
      boots: this.equippedGearUids.boots,
    };
    out.nextItemSeq = this.nextItemSeq;

    const levelState = this.levelSystem.getState();

    out.level = levelState.level;
    out.xp = levelState.xp;
    out.xpToNext = levelState.xpToNext;
    out.statPoints = this.statPoints;
    out.stats = this.statSheet.getAllocation();
    out.skillLoadout = [
      this.skillLoadout[0],
      this.skillLoadout[1],
      this.skillLoadout[2],
    ];
    out.extraSkills = [...this.extraLoadout];
    out.skillLevels = cloneJson(this.skillLevels);

    const errors = validateSaveV8(out);

    if (errors.length > 0) {
      throw new Error(`PlayerState.toSave: save không hợp lệ: ${errors.join('; ')}`);
    }

    return out;
  }
}
