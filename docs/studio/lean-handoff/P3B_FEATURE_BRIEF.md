# FEATURE BRIEF + QA PLAN — P3b: chuyển trạng thái qua cổng bằng dữ liệu `scene.start`, tách `RunSession`

Cấp: **L** (sửa `RunSession.ts` thuộc `progression/` và `WorldScene.ts`: rủi ro cao). Cổng 1: người dùng đã đồng ý hướng và điểm lệch về `TravelTicket` (2026-11-17: "đồng ý làm tiếp p3b đi"). P3b nằm trong P3 (`docs/WORLD_ARCHITECTURE.md` §5, §8; `P3A_FEATURE_BRIEF.md` cho chia gói). Một file này là nguồn duy nhất cho Developer VÀ QA. Báo cáo agent **tối đa 10 dòng**, mỗi mục một dòng, theo ID tiêu chí.

BASELINE: HEAD=4d511f170d5acdd081f2c60ce6a4df33044ae039 · nhánh=main · tracked sạch · untracked có sẵn: docs/references/visual/** (48), docs/perf/** (1), docs/studio/lean-handoff/** (2 bản nháp M4 + file brief này)
Test baseline: 37 file, 691 test qua; `npx tsc --noEmit` sạch.

## 1. Mục tiêu
Bỏ kênh Phaser registry (`'runSession'`, kho toàn cục + cờ `pendingRestore` + `take/clearRunSession`) và chuyển trạng thái mang theo qua cổng bằng **dữ liệu của `scene.start`** (như `arrivalConnectionId` ở P2). Đồng thời tách `RunSession` thành hai phần có kiểu rõ ràng: `carry` (`CharacterCarry`: HP/giáp/năng lượng, hồi chiêu, dash) và `clock` (`RunClockState`, đã có từ P3a; ở lại `RunSession` theo Q1(a)). `TravelTicket` đầy đủ (kèm `InstanceRef`) làm ở P3c khi có Instance. **Hành vi giữ nguyên tuyệt đối: người chơi không thấy khác biệt.**

## 2. Phát hiện bắt buộc xử lý (đã xác minh trong `node_modules/phaser/src/scene/ScenePlugin.js:230` và `Systems.js:742`)
`scene.restart()` **không truyền data thì KHÔNG ghi đè data cũ**: `init` nhận lại data của lần `start` trước (`{characterId, arrivalConnectionId, run}`). Hệ quả nếu giữ `this.scene.restart()` trần: chết rồi chơi lại sẽ khôi phục nhầm `run` cũ (HP, đồng hồ Boss cũ) và dùng nhầm `arrivalConnectionId` cũ (lỗi tiềm ẩn đã có từ P2, vô hại hiện nay vì mọi spawn đều `default`; chú thích ở `WorldScene.init` về `restart()` đang nói sai). **Yêu cầu:** `restartRun()` của `WorldScene` gọi `this.scene.restart({ characterId: this.characterId })` (data tường minh, không có `run`/`arrivalConnectionId`), và `init` luôn đặt `arrivalConnectionId` và `incomingRun` từ data hiện có (`?? null`). `BossArenaScene.restartRun` đã dùng `scene.start(sceneKey, { characterId })` (đúng), bỏ lệnh `clearRunSession()`.

## 3. Tham chiếu (không chép lại)
`src/progression/RunSession.ts` (+`.test.ts`), `src/world/instance.ts` (`CharacterCarry`, chỉ `import type`), `src/progression/difficultyClock.ts` (`RunClockState`, chỉ `import type`). Điểm dùng trong `src/scenes/WorldScene.ts` (Grep `restored|RUN_SESSION_REGISTRY_KEY|takeRunSession|clearRunSession|captureRunSession|applyRunSessionToPlayer|extractRunSceneState|isRestorable|arrivalConnectionId|restartRun`, rồi đọc theo offset/limit): import ~275–279, `arrivalConnectionId` ~438, `restartRun` ~564, `clearRunSession` ~568, `takeRunSession` ~616, `init` ~627, `create` ~678–705 và ~818, `startPortalTravel` ~3676–3688. `src/scenes/BossArenaScene.ts` (`restartRun`, ~92–101). `src/progression/difficultyClock.test.ts`: khối `describe('DifficultyClock qua RunSession')` (~171–205) và import (~11–15) dùng `captureRunSession`/`extractRunSceneState`.

## 4. Phạm vi
File ĐƯỢC SỬA: `src/progression/RunSession.ts`, `src/progression/RunSession.test.ts`, `src/progression/difficultyClock.test.ts` (CHỈ import và khối `DifficultyClock qua RunSession`, đổi theo API mới, không đổi ý nghĩa; các test khác không đụng), `src/scenes/WorldScene.ts`, `src/scenes/BossArenaScene.ts`.
File ĐƯỢC TẠO: không.
KHÔNG đụng: `src/progression/difficultyClock.ts`, `src/progression/` còn lại (save, store, v8…), `src/world/**`, `src/config/**`, `src/entities/**`, `src/systems/**`, `src/ui/**`, `.claude/`, `CLAUDE.md`, `docs/`, `package*.json`, `tsconfig*.json`, `vite.config.*`. Không commit/push. Cần file ngoài danh sách thì DỪNG và báo Lead. Không đổi số liệu, văn bản hiển thị, `DifficultyClock`, `decideBossAction`, `portalCooldownUntil`.

## 5. Thiết kế
**5.1 `RunSession.ts` (thuần, không `phaser`, không `Math.random`/`Date.now`):**
```ts
import type { CharacterCarry } from '../world/instance';
import type { RunClockState } from './difficultyClock';
export interface RunVitals { health: number; armor: number; energy: number }   // giữ
export interface RunVitalsSource / RunVitalsTarget                              // giữ nguyên
export interface RunSession { carry: CharacterCarry; clock: RunClockState }     // MỚI: không còn pendingRestore, không trường phẳng
export function captureRunSession(player: RunVitalsSource, input: { skillCooldownUntil: Readonly<Record<string, number | undefined>>; clock: RunClockState }): RunSession  // bản sao độc lập; bỏ khóa cooldown undefined
export function applyRunSessionToPlayer(session: RunSession, player: RunVitalsTarget): void   // vitals (nếu có) + dash
export function isRunSession(value: unknown): value is RunSession   // kiểm cấu trúc và kiểu mọi trường (số hữu hạn, boolean, mảng số...), từ chối null/mảng/trường thiếu/NaN/Infinity
```
XÓA: `RUN_SESSION_REGISTRY_KEY`, `createRunSession`, `extractRunSceneState`, `RunSceneState`, `isRestorable`, trường `pendingRestore` (chỉ được xóa nếu không còn nơi dùng; Grep trước).
**5.2 Scene:** `init(data?: { characterId?: string; arrivalConnectionId?: ConnectionId; run?: unknown })`: đặt `this.arrivalConnectionId = data?.arrivalConnectionId ?? null` và `this.incomingRun = isRunSession(data?.run) ? data.run : null` MỖI lần. `create()`: `const restored = this.incomingRun` (thay `takeRunSession()`); nhánh `restored`: `skillCooldownUntil` từ `restored.carry.skillCooldownUntil` (bản sao), clock từ `createRunSessionClock(restored.clock)`, `portalCooldownUntil`, `fadeIn`, `applyRunSessionToPlayer(restored, this.player)` ở đúng chỗ cũ (sau khi áp chỉ số/trang bị); không `restored` → lượt mới như cũ. `startPortalTravel`: chụp `captureRunSession(this.player, { skillCooldownUntil: this.skillCooldownUntil, clock: this.clock.snapshot() })` ở ĐÚNG thời điểm cũ (trước khi fade, cùng chỗ `registry.set` cũ), giữ trong biến, rồi `this.scene.start(targetKey, { characterId, arrivalConnectionId, run })` trong callback `FADE_OUT_COMPLETE`. Bỏ `takeRunSession`, `clearRunSession`, mọi `this.registry` liên quan run. `restartRun()` theo mục 2. `BossArenaScene.restartRun`: bỏ `this.clearRunSession()`.

## 6. Tiêu chí nghiệm thu (A = máy, Q = QA đọc độc lập, P = người chơi)
**A:**
- A1 `npm run build`, `npx tsc --noEmit`, `npm test` qua; test ≥ 691.
- A2 Phạm vi git (WORKFLOW §6a): HEAD == baseline; chỉ 5 file sửa, không file tạo; không rename/xoá; diff rỗng cho mọi file cấm (đặc biệt `difficultyClock.ts`, `instance.ts`, `worldGraph.ts`, `bossArenaRules.ts`, `src/config/**`).
- A3 Grep: `WorldScene.ts`/`BossArenaScene.ts`/`RunSession.ts` không còn `RUN_SESSION_REGISTRY_KEY|takeRunSession|clearRunSession|extractRunSceneState|isRestorable|pendingRestore|createRunSession|RunSceneState`; không còn `this.registry` dùng cho run; không còn `this.scene.restart()` trần.
- A4 `RunSession.test.ts` (viết lại) có expect thật: (a) capture rồi apply giữ HP/giáp/năng lượng/dash/hồi chiêu (khóa `undefined` bị bỏ) và `clock` nguyên; (b) bản chụp độc lập với nguồn; (c) `isRunSession` chấp nhận bản hợp lệ và từ chối ít nhất: `null`, `undefined`, chuỗi, mảng, thiếu `carry`, thiếu `clock`, `NaN`/`Infinity` ở số, `vitals` sai kiểu, `dashChargeReadyAt` không phải mảng số, `skillCooldownUntil` giá trị không phải số, `bossReady` không phải boolean; (d) JSON khứ hồi (`JSON.parse(JSON.stringify(s))` vẫn qua `isRunSession`); (e) tập khóa của `carry` khớp whitelist `CharacterCarry` và `clock` khớp `RunClockState`, không có `pendingRestore`; (f) khóa nguồn: đọc text `WorldScene.ts` khẳng định có `scene.restart({` và không có `scene.restart()`, và `startPortalTravel` truyền `run` trong `scene.start`.
- A5 `difficultyClock.test.ts`: chỉ khối RunSession đổi theo API mới và vẫn kiểm cùng ý nghĩa (khứ hồi đồng hồ; không reset khi mang qua; `newRunClockState` tạo mới); không test nào bị xoá hoặc nới; số test không giảm.
**Q (QA đọc độc lập, nêu `file:dòng`):**
- Q1 Bẫy Phaser (mục 2): sau chuỗi vào Arena, về làng, chết, nhấn R: `restartRun` truyền data tường minh nên `run` và `arrivalConnectionId` là `null` → lượt mới (clock mới, HP đầy, hồi chiêu sạch, điểm `default`); chết ở Arena → `scene.start(sceneKey, { characterId })`.
- Q2 `create()`: nhánh `restored` giữ nguyên ngữ nghĩa cũ (clock, `skillCooldownUntil`, `portalCooldownUntil = startNow + BOSS_ARENA_PORTAL_COOLDOWN_MS`, `fadeIn` đúng màu theo connection, `applyRunSessionToPlayer` sau khi áp chỉ số); nhánh không `restored` như cũ.
- Q3 `startPortalTravel`: chụp đúng lúc cũ; `run` không bị sửa sau khi chụp; `characterId` và `arrivalConnectionId` vẫn truyền; không còn `registry.set`.
- Q4 Menu → vào game (`CharacterSelectScene` `scene.start(world, { characterId })`) không có `run` → lượt mới; mọi nơi gọi `scene.start`/`scene.restart` đều đã rà.
- Q5 `isRunSession` đủ chặt (không cho dữ liệu hỏng làm sập hay đặt `NaN` vào clock/HP) nhưng không từ chối dữ liệu hợp lệ thật (đối chiếu với `captureRunSession`).
- Q6 Không thay đổi hành vi ngoài phạm vi; hunk `WorldScene.ts` chỉ thuộc các hàm ở mục 3; chú thích sai về `scene.restart()` ở `init` đã được sửa.
**Hồi quy QA không bỏ:** qua cổng giữ HP/giáp/năng lượng/hồi chiêu/dash và đồng hồ Boss (`DifficultyClock`); chết ở map chính và ở Arena reset; menu → game; vào/ra Arena nhiều lần; điểm xuất hiện và màu fade (P2); `portalCooldownUntil`; save không đổi.
**P (người chơi, Lead lập checklist sau QA):** qua cổng giữ HP/hồi chiêu/đồng hồ Boss; **chết sau khi đã qua cổng thì lượt mới thật sự (HP đầy, đồng hồ Boss về 2:00, hồi chiêu sạch)**; chết ở Arena; menu → game; vào/ra lặp; Console sạch.

## 7. Rủi ro
Khôi phục nhầm trạng thái cũ do `scene.restart()` giữ data (đã có đối sách, mục 2); `isRunSession` quá lỏng hoặc quá chặt; sai thời điểm chụp; sửa `RunSession.ts` (progression) và test dùng chung với `difficultyClock.test.ts`.

## 8. Báo cáo (≤ 10 dòng, mỗi mục 1 dòng)
Developer: 1 file sửa · 2 lệnh (build/tsc/test + số) · 3 A1–A5 · 4 lệch brief · 5 chưa kiểm được · 6 cần Lead.
QA: 1 lệnh + HEAD khớp · 2 phạm vi từ git · 3 A1–A5 · 4 Q1–Q6 kèm `file:dòng` · 5 hồi quy · 6 lỗi (Chặn/Không chặn: mức · tái hiện · thực tế · mong đợi · file) · 7 chưa kiểm được · 8 kết luận ĐẠT/KHÔNG ĐẠT. Lỗi Chặn lên đầu.
