import type { WeaponId } from '../combat/Weapon';
import {
  DRILL_COSTS,
  DRILL_FAIL_CHANCE,
  GEAR_BUY_PRICE,
  GEM_BUY_PRICE,
  GEM_EXCHANGE_COUNT,
  GEM_EXCHANGE_FEE,
  GEM_SELL_PRICE,
  SELL_BONUS_PER_LEVEL,
  SELL_RATIO,
  UNSOCKET_FEE,
  UPGRADE_BASE_COST,
  UPGRADE_COST_PER_LEVEL,
  WEAPON_BUY_PRICE,
} from '../config/economyConfig';
import {
  GEAR_IDS,
  GEAR_INFO,
  MAX_GEAR_LEVEL,
  type GearId,
} from '../config/gearConfig';
import {
  GEM_INFO,
  MAX_SOCKETS,
  createEmptyGemCounts,
  type GearSockets,
  type GemCounts,
  type GemId,
} from '../config/gemConfig';
import { WEAPON_INFO } from '../config/weaponInfo';

export interface ActionResult {
  ok: boolean;
  message: string;
}

/** Những gì VillageService cần từ WorldScene để đụng tới túi đồ/trang bị. */
export interface VillageHost {
  getAllowedWeapons(): readonly WeaponId[];
  isStartingWeapon(id: WeaponId): boolean;
  ownsWeapon(id: WeaponId): boolean;
  isWeaponEquipped(id: WeaponId): boolean;
  addWeapon(id: WeaponId): void;
  removeWeapon(id: WeaponId): void;
  ownsGear(id: GearId): boolean;
  isGearEquipped(id: GearId): boolean;
  addGear(id: GearId): void;
  removeGear(id: GearId): void;
  getGearLevel(id: GearId): number;
  setGearLevel(id: GearId, level: number): void;
  /** Gọi sau mỗi thay đổi: tính lại chỉ số, lưu game, cập nhật HUD. */
  onChanged(): void;
}

const fail = (message: string): ActionResult => ({ ok: false, message });
const done = (message: string): ActionResult => ({ ok: true, message });

/**
 * Vàng, ngọc, lỗ ngọc và mọi giao dịch ở làng (thương nhân + thợ rèn).
 * Chỉ giữ dữ liệu kinh tế; túi đồ thật nằm ở WorldScene, truy cập qua `VillageHost`.
 */
export class VillageService {
  private gold: number;
  private readonly gems: GemCounts;
  private readonly sockets: GearSockets;

  private readonly host: VillageHost;

  constructor(
    host: VillageHost,
    initial: { gold: number; gems: GemCounts; sockets: GearSockets },
  ) {
    this.host = host;
    this.gold = initial.gold;
    this.gems = { ...createEmptyGemCounts(), ...initial.gems };
    this.sockets = {};

    for (const [gearId, list] of Object.entries(initial.sockets)) {
      this.sockets[gearId as GearId] = [...(list ?? [])];
    }
  }

  // ---- Đọc ----
  getGold(): number {
    return this.gold;
  }

  getGems(): Readonly<GemCounts> {
    return this.gems;
  }

  getSockets(gearId: GearId): readonly (GemId | null)[] {
    return this.sockets[gearId] ?? [];
  }

  getSocketsSnapshot(): GearSockets {
    const copy: GearSockets = {};

    for (const [gearId, list] of Object.entries(this.sockets)) {
      copy[gearId as GearId] = [...(list ?? [])];
    }

    return copy;
  }

  // ---- Giá ----
  getWeaponBuyPrice(id: WeaponId): number {
    return WEAPON_BUY_PRICE[WEAPON_INFO[id].rarity];
  }

  getGearBuyPrice(id: GearId): number {
    return GEAR_BUY_PRICE[GEAR_INFO[id].rarity];
  }

  getWeaponSellPrice(id: WeaponId): number {
    return Math.floor(this.getWeaponBuyPrice(id) * SELL_RATIO);
  }

  getGearSellPrice(id: GearId): number {
    const level = this.host.getGearLevel(id);

    return Math.floor(
      this.getGearBuyPrice(id) *
        SELL_RATIO *
        (1 + (level - 1) * SELL_BONUS_PER_LEVEL),
    );
  }

