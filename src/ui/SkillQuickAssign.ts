import Phaser from 'phaser';

import { DESIGN_WIDTH } from '../config/constants';
import type { SkillId } from '../skills/skills';

/** Giữ ô kỹ năng đủ lâu thì mở bảng chọn kỹ năng để thay thế. */
export const SKILL_PICKER_HOLD_MS = 3000;

const DEPTH = 5100;
const CELL_SIZE = 58;
const CELL_GAP = 8;
const PICKER_PADDING = 10;
const PICKER_HEADER_HEIGHT = 20;
const PICKER_GAP_ABOVE_BAR = 10;
/** Dung sai (px) khi kiểm tra ngón tay còn nằm trên ô kỹ năng lúc thả. */
const SLOT_RELEASE_MARGIN = 14;

export interface SkillPickerOption {
  id: SkillId;
  icon: string;
  name: string;
  colorCss: string;
  color: number;
  unlocked: boolean;
  unlockLevel: number;
  /** Ô (0..2) đang gắn kỹ năng này, null nếu chưa gắn. */
  assignedSlot: number | null;
}

export interface SkillBarCallbacks {
  /** Chạm nhanh vào ô: tung kỹ năng ở ô đó. */
  onCast(slot: number): void;
  /** Danh sách kỹ năng nhân vật đang có (gồm cả kỹ năng chưa mở khoá). */
  getOptions(): SkillPickerOption[];
  /** Gán kỹ năng vào ô; kỹ năng cũ của ô được thế chỗ. */
  onAssign(skillId: SkillId, slot: number): void;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PickerCell {
  option: SkillPickerOption;
  rect: Rect;
  frame: Phaser.GameObjects.Rectangle;
}

interface HoldState {
  slot: number;
  pointerId: number;
  startedAt: number;
  pickerOpen: boolean;
}

function contains(rect: Rect, x: number, y: number, margin = 0): boolean {
  return (
    x >= rect.x - margin &&
    x <= rect.x + rect.width + margin &&
    y >= rect.y - margin &&
    y <= rect.y + rect.height + margin
  );
}

/**
 * Thao tác nhanh trên thanh kỹ năng:
 * - chạm nhanh rồi thả trên ô  → tung kỹ năng;
 * - giữ ô đủ SKILL_PICKER_HOLD_MS → hiện các kỹ năng đang có phía trên;
 *   vuốt (không nhấc ngón) tới kỹ năng muốn dùng rồi thả → kỹ năng đó thế chỗ ô vừa giữ.
 *   Thả ra ngoài mọi kỹ năng thì huỷ.
 */
export class SkillQuickAssign {
  private readonly scene: Phaser.Scene;
  private readonly slotRects: readonly Rect[];
  private readonly callbacks: SkillBarCallbacks;
  private readonly holdGraphics: Phaser.GameObjects.Graphics;

  private hold: HoldState | null = null;
  private picker: Phaser.GameObjects.Container | null = null;
  private pickerCells: PickerCell[] = [];
  private hovered: PickerCell | null = null;
  private infoText: Phaser.GameObjects.Text | null = null;

  constructor(
    scene: Phaser.Scene,
    frames: readonly Phaser.GameObjects.Rectangle[],
    slotRects: readonly Rect[],
    callbacks: SkillBarCallbacks,
  ) {
    this.scene = scene;
    this.slotRects = slotRects;
    this.callbacks = callbacks;
    this.holdGraphics = scene.add
      .graphics()
      .setScrollFactor(0)
      .setDepth(DEPTH - 1);

    frames.forEach((frame, index) => {
      frame.setInteractive({ useHandCursor: true });
      frame.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        this.beginHold(index, pointer);
      });
    });

    scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.handleMove(pointer);
    });
    scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      this.handleRelease(pointer);
    });
    scene.input.on('pointerupoutside', (pointer: Phaser.Input.Pointer) => {
      this.handleRelease(pointer);
    });
  }

  /** Gọi mỗi frame: vẽ tiến độ giữ và mở bảng chọn khi đủ thời gian. */
  update(): void {
    this.holdGraphics.clear();

    if (!this.hold || this.hold.pickerOpen) {
      return;
    }

    const elapsed = this.scene.time.now - this.hold.startedAt;
    const progress = Phaser.Math.Clamp(elapsed / SKILL_PICKER_HOLD_MS, 0, 1);
    const rect = this.slotRects[this.hold.slot];

    this.holdGraphics.fillStyle(0xffffff, 0.12 + progress * 0.18);
    this.holdGraphics.fillRect(
      rect.x,
      rect.y + rect.height * (1 - progress),
      rect.width,
      rect.height * progress,
    );

    if (progress >= 1) {
      this.openPicker(this.hold.slot);
    }
  }

  /** True khi đang giữ ô hoặc bảng chọn đang mở. */
  isBusy(): boolean {
    return this.hold !== null;
  }

  private beginHold(slot: number, pointer: Phaser.Input.Pointer): void {
    if (this.hold) {
      return;
    }

    this.hold = {
      slot,
      pointerId: pointer.id,
      startedAt: this.scene.time.now,
      pickerOpen: false,
    };
  }

  private handleMove(pointer: Phaser.Input.Pointer): void {
    if (!this.hold?.pickerOpen || pointer.id !== this.hold.pointerId) {
      return;
    }

    const next =
      this.pickerCells.find((cell) =>
        contains(cell.rect, pointer.x, pointer.y),
      ) ?? null;

    this.setHovered(next);
  }

  private handleRelease(pointer: Phaser.Input.Pointer): void {
    const hold = this.hold;

    if (!hold || pointer.id !== hold.pointerId) {
      return;
    }

    if (hold.pickerOpen) {
      // Cập nhật lần cuối theo vị trí thả rồi chốt lựa chọn.
      this.handleMove(pointer);

      const chosen = this.hovered?.option;

      this.closePicker();
      this.hold = null;

      if (chosen?.unlocked) {
        this.callbacks.onAssign(chosen.id, hold.slot);
      }

      return;
    }

    this.holdGraphics.clear();
    this.hold = null;

    // Thả nhanh trên chính ô đó → tung kỹ năng.
    if (contains(this.slotRects[hold.slot], pointer.x, pointer.y, SLOT_RELEASE_MARGIN)) {
      this.callbacks.onCast(hold.slot);
    }
  }

  private openPicker(slot: number): void {
    if (!this.hold) {
      return;
    }

    const options = this.callbacks.getOptions();

    if (options.length === 0) {
      this.hold = null;
      return;
    }

    this.hold.pickerOpen = true;
    this.holdGraphics.clear();

    const rowWidth =
      options.length * CELL_SIZE + (options.length - 1) * CELL_GAP;
    const panelWidth = rowWidth + PICKER_PADDING * 2;
    const panelHeight =
      PICKER_HEADER_HEIGHT + CELL_SIZE + PICKER_PADDING * 2 + 16;
    const slotRect = this.slotRects[slot];
    const panelX = Phaser.Math.Clamp(
      DESIGN_WIDTH / 2 - panelWidth / 2,
      6,
      DESIGN_WIDTH - panelWidth - 6,
    );
    const panelY = slotRect.y - PICKER_GAP_ABOVE_BAR - panelHeight;
    const rowX = panelX + PICKER_PADDING;
    const rowY = panelY + PICKER_HEADER_HEIGHT + PICKER_PADDING;

    const container = this.scene.add
      .container(0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH);

    container.add(
      this.scene.add
        .rectangle(panelX, panelY, panelWidth, panelHeight, 0x0b0c12, 0.94)
        .setOrigin(0, 0)
        .setStrokeStyle(2, 0xe8c04a),
    );
    container.add(
      this.scene.add
        .text(
          panelX + PICKER_PADDING,
          panelY + 6,
          `VUỐT ĐỂ CHỌN KỸ NĂNG CHO Ô ${slot + 3}`,
          { fontFamily: 'monospace', fontSize: '10px', color: '#e8c04a', fontStyle: 'bold' },
        ),
    );

    this.infoText = this.scene.add
      .text(panelX + PICKER_PADDING, rowY + CELL_SIZE + 5, 'THẢ RA NGOÀI ĐỂ HUỶ', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#8b8fa3',
      });
    container.add(this.infoText);

    this.pickerCells = options.map((option, index) => {
      const rect: Rect = {
        x: rowX + index * (CELL_SIZE + CELL_GAP),
        y: rowY,
        width: CELL_SIZE,
        height: CELL_SIZE,
      };
      const current = option.assignedSlot === slot;
      const frame = this.scene.add
        .rectangle(rect.x, rect.y, rect.width, rect.height, 0x12141c, 1)
        .setOrigin(0, 0)
        .setStrokeStyle(2, option.unlocked ? option.color : 0x3a3d4d);

      container.add(frame);
      container.add(
        this.scene.add
          .text(rect.x + rect.width / 2, rect.y + 22, option.icon, {
            fontFamily: 'monospace',
            fontSize: '18px',
            color: option.unlocked ? option.colorCss : '#55596b',
            fontStyle: 'bold',
          })
          .setOrigin(0.5),
      );
      container.add(
        this.scene.add
          .text(
            rect.x + rect.width / 2,
            rect.y + 43,
            option.unlocked ? option.name : `LV${option.unlockLevel}`,
            {
              fontFamily: 'monospace',
              fontSize: '8px',
              color: option.unlocked ? '#cfd2dd' : '#55596b',
              align: 'center',
              wordWrap: { width: CELL_SIZE - 4 },
            },
          )
          .setOrigin(0.5, 0),
      );

      if (option.assignedSlot !== null) {
        container.add(
          this.scene.add
            .text(
              rect.x + 4,
              rect.y + 2,
              `${option.assignedSlot + 3}`,
              {
                fontFamily: 'monospace',
                fontSize: '10px',
                color: current ? '#4dffa6' : '#e8c04a',
                fontStyle: 'bold',
              },
            ),
        );
      }

      return { option, rect, frame };
    });

    this.picker = container;
    this.vibrate();
  }

  private setHovered(cell: PickerCell | null): void {
    if (cell === this.hovered) {
      return;
    }

    if (this.hovered) {
      const { option, frame } = this.hovered;

      frame
        .setFillStyle(0x12141c, 1)
        .setStrokeStyle(2, option.unlocked ? option.color : 0x3a3d4d);
    }

    this.hovered = cell;

    if (cell) {
      cell.frame
        .setFillStyle(0x2a2e3a, 1)
        .setStrokeStyle(3, 0xffffff);
      this.infoText?.setText(
        cell.option.unlocked
          ? cell.option.name
          : `${cell.option.name} · KHOÁ ĐẾN LV${cell.option.unlockLevel}`,
      );
    } else {
      this.infoText?.setText('THẢ RA NGOÀI ĐỂ HUỶ');
    }
  }

  private closePicker(): void {
    this.picker?.destroy();
    this.picker = null;
    this.pickerCells = [];
    this.hovered = null;
    this.infoText = null;
  }

  private vibrate(): void {
    try {
      navigator.vibrate?.(25);
    } catch {
      // Không phải thiết bị nào cũng hỗ trợ rung.
    }
  }
}
