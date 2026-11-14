import Phaser from 'phaser';

import type { Weapon } from '../combat/Weapon';
import {
  BERSERK_DAMAGE_MULT,
  EXHAUST_DAMAGE_MULT,
  GENERIC_DASH_ENABLED,
} from '../config/combatConfig';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../config/constants';
import { MIN_TOUCH_CSS_PX } from '../config/controlsConfig';
import { NEON_CSS } from '../config/palette';
import type { Player } from '../entities/Player';
import type { LevelSystem } from '../progression/LevelSystem';
import type { SkillControl } from '../skills/skillControl';
import { isTouchDevice } from '../utils/device';
import { toDisplayHealth } from '../config/scaleConfig';
import { setTextColor, setTextValue } from '../utils/textCache';
import {
  SKILL_PICKER_HOLD_MS,
  SkillQuickAssign,
  type SkillBarCallbacks,
} from './SkillQuickAssign';

export interface SkillHudEntry {
  keyLabel: string;
  icon: string;
  /** Kiểu điều khiển của kỹ năng (bỏ trống = instant). */
  control?: SkillControl;
  name: string;
  color: string;
  colorValue: number;
  unlockLevel: number;
  cooldownMs: number;
  remainingMs: number;
  locked: boolean;
  /** Chữ hiện trên ô khi khoá (mặc định `LV{unlockLevel}`). */
  lockLabel?: string;
  /** Ô kỹ năng phụ chưa gán kỹ năng. */
  empty?: boolean;
}

interface SkillSlotUi {
  frame: Phaser.GameObjects.Rectangle;
  keyText: Phaser.GameObjects.Text;
  nameText: Phaser.GameObjects.Text;
  overlay: Phaser.GameObjects.Rectangle;
  cooldownText: Phaser.GameObjects.Text;
  lockText: Phaser.GameObjects.Text;
  progressBackground: Phaser.GameObjects.Rectangle;
  progressFill: Phaser.GameObjects.Rectangle;
}

export interface SkillStatus {
  dashRemainingMs: number;
  skills: SkillHudEntry[];
}

const PANEL_X = 12;
const PANEL_Y = 12;
const PANEL_WIDTH = 220;
const PANEL_HEIGHT = 46;

// HP / máu ảo / mana nằm trên đầu nhân vật (xem `ui/PlayerBars.ts`); bảng này chỉ còn level + XP.
const XP_BAR_X = 24;
const XP_BAR_WIDTH = PANEL_WIDTH - 24;
const XP_BAR_Y = 36;
const XP_BAR_HEIGHT = 6;

const MENU_BUTTON_X = 12;
const MENU_BUTTON_Y = 66;
const MENU_BUTTON_SIZE = 38;

const SKILL_SLOT_COUNT = 7;
const SKILL_BOX_WIDTH = 388;
const SKILL_BOX_HEIGHT = 82;
const SKILL_BOX_X = (DESIGN_WIDTH - SKILL_BOX_WIDTH) / 2;
const SKILL_BOX_Y = DESIGN_HEIGHT - SKILL_BOX_HEIGHT - 30;
const SKILL_SLOT_SIZE = 48;
const SKILL_SLOT_GAP = 6;
const SKILL_SLOT_START_X = SKILL_BOX_X + 8;
const SKILL_SLOT_Y = SKILL_BOX_Y + 16;
const SKILL_PROGRESS_HEIGHT = 3;

