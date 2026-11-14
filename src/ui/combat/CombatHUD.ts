import Phaser from 'phaser';

import type { CharacterId } from '../../config/characters';
import { GENERIC_DASH_ENABLED } from '../../config/combatConfig';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../../config/constants';
import {
  CANCEL_ZONE,
  CHARACTER_HUD_OVERRIDES,
  type HudButtonId,
} from '../../config/controlsConfig';
import type { MobileInputManager } from '../../input/MobileInputManager';
import {
  SkillAimingController,
  type AimPreview,
  type SkillCastRequest,
} from '../../input/SkillAimingController';
import type { SkillControl } from '../../skills/skillControl';
import type { SkillHudEntry } from '../Hud';
import { ActionButton, type ButtonGesture } from './ActionButton';
import {
  diameterInUnits,
  loadControlSettings,
  resolveButton,
  type ControlSettings,
} from './ControlLayoutStore';

const SKILL_IDS = [
  'skill0',
  'skill1',
  'skill2',
  'skill3',
  'skill4',
  'skill5',
  'skill6',
] as const;

/** 4 ô kỹ năng phụ hiển thị hình vuông. */
const SQUARE_BUTTONS: ReadonlySet<HudButtonId> = new Set<HudButtonId>([
  'skill3',
  'skill4',
  'skill5',
  'skill6',
]);

const COLORS: Record<HudButtonId, number> = {
  attack: 0xff6b6b,
  skill0: 0x9aa0ad,
  skill1: 0x9aa0ad,
  skill2: 0x9aa0ad,
  skill3: 0x9aa0ad,
  skill4: 0x9aa0ad,
  skill5: 0x9aa0ad,
  skill6: 0x9aa0ad,
  dash: 0x4dd2ff,
  swap: 0xb59cff,
};

const TITLES: Partial<Record<HudButtonId, string>> = {
  attack: 'ĐÁNH',
  dash: 'LƯỚT',
  swap: 'ĐỔI',
};

interface SkillState {
  control: SkillControl | undefined;
  color: number;
  ready: boolean;
}

/**
 * Cụm nút chiến đấu cảm ứng (bên phải): Attack, S1–S3, Swap (+ Dash khi bật cờ rollback).
 * Chỉ vẽ và ghi nhận thao tác; logic chiến đấu nằm ở WorldScene qua InputController.
 * Bố cục lấy từ `config/controlsConfig.ts` (gốc + override theo nhân vật).
 *
 * Kỹ năng `instant`/`target` (hoặc đang hồi/khoá): tung ngay khi chạm.
 * Kỹ năng `directional`/`point`: giữ + kéo để ngắm, thả để tung, thả trong vùng huỷ để huỷ.
 */
export class CombatHUD {
  private readonly scene: Phaser.Scene;
  private readonly characterId: CharacterId;
  private readonly buttons = new Map<HudButtonId, ActionButton>();
  private settings: ControlSettings = loadControlSettings();
  private readonly aiming = new SkillAimingController();
  private readonly skillStates: SkillState[] = SKILL_IDS.map(() => ({
    control: undefined,
    color: 0xffffff,
    ready: false,
  }));
  private readonly cancelZone: Phaser.GameObjects.Arc;
  private readonly cancelLabel: Phaser.GameObjects.Text;
  private cancelX = 0;
  private cancelY = 0;

  private attackHeld = false;
  private pendingAttackPress = false;
  private pendingDash = false;
  private pendingSwap = false;
  private pendingSkill: SkillCastRequest | null = null;

