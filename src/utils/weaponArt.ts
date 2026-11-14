/**
 * Art pixel của vũ khí cầm tay, vẽ ở mật độ 1 texel = 1 px thế giới (cùng mật độ với nhân vật,
 * frame 48×48) và hiển thị ở scale 1 (không phóng đại).
 *
 * Mỗi vũ khí chỉ vẽ phần "ruột" (fill) bằng ký tự; bộ dựng `buildArt` tự thêm:
 *  - đổ bóng: ô chất liệu có ramp `[sáng, tối]` → pixel mép trên thành màu sáng, mép dưới thành màu tối;
 *  - viền 1 px (4 hướng) màu tối quanh toàn bộ hình, nên mọi vũ khí có độ dày viền đồng nhất.
 *
 * Mọi vũ khí vẽ chỉ về phía +x (mũi/nòng/đầu ở bên phải) vì sprite được xoay theo hướng ngắm.
 * Tọa độ cầm (`grip`) ở `config/weaponSpriteConfig.ts` tính theo toạ độ fill (trước khi thêm viền).
 *
 * File này không import Phaser để test và công cụ xem trước dùng được.
 */

import type { WeaponId } from '../combat/Weapon';

export interface WeaponArt {
  /** Các hàng ký tự cuối cùng (đã đổ bóng + viền), mọi hàng cùng độ dài. */
  readonly rows: readonly string[];
  readonly palette: Readonly<Record<string, string>>;
  /** Số pixel viền thêm quanh fill (0 nếu art đã tự có viền). */
  readonly pad: number;
}

export interface ArtSource {
  fill: readonly string[];
  palette: Record<string, string>;
  /** Chất liệu → [màu mép trên, màu mép dưới]. */
  ramps?: Record<string, readonly [string, string]>;
  /** Ký tự viền; bỏ trống = không thêm viền/pad. */
  outline?: string;
  /** Ký tự không tạo viền quanh nó (dây cung mảnh 1 px). */
  noOutline?: string;
}

const EMPTY = '.';

export function buildArt(source: ArtSource): WeaponArt {
  const height = source.fill.length;
  const width = Math.max(...source.fill.map((row) => row.length));
  const grid = source.fill.map((row) => row.padEnd(width, EMPTY).split(''));
  const at = (x: number, y: number): string => grid[y]?.[x] ?? EMPTY;
  const shaded = grid.map((row) => row.slice());

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const ramp = source.ramps?.[grid[y][x]];

      if (!ramp) {
        continue;
      }

      if (at(x, y - 1) === EMPTY) {
        shaded[y][x] = ramp[0];
      } else if (at(x, y + 1) === EMPTY) {
        shaded[y][x] = ramp[1];
      }
    }
  }

  if (!source.outline) {
    return {
      rows: shaded.map((row) => row.join('')),
      palette: source.palette,
      pad: 0,
    };
  }

  const ignored = source.noOutline ?? '';
  const solid = (x: number, y: number): boolean => {
    const c = at(x, y);

    return c !== EMPTY && !ignored.includes(c);
  };
  const out: string[][] = [];

  for (let y = -1; y <= height; y += 1) {
    const row: string[] = [];

    for (let x = -1; x <= width; x += 1) {
      if (at(x, y) !== EMPTY) {
        row.push(shaded[y][x]);
      } else if (
        solid(x - 1, y) ||
        solid(x + 1, y) ||
        solid(x, y - 1) ||
        solid(x, y + 1)
      ) {
        row.push(source.outline);
      } else {
        row.push(EMPTY);
      }
    }

    out.push(row);
  }

  return {
    rows: out.map((row) => row.join('')),
    palette: source.palette,
    pad: 1,
  };
}

/** Ghép nửa trên + hàng giữa + nửa trên lật dọc (cung đối xứng qua tay cầm). */
function mirrorV(top: readonly string[], middle: readonly string[]): string[] {
  return [...top, ...middle, ...[...top].reverse()];
}

/** Lưới ký tự rỗng `width × height` để vẽ hình bằng code. */
export function emptyGrid(width: number, height: number): string[][] {
  return Array.from({ length: height }, () => Array<string>(width).fill(EMPTY));
}