/** HUD cố định theo camera: chỉ số, level, vũ khí, synergy, skill và màn hình chết. */
export class Hud {
  private readonly scene: Phaser.Scene;
  private readonly bars: Phaser.GameObjects.Graphics;
  private readonly levelText: Phaser.GameObjects.Text;
  private readonly xpValueText: Phaser.GameObjects.Text;
  private readonly weaponText: Phaser.GameObjects.Text;
  private readonly statPointsText: Phaser.GameObjects.Text;
  private readonly buffText: Phaser.GameObjects.Text;
  private readonly goldText: Phaser.GameObjects.Text;
  private readonly runText: Phaser.GameObjects.Text;
  private readonly dashText: Phaser.GameObjects.Text;
  private readonly interactPrompt: Phaser.GameObjects.Text;
  private readonly menuAlert: Phaser.GameObjects.Container;
  private readonly skillSlots: SkillSlotUi[];
  private readonly quickAssign: SkillQuickAssign;
  /** Cảm ứng: thanh kỹ năng này được thay bằng CombatHUD (S1–S3 bên phải). */
  private readonly skillBarHidden = isTouchDevice();
  private barsSignature = '';
  private readonly skillBarChrome: Phaser.GameObjects.Components.Visible[] = [];
  private readonly deathOverlay: Phaser.GameObjects.Container;

  constructor(
    scene: Phaser.Scene,
    onMenuClick: () => void,
    skillBar: SkillBarCallbacks,
  ) {
    this.scene = scene;

    scene.add
      .rectangle(PANEL_X, PANEL_Y, PANEL_WIDTH, PANEL_HEIGHT, 0x0b0c12, 0.7)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0x3a3d4d)
      .setScrollFactor(0)
      .setDepth(5000);

    this.bars = scene.add.graphics().setScrollFactor(0).setDepth(5001);

    this.levelText = scene.add
      .text(24, 24, 'ĐẤU SĨ  LV 1', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#e8c04a',
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(5001);

    this.xpValueText = scene.add
      .text(PANEL_X + PANEL_WIDTH - 8, 24, '0/20', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#8b8fa3',
      })
      .setOrigin(1, 0.5)
      .setScrollFactor(0)
      .setDepth(5001);

    this.menuAlert = this.createMenuButton(scene, onMenuClick);
    this.skillSlots = this.createSkillSlots(scene);
    this.quickAssign = new SkillQuickAssign(
      scene,
      this.skillSlots.map((slot) => slot.frame),
      this.skillSlots.map((_, index) => ({
        x: SKILL_SLOT_START_X + index * (SKILL_SLOT_SIZE + SKILL_SLOT_GAP),
        y: SKILL_SLOT_Y,
        width: SKILL_SLOT_SIZE,
        height: SKILL_SLOT_SIZE,
      })),
      skillBar,
    );

    if (this.skillBarHidden) {
      this.hideSkillBar();
    }

