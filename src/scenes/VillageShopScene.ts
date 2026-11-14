import Phaser from 'phaser';

import { DESIGN_HEIGHT, DESIGN_WIDTH, SCENE_KEYS } from '../config/constants';
import {
  GEM_EXCHANGE_COUNT,
  GEM_EXCHANGE_FEE,
  GEM_BUY_PRICE,
  GEM_SELL_PRICE,
  UNSOCKET_FEE,
  VILLAGE_NPCS,
  type NpcRole,
} from '../config/economyConfig';
import {
  GEAR_INFO,
  GEAR_SLOT_LABELS,
  MAX_GEAR_LEVEL,
  getGearBonusLines,
  type GearId,
} from '../config/gearConfig';
import {
  GEM_IDS,
  GEM_INFO,
  MAX_SOCKETS,
  type GemId,
} from '../config/gemConfig';
import {
  WEAPON_INFO,
  WEAPON_RARITY_LABELS,
} from '../config/weaponInfo';
import { toDisplayHealth } from '../config/scaleConfig';
import type { ActionResult } from '../systems/VillageService';
import type { WorldScene } from './WorldScene';

type MerchantTab = 'buy' | 'sell' | 'exchange';

const MERCHANT_TABS: ReadonlyArray<{ id: MerchantTab; label: string }> = [
  { id: 'buy', label: 'MUA' },
  { id: 'sell', label: 'BÁN' },
  { id: 'exchange', label: 'ĐỔI NGỌC' },
];

const PANEL_X = 40;
const PANEL_Y = 20;
const PANEL_WIDTH = 880;
const PANEL_HEIGHT = 500;
const BODY_Y = PANEL_Y + 100;
const ROW_HEIGHT = 56;
const ROWS_PER_PAGE = 6;

const TEXT_COLOR = '#cfd2dd';
const MUTED = '#8b8fa3';
const GOLD = '#ffd24a';
const OK_COLOR = '#4dffa6';
const BAD_COLOR = '#ff8fa3';

/** Một dòng trong danh sách mua/bán. */
interface ListEntry {
  textureKey?: string;
  gem?: GemId;
  title: string;
  titleColor: string;
  subtitle: string;
  priceText: string;
  actionLabel: string;
  enabled: boolean;
  run: () => ActionResult;
}

/** Cửa hàng làng: Thương nhân (mua/bán/đổi ngọc) và Thợ rèn (nâng cấp/đục lỗ/khảm ngọc). */
export class VillageShopScene extends Phaser.Scene {
  private role: NpcRole = 'merchant';
  private world!: WorldScene;
  private content: Phaser.GameObjects.Container | null = null;
  private goldText: Phaser.GameObjects.Text | null = null;
  private readonly tabBackgrounds = new Map<MerchantTab, Phaser.GameObjects.Rectangle>();
  private readonly tabTexts = new Map<MerchantTab, Phaser.GameObjects.Text>();
  private tab: MerchantTab = 'buy';
  private page = 0;
  private selectedGear: GearId | null = null;
  private exchangeFrom: GemId | null = null;
  private message = '';
  private messageColor = TEXT_COLOR;
  private closing = false;

  constructor() {
    super(SCENE_KEYS.villageShop);
  }

  init(data?: { role?: NpcRole }): void {
    this.role = data?.role === 'blacksmith' ? 'blacksmith' : 'merchant';
    this.tab = 'buy';
    this.page = 0;
    this.selectedGear = null;
    this.exchangeFrom = null;
    this.message = '';
    this.messageColor = TEXT_COLOR;
    this.closing = false;
    this.content = null;
    this.goldText = null;
    this.tabBackgrounds.clear();
    this.tabTexts.clear();
  }