// ─── Kiếm thép: lưỡi xám có rãnh, mũi nhọn; chắn tay cong về phía mũi; cán quấn vàng; núm tròn ──
const SWORD_WIDTH = 41;
const SWORD_HEIGHT = 12;

function swordFill(): string[] {
  const grid = emptyGrid(SWORD_WIDTH, SWORD_HEIGHT);

  // Lưỡi: 6 hàng (3..8) tới x=30, thu còn 4 hàng (4..7) tới x=35, 2 hàng (5..6) tới x=38, mũi nhọn x 39..40.
  for (let x = 12; x < SWORD_WIDTH; x += 1) {
    const top = x <= 30 ? 3 : x <= 35 ? 4 : x <= 38 ? 5 : 5;
    const bottom = x <= 30 ? 8 : x <= 35 ? 7 : x <= 38 ? 6 : 5;

    for (let y = top; y <= bottom; y += 1) {
      // Rãnh giữa lưỡi (2 hàng) từ x=13 tới 32.
      grid[y][x] = (y === 5 || y === 6) && x >= 13 && x <= 32 ? 'f' : 'M';
    }
  }

  // Chắn tay: thanh dọc x 9..10 (hàng 2..9), hai đầu cong về phía mũi kiếm (x 11, hàng 1 và 10).
  for (let y = 2; y <= 9; y += 1) {
    grid[y][9] = 'S';
    grid[y][10] = 'S';
  }

  grid[1][10] = 'S';
  grid[1][11] = 'S';
  grid[10][10] = 'S';
  grid[10][11] = 'S';

  // Cán quấn dây vàng/nâu x 3..8 (hàng 5..6 đầy đủ, thêm hàng 4/7 cho dày), núm tròn x 0..2.
  for (let y = 4; y <= 7; y += 1) {
    for (let x = 3; x <= 8; x += 1) {
      grid[y][x] = (x + y) % 2 === 0 ? 'W' : 'y';
    }
  }

  for (let y = 4; y <= 7; y += 1) {
    for (let x = 0; x <= 2; x += 1) {
      grid[y][x] = 'P';
    }
  }

  grid[3][1] = 'P';
  grid[3][2] = 'P';
  grid[8][1] = 'P';
  grid[8][2] = 'P';

  return grid.map((row) => row.join(''));
}

const SWORD = buildArt({
  fill: swordFill(),
  palette: {
    O: '#1b1d26',
    h: '#f6f9fc', // mép sáng thép
    M: '#cbd3dc', // thân lưỡi
    f: '#9ba7b4', // rãnh lưỡi
    d: '#6c7886', // mép tối
    s: '#e4e9ee', // chắn tay sáng
    S: '#b7c0ca', // chắn tay
    t: '#7d8895', // chắn tay tối
    P: '#c3cbd4', // núm cán
    p: '#7d8895', // núm cán tối
    y: '#e0a93a', // dây quấn vàng
    W: '#6b4a1e', // dây quấn nâu
  },
  ramps: { M: ['h', 'd'], S: ['s', 't'], P: ['h', 'p'] },
  outline: 'O',
});

// ─── Song đao (lưỡi hỗn mang): cán đỏ quấn, chắn tay đồng có sừng + ngọc đỏ, thân đen có rune cam phát sáng,
// mép dưới có khấc răng và mũi cong. Một thanh; vũ khí dùng 2 sprite. ──
const DUAL_BLADE_WIDTH = 31;
const DUAL_BLADE_HEIGHT = 11;

