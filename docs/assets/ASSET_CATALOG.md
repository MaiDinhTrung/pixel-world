# ASSET_CATALOG

Nhãn: **[CÓ]** = đã kiểm chứng tồn tại trong repo. Cột "Dùng" = có tham chiếu trong `src` (kiểm bằng Grep, làm mới 2026-11-18, ST-03). Khi thêm/xóa asset, cập nhật file này. **Catalog chỉ là chỉ mục điều hướng**: code thật (`src/config/assets.ts`, `TEXTURE_KEYS` ở `src/config/constants.ts`, builder trong `src/world/`) là nguồn sự thật; mục "Dùng" có thể cũ — Grep lại trước khi quyết định tái dùng. Catalog không mô tả hình ảnh từ tên file; muốn biết hình trông ra sao thì xem file/ảnh thật.

**Tái dùng nhanh (bắt đầu ở đây):** map/khu mới → mục 1 (tileset/building/prop làng) + mục 5 (mẫu Rừng Úa dựng map không asset mới); quái mới → mục 2 dòng "Quái"/"Quái M2" (chung layout sheet, đổi bảng màu/scale); vũ khí/VFX → mục 2 và 3; cổng → mục 2 dòng "Cổng dịch chuyển" (đổi `color` là đủ). Tìm theo chủ đề: Grep key ở `src/config/assets.ts`.

## 1. File ảnh — `public/assets/village/` [CÓ]
Pack CC0 "Free Medieval Village Tileset" (xem `LICENSE.txt`, `README.md` cùng thư mục; README nhắc `manifest.json`/`preview.webp` nhưng hai file này **không có** trong repo). Khai báo ở `src/config/assets.ts` (`VILLAGE`, `VILLAGE_ASSETS`), load bằng một vòng `load.image` ở `PreloadScene.preload()`; dùng ở `src/world/town.ts`.

| Nhóm (thư mục) | Key `VILLAGE.<tên>` (texture key `village-…`) | File | Dùng |
|---|---|---|---|
| tilesets 32×32 | grass, dirt, cobble, farmland, water | `tilesets/village-{grass-tile,dirt-path,cobblestone,farmland,water-tile}-32.png` | có |
| tilesets | wood | `tilesets/village-wood-floor-32.png` | có (`world/town.ts` `addGround(VILLAGE.wood…)`) |
| buildings | cottageA, cottageB, tavern, blacksmith, shop, church, windmill, stable, well, market | `buildings/village-*.png` (well: `village-well-32.png`, market: `village-market-stall.png`) | có |
| environment | bush, campfire, crop, flower, haystack, lamppost, oak, scarecrow, stoneWall | `environment/village-*.png` | có |
| environment | fence, hedge | `environment/village-{fence-section,hedge-tile}.png` | có (`DECOR` ở `world/town.ts`; hedge cả `WOODS_DECOR`) |
| environment | bridge | `environment/village-bridge.png` | **chưa dùng** (Grep `VILLAGE.bridge`/`'bridge'` trong `src`: không có tham chiếu) |
| items | barrel, bucket, cart, crate, flag, sign | `items/village-*.png` | có |
| furniture | bench | `furniture/village-bench.png` | có |

Kích thước gốc theo README pack: tile 32×32; cottage-a 48×48, cottage-b 44×44, tavern 64×56, church/windmill 48×64, stable 56×40. Tất cả ảnh tĩnh (không animation, kể cả campfire/windmill).

## 2. Texture sinh bằng code [CÓ]
Không có file ảnh; sinh trong `PreloadScene.create()`. Key khai báo ở `TEXTURE_KEYS` (`src/config/constants.ts`).

