import type { CharacterId } from './characters';
import { GENERIC_DASH_ENABLED } from './combatConfig';

/**
 * Cấu hình điều khiển cảm ứng / Combat HUD. Toạ độ trong hệ thiết kế 960×540,
 * tính từ GÓC DƯỚI-PHẢI của màn hình (offset dương = vào trong màn hình).
 * Đây là giá trị khởi đầu, sẽ tinh chỉnh khi có bản thử trên thiết bị.
 */

/** Vùng chạm tối thiểu (CSS px) để ngón cái bấm chính xác. */
export const MIN_TOUCH_CSS_PX = 44;

/** Mã các nút trên HUD cảm ứng. */
export type HudButtonId =
  | 'attack'
  | 'skill0'
  | 'skill1'
  | 'skill2'
  | 'skill3'
  | 'skill4'
  | 'skill5'
  | 'skill6'
  | 'dash'
  | 'swap';

/**
 * Nút LƯỚT chung chỉ tồn tại khi bật cờ rollback `GENERIC_DASH_ENABLED`.
 * Mặc định cơ động là kỹ năng riêng của lớp, gán vào ô S1–S3.
 */
export const HUD_BUTTON_IDS: readonly HudButtonId[] = [
  'attack',
  'skill0',
  'skill1',
  'skill2',
  'skill3',
  'skill4',
  'skill5',
  'skill6',
  ...(GENERIC_DASH_ENABLED ? (['dash'] as const) : []),
  'swap',
];

/** Nhãn tiếng Việt của từng nút (dùng ở màn chỉnh bố cục). */
export const HUD_BUTTON_NAMES: Record<HudButtonId, string> = {
  attack: 'TẤN CÔNG',
  skill0: 'KỸ NĂNG 1',
  skill1: 'KỸ NĂNG 2',
  skill2: 'KỸ NĂNG 3',
  skill3: 'KỸ NĂNG 4',
  skill4: 'KỸ NĂNG 5',
  skill5: 'KỸ NĂNG 6',
  skill6: 'KỸ NĂNG 7',
  dash: 'LƯỚT',
  swap: 'ĐỔI',
};

/** Giới hạn đường kính nút (đơn vị thiết kế) sau khi quy đổi từ CSS px. */
export const MIN_DIAMETER_UNITS = 40; // đường kính nút nhỏ nhất
export const MAX_DIAMETER_UNITS = 170; // đường kính nút lớn nhất

/**
 * Vùng người chơi được phép đặt nút: nửa phải màn hình, phần dưới.
 * Khoảng cách từ mép phải/dưới tới TÂM nút; `margin` giữ nút không sát mép.
 */
export const EDIT_REGION = {
  maxFromRight: 480,
  maxFromBottom: 420,
  margin: 8,
} as const;

export const SCALE_STEP = 0.1; // mỗi lần bấm +/− đổi kích thước 10%
export const OPACITY_STEP = 0.1; // mỗi lần bấm +/− đổi độ mờ 10%

/** Vị trí và kích thước của một nút. */
export interface HudButtonLayout {
  /** Khoảng cách từ mép phải màn hình tới tâm nút (đơn vị thiết kế). */
  readonly fromRight: number;
  /** Khoảng cách từ mép dưới màn hình tới tâm nút (đơn vị thiết kế). */
  readonly fromBottom: number;
  /** Đường kính hiển thị mong muốn (CSS px). */
  readonly diameterCssPx: number;
}

/** Bố cục của toàn bộ các nút. */
export type HudLayout = Record<HudButtonId, HudButtonLayout>;

/** Joystick di chuyển bên trái màn hình. */
export const JOYSTICK_CONFIG = {
  /** Bán kính nền (đơn vị thiết kế). */
  baseRadius: 60,
  thumbRadius: 26, // bán kính núm tròn
  deadzone: 0.2, // kéo dưới 20% thì coi như đứng yên
  /** Joystick nổi chỉ nhận chạm ở phần trăm chiều rộng này tính từ mép trái. */
  zoneWidthRatio: 0.5,
} as const;

/** Ngắm bằng cách kéo nút kỹ năng. */
export const AIMING_CONFIG = {
  /** Kéo quá ngưỡng này (px thiết kế) mới tính là ngắm; chưa quá thì nhấc = quick-cast. */
  dragThresholdPx: 12,
  /** Kéo tối đa tương ứng 100% tầm kỹ năng. */
  dragMaxPx: 90,
} as const;

/** Vùng huỷ kỹ năng hiện khi đang ngắm; tính từ góc dưới-phải (đơn vị thiết kế). */
export const CANCEL_ZONE = {
  fromRight: 380,
  fromBottom: 330,
  radius: 44,
} as const;

/** Khoá lưu bố cục nút trong localStorage và phiên bản dữ liệu (đổi khi cấu trúc thay đổi). */
export const CONTROLS_STORAGE_KEY = 'pixel-world:controls:v1';
export const CONTROLS_VERSION = 1;

/** Độ mờ của nút HUD (0–1): nhỏ nhất, lớn nhất, mặc định. */
export const HUD_OPACITY = { min: 0.3, max: 1, default: 0.85 } as const;
/** Hệ số phóng to nút HUD: nhỏ nhất, lớn nhất, mặc định. */
export const HUD_SCALE = { min: 0.7, max: 1.4, default: 1 } as const;

/** Bố cục gốc dùng chung cho mọi nhân vật. */
export const BASE_HUD_LAYOUT: HudLayout = {
  attack: { fromRight: 110, fromBottom: 110, diameterCssPx: 96 },
  skill0: { fromRight: 230, fromBottom: 100, diameterCssPx: 62 },
  skill1: { fromRight: 198, fromBottom: 196, diameterCssPx: 62 },
  skill2: { fromRight: 110, fromBottom: 230, diameterCssPx: 62 },
  // 4 ô kỹ năng phụ: hàng ngang dưới-giữa, giữa joystick và cụm nút phải.
  skill3: { fromRight: 480, fromBottom: 40, diameterCssPx: 44 },
  skill4: { fromRight: 420, fromBottom: 40, diameterCssPx: 44 },
  skill5: { fromRight: 360, fromBottom: 40, diameterCssPx: 44 },
  skill6: { fromRight: 300, fromBottom: 40, diameterCssPx: 44 },
  dash: { fromRight: 36, fromBottom: 205, diameterCssPx: 46 },
  swap: { fromRight: 36, fromBottom: 280, diameterCssPx: 46 },
};

/** Tuỳ chỉnh bố cục riêng cho một nhân vật. */
export interface CharacterHudOverride {
  /** Hệ số nhân kích thước theo nút (mặc định 1). */
  readonly scale?: Partial<Record<HudButtonId, number>>;
  /** Ghi đè vị trí/kích thước từng nút. */
  readonly layout?: Partial<HudLayout>;
  /** Ẩn nút (ví dụ nhân vật không cần Swap). */
  readonly hidden?: readonly HudButtonId[];
}

/** Chỉ khai báo phần KHÁC bố cục gốc. */
export const CHARACTER_HUD_OVERRIDES: Record<CharacterId, CharacterHudOverride> =
  {
    knight: {},
    ranger: { scale: { dash: 0.9 } },
    mage: {
      scale: { skill0: 1.1, skill1: 1.1, skill2: 1.1, attack: 0.9 },
    },
    necromancer: {
      scale: { skill0: 1.1, skill1: 1.1, skill2: 1.1, attack: 0.9 },
    },
  };
