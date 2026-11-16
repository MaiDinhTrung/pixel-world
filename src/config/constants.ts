/** Độ phân giải thiết kế (pixel). Toàn bộ toạ độ gameplay dùng hệ này. */
export const DESIGN_WIDTH = 960;
export const DESIGN_HEIGHT = 540;

/** Độ bám của camera theo người chơi, quy đổi ở 60 FPS (0..1); WorldScene đổi sang theo thời gian thực. */
export const CAMERA_FOLLOW_LERP_60FPS = 0.12;

/** Kích thước một ô bản đồ (pixel). */
export const TILE_SIZE = 32;

/** Town lớn: 120 × 80 ô = 3840 × 2560 px (gấp 4 lần màn hình mỗi chiều). */
export const WORLD_TILES_X = 120; // số ô theo chiều ngang
export const WORLD_TILES_Y = 80; // số ô theo chiều dọc
export const WORLD_WIDTH = WORLD_TILES_X * TILE_SIZE; // bề rộng thế giới (px)
export const WORLD_HEIGHT = WORLD_TILES_Y * TILE_SIZE; // bề cao thế giới (px)

/** Tốc độ di chuyển của Player, tính bằng pixel/giây. */
export const PLAYER_SPEED = 240;

/** Scene key dùng chung, tránh gõ chuỗi rải rác trong code. */
export const SCENE_KEYS = {
  boot: 'BootScene', // khởi động, nạp tối thiểu
  preload: 'PreloadScene', // nạp tài nguyên + hiện thanh tải
  menu: 'MainMenuScene', // menu chính
  characterSelect: 'CharacterSelectScene', // chọn nhân vật
  world: 'WorldScene', // màn chơi chính
  bossArena: 'BossArenaScene', // đấu trường Boss (scene riêng, kế thừa WorldScene)
  characterPanel: 'CharacterPanelScene', // bảng nhân vật (chỉ số, túi đồ, cây kỹ năng...)
  levelUp: 'LevelUpScene', // chọn buff khi lên cấp
  villageShop: 'VillageShopScene', // cửa hàng làng (thương nhân / thợ rèn)
} as const;

/** Event dùng chung giữa các scene. */
export const GAME_EVENTS = {
  buffPicked: 'buff:picked', // người chơi vừa chọn một buff ở màn lên cấp
} as const;

/** Texture key của các placeholder được sinh tại runtime. */
export const TEXTURE_KEYS = {
  // Nhân vật & môi trường
  player: 'player',
  ground: 'ground', // nền đất
  wall: 'wall', // tường
  rock: 'rock', // đá chắn đường
  // Quái
  enemy: 'enemy', // quái cận chiến
  rangedEnemy: 'rangedEnemy', // quái bắn xa
  boss: 'boss',
  enemySwarmer: 'enemy-swarmer', // quái cận chiến nhỏ nhanh (archetype swarmer, M2)
  enemyBruiser: 'enemy-bruiser', // quái cận chiến to chậm (archetype brute, M2)
  // Vũ khí cầm tay
  sword: 'sword', // kiếm
  shield: 'shield', // khiên
  blaster: 'blaster', // súng
  excalibur: 'excalibur', // kiếm huyền thoại
  dragonBow: 'dragonBow', // cung rồng
  voidStaff: 'voidStaff', // trượng hư không
  bow: 'bow', // cung
  scythe: 'scythe', // lưỡi hái
  staff: 'staff', // trượng
  wand: 'wand', // đũa phép
  dualBlades: 'dualBlades', // song đao (một thanh; vũ khí dùng 2 sprite)
  hammer: 'hammer', // búa
  // Đạn & hiệu ứng
  bullet: 'bullet', // đạn người chơi
  enemyBullet: 'enemyBullet', // đạn của quái
  arrow: 'arrow', // mũi tên
  orb: 'orb', // quả cầu phép
  spark: 'spark', // tia lửa khi trúng đòn
  glow: 'glow', // quầng sáng
  shadow: 'shadow', // bóng dưới chân
  ring: 'ring', // vòng sóng
  // Hòm
  chestClosed: 'chestClosed',
  chestOpen: 'chestOpen',
  legendaryChestClosed: 'legendaryChestClosed',
  legendaryChestOpen: 'legendaryChestOpen',
  // Đồng minh triệu hồi
  skeleton: 'minion-skeleton',
  // Trang bị: mũ / giáp / giày (theo phẩm cấp vải → sắt → rồng/hư không)
  clothHood: 'gear-cloth-hood',
  ironHelm: 'gear-iron-helm',
  dragonCrown: 'gear-dragon-crown',
  clothRobe: 'gear-cloth-robe',
  ironCuirass: 'gear-iron-cuirass',
  dragonPlate: 'gear-dragon-plate',
  wornBoots: 'gear-worn-boots',
  swiftGreaves: 'gear-swift-greaves',
  voidTreads: 'gear-void-treads',
} as const;
