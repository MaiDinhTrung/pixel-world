# Codemap — World / Region / Map / Zone / Instance / Boss Arena / Làng

Xác minh: HEAD `31f5264` (2026-11-17) · Theo dõi: `src/world/ src/config/{worldConfig,witheredWoodsConfig,bossArenaConfig,castleConfig,villageConfig,assets}.ts src/systems/gameInstances.ts src/entities/{Npc,Villager}.ts`
Kiểm lỗi thời: `git log --oneline 31f5264..HEAD -- src/world src/config/worldConfig.ts src/config/witheredWoodsConfig.ts src/config/bossArenaConfig.ts`

**Vai trò:** mô hình thế giới theo dữ liệu (World → Region → Map → Instance, Zone trong Map), dựng nội dung từng Map, cổng và chuyển Map, Instance cục bộ.

## L2 — Module
| Module | Vai trò | File | Phụ thuộc chính |
|---|---|---|---|
| Mô hình + luật (thuần) | Kiểu `WorldDef/RegionDef/MapDef/ZoneDef/ConnectionDef/InstancePolicy`; `zoneAt`, `safeZoneCenterAt`, `evaluateConnection`, `requestTravel`, `timeThreatTier`, `effectiveThreatTier`, `validateWorld`, `find*` | `world/worldGraph.ts` (~640) + test | — |
| Dữ liệu world | `WORLD` (2 Region, 3 Map), hằng id `MAP_*`, `REGION_*`, `ZONE_*`, `CONN_*`; vùng gần/xa làng, `ZONE_TRACKER`, `ZONE_BANNER` | `config/worldConfig.ts` | `config/witheredWoodsConfig` |
| Map hiện có | `map.starting_lands` (làng + Hoang Địa gần/xa), `map.boss_arena_1` (Đấu Trường), `map.withered_woods` (Rừng Sâu: Bìa Rừng / Lõi Rừng) | — | — |
| Registry builder | `builderId → buildMap()` + hồ sơ (camera, điểm Boss) | `world/mapBuilders.ts` (`MAP_BUILDERS`, `getMapBuilder`) + test | 3 builder dưới |
| Builder | Làng + map chính (`buildTown`, helper `addGround/addObstacle/addTree/addDecor`, `ENEMY_SPAWNS`, cổng Arena + Rừng); Đấu Trường; Rừng Sâu; tường thành | `world/town.ts`, `world/bossArena.ts`, `world/witheredWoods.ts`, `world/castleWall.ts` | `config/{assets,economyConfig,castleConfig,bossArenaConfig,witheredWoodsConfig}`, `vfx/atmosphere` |
| Cổng | Hình + vùng tương tác cổng (`createPortal`, `ScenePortal`) | `world/portal.ts` | — |
| Travel (thuần) | `getConnectionTravelInfo`, `resolveSceneArrival`, `clampToMap`, `nearestPortal`; điểm xuất hiện `resolveArrival` (`fromPortal:<connectionId>`) | `world/travel.ts`, `world/arrival.ts` (+ test) | `worldGraph` |
| Instance | Kiểu `InstanceRuntime`, `TravelTicket`, `InstanceAllocator`; bộ cấp cục bộ; trạng thái gameplay mỗi lần vào map (bộ đếm sinh quái, Elite) | `world/instance.ts`, `world/localInstanceAllocator.ts`, `world/instanceState.ts`, `systems/gameInstances.ts` | — |
| Theo dõi vùng | `createZoneTracker` → biển tên vùng `ui/RegionBanner.ts` (`ZoneBanner`) | `world/regionTracker.ts` | — |
| NPC làng | NPC tương tác (merchant/blacksmith/elder), dân làng trang trí | `entities/Npc.ts`, `entities/Villager.ts`, `config/{economyConfig (VILLAGE_NPCS), villageConfig, elderDialogue}.ts` | — |

## L3 — Nối vào `WorldScene`
`init` đọc `mapId`/`ticket`/`clock` → `getMapDef` → `buildMap` (registry) → `TownInfo { enemySpawns, npcs, portals }`; vùng an toàn `isSafeZonePoint` = `zoneAt(...).safe`; ánh sáng theo `MapDef.lighting` (`'fixed'` ⇒ không nút ngày/đêm); `kind === 'boss'` ⇒ nhánh Arena (không quái ban đầu, `shouldSpawnArenaMinions`, `maxAliveCap`). Cổng: `getPortalPrompt` (ưu tiên `connection.visual.prompt`), `startPortalTravel` → `scene.start`.

## Ghi chú khi thay đổi
- Thêm Map: `MapDef` trong `worldConfig.ts` + builder + đăng ký `MAP_BUILDERS`; `validateWorld(WORLD)` phải rỗng; test `worldGraph.test.ts` khoá nhãn kind cổng ở các file builder (thêm file builder mới vào danh sách nguồn).
- Không thêm scene cho Map mới (P4a). Save **không** lưu vị trí/map (D5): tải lại luôn vào làng; chết ⇒ `deathRespawn`.
- Id phải đúng tiền tố (`map.`, `zone.`, `region.`, `conn.`) — test `zoneIdContract.test.ts`.
- Đụng `WorldScene.ts` ⇒ ≥ L. Kiến trúc đã duyệt: `docs/WORLD_ARCHITECTURE.md`; spec map/vùng: `docs/WORLD_MAP_DESIGN.md`; DECISIONS "P2", "P3", "P4".
- Tồn đọng: NB1/NB2 ánh sáng Rừng với `?atmo=off` (`TASK_HISTORY.md` P4b).
