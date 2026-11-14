/**
 * Tường thành bao quanh làng (`world/castleWall.ts`). Đường biên lấy từ `VILLAGE_ZONE`;
 * cổng mở đúng chỗ các con đường lát đá đi qua (ngang y = 1280, dọc x = 1920).
 */

/** Độ dày thân tường (px). */
export const CASTLE_WALL_THICKNESS = 36;
/** Chiều cao thân tường vẽ nhô lên (px). */
export const CASTLE_WALL_HEIGHT = 84;
/** Răng cưa trên đỉnh: chiều cao, bề rộng, khoảng hở (px). */
export const CASTLE_MERLON_HEIGHT = 14;
export const CASTLE_MERLON_WIDTH = 18;
export const CASTLE_MERLON_GAP = 14;

/** Nửa bề rộng cổng (px): người chơi và quái đi qua được khoảng này. */
export const CASTLE_GATE_HALF_WIDTH = 56;
/** Toạ độ tâm cổng: cổng Bắc/Nam ở x này, cổng Tây/Đông ở y này. */
export const CASTLE_GATE_X = 1920;
export const CASTLE_GATE_Y = 1280;

/** Tháp góc và tháp cổng: cạnh vuông (px) và chiều cao (px). */
export const CASTLE_CORNER_TOWER_SIZE = 84;
export const CASTLE_CORNER_TOWER_HEIGHT = 128;
export const CASTLE_GATE_TOWER_SIZE = 64;
export const CASTLE_GATE_TOWER_HEIGHT = 112;

/** Độ nghiêng của khối so với chiều cao (chiếu xiên; > 0 để thấy cả mặt gạch phía trong của tường dọc). */
export const CASTLE_SHEAR = 0.35;

/** Chia tường dài thành từng đoạn (px) để mỗi đoạn là một ảnh nhỏ, sắp xếp chiều sâu đúng khi đi dọc tường. */
export const CASTLE_CHUNK_HORIZONTAL = 256;
export const CASTLE_CHUNK_VERTICAL = 128;

/** Hiệu ứng trồi lên lúc vào scene: thời lượng mỗi đoạn và độ trễ giữa các đoạn (ms), độ sâu bắt đầu (px). */
export const CASTLE_RISE_MS = 420;
export const CASTLE_RISE_STAGGER_MS = 35;
export const CASTLE_RISE_FROM_PX = 36;
