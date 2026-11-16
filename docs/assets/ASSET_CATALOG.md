# ASSET_CATALOG

Nhãn: **[CÓ]** = đã kiểm chứng tồn tại trong repo. Cột "Dùng" = có tham chiếu trong `src` (kiểm bằng Grep ngày 2026-11-14). Khi thêm/xóa asset, cập nhật file này.

## 1. File ảnh — `public/assets/village/` [CÓ]
Pack CC0 "Free Medieval Village Tileset" (xem `LICENSE.txt`, `README.md` cùng thư mục; README nhắc `manifest.json`/`preview.webp` nhưng hai file này **không có** trong repo). Khai báo ở `src/config/assets.ts` (`VILLAGE`, `VILLAGE_ASSETS`), load bằng một vòng `load.image` ở `PreloadScene.preload()`; dùng ở `src/world/town.ts`.

| Nhóm (thư mục) | Key `VILLAGE.<tên>` (texture key `village-…`) | File | Dùng |
|---|---|---|---|
| tilesets 32×32 | grass, dirt, cobble, farmland, water | `tilesets/village-{grass-tile,dirt-path,cobblestone,farmland,water-tile}-32.png` | có |
| tilesets | wood | `tilesets/village-wood-floor-32.png` | **chưa dùng** |
| buildings | cottageA, cottageB, tavern, blacksmith, shop, church, windmill, stable, well, market | `buildings/village-*.png` (well: `village-well-32.png`, market: `village-market-stall.png`) | có |
| environment | bush, campfire, crop, flower, haystack, lamppost, oak, scarecrow, stoneWall | `environment/village-*.png` | có |
| environment | bridge, fence, hedge | `environment/village-{bridge,fence-section,hedge-tile}.png` | **chưa dùng** |
| items | barrel, bucket, cart, crate, flag, sign | `items/village-*.png` | có |
| furniture | bench | `furniture/village-bench.png` | có |

Kích thước gốc theo README pack: tile 32×32; cottage-a 48×48, cottage-b 44×44, tavern 64×56, church/windmill 48×64, stable 56×40. Tất cả ảnh tĩnh (không animation, kể cả campfire/windmill).

## 2. Texture sinh bằng code [CÓ]
Không có file ảnh; sinh trong `PreloadScene.create()`. Key khai báo ở `TEXTURE_KEYS` (`src/config/constants.ts`).

| Nhóm | Key | Nơi định nghĩa art / sinh |
|---|---|---|
| Môi trường | `ground`, `wall`, `rock` | `PreloadScene` (`createGroundTexture/createWallTexture`); `rock` qua `createPixelTexture` |
| Tường thành | `castle-wall-<n>` (động) | `world/castleWall.ts` + `vfx/brickBox.ts` |
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

## 5. Chưa có [đã kiểm: không thấy trong repo]
- Âm thanh (không file, không gọi `sound`).
- Spritesheet/atlas dạng file; icon skill/vật phẩm dạng file.
- Animation VFX nhiều khung ngoài `vfx.slash.arc`.
