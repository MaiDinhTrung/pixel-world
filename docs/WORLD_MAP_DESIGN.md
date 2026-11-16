# WORLD / REGION / MAP — Spec W0

Trạng thái: **đã duyệt Cổng 1 (2026-11-16)** theo khuyến nghị D1–D9; DP-3 chưa duyệt, DP-4 không duyệt. Chưa có code. Nguồn: báo cáo Gameplay Designer và Visual Designer (W0), đã đối chiếu code. Nhãn: [XM] đã xác minh trong code, [SUY] suy đoán, [?] chưa xác định.

Viết cho: người duyệt/đang phát triển Pixel World và Developer sẽ lập brief W1–W3.

## 1. Hiện trạng [XM]

- Bản đồ chính 120×80 ô × 32 px (`config/constants.ts`). Làng = `VILLAGE_ZONE` hình chữ nhật (`config/economyConfig.ts`); `isInsideVillage` dùng nó.
- Boss Arena 50×34 ô là scene riêng (`BossArenaScene extends WorldScene`), ánh sáng cố định, điểm sinh/cổng ở `config/bossArenaConfig.ts`.
- Cổng chỉ 2 loại `'enter' | 'return'`, mỗi scene một cổng (`TownInfo.portal?`); đích viết cứng `toArena ? SCENE_KEYS.bossArena : SCENE_KEYS.world` ở `WorldScene` (đoạn `startPortalTravel`); luật khóa ở `world/bossArenaRules.ts` (`getPortalDenyReason`, `bossAlive` khóa cổng về), nhưng hiển thị khóa lấy từ `this.boss !== null` → hai nguồn có thể lệch.
- `RunSession` giữ vitals/hồi chiêu/đồng hồ Boss (mốc tuyệt đối) qua scene; save không chứa bản đồ hiện tại (quyết định 2026-11-15).
- Độ khó chỉ theo thời gian: `getThreatTier = min(MAX_THREAT_TIER, floor((t − runStartedAt)/THREAT_INTERVAL_MS))`, ảnh hưởng máu/tốc/sát thương quái, trần quái, nhịp sinh, vàng, Boss. Chỉ 2 loại quái: `Enemy` và `RangedEnemy` (xoay vòng `spawnIndex % 3 === 2` → ranged). Chưa có Elite, chưa có Region.
- Không khí (`vfx/atmosphere.ts`): `createAtmosphere` đọc hằng số toàn cục; ban ngày ambient 0 (DP-4 chưa duyệt); ban đêm một `RenderTexture` cỡ màn hình.

## 2. Quyết định đã duyệt

| Mã | Quyết định |
|---|---|
| D1 | Vùng hình chữ nhật (khớp `VILLAGE_ZONE`) |
| D2 | Độ khó vùng **cộng**: `tierEffective = clamp(timeTier + region.tierOffset, tierFloor, tierCap)`; mọi công thức theo tier giữ nguyên |
| D3 | 3 vùng trên 2 map hiện có (`region.village`, `region.wilds` → tách gần/xa ở W3, `region.arena`); **chưa thêm bản đồ mới** |
| D4 | Elite: gói riêng sau W3 (đổi gameplay); W1 chỉ chừa `eliteSlots: []` |
| D5 | Không lưu bản đồ hiện tại vào save |
| D6 | Mỗi map một điểm xuất phát `default`; chết về làng, run reset như hiện nay |
| D7 | Khóa cổng là danh sách `LockRule`; W2 chỉ cần `boss_alive`; hiển thị và luật dùng **cùng một hàm** |
| D8 | Cho phép dừng sau W1 hoặc W2 |
| D9 | Biển tên vùng (tên + mức ◆ + 1 dòng ≤ 40 ký tự) khi vào, chỉ ở W3 |
| DP-3 | Chưa duyệt: vùng dùng màu/nền đã duyệt, chưa có bảng nền riêng |
| DP-4 | Không: ban ngày không u tối theo vùng (`AMBIENT.dayAlpha` giữ 0) |

