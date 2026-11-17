# FEATURE BRIEF + QA PLAN — P3a: DifficultyClock

Cấp: **L** (đụng `WorldScene.ts`; Developer + QA độc lập). Cổng 1: người dùng đã duyệt kiến trúc (W-A12, Q1 = (a), `docs/WORLD_ARCHITECTURE.md` §5.4) và lệnh "bắt đầu p3" (2026-11-17). Chia gói của P3 (Lead tự quyết cách chia): **P3a DifficultyClock** (gói này) → P3b TravelTicket thay kênh registry và tách `RunSession` → P3c `InstanceRuntime` + `LocalInstanceAllocator` nối vào game. Mỗi gói có QA và playtest riêng; gói sau chỉ bắt đầu khi gói trước được nghiệm thu. Một file này là nguồn duy nhất cho Developer VÀ QA. Báo cáo agent **tối đa 10 dòng**, mỗi mục một dòng, theo ID tiêu chí.

BASELINE: HEAD=b1097aae489c5b417333a8f05ce13874a2c1a162 · nhánh=main · tracked sạch · untracked có sẵn: docs/references/visual/** (48), docs/perf/** (1), docs/studio/lean-handoff/** (2 bản nháp M4 + file brief này)
Test baseline: 36 file, 677 test qua; `npx tsc --noEmit` sạch.

## 1. Mục tiêu
Tách *logic dùng đồng hồ độ khó và lịch Boss* khỏi *nơi lưu*: gom 5 trường rải trong scene (`runStartedAt`, `nextBossAt`, `bossNumber`, `bossReady`, `bossWarningShown`) vào một đối tượng `DifficultyClock` mà scene gọi qua interface. Cài đặt hiện tại `RunSessionClock` (đồng hồ ở lại `RunSession`, Q1(a)); sau này có thể thay bằng đồng hồ do Instance sở hữu mà không sửa chỗ gọi. **Hành vi và công thức giữ nguyên tuyệt đối. Người chơi không thấy khác biệt.**

## 2. Tham chiếu (không chép lại)
`docs/WORLD_ARCHITECTURE.md` §5.4 (bất biến cần bảo toàn); `src/progression/RunSession.ts` (KHÔNG sửa; `RunSceneState`, `captureRunSession`, `extractRunSceneState`); `src/world/worldGraph.ts` (`timeThreatTier`, KHÔNG sửa); `src/world/bossArenaRules.ts` (`decideBossAction`, `shouldSpawnArenaMinions`, KHÔNG sửa — chúng đã nhận giá trị tường minh). Điểm dùng trong `src/scenes/WorldScene.ts` (Grep `runStartedAt|nextBossAt|bossNumber|bossReady|bossWarningShown`, khoảng 45 chỗ, rồi đọc theo offset/limit; không đọc cả file): khai báo trường (~425–429, ~477), `create()` (~670–704, nhánh `restored`), `spawnEnemy`/`spawnElite`/`getThreatTier` (~1198, 1416, 1542, 1599), `getBossHudText`, `updateBoss`, `spawnBoss`, `handleBossDefeated`, `getWorldFacts`, `startPortalTravel` (`captureRunSession`), `dropBossLoot`/vàng Boss (~3829). `src/scenes/BossArenaScene.ts` (~76–80: `canSpawnEnemies`).

## 3. Phạm vi
File ĐƯỢC SỬA: `src/scenes/WorldScene.ts`, `src/scenes/BossArenaScene.ts`.
File ĐƯỢC TẠO: `src/progression/difficultyClock.ts`, `src/progression/difficultyClock.test.ts`.
KHÔNG đụng: `src/progression/RunSession.ts` và test của nó, mọi file khác trong `src/progression/**`, `src/world/**`, `src/config/**` (kể cả `combatConfig.ts`), `src/entities/**`, `src/systems/**`, `src/ui/**`, `.claude/`, `CLAUDE.md`, `docs/`, `package*.json`, `tsconfig*.json`, `vite.config.*`. Không commit/push. Cần file ngoài danh sách thì DỪNG và báo Lead. Không đổi số liệu, văn bản hiển thị (HUD "TRÙM SAU m:ss", toast), `decideBossAction`, `BOSS_*` hằng.

## 4. Thiết kế
**4.1 `src/progression/difficultyClock.ts` (thuần: không `phaser`, không `Math.random`/`Date.now`; có thể import `timeThreatTier` từ `../world/worldGraph`):**
```ts
export interface RunClockState { runStartedAt: number; nextBossAt: number; bossNumber: number; bossReady: boolean; bossWarningShown: boolean }
export interface DifficultyClock {
  readonly runStartedAt: number; readonly nextBossAt: number; readonly bossNumber: number;
  readonly bossReady: boolean;  readonly bossWarningShown: boolean;
  elapsedMs(now: number): number;                          // = now - runStartedAt
  timeTier(now: number): number;                           // = timeThreatTier(elapsedMs(now)), công thức CŨ
  markBossReady(): void;                                   // bossReady = true
  markWarningShown(): void;                                // bossWarningShown = true
  onBossSpawned(): void;                                   // bossReady = false; bossNumber += 1
  onBossDefeated(now: number, respawnMs: number): void;    // nextBossAt = now + respawnMs; bossWarningShown = false
  snapshot(): RunClockState;                               // bản sao độc lập, dùng cho captureRunSession
}
export function newRunClockState(now: number, firstBossDelayMs: number): RunClockState; // runStartedAt=now, nextBossAt=now+delay, bossNumber=0, bossReady=false, bossWarningShown=false
export function createRunSessionClock(initial: RunClockState): DifficultyClock;         // sao chép initial, không giữ tham chiếu
```
**4.2 Scene:** thay 5 trường bằng `protected clock: DifficultyClock` (hoặc tên tương đương, một nơi). `create()`: không có `restored` → `createRunSessionClock(newRunClockState(startNow, BOSS_FIRST_DELAY_MS))` (đúng như gán cũ: `bossNumber=0`, `bossWarningShown=false`, `bossReady=false`, `runStartedAt=startNow`, `nextBossAt=startNow+BOSS_FIRST_DELAY_MS`); có `restored` → khởi tạo từ `extractRunSceneState(restored)` (5 trường mang theo, không đặt lại). Mọi chỗ đọc/ghi cũ đổi sang `this.clock.…` đúng ngữ nghĩa: `mark_ready`→`markBossReady()`, `warn`→`markWarningShown()`, `spawnBoss`→`onBossSpawned()`, `handleBossDefeated`→`onBossDefeated(this.time.now, BOSS_RESPAWN_MS)`, `getThreatTier(time)`→`clock.timeTier(time)`, `effectiveThreatTier(this.time.now - this.runStartedAt, zone)`→`effectiveThreatTier(this.clock.elapsedMs(this.time.now), zone)`, `startPortalTravel` → `captureRunSession(player, { skillCooldownUntil, ...this.clock.snapshot() })`. **Giữ nguyên mốc thời gian mỗi chỗ đang dùng** (`time` tham số, `this.time.now`, `startNow = game.loop.time` ở create — KHÔNG đổi sang đồng hồ khác).

## 5. Tiêu chí nghiệm thu (A = máy, Q = QA đọc độc lập, P = người chơi)
**A (tự động):**
- A1 `npm run build`, `npx tsc --noEmit`, `npm test` qua; test ≥ 677 và tăng.
- A2 Phạm vi git (WORKFLOW §6a): HEAD == baseline; chỉ 2 file sửa + 2 file tạo ở mục 3; không rename/xoá; `git diff` rỗng cho mọi file cấm (đặc biệt `RunSession.ts`, `combatConfig.ts`, `worldGraph.ts`, `bossArenaRules.ts`).
- A3 Grep trong `WorldScene.ts` và `BossArenaScene.ts`: không còn `this.runStartedAt|this.nextBossAt|this.bossNumber|this.bossReady|this.bossWarningShown` và không còn khai báo các trường đó (chỉ truy cập qua clock).
- A4 `difficultyClock.test.ts` có expect thật cho: (a) `newRunClockState` đúng 5 giá trị; (b) `timeTier` == `timeThreatTier` ở lưới điểm gồm biên `k*THREAT_INTERVAL_MS - 1` / `k*THREAT_INTERVAL_MS`, trần `MAX_THREAT_TIER`, elapsed âm → 0; (c) `elapsedMs`; (d) từng lệnh (`markBossReady`, `markWarningShown`, `onBossSpawned`, `onBossDefeated`) đúng chuyển trạng thái và không đụng trường khác; (e) `snapshot()` độc lập (sửa snapshot không đổi clock, sửa trạng thái ban đầu không đổi clock); (f) vòng khứ hồi qua `RunSession`: `captureRunSession` với `clock.snapshot()` rồi `extractRunSceneState` rồi `createRunSessionClock` cho clock tương đương (dùng stub player như `RunSession.test.ts`); (g) **mô hình đối chiếu**: mô phỏng một dòng thời gian (map chính hết giờ → `mark_ready` → vào Arena → `spawn` → hạ Boss → `nextBossAt` mới → `warn`), dùng `decideBossAction` thật, so kết quả giữa clock và một mô hình trạng thái thuần (đối tượng có 5 trường, viết trong test theo đúng logic inline cũ) trên cùng chuỗi `now`: mọi quan sát (action, bossNumber, bossReady, nextBossAt, warningShown) bằng nhau từng bước; (h) đồng hồ KHÔNG đặt lại khi mang qua `RunSession` nhưng được tạo mới bởi `newRunClockState`.
- A5 Test cũ không bị nới (`git diff` của file test cũ rỗng; chỉ 1 file test mới).
**Q (QA đọc độc lập, nêu `file:dòng`):**
- Q1 Mỗi chỗ cũ dùng 5 trường đã chuyển đúng ngữ nghĩa và đúng mốc thời gian (đối chiếu từng hunk của `git diff`): đặc biệt `handleBossDefeated` dùng `this.time.now` (không `time`), `create()` dùng `game.loop.time`.
- Q2 `create()`: thứ tự khởi tạo tương đương; nhánh `restored` ghi đè đúng 5 trường; không `restored` (lượt mới, chết rồi `scene.restart()`, menu → vào game) tạo clock mới với `startNow`; `portalCooldownUntil`, `skillCooldownUntil` giữ nguyên.
- Q3 `BossArenaScene.canSpawnEnemies` và `getWorldFacts()` nhận cùng giá trị như trước; HUD `getBossHudText` cho cùng chuỗi chữ.
- Q4 `clock` không bị chia sẻ nhầm giữa scene (mỗi `create()` một đối tượng mới; không biến tĩnh).
- Q5 Không thay đổi hành vi ngoài phạm vi; hunk của `WorldScene.ts` chỉ thuộc các hàm ở §2; không import thừa/thiếu.
- Q6 Hồi quy tĩnh: `bossArenaRules.ts` (decideBossAction, shouldSpawnArenaMinions) vẫn nhận 5 giá trị y hệt; `RunSession.ts` không đổi và `captureRunSession`/`extractRunSceneState` vẫn khớp kiểu.
**Hồi quy QA không bỏ:** Boss lần đầu sau 2 phút (map chính `mark_ready`); vào Arena rồi Boss ra sau độ trễ; hạ Boss rồi quái con sinh và đồng hồ Boss kế; mang đồng hồ qua cổng (không reset); chết rồi chơi lại (reset); bậc quái theo thời gian và theo vùng (W3); Elite; lượng vàng/EXP Boss (dùng `bossNumber`).
**P (người chơi, Lead lập checklist sau QA):** đếm ngược HUD "TRÙM SAU …", "TRÙM ĐANG CHỜ Ở ĐẤU TRƯỜNG", vào Arena Boss ra, hạ Boss và Boss kế, đồng hồ giữ qua cổng, chết thì reset, quái mạnh dần theo thời gian.

## 6. Rủi ro
`WorldScene.ts` lớn, ~45 chỗ chạm; nhầm mốc thời gian (`time` vs `this.time.now` vs `game.loop.time`) âm thầm đổi lịch Boss; clock dùng chung nhầm giữa scene. Bù bằng mô hình đối chiếu trong test (A4g) và QA Q1–Q4.

## 7. Báo cáo (≤ 10 dòng, mỗi mục 1 dòng)
Developer: 1 file sửa/tạo · 2 lệnh (build/tsc/test + số) · 3 A1–A5 · 4 lệch brief · 5 chưa kiểm được · 6 cần Lead.
QA: 1 lệnh + HEAD khớp · 2 phạm vi từ git · 3 A1–A5 · 4 Q1–Q6 kèm `file:dòng` · 5 hồi quy · 6 lỗi (Chặn/Không chặn: mức · tái hiện · thực tế · mong đợi · file) · 7 chưa kiểm được · 8 kết luận ĐẠT/KHÔNG ĐẠT. Lỗi Chặn lên đầu.