function dualBladeFill(): string[] {
  const grid = emptyGrid(DUAL_BLADE_WIDTH, DUAL_BLADE_HEIGHT);
  const set = (x: number, y: number, c: string): void => {
    if (grid[y]?.[x] !== undefined) {
      grid[y][x] = c;
    }
  };

  // Núm cán x 0..1 (hàng 3..7).
  for (let y = 3; y <= 7; y += 1) {
    for (let x = 0; x <= 1; x += 1) {
      set(x, y, 'P');
    }
  }

  // Cán đỏ quấn x 2..8 (hàng 4..6), đai sẫm xen kẽ.
  for (let y = 4; y <= 6; y += 1) {
    for (let x = 2; x <= 8; x += 1) {
      set(x, y, x % 2 === 0 ? 'r' : 'q');
    }
  }

  // Chắn tay đồng x 9..11 cao 11 hàng, hai sừng nhô ra trước x 12..13 ở trên và dưới; ngọc đỏ ở giữa.
  for (let y = 0; y <= 10; y += 1) {
    for (let x = 9; x <= 11; x += 1) {
      set(x, y, 'G');
    }
  }

  for (const y of [0, 1, 9, 10]) {
    set(12, y, 'G');
  }

  set(13, 0, 'G');
  set(13, 10, 'G');
  set(10, 5, 'g');

  // Thân lưỡi x 12..30: sống thẳng ở trên, mép dưới có khấc răng (x 15..16) rồi cong dần về mũi.
  for (let x = 12; x <= 30; x += 1) {
    const top = x <= 22 ? 2 : Math.round(2 + (x - 22) * 0.5);
    let bottom: number;

    if (x <= 14) {
      bottom = 8;
    } else if (x <= 16) {
      bottom = 6; // khấc răng
    } else if (x <= 22) {
      bottom = 9;
    } else {
      bottom = Math.max(top, Math.round(9 - (x - 22) * 0.45));
    }

    for (let y = top; y <= bottom; y += 1) {
      set(x, y, y === bottom ? 'E' : 'D');
    }
  }

  // Rune cam: đường giữa + các nhánh chữ thập.
  const rune = (x: number, y: number, c = 'R'): void => {
    if (grid[y]?.[x] === 'D') {
      set(x, y, c);
    }
  };

  for (let x = 14; x <= 27; x += 1) {
    rune(x, 5);
  }

  rune(17, 4);
  rune(17, 6);
  rune(14, 4);
  rune(14, 6);

  for (let y = 3; y <= 7; y += 1) {
    rune(21, y);
  }

  rune(21, 5, 'Y');
  rune(24, 4);
  rune(24, 6);

  return grid.map((row) => row.join(''));
}

const DUAL_BLADE = buildArt({
  fill: dualBladeFill(),
  palette: {
    O: '#120808',
    P: '#c9a05a', // núm cán đồng
    p: '#6b4a22',
    r: '#c0242e', // cán đỏ
    q: '#6e0f16', // đai sẫm
    G: '#b98a4a', // chắn tay đồng
    z: '#5a3a1c',
    g: '#ff3b2f', // ngọc đỏ
    D: '#2a1814', // thân lưỡi đen nâu
    d: '#120a08',
    h: '#4a3028', // mép sáng của thân
    E: '#d09a58', // mép sắc đồng
    R: '#ff8a1f', // rune cam
    Y: '#ffe08a', // điểm giao rune sáng
  },
  ramps: { D: ['h', 'd'], G: ['E', 'z'], P: ['E', 'p'] },
  outline: 'O',
});

// ─── Súng năng lượng: thân kim loại, lõi năng lượng phát sáng, nòng có vòng vàng ──
const BLASTER = buildArt({
  fill: [
    '...AAAAAAAA.......',
    '..AAAAcCcAAAAAAAAY',
    '..AAAACCCAAAAAAAAC',
    '..AAAAcCcAAAAAAAAY',
    '...AAAAAAAAA......',
    '....GGG...........',
    '....GgG...........',
    '....GgG...........',
  ],
  palette: {
    O: '#10131b',
    H: '#b4c0d8',
    A: '#6d7890',
    a: '#434b5e',
    G: '#2a2e3a',
    g: '#444b5c',
    c: '#e0fcff', // lõi: trắng xanh
    C: '#4fdcff', // lõi: xanh
    Y: '#e8c04a', // vòng nòng
  },
  ramps: { A: ['H', 'a'] },
  outline: 'O',
});

// ─── Cung: cánh gỗ cong về phía trước (hướng bắn +x), dây ở phía sau tay cầm ──
const BOW_TOP = [
  'S.TT.......',
  'S..BB......',
  'S..BB......',
  'S...BB.....',
  'S...BB.....',
  'S....BB....',
  'S....BB....',
  'S.....BB...',
  'S.....BB...',
  'S......BB..',
  'S......BB..',
  'S......BB..',
];

