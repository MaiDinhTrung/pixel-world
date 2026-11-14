import Phaser from 'phaser';

import type { CharacterId } from '../../config/characters';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../../config/constants';
import {
  EDIT_REGION,
  HUD_BUTTON_IDS,
  HUD_BUTTON_NAMES,
  HUD_OPACITY,
  HUD_SCALE,
  JOYSTICK_CONFIG,
  OPACITY_STEP,
  SCALE_STEP,
  type HudButtonId,
} from '../../config/controlsConfig';
import {
  circlesOverlap,
  clampToRegion,
  createDefaultSettings,
  diameterInUnits,
  loadControlSettings,
  resolveButton,
  saveControlSettings,
  type ControlSettings,
} from './ControlLayoutStore';

const PREVIEW_X = 60;
const PREVIEW_Y = 134;
const PREVIEW_SCALE = 0.6;
const SIDE_X = 664;
const MUTED = '#8b8fa3';
const TEXT = '#e8e6f0';

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

const SHORT_NAMES: Record<HudButtonId, string> = {
  attack: 'ĐÁNH',
  skill0: 'S1',
  skill1: 'S2',
  skill2: 'S3',
  skill3: 'S4',
  skill4: 'S5',
  skill5: 'S6',
  skill6: 'S7',
  dash: 'LƯỚT',
  swap: 'ĐỔI',
};

interface Placed {
  fromRight: number;
  fromBottom: number;
  radius: number;
}

/**
 * Tab SETTINGS của panel nhân vật: bản xem trước đúng tỉ lệ màn hình, người chơi
 * kéo từng nút trong vùng cho phép, chỉnh kích thước từng nút và độ trong suốt chung.
 * Mọi thay đổi được lưu ngay (localStorage) và áp vào HUD khi đóng panel.
 */