  getUpgradeCost(id: GearId): number {
    const level = this.host.getGearLevel(id);

    return Math.round(
      UPGRADE_BASE_COST[GEAR_INFO[id].rarity] *
        (1 + level * UPGRADE_COST_PER_LEVEL),
    );
  }

  /** Giá đục lỗ kế tiếp; null nếu đã đủ lỗ. */
  getDrillCost(id: GearId): number | null {
    const count = this.getSockets(id).length;

    return count >= MAX_SOCKETS ? null : (DRILL_COSTS[count] ?? null);
  }

  // ---- Hàng bán ----
  getWeaponStock(): WeaponId[] {
    return this.host
      .getAllowedWeapons()
      .filter((id) => !this.host.ownsWeapon(id));
  }

  getGearStock(): GearId[] {
    return GEAR_IDS.filter((id) => !this.host.ownsGear(id));
  }

  /** Món đồ bị vứt/biến mất: trả ngọc đã khảm về túi và xoá lỗ. */
  releaseGear(id: GearId): void {
    for (const gem of this.getSockets(id)) {
      if (gem) {
        this.gems[gem] += 1;
      }
    }

    delete this.sockets[id];
  }

  // ---- Vàng/ngọc từ chiến đấu ----
  addGold(amount: number): void {
    this.gold += Math.max(0, Math.floor(amount));
  }

  addGem(id: GemId, count = 1): void {
    this.gems[id] += count;
  }

  private spend(amount: number): boolean {
    if (this.gold < amount) {
      return false;
    }

    this.gold -= amount;
    return true;
  }

  // ---- Thương nhân ----
  buyWeapon(id: WeaponId): ActionResult {
    if (this.host.ownsWeapon(id)) {
      return fail('ĐÃ SỞ HỮU');
    }

    if (!this.spend(this.getWeaponBuyPrice(id))) {
      return fail('KHÔNG ĐỦ VÀNG');
    }

    this.host.addWeapon(id);
    this.host.onChanged();
    return done(`ĐÃ MUA ${WEAPON_INFO[id].name}`);
  }

  buyGear(id: GearId): ActionResult {
    if (this.host.ownsGear(id)) {
      return fail('ĐÃ SỞ HỮU');
    }

    if (!this.spend(this.getGearBuyPrice(id))) {
      return fail('KHÔNG ĐỦ VÀNG');
    }

    this.host.addGear(id);
    this.host.onChanged();
    return done(`ĐÃ MUA ${GEAR_INFO[id].name}`);
  }

  buyGem(id: GemId): ActionResult {
    if (!this.spend(GEM_BUY_PRICE)) {
      return fail('KHÔNG ĐỦ VÀNG');
    }

    this.gems[id] += 1;
    this.host.onChanged();
    return done(`ĐÃ MUA ${GEM_INFO[id].name}`);
  }

  sellWeapon(id: WeaponId): ActionResult {
    if (!this.host.ownsWeapon(id)) {
      return fail('KHÔNG CÓ VẬT PHẨM');
    }

    if (this.host.isWeaponEquipped(id) || this.host.isStartingWeapon(id)) {
      return fail('KHÔNG BÁN ĐƯỢC ĐỒ ĐANG DÙNG / ĐỒ KHỞI ĐẦU');
    }

    const price = this.getWeaponSellPrice(id);

    this.host.removeWeapon(id);
    this.gold += price;
    this.host.onChanged();
    return done(`ĐÃ BÁN ${WEAPON_INFO[id].name} +${price}`);
  }

  sellGear(id: GearId): ActionResult {
    if (!this.host.ownsGear(id)) {
      return fail('KHÔNG CÓ VẬT PHẨM');
    }

    if (this.host.isGearEquipped(id)) {
      return fail('HÃY THÁO ĐỒ TRƯỚC KHI BÁN');
    }

    const price = this.getGearSellPrice(id);

    // Ngọc đã khảm được trả lại túi, không mất theo đồ.
    for (const gem of this.getSockets(id)) {
      if (gem) {
        this.gems[gem] += 1;
      }
    }

    delete this.sockets[id];
    this.host.removeGear(id);
    this.gold += price;
    this.host.onChanged();
    return done(`ĐÃ BÁN ${GEAR_INFO[id].name} +${price}`);
  }