/** Chỗ trống bên trái dây để dây bị kéo ra sau (px), và chỗ mũi tên nhô ra phía trước cánh cung. */
const BOW_MARGIN = 6;
const BOW_AHEAD = 3;
/** Độ kéo dây (px) của từng frame sạc lực: dây thành hình chữ V, mũi tên lắp sẵn. */
const BOW_DRAW_PULLS = [1, 3, 5, 6] as const;

/**
 * Dựng các hàng fill của cung ở một độ kéo dây: dây cung vẽ lại thành chữ V từ hai đầu mút tới
 * điểm kéo; `nocked` thêm mũi tên lắp trên dây (thân A, đầu K, lông F).
 */
function bowRows(
  top: readonly string[],
  middle: readonly string[],
  pull: number,
  nocked: boolean,
): string[] {
  const body = mirrorV(top, middle);
  const bodyWidth = Math.max(...body.map((row) => row.length));
  const width = BOW_MARGIN + bodyWidth + BOW_AHEAD;
  const stringRows = body
    .map((row, y) => (row.includes('S') ? y : -1))
    .filter((y) => y >= 0);
  const grid = body.map((row) =>
    ('.'.repeat(BOW_MARGIN) + row.replace(/S/g, '.')).padEnd(width, '.').split(''),
  );
  const first = stringRows[0];
  const last = stringRows[stringRows.length - 1];
  const centerY = (first + last) / 2;
  const half = (last - first) / 2;

  for (const y of stringRows) {
    const closeness = 1 - Math.abs(y - centerY) / half;
    const x = BOW_MARGIN - Math.round(pull * closeness);

    grid[y][x] = 'S';
  }

  if (nocked) {
    const arrowY = Math.floor(centerY);
    const tailX = BOW_MARGIN - pull;
    const tipX = width - 1;

    for (let x = tailX; x <= tipX; x += 1) {
      if (grid[arrowY][x] === '.') {
        grid[arrowY][x] = x >= tipX - 1 ? 'K' : 'A';
      }
    }

    // Lông đuôi tên: hai cột, ba hàng.
    for (const dy of [-1, 0, 1]) {
      for (const dx of [0, 1]) {
        if (grid[arrowY + dy][tailX + dx] === '.') {
          grid[arrowY + dy][tailX + dx] = 'F';
        }
      }
    }
  }

  return grid.map((row) => row.join(''));
}

const BOW_MIDDLE = ['S.....WWWW.', 'S.....wwww.'];
const BOW_PALETTE = {
  O: '#2b1a0e',
  H: '#e2aa62',
  B: '#b07a3a',
  b: '#7a4a24',
  T: '#cfd8e4', // đầu mút kim loại
  W: '#5a3a1e', // tay cầm quấn
  w: '#3e2813',
  S: '#e8f7ff', // dây cung
  A: '#e8d8a8', // thân tên
  K: '#f2f6fa', // đầu tên
  F: '#7dff9a', // lông tên
};

function buildBow(pull: number, nocked: boolean): WeaponArt {
  return buildArt({
    fill: bowRows(BOW_TOP, BOW_MIDDLE, pull, nocked),
    palette: BOW_PALETTE,
    ramps: { B: ['H', 'b'] },
    outline: 'O',
    noOutline: 'SAKF',
  });
}

const BOW = buildBow(0, false);
const BOW_DRAW = BOW_DRAW_PULLS.map((pull) => buildBow(pull, true));

// ─── Cung Rồng: cánh đỏ vảy, sừng vàng ở hai đầu, ngọc đỏ ở tay cầm ──
const DRAGON_BOW_TOP = [
  '.G.........',
  '.GG........',
  ...BOW_TOP.map((row, index) => (index === 0 ? 'S.GG.......' : row)),
];

const DRAGON_BOW_MIDDLE = ['S.....WEWW.', 'S.....wwww.'];
const DRAGON_BOW_PALETTE = {
  O: '#2a0f0a',
  H: '#ff7a5a',
  B: '#c0392b',
  b: '#6e1a12',
  G: '#ffd75e', // sừng vàng
  W: '#d9a441',
  w: '#9a6a1c',
  E: '#ff3b3b', // ngọc
  S: '#ffd9a8', // dây cung
  A: '#ffd9a8', // thân tên
  K: '#ffb347', // đầu tên (lửa)
  F: '#ff5a3a', // lông tên
};