  create(): void {
    this.world = this.scene.get(SCENE_KEYS.world) as WorldScene;

    const npc = VILLAGE_NPCS.find((spec) => spec.role === this.role)!;

    this.add
      .rectangle(
        DESIGN_WIDTH / 2,
        DESIGN_HEIGHT / 2,
        DESIGN_WIDTH,
        DESIGN_HEIGHT,
        0x000000,
        0.8,
      )
      .setDepth(0);

    this.add
      .rectangle(PANEL_X, PANEL_Y, PANEL_WIDTH, PANEL_HEIGHT, 0x0f1118, 0.98)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0x3a3d4d)
      .setDepth(1);

    this.createCloseButton();

    this.add
      .text(PANEL_X + 50, PANEL_Y + 16, `${npc.name} — ${npc.title}`, {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: npc.colorCss,
        fontStyle: 'bold',
      })
      .setDepth(2);

    this.goldText = this.add
      .text(PANEL_X + PANEL_WIDTH - 20, PANEL_Y + 18, '', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: GOLD,
        fontStyle: 'bold',
      })
      .setOrigin(1, 0)
      .setDepth(2);

    if (this.role === 'merchant') {
      this.createMerchantTabs();
    }

    this.add
      .text(
        DESIGN_WIDTH / 2,
        PANEL_Y + PANEL_HEIGHT - 8,
        'ESC / TAB / NÚT X ĐỂ ĐÓNG',
        { fontFamily: 'monospace', fontSize: '9px', color: MUTED },
      )
      .setOrigin(0.5, 1)
      .setDepth(2);

    const keyboard = this.input.keyboard;

    keyboard?.addCapture(Phaser.Input.Keyboard.KeyCodes.TAB);
    keyboard?.on('keydown-ESC', () => this.close());
    keyboard?.on('keydown-TAB', (event: KeyboardEvent) => {
      if (!event.repeat) {
        this.close();
      }
    });

    if (this.role === 'blacksmith') {
      this.selectedGear = this.getUpgradableGear()[0] ?? null;
    }

    this.render();
  }

  // ---- Khung chung ----

  private createCloseButton(): void {
    const button = this.add
      .rectangle(10, 10, 30, 30, 0x2a1317, 0.95)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0xe8434f)
      .setDepth(4)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(25, 25, 'X', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#ff8fa3',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(5);

    button.on('pointerdown', () => this.close());
  }

  private createMerchantTabs(): void {
    MERCHANT_TABS.forEach((tab, index) => {
      const x = PANEL_X + 20 + index * 162;
      const background = this.add
        .rectangle(x, PANEL_Y + 56, 150, 30, 0x141823)
        .setOrigin(0, 0)
        .setStrokeStyle(2, 0x3a3d4d)
        .setDepth(2)
        .setInteractive({ useHandCursor: true });
      const label = this.add
        .text(x + 75, PANEL_Y + 71, tab.label, {
          fontFamily: 'monospace',
          fontSize: '13px',
          color: MUTED,
        })
        .setOrigin(0.5)
        .setDepth(3);

      background.on('pointerdown', () => {
        this.tab = tab.id;
        this.page = 0;
        this.message = '';
        this.render();
      });
      this.tabBackgrounds.set(tab.id, background);
      this.tabTexts.set(tab.id, label);
    });
  }

  private close(): void {
    if (this.closing) {
      return;
    }

    this.closing = true;
    this.world.onPanelClosed();
    this.scene.resume(SCENE_KEYS.world);
    this.scene.stop();
  }

  /** Chạy một giao dịch, hiện kết quả và vẽ lại (hoãn 1 nhịp để không huỷ nút đang xử lý click). */
  private act(run: () => ActionResult): void {
    const result = run();

    this.message = result.message;
    this.messageColor = result.ok ? OK_COLOR : BAD_COLOR;
    this.time.delayedCall(0, () => this.render());
  }

  private render(): void {
    this.content?.destroy(true);
    this.content = this.add.container(0, 0).setDepth(10);
    this.goldText?.setText(`VÀNG ${this.world.getVillage().getGold()}`);

    for (const tab of MERCHANT_TABS) {
      const active = this.tab === tab.id;

      this.tabBackgrounds
        .get(tab.id)
        ?.setFillStyle(active ? 0x1c2230 : 0x141823)
        .setStrokeStyle(2, active ? 0xffd24a : 0x3a3d4d);
      this.tabTexts.get(tab.id)?.setColor(active ? GOLD : MUTED);
    }

    if (this.role === 'blacksmith') {
      this.renderSmith();
    } else if (this.tab === 'exchange') {
      this.renderExchange();
    } else {
      this.renderList(
        this.tab === 'buy' ? this.buildBuyEntries() : this.buildSellEntries(),
      );
    }

    this.addText(
      PANEL_X + 20,
      PANEL_Y + PANEL_HEIGHT - 34,
      this.message,
      this.messageColor,
      13,
    );
  }

  // ---- Helper vẽ ----

  private addText(
    x: number,
    y: number,
    text: string,
    color = TEXT_COLOR,
    size = 12,
    originX = 0,
    wrapWidth?: number,
  ): Phaser.GameObjects.Text {
    const label = this.add
      .text(x, y, text, {
        fontFamily: 'monospace',
        fontSize: `${size}px`,
        color,
        wordWrap: wrapWidth ? { width: wrapWidth } : undefined,
      })
      .setOrigin(originX, 0);

    this.content?.add(label);
    return label;
  }

  private addButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    enabled: boolean,
    onClick: () => void,
    selected = false,
  ): void {
    const rect = this.add
      .rectangle(x, y, width, height, enabled ? 0x1d3a2c : 0x1a1d26)
      .setOrigin(0, 0)
      .setStrokeStyle(2, selected ? 0xffd24a : enabled ? 0x4dffa6 : 0x3a3d4d);
    const text = this.add
      .text(x + width / 2, y + height / 2, label, {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: enabled ? '#e8fff4' : '#6c7086',
        align: 'center',
        wordWrap: { width: width - 6 },
      })
      .setOrigin(0.5);

    this.content?.add([rect, text]);

    if (enabled) {
      rect.setInteractive({ useHandCursor: true });
      rect.on('pointerdown', onClick);
      rect.on('pointerover', () => rect.setFillStyle(0x2a5640));
      rect.on('pointerout', () => rect.setFillStyle(0x1d3a2c));
    }
  }

  /** Viên ngọc vẽ bằng hình thoi màu. */
  private addGemIcon(x: number, y: number, gem: GemId, size = 24): void {
    const icon = this.add
      .rectangle(x, y, size * 0.7, size * 0.7, GEM_INFO[gem].color)
      .setAngle(45)
      .setStrokeStyle(2, 0xffffff, 0.8);

    this.content?.add(icon);
  }

  private addIcon(x: number, y: number, textureKey: string, size = 36): void {
    const icon = this.add.image(x, y, textureKey);
    const fit = Math.min(size / icon.width, size / icon.height);

    // Giữ tỉ lệ và dùng scale nguyên (nếu đủ chỗ) để pixel không méo/lệch.
    icon.setScale(fit >= 1 ? Math.floor(fit) : fit);

    this.content?.add(icon);
  }

  // ---- Thương nhân: danh sách mua / bán ----

  private buildBuyEntries(): ListEntry[] {
    const village = this.world.getVillage();
    const gold = village.getGold();
    const entries: ListEntry[] = [];

    for (const id of village.getWeaponStock()) {
      const info = WEAPON_INFO[id];
      const price = village.getWeaponBuyPrice(id);

      entries.push({
        textureKey: info.textureKey,
        title: info.name,
        titleColor: info.colorCss,
        subtitle: `VŨ KHÍ · ${WEAPON_RARITY_LABELS[info.rarity]}`,
        priceText: `${price} VÀNG`,
        actionLabel: 'MUA',
        enabled: gold >= price,
        run: () => village.buyWeapon(id),
      });
    }

    for (const id of village.getGearStock()) {
      const info = GEAR_INFO[id];
      const price = village.getGearBuyPrice(id);

      entries.push({
        textureKey: info.textureKey,
        title: info.name,
        titleColor: info.colorCss,
        subtitle: `${GEAR_SLOT_LABELS[info.slot]} · ${getGearBonusLines(info, 1).join(', ')}`,
        priceText: `${price} VÀNG`,
        actionLabel: 'MUA',
        enabled: gold >= price,
        run: () => village.buyGear(id),
      });
    }

    for (const gem of GEM_IDS) {
      const info = GEM_INFO[gem];

      entries.push({
        gem,
        title: info.name,
        titleColor: info.colorCss,
        subtitle: `${info.format(info.value)} · CÓ ${village.getGems()[gem]}`,
        priceText: `${GEM_BUY_PRICE} VÀNG`,
        actionLabel: 'MUA',
        enabled: gold >= GEM_BUY_PRICE,
        run: () => village.buyGem(gem),
      });
    }

    return entries;
  }

  private buildSellEntries(): ListEntry[] {
    const village = this.world.getVillage();
    const inventory = this.world.getVillageInventory();
    const entries: ListEntry[] = [];

    for (const item of inventory.weapons) {
      if (item.equipped || item.starting) {
        continue;
      }

      const info = WEAPON_INFO[item.id];

      entries.push({
        textureKey: info.textureKey,
        title: info.name,
        titleColor: info.colorCss,
        subtitle: `VŨ KHÍ · ${WEAPON_RARITY_LABELS[info.rarity]}`,
        priceText: `+${village.getWeaponSellPrice(item.id)} VÀNG`,
        actionLabel: 'BÁN',
        enabled: true,
        run: () => village.sellWeapon(item.id),
      });
    }

    for (const item of inventory.gear) {
      if (item.equipped) {
        continue;
      }

      const info = GEAR_INFO[item.id];
      const gems = village.getSockets(item.id).filter(Boolean).length;

      entries.push({
        textureKey: info.textureKey,
        title: `${info.name} LV${item.level}`,
        titleColor: info.colorCss,
        subtitle: `${GEAR_SLOT_LABELS[info.slot]}${gems > 0 ? ` · ${gems} NGỌC (TRẢ LẠI KHI BÁN)` : ''}`,
        priceText: `+${village.getGearSellPrice(item.id)} VÀNG`,
        actionLabel: 'BÁN',
        enabled: true,
        run: () => village.sellGear(item.id),
      });
    }

    for (const gem of GEM_IDS) {
      const count = village.getGems()[gem];

      if (count <= 0) {
        continue;
      }

      const info = GEM_INFO[gem];

      entries.push({
        gem,
        title: `${info.name} x${count}`,
        titleColor: info.colorCss,
        subtitle: info.format(info.value),
        priceText: `+${GEM_SELL_PRICE} VÀNG`,
        actionLabel: 'BÁN 1',
        enabled: true,
        run: () => village.sellGem(gem),
      });
    }

    return entries;
  }

  private renderList(entries: ListEntry[]): void {
    const pageCount = Math.max(1, Math.ceil(entries.length / ROWS_PER_PAGE));

    this.page = Math.min(this.page, pageCount - 1);

    if (entries.length === 0) {
      this.addText(
        PANEL_X + 30,
        BODY_Y + 20,
        this.tab === 'sell'
          ? 'KHÔNG CÓ GÌ ĐỂ BÁN (ĐỒ ĐANG MẶC / KHỞI ĐẦU KHÔNG BÁN ĐƯỢC).'
          : 'HẾT HÀNG.',
        MUTED,
        14,
      );
    }

    entries
      .slice(this.page * ROWS_PER_PAGE, (this.page + 1) * ROWS_PER_PAGE)
      .forEach((entry, index) => {
        const y = BODY_Y + index * ROW_HEIGHT;

        const row = this.add
          .rectangle(PANEL_X + 20, y, PANEL_WIDTH - 40, ROW_HEIGHT - 6, 0x151824)
          .setOrigin(0, 0)
          .setStrokeStyle(1, 0x2b2f40);

        this.content?.add(row);

        if (entry.textureKey) {
          this.addIcon(PANEL_X + 50, y + 25, entry.textureKey);
        } else if (entry.gem) {
          this.addGemIcon(PANEL_X + 50, y + 25, entry.gem);
        }

        this.addText(PANEL_X + 84, y + 8, entry.title, entry.titleColor, 14);
        this.addText(PANEL_X + 84, y + 28, entry.subtitle, MUTED, 10);
        this.addText(PANEL_X + 640, y + 17, entry.priceText, GOLD, 14, 1);
        this.addButton(
          PANEL_X + 670,
          y + 6,
          170,
          ROW_HEIGHT - 18,
          entry.actionLabel,
          entry.enabled,
          () => this.act(entry.run),
        );
      });

    if (pageCount > 1) {
      const y = PANEL_Y + PANEL_HEIGHT - 66;

      this.addButton(
        DESIGN_WIDTH / 2 - 130,
        y,
        100,
        26,
        '< TRƯỚC',
        this.page > 0,
        () => {
          this.page -= 1;
          this.time.delayedCall(0, () => this.render());
        },
      );
      this.addText(
        DESIGN_WIDTH / 2,
        y + 6,
        `${this.page + 1}/${pageCount}`,
        TEXT_COLOR,
        13,
        0.5,
      );
      this.addButton(
        DESIGN_WIDTH / 2 + 30,
        y,
        100,
        26,
        'SAU >',
        this.page < pageCount - 1,
        () => {
          this.page += 1;
          this.time.delayedCall(0, () => this.render());
        },
      );
    }
  }

  // ---- Thương nhân: đổi ngọc ----

  private renderExchange(): void {
    const village = this.world.getVillage();
    const gems = village.getGems();

    this.addText(
      PANEL_X + 20,
      BODY_Y,
      `ĐỔI ${GEM_EXCHANGE_COUNT} NGỌC CÙNG LOẠI LẤY 1 NGỌC TUỲ CHỌN (PHÍ ${GEM_EXCHANGE_FEE} VÀNG)`,
      TEXT_COLOR,
      13,
    );
    this.addText(PANEL_X + 20, BODY_Y + 34, 'BƯỚC 1: CHỌN NGỌC ĐEM ĐỔI', GOLD, 12);

    const buttonWidth = 112;
    const gap = 8;

    GEM_IDS.forEach((gem, index) => {
      const x = PANEL_X + 24 + index * (buttonWidth + gap);
      const info = GEM_INFO[gem];

      this.addGemIcon(x + buttonWidth / 2, BODY_Y + 76, gem, 22);
      this.addButton(
        x,
        BODY_Y + 98,
        buttonWidth,
        50,
        `${info.name.replace('NGỌC ', '')}\nCÓ ${gems[gem]}`,
        gems[gem] >= GEM_EXCHANGE_COUNT,
        () => {
          this.exchangeFrom = gem;
          this.time.delayedCall(0, () => this.render());
        },
        this.exchangeFrom === gem,
      );
    });

    if (this.exchangeFrom && gems[this.exchangeFrom] < GEM_EXCHANGE_COUNT) {
      this.exchangeFrom = null;
    }

    this.addText(
      PANEL_X + 20,
      BODY_Y + 170,
      this.exchangeFrom
        ? `BƯỚC 2: CHỌN NGỌC MUỐN NHẬN (ĐỔI ${GEM_EXCHANGE_COUNT} ${GEM_INFO[this.exchangeFrom].name})`
        : 'BƯỚC 2: CHỌN NGỌC MUỐN NHẬN (CHỌN BƯỚC 1 TRƯỚC)',
      GOLD,
      12,
    );

    GEM_IDS.forEach((gem, index) => {
      const x = PANEL_X + 24 + index * (buttonWidth + gap);
      const info = GEM_INFO[gem];
      const from = this.exchangeFrom;

      this.addGemIcon(x + buttonWidth / 2, BODY_Y + 212, gem, 22);
      this.addButton(
        x,
        BODY_Y + 234,
        buttonWidth,
        50,
        info.name.replace('NGỌC ', ''),
        from !== null && from !== gem && village.getGold() >= GEM_EXCHANGE_FEE,
        () => {
          if (from) {
            this.act(() => village.exchangeGem(from, gem));
          }
        },
      );
    });
  }

  // ---- Thợ rèn ----

  /** Mọi trang bị đang sở hữu (cả đang mặc và trong túi). */
  private getUpgradableGear(): GearId[] {
    return this.world.getVillageInventory().gear.map((item) => item.id);
  }

  private renderSmith(): void {
    const village = this.world.getVillage();
    const inventory = this.world.getVillageInventory();

    if (inventory.gear.length === 0) {
      this.addText(PANEL_X + 30, BODY_Y - 30, 'BẠN CHƯA CÓ TRANG BỊ NÀO.', MUTED, 14);
      return;
    }

    if (!this.selectedGear || !inventory.gear.some((item) => item.id === this.selectedGear)) {
      this.selectedGear = inventory.gear[0].id;
    }

    // Danh sách trang bị bên trái.
    const listTop = PANEL_Y + 56;

    inventory.gear.forEach((item, index) => {
      const info = GEAR_INFO[item.id];
      const y = listTop + index * 44;
      const selected = item.id === this.selectedGear;
      const row = this.add
        .rectangle(PANEL_X + 20, y, 290, 40, selected ? 0x1c2230 : 0x141823)
        .setOrigin(0, 0)
        .setStrokeStyle(2, selected ? 0xffd24a : 0x2b2f40)
        .setInteractive({ useHandCursor: true });

      row.on('pointerdown', () => {
        this.selectedGear = item.id;
        this.message = '';
        this.time.delayedCall(0, () => this.render());
      });
      this.content?.add(row);
      this.addIcon(PANEL_X + 44, y + 20, info.textureKey, 28);
      this.addText(PANEL_X + 66, y + 4, info.name, info.colorCss, 12);
      this.addText(
        PANEL_X + 66,
        y + 22,
        `LV${item.level} · ${village.getSockets(item.id).length} LỖ${item.equipped ? ' · ĐANG MẶC' : ''}`,
        MUTED,
        10,
      );
    });

    const gearId = this.selectedGear;
    const info = GEAR_INFO[gearId];
    const level = this.world.getGearLevel(gearId);
    const sockets = village.getSockets(gearId);
    const detailX = PANEL_X + 330;

    this.addIcon(detailX + 24, PANEL_Y + 78, info.textureKey, 44);
    this.addText(detailX + 60, PANEL_Y + 58, `${info.name}  LV${level}`, info.colorCss, 17);
    this.addText(
      detailX + 60,
      PANEL_Y + 82,
      `${GEAR_SLOT_LABELS[info.slot]} · ${WEAPON_RARITY_LABELS[info.rarity]}`,
      MUTED,
      11,
    );

    this.addText(
      detailX,
      PANEL_Y + 112,
      getGearBonusLines(info, level).join('   ·   '),
      TEXT_COLOR,
      11,
      0,
      540,
    );

    // Nâng cấp.
    const upgradeCost = village.getUpgradeCost(gearId);
    const maxed = level >= MAX_GEAR_LEVEL;

    this.addText(
      detailX,
      PANEL_Y + 142,
      maxed
        ? 'ĐÃ ĐẠT CẤP TỐI ĐA'
        : `NÂNG LÊN LV${level + 1}: ${getGearBonusLines(info, level + 1).join('   ·   ')}`,
      '#9ad7ff',
      11,
      0,
      540,
    );
    this.addButton(
      detailX,
      PANEL_Y + 176,
      250,
      34,
      maxed ? 'TỐI ĐA' : `NÂNG CẤP (${upgradeCost} VÀNG)`,
      !maxed && village.getGold() >= upgradeCost,
      () => this.act(() => village.upgradeGear(gearId)),
    );

    // Lỗ ngọc.
    this.addText(detailX, PANEL_Y + 224, `LỖ NGỌC ${sockets.length}/${MAX_SOCKETS}  (BẤM NGỌC ĐÃ KHẢM ĐỂ THÁO, PHÍ ${UNSOCKET_FEE})`, GOLD, 11);

    for (let i = 0; i < MAX_SOCKETS; i += 1) {
      const x = detailX + i * 74;
      const y = PANEL_Y + 246;
      const gem = sockets[i];
      const drilled = i < sockets.length;
      const box = this.add
        .rectangle(x, y, 66, 66, drilled ? 0x151824 : 0x0e1017)
        .setOrigin(0, 0)
        .setStrokeStyle(2, gem ? GEM_INFO[gem].color : drilled ? 0x5a5f78 : 0x23262f);

      this.content?.add(box);

      if (gem) {
        this.addGemIcon(x + 33, y + 28, gem, 30);
        this.addText(x + 33, y + 50, GEM_INFO[gem].name.replace('NGỌC ', ''), GEM_INFO[gem].colorCss, 8, 0.5);
        box.setInteractive({ useHandCursor: true });
        box.on('pointerdown', () => this.act(() => village.removeGem(gearId, i)));
      } else {
        this.addText(x + 33, y + 26, drilled ? 'TRỐNG' : 'CHƯA ĐỤC', drilled ? MUTED : '#44485a', 9, 0.5);
      }
    }

    const drillCost = village.getDrillCost(gearId);

    this.addButton(
      detailX + 3 * 74 + 6,
      PANEL_Y + 246,
      200,
      66,
      drillCost === null ? 'ĐÃ ĐỦ LỖ' : `ĐỤC LỖ MỚI\n(${drillCost} VÀNG)`,
      drillCost !== null && village.getGold() >= drillCost,
      () => this.act(() => village.drillSocket(gearId)),
    );

    // Kho ngọc: bấm để khảm vào lỗ trống đầu tiên.
    const firstEmpty = sockets.findIndex((entry) => entry === null);

    this.addText(
      detailX,
      PANEL_Y + 326,
      firstEmpty >= 0
        ? 'KHO NGỌC — BẤM ĐỂ KHẢM VÀO LỖ TRỐNG:'
        : 'KHO NGỌC (CẦN ĐỤC LỖ / TRỐNG LỖ ĐỂ KHẢM):',
      GOLD,
      11,
    );

    GEM_IDS.forEach((gem, index) => {
      const column = index % 4;
      const row = Math.floor(index / 4);
      const x = detailX + column * 134;
      const y = PANEL_Y + 346 + row * 52;
      const count = village.getGems()[gem];
      const gemInfo = GEM_INFO[gem];

      this.addGemIcon(x + 14, y + 22, gem, 20);
      this.addButton(
        x + 30,
        y,
        100,
        44,
        `${gemInfo.name.replace('NGỌC ', '')}\nx${count}`,
        count > 0 && firstEmpty >= 0,
        () => this.act(() => village.socketGem(gearId, firstEmpty, gem)),
      );
    });

    // Chỉ số ngọc tổng đang mang.
    const total = this.world.getGemBonuses();

    this.addText(
      detailX,
      PANEL_Y + PANEL_HEIGHT - 54,
      `NGỌC ĐANG MANG: ${[
        total.lifestealPercent > 0 ? `HÚT MÁU ${total.lifestealPercent}%` : '',
        total.damagePercent > 0 ? `ST +${total.damagePercent}%` : '',
        total.energyLeech > 0 ? `HÚT KI +${total.energyLeech}` : '',
        total.thornsDamage > 0 ? `PHẢN ${total.thornsDamage}` : '',
        total.maxHealth > 0 ? `HP +${toDisplayHealth(total.maxHealth)}` : '',
        total.maxArmor > 0 ? `GIÁP +${toDisplayHealth(total.maxArmor)}` : '',
        total.dodgePercent > 0 ? `NÉ ${total.dodgePercent}%` : '',
      ]
        .filter(Boolean)
        .join(' · ') || 'CHƯA CÓ'}`,
      MUTED,
      10,
      0,
      540,
    );
  }
}