Giải quyết mâu thuẫn Visual↔Gameplay: Visual đề xuất Rừng Khô/Hầm Mộ là scene riêng; **cơ chế quyết trước** → chưa dựng scene mới (bản đồ thứ ba để sau W3). Đổi ambient/sương theo vùng trong cùng scene cần sửa `createAtmosphere` (file dùng chung) → **không làm ở W1–W3**; vùng chỉ khác ở tên, mức ◆ và độ khó.

## 3. Mô hình dữ liệu (thuần, không import Phaser)

Đề xuất đặt `src/config/worldConfig.ts` (dữ liệu) và `src/world/worldGraph.ts` (kiểu, tra cứu, luật thuần) — tên là đề xuất, chưa tồn tại.

- **MapDef**: `id` (`map.starting_lands`, `map.boss_arena_1`), `sceneKey`, `size`, `playerSpawns` (`default`, `fromPortal:<connectionId>`), `regions`, `connections`, `lighting: 'day_night' | 'fixed'`, `kind: 'overworld' | 'boss'`, `deathRespawn`.
- **RegionDef**: `id`, `mapId`, `bounds`, `safe`, `tierOffset`, `tierFloor`, `tierCap`, `spawnTable` (`pattern: EnemyKind[]` xoay vòng, giữ `['melee','melee','ranged']`; trọng số chỉ ở W3 nếu được duyệt riêng), `maxAliveCap`, `eliteSlots: []`.
- **ConnectionDef**: `id`, `from {mapId,x,y}`, `to {mapId,spawnId}`, `type: 'portal'`, `direction`, `lockRules`, `chargeMs`, `fadeColor`, `visual`.
- **LockRule** (hàm thuần của `WorldFacts {bossAlive, bossReady, playerLevel}`): `always_open`, `boss_alive`; `boss_ready`, `min_level` chừa chỗ, chưa dùng.
- `evaluateConnection` bọc `getPortalDenyReason` hiện có (không viết lại); `requestTravel(connectionId, facts)` trả `{ok, to}` hoặc `{ok:false, reason}` — cùng dạng `PlayerState`, để server chạy cùng hàm sau này.
- Hai map hiện có mô tả bằng dữ liệu: `region.village` bounds = `VILLAGE_ZONE` (safe, spawnTable rỗng); `region.wilds` = phần còn lại; `conn.village_to_arena` tại `BOSS_ARENA_ENTRANCE`, luật `always_open`; `conn.arena_to_village` tại cổng về, luật `boss_alive`; `region.arena` dùng `BOSS_ARENA_MINION_SPAWNS`, trần `BOSS_ARENA_MINION_MAX_ALIVE`. Tham chiếu hằng số hiện có, không sao chép số.
- Id (`MapId/RegionId/ConnectionId/SpawnId`) ổn định, không đổi tên sau phát hành; `SCENE_KEYS` chỉ là ánh xạ.

## 4. Nhận dạng hình ảnh (W3 và sau)

- Mức nguy hiểm đọc bằng **số ◆ (1–3)**, không bằng màu (đỏ/cam dành cho đạn quái và telegraph). Biển tên depth lớp UI, không che tâm màn, không ép hiện khi có Boss/telegraph; không flash toàn màn.
- Nền/prop/decal: Hybrid (pack làng + tint + decal) và Procedural; prop mới **không va chạm** (prop có va chạm là đổi gameplay → Gameplay Designer). Texture sinh runtime khóa tên `region-<id>-…` để vào lại không sinh trùng. Số liệu ở `src/config/`.
- Biển báo/vòm cổng tái dùng `PortalVisual`, `brickBox`, `village-sign`; chuyển cảnh tái dùng fade 450 ms.
- Chủ đề gợi ý cho bản đồ sau (chưa duyệt): Đồng Hoang Úa, Rừng Khô Thì Thầm, Hầm Mộ Đá Lạnh.