function buildDragonBow(pull: number, nocked: boolean): WeaponArt {
  return buildArt({
    fill: bowRows(DRAGON_BOW_TOP, DRAGON_BOW_MIDDLE, pull, nocked),
    palette: DRAGON_BOW_PALETTE,
    ramps: { B: ['H', 'b'] },
    outline: 'O',
    noOutline: 'SAKF',
  });
}

const DRAGON_BOW = buildDragonBow(0, false);
const DRAGON_BOW_DRAW = BOW_DRAW_PULLS.map((pull) => buildDragonBow(pull, true));

// ─── Trượng: tinh thể tím trong ngàm kim loại, cán tím có đai ──
const STAFF = buildArt({
  fill: [
    '......................SSSS......',
    '......................SSKKKK....',
    '......SS......SS....SSSSKXKKKK..',
    'TTWWWWSSWWWWWWSSWWWWSSSSKKKNNNKK',
    'TTwwwwSSwwwwwwSSwwwwSSSSKKKNNNKK',
    '......SS......SS....SSSSKKKKKK..',
    '......................SSKKKK....',
    '......................SSSS......',
  ],
  palette: {
    O: '#150b22',
    K: '#a64dff', // tinh thể
    k: '#d9a8ff',
    q: '#5a2db0',
    N: '#f4e6ff', // lõi sáng
    X: '#ffffff', // điểm lóe
    S: '#7e8aa3', // ngàm kim loại
    s: '#b8c2d6',
    z: '#3a4254',
    W: '#5a3a9a', // cán tím
    w: '#3d2570',
    T: '#d4a846', // chóp cán vàng
  },
  ramps: { K: ['k', 'q'], S: ['s', 'z'] },
  outline: 'O',
});

// ─── Đũa phép: đũa nhỏ gọn, tinh thể xanh ──
const WAND = buildArt({
  fill: [
    '............KKK...',
    '..........SSKKKKK.',
    'TWWWWWWWWWSSKNNKKK',
    '..........SSKKKKK.',
    '............KKK...',
  ],
  palette: {
    O: '#0c1c24',
    K: '#34c7f2',
    k: '#c4f6ff',
    q: '#1b78a8',
    N: '#ffffff',
    S: '#9aa6b8',
    s: '#d0d8e6',
    z: '#4a5468',
    W: '#8a5a2b',
    T: '#e8c04a',
  },
  ramps: { K: ['k', 'q'], S: ['s', 'z'] },
  outline: 'O',
});

// ─── Trượng Hư Không: quả cầu hư vô lơ lửng giữa hai chạc kim loại, cán có rune ──
const VOID_STAFF = buildArt({
  fill: [
    '......................SSSSSSS...',
    '....................SSS...RRRRR.',
    '...................SS....RVVVVVR',
    '..................SSSS...RVVLVVR',
    'WWWWWWWUUWWWWWWWSSSSSSS..RVLVVVR',
    'wwwwwwwUUwwwwwwwSSSSSSS..RVVVVVR',
    '..................SSSS...RVVVVVR',
    '...................SS....RVVVVVR',
    '....................SSS...RRRRR.',
    '......................SSSSSSS...',
  ],
  palette: {
    O: '#0a0412',
    S: '#6a5a90',
    s: '#a998d0',
    z: '#2d2447',
    W: '#3a2858',
    w: '#261840',
    U: '#c36bff', // rune sáng
    R: '#9d5cff', // vành cầu
    V: '#120822', // lõi hư vô
    L: '#e0b3ff', // điểm sáng
  },
  ramps: { S: ['s', 'z'] },
  outline: 'O',
});

