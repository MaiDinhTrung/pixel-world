import Phaser from 'phaser';

import {
  CHARACTERS,
  CHARACTER_LIST,
  WEAPON_LABELS,
  type CharacterDefinition,
} from '../config/characters';
import { DESIGN_HEIGHT, DESIGN_WIDTH, SCENE_KEYS } from '../config/constants';
import type { ProgressData } from '../progression/CharacterProgress';
import { progressStore } from '../progression/ProgressStore';
import { toDisplayEnergy, toDisplayHealth } from '../config/scaleConfig';
import { getSkill } from '../skills/skills';

const CARD_WIDTH = 214;
const CARD_HEIGHT = 400;
const CARD_GAP = 14;
const CARD_Y = 76;

/** Màn chọn nhân vật: 3 class, level đã lưu và trạng thái skill. */
export class CharacterSelectScene extends Phaser.Scene {
  private resolved = false;
  private progress: ProgressData = {};

  constructor() {
    super(SCENE_KEYS.characterSelect);
  }

  create(): void {
    this.resolved = false;
    this.progress = progressStore.getAll();

    this.cameras.main.setBackgroundColor('#07080d');

    this.add
      .text(DESIGN_WIDTH / 2, 30, 'CHỌN ANH HÙNG', {
        fontFamily: 'monospace',
        fontSize: '32px',
        color: '#e8e6f0',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(
        DESIGN_WIDTH / 2,
        58,
        'CẤP ĐỘ VÀ KỸ NĂNG ĐƯỢC LƯU TỰ ĐỘNG',
        {
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#8b8fa3',
        },
      )
      .setOrigin(0.5);

    const totalWidth =
      CHARACTER_LIST.length * CARD_WIDTH +
      (CHARACTER_LIST.length - 1) * CARD_GAP;
    const startX = (DESIGN_WIDTH - totalWidth) / 2;

    CHARACTER_LIST.forEach((character, index) => {
      this.createCard(
        character,
        index,
        startX + index * (CARD_WIDTH + CARD_GAP),
      );
    });

    this.add
      .text(
        DESIGN_WIDTH / 2,
        DESIGN_HEIGHT - 20,
        'CHUỘT / 1-2-3-4 CHỌN · ESC QUAY LẠI',
        {
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#8b8fa3',
        },
      )
      .setOrigin(0.5);

    const keyboard = this.input.keyboard;

    keyboard?.on('keydown-ONE', () => this.chooseAt(0));
    keyboard?.on('keydown-TWO', () => this.chooseAt(1));
    keyboard?.on('keydown-THREE', () => this.chooseAt(2));
    keyboard?.on('keydown-FOUR', () => this.chooseAt(3));
    keyboard?.on('keydown-ESC', () => this.scene.start(SCENE_KEYS.menu));
  }

  private createCard(
    character: CharacterDefinition,
    index: number,
    x: number,
  ): void {
    const level = this.progress[character.id]?.level ?? 1;
    const points = this.progress[character.id]?.statPoints ?? 0;
    const color = Phaser.Display.Color.HexStringToColor(
      character.accent,
    ).color;

    const card = this.add
      .rectangle(x, CARD_Y, CARD_WIDTH, CARD_HEIGHT, 0x11131b, 0.98)
      .setOrigin(0, 0)
      .setStrokeStyle(3, color)
      .setInteractive({ useHandCursor: true });

    card.on('pointerover', () => card.setFillStyle(0x1d2230, 1));
    card.on('pointerout', () => card.setFillStyle(0x11131b, 0.98));
    card.on('pointerdown', () => this.choose(character.id));

    this.add
      .text(x + 14, CARD_Y + 12, `[${index + 1}]`, {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#8b8fa3',
      })
      .setDepth(1);

    this.add
      .text(
        x + CARD_WIDTH - 14,
        CARD_Y + 12,
        `LV ${level}${points > 0 ? ` · +${points}` : ''}`,
        {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#e8c04a',
      })
      .setOrigin(1, 0)
      .setDepth(1);

    const portrait = this.add
      .sprite(
        x + CARD_WIDTH / 2,
        CARD_Y + 88,
        character.textureKey,
        'down-idle-0',
      )
      .setScale(3)
      .setDepth(1);

    portrait.play(`${character.animPrefix}-down-idle`);

    this.add
      .text(x + CARD_WIDTH / 2, CARD_Y + 168, character.name, {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#e8e6f0',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(1);

    this.add
      .text(x + CARD_WIDTH / 2, CARD_Y + 190, character.title, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: character.accent,
      })
      .setOrigin(0.5)
      .setDepth(1);

    this.add
      .text(
        x + CARD_WIDTH / 2,
        CARD_Y + 212,
        `HP ${toDisplayHealth(character.baseHealth)}  GIÁP ${toDisplayHealth(character.baseArmor)}  NL ${toDisplayEnergy(character.baseEnergy)}`,
        {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#cfd2dd',
        },
      )
      .setOrigin(0.5)
      .setDepth(1);

    this.add
      .text(
        x + CARD_WIDTH / 2,
        CARD_Y + 230,
        character.startingWeapons
          .map((weapon) => WEAPON_LABELS[weapon])
          .join(' + '),
        {
          fontFamily: 'monospace',
          fontSize: '9px',
          color: '#8b8fa3',
        },
      )
      .setOrigin(0.5)
      .setDepth(1);

    this.add
      .text(x + 16, CARD_Y + 252, 'KỸ NĂNG · MỜ = CHƯA MỞ', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#6f7487',
      })
      .setDepth(1);

    character.skills.forEach((skillId, skillIndex) => {
      const skill = getSkill(skillId);
      const unlocked = level >= skill.unlockLevel;
      const column = skillIndex < 3 ? 0 : 1;
      const row = skillIndex % 3;

      this.add
        .text(
          x + 12 + column * 102,
          CARD_Y + 270 + row * 26,
          `LV${skill.unlockLevel}  ${skill.name}`,
          {
            fontFamily: 'monospace',
            fontSize: '8px',
            color: unlocked ? skill.colorCss : '#55596b',
          },
        )
        .setDepth(1);
    });

    this.add
      .text(x + 16, CARD_Y + 334, character.description, {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#8b8fa3',
        wordWrap: { width: CARD_WIDTH - 32 },
      })
      .setDepth(1);
  }

  private chooseAt(index: number): void {
    const character = CHARACTER_LIST[index];

    if (character) {
      this.choose(character.id);
    }
  }

  private choose(characterId: keyof typeof CHARACTERS): void {
    if (this.resolved) {
      return;
    }

    this.resolved = true;
    this.scene.start(SCENE_KEYS.world, { characterId });
  }
}
