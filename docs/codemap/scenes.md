# Codemap — Game Scenes

Xác minh: HEAD `31f5264` (2026-11-17) · Theo dõi: `src/main.ts src/scenes/ src/config/gameConfig.ts src/config/constants.ts`
Kiểm lỗi thời: `git log --oneline 31f5264..HEAD -- src/main.ts src/scenes src/config/gameConfig.ts src/config/constants.ts`

**Vai trò:** vòng đời game Phaser: khởi động → nạp/sinh texture → menu → chọn nhân vật → một scene map chung (`WorldScene`) + các scene overlay.

## L2 — Module
| Module | Vai trò | File | Phụ thuộc chính |
|---|---|---|---|
| Điểm vào | Tạo `Phaser.Game` | `src/main.ts` → `config/gameConfig.ts` (danh sách scene) | Phaser |
| Khóa scene | `SCENE_KEYS`, kích thước thế giới, `PLAYER_SPEED` | `config/constants.ts` | — |
| Boot/Preload | Nạp asset, sinh texture runtime, hydrate save | `BootScene.ts` (17), `PreloadScene.ts` (~460) | `utils/{placeholderPlayer,enemySprites (gọi enemyVariantSprites),weaponTextures,chestArt,pixelTexture}`, `vfx/vfxTextures`, `progression/ProgressStore` |
| Menu | Menu chính, chọn nhân vật (đọc save) | `MainMenuScene.ts`, `CharacterSelectScene.ts` | `config/characters`, `progression/{ProgressStore,saveV8}` |
| **WorldScene** | Trung tâm game loop cho **mọi Map** (P4a): map theo `mapId` ở `init`, builder từ `world/mapBuilders` | `WorldScene.ts` (~4360 dòng) | gần như mọi hệ thống (xem dưới) |
| Overlay | Panel nhân vật; cửa hàng làng (pause World) | `CharacterPanelScene.ts` (~1880), `VillageShopScene.ts` (~920) | gọi method public của `WorldScene` / `VillageService` |
| Legacy | Chọn buff khi lên cấp — **không đăng ký** trong `gameConfig` (key `levelUp` còn trong `SCENE_KEYS`) | `LevelUpScene.ts` | `progression/buff*` |

Thứ tự: `BootScene → PreloadScene → MainMenuScene → CharacterSelectScene → WorldScene` (+ `CharacterPanelScene`, `VillageShopScene` chồng lên).
Chuyển Map = `scene.start(SCENE_KEYS.world, { mapId, ticket, clock, … })` lên chính `WorldScene` (stop → start); trạng thái lượt chơi đi qua dữ liệu `scene.start` (`progression/RunSession`), **không** qua registry. Chết: `restartRun` → `MapDef.deathRespawn.mapId`.

## L3 — Bản đồ method `WorldScene.ts` (Grep tên, đọc theo offset)
| Nhóm | Method (dòng gần đúng @31f5264) |
|---|---|
| Hook theo Map (P4a, dữ liệu `MapDef`) | `getMapId` 500, `getMapDef`, `buildMap` 531, `getCameraBounds`, `createLighting` 548, `createDayNightControl`, `isSafeZonePoint` 562, `getInitialEnemyCount`, `canSpawnEnemies`, `getMaxAliveEnemies`, `restartRun` 601, `inBossArena` (= `kind === 'boss'`) |
| Vòng đời | `init` 662, `create` 689, `update` 1020, `handleResume`, `endSkillStatesForTravel` |
| Quái / Elite | `spawnEnemy` 1476, `updateEnemySpawning` 1711, `getThreatTier` 1682, `watchSpawnedEnemyDeath`, `countZoneKill`, `spawnElite` 1607, `spawnEliteEscort`, `dropEliteLoot`, `keepEnemiesOutOfPortalZone` 1259 |
| Boss | `updateBoss` 1758, `spawnBoss`, `summonBossMinions`, `handleBossSlam`, `handleBossDefeated`, `grantBossLoot`, `getBossSpawnPoint` |
| Combat / skill | `createCombat` 1287, `tryCastSkill` 2286, `watchEnemyHits`, `handlePlayerHit`, `modifyPlayerHit`, `chainLightning`, `maybeEchoSkill`, Dual Guard / Fortress / Vanish (`start*/update*/stop*`), `createWeaponById` 4233, `updateAutoAim` 4301 |
| Tiến trình / lưu | `grantExperience` 2243, `saveProgress` 2897, `applyPlayerStatistics` 2976, `refreshPassives` |
| API cho panel | `addStatPoint`, `learnSkillNode`, `respecSkills`, `equip*/unequip*/discard*`, `assignSkillToSlot`, `get*PanelState` (3062–3560) |
| Cổng / travel | `getPortalDeny`, `getPortalPrompt` 3683, `tryStartPortalCharge` 3702, `updatePortalCharge`, `startPortalTravel` 3756 |
| Làng / loot / hòm | `getVillage`, `openVillageShop`, `updateVillage` 4059, `dropLoot`, `collectDrop`, `updateChests` 3558, `openChest`, `pickUpChest` |

`CharacterPanelScene.ts`: `createTabs`, `bindKeys`, `renderSkills`, `renderStats`, `renderInventory`, `renderEquipment`, `renderEquipmentDetails`; tab cây kỹ năng dùng `ui/SkillTreeView`, tab SETTINGS dùng `ui/combat/ControlLayoutEditor`.

## Ghi chú khi thay đổi
- `WorldScene.ts` và `CharacterPanelScene.ts` = **rủi ro cao ⇒ cấp ≥ L**, luôn tuần tự, Grep rồi đọc theo offset. Hai file phụ thuộc hai chiều (panel gọi World; World mở panel).
- Thêm scene: `SCENE_KEYS` + `gameConfig.ts`. Thêm Map: **không** thêm scene — thêm `MapDef` + builder (`codemap/world.md`).
- `restartRun` phải gọi `scene.restart({ characterId, mapId })` có data tường minh (Phaser `restart()` không ghi đè data cũ khi không truyền) — test khoá nguồn.
- Chống rung: `gameConfig` `physics.arcade.fixedStep: false`; lerp camera theo thời gian thực (`CAMERA_FOLLOW_LERP_60FPS`, `update`); vũ khí bám tay ở `POST_UPDATE` (`updateWeaponsAfterPhysics`).
- Vùng an toàn (làng): `updateVillage` → `Player.setSafeZone`, đẩy quái ra, xoá đạn quái; chặn đánh/skill theo `isSafeZonePoint` (= `zoneAt(...).safe`, theo Map).
- Mốc thời gian trong `create()` dùng `this.game.loop.time` (vì `scene.time.now` chỉ cập nhật trong `update`).
- Test khoá hành vi scene-map: `src/scenes/worldSceneMap.test.ts`.
- Thiết kế: `docs/WORLD_ARCHITECTURE.md` (W-A9), DECISIONS "P4".