// ─── Liềm (ngoại hình giáo, theo ảnh mẫu): mũi lá dài nhọn có sống giữa, chắn tay cong như hai sừng,
//     cán mảnh có đai tối, đoạn nhám khắc hoa văn và đoạn giữa ánh xanh, chóp cán gọn ──
const SCYTHE_WIDTH = 58;
const SCYTHE_HEIGHT = 12;
/** Mũi giáo chiếm x 45..57; chắn tay quanh x 40..45; cán x 0..41 (hai hàng 5 và 6, tâm cán ở y = 6). */
const SPEAR_BLADE_START = 45;
const SPEAR_BLADE_HALF_WIDTH = 3.1; // nửa bề ngang mũi ở sát chắn tay (px)

/** Vẽ ngọn giáo dài. `glow` = bản vàng của Excalibur: ô cắt phát sáng và có ngọc ở cổ chắn. */
function spearFill(glow = false): string[] {
  const grid = emptyGrid(SCYTHE_WIDTH, SCYTHE_HEIGHT);
  const bladeLength = SCYTHE_WIDTH - SPEAR_BLADE_START;

  // Mũi giáo hình lá: rộng nhất sát chắn tay, thon dần tới mũi nhọn; nửa trên sáng, nửa dưới tối (sống ở giữa).
  for (let x = SPEAR_BLADE_START; x < SCYTHE_WIDTH; x += 1) {
    const t = (x - SPEAR_BLADE_START) / (bladeLength - 1);
    const halfWidth = SPEAR_BLADE_HALF_WIDTH * (1 - t) ** 0.85 + 0.55;

    for (let y = 0; y < SCYTHE_HEIGHT; y += 1) {
      if (Math.abs(y + 0.5 - 6) <= halfWidth) {
        grid[y][x] = y < 6 ? 'M' : 'm';
      }
    }
  }

  // Ô cắt hình thoi ở thân mũi (như hoa văn trong ảnh).
  for (const x of [49, 50, 51, 52, 53]) {
    grid[5][x] = glow ? 'Z' : 'K';
    grid[6][x] = glow ? 'Z' : 'K';
  }

  // Mũi nhọn: cột cuối chỉ còn một pixel.
  grid[6][SCYTHE_WIDTH - 1] = '.';

  // Chắn tay: cổ chắn x 42..45 và hai sừng cong ra ngoài rồi quặp về phía cán.
  for (let y = 4; y <= 7; y += 1) {
    for (let x = 42; x <= 45; x += 1) {
      grid[y][x] = 'G';
    }
  }

  const horn: readonly (readonly [number, number])[] = [
    [43, 4],
    [43, 3],
    [42, 3],
    [42, 2],
    [41, 2],
    [41, 1],
    [40, 1],
    [40, 0],
  ];

  for (const [x, y] of horn) {
    grid[y][x] = 'G';
    grid[SCYTHE_HEIGHT - 1 - y][x] = 'G';
  }

  // Ngọc ở cổ chắn (chỉ bản Excalibur).
  if (glow) {
    for (const x of [43, 44]) {
      grid[5][x] = 'E';
      grid[6][x] = 'E';
    }
  }

  // Cán 2 hàng (5 sáng, 6 tối) từ x 0..41 với các đoạn:
  //  nhám khắc (x 36..41 và 6..19, sáng/tối đan xen), đoạn giữa ánh xanh (x 22..33),
  //  đai tối (x 34..35, 20..21, 4..5), chóp cán (x 0..3).
  for (let x = 0; x <= 41; x += 1) {
    const green = x >= 22 && x <= 33;
    const knurl = (x >= 36 && x <= 41) || (x >= 6 && x <= 19);

    if (knurl) {
      grid[5][x] = x % 2 === 0 ? 'W' : 'w';
      grid[6][x] = x % 2 === 0 ? 'w' : 'W';
    } else if (green) {
      grid[5][x] = 'g';
      grid[6][x] = 'q';
    } else {
      grid[5][x] = 'W';
      grid[6][x] = 'w';
    }
  }

  for (const bandX of [34, 35, 20, 21, 4, 5]) {
    for (let y = 4; y <= 7; y += 1) {
      grid[y][bandX] = 'B';
    }
  }

  // Hoa văn nhỏ ở đoạn giữa: hai chấm tối.
  for (const x of [26, 29]) {
    grid[5][x] = 'K';
    grid[6][x] = 'K';
  }

  for (let x = 0; x <= 3; x += 1) {
    for (let y = 4; y <= 7; y += 1) {
      grid[y][x] = 'C';
    }
  }

  return grid.map((row) => row.join(''));
}

