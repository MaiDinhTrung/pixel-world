import Phaser from 'phaser';

import type { WeaponId } from '../combat/Weapon';
import {
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  SCENE_KEYS,
} from '../config/constants';
import {
  GEAR_INFO,
  GEAR_SLOT_LABELS,
  getGearBonusLines,
  type GearId,
  type GearSlot,
} from '../config/gearConfig';
import {
  STAT_DEFINITIONS,
  STAT_POINTS_PER_LEVEL,
  type StatId,
} from '../config/statConfig';
import { ELEMENT_LABELS, ELEMENT_TYPES } from '../config/damageTypeConfig';
import {
  WEAPON_INFO,
  WEAPON_RARITY_LABELS,
  type WeaponRarity,
} from '../config/weaponInfo';
import type { SkillId } from '../skills/skills';
import { buildControlSettingsTab } from '../ui/combat/ControlLayoutEditor';
import {
  buildSkillTreeView,
  type SkillTreeViewState,
} from '../ui/SkillTreeView';
import type { WorldScene } from './WorldScene';

type PanelTab = 'stats' | 'inventory' | 'skills' | 'equipment' | 'settings';

const TABS: ReadonlyArray<{ id: PanelTab; label: string }> = [
  { id: 'stats', label: 'CHỈ SỐ' },
  { id: 'inventory', label: 'TÚI ĐỒ' },
  { id: 'skills', label: 'KỸ NĂNG' },
  { id: 'equipment', label: 'TRANG BỊ' },
  { id: 'settings', label: 'CÀI ĐẶT' },
];
const TAB_WIDTH = 150;
const TAB_STEP = 162;

type EquipItem =
  | { kind: 'weapon'; id: WeaponId }
  | { kind: 'gear'; id: GearId };

type EquipSlotTarget =
  | { kind: 'weapon'; slot: 0 | 1 }
  | { kind: 'gear'; slot: GearSlot };

type SkillPanelEntry =
  ReturnType<WorldScene['getSkillsPanelState']>['skills'][number];

type PendingEquipClick =
  | { type: 'item'; item: EquipItem }
  | {
      type: 'slot';
      kind: 'weapon';
      slot: 0 | 1;
      item: EquipItem | null;
    }
  | {
      type: 'slot';
      kind: 'gear';
      slot: GearSlot;
      item: EquipItem | null;
    };

const RARITY_BACKGROUNDS: Record<WeaponRarity, number> = {
  common: 0x1a1d26,
  special: 0x152030,
  legendary: 0x2a2114,
};

const EQUIP_SLOT_SIZE = 76;
const ITEM_TILE_SIZE = 56;
const ITEM_GRID_COLUMNS = 5;
const ITEM_GRID_GAP = 8;

const MAIN_SLOT_SIZE = 70;
const EXTRA_SLOT_SIZE = 58;
const LIBRARY_TILE_SIZE = 62;
const LIBRARY_COLUMNS = 5;
const LIBRARY_ROWS = 2;

const PANEL_X = 40;
const PANEL_Y = 20;
const PANEL_WIDTH = 880;
const PANEL_HEIGHT = 500;

const TEXT_COLOR = '#cfd2dd';
const MUTED = '#8b8fa3';
const GOLD = '#ffe066';

/** Bảng nhân vật: tab Stats (cộng điểm), Inventory (trang bị) và Skills (bộ kỹ năng). */
export class CharacterPanelScene extends Phaser.Scene {
  private activeTab: PanelTab = 'stats';
  private selectedWeaponId: WeaponId | null = null;
  private world!: WorldScene;
  private content: Phaser.GameObjects.Container | null = null;
  private readonly tabBackgrounds = new Map<PanelTab, Phaser.GameObjects.Rectangle>();
  private readonly tabTexts = new Map<PanelTab, Phaser.GameObjects.Text>();
  private selectedEquipItem: EquipItem | null = null;
  private selectedSkillId: SkillId | null = null;
  private skillsView: 'loadout' | 'tree' = 'loadout';
  private skillPage = 0;
  private readonly treeState: SkillTreeViewState = {
    selected: null,
    message: '',
  };
  private pendingEquipClick: PendingEquipClick | null = null;
  private lastEquipClickKey = '';
  private lastEquipClickAt = 0;
  private closing = false;

  constructor() {
    super(SCENE_KEYS.characterPanel);
  }

  /** Key scene thế giới đã mở panel (WorldScene, scene map duy nhất). */
  private worldKey: string = SCENE_KEYS.world;

  init(data?: { tab?: PanelTab; worldKey?: string }): void {
    this.worldKey = data?.worldKey ?? SCENE_KEYS.world;
    this.activeTab = TABS.some((tab) => tab.id === data?.tab)
      ? (data?.tab as PanelTab)
      : 'stats';
    this.selectedWeaponId = null;
    this.selectedEquipItem = null;
    this.selectedSkillId = null;
    this.skillsView = 'loadout';
    this.treeState.selected = null;
    this.treeState.message = '';
    this.pendingEquipClick = null;
    this.lastEquipClickKey = '';
    this.lastEquipClickAt = 0;
    this.closing = false;
  }

  create(): void {
    this.world = this.scene.get(this.worldKey) as WorldScene;

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
      .rectangle(
        PANEL_X,
        PANEL_Y,
        PANEL_WIDTH,
        PANEL_HEIGHT,
        0x0f1118,
        0.98,
      )
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0x3a3d4d)
      .setDepth(1);

    this.createCloseButton();

    this.add
      .text(PANEL_X + 20, PANEL_Y + 16, `${this.world.getCharacterName()} — NHÂN VẬT`, {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#e8e6f0',
        fontStyle: 'bold',
      })
      .setDepth(2);

    this.add
      .text(
        PANEL_X + PANEL_WIDTH - 20,
        PANEL_Y + 22,
        `LV ${this.world.getStatPanelState().level} · ${STAT_POINTS_PER_LEVEL} ĐIỂM/CẤP`,
        {
          fontFamily: 'monospace',
          fontSize: '11px',
          color: MUTED,
        },
      )
      .setOrigin(1, 0)
      .setDepth(2);

    this.createTabs();

    this.add
      .text(
        DESIGN_WIDTH / 2,
        PANEL_Y + PANEL_HEIGHT - 12,
        'TAB / ESC ĐÓNG · C / I / K / E / O CHỌN TAB',
        {
          fontFamily: 'monospace',
          fontSize: '9px',
          color: MUTED,
        },
      )
      .setOrigin(0.5, 1)
      .setDepth(2);