## 5. Chia gói

Mỗi gói: baseline Git → Developer → QA → chơi thử → Cổng 2; `WorldScene.ts` luôn tuần tự.

| Gói | Nội dung | File | Nghiệm thu (máy kiểm) |
|---|---|---|---|
| **W1** | Mô hình thuần, **chưa nối** | Tạo: `config/worldConfig.ts`, `world/worldGraph.ts`, `world/worldGraph.test.ts` | build/tsc/test đạt; không import `phaser`; `regionAt(x,y).safe === isInsideVillage(x,y)` trên lưới; tọa độ cổng bằng hằng hiện có; bảng chân trị `evaluateConnection` khớp `getPortalDenyReason`; id duy nhất, không kết nối mồ côi; `tierEffective` (offset 0) = `getThreatTier` kể cả biên 59999/60000 ms và trên trần; diff `src/` chỉ file mới |
| **W2** | Nối registry, **hành vi y hệt** | Sửa: `WorldScene.ts`, `BossArenaScene.ts`, `world/town.ts`, `world/bossArena.ts`, `progression/RunSession.ts` (+ test), `world/portal.ts` nếu cần | Đích cổng đọc từ dữ liệu (không còn `toArena ? …`); hiển thị khóa và luật khóa dùng chung hàm; tier/trần/nhịp sinh cùng số; `combatConfig.ts` diff rỗng. Chơi thật: vào/ra Arena, đúng điểm cũ, cổng về khóa khi Boss sống, HP/EN/hồi chiêu/đồng hồ Boss giữ qua cổng, chết ở Arena/map chính về làng, F5 ở Arena về làng. **Cần xác minh trước khi lập brief:** vị trí đặt người chơi khi về từ Arena [?]; `spawnEnemy` clamp theo `WORLD_WIDTH/HEIGHT` dù Arena nhỏ hơn [SUY] |
| **W3** | Tách `region.wilds` thành gần (offset 0) / xa (offset +1, giá trị khởi điểm); biển tên + ◆ | Sửa: `WorldScene.ts`, `worldConfig.ts`; tạo UI biển tên nếu cần | Offset 0 cho kết quả giống W2 (test thuần); quái sinh trong vùng an toàn = 0; không vượt `MAX_THREAT_TIER` trừ khi `tierCap` cho phép. Chơi thật: vùng xa mạnh hơn rõ nhưng không bất công (cân bằng chỉ bạn đánh giá được) |

Điểm dừng được phép: sau W1, sau W2. Thứ tự đã chốt với người dùng: **C4 trước, rồi W1 → W2 → W3**.

## 6. Rủi ro và chưa xác định

- Tier cộng chạm trần 6 sớm ở vùng sâu → quyết sau W3 (nâng `MAX_THREAT_TIER` đổi cân bằng, hoặc `tierCap` riêng theo vùng).
- Đổi quy tắc xoay vòng 2:1 sang trọng số làm đổi tỉ lệ melee/ranged → chỉ W3 và cần duyệt riêng.
- Nếu sau này có nhiều Arena: `bossReady` phải gắn vào `MapId` (chưa làm).
- Quái đang sống bị hủy khi đổi scene; cổng vào Arena nằm ngoài vùng an toàn, giữ như hiện nay (có thể thêm luật `no_hostile_nearby` sau).
- Đồng hồ Boss và tier là thời gian cục bộ (`game.loop.time`), chưa phải trạng thái server.
- Chưa biết: bố cục vùng ngoài làng, tile nước/cầu có chặn đường không, tên chính thức các vùng.
- Hiệu năng (nền theo vùng, RenderTexture) chưa đo; tối ưu Android hoãn theo quyết định 2026-11-16 (xem `docs/perf/MOBILE_BENCHMARK_PLAN.md`).