| Nhóm | Key | Nơi định nghĩa art / sinh |
|---|---|---|
| Môi trường | `ground`, `wall`, `rock` | `PreloadScene` (`createGroundTexture/createWallTexture`); `rock` qua `createPixelTexture` |
| Tường thành | `castle-wall-<w>x<h>-r<rise>-<h/v>-l<lean>` (động, key tất định theo hình học, P3d) | `world/castleWall.ts` + `vfx/brickBox.ts` |
| Đấu Trường Boss | `arena-floor` (64×64, 2×2 ô gạch), `arena-rune` (vòng ma pháp), `arena-block-<n>` (tường/cột), `arena-radial` (đèn/sương), `arena-vignette` | `world/bossArena.ts`; màu/kích thước `config/bossArenaConfig.ts` |
| Cổng dịch chuyển | `portal-pedestal-<màu>` (bệ 96 px), `portal-vortex-<màu>-<0..7>` (vòng xoáy 8 frame 64 px), `portal-glow` | `world/portal.ts`; số khung/kích thước `PORTAL_*` ở `config/bossArenaConfig.ts`; dùng VFX có sẵn `ring.shock`, `glow.flash`, `burst.sparks` khi kích hoạt |
| Người chơi | `player-knight`, `player-ranger`, `player-mage`, `player-necromancer` (spritesheet khung 48 px; vẽ lại theo gear đang mặc) | `utils/placeholderPlayer.ts`; key ở `config/characters.ts`. `TEXTURE_KEYS.player` và `PLAYER_TEXTURE_KEY` (`player-hd`) là key/hằng cũ |
| Quái | `enemy` (brute 24 px), `rangedEnemy` (caster 24 px), `boss` (32 px) | `utils/enemySprites.ts` (`SHEETS`) |
| Quái M2 (2) | `enemy-swarmer` (khối tròn có gai, xanh ngọc; archetype `swarmer`; hiển thị scale 1,6, body 25) và `enemy-bruiser` (thân hình thang, nắm đấm to, thép xám; archetype `brute`; scale 2,5, body 16). Sheet canvas 24 px, cùng layout/tên frame/bộ clip 2/4/2/2 với `enemy` (`<key>-<action>-<i>`); hitbox `bodySize × scale = 40`. Tránh `enemy-brute` vì visual `'brute'` đang là grunt | sinh ở `utils/enemyVariantSprites.ts` (gọi từ cuối `createEnemySpriteSheets`); key `TEXTURE_KEYS.enemySwarmer/enemyBruiser`; cỡ/scale `ENEMY_VISUALS` và bảng màu `ENEMY_VARIANT_PALETTES` ở `config/enemyVisualConfig.ts` |
| Đồng minh | `minion-skeleton` | `PreloadScene.create` |
| Vũ khí cầm tay (12) | `hammer`, `sword`, `shield`, `blaster`, `bow`, `scythe`, `staff`, `wand`, `dualBlades`, `excalibur`, `dragonBow`, `voidStaff`; frame kéo dây `<key>-draw-N` (cung/cung rồng) | art `utils/weaponArt.ts`, sinh `utils/weaponTextures.ts`, gắn tay `config/weaponSpriteConfig.ts` |
| Đạn/hiệu ứng nhỏ | `bullet`, `arrow`, `orb`, `spark`, `glow`, `shadow`, `ring` | `PreloadScene` + `utils/pixelTexture.ts` |
| Đạn quái (6) | `enemyBullet` (vật lý/mặc định) + `enemyBullet-<hệ>` cho fire/ice/lightning/wind/dark; texture 44×20 px, 1 frame, sinh bằng code | `vfx/vfxTextures.ts` (`createEnemyBullets`, `enemyBulletTextureKey`); kích thước `ENEMY_BULLET_VISUAL` ở `config/vfxConfig.ts`; màu `NEON.enemyBullet` (`config/palette.ts`) + `ELEMENT_PALETTE` (`config/damageTypeConfig.ts`); bắn bằng `utils/projectile.ts` |
| Hòm | `chestClosed`, `chestOpen`, `legendaryChestClosed`, `legendaryChestOpen` | `utils/chestArt.ts` |
| Trang bị (9 icon) | mũ `gear-cloth-hood/iron-helm/dragon-crown`; giáp `gear-cloth-robe/iron-cuirass/dragon-plate`; giày `gear-worn-boots/swift-greaves/void-treads` | `PreloadScene.create` (`createPixelTexture`); ngoại hình trên người `config/gearLook.ts` |
| Font số sát thương | `DAMAGE_FONT_KEYS.normal/crit` (BitmapFont 5×7, ký tự `0123456789k!`) | `vfx/damageNumberFont.ts`, số liệu `config/damageNumberConfig.ts` |