const SCYTHE = buildArt({
  fill: spearFill(),
  palette: {
    O: '#1c1c19',
    h: '#f5f3e6', // mép sáng mũi/chắn
    M: '#d9d7c6', // mũi giáo nửa trên
    m: '#b3b1a1', // mũi giáo nửa dưới
    d: '#7f7e71',
    y: '#efedde',
    G: '#cfcdbd', // chắn tay
    K: '#3b3b36', // ô cắt / hoa văn
    W: '#cfcdbd', // cán sáng
    w: '#9d9c8d', // cán tối
    g: '#8e9a8a', // cán đoạn giữa (ánh xanh) sáng
    q: '#6f7b6d', // cán đoạn giữa tối
    B: '#6b6a5f', // đai
    C: '#8a8978', // chóp cán
    v: '#8a897b',
  },
  ramps: { M: ['h', 'd'], G: ['y', 'v'] },
  outline: 'O',
});

// ─── Excalibur (thương vàng): cùng dáng giáo dài với liềm nhưng toàn thân vàng ánh kim, ô cắt trên mũi
//     phát sáng trắng và ngọc đỏ ở cổ chắn ──
const EXCALIBUR = buildArt({
  fill: spearFill(true),
  palette: {
    O: '#3a2a08',
    h: '#ffffff', // mép sáng mũi/chắn
    M: '#fff0b8', // mũi thương nửa trên
    m: '#e8c050', // mũi thương nửa dưới
    d: '#a8781c',
    y: '#fff2b3',
    G: '#e8b84a', // chắn tay vàng
    v: '#8a5a14',
    Z: '#ffffff', // ô cắt phát sáng
    E: '#ff4f6a', // ngọc ở cổ chắn
    K: '#5a3a08',
    W: '#f4cf6a', // cán sáng
    w: '#b88a28', // cán tối
    g: '#e0b040', // cán đoạn giữa (vàng đậm)
    q: '#a8741c',
    B: '#7a4f10', // đai
    C: '#c8962e', // chóp cán
  },
  ramps: { M: ['h', 'd'], G: ['y', 'v'] },
  outline: 'O',
});

// ─── Khiên (to ×1.7): hình giọt nước viền vàng, thép sáng bên trái/tối bên phải, thập tự vàng ở giữa ──
const SHIELD_WIDTH = 25;
const SHIELD_HEIGHT = 29;

function shieldFill(): string[] {
  const grid = emptyGrid(SHIELD_WIDTH, SHIELD_HEIGHT);
  const cx = (SHIELD_WIDTH - 1) / 2;
  const straight = 12; // sau hàng này viền thu dần về mũi nhọn

  for (let y = 0; y < SHIELD_HEIGHT; y += 1) {
    const t = y <= straight ? 0 : (y - straight) / (SHIELD_HEIGHT - 1 - straight);
    const rounding = y === 0 ? 2 : y === 1 ? 1 : 0; // bo hai góc trên
    const half = Math.max(0, Math.round(cx * (1 - t ** 1.7)) - rounding);

    for (let x = cx - half; x <= cx + half; x += 1) {
      const edge = x - (cx - half) < 2 || cx + half - x < 2 || y < 2;

      if (edge) {
        grid[y][x] = 'G';
      } else if (x < cx - 4) {
        grid[y][x] = 'H';
      } else if (x > cx + 4) {
        grid[y][x] = 's';
      } else {
        grid[y][x] = 'S';
      }
    }
  }

  // Thập tự vàng: thanh dọc 3 px, thanh ngang 3 px, hạt sáng ở giao điểm.
  const paint = (x: number, y: number, c: string): void => {
    if (grid[y]?.[x] && grid[y][x] !== EMPTY && grid[y][x] !== 'G') {
      grid[y][x] = c;
    }
  };

  for (let y = 6; y <= 22; y += 1) {
    for (let x = cx - 1; x <= cx + 1; x += 1) {
      paint(x, y, 'E');
    }
  }

  for (let y = 10; y <= 12; y += 1) {
    for (let x = cx - 7; x <= cx + 7; x += 1) {
      paint(x, y, 'E');
    }
  }

  for (let y = 10; y <= 12; y += 1) {
    for (let x = cx - 1; x <= cx + 1; x += 1) {
      paint(x, y, 'Y');
    }
  }

  return grid.map((row) => row.join(''));
}