  sellGem(id: GemId): ActionResult {
    if (this.gems[id] <= 0) {
      return fail('KHÔNG CÓ NGỌC');
    }

    this.gems[id] -= 1;
    this.gold += GEM_SELL_PRICE;
    this.host.onChanged();
    return done(`ĐÃ BÁN ${GEM_INFO[id].name} +${GEM_SELL_PRICE}`);
  }

  /** Đổi `GEM_EXCHANGE_COUNT` ngọc loại `from` lấy 1 ngọc loại `to`. */
  exchangeGem(from: GemId, to: GemId): ActionResult {
    if (from === to) {
      return fail('CHỌN LOẠI NGỌC KHÁC');
    }

    if (this.gems[from] < GEM_EXCHANGE_COUNT) {
      return fail(`CẦN ${GEM_EXCHANGE_COUNT} ${GEM_INFO[from].name}`);
    }

    if (!this.spend(GEM_EXCHANGE_FEE)) {
      return fail('KHÔNG ĐỦ VÀNG');
    }

    this.gems[from] -= GEM_EXCHANGE_COUNT;
    this.gems[to] += 1;
    this.host.onChanged();
    return done(`ĐỔI ĐƯỢC ${GEM_INFO[to].name}`);
  }

  // ---- Thợ rèn ----
  upgradeGear(id: GearId): ActionResult {
    if (!this.host.ownsGear(id)) {
      return fail('KHÔNG CÓ TRANG BỊ');
    }

    const level = this.host.getGearLevel(id);

    if (level >= MAX_GEAR_LEVEL) {
      return fail('ĐÃ ĐẠT CẤP TỐI ĐA');
    }

    if (!this.spend(this.getUpgradeCost(id))) {
      return fail('KHÔNG ĐỦ VÀNG');
    }

    this.host.setGearLevel(id, level + 1);
    this.host.onChanged();
    return done(`${GEAR_INFO[id].name} LÊN CẤP ${level + 1}`);
  }

  drillSocket(id: GearId): ActionResult {
    if (!this.host.ownsGear(id)) {
      return fail('KHÔNG CÓ TRANG BỊ');
    }

    const cost = this.getDrillCost(id);

    if (cost === null) {
      return fail('ĐÃ ĐỦ LỖ');
    }

    if (!this.spend(cost)) {
      return fail('KHÔNG ĐỦ VÀNG');
    }

    if (Math.random() < DRILL_FAIL_CHANCE) {
      this.host.onChanged();
      return fail('ĐỤC THẤT BẠI — MẤT VÀNG');
    }

    const list = this.sockets[id] ?? [];

    list.push(null);
    this.sockets[id] = list;
    this.host.onChanged();
    return done(`ĐỤC THÀNH CÔNG LỖ ${list.length}/${MAX_SOCKETS}`);
  }

  socketGem(id: GearId, index: number, gem: GemId): ActionResult {
    const list = this.sockets[id];

    if (!list || index < 0 || index >= list.length) {
      return fail('KHÔNG CÓ LỖ NGỌC');
    }

    if (list[index] !== null) {
      return fail('LỖ ĐÃ CÓ NGỌC — THÁO TRƯỚC');
    }

    if (this.gems[gem] <= 0) {
      return fail('KHÔNG CÓ NGỌC NÀY');
    }

    this.gems[gem] -= 1;
    list[index] = gem;
    this.host.onChanged();
    return done(`ĐÃ KHẢM ${GEM_INFO[gem].name}`);
  }

  removeGem(id: GearId, index: number): ActionResult {
    const list = this.sockets[id];
    const gem = list?.[index];

    if (!list || !gem) {
      return fail('LỖ TRỐNG');
    }

    if (!this.spend(UNSOCKET_FEE)) {
      return fail('KHÔNG ĐỦ VÀNG ĐỂ THÁO');
    }

    list[index] = null;
    this.gems[gem] += 1;
    this.host.onChanged();
    return done(`ĐÃ THÁO ${GEM_INFO[gem].name}`);
  }
}