    this.bindKeys();
    this.bindEquipClick();
    this.render();
  }

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

    button.on('pointerover', () => button.setFillStyle(0x4a1d24, 1));
    button.on('pointerout', () => button.setFillStyle(0x2a1317, 0.95));
    button.on('pointerdown', () => this.close());
  }

  private createTabs(): void {
    TABS.forEach((tab, index) => {
      const x = PANEL_X + 20 + index * TAB_STEP;
      const background = this.add
        .rectangle(x, PANEL_Y + 56, TAB_WIDTH, 30, 0x141823)
        .setOrigin(0, 0)
        .setStrokeStyle(2, 0x3a3d4d)
        .setDepth(2)
        .setInteractive({ useHandCursor: true });
      const label = this.add
        .text(x + TAB_WIDTH / 2, PANEL_Y + 71, tab.label, {
          fontFamily: 'monospace',
          fontSize: '13px',
          color: MUTED,
        })
        .setOrigin(0.5)
        .setDepth(3);

      background.on('pointerdown', () => this.switchTab(tab.id));
      this.tabBackgrounds.set(tab.id, background);
      this.tabTexts.set(tab.id, label);
    });
  }

  private bindKeys(): void {
    const keyboard = this.input.keyboard;

    if (!keyboard) {
      return;
    }

    keyboard.addCapture(Phaser.Input.Keyboard.KeyCodes.TAB);

    keyboard.on('keydown-ESC', () => this.close());
    keyboard.on('keydown-TAB', (event: KeyboardEvent) => {
      if (!event.repeat) {
        this.close();
      }
    });
    keyboard.on('keydown-C', (event: KeyboardEvent) => {
      if (!event.repeat) {
        this.switchTab('stats');
      }
    });
    keyboard.on('keydown-I', (event: KeyboardEvent) => {
      if (!event.repeat) {
        this.switchTab('inventory');
      }
    });
    keyboard.on('keydown-K', (event: KeyboardEvent) => {
      if (!event.repeat) {
        this.switchTab('skills');
      }
    });
    keyboard.on('keydown-E', (event: KeyboardEvent) => {
      if (!event.repeat) {
        this.switchTab('equipment');
      }
    });
    keyboard.on('keydown-O', (event: KeyboardEvent) => {
      if (!event.repeat) {
        this.switchTab('settings');
      }
    });

    const statKeyNames = [
      'ONE',
      'TWO',
      'THREE',
      'FOUR',
      'FIVE',
      'SIX',
    ];

    statKeyNames.forEach((keyName, index) => {
      keyboard.on(`keydown-${keyName}`, () => {
        if (this.activeTab === 'stats') {
          this.addPoint(STAT_DEFINITIONS[index].id);
        } else if (index < 2) {
          this.equipSelected(index as 0 | 1);
        }
      });
    });
  }

  private switchTab(tab: PanelTab): void {
    this.activeTab = tab;
    this.render();
  }

  private addPoint(statId: StatId): void {
    if (this.activeTab !== 'stats') {
      return;
    }

    this.world.addStatPoint(statId);
    this.render();
  }

  private equipSelected(slot: 0 | 1): void {
    if (this.activeTab !== 'inventory' || !this.selectedWeaponId) {
      return;
    }

    this.world.equipWeaponFromInventory(this.selectedWeaponId, slot);
    this.render();
  }

  private close(): void {
    if (this.closing) {
      return;
    }

    this.closing = true;
    this.world.onPanelClosed();
    this.scene.resume(this.worldKey);
    this.scene.stop();
  }

  private render(): void {
    for (const tab of TABS) {
      const active = this.activeTab === tab.id;

      this.tabBackgrounds
        .get(tab.id)
        ?.setFillStyle(active ? 0x1c2230 : 0x141823)
        .setStrokeStyle(2, active ? 0x4da3ff : 0x3a3d4d);
      this.tabTexts.get(tab.id)?.setColor(active ? '#e8e6f0' : MUTED);
    }

    this.content?.destroy(true);
    this.content = this.add.container(0, 0).setDepth(2);
    this.pendingEquipClick = null;

    if (this.activeTab === 'stats') {
      this.renderStats();
    } else if (this.activeTab === 'inventory') {
      this.renderInventory();
    } else if (this.activeTab === 'skills') {
      if (this.skillsView === 'tree') {
        buildSkillTreeView(
          this,
          this.content,
          this.world,
          {
            x: PANEL_X + 20,
            y: PANEL_Y + 108,
            width: PANEL_WIDTH - 40,
            height: PANEL_HEIGHT - 130,
          },
          this.treeState,
          () => this.render(),
          () => {
            this.skillsView = 'loadout';
            this.render();
          },
        );
      } else {
        this.renderSkills();
      }
    } else if (this.activeTab === 'settings') {
      buildControlSettingsTab(this, this.content, this.world.getCharacterId());
    } else {
      this.renderEquipment();
    }
  }

  private renderSkills(): void {
    const state = this.world.getSkillsPanelState();

    if (!this.selectedSkillId) {
      this.selectedSkillId = state.loadout[0];
    }

    this.content?.add(
      this.add.text(PANEL_X + 20, PANEL_Y + 104, 'BỘ KỸ NĂNG', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: MUTED,
      }),
    );

    const treeSummary = this.world.getSkillPointSummary();
    const treeButton = this.add
      .rectangle(PANEL_X + 130, PANEL_Y + 98, 170, 22, 0x24304a)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0x4da3ff)
      .setInteractive({ useHandCursor: true });

    treeButton.on('pointerdown', () => {
      this.skillsView = 'tree';
      this.render();
    });
    this.content?.add([
      treeButton,
      this.add
        .text(
          PANEL_X + 215,
          PANEL_Y + 109,
          `CÂY KỸ NĂNG ▸ (${treeSummary.available} ĐIỂM)`,
          {
            fontFamily: 'monospace',
            fontSize: '9px',
            color: treeSummary.available > 0 ? GOLD : '#cfd2dd',
          },
        )
        .setOrigin(0.5),
    ]);
    this.content?.add(
      this.add
        .text(
          PANEL_X + PANEL_WIDTH - 20,
          PANEL_Y + 104,
          `LV ${state.level} · ${state.characterName}`,
          {
            fontFamily: 'monospace',
            fontSize: '9px',
            color: GOLD,
          },
        )
        .setOrigin(1, 0),
    );

    // 3 ô chính (phím 3/4/5).
    for (let slot = 0; slot < 3; slot += 1) {
      const skill = state.skills.find((entry) => entry.id === state.loadout[slot]);

      if (skill) {
        this.renderSkillLoadoutSlot(
          skill,
          slot,
          PANEL_X + 60 + slot * 82,
          PANEL_Y + 168,
          MAIN_SLOT_SIZE,
        );
      }
    }

    // 4 ô phụ (phím 6/7/8/9), có thể trống.
    this.content?.add(
      this.add.text(PANEL_X + 20, PANEL_Y + 214, 'Ô PHỤ · PHÍM 6 / 7 / 8 / 9', {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: MUTED,
      }),
    );

    for (let slot = 3; slot < 7; slot += 1) {
      const skillId = state.loadout[slot];
      const skill = skillId
        ? state.skills.find((entry) => entry.id === skillId)
        : undefined;
      const x = PANEL_X + 50 + (slot - 3) * 70;
      const y = PANEL_Y + 262;

      if (skill) {
        this.renderSkillLoadoutSlot(skill, slot, x, y, EXTRA_SLOT_SIZE);
      } else {
        this.renderEmptySlot(slot, x, y, EXTRA_SLOT_SIZE);
      }
    }

    this.content?.add(
      this.add.text(
        PANEL_X + 20,
        PANEL_Y + 300,
        'THƯ VIỆN KỸ NĂNG · CLICK ĐỂ XEM THÔNG TIN',
        {
          fontFamily: 'monospace',
          fontSize: '9px',
          color: MUTED,
        },
      ),
    );

    const pageSize = LIBRARY_COLUMNS * LIBRARY_ROWS;
    const pageCount = Math.max(1, Math.ceil(state.skills.length / pageSize));

    this.skillPage = Phaser.Math.Clamp(this.skillPage, 0, pageCount - 1);

    state.skills
      .slice(this.skillPage * pageSize, (this.skillPage + 1) * pageSize)
      .forEach((skill, index) => {
        const column = index % LIBRARY_COLUMNS;
        const row = Math.floor(index / LIBRARY_COLUMNS);

        this.renderSkillTile(
          skill,
          PANEL_X + 50 + column * 70,
          PANEL_Y + 352 + row * 70,
          LIBRARY_TILE_SIZE,
        );
      });

    if (pageCount > 1) {
      this.createActionButton(
        PANEL_X + 20,
        PANEL_Y + PANEL_HEIGHT - 44,
        60,
        22,
        '◂',
        0x4da3ff,
        () => {
          this.skillPage = Math.max(0, this.skillPage - 1);
          this.render();
        },
      );
      this.content?.add(
        this.add
          .text(
            PANEL_X + 120,
            PANEL_Y + PANEL_HEIGHT - 33,
            `TRANG ${this.skillPage + 1}/${pageCount}`,
            { fontFamily: 'monospace', fontSize: '9px', color: GOLD },
          )
          .setOrigin(0.5),
      );
      this.createActionButton(
        PANEL_X + 160,
        PANEL_Y + PANEL_HEIGHT - 44,
        60,
        22,
        '▸',
        0x4da3ff,
        () => {
          this.skillPage = Math.min(pageCount - 1, this.skillPage + 1);
          this.render();
        },
      );
    }

    const selected =
      state.skills.find((entry) => entry.id === this.selectedSkillId) ??
      null;

    this.renderSkillDetails(
      PANEL_X + 400,
      PANEL_Y + 120,
      PANEL_WIDTH - 420,
      350,
      selected,
    );
  }

  private renderEmptySlot(
    slot: number,
    x: number,
    y: number,
    size: number,
  ): void {
    const container = this.add.container(x, y);

    container.add(
      this.add
        .rectangle(0, 0, size, size, 0x0f1118, 0.9)
        .setStrokeStyle(2, 0x2a2e3a),
    );
    container.add(
      this.add
        .text(0, 0, '+', {
          fontFamily: 'monospace',
          fontSize: '20px',
          color: '#55596b',
        })
        .setOrigin(0.5),
    );
    container.add(
      this.add
        .text(0, -size / 2 - 11, `Ô ${slot + 3}`, {
          fontFamily: 'monospace',
          fontSize: '8px',
          color: GOLD,
        })
        .setOrigin(0.5, 0),
    );

    container.setSize(size, size);
    container.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, size, size),
      Phaser.Geom.Rectangle.Contains,
    );
    // Chọn sẵn một kỹ năng rồi chạm ô trống để gán nhanh.
    container.on('pointerdown', () => {
      if (this.selectedSkillId) {
        this.world.assignSkillToSlot(this.selectedSkillId, slot);
      }

      this.render();
    });

    this.content?.add(container);
  }

  private renderSkillLoadoutSlot(
    skill: SkillPanelEntry,
    slot: number,
    x: number,
    y: number,
    size: number,
  ): void {
    const accent = Phaser.Display.Color.HexStringToColor(
      skill.colorCss,
    ).color;
    const selected = this.selectedSkillId === skill.id;
    const container = this.add.container(x, y);
    const frame = this.add
      .rectangle(0, 0, size, size, 0x141823, 0.98)
      .setStrokeStyle(selected ? 3 : 2, selected ? 0xffffff : accent);

    container.add(frame);
    this.addSkillIcon(container, skill, -size * 0.2, size / 78);
    container.add(
      this.add
        .text(0, size * 0.13, skill.name, {
          fontFamily: 'monospace',
          fontSize: '7px',
          color: skill.unlocked ? skill.colorCss : MUTED,
          align: 'center',
          wordWrap: { width: size - 6 },
        })
        .setOrigin(0.5, 0),
    );
    container.add(
      this.add
        .text(0, -size / 2 - 11, `Ô ${slot + 3}`, {
          fontFamily: 'monospace',
          fontSize: '8px',
          color: GOLD,
        })
        .setOrigin(0.5, 0),
    );

    container.setSize(size, size);
    container.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, size, size),
      Phaser.Geom.Rectangle.Contains,
    );
    container.on('pointerdown', () => {
      this.selectedSkillId = skill.id;
      this.render();
    });

    this.content?.add(container);
  }

  private renderSkillTile(
    skill: SkillPanelEntry,
    x: number,
    y: number,
    size: number,
  ): void {
    const accent = Phaser.Display.Color.HexStringToColor(
      skill.colorCss,
    ).color;
    const selected = this.selectedSkillId === skill.id;
    const container = this.add.container(x, y);
    const frame = this.add
      .rectangle(
        0,
        0,
        size,
        size,
        skill.unlocked ? 0x141823 : 0x101219,
        0.98,
      )
      .setStrokeStyle(
        selected ? 3 : 2,
        selected ? 0xffffff : skill.unlocked ? accent : 0x2a2e3a,
      );

    container.add(frame);
    this.addSkillIcon(container, skill, -size * 0.2, size / 78);
    container.add(
      this.add
        .text(0, size * 0.1, skill.name, {
          fontFamily: 'monospace',
          fontSize: '7px',
          color: skill.unlocked ? skill.colorCss : '#55596b',
          align: 'center',
          wordWrap: { width: size - 6 },
        })
        .setOrigin(0.5, 0),
    );

    const status =
      skill.assignedSlot !== null
        ? `Ô ${skill.assignedSlot + 3}`
        : skill.unlocked
          ? 'SẴN SÀNG'
          : skill.lockLabel;
    const statusColor =
      skill.assignedSlot !== null
        ? GOLD
        : skill.unlocked
          ? '#4dffa6'
          : '#e8a34d';

    container.add(
      this.add
        .text(0, size / 2 - 11, status, {
          fontFamily: 'monospace',
          fontSize: '7px',
          color: statusColor,
          fontStyle: 'bold',
        })
        .setOrigin(0.5, 0),
    );

    container.setSize(size, size);
    container.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, size, size),
      Phaser.Geom.Rectangle.Contains,
    );
    container.on('pointerdown', () => {
      this.selectedSkillId = skill.id;
      this.render();
    });

    this.content?.add(container);
  }

  private addSkillIcon(
    container: Phaser.GameObjects.Container,
    skill: SkillPanelEntry,
    offsetY: number,
    scale = 1,
  ): void {
    const accent = Phaser.Display.Color.HexStringToColor(
      skill.colorCss,
    ).color;

    container.add(
      this.add
        .rectangle(
          0,
          offsetY,
          36,
          36,
          skill.unlocked ? accent : 0x16181f,
          skill.unlocked ? 0.16 : 0.6,
        )
        .setStrokeStyle(1, skill.unlocked ? accent : 0x2a2e3a, 0.9)
        .setAngle(45)
        .setScale(scale),
    );
    container.add(
      this.add
        .text(0, offsetY, skill.icon, {
          fontFamily: 'monospace',
          fontSize: `${Math.round(15 * Math.max(0.75, scale))}px`,
          color: skill.unlocked ? skill.colorCss : '#55596b',
          fontStyle: 'bold',
        })
        .setOrigin(0.5),
    );
  }

  private renderSkillDetails(
    x: number,
    y: number,
    width: number,
    height: number,
    skill: SkillPanelEntry | null,
  ): void {
    this.content?.add(
      this.add
        .rectangle(x, y, width, height, 0x141823, 1)
        .setOrigin(0, 0)
        .setStrokeStyle(1, 0x2a2e3a),
    );

    if (!skill) {
      this.content?.add(
        this.add.text(x + 16, y + 18, 'CHỌN MỘT KỸ NĂNG', {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: MUTED,
        }),
      );
      this.content?.add(
        this.add.text(
          x + 16,
          y + 42,
          'CLICK VÀO Ô KỸ NĂNG ĐỂ XEM MÔ TẢ VÀ GẮN VÀO CÁC Ô 3-9.',
          {
            fontFamily: 'monospace',
            fontSize: '9px',
            color: TEXT_COLOR,
            wordWrap: { width: width - 32 },
          },
        ),
      );
      return;
    }

    const needsTree = skill.lockLabel === 'CÂY';

    this.content?.add(
      this.add.text(x + 16, y + 16, skill.name, {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: skill.unlocked ? skill.colorCss : MUTED,
        fontStyle: 'bold',
      }),
    );
    this.content?.add(
      this.add.text(
        x + 16,
        y + 44,
        skill.unlocked
          ? 'ĐÃ MỞ KHOÁ'
          : needsTree
            ? 'CHƯA HỌC · HỌC TRONG CÂY KỸ NĂNG'
            : `KHOÁ · CẦN ${skill.lockLabel}`,
        {
          fontFamily: 'monospace',
          fontSize: '9px',
          color: skill.unlocked ? '#4dffa6' : '#e8a34d',
          fontStyle: 'bold',
        },
      ),
    );
    this.content?.add(
      this.add.text(
        x + 16,
        y + 66,
        `HỒI CHIÊU ${(skill.cooldownMs / 1000).toFixed(1)}s · NĂNG LƯỢNG ${skill.energyCost}`,
        {
          fontFamily: 'monospace',
          fontSize: '8px',
          color: MUTED,
        },
      ),
    );
    this.content?.add(
      this.add.text(x + 16, y + 88, skill.description, {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: TEXT_COLOR,
        wordWrap: { width: width - 32 },
      }),
    );
    this.content?.add(
      this.add.text(
        x + 16,
        y + 140,
        skill.assignedSlot !== null
          ? `ĐANG GẮN Ở Ô ${skill.assignedSlot + 3}`
          : 'CHƯA GẮN VÀO Ô NÀO',
        {
          fontFamily: 'monospace',
          fontSize: '9px',
          color: skill.assignedSlot !== null ? GOLD : MUTED,
        },
      ),
    );

    if (!skill.unlocked) {
      this.content?.add(
        this.add.text(
          x + 16,
          y + 200,
          needsTree
            ? 'VÀO CÂY KỸ NĂNG, HỌC NODE TƯƠNG ỨNG ĐỂ DÙNG.'
            : `MỞ KHOÁ KỸ NĂNG Ở ${skill.lockLabel}`,
          {
            fontFamily: 'monospace',
            fontSize: '10px',
            color: '#e8a34d',
            fontStyle: 'bold',
            wordWrap: { width: width - 32 },
          },
        ),
      );
      return;
    }

    this.content?.add(
      this.add.text(x + 16, y + 168, 'THẾ VÀO Ô:', {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: MUTED,
      }),
    );

    for (let slot = 0; slot < 7; slot += 1) {
      const assigned = skill.assignedSlot === slot;
      const column = slot % 4;
      const row = Math.floor(slot / 4);

      this.createActionButton(
        x + 16 + column * 88,
        y + 186 + row * 30,
        78,
        24,
        `Ô ${slot + 3}`,
        assigned ? 0xe8c04a : 0x4dffa6,
        () => {
          this.world.assignSkillToSlot(skill.id, slot);
          this.selectedSkillId = skill.id;
          this.render();
        },
      );
    }

    if (skill.assignedSlot !== null && skill.assignedSlot >= 3) {
      this.createActionButton(
        x + 16 + 3 * 88,
        y + 216,
        78,
        24,
        'BỎ',
        0xff8fa3,
        () => {
          this.world.clearSkillSlot(skill.assignedSlot as number);
          this.selectedSkillId = skill.id;
          this.render();
        },
      );
    }

    this.content?.add(
      this.add.text(
        x + 16,
        y + 262,
        'KHI ĐANG CHƠI: PHÍM 3 / 4 / 5 DÙNG Ô CHÍNH, PHÍM 6 / 7 / 8 / 9 DÙNG Ô PHỤ. Ô CHÍNH KHÔNG ĐƯỢC ĐỂ TRỐNG.',
        {
          fontFamily: 'monospace',
          fontSize: '8px',
          color: MUTED,
          wordWrap: { width: width - 32 },
        },
      ),
    );
  }

  private renderStats(): void {
    const state = this.world.getStatPanelState();

    this.content?.add(
      this.add.text(PANEL_X + 20, PANEL_Y + 104, `ĐIỂM: ${state.statPoints}`, {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: GOLD,
        fontStyle: 'bold',
      }),
    );

    STAT_DEFINITIONS.forEach((stat, index) => {
      const rowY = PANEL_Y + 140 + index * 48;
      const points = state.allocation[stat.id];

      this.content?.add(
        this.add.text(PANEL_X + 20, rowY, `[${index + 1}] ${stat.name}`, {
          fontFamily: 'monospace',
          fontSize: '13px',
          color: stat.colorCss,
          fontStyle: 'bold',
        }),
      );
      this.content?.add(
        this.add.text(PANEL_X + 20, rowY + 18, stat.description, {
          fontFamily: 'monospace',
          fontSize: '8px',
          color: MUTED,
        }),
      );
      this.content?.add(
        this.add
          .text(PANEL_X + 330, rowY + 2, `${points}`, {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: '#e8e6f0',
          })
          .setOrigin(1, 0),
      );

      const button = this.add
        .rectangle(
          PANEL_X + 355,
          rowY - 4,
          34,
          28,
          state.statPoints > 0 ? 0x24304a : 0x181b24,
        )
        .setOrigin(0, 0)
        .setStrokeStyle(2, state.statPoints > 0 ? 0x4da3ff : 0x2a2e3a)
        .setInteractive({ useHandCursor: state.statPoints > 0 });

      this.content?.add(button);
      this.content?.add(
        this.add
          .text(PANEL_X + 372, rowY + 10, '+', {
            fontFamily: 'monospace',
            fontSize: '18px',
            color: state.statPoints > 0 ? '#ffffff' : '#55596b',
          })
          .setOrigin(0.5),
      );

      button.on('pointerdown', () => this.addPoint(stat.id));
    });

    const rightX = PANEL_X + 440;

    this.content?.add(
      this.add.text(rightX, PANEL_Y + 104, 'CHỈ SỐ THÀNH PHẦN', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: MUTED,
      }),
    );

    const rows: [string, string][] = [
      ['HP TỐI ĐA', `${state.maxHealth}`],
      ['GIÁP TỐI ĐA', `${state.maxArmor}`],
      ['NĂNG LƯỢNG TỐI ĐA', `${state.maxEnergy}`],
      ['SỨC ĐÁNH', `${state.attackPower}`],
      ['HỒI CHIÊU', `-${state.cooldownPercent}%`],
      ['TỐC CHẠY', `+${state.speedPercent}%`],
    ];

    // Kháng nguyên tố (đã chặn ở trần 75%), thu gọn để vừa khung.
    this.content?.add(
      this.add.text(rightX, PANEL_Y + 372, 'KHÁNG NGUYÊN TỐ (TỐI ĐA 75%)', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: MUTED,
      }),
    );
    ELEMENT_TYPES.forEach((type, index) => {
      const y = PANEL_Y + 392 + index * 21;

      this.content?.add(
        this.add.text(rightX, y, ELEMENT_LABELS[type], {
          fontFamily: 'monospace',
          fontSize: '12px',
          color: TEXT_COLOR,
        }),
      );
      this.content?.add(
        this.add
          .text(PANEL_X + PANEL_WIDTH - 20, y, `${state.resistPercent[type]}%`, {
            fontFamily: 'monospace',
            fontSize: '13px',
            color: GOLD,
          })
          .setOrigin(1, 0),
      );
    });

    rows.forEach(([label, value], index) => {
      const y = PANEL_Y + 140 + index * 40;

      this.content?.add(
        this.add.text(rightX, y, label, {
          fontFamily: 'monospace',
          fontSize: '12px',
          color: TEXT_COLOR,
        }),
      );
      this.content?.add(
        this.add
          .text(PANEL_X + PANEL_WIDTH - 20, y, value, {
            fontFamily: 'monospace',
            fontSize: '13px',
            color: GOLD,
          })
          .setOrigin(1, 0),
      );
    });
  }

  private renderInventory(): void {
    const state = this.world.getInventoryPanelState();

    if (
      !this.selectedWeaponId ||
      !state.inventory.includes(this.selectedWeaponId)
    ) {
      this.selectedWeaponId = state.inventory[0] ?? null;
    }

    this.content?.add(
      this.add.text(PANEL_X + 20, PANEL_Y + 104, 'TÚI ĐỒ', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: MUTED,
      }),
    );

    state.inventory.forEach((weaponId, index) => {
      const info = WEAPON_INFO[weaponId];
      const rowY = PANEL_Y + 134 + index * 40;
      const selected = weaponId === this.selectedWeaponId;
      const row = this.add
        .rectangle(
          PANEL_X + 20,
          rowY,
          500,
          36,
          selected ? 0x1c2230 : 0x141823,
          1,
        )
        .setOrigin(0, 0)
        .setStrokeStyle(1, selected ? 0x4da3ff : 0x2a2e3a)
        .setInteractive({ useHandCursor: true });

      row.on('pointerdown', () => {
        this.selectedWeaponId = weaponId;
        this.render();
      });

      this.content?.add(row);
      this.content?.add(
        this.add
          .rectangle(
            PANEL_X + 28,
            rowY + 8,
            4,
            20,
            Phaser.Display.Color.HexStringToColor(info.colorCss).color,
          )
          .setOrigin(0, 0),
      );
      this.content?.add(
        this.add.text(PANEL_X + 40, rowY + 4, info.name, {
          fontFamily: 'monospace',
          fontSize: '12px',
          color: info.colorCss,
          fontStyle: 'bold',
        }),
      );
      this.content?.add(
        this.add.text(
          PANEL_X + 40,
          rowY + 20,
          `${info.type} · ${WEAPON_RARITY_LABELS[info.rarity]} · ${info.energyCost} NL`,
          {
            fontFamily: 'monospace',
            fontSize: '8px',
            color: MUTED,
          },
        ),
      );
      this.content?.add(
        this.add
          .text(PANEL_X + 510, rowY + 10, `${info.description}`, {
            fontFamily: 'monospace',
            fontSize: '8px',
            color: TEXT_COLOR,
            align: 'right',
            wordWrap: { width: 220 },
          })
          .setOrigin(1, 0),
      );
    });

    const rightX = PANEL_X + 560;

    this.content?.add(
      this.add.text(rightX, PANEL_Y + 104, 'ĐANG TRANG BỊ', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: MUTED,
      }),
    );

    state.equipped.forEach((weaponId, index) => {
      const info = weaponId ? WEAPON_INFO[weaponId] : null;
      const boxY = PANEL_Y + 134 + index * 62;
      const box = this.add
        .rectangle(rightX, boxY, 260, 52, 0x141823)
        .setOrigin(0, 0)
        .setStrokeStyle(2, info ? 0x4da3ff : 0x3a3d4d)
        .setInteractive({ useHandCursor: true });

      box.on('pointerdown', () => this.equipSelected(index as 0 | 1));

      this.content?.add(box);
      this.content?.add(
        this.add.text(rightX + 12, boxY + 8, `[${index + 1}]`, {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: MUTED,
        }),
      );
      this.content?.add(
        this.add.text(rightX + 12, boxY + 24, info?.name ?? 'TRỐNG', {
          fontFamily: 'monospace',
          fontSize: '13px',
          color: info?.colorCss ?? MUTED,
          fontStyle: 'bold',
        }),
      );
    });

    const selectedInfo = this.selectedWeaponId
      ? WEAPON_INFO[this.selectedWeaponId]
      : null;

    this.content?.add(
      this.add.text(rightX, PANEL_Y + 276, 'ĐÃ CHỌN', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: MUTED,
      }),
    );

    if (selectedInfo) {
      this.content?.add(
        this.add.text(rightX, PANEL_Y + 300, selectedInfo.name, {
          fontFamily: 'monospace',
          fontSize: '16px',
          color: selectedInfo.colorCss,
          fontStyle: 'bold',
        }),
      );
      this.content?.add(
        this.add.text(
          rightX,
          PANEL_Y + 324,
          `${selectedInfo.type} · ${WEAPON_RARITY_LABELS[selectedInfo.rarity]} · ${selectedInfo.energyCost} NL`,
          {
            fontFamily: 'monospace',
            fontSize: '9px',
            color: MUTED,
          },
        ),
      );
      this.content?.add(
        this.add.text(rightX, PANEL_Y + 344, selectedInfo.description, {
          fontFamily: 'monospace',
          fontSize: '9px',
          color: TEXT_COLOR,
          wordWrap: { width: 260 },
        }),
      );
    }

    this.content?.add(
      this.add.text(
        rightX,
        PANEL_Y + 406,
        'CLICK Ô HOẶC NHẤN 1 / 2 ĐỂ TRANG BỊ VŨ KHÍ ĐÃ CHỌN',
        {
          fontFamily: 'monospace',
          fontSize: '8px',
          color: GOLD,
          wordWrap: { width: 280 },
        },
      ),
    );
  }

  private bindEquipClick(): void {
    this.input.on('pointerup', () => this.resolvePendingEquipClick());
  }

  private resolvePendingEquipClick(): void {
    const pending = this.pendingEquipClick;

    this.pendingEquipClick = null;

    if (!pending) {
      return;
    }

    const key =
      pending.type === 'item'
        ? `item:${pending.item.kind}:${pending.item.id}`
        : `slot:${pending.kind}:${pending.slot}`;
    const now = this.time.now;

    if (this.lastEquipClickKey === key && now - this.lastEquipClickAt <= 350) {
      this.lastEquipClickKey = '';
      this.lastEquipClickAt = 0;
      this.activateEquipClick(pending);
    } else {
      this.lastEquipClickKey = key;
      this.lastEquipClickAt = now;

      if (pending.type === 'item') {
        this.selectedEquipItem = pending.item;
      } else if (pending.item) {
        this.selectedEquipItem = pending.item;
      }
    }

    this.render();
  }

  private activateEquipClick(pending: PendingEquipClick): void {
    if (pending.type === 'item') {
      this.equipItem(pending.item);
      this.selectedEquipItem = pending.item;
      return;
    }

    if (pending.kind === 'weapon') {
      this.world.unequipWeapon(pending.slot);
    } else {
      this.world.unequipGear(pending.slot);
    }

    if (pending.item) {
      this.selectedEquipItem = pending.item;
    }
  }

  private equipItem(item: EquipItem): void {
    if (item.kind === 'gear') {
      this.world.equipGearFromInventory(item.id);
      return;
    }

    const state = this.world.getEquipmentPanelState();
    const emptySlot = state.weapons.find((entry) => entry.weaponId === null);

    this.world.equipWeaponFromInventory(item.id, emptySlot?.slot ?? 0);
  }

  private renderEquipment(): void {
    const state = this.world.getEquipmentPanelState();

    this.content?.add(
      this.add.text(PANEL_X + 20, PANEL_Y + 104, 'ĐANG TRANG BỊ', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: MUTED,
      }),
    );
    this.content?.add(
      this.add
        .text(
          PANEL_X + PANEL_WIDTH - 20,
          PANEL_Y + 104,
          'CLICK ĐỂ CHỌN · NHẤP ĐÚP ĐỂ DÙNG',
          {
            fontFamily: 'monospace',
            fontSize: '9px',
            color: GOLD,
          },
        )
        .setOrigin(1, 0),
    );

    const centerX = PANEL_X + 240;
    const gearIdFor = (slot: GearSlot): GearId | null =>
      state.gear.find((entry) => entry.slot === slot)?.gearId ?? null;
    const weaponIdFor = (slot: 0 | 1): WeaponId | null =>
      state.weapons.find((entry) => entry.slot === slot)?.weaponId ?? null;

    this.renderEquippedSlot(
      { kind: 'gear', slot: 'hat' },
      centerX,
      PANEL_Y + 165,
      this.gearItem(gearIdFor('hat')),
    );
    this.renderEquippedSlot(
      { kind: 'weapon', slot: 0 },
      centerX - 140,
      PANEL_Y + 275,
      this.weaponItem(weaponIdFor(0)),
    );
    this.renderEquippedSlot(
      { kind: 'gear', slot: 'armor' },
      centerX,
      PANEL_Y + 275,
      this.gearItem(gearIdFor('armor')),
    );
    this.renderEquippedSlot(
      { kind: 'weapon', slot: 1 },
      centerX + 140,
      PANEL_Y + 275,
      this.weaponItem(weaponIdFor(1)),
    );
    this.renderEquippedSlot(
      { kind: 'gear', slot: 'boots' },
      centerX,
      PANEL_Y + 385,
      this.gearItem(gearIdFor('boots')),
    );

    const gridX = PANEL_X + 520;
    const gridTop = PANEL_Y + 132;
    const gap = ITEM_GRID_GAP;
    const items: EquipItem[] = [
      ...state.weaponInventory.map(
        (id): EquipItem => ({ kind: 'weapon', id }),
      ),
      ...state.gearInventory.map(
        (id): EquipItem => ({ kind: 'gear', id }),
      ),
    ];

    this.content?.add(
      this.add.text(gridX, PANEL_Y + 104, 'VẬT PHẨM', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: MUTED,
      }),
    );

    items.forEach((item, index) => {
      const column = index % ITEM_GRID_COLUMNS;
      const row = Math.floor(index / ITEM_GRID_COLUMNS);

      if (row > 3) {
        return;
      }

      const x =
        gridX +
        ITEM_TILE_SIZE / 2 +
        column * (ITEM_TILE_SIZE + gap);
      const y =
        gridTop +
        ITEM_TILE_SIZE / 2 +
        row * (ITEM_TILE_SIZE + gap);

      this.renderInventoryTile(item, x, y);
    });

    this.renderEquipmentDetails(gridX, PANEL_Y + 397);
  }

  private renderEquippedSlot(
    target: EquipSlotTarget,
    x: number,
    y: number,
    item: EquipItem | null,
  ): void {
    const size = EQUIP_SLOT_SIZE;
    const info = item ? this.getItemInfo(item) : null;
    const accent = info
      ? Phaser.Display.Color.HexStringToColor(info.colorCss).color
      : 0x3a3d4d;
    const selected =
      item !== null && this.isSameItem(item, this.selectedEquipItem);
    const container = this.add.container(x, y);
    const frame = this.add
      .rectangle(
        0,
        0,
        size,
        size,
        info ? RARITY_BACKGROUNDS[info.rarity] : 0x101219,
        0.98,
      )
      .setStrokeStyle(selected ? 3 : 2, selected ? 0xffffff : accent);

    container.add(frame);

    if (info) {
      this.addItemIcon(container, info.textureKey, -6, 42);
      container.add(
        this.add
          .text(0, size / 2 - 13, info.name, {
            fontFamily: 'monospace',
            fontSize: '8px',
            color: info.colorCss,
            align: 'center',
            wordWrap: { width: size - 8 },
          })
          .setOrigin(0.5, 0),
      );
      this.addGearLevelBadge(container, item, size);
    } else {
      container.add(
        this.add
          .text(0, 0, 'TRỐNG', {
            fontFamily: 'monospace',
            fontSize: '9px',
            color: '#55596b',
          })
          .setOrigin(0.5),
      );
    }

    const slotLabel =
      target.kind === 'weapon'
        ? `VŨ KHÍ ${target.slot + 1}`
        : GEAR_SLOT_LABELS[target.slot];

    container.add(
      this.add
        .text(0, -size / 2 - 14, slotLabel, {
          fontFamily: 'monospace',
          fontSize: '9px',
          color: info ? info.colorCss : MUTED,
        })
        .setOrigin(0.5, 0),
    );

    container.setSize(size, size);
    // Container input normalizes to [0, width] after adding displayOrigin,
    // so the hit area must start at 0 or clicks only register up-left.
    container.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, size, size),
      Phaser.Geom.Rectangle.Contains,
    );
    container.on('pointerdown', () => {
      if (target.kind === 'weapon') {
        this.pendingEquipClick = {
          type: 'slot',
          kind: 'weapon',
          slot: target.slot,
          item,
        };
      } else {
        this.pendingEquipClick = {
          type: 'slot',
          kind: 'gear',
          slot: target.slot,
          item,
        };
      }
    });

    this.content?.add(container);
  }

  private renderInventoryTile(item: EquipItem, x: number, y: number): void {
    const size = ITEM_TILE_SIZE;
    const info = this.getItemInfo(item);
    const accent = Phaser.Display.Color.HexStringToColor(info.colorCss).color;
    const selected = this.isSameItem(item, this.selectedEquipItem);
    const container = this.add.container(x, y);
    const frame = this.add
      .rectangle(
        0,
        0,
        size,
        size,
        RARITY_BACKGROUNDS[info.rarity],
        0.98,
      )
      .setStrokeStyle(selected ? 3 : 2, selected ? 0xffffff : accent);

    container.add(frame);
    this.addItemIcon(container, info.textureKey, -5, 32);

    container.add(
      this.add
        .text(0, size / 2 - 12, info.name, {
          fontFamily: 'monospace',
          fontSize: '6px',
          color: info.colorCss,
          align: 'center',
          wordWrap: { width: size - 6 },
        })
        .setOrigin(0.5, 0),
    );
    container.add(
      this.add
        .rectangle(-size / 2 + 4, -size / 2 + 4, 6, 6, accent)
        .setOrigin(0, 0),
    );
    this.addGearLevelBadge(container, item, size);

    container.setSize(size, size);
    // Container input normalizes to [0, width] after adding displayOrigin,
    // so the hit area must start at 0 or clicks only register up-left.
    container.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, size, size),
      Phaser.Geom.Rectangle.Contains,
    );
    container.on('pointerdown', () => {
      this.pendingEquipClick = { type: 'item', item };
    });

    this.content?.add(container);
  }

  private renderEquipmentDetails(x: number, y: number): void {
    const width =
      ITEM_GRID_COLUMNS * (ITEM_TILE_SIZE + ITEM_GRID_GAP) - ITEM_GRID_GAP;
    const height = 88;

    this.content?.add(
      this.add
        .rectangle(x, y, width, height, 0x141823, 1)
        .setOrigin(0, 0)
        .setStrokeStyle(1, 0x2a2e3a),
    );

    const item = this.selectedEquipItem;

    if (!item) {
      this.content?.add(
        this.add.text(x + 10, y + 12, 'CHỌN MỘT VẬT PHẨM ĐỂ XEM', {
          fontFamily: 'monospace',
          fontSize: '9px',
          color: MUTED,
        }),
      );
      this.content?.add(
        this.add.text(
          x + 10,
          y + 30,
          'CLICK TRÁI ĐỂ CHỌN · NHẤP ĐÚP ĐỂ DÙNG',
          {
            fontFamily: 'monospace',
            fontSize: '8px',
            color: TEXT_COLOR,
            wordWrap: { width: width - 20 },
          },
        ),
      );
      return;
    }

    const info = this.getItemInfo(item);
    const equippedSlot = this.getEquippedSlot(item);
    const isWeapon = item.kind === 'weapon';
    const gearLevel =
      item.kind === 'gear' ? this.world.getGearLevel(item.id) : 1;
    const meta = isWeapon
      ? `VŨ KHÍ · ${WEAPON_INFO[item.id].type} · ${WEAPON_RARITY_LABELS[WEAPON_INFO[item.id].rarity]}`
      : `TRANG BỊ · ${GEAR_SLOT_LABELS[GEAR_INFO[item.id].slot]} · ${WEAPON_RARITY_LABELS[GEAR_INFO[item.id].rarity]}${gearLevel > 1 ? ` · LV ${gearLevel}` : ''}`;
    const footer = isWeapon
      ? WEAPON_INFO[item.id].energyCost > 0
        ? `TIÊU HAO NĂNG LƯỢNG: ${WEAPON_INFO[item.id].energyCost}`
        : 'KHÔNG TỐN NĂNG LƯỢNG'
      : getGearBonusLines(GEAR_INFO[item.id], gearLevel).join(' · ');

    this.content?.add(
      this.add.text(x + 10, y + 6, info.name, {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: info.colorCss,
        fontStyle: 'bold',
      }),
    );
    this.content?.add(
      this.add.text(x + 10, y + 30, meta, {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: MUTED,
      }),
    );
    this.content?.add(
      this.add.text(x + 10, y + 44, info.description, {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: TEXT_COLOR,
        wordWrap: { width: width - 20 },
      }),
    );
    this.content?.add(
      this.add.text(x + 10, y + 68, footer, {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: GOLD,
      }),
    );

    if (equippedSlot) {
      this.createActionButton(
        x + width - 78,
        y + 6,
        68,
        20,
        'THÁO',
        0xe8c04a,
        () => {
          if (equippedSlot.kind === 'weapon') {
            this.world.unequipWeapon(equippedSlot.slot);
          } else {
            this.world.unequipGear(equippedSlot.slot);
          }

          this.render();
        },
      );
      return;
    }

    this.createActionButton(
      x + width - 78,
      y + 6,
      68,
      20,
      'VỨT BỎ',
      0xe8434f,
      () => {
        const discarded =
          item.kind === 'weapon'
            ? this.world.discardWeapon(item.id)
            : this.world.discardGear(item.id);

        if (discarded) {
          this.selectedEquipItem = null;
        }

        this.render();
      },
    );
    this.createActionButton(
      x + width - 152,
      y + 6,
      68,
      20,
      'TRANG BỊ',
      0x4dffa6,
      () => {
        this.equipItem(item);
        this.selectedEquipItem = item;
        this.render();
      },
    );
  }

  private createActionButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    accent: number,
    onClick: () => void,
  ): void {
    const background = this.add
      .rectangle(x, y, width, height, 0x1c2230, 1)
      .setOrigin(0, 0)
      .setStrokeStyle(1, accent)
      .setInteractive({ useHandCursor: true });

    background.on('pointerover', () =>
      background.setFillStyle(0x2a3550, 1),
    );
    background.on('pointerout', () =>
      background.setFillStyle(0x1c2230, 1),
    );
    background.on('pointerdown', onClick);

    this.content?.add(background);
    this.content?.add(
      this.add
        .text(x + width / 2, y + height / 2, label, {
          fontFamily: 'monospace',
          fontSize: '8px',
          color: '#e8e6f0',
          fontStyle: 'bold',
        })
        .setOrigin(0.5),
    );
  }

  private getEquippedSlot(item: EquipItem): EquipSlotTarget | null {
    const state = this.world.getEquipmentPanelState();

    if (item.kind === 'weapon') {
      const entry = state.weapons.find(
        (candidate) => candidate.weaponId === item.id,
      );

      return entry ? { kind: 'weapon', slot: entry.slot } : null;
    }

    const entry = state.gear.find(
      (candidate) => candidate.gearId === item.id,
    );

    return entry ? { kind: 'gear', slot: entry.slot } : null;
  }

  private addItemIcon(
    container: Phaser.GameObjects.Container,
    textureKey: string,
    offsetY: number,
    maxSize: number,
  ): void {
    const icon = this.add.image(0, offsetY, textureKey);
    const scale = Math.min(
      maxSize / Math.max(icon.width, 1),
      maxSize / Math.max(icon.height, 1),
    );

    // Scale nguyên (nếu đủ chỗ) để pixel không bị lệch khi phóng đại.
    icon.setScale(scale >= 1 ? Math.floor(scale) : scale);
    container.add(icon);
  }

  private addGearLevelBadge(
    container: Phaser.GameObjects.Container,
    item: EquipItem | null,
    size: number,
  ): void {
    if (!item || item.kind !== 'gear') {
      return;
    }

    const level = this.world.getGearLevel(item.id);

    if (level <= 1) {
      return;
    }

    container.add(
      this.add
        .text(size / 2 - 4, -size / 2 + 3, `LV${level}`, {
          fontFamily: 'monospace',
          fontSize: '8px',
          color: GOLD,
          fontStyle: 'bold',
          backgroundColor: '#0b0c12',
          padding: { x: 2, y: 1 },
        })
        .setOrigin(1, 0),
    );
  }

  private getItemInfo(item: EquipItem) {
    return item.kind === 'weapon'
      ? WEAPON_INFO[item.id]
      : GEAR_INFO[item.id];
  }

  private isSameItem(
    first: EquipItem | null,
    second: EquipItem | null,
  ): boolean {
    return (
      first !== null &&
      second !== null &&
      first.kind === second.kind &&
      first.id === second.id
    );
  }

  private weaponItem(weaponId: WeaponId | null): EquipItem | null {
    return weaponId ? { kind: 'weapon', id: weaponId } : null;
  }

  private gearItem(gearId: GearId | null): EquipItem | null {
    return gearId ? { kind: 'gear', id: gearId } : null;
  }
}