## 3. VFX [CÓ]
Cách dùng: xem `VFX_GUIDE.md`.

- Id (`VFXId`, 10): `slash.arc`, `ring.shock`, `burst.sparks`, `impact.hit`, `glow.flash`, `ground.crack`, `dust.puff`, `ghost.afterimage`, `aura.shield`, `aura.fury`.
- Texture (`VFX_TEXTURES`, 9): `vfx-pixel`, `vfx-ring`, `vfx-slash`, `vfx-crack`, `vfx-aura`, `vfx-spear`, `vfx-spear-sharp`, `vfx-ellipse`, `vfx-bolt`. Cả 9 đều được `VFXManager.ts` tham chiếu; ánh xạ chi tiết id → texture chưa liệt kê (đọc `VFXManager.ts` khi cần).
- Anim: `vfx.slash.arc` (6 frame).
- Hiệu ứng **không qua VFXManager** (vẽ trực tiếp `add.graphics`): `combat/{Sword,Excalibur,Scythe,Shield,DualBlades}Weapon.ts`, `entities/BossEnemy.ts`, `skills/divineDomain.ts`, `skills/leap/GroundSlamLeap.ts`, `ui/combat/AimIndicator.ts`, `world/castleWall.ts`.

## 4. Giao diện [CÓ]
Không có asset ảnh. Dựng bằng `Graphics`/`Text`/`BitmapText` (`ui/Hud.ts`, `ui/PlayerBars.ts`, `ui/combat/*`, `scenes/*Scene.ts`).

## 5. Mẫu dựng Map không cần asset mới — Rừng Sâu / Region Rừng Úa [CÓ]
Builder `buildWitheredWoods` (`src/world/witheredWoods.ts`, số liệu `src/config/witheredWoodsConfig.ts`) chỉ dùng thứ đã có, không sinh texture mới:
- Nền/lối/hồ/tàn tích: `VILLAGE.grass` (tô `WOODS_GRASS_TINT`), `VILLAGE.dirt`, `VILLAGE.water`, `VILLAGE.stoneWall` qua `addGround` (tileSprite, `world/town.ts`); cây `VILLAGE.oak` qua `addTree` (có va chạm); trang trí `bush`, `hedge` qua `addDecor` (`WOODS_DECOR`).
- Ánh sáng: hình chữ nhật MULTIPLY (`WOODS_AMBIENT_*`) + texture `atmosphere-vignette` (`VIGNETTE_TEXTURE_KEY`, `config/atmosphereConfig.ts`) nếu đã tồn tại; không dùng chu kỳ ngày/đêm. Cùng file khai báo thêm key `atmosphere-light`, `atmosphere-fog` (texture tạo ở `vfx/atmosphere.ts`; Rừng Sâu không tham chiếu hai key này).
- Cổng: `createPortal` (`world/portal.ts`) với `WOODS_PORTAL_COLOR` = `BOSS_ARENA_RETURN_COLOR` → dùng chung key `portal-pedestal-<màu>` / `portal-vortex-<màu>-<n>` với cổng về của Arena, không key mới.
- Đăng ký Map/cổng/kết nối: ở `config/worldConfig.ts` và `world/mapBuilders.ts` (xem `docs/codemap/world.md`), không phải việc của catalog.
- Hạn chế: mọi ảnh làng đều tĩnh; cảm giác "úa/tối" đến từ tint + lớp phủ màu (`WOODS_GROUND_WASH_*`), không phải asset riêng.

## 6. Chưa có [đã kiểm: không thấy trong repo]
- Âm thanh (không file, không gọi `sound`).
- Spritesheet/atlas dạng file; icon skill/vật phẩm dạng file.
- Animation VFX nhiều khung ngoài `vfx.slash.arc`.