export function buildControlSettingsTab(
  scene: Phaser.Scene,
  parent: Phaser.GameObjects.Container,
  characterId: CharacterId,
): void {
  const settings: ControlSettings = loadControlSettings();
  const cssPerUnit = scene.scale.displaySize.height / DESIGN_HEIGHT || 1;
  let selected: HudButtonId = 'attack';
  let status = 'Kéo nút trong vùng xanh để đặt vị trí.';
  let layer: Phaser.GameObjects.Container | null = null;

  const toPreviewX = (fromRight: number) =>
    PREVIEW_X + (DESIGN_WIDTH - fromRight) * PREVIEW_SCALE;
  const toPreviewY = (fromBottom: number) =>
    PREVIEW_Y + (DESIGN_HEIGHT - fromBottom) * PREVIEW_SCALE;

  const place = (id: HudButtonId): Placed => {
    const resolved = resolveButton(id, characterId, settings);

    return {
      fromRight: resolved.fromRight,
      fromBottom: resolved.fromBottom,
      radius: diameterInUnits(resolved.diameterCssPx, cssPerUnit) / 2,
    };
  };

  const overlapsOthers = (id: HudButtonId, candidate: Placed): boolean =>
    HUD_BUTTON_IDS.some((other) => {
      if (other === id) {
        return false;
      }

      const o = place(other);

      return circlesOverlap(
        candidate.fromRight,
        candidate.fromBottom,
        candidate.radius,
        o.fromRight,
        o.fromBottom,
        o.radius,
      );
    });

  const commit = () => saveControlSettings(settings);

  const text = (
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
    value: string,
    size: number,
    color: string,
  ): Phaser.GameObjects.Text => {
    const label = scene.add.text(x, y, value, {
      fontFamily: 'monospace',
      fontSize: `${size}px`,
      color,
      wordWrap: { width: 230 },
    });

    container.add(label);
    return label;
  };

  const makeButton = (
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
    width: number,
    label: string,
    onClick: () => void,
  ) => {
    const box = scene.add
      .rectangle(x, y, width, 30, 0x141823)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0x3a3d4d)
      .setInteractive({ useHandCursor: true });
    const caption = scene.add
      .text(x + width / 2, y + 15, label, {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: TEXT,
      })
      .setOrigin(0.5);

    box.on('pointerover', () => box.setStrokeStyle(2, 0x4da3ff));
    box.on('pointerout', () => box.setStrokeStyle(2, 0x3a3d4d));
    box.on('pointerdown', onClick);
    container.add([box, caption]);
  };

  const build = () => {
    layer?.destroy(true);
    layer = scene.add.container(0, 0);
    parent.add(layer);

    const root = layer;
    const frameW = DESIGN_WIDTH * PREVIEW_SCALE;
    const frameH = DESIGN_HEIGHT * PREVIEW_SCALE;

    root.add(
      scene.add
        .rectangle(PREVIEW_X, PREVIEW_Y, frameW, frameH, 0x07080c, 1)
        .setOrigin(0, 0)
        .setStrokeStyle(2, 0x3a3d4d),
    );

    // Vùng được phép đặt nút (nửa phải, phía dưới).
    const regionX = toPreviewX(EDIT_REGION.maxFromRight);
    const regionY = toPreviewY(EDIT_REGION.maxFromBottom);

    root.add(
      scene.add
        .rectangle(
          regionX,
          regionY,
          PREVIEW_X + frameW - regionX,
          PREVIEW_Y + frameH - regionY,
          0x4dff9a,
          0.07,
        )
        .setOrigin(0, 0)
        .setStrokeStyle(1, 0x4dff9a, 0.6),
    );
    root.add(
      text(root, regionX + 6, regionY + 4, 'VÙNG ĐẶT NÚT', 9, '#4dff9a'),
    );

    // Joystick (cố định, chỉ để tham chiếu).
    root.add(
      scene.add
        .circle(
          PREVIEW_X + 140 * PREVIEW_SCALE,
          PREVIEW_Y + 410 * PREVIEW_SCALE,
          JOYSTICK_CONFIG.baseRadius * PREVIEW_SCALE,
          0xffffff,
          0.08,
        )
        .setStrokeStyle(1, 0xffffff, 0.35),
    );
    root.add(
      text(root, PREVIEW_X + 70 * PREVIEW_SCALE, PREVIEW_Y + 470 * PREVIEW_SCALE, 'CẦN ĐIỀU KHIỂN', 9, MUTED),
    );

    const circles = new Map<HudButtonId, Phaser.GameObjects.Arc>();
    const labels = new Map<HudButtonId, Phaser.GameObjects.Text>();

    const highlight = () => {
      for (const [id, circle] of circles) {
        circle.setStrokeStyle(
          id === selected ? 4 : 2,
          id === selected ? 0xffffff : COLORS[id],
          id === selected ? 1 : 0.9,
        );
      }
    };

    for (const id of HUD_BUTTON_IDS) {
      const placed = place(id);
      const x = toPreviewX(placed.fromRight);
      const y = toPreviewY(placed.fromBottom);
      const radius = placed.radius * PREVIEW_SCALE;
      const circle = scene.add
        .circle(x, y, radius, COLORS[id], settings.opacity * 0.5)
        .setInteractive(
          new Phaser.Geom.Circle(radius, radius, radius),
          Phaser.Geom.Circle.Contains,
        );
      const label = scene.add
        .text(x, y, SHORT_NAMES[id], {
          fontFamily: 'monospace',
          fontSize: `${Math.max(9, Math.round(radius * 0.5))}px`,
          color: '#ffffff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);

      scene.input.setDraggable(circle);
      circles.set(id, circle);
      labels.set(id, label);
      root.add([circle, label]);

      let before: Placed = placed;

      circle.on('dragstart', () => {
        selected = id;
        before = place(id);
        highlight();
        refreshSide();
      });
      circle.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
        const fromRight = DESIGN_WIDTH - (dragX - PREVIEW_X) / PREVIEW_SCALE;
        const fromBottom = DESIGN_HEIGHT - (dragY - PREVIEW_Y) / PREVIEW_SCALE;
        const clamped = clampToRegion(fromRight, fromBottom, placed.radius);

        circle.setPosition(
          toPreviewX(clamped.fromRight),
          toPreviewY(clamped.fromBottom),
        );
        label.setPosition(circle.x, circle.y);
      });
      circle.on('dragend', () => {
        const fromRight = DESIGN_WIDTH - (circle.x - PREVIEW_X) / PREVIEW_SCALE;
        const fromBottom = DESIGN_HEIGHT - (circle.y - PREVIEW_Y) / PREVIEW_SCALE;
        const candidate: Placed = {
          fromRight,
          fromBottom,
          radius: placed.radius,
        };

        if (overlapsOthers(id, candidate)) {
          circle.setPosition(
            toPreviewX(before.fromRight),
            toPreviewY(before.fromBottom),
          );
          label.setPosition(circle.x, circle.y);
          status = 'Trùng với nút khác — đã trả về vị trí cũ.';
        } else {
          settings.buttons[id] = {
            ...settings.buttons[id],
            fromRight,
            fromBottom,
          };
          commit();
          status = `Đã lưu vị trí ${HUD_BUTTON_NAMES[id]}.`;
        }

        refreshSide();
      });
      circle.on('pointerdown', () => {
        selected = id;
        highlight();
        refreshSide();
      });
    }

    highlight();

    // ── Cột bên phải ────────────────────────────────────────────────────────
    text(root, SIDE_X, 134, 'ĐANG CHỌN', 10, MUTED);
    const selectedText = text(root, SIDE_X, 150, '', 16, '#ffe066');

    text(root, SIDE_X, 186, 'KÍCH THƯỚC NÚT', 10, MUTED);
    makeButton(root, SIDE_X, 202, 44, '−', () => changeScale(-SCALE_STEP));
    const sizeText = text(root, SIDE_X + 62, 209, '', 14, TEXT);
    makeButton(root, SIDE_X + 150, 202, 44, '+', () => changeScale(SCALE_STEP));

    text(root, SIDE_X, 250, 'ĐỘ TRONG SUỐT (TẤT CẢ)', 10, MUTED);
    makeButton(root, SIDE_X, 266, 44, '−', () => changeOpacity(-OPACITY_STEP));
    const opacityText = text(root, SIDE_X + 62, 273, '', 14, TEXT);
    makeButton(root, SIDE_X + 150, 266, 44, '+', () => changeOpacity(OPACITY_STEP));

    makeButton(root, SIDE_X, 322, 200, 'RESET NÚT NÀY', () => {
      delete settings.buttons[selected];
      commit();
      status = `Đã đặt lại ${HUD_BUTTON_NAMES[selected]}.`;
      build();
    });
    makeButton(root, SIDE_X, 360, 200, 'RESET TẤT CẢ', () => {
      const fresh = createDefaultSettings();

      settings.opacity = fresh.opacity;
      settings.buttons = fresh.buttons;
      commit();
      status = 'Đã đặt lại toàn bộ bố cục.';
      build();
    });

    if (scene.scale.fullscreen.available) {
      makeButton(root, SIDE_X, 398, 200, 'TOÀN MÀN HÌNH', () => {
        scene.scale.toggleFullscreen();
      });
    }

    const statusText = text(root, SIDE_X, 440, '', 11, '#4dff9a');

    text(
      root,
      PREVIEW_X,
      PREVIEW_Y + frameH + 8,
      'Nửa trái màn hình là joystick di chuyển. Bố cục áp dụng khi đóng panel.',
      10,
      MUTED,
    );

    function refreshSide(): void {
      const user = settings.buttons[selected];

      selectedText.setText(HUD_BUTTON_NAMES[selected]);
      sizeText.setText(`${Math.round((user?.scale ?? 1) * 100)}%`);
      opacityText.setText(`${Math.round(settings.opacity * 100)}%`);
      statusText.setText(status);
    }

    function changeScale(delta: number): void {
      const user = settings.buttons[selected] ?? {};
      const current = user.scale ?? 1;
      const next = Phaser.Math.Clamp(
        Math.round((current + delta) * 100) / 100,
        HUD_SCALE.min,
        HUD_SCALE.max,
      );

      if (next === current) {
        return;
      }

      const previous = settings.buttons[selected];

      settings.buttons[selected] = { ...user, scale: next };

      // Nút to ra có thể tràn ra ngoài vùng hoặc đè nút khác: ép vào vùng rồi kiểm tra.
      const grown = place(selected);
      const clamped = clampToRegion(
        grown.fromRight,
        grown.fromBottom,
        grown.radius,
      );
      const candidate: Placed = { ...grown, ...clamped };

      if (overlapsOthers(selected, candidate)) {
        if (previous) {
          settings.buttons[selected] = previous;
        } else {
          delete settings.buttons[selected];
        }

        status = 'Không đủ chỗ để đổi cỡ (sẽ đè nút khác).';
      } else {
        settings.buttons[selected] = { ...user, scale: next, ...clamped };
        commit();
        status = `Đã lưu cỡ ${HUD_BUTTON_NAMES[selected]}.`;
      }

      build();
    }

    function changeOpacity(delta: number): void {
      settings.opacity = Phaser.Math.Clamp(
        Math.round((settings.opacity + delta) * 100) / 100,
        HUD_OPACITY.min,
        HUD_OPACITY.max,
      );
      commit();
      status = 'Đã lưu độ trong suốt.';
      build();
    }

    refreshSide();
  };

  build();
}
