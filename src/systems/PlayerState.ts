import type { WeaponId } from '../combat/Weapon';
import {
  GEAR_INFO,
  MAX_GEAR_LEVEL,
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
import { validateSaveV8, type CharacterSaveV8 } from '../progression/saveV8';

/**
 * PlayerState (Gói C1): luật kho đồ / trang bị / cấp đồ của người chơi, THUẦN.
 * Chưa nối vào game (dự kiến C2a). Không đụng engine đồ họa, không toast; mọi thao tác trả
 * kết quả dạng { ok: true, ... } | { ok: false, reason }. API theo defId; uid
 * chỉ là định danh bên trong và trên đĩa. Không dùng ngẫu nhiên hay thời gian.
 */

/** Luật theo lớp nhân vật (lấy từ CHARACTERS lúc nối vào scene). */
export interface PlayerRules {
  allowedWeapons: readonly WeaponId[];
  startingWeapons: readonly [WeaponId, WeaponId];
  startingGear: Readonly<Record<GearSlot, GearId>>;
}

export type Fail<R extends string> = { ok: false; reason: R };

/** Ảnh chụp kinh tế do VillageService giữ, ghép vào save lúc lưu. */
export interface PlayerEconomy {
  gold: number;
  gems: GemCounts;
  sockets: GearSockets;
}

type WeaponSlot = 0 | 1;

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

  private constructor(
    items: Record<string, ItemInstance>,
    bag: string[],
    equippedWeaponUids: [string | null, string | null],
    equippedGearUids: Record<GearSlot, string | null>,
    nextItemSeq: number,
    rules: PlayerRules,
  ) {
    this.items = items;
    this.bag = bag;
    this.equippedWeaponUids = equippedWeaponUids;
    this.equippedGearUids = equippedGearUids;
    this.nextItemSeq = nextItemSeq;
    this.rules = rules;
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

  addWeapon(id: WeaponId): { ok: true } | Fail<'owned'> {
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

  addGear(id: GearId): { ok: true } | Fail<'owned'> {
    if (this.ownsGear(id)) {
      return { ok: false, reason: 'owned' };
    }

    this.insertGear(id);

    return { ok: true };
  }

  /** Luật grantBossLoot: lên max(tier+1, cấp hiện tại+1), kẹp MAX; thêm món nếu chưa có. */
  rewardGear(id: GearId, tier: number): { ok: true; level: number } {
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
  ): { ok: true; slot: GearSlot } | Fail<'not_owned' | 'already_equipped'> {
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

  // ---------------------------------------------------------------- lưu

  /**
   * Dựng save v8: mọi trường không thuộc kho đồ lấy từ `base` (sao chép sâu);
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

    const errors = validateSaveV8(out);

    if (errors.length > 0) {
      throw new Error(`PlayerState.toSave: save không hợp lệ: ${errors.join('; ')}`);
    }

    return out;
  }
}
