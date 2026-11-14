/** Thư mục gốc chứa ảnh của bộ làng (tính từ thư mục public). */
const BASE = 'assets/village';

/** Bộ tile/prop CC0 "Free Medieval Village Tileset" (freegamesprites.com). */
export const VILLAGE = {
  // Nền / mặt đất (tile 32px)
  grass: { key: 'village-grass', path: `${BASE}/tilesets/village-grass-tile-32.png` },
  dirt: { key: 'village-dirt', path: `${BASE}/tilesets/village-dirt-path-32.png` },
  cobble: { key: 'village-cobble', path: `${BASE}/tilesets/village-cobblestone-32.png` },
  farmland: { key: 'village-farmland', path: `${BASE}/tilesets/village-farmland-32.png` },
  wood: { key: 'village-wood', path: `${BASE}/tilesets/village-wood-floor-32.png` },
  water: { key: 'village-water', path: `${BASE}/tilesets/village-water-tile-32.png` },

  // Nhà cửa & công trình
  cottageA: { key: 'village-cottage-a', path: `${BASE}/buildings/village-cottage-a.png` },
  cottageB: { key: 'village-cottage-b', path: `${BASE}/buildings/village-cottage-b.png` },
  tavern: { key: 'village-tavern', path: `${BASE}/buildings/village-tavern.png` },
  blacksmith: { key: 'village-blacksmith', path: `${BASE}/buildings/village-blacksmith.png` },
  shop: { key: 'village-shop', path: `${BASE}/buildings/village-shop.png` },
  church: { key: 'village-church', path: `${BASE}/buildings/village-church.png` },
  windmill: { key: 'village-windmill', path: `${BASE}/buildings/village-windmill.png` },
  stable: { key: 'village-stable', path: `${BASE}/buildings/village-stable.png` },
  well: { key: 'village-well', path: `${BASE}/buildings/village-well-32.png` },
  market: { key: 'village-market', path: `${BASE}/buildings/village-market-stall.png` },

  // Cảnh quan / môi trường
  bridge: { key: 'village-bridge', path: `${BASE}/environment/village-bridge.png` },
  bush: { key: 'village-bush', path: `${BASE}/environment/village-bush.png` },
  campfire: { key: 'village-campfire', path: `${BASE}/environment/village-campfire.png` },
  crop: { key: 'village-crop', path: `${BASE}/environment/village-crop-row.png` },
  fence: { key: 'village-fence', path: `${BASE}/environment/village-fence-section.png` },
  flower: { key: 'village-flower', path: `${BASE}/environment/village-flower-bed.png` },
  haystack: { key: 'village-haystack', path: `${BASE}/environment/village-haystack.png` },
  hedge: { key: 'village-hedge', path: `${BASE}/environment/village-hedge-tile.png` },
  lamppost: { key: 'village-lamppost', path: `${BASE}/environment/village-lamppost-32.png` },
  oak: { key: 'village-oak', path: `${BASE}/environment/village-oak-tree.png` },
  scarecrow: { key: 'village-scarecrow', path: `${BASE}/environment/village-scarecrow.png` },
  stoneWall: { key: 'village-stone-wall', path: `${BASE}/environment/village-stone-wall.png` },

  // Đồ vật & nội thất
  barrel: { key: 'village-barrel', path: `${BASE}/items/village-barrel.png` },
  bucket: { key: 'village-bucket', path: `${BASE}/items/village-bucket.png` },
  cart: { key: 'village-cart', path: `${BASE}/items/village-cart.png` },
  crate: { key: 'village-crate', path: `${BASE}/items/village-crate-32.png` },
  flag: { key: 'village-flag', path: `${BASE}/items/village-flag.png` },
  sign: { key: 'village-sign', path: `${BASE}/items/village-sign.png` },
  bench: { key: 'village-bench', path: `${BASE}/furniture/village-bench.png` },
} as const;

/** Danh sách phẳng mọi ảnh làng để PreloadScene nạp một lượt. */
export const VILLAGE_ASSETS = Object.values(VILLAGE);

/** Tên ảnh sprite sheet nhân vật độ phân giải cao. */
export const PLAYER_TEXTURE_KEY = 'player-hd';
/** Kích thước mỗi khung hình nhân vật (px). */
export const PLAYER_FRAME_SIZE = 48;
