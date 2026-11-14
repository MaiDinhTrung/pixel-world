import Phaser from 'phaser';

import {
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  GAME_EVENTS,
  SCENE_KEYS,
} from '../config/constants';
import { RARITY_COLORS, RARITY_LABELS, TAG_LABELS } from '../progression/buffCatalog';
import type { LevelUpChoice, LevelUpData } from '../progression/buffTypes';

const CARD_WIDTH = 252;
const CARD_HEIGHT = 232;
const CARD_GAP = 20;
const CARD_Y = 144;

const NAME_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'monospace',
  fontSize: '16px',
  color: '#e8e6f0',
  fontStyle: 'bold',
};

const SMALL_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'monospace',
  fontSize: '10px',
  color: '#8b8fa3',
};

const DESCRIPTION_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'monospace',
  fontSize: '12px',
  color: '#cfd2dd',
  lineSpacing: 2,
};

/** Overlay chọn 1 trong 3 buff khi lên level. WorldScene bị pause trong lúc mở. */
export class LevelUpScene extends Phaser.Scene {
  private levelUpData!: LevelUpData;
  private resolved = false;

  constructor() {
    super(SCENE_KEYS.levelUp);
  }

  init(data: LevelUpData): void {
    this.levelUpData = data;
    this.resolved = false;
  }

  create(): void {
    const { level, choices } = this.levelUpData;

    this.add
      .rectangle(
        DESIGN_WIDTH / 2,
        DESIGN_HEIGHT / 2,
        DESIGN_WIDTH,
        DESIGN_HEIGHT,
        0x000000,
        0.78,
      )
      .setDepth(0);

    this.add
      .text(DESIGN_WIDTH / 2, 64, 'LÊN CẤP', {
        fontFamily: 'monospace',
        fontSize: '44px',
        color: '#e8e6f0',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(1);

    this.add
      .text(
        DESIGN_WIDTH / 2,
        100,
        `LV ${level} — CHỌN 1 TRONG ${choices.length}`,
        {
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#8b8fa3',
        },
      )
      .setOrigin(0.5)
      .setDepth(1);

    const totalWidth =
      choices.length * CARD_WIDTH + Math.max(0, choices.length - 1) * CARD_GAP;
    const startX = (DESIGN_WIDTH - totalWidth) / 2;

    choices.forEach((choice, index) => {
      this.createCard(choice, index, startX + index * (CARD_WIDTH + CARD_GAP));
    });

    this.add
      .text(DESIGN_WIDTH / 2, 416, 'CHUỘT ĐỂ CHỌN · PHÍM 1-3', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#8b8fa3',
      })
      .setOrigin(0.5)
      .setDepth(1);

    const keyboard = this.input.keyboard;

    keyboard?.on('keydown-ONE', () => this.chooseAt(0));
    keyboard?.on('keydown-TWO', () => this.chooseAt(1));
    keyboard?.on('keydown-THREE', () => this.chooseAt(2));
  }

  private createCard(choice: LevelUpChoice, index: number, x: number): void {
    const colorValue = Phaser.Display.Color.HexStringToColor(
      RARITY_COLORS[choice.rarity],
    ).color;

    const card = this.add
      .rectangle(x, CARD_Y, CARD_WIDTH, CARD_HEIGHT, 0x12141c, 0.96)
      .setOrigin(0, 0)
      .setStrokeStyle(3, colorValue)
      .setDepth(1)
      .setInteractive({ useHandCursor: true });

    card.on('pointerover', () => {
      card.setFillStyle(0x1e2434, 0.98);
    });

    card.on('pointerout', () => {
      card.setFillStyle(0x12141c, 0.96);
    });

    card.on('pointerdown', () => this.choose(choice.id));

    this.add
      .text(x + 14, CARD_Y + 12, `[${index + 1}]`, SMALL_STYLE)
      .setDepth(2);

    this.add
      .text(
        x + CARD_WIDTH - 14,
        CARD_Y + 12,
        RARITY_LABELS[choice.rarity],
        {
          ...SMALL_STYLE,
          color: RARITY_COLORS[choice.rarity],
        },
      )
      .setOrigin(1, 0)
      .setDepth(2);

    this.add
      .text(x + 16, CARD_Y + 36, choice.name, {
        ...NAME_STYLE,
        wordWrap: { width: CARD_WIDTH - 32 },
      })
      .setDepth(2);

    this.add
      .text(
        x + 16,
        CARD_Y + 72,
        choice.tags.map((tag) => TAG_LABELS[tag]).join(' · '),
        {
          ...SMALL_STYLE,
          wordWrap: { width: CARD_WIDTH - 32 },
        },
      )
      .setDepth(2);

    this.add
      .text(x + 16, CARD_Y + 96, choice.description, {
        ...DESCRIPTION_STYLE,
        wordWrap: { width: CARD_WIDTH - 32 },
      })
      .setDepth(2);

    this.add
      .text(
        x + 16,
        CARD_Y + CARD_HEIGHT - 24,
        `ĐÃ CÓ ${choice.stacks}/${choice.maxStacks}`,
        {
          ...SMALL_STYLE,
          color: '#e8c04a',
        },
      )
      .setDepth(2);
  }

  private chooseAt(index: number): void {
    const choice = this.levelUpData.choices[index];

    if (choice) {
      this.choose(choice.id);
    }
  }

  private choose(buffId: string): void {
    if (this.resolved) {
      return;
    }

    this.resolved = true;
    this.game.events.emit(GAME_EVENTS.buffPicked, buffId);
    this.scene.resume(SCENE_KEYS.world);
    this.scene.stop();
  }
}