    this.weaponText = scene.add
      .text(DESIGN_WIDTH - 16, 20, '', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: NEON_CSS.gold,
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(5001);

    this.statPointsText = scene.add
      .text(DESIGN_WIDTH - 16, 46, '', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: NEON_CSS.gold,
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(5001);

    this.buffText = scene.add
      .text(DESIGN_WIDTH - 16, 68, '', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: NEON_CSS.cyan,
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(5001);

    this.goldText = scene.add
      .text(DESIGN_WIDTH - 16, 88, '', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ffd24a',
        fontStyle: 'bold',
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(5001);

    this.runText = scene.add
      .text(DESIGN_WIDTH / 2, 10, '', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#8b8fa3',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(5001);

    this.interactPrompt = scene.add
      .text(DESIGN_WIDTH / 2, 414, '', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: NEON_CSS.gold,
        backgroundColor: '#0b0c12',
        padding: { x: 10, y: 6 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(5050)
      .setVisible(false);

    // Dòng trạng thái Dash chung chỉ hiện ở desktop và khi bật cờ rollback.
    scene.add
      .rectangle(DESIGN_WIDTH - 16, 424, 150, 26, 0x0b0c12, 0.55)
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(5000)
      .setStrokeStyle(1, 0x2a2e3a)
      .setVisible(GENERIC_DASH_ENABLED && !isTouchDevice());

    this.dashText = scene.add
      .text(DESIGN_WIDTH - 24, 437, '', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: NEON_CSS.cyan,
      })
      .setOrigin(1, 0.5)
      .setScrollFactor(0)
      .setDepth(5001)
      .setVisible(GENERIC_DASH_ENABLED && !isTouchDevice());

    scene.add
      .text(
        DESIGN_WIDTH / 2,
        DESIGN_HEIGHT - 14,
        'WASD DI CHUYỂN · CHUỘT NGẮM · CHUỘT TRÁI/SPACE ĐÁNH · 1/2 VŨ KHÍ · 3/4/5 KỸ NĂNG · F NHẶT · TAB MENU',
        {
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#8b8fa3',
        },
      )
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setDepth(5001)
      .setVisible(!isTouchDevice());

    const dim = scene.add.rectangle(
      DESIGN_WIDTH / 2,
      DESIGN_HEIGHT / 2,
      DESIGN_WIDTH,
      DESIGN_HEIGHT,
      0x000000,
      0.65,
    );
    const title = scene.add
      .text(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2 - 24, 'BẠN ĐÃ CHẾT', {
        fontFamily: 'monospace',
        fontSize: '48px',
        color: '#e8434f',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const subtitle = scene.add
      .text(
        DESIGN_WIDTH / 2,
        DESIGN_HEIGHT / 2 + 28,
        isTouchDevice() ? 'CHẠM ĐỂ CHƠI LẠI' : 'NHẤN R ĐỂ CHƠI LẠI',
        {
          fontFamily: 'monospace',
          fontSize: '18px',
          color: '#cfd2dd',
        },
      )
      .setOrigin(0.5);

    this.deathOverlay = scene.add
      .container(0, 0, [dim, title, subtitle])
      .setScrollFactor(0)
      .setDepth(5100)
      .setVisible(false);
  }

  private createMenuButton(
    scene: Phaser.Scene,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const button = scene.add
      .rectangle(
        MENU_BUTTON_X,
        MENU_BUTTON_Y,
        MENU_BUTTON_SIZE,
        MENU_BUTTON_SIZE,
        0x0b0c12,
        0.85,
      )
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0x3a3d4d)
      .setScrollFactor(0)
      .setDepth(5002)
      .setInteractive({ useHandCursor: true });

    // Cảm ứng: nút 38 đơn vị chỉ ~27 CSS px trên điện thoại, nới vùng chạm tới 44px.
    if (isTouchDevice()) {
      const cssPerUnit = scene.scale.displaySize.height / DESIGN_HEIGHT || 1;
      const pad = Math.max(
        0,
        (MIN_TOUCH_CSS_PX / cssPerUnit - MENU_BUTTON_SIZE) / 2,
      );

      button.setInteractive(
        new Phaser.Geom.Rectangle(
          -pad,
          -pad,
          MENU_BUTTON_SIZE + pad * 2,
          MENU_BUTTON_SIZE + pad * 2,
        ),
        Phaser.Geom.Rectangle.Contains,
      );
    }

    button.on('pointerover', () => {
      button.setFillStyle(0x1c2230, 0.95);
      button.setStrokeStyle(2, 0x4da3ff);
    });

    button.on('pointerout', () => {
      button.setFillStyle(0x0b0c12, 0.85);
      button.setStrokeStyle(2, 0x3a3d4d);
    });

    button.on('pointerdown', onClick);

    for (let index = 0; index < 3; index += 1) {
      scene.add
        .rectangle(
          MENU_BUTTON_X + 10,
          MENU_BUTTON_Y + 13 + index * 6,
          18,
          3,
          0xcfd2dd,
        )
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
        .setDepth(5003);
    }

    const badge = scene.add
      .container(MENU_BUTTON_X + MENU_BUTTON_SIZE - 3, MENU_BUTTON_Y + 3)
      .setScrollFactor(0)
      .setDepth(5004)
      .setVisible(false);

    badge.add([
      scene.add.circle(0, 0, 8, 0xe8434f).setStrokeStyle(2, 0x0b0c12),
      scene.add
        .text(0, 0, '!', {
          fontFamily: 'monospace',
          fontSize: '12px',
          color: '#ffffff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5),
    ]);

    scene.tweens.add({
      targets: badge,
      scale: { from: 1, to: 1.2 },
      duration: 550,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    return badge;
  }

  private hideSkillBar(): void {
    for (const object of this.skillBarChrome) {
      object.setVisible(false);
    }

    for (const slot of this.skillSlots) {
      slot.frame.disableInteractive();
    }

    // Không có entry thì mọi phần của ô đều bị ẩn.
    this.updateSkillSlots([]);
  }

  private createSkillSlots(scene: Phaser.Scene): SkillSlotUi[] {
    const box = scene.add
      .rectangle(
        SKILL_BOX_X,
        SKILL_BOX_Y,
        SKILL_BOX_WIDTH,
        SKILL_BOX_HEIGHT,
        0x0b0c12,
        0.55,
      )
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(5000)
      .setStrokeStyle(1, 0x2a2e3a);

    const header = scene.add
      .text(SKILL_BOX_X + 10, SKILL_BOX_Y + 4, `KỸ NĂNG · GIỮ ${SKILL_PICKER_HOLD_MS / 1000}s ĐỂ ĐỔI`, {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#8b8fa3',
      })
      .setScrollFactor(0)
      .setDepth(5001);

    this.skillBarChrome.push(box, header);

    const slots: SkillSlotUi[] = [];
    const progressWidth = SKILL_SLOT_SIZE - 6;

    for (let index = 0; index < SKILL_SLOT_COUNT; index += 1) {
      const x = SKILL_SLOT_START_X + index * (SKILL_SLOT_SIZE + SKILL_SLOT_GAP);
      const centerX = x + SKILL_SLOT_SIZE / 2;
      const centerY = SKILL_SLOT_Y + SKILL_SLOT_SIZE / 2;

      const frame = scene.add
        .rectangle(
          x,
          SKILL_SLOT_Y,
          SKILL_SLOT_SIZE,
          SKILL_SLOT_SIZE,
          0x12141c,
          0.96,
        )
        .setOrigin(0, 0)
        .setStrokeStyle(2, 0x2a2e3a)
        .setScrollFactor(0)
        .setDepth(5001);

      const keyText = scene.add
        .text(x + 4, SKILL_SLOT_Y + 2, '', {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#e8c04a',
          fontStyle: 'bold',
        })
        .setScrollFactor(0)
        .setDepth(5003);

      const nameText = scene.add
        .text(centerX, centerY + 4, '', {
          fontFamily: 'monospace',
          fontSize: '8px',
          color: '#cfd2dd',
          align: 'center',
          wordWrap: { width: SKILL_SLOT_SIZE - 8 },
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(5003);

      const overlay = scene.add
        .rectangle(
          x,
          SKILL_SLOT_Y,
          SKILL_SLOT_SIZE,
          SKILL_SLOT_SIZE,
          0x05060a,
          0.55,
        )
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(5002)
        .setVisible(false);

      const cooldownText = scene.add
        .text(centerX, centerY, '', {
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#ffffff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(5004)
        .setVisible(false);

      const lockText = scene.add
        .text(centerX, centerY, '', {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#8b8fa3',
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(5004)
        .setVisible(false);

      const progressBackground = scene.add
        .rectangle(
          x + 3,
          SKILL_SLOT_Y + SKILL_SLOT_SIZE - 6,
          progressWidth,
          SKILL_PROGRESS_HEIGHT,
          0x1b1c24,
          1,
        )
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(5003)
        .setVisible(false);

      const progressFill = scene.add
        .rectangle(
          x + 3,
          SKILL_SLOT_Y + SKILL_SLOT_SIZE - 6,
          progressWidth,
          SKILL_PROGRESS_HEIGHT,
          0xffffff,
          1,
        )
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(5004)
        .setVisible(false);

      slots.push({
        frame,
        keyText,
        nameText,
        overlay,
        cooldownText,
        lockText,
        progressBackground,
        progressFill,
      });
    }

    return slots;
  }

  private updateSkillSlots(entries: SkillHudEntry[]): void {
    this.skillSlots.forEach((slot, index) => {
      const entry = entries[index];

      if (!entry) {
        slot.frame.setVisible(false);
        slot.keyText.setVisible(false);
        slot.nameText.setVisible(false);
        slot.overlay.setVisible(false);
        slot.cooldownText.setVisible(false);
        slot.lockText.setVisible(false);
        slot.progressBackground.setVisible(false);
        slot.progressFill.setVisible(false);
        return;
      }

      const cooling = entry.remainingMs > 0;
      const locked = entry.locked;
      const accent = locked ? 0x3a3d4d : entry.colorValue;

      slot.frame.setStrokeStyle(2, cooling || locked ? 0x2a2e3a : accent);
      setTextValue(slot.keyText, entry.keyLabel);
      setTextColor(slot.keyText, locked ? '#55596b' : '#e8c04a');
      setTextValue(slot.nameText, entry.name);
      setTextColor(slot.nameText, locked ? '#55596b' : entry.color);

      slot.overlay.setVisible(cooling || locked);
      slot.overlay.setAlpha(locked ? 0.8 : 0.55);

      slot.cooldownText.setVisible(cooling && !locked);
      setTextValue(slot.cooldownText, 
        cooling ? `${(entry.remainingMs / 1000).toFixed(1)}s` : '',
      );
      setTextColor(slot.cooldownText, entry.color);

      slot.lockText.setVisible(locked);
      setTextValue(
        slot.lockText,
        locked ? (entry.lockLabel ?? `LV${entry.unlockLevel}`) : '',
      );

      const showProgress = cooling && !locked && entry.cooldownMs > 0;

      slot.progressBackground.setVisible(showProgress);
      slot.progressFill.setVisible(showProgress);

      if (showProgress) {
        const recovered = Phaser.Math.Clamp(
          1 - entry.remainingMs / entry.cooldownMs,
          0,
          1,
        );

        slot.progressFill.setScale(recovered, 1);
        slot.progressFill.setFillStyle(entry.colorValue);
      }
    });
  }

  update(
    player: Player,
    weapon: Weapon | null,
    levelSystem: LevelSystem,
    skills: SkillStatus,
    characterName: string,
    statPoints: number,
  ): void {
    this.drawBars(levelSystem);

    setTextValue(this.levelText, `${characterName}  LV ${levelSystem.getLevel()}`);
    setTextValue(this.xpValueText, 
      `${Math.floor(levelSystem.getXp())}/${levelSystem.getXpToNext()}`,
    );

    if (weapon) {
      const energy =
        weapon.energyCost > 0 ? `  -${weapon.energyCost} NL` : '';

      setTextValue(this.weaponText, `${weapon.name}${energy}  [1/2]`);
    } else {
      setTextValue(this.weaponText, 'KHÔNG CÓ VŨ KHÍ  [1/2]');
    }
    setTextValue(this.statPointsText, 
      statPoints > 0 ? `+${statPoints} ĐIỂM CHỈ SỐ  [TAB]` : '',
    );
    this.menuAlert.setVisible(statPoints > 0);
    this.updateBuffText(player);

    if (GENERIC_DASH_ENABLED) {
      this.updateSkillText(
        this.dashText,
        'SHIFT LƯỚT',
        skills.dashRemainingMs,
        NEON_CSS.cyan,
        '#5a7f8a',
      );
    }

    if (!this.skillBarHidden) {
      this.updateSkillSlots(skills.skills);
      this.quickAssign.update();
    }

    this.deathOverlay.setVisible(player.isDead());
  }

  private updateBuffText(player: Player): void {
    const now = this.scene.time.now;
    const parts: string[] = [];
    const armorRemaining = player.getArmorBuffRemaining(now);

    if (armorRemaining > 0) {
      parts.push(
        `+${toDisplayHealth(player.getArmorBuffBonus())} MÁU ẢO ${(armorRemaining / 1000).toFixed(1)}s`,
      );
    }

    const rageRemaining = player.getRageRemaining(now);
    const rageState = player.getRageState();

    if (rageRemaining > 0 && rageState === 'berserk') {
      parts.push(
        `CUỒNG NỘ x${BERSERK_DAMAGE_MULT} ST ${(rageRemaining / 1000).toFixed(1)}s`,
      );
    } else if (rageRemaining > 0 && rageState === 'exhausted') {
      parts.push(
        `KIỆT QUỆ x${EXHAUST_DAMAGE_MULT} ST ${(rageRemaining / 1000).toFixed(1)}s`,
      );
    }

    const furyRemaining = player.getMeleeFuryRemaining(now);

    if (furyRemaining > 0) {
      parts.push(
        `CUỒNG NỘ +${player.getMeleeFuryDamagePercent()}% ST +${player.getMeleeFuryAttackSpeedPercent()}% TĐ ${(furyRemaining / 1000).toFixed(1)}s`,
      );
    }

    setTextValue(this.buffText, parts.join('  ·  '));
  }

  showToast(text: string, color: string = NEON_CSS.gold): void {
    const toast = this.scene.add
      .text(DESIGN_WIDTH / 2, 144, text, {
        fontFamily: 'monospace',
        fontSize: '16px',
        color,
        backgroundColor: '#0b0c12',
        padding: { x: 10, y: 6 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(5050);

    this.scene.tweens.add({
      targets: toast,
      alpha: 0,
      y: 120,
      delay: 1400,
      duration: 500,
      onComplete: () => toast.destroy(),
    });
  }

  /** Hiển thị số vàng đang có (góc phải). */
  setGold(amount: number): void {
    setTextValue(this.goldText, `VÀNG ${amount}`);
  }

  setInteractPrompt(text: string | null): void {
    setTextValue(this.interactPrompt, text ?? '');
    this.interactPrompt.setVisible(Boolean(text));
  }

  setRunInfo(
    elapsedMs: number,
    threat: number,
    bossText = '',
  ): void {
    const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    const bossSuffix = bossText ? ` · ${bossText}` : '';

    setTextValue(this.runText, 
      `THỜI GIAN ${minutes}:${seconds} · MỐI ĐE DỌA ${threat}${bossSuffix}`,
    );
    setTextColor(this.runText, 
      threat >= 5
        ? '#ff8fa3'
        : threat >= 3
          ? '#ffe066'
          : threat >= 1
            ? '#cfd2dd'
            : '#8b8fa3',
    );
  }

  private updateSkillText(
    text: Phaser.GameObjects.Text,
    label: string,
    remainingMs: number,
    readyColor: string,
    cooldownColor: string,
  ): void {
    if (remainingMs > 0) {
      setTextValue(text, `${label}  ${(remainingMs / 1000).toFixed(1)}s`);
      setTextColor(text, cooldownColor);
    } else {
      setTextValue(text, `${label}  SẴN SÀNG`);
      setTextColor(text, readyColor);
    }
  }

  private drawBars(levelSystem: LevelSystem): void {
    // So theo độ rộng pixel của thanh XP để khỏi vẽ lại mỗi frame.
    const signature = String(
      Math.ceil(
        XP_BAR_WIDTH *
          Phaser.Math.Clamp(
            levelSystem.getXp() / levelSystem.getXpToNext(),
            0,
            1,
          ),
      ),
    );

    if (signature === this.barsSignature) {
      return;
    }

    this.barsSignature = signature;
    this.bars.clear();

    const xpRatio = Phaser.Math.Clamp(
      levelSystem.getXp() / levelSystem.getXpToNext(),
      0,
      1,
    );

    this.bars.fillStyle(0x1b1c24, 1);
    this.bars.fillRect(XP_BAR_X, XP_BAR_Y, XP_BAR_WIDTH, XP_BAR_HEIGHT);

    if (xpRatio > 0) {
      this.bars.fillStyle(0xe8c04a, 1);
      this.bars.fillRect(
        XP_BAR_X,
        XP_BAR_Y,
        Math.ceil(XP_BAR_WIDTH * xpRatio),
        XP_BAR_HEIGHT,
      );
    }
  }
}
