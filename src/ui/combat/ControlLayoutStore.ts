import type { CharacterId } from '../../config/characters';
import {
  BASE_HUD_LAYOUT,
  CHARACTER_HUD_OVERRIDES,
  CONTROLS_STORAGE_KEY,
  CONTROLS_VERSION,
  EDIT_REGION,
  HUD_BUTTON_IDS,
  HUD_OPACITY,
  HUD_SCALE,
  MAX_DIAMETER_UNITS,
  MIN_DIAMETER_UNITS,
  MIN_TOUCH_CSS_PX,
  type HudButtonId,
} from '../../config/controlsConfig';

/** Tuỳ chỉnh của người chơi cho một nút; thiếu trường nào thì dùng mặc định. */
export interface ButtonUserSetting {
  fromRight?: number;
  fromBottom?: number;
  /** Hệ số nhân kích thước (1 = mặc định). */
  scale?: number;
}

export interface ControlSettings {
  version: number;
  /** Độ trong suốt chung của cụm nút. */
  opacity: number;
  buttons: Partial<Record<HudButtonId, ButtonUserSetting>>;
}

/** Vị trí + kích thước đã tính xong của một nút (đơn vị thiết kế, từ góc dưới-phải). */
export interface ResolvedButton {
  fromRight: number;
  fromBottom: number;
  /** Đường kính tối thiểu theo CSS px (đã áp hệ số và giới hạn 44px). */
  diameterCssPx: number;
}

export function createDefaultSettings(): ControlSettings {
  return {
    version: CONTROLS_VERSION,
    opacity: HUD_OPACITY.default,
    buttons: {},
  };
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Đọc cấu hình đã lưu; dữ liệu hỏng/thiếu thì bỏ qua từng phần, không bao giờ ném lỗi. */
export function loadControlSettings(): ControlSettings {
  const settings = createDefaultSettings();

  try {
    const raw = window.localStorage.getItem(CONTROLS_STORAGE_KEY);

    if (!raw) {
      return settings;
    }

    const data = JSON.parse(raw) as Partial<ControlSettings> | null;

    if (!data || typeof data !== 'object') {
      return settings;
    }

    if (finite(data.opacity)) {
      settings.opacity = clamp(data.opacity, HUD_OPACITY.min, HUD_OPACITY.max);
    }

    for (const id of HUD_BUTTON_IDS) {
      const saved = data.buttons?.[id];

      if (!saved || typeof saved !== 'object') {
        continue;
      }

      const entry: ButtonUserSetting = {};

      if (finite(saved.fromRight) && finite(saved.fromBottom)) {
        entry.fromRight = clamp(saved.fromRight, 0, EDIT_REGION.maxFromRight);
        entry.fromBottom = clamp(
          saved.fromBottom,
          0,
          EDIT_REGION.maxFromBottom,
        );
      }

      if (finite(saved.scale)) {
        entry.scale = clamp(saved.scale, HUD_SCALE.min, HUD_SCALE.max);
      }

      settings.buttons[id] = entry;
    }
  } catch {
    // localStorage bị chặn hoặc JSON hỏng: dùng mặc định.
  }

  return settings;
}

export function saveControlSettings(settings: ControlSettings): void {
  try {
    window.localStorage.setItem(
      CONTROLS_STORAGE_KEY,
      JSON.stringify(settings),
    );
  } catch {
    // Không lưu được (chế độ riêng tư...): cấu hình chỉ có hiệu lực trong phiên này.
  }
}

/** Vị trí/kích thước cuối cùng của nút = mặc định nhân vật + tuỳ chỉnh người chơi. */
export function resolveButton(
  id: HudButtonId,
  characterId: CharacterId,
  settings: ControlSettings,
): ResolvedButton {
  const override = CHARACTER_HUD_OVERRIDES[characterId];
  const spec = override.layout?.[id] ?? BASE_HUD_LAYOUT[id];
  const user = settings.buttons[id];
  const scale =
    (override.scale?.[id] ?? 1) * HUD_SCALE.default * (user?.scale ?? 1);

  return {
    fromRight: user?.fromRight ?? spec.fromRight,
    fromBottom: user?.fromBottom ?? spec.fromBottom,
    diameterCssPx: Math.max(MIN_TOUCH_CSS_PX, spec.diameterCssPx * scale),
  };
}

/** Quy đổi đường kính CSS px sang đơn vị thiết kế theo kích thước canvas đang hiển thị. */
export function diameterInUnits(
  diameterCssPx: number,
  cssPerUnit: number,
): number {
  return clamp(
    diameterCssPx / (cssPerUnit || 1),
    MIN_DIAMETER_UNITS,
    MAX_DIAMETER_UNITS,
  );
}

/** Giữ tâm nút trong vùng cho phép sao cho cả nút nằm trọn trong màn hình. */
export function clampToRegion(
  fromRight: number,
  fromBottom: number,
  radius: number,
): { fromRight: number; fromBottom: number } {
  const min = radius + EDIT_REGION.margin;

  return {
    fromRight: clamp(fromRight, min, Math.max(min, EDIT_REGION.maxFromRight)),
    fromBottom: clamp(
      fromBottom,
      min,
      Math.max(min, EDIT_REGION.maxFromBottom),
    ),
  };
}

export function circlesOverlap(
  ax: number,
  ay: number,
  ar: number,
  bx: number,
  by: number,
  br: number,
): boolean {
  return Math.hypot(ax - bx, ay - by) < ar + br;
}