const SHIELD = buildArt({
  fill: shieldFill(),
  palette: {
    O: '#12141c',
    G: '#e0b84e',
    H: '#7b84a0',
    S: '#434a5e',
    s: '#2c3140',
    E: '#b8963f',
    Y: '#ffe08a',
  },
  outline: 'O',
});

// ─── Búa chiến: cán gỗ dài quấn dây, đầu búa thép vuông nặng, vành thép sẫm hai đầu ──
const HAMMER_WIDTH = 40;
const HAMMER_HEIGHT = 14;

function hammerFill(): string[] {
  const grid = emptyGrid(HAMMER_WIDTH, HAMMER_HEIGHT);

  // Cán: 2 hàng (6..7) từ x=3 tới đầu búa.
  for (let x = 3; x <= 27; x += 1) {
    for (let y = 6; y <= 7; y += 1) {
      grid[y][x] = 'W';
    }
  }

  // Dây quấn ở đoạn tay cầm x 4..11.
  for (let x = 4; x <= 11; x += 1) {
    for (let y = 5; y <= 8; y += 1) {
      grid[y][x] = (x + y) % 2 === 0 ? 'y' : 'r';
    }
  }

  // Núm cán x 0..2.
  for (let y = 5; y <= 8; y += 1) {
    for (let x = 0; x <= 2; x += 1) {
      grid[y][x] = 'P';
    }
  }

  // Đầu búa: khối thép 12×12 (x 27..38, hàng 1..12); hai vành sẫm ở x 27..28 và 37..38.
  for (let y = 1; y <= 12; y += 1) {
    for (let x = 27; x <= 38; x += 1) {
      grid[y][x] = x <= 28 || x >= 37 ? 'S' : 'M';
    }
  }

  return grid.map((row) => row.join(''));
}

const HAMMER = buildArt({
  fill: hammerFill(),
  palette: {
    O: '#1b1d26',
    h: '#f2f5f8', // mép sáng thép
    M: '#a9b3c0', // mặt búa
    d: '#5f6a79', // mép tối
    s: '#8691a1', // vành sáng
    S: '#6c7686', // vành thép
    t: '#454d5b', // vành tối
    W: '#6b4a1e', // cán gỗ
    k: '#8a6230', // cán sáng
    y: '#e0a93a', // dây quấn vàng
    r: '#7a3b24', // dây quấn nâu đỏ
    P: '#9aa4b2', // núm cán
    p: '#5d6674', // núm cán tối
  },
  ramps: { M: ['h', 'd'], S: ['s', 't'], W: ['k', 'W'], P: ['h', 'p'] },
  outline: 'O',
});

/** Art của từng vũ khí, khóa theo `WeaponId`. */
export const WEAPON_ART: Record<WeaponId, WeaponArt> = {
  sword: SWORD,
  shield: SHIELD,
  blaster: BLASTER,
  bow: BOW,
  scythe: SCYTHE,
  staff: STAFF,
  wand: WAND,
  excalibur: EXCALIBUR,
  dragon_bow: DRAGON_BOW,
  void_staff: VOID_STAFF,
  dual_blades: DUAL_BLADE,
  hammer: HAMMER,
};

/**
 * Các frame kéo cung (dây chữ V + mũi tên lắp sẵn), từ nhẹ đến căng hết cỡ. Cùng kích thước với art
 * thường nên dùng chung origin/điểm cầm; đổi texture theo mức sạc lực.
 */
export const WEAPON_DRAW_ART: Partial<Record<WeaponId, readonly WeaponArt[]>> = {
  bow: BOW_DRAW,
  dragon_bow: DRAGON_BOW_DRAW,
};

/** Kích thước (texel) của art sau khi dựng. */
export function getArtSize(art: WeaponArt): { width: number; height: number } {
  return {
    width: Math.max(...art.rows.map((row) => row.length)),
    height: art.rows.length,
  };
}
