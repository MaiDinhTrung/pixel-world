# FEATURE BRIEF + QA PLAN — P2: đường chuyển Map đúng nghĩa

Cấp: **L** (đụng `WorldScene.ts`; Developer + QA độc lập; Cổng 1 đã duyệt ngày 2026-11-17: người dùng chọn hướng (b) và lệnh "triển khai"). Một file này là nguồn duy nhất cho Developer VÀ QA. Báo cáo agent **tối đa 10 dòng**, mỗi mục một dòng, theo ID tiêu chí. Thiết kế nền: `docs/WORLD_ARCHITECTURE.md` §3.3 (G2, G3, G5), §6, §8.

BASELINE: HEAD=8b18a36ea8d9a9350ae8906bfde87581363916b3 · nhánh=main · tracked sạch · untracked có sẵn: docs/references/visual/** (48), docs/perf/** (1), docs/studio/lean-handoff/** (2 bản nháp M4 + file brief này)
Test baseline: 35 file, 663 test qua; `npx tsc --noEmit` sạch.

## 1. Mục tiêu
Chuyển Map chạy theo dữ liệu thay vì hằng số/giả định của Arena, **không đổi gì người chơi nhìn thấy** với dữ liệu hiện có:
1. Điểm xuất hiện sau khi qua cổng lấy từ `MapDef.playerSpawns` qua `resolveArrival` (P1), không còn `town.playerSpawn`.
2. Màu fade và thời gian sạc của cổng lấy từ `ConnectionDef` (`fadeColor`, `chargeMs`), không còn `BOSS_ARENA_FADE_*`/`BOSS_ARENA_PORTAL_CHARGE_MS` trong scene.
3. Một Map có thể có **nhiều cổng** (`TownInfo.portals`), chọn cổng gần nhất trong tầm tương tác.
4. Vị trí quái/Elite/hộ tống/hòm bị kẹp theo **`MapDef.size`** (hướng (b)), không theo `WORLD_WIDTH/HEIGHT`. Với dữ liệu hiện có không thay đổi vị trí nào (điểm sinh Arena ± 48 đều nằm trong biên Arena); đây là sửa tính đúng đắn.

## 2. Tham chiếu (không chép lại)
`src/world/arrival.ts` (`resolveArrival`), `src/world/instance.ts`, `src/world/worldGraph.ts` (`findConnection`, `findMap`, `MapDef.size`), `src/config/worldConfig.ts` (connection dùng hằng `BOSS_ARENA_*`: giữ nguyên là nguồn dữ liệu), điểm cần sửa trong `src/scenes/WorldScene.ts` (dùng Grep, không đọc cả file): `town.playerSpawn`, `town.portal`, `getPortalConnection`, `tryStartPortalCharge`, `updatePortalCharge`, `startPortalTravel`, `updatePortalVisual`, `updateChests` (khối `nearPortal`), `init`/`create` (arrival, `fadeIn`), `spawnEnemy`, `spawnElite`, `spawnEliteEscort`, `spawnWeaponChest`, `getWorldBounds`, hàm chọn điểm sinh dự phòng dùng `town.playerSpawn`; `src/scenes/BossArenaScene.ts` (`keepEnemiesOutOfPortalZone`, `getWorldBounds`); `src/world/town.ts` (`TownInfo`, cuối `buildTown`); `src/world/bossArena.ts` (cuối `buildBossArena`).

## 3. Phạm vi
File ĐƯỢC SỬA (đã tồn tại): `src/scenes/WorldScene.ts`, `src/scenes/BossArenaScene.ts`, `src/world/town.ts`, `src/world/bossArena.ts`, `src/world/worldGraph.test.ts` (chỉ dòng khoá `playerSpawn` ở khoảng dòng 244, xem mục 5.2).
File ĐƯỢC TẠO: `src/world/travel.ts`, `src/world/travel.test.ts`.
KHÔNG đụng: `src/progression/**` (kể cả `RunSession.ts`), `src/systems/**`, `src/entities/**`, `src/ui/**`, `src/combat/**`, `src/skills/**`, mọi `src/config/**` (kể cả `worldConfig.ts`, `bossArenaConfig.ts`), `src/world/` ngoài các file trên (`portal.ts`, `worldGraph.ts`, `arrival.ts`, `instance.ts`…), `.claude/`, `CLAUDE.md`, `docs/`, `package*.json`, `tsconfig*.json`, `vite.config.*`. Không commit/push. Cần sửa file ngoài danh sách thì DỪNG và báo Lead.
Không đổi: save, `RunSession`, đồng hồ độ khó/lịch Boss, số liệu, văn bản hiển thị (toast, prompt, nhãn cổng), `BOSS_ARENA_PORTAL_FADE_MS`, `portalCooldownUntil`, `BOSS_ARENA_PORTAL_INTERACT_RADIUS`. Không thêm Map/cổng mới.

## 4. Thiết kế
**4.1 `src/world/travel.ts` (thuần, không `phaser`, không `Math.random`/`Date.now`), có test:**
- `getConnectionTravelInfo(world, connectionId)`: trả `{ connection, targetMap, sceneKey, fadeColor, chargeMs }` (lấy từ `findConnection`/`findMap`); connection hoặc map đích không tồn tại → ném `Error` rõ ràng.
- `resolveSceneArrival(world, mapId, arrivalConnectionId | null)`: `null` → điểm `default`; có connection → dùng `resolveArrival(map, { spawnId: connection.to.spawnId, connectionId })`; trả `{ spawnId, point, fadeColor | null }` (fadeColor của connection đã dùng, `null` khi không qua cổng). Connection không thuộc về map này → coi như không có (điểm `default`).
- `clampToMap(map, x, y, margin)`: kẹp vào `[margin, size.width-margin] × [margin, size.height-margin]` (nếu `margin*2` vượt kích thước thì trả tâm, không lỗi).
- `nearestPortal(portals, x, y, radius)`: trả cổng gần nhất trong `radius` (≤ radius) hoặc `null`; hòa → cổng đứng trước trong mảng.
**4.2 Scene:**
- `scene.start(targetKey, { characterId, arrivalConnectionId })` trong `startPortalTravel`; trong `init(data)` đặt `this.arrivalConnectionId = data?.arrivalConnectionId ?? null` **mỗi lần `init`** (bẫy: `scene.restart()` tái dùng instance, nếu không đặt lại thì sau khi chết vẫn dùng connection cũ).
- `create()`: điểm đặt người chơi = `resolveSceneArrival(...)`; `fadeIn` dùng `fadeColor` của connection đã dùng (thay hằng); `portalCooldownUntil` giữ logic cũ.
- `TownInfo.playerSpawn` bị bỏ; chỗ dự phòng dùng `town.playerSpawn` dùng `MapDef.playerSpawns.default`. `TownInfo.portal?` → `portals: ScenePortal[]` (map chính 1 cổng, Arena 1 cổng).
- Trạng thái sạc theo cổng đang sạc (`chargingPortal`); huỷ nếu rời tầm, bị từ chối, hoặc đổi cổng; thời gian sạc = `connection.chargeMs`; fade khi đi = `connection.fadeColor`.
- Kẹp vị trí: 4 chỗ (`spawnEnemy`, `spawnElite`, `spawnEliteEscort`, `spawnWeaponChest`) dùng `clampToMap(this.getMapDef(), …)` với margin hiện có (`48`, `48`, `48`, `WALL_THICKNESS + 24`). `getWorldBounds()` mặc định lấy từ `MapDef.size`; bỏ ghi đè trùng ở `BossArenaScene` (giá trị giống hệt); giữ `getCameraBounds` của Arena.
- `BossArenaScene.keepEnemiesOutOfPortalZone` lặp qua mọi cổng.

## 5. Tiêu chí nghiệm thu (QA kiểm theo ID; A = máy kiểm, Q = QA đọc độc lập, P = người chơi)
**5.1 A (tự động/lệnh):**
- A1 `npm run build`, `npx tsc --noEmit`, `npm test` qua; test ≥ 663 và tăng.
- A2 Phạm vi git (WORKFLOW §6a): HEAD == baseline; chỉ 5 file sửa + 2 file tạo ở mục 3; không rename/xoá; `git diff` rỗng cho mọi file cấm.
- A3 `grep` trong `src/scenes/WorldScene.ts` và `BossArenaScene.ts` không còn `WORLD_WIDTH|WORLD_HEIGHT` (trừ import không dùng thì phải bỏ), `BOSS_ARENA_FADE_TO_`, `BOSS_ARENA_PORTAL_CHARGE_MS`, `town.playerSpawn`, `town.portal\b` (số ít). Các hằng đó vẫn còn trong `config/` và `worldConfig.ts` (nguồn dữ liệu).
- A4 `travel.test.ts` có expect thật cho:
  (a) `getConnectionTravelInfo` cả 2 connection: `sceneKey` (`SCENE_KEYS.bossArena` / `SCENE_KEYS.world`), `fadeColor` == `BOSS_ARENA_FADE_TO_ARENA` / `BOSS_ARENA_FADE_TO_WORLD`, `chargeMs` == `BOSS_ARENA_PORTAL_CHARGE_MS` (800); connection lạ → ném lỗi;
  (b) `resolveSceneArrival`: `null` → `{1920,1440}` ở map chính và `{800,900}` ở Arena; qua `conn.village_to_arena` trên map Arena và `conn.arena_to_village` trên map chính cho đúng điểm `default` và đúng fadeColor; connection không thuộc map → `default`, fadeColor `null`;
  (c) `clampToMap`: trong biên → giữ nguyên; map chính cho kết quả y hệt công thức cũ; Arena (1600×1088): điểm (1590,1080), margin 48 → (1552,1040) (công thức cũ với WORLD sẽ không kẹp); margin quá lớn không ném;
  (d) `nearestPortal`: ≤ bán kính, hòa theo thứ tự, ngoài tầm → `null`.
- A5 Các test cũ không bị nới: dòng khoá `playerSpawn` ở `worldGraph.test.ts` (~244) được thay có chủ đích bằng khẳng định tương đương hơn (xem 5.2); mọi dòng khác của file test không đổi giá trị kỳ vọng. QA báo cáo từng dòng test bị sửa/xoá.
**5.2 Q (QA đọc code độc lập, nêu `file:dòng`):**
- Q1 `init` đặt lại `arrivalConnectionId` mỗi lần; sau khi chết rồi `restartRun` (cả map chính lẫn Arena) người chơi xuất hiện ở điểm `default`, không dùng connection cũ.
- Q2 Hành vi giữ nguyên: điểm vào Arena {800,900}, về làng {1920,1440}; màu `fadeOut`/`fadeIn` đúng hướng (vào Arena đỏ thẫm, về làng xanh); sạc 800 ms; `portalCooldownUntil` và `endSkillStatesForTravel`/invulnerability y nguyên; `saveProgress` + `captureRunSession` vẫn đúng chỗ.
- Q3 `updateChests`: thứ tự ưu tiên tương tác (nhặt đồ > NPC > cổng > hòm đóng) và prompt giữ nguyên; `setPickupAvailable` vẫn tính cả cổng; sạc huỷ khi rời tầm/bị từ chối/chết.
- Q4 Mọi chỗ từng dùng `this.town.portal`/`playerSpawn` đã chuyển đúng (WorldScene, BossArenaScene, town.ts, bossArena.ts); không còn tham chiếu mồ côi; dữ liệu `portals` có 1 phần tử cho mỗi map hiện có.
- Q5 Dòng `worldGraph.test.ts` khoá `playerSpawn` được thay bằng khẳng định hợp lý: (`MapDef.playerSpawns.default` == `MAIN_DEFAULT_SPAWN`) giữ, và khẳng định town.ts/bossArena.ts không còn định nghĩa điểm xuất hiện riêng. Không nới yếu hơn.
- Q6 Không có thay đổi hành vi nào ngoài 4 mục ở §1; `git diff` của `WorldScene.ts` chỉ gồm hunk thuộc các hàm ở §2.
**5.3 Hồi quy liên quan (QA không bỏ):** vào/ra Arena nhiều lần; cổng về khóa khi Boss sống (toast/prompt nguyên văn); Elite/hộ tống/hòm sinh ở map chính; quái Arena sinh đúng điểm; chết ở map chính và ở Arena; menu → vào game; `?time`/phím N không liên quan nhưng không lỗi.
**5.4 P (người chơi, Lead lập checklist sau QA):** vào/ra Arena (màu fade, thời gian sạc, đúng điểm xuất hiện, HP/hồi chiêu giữ), chết ở cả hai map, Elite/hòm, prompt cổng, Console sạch.

## 6. Rủi ro
`WorldScene.ts` lớn, nhiều chỗ chạm; `scene.restart()` tái dùng instance (bẫy Q1); tách `TownInfo.portal` → `portals` chạm 4 file; test khoá source-text cũ (`playerSpawn`) cần thay có chủ đích.

## 7. Báo cáo (≤ 10 dòng, mỗi mục 1 dòng)
Developer: 1 file sửa/tạo · 2 lệnh (build/tsc/test + số) · 3 từng A1–A5 · 4 lệch brief · 5 chưa kiểm được · 6 cần Lead.
QA: 1 lệnh + HEAD khớp · 2 phạm vi từ git · 3 A1–A5 · 4 Q1–Q6 (kèm `file:dòng`) · 5 hồi quy 5.3 · 6 lỗi (Chặn/Không chặn) · 7 chưa kiểm được · 8 kết luận. Lỗi Chặn lên đầu.