  constructor(
    scene: Phaser.Scene,
    input: MobileInputManager,
    characterId: CharacterId,
    depth: number,
  ) {
    this.scene = scene;
    this.characterId = characterId;

    const make = (
      id: HudButtonId,
      onPress: () => void,
      onRelease?: () => void,
      gesture?: ButtonGesture,
    ) => {
      const button = new ActionButton(scene, {
        shape: SQUARE_BUTTONS.has(id) ? 'square' : 'circle',
        title: TITLES[id] ?? '',
        color: COLORS[id],
        depth,
        onPress,
        onRelease,
        gesture,
      });

      this.buttons.set(id, button);
      input.register(button);
    };

    make(
      'attack',
      () => {
        this.attackHeld = true;
        this.pendingAttackPress = true;
      },
      () => {
        this.attackHeld = false;
      },
    );
    SKILL_IDS.forEach((id, index) => {
      make(id, () => undefined, undefined, this.createSkillGesture(id, index));
    });
    if (GENERIC_DASH_ENABLED) {
      make('dash', () => {
        this.pendingDash = true;
      });
    }
    make('swap', () => {
      this.pendingSwap = true;
    });

    this.cancelZone = scene.add
      .circle(0, 0, CANCEL_ZONE.radius, 0xe8434f, 0.18)
      .setStrokeStyle(3, 0xe8434f, 0.8)
      .setScrollFactor(0)
      .setDepth(depth)
      .setVisible(false);
    this.cancelLabel = scene.add
      .text(0, 0, 'HUỶ', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#ffb3b8',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(depth + 1)
      .setVisible(false);

    this.layout();
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
    });
  }

  private createSkillGesture(
    id: (typeof SKILL_IDS)[number],
    index: number,
  ): ButtonGesture {
    // Mỗi ngón chỉ thuộc một nút, nên cờ này an toàn theo từng nút.
    let aimingThis = false;

    return {
      down: () => {
        const state = this.skillStates[index];
        const control = state.control;
        const aimable =
          state.ready &&
          control !== undefined &&
          (control.kind === 'directional' || control.kind === 'point');

        if (!aimable) {
          // Instant / target / đang hồi / khoá: tung ngay (WorldScene tự xử lý toast).
          this.pendingSkill = { slot: index, aim: null, reach: null };
          return;
        }

        const center = this.buttons.get(id)?.getCenter();

        if (!center) {
          return;
        }

        aimingThis = true;
        this.aiming.begin(index, control, state.color, center.x, center.y);
        this.setCancelZoneVisible(true);
      },
      move: (x, y) => {
        if (aimingThis) {
          this.aiming.update(x, y, this.inCancelZone(x, y));
        }
      },
      up: (x, y) => {
        if (!aimingThis) {
          return;
        }

        aimingThis = false;
        this.setCancelZoneVisible(false);

        const request = this.aiming.end(x, y, this.inCancelZone(x, y));

        if (request) {
          this.pendingSkill = request;
        }
      },
      abort: () => {
        if (aimingThis) {
          aimingThis = false;
          this.aiming.abort();
          this.setCancelZoneVisible(false);
        }
      },
    };
  }

  private inCancelZone(x: number, y: number): boolean {
    return (
      Math.hypot(x - this.cancelX, y - this.cancelY) <= CANCEL_ZONE.radius
    );
  }

  private setCancelZoneVisible(visible: boolean): void {
    this.cancelZone.setVisible(visible);
    this.cancelLabel.setVisible(visible);
  }

  /** Đặt lại vị trí/kích thước (gọi lúc tạo và khi đổi kích thước màn hình). */
  private layout(): void {
    const override = CHARACTER_HUD_OVERRIDES[this.characterId];
    // CSS px trên mỗi đơn vị thiết kế: dùng để giữ nút đủ lớn cho ngón tay.
    const cssPerUnit =
      this.scene.scale.displaySize.height / DESIGN_HEIGHT || 1;

    for (const [id, button] of this.buttons) {
      const resolved = resolveButton(id, this.characterId, this.settings);
      const diameter = diameterInUnits(resolved.diameterCssPx, cssPerUnit);

      button.layout(
        DESIGN_WIDTH - resolved.fromRight,
        DESIGN_HEIGHT - resolved.fromBottom,
        diameter / 2,
        this.settings.opacity,
      );
      button.setEnabled(!override.hidden?.includes(id));
    }

    this.cancelX = DESIGN_WIDTH - CANCEL_ZONE.fromRight;
    this.cancelY = DESIGN_HEIGHT - CANCEL_ZONE.fromBottom;
    this.cancelZone.setPosition(this.cancelX, this.cancelY);
    this.cancelLabel.setPosition(this.cancelX, this.cancelY);
  }

  /** Đọc lại cấu hình người chơi vừa lưu (sau khi đóng panel) và bố trí lại nút. */
  reloadLayout(): void {
    this.settings = loadControlSettings();
    this.layout();
  }

  isAttackHeld(): boolean {
    return this.attackHeld;
  }

  consumeAttackPress(): boolean {
    const value = this.pendingAttackPress;

    this.pendingAttackPress = false;
    return value;
  }

  consumeDash(): boolean {
    const value = this.pendingDash;

    this.pendingDash = false;
    return value;
  }

  consumeSwap(): boolean {
    const value = this.pendingSwap;

    this.pendingSwap = false;
    return value;
  }

  consumeSkill(): SkillCastRequest | null {
    const value = this.pendingSkill;

    this.pendingSkill = null;
    return value;
  }

  /** Dữ liệu vẽ đường ngắm; null khi không ngắm. */
  getAimPreview(): AimPreview | null {
    return this.aiming.getPreview();
  }

  updateDash(remainingMs: number): void {
    this.buttons.get('dash')?.setCooldown(remainingMs);
  }

  updateSkills(entries: SkillHudEntry[]): void {
    SKILL_IDS.forEach((id, index) => {
      const button = this.buttons.get(id);
      const entry = entries[index];

      if (!button || !entry) {
        return;
      }

      const state = this.skillStates[index];

      state.control = entry.control;
      state.color = entry.colorValue;
      state.ready = !entry.locked && entry.remainingMs <= 0;

      button.setTitle(entry.icon);
      button.setCooldown(
        entry.remainingMs,
        entry.locked ? (entry.lockLabel ?? `LV${entry.unlockLevel}`) : null,
      );
    });
  }

  /** Xoá thao tác đang chờ (khi mở/đóng panel). Việc thả nút do MobileInputManager lo. */
  clearPending(): void {
    this.attackHeld = false;
    this.pendingAttackPress = false;
    this.pendingDash = false;
    this.pendingSwap = false;
    this.pendingSkill = null;
    this.aiming.abort();
    this.setCancelZoneVisible(false);
  }
}
