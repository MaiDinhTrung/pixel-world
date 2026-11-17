# FEATURE BRIEF + QA Plan — P4a: một scene map chung (giữ tên `WorldScene`) + registry builder

Cấp: **L** (đụng `WorldScene.ts`, xoá một scene). Cổng 1: người dùng duyệt 2026-11-17 ("Duyệt theo khuyến nghị cả 7 quyết định", `docs/studio/DECISIONS.md` mục P4; thiết kế `docs/studio/lean-handoff/P4_DESIGN_PROPOSAL.md` §1). Ràng buộc người dùng: **không đổi trải nghiệm, gameplay, combat, progression, save và hành vi chuyển map; không thêm map, không đổi nội dung; giữ tên lớp `WorldScene`.** Một file này là nguồn duy nhất cho Developer VÀ QA. Báo cáo agent **tối đa 10 dòng**.

BASELINE (ngoại lệ có chủ đích §6a.2 — người dùng lệnh "bắt đầu P4a" khi P3d đã QA Đạt nhưng chưa commit, chờ chơi thử): HEAD=73c7b69a235a3e6f5d658056073264daa33800a1 · nhánh=main · tracked **chưa sạch** (thay đổi P3d + tài liệu Lead) · hash lúc giao: `src/scenes/WorldScene.ts` dc83566d0653255cce8cde7d6c642bb6e1a30d6b · `src/world/worldGraph.ts` 7abfd50c989de2594436c328d305c6e902f2ae00 · `src/world/worldGraph.test.ts` 7b16e94dbf67ecfb84a014b720c6379d399a449e · `src/world/castleWall.ts` 7cb0e9ae66443a69c5fdce51f1fb9acf26ce3e17 · `src/progression/RunSession.test.ts` 99922bbb644dcbd70b748651402f239cf63d7463 · `src/world/castleWall.test.ts` (untracked) 06c25061a63308ae0ea1dd299d2e05ef3351eb16 · untracked có sẵn: docs/references/visual/** (48), docs/perf/** (1), docs/studio/lean-handoff/** (M4 ×2, P3D_FEATURE_BRIEF, P4_DESIGN_PROPOSAL, file này), docs/studio/playtests/P3d_tech_debt.md, src/world/castleWall.test.ts
Bản vá trạng thái P3d (để QA tách hunk P3d khỏi hunk P4a): `C:\Users\Legion\AppData\Local\Temp\claude\a62dbb549f266d92\d5870906-2a88-4959-8d03-0fcc56d16808\scratchpad\p3d_state.patch` (= `git diff HEAD` lúc giao).
Tài liệu do Lead sửa song song (KHÔNG tính vào phạm vi Developer): `docs/studio/DECISIONS.md`, `docs/studio/lean-handoff/TOKEN_LOG.md`, `docs/PROJECT_MAP.md`, `docs/WORLD_ARCHITECTURE.md`, `docs/assets/ASSET_CATALOG.md`, `docs/studio/playtests/**`. **Lead đã xoá `src/scenes/BossArenaScene.ts` trước khi giao** (Developer không có quyền xoá).
Test baseline (P3d): 40 file, 734 test qua; `npx tsc --noEmit` sạch (trước khi Lead xoá BossArenaScene).

## 1. Mục tiêu
Mọi Map chạy trong **một** scene `WorldScene` (key `SCENE_KEYS.world`). Map nào được hiển thị do **dữ liệu** quyết định (`mapId` truyền vào `init`), nội dung do registry `builderId → MapBuilder`, còn khác biệt của Arena (đang là 11 hook ghi đè trong `BossArenaScene`) chuyển thành nhánh theo dữ liệu `MapDef` (`kind`, `lighting`, `zones[].safe`, `zones[].maxAliveCap`) + hồ sơ builder. Chuyển Map = `scene.start(SCENE_KEYS.world, data)` lên chính nó (Phaser `ScenePlugin.start` xếp `stop(this.key)` rồi `start(key)`, `node_modules/phaser/src/scene/ScenePlugin.js:212–217`). **Người chơi không thấy khác biệt.**

## 2. Tham chiếu (không chép lại)
Bản gốc các hook Arena: `git show HEAD:src/scenes/BossArenaScene.ts` (136 dòng — đọc trọn, đây là đặc tả hành vi phải giữ). Hook mặc định: `WorldScene.ts` ~484–570 (`inBossArena`, `getMapId`, `getMapDef`, `buildMap`, `getWorldBounds`, `getCameraBounds`, `createLighting`, `createDayNightControl`, `isSafeZonePoint`, `getInitialEnemyCount`, `canSpawnEnemies`, `getMaxAliveEnemies`, `restartRun`), `getBossSpawnPoint` ~1791, `init` (Grep `init(data`), `create`, khối SHUTDOWN ~754, `startPortalTravel` ~3660–3700, `update`. Dữ liệu: `src/config/worldConfig.ts` (`STARTING_LANDS` ~136, `BOSS_ARENA_1` ~214, `sceneKey`), `src/world/worldGraph.ts` (`MapDef` ~138, `findMap`, `zoneAt`), `src/world/travel.ts` (`getConnectionTravelInfo` trả `sceneKey`), `src/config/gameConfig.ts:4,61`, `src/config/constants.ts:27`. Builder: `src/world/town.ts` `buildTown`, `src/world/bossArena.ts` `buildBossArena`. Luật Arena: `src/world/bossArenaRules.ts`. Mẫu mock Phaser trong test: `src/world/castleWall.test.ts`.

## 3. Phạm vi
File ĐƯỢC SỬA: `src/scenes/WorldScene.ts`, `src/config/gameConfig.ts`, `src/config/constants.ts`, `src/config/worldConfig.ts` (CHỈ `sceneKey` của Arena + chú thích nhắc `BossArenaScene`), `src/world/worldGraph.ts` (CHỈ chú thích nhắc `BossArenaScene`, nếu có), `src/world/bossArenaRules.ts` (CHỈ chú thích), `src/config/bossArenaConfig.ts` (CHỈ chú thích), `src/scenes/CharacterPanelScene.ts` (CHỈ chú thích dòng ~124), `src/world/travel.test.ts`, `src/world/worldGraph.test.ts` (chỉ khi cần cho thay đổi `sceneKey`).
File ĐƯỢC TẠO: `src/world/mapBuilders.ts`, `src/world/mapBuilders.test.ts`, `src/scenes/worldSceneMap.test.ts` (khoá nguồn, tuỳ chọn).
File ĐÃ XOÁ (Lead): `src/scenes/BossArenaScene.ts`.
KHÔNG đụng: `src/progression/**`, `src/combat/**` (kể cả `SwordWeapon.ts`), `src/entities/**`, `src/skills/**`, `src/systems/**`, `src/ui/**`, `src/world/town.ts`, `src/world/bossArena.ts`, `src/world/travel.ts`, `src/world/instance.ts`, `src/world/localInstanceAllocator.ts`, `src/config/combatConfig.ts`, `src/config/enemyConfig.ts`, mọi số liệu trong `src/config/**`, `src/scenes/` khác ngoài danh sách, `.claude/`, `CLAUDE.md`, `docs/`, `package*.json`, `tsconfig*.json`, `vite.config.*`. Không commit/push. Cần file ngoài danh sách → DỪNG, báo Lead. Không đổi số liệu, văn bản hiển thị, màu, thời gian.

## 4. Thiết kế
**4.1 `src/world/mapBuilders.ts`**
```ts
export interface BuiltMap { readonly town: TownInfo }
export interface MapBuilder {
  build(scene: Phaser.Scene, obstacles: Phaser.Physics.Arcade.StaticGroup): TownInfo;
  /** Khung camera; không có = khung thế giới (0,0,size). */
  readonly cameraBounds?: { x: number; y: number; width: number; height: number };
  /** Điểm sinh Boss cố định; không có = thuật toán chọn điểm sinh quái hiện tại. */
  readonly bossSpawnPoint?: { x: number; y: number };
}
export const MAP_BUILDERS: Readonly<Record<string, MapBuilder>>  // 'town' → buildTown; 'boss_arena' → buildBossArena + cameraBounds {0, -BOSS_ARENA_WALL_RISE, BOSS_ARENA_WIDTH, BOSS_ARENA_HEIGHT + BOSS_ARENA_WALL_RISE} + bossSpawnPoint BOSS_ARENA_BOSS_SPAWN
export function getMapBuilder(builderId: string): MapBuilder   // không có → throw Error
```
(`BuiltMap` có thể bỏ nếu không cần.) Trả bản sao điểm/khung (không để nơi gọi sửa hằng).

**4.2 `WorldScene` — xác định Map**
- Trường `private mapId: MapId = MAP_STARTING_LANDS`. `init(data)` nhận thêm `mapId?: unknown`; đặt **mỗi lần**: `mapId` = `data.mapId` nếu là chuỗi và `findMap(WORLD, …) !== null`, ngược lại `MAP_STARTING_LANDS`. `getMapId()` trả `this.mapId` (bỏ ghi đè; có thể đổi thành `private`/giữ `protected`).
- `startPortalTravel`: truyền thêm `mapId: targetMap.id` trong `scene.start(...)`; key đích = `targetMap.sceneKey` (nay mọi map = `SCENE_KEYS.world`). Giữ nguyên `ticket`, `clock`, `arrivalConnectionId`, thời điểm `captureRunSession`, fade.
- `restartRun()` hợp nhất: `const respawn = this.getMapDef().deathRespawn.mapId; this.scene.restart({ characterId: this.characterId, mapId: respawn })` (map chính: respawn = chính nó ⇒ như cũ; Arena: về map chính như `BossArenaScene.restartRun` cũ; không ticket/clock ⇒ lượt mới). Kiểm `findMap` như bản cũ (throw nếu không có).
- `CharacterSelectScene` giữ nguyên (`{ characterId }` ⇒ map chính).

**4.3 `WorldScene` — hook thành dữ liệu** (giữ tên phương thức được, nhưng không còn lớp con nào ghi đè; có thể đổi `protected` → `private`):
| Hook | Mới (phải tương đương bản cũ ở cả hai map) |
|---|---|
| `inBossArena` | `this.getMapDef().kind === 'boss'` |
| `buildMap` | `getMapBuilder(map.builderId).build(this, this.obstacles)` |
| `getCameraBounds` | `builder.cameraBounds ?? getWorldBounds()` |
| `createLighting` | `lighting === 'day_night'` ⇒ `createAtmosphere(...)`; `'fixed'` ⇒ không làm gì |
| `createDayNightControl` | chỉ khi `lighting === 'day_night'` |
| `isSafeZonePoint(x,y)` | `zoneAt(map, x, y)?.safe === true` (vùng làng = `VILLAGE_ZONE`, biên tính cả cạnh, khớp `isInsideVillage`; Arena không có vùng safe ⇒ false) |
| `getInitialEnemyCount` | `kind === 'boss'` ⇒ 0, ngược lại `ENEMY_MAX_ALIVE` |
| `canSpawnEnemies(time)` | `kind === 'boss'` ⇒ `shouldSpawnArenaMinions({...})` y hệt bản cũ; ngược lại `this.boss === null` |
| `getMaxAliveEnemies(tier)` | công thức cũ, rồi `Math.min` với mọi `zone.maxAliveCap` khác null của map (Arena: `BOSS_ARENA_MINION_MAX_ALIVE`; map chính: tất cả null ⇒ không đổi) |
| `getBossSpawnPoint` | `builder.bossSpawnPoint` (bản sao) nếu có, ngược lại thuật toán hiện tại |
| `update` | sau phần cũ: nếu `kind === 'boss'` ⇒ `keepEnemiesOutOfPortalZone()` (chuyển nguyên văn từ `BossArenaScene`, private) |
- `constructor(key = SCENE_KEYS.world)` có thể bỏ tham số. Gỡ import không còn dùng (`isInsideVillage` nếu hết dùng, `buildTown`…).
- **Rò trạng thái giữa map (quan trọng):** trước đây map chính và Arena là HAI đối tượng scene riêng; nay MỘT đối tượng phục vụ cả hai. Developer phải rà mọi trường khai báo có giá trị khởi tạo mà `create()`/`resetPlayerRuntimeState()` KHÔNG đặt lại và phụ thuộc map (ví dụ: tham chiếu đối tượng làng/NPC/cổng/atmosphere/nút ngày-đêm, `boss`, `arenaEntryAt`, `zoneBanner`, mốc cổng, cache). Trường nào có thể mang giá trị của map trước sang map sau thì đặt lại trong `create()` (giá trị bằng giá trị khởi tạo của trường). Liệt kê các trường đã thêm reset trong báo cáo.
- Listener: kiểm mọi `this.events.on`/`this.input.keyboard.on`/`this.game.events.on`/`this.scale.on` trong `WorldScene` và trong `createDayNightToggle`/`createAtmosphere` (chỉ đọc, không sửa ngoài phạm vi) có bị tích luỹ khi cùng scene restart nhiều lần không; Phaser `KeyboardPlugin`/`InputPlugin` tự gỡ ở shutdown thì ghi rõ dòng đã xác minh trong `node_modules/phaser/src/input/keyboard/KeyboardPlugin.js`. Nếu tích luỹ trong file ngoài phạm vi → DỪNG báo Lead.

**4.4 Config**
- `constants.ts`: xoá `SCENE_KEYS.bossArena`.
- `worldConfig.ts`: `BOSS_ARENA_1.sceneKey = SCENE_KEYS.world`; sửa chú thích nhắc `BossArenaScene`.
- `gameConfig.ts`: bỏ import/đăng ký `BossArenaScene`; chỉ một scene map (`WorldScene`).

## 5. Tiêu chí nghiệm thu
**A (máy):**
- A1 `npm run build`, `npx tsc --noEmit`, `npm test` qua; số test ≥ 734 (chỉ được giảm nếu test cũ khoá `SCENE_KEYS.bossArena` — khi đó sửa, không xoá).
- A2 Phạm vi (§6a, ngoại lệ hash): HEAD == baseline; mọi file đổi so với bản vá P3d nằm trong ĐƯỢC SỬA/ĐƯỢC TẠO (+ xoá `BossArenaScene.ts` của Lead + tài liệu Lead); các file P3d ngoài danh sách (`castleWall.ts`, `castleWall.test.ts`, `RunSession.test.ts`) giữ đúng hash baseline; hunk P3d trong `WorldScene.ts`/`worldGraph.ts`/`worldGraph.test.ts` còn nguyên.
- A3 Grep: không còn `BossArenaScene`/`SCENE_KEYS.bossArena`/`bossArena:` trong `src/` (trừ chú thích lịch sử nếu có thì cũng xoá); `gameConfig.ts` chỉ đăng ký một scene map; không còn `extends WorldScene`; `WORLD.maps.every(m => m.sceneKey === SCENE_KEYS.world)`.
- A4 `mapBuilders.test.ts` (mock Phaser như `castleWall.test.ts`): mọi `builderId` trong `WORLD.maps` có trong `MAP_BUILDERS`; `getMapBuilder('khong_co')` ném; hồ sơ `boss_arena` có `cameraBounds` = `{0, -BOSS_ARENA_WALL_RISE, BOSS_ARENA_WIDTH, BOSS_ARENA_HEIGHT + BOSS_ARENA_WALL_RISE}` và `bossSpawnPoint` = `BOSS_ARENA_BOSS_SPAWN` (bản sao, sửa không ảnh hưởng hằng); hồ sơ `town` không có hai trường đó.
- A5 Khoá nguồn (đọc text `WorldScene.ts`): `startPortalTravel` truyền `mapId` + `ticket` + `clock` (không `run`); `restartRun` truyền `mapId` từ `deathRespawn`; `init` đọc `mapId` và rơi về `MAP_STARTING_LANDS`; `update` gọi `keepEnemiesOutOfPortalZone` có điều kiện `kind === 'boss'`; test P3d (RESUME on/off, `lastAim.set(1, 0)`) vẫn qua.
- A6 Tương đương `isSafeZonePoint`: test thuần trên `WORLD` — với lưới điểm phủ map chính (bước ≤ 40 px, gồm 4 cạnh và 4 góc `VILLAGE_ZONE`) `zoneAt(map,x,y)?.safe === true` ⇔ `isInsideVillage(x,y)`; mọi điểm Arena ⇒ false.
**Q (QA đọc độc lập, nêu `file:dòng`):**
- Q1 **Tương đương từng hook**: đối chiếu từng dòng `git show HEAD:src/scenes/BossArenaScene.ts` với nhánh `kind === 'boss'` mới (ánh sáng, nút ngày/đêm, safe zone, quái ban đầu, luật sinh quái con, trần quái, điểm Boss, camera, restartRun → map chính, đẩy quái khỏi vùng sạch cổng); và nhánh map chính = hook mặc định cũ.
- Q2 **Vòng đời một scene tự khởi động lại**: Town→Arena→Town→Arena (≥ 3 vòng), chết ở mỗi map, menu → game: `init` luôn đặt lại `mapId`; không trường map nào rò từ map trước (QA tự liệt kê trường có giá trị khởi tạo không được reset trong `create`); Instance (`leave` ở SHUTDOWN, `resolve` ở create) vẫn đúng; không listener tích luỹ (đọc `KeyboardPlugin.js` shutdown).
- Q3 **Hành vi chuyển map giữ nguyên**: carry (HP/giáp/EN/hồi chiêu/dash), đồng hồ Boss, điểm xuất hiện, màu fade, thời gian sạc, khoá cổng về khi Boss sống, `portalCooldownUntil`.
- Q4 Overlay: `CharacterPanelScene` (`worldKey` = `this.scene.key` = world) và `VillageShopScene` (`SCENE_KEYS.world`) pause/resume đúng ở cả hai map; `LevelUpScene` (hiện không ai mở) không bị ảnh hưởng.
- Q5 Không thay đổi hành vi ngoài phạm vi; diff rỗng cho file cấm; không đổi số liệu/văn bản.
**Hồi quy QA không bỏ:** P2 (cổng, điểm xuất hiện, fade, sạc), P3a (đồng hồ Boss, reset khi chết), P3b (carry, lượt mới), P3c-1 (bộ đếm Instance mới mỗi create), P3c-2 (Instance/vé), P3d (tường, RESUME, lastAim), M1–M3 (chọn quái, Elite chỉ ở map chính), Boss chỉ sinh ở Arena (`decideBossAction` + chốt chặn ~1705), save không đổi.
**P (người chơi, Lead lập checklist sau QA):** vào/ra Arena nhiều lần; trong Arena: không có nút/phím ngày-đêm, ánh sáng cố định, Boss sinh sau độ trễ, cổng về khoá khi Boss sống, quái con sau khi hạ Boss, quái bị đẩy khỏi vùng sạch cổng; ở làng: ngày/đêm, biển tên vùng, shop, vùng an toàn đẩy quái; chết ở mỗi map; bảng nhân vật ở cả hai map; Console sạch.

## 6. Rủi ro
Trường rò giữa map vì một đối tượng scene thay hai; listener tích luỹ khi scene tự restart; `scene.start` lên chính nó với data cũ (luôn truyền data tường minh); quên nhánh Arena nào đó (mất khoá Boss/độ trễ/quái con); `zoneAt` lệch `isInsideVillage` ở biên; test cũ khoá `SCENE_KEYS.bossArena`.

## 7. Báo cáo (≤ 10 dòng)
Developer: 1 file sửa/tạo · 2 lệnh + số · 3 A1–A6 · 4 trường đã thêm reset + listener đã xác minh · 5 lệch brief · 6 chưa kiểm được · 7 cần Lead.
QA: 1 lệnh + HEAD + hash · 2 phạm vi (tách hunk P3d bằng bản vá) · 3 A1–A6 · 4 Q1–Q5 kèm `file:dòng` · 5 hồi quy · 6 lỗi (Chặn/Không chặn: mức · tái hiện · thực tế · mong đợi · file) · 7 chưa kiểm được · 8 ĐẠT/KHÔNG ĐẠT. Lỗi Chặn lên đầu.
