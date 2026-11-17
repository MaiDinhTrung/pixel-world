# FEATURE BRIEF + QA Plan — P3c-2: LocalInstanceAllocator và TravelTicket nối vào game

Cấp: **L** (đụng `WorldScene.ts`). Cổng 1: người dùng đã duyệt kiến trúc (W-A6, W-A10, `docs/WORLD_ARCHITECTURE.md` §4.2, §5, §6, §8) và lệnh "bắt đầu p3c-2" (2026-11-17); điểm lệch "TravelTicket đầy đủ kèm Instance để P3c" đã được duyệt ở P3b. Đây là gói cuối của P3. Một file này là nguồn duy nhất cho Developer VÀ QA. Báo cáo agent **tối đa 10 dòng**, mỗi mục một dòng.

BASELINE: HEAD=80b23eb76dcc12281352426f4618bbe2a66709dd · nhánh=main · tracked sạch · untracked có sẵn: docs/references/visual/** (48), docs/perf/** (1), docs/studio/lean-handoff/** (2 bản nháp M4 + file brief này)
Test baseline: 38 file, 706 test qua; `npx tsc --noEmit` sạch.

## 1. Mục tiêu
Mỗi lần người chơi ở trong một Map, game **giữ một `InstanceRef` do `LocalInstanceAllocator` cấp**, và chuyển Map đi qua một **`TravelTicket`** (có `from`/`to` Instance, `spawnPoint`, `carry`). Với chính sách mặc định (private, capacity 1, ephemeral) hành vi giữ nguyên: mỗi lần vào Map là một Instance mới, rời đi thì huỷ. **Người chơi không thấy khác biệt.** Việc này nối kiến trúc Instance vào game thật để P4 (Map mới) và MMO sau này dùng chung đường đi.

## 2. Thứ tự vòng đời (đã xác minh trong `node_modules/phaser/src/scene/SceneManager.js:312-317`)
`scene.start(key)` và `scene.restart()` xếp hàng thao tác `stop` rồi `start`, chạy theo thứ tự: **SHUTDOWN của scene cũ luôn chạy trước init/create của scene mới**. Do đó: `leave` ở SHUTDOWN, `enter` ở `create()` không bao giờ gặp `already_assigned` nếu release đúng. Vẫn phải phòng thủ: `enter` tự giải phóng Instance đang giữ (nếu có) trước khi cấp mới.

## 3. Tham chiếu (không chép lại)
`src/world/instance.ts` (`InstanceRef`, `TravelTicket`, `createTravelTicket`, `InstanceAllocator`), `src/world/localInstanceAllocator.ts` (`createLocalInstanceAllocator({ world, now, nextInstanceNumber })`, `getInstance`, `holdingOf`, `listInstances`; **không sửa**), `src/world/travel.ts` (`resolveSceneArrival`, `getConnectionTravelInfo`; không sửa), `src/progression/RunSession.ts` (`RunSession = { carry, clock }`, `isRunSession`; **không sửa**). Trong `src/scenes/WorldScene.ts` (Grep `incomingRun|isRunSession|captureRunSession|startPortalTravel|arrivalConnectionId|Events.SHUTDOWN|init\(`; đọc theo offset/limit, không đọc cả file): `init` (~610–619), `create` (~662–690), khối SHUTDOWN (~729–741), `startPortalTravel` (~3650–3690, nơi `captureRunSession` và `scene.start(targetKey, {...})`). `BossArenaScene.ts` dự kiến KHÔNG cần đổi.

## 4. Phạm vi
File ĐƯỢC SỬA: `src/scenes/WorldScene.ts`, `src/world/instance.ts` (CHỈ thêm `isTravelTicket`), `src/world/instance.test.ts` (thêm test cho `isTravelTicket`).
File ĐƯỢC TẠO: `src/systems/gameInstances.ts`, `src/systems/gameInstances.test.ts`.
KHÔNG đụng: `src/world/localInstanceAllocator.ts`, `src/world/travel.ts`, `src/world/worldGraph.ts`, `src/progression/**` (kể cả `RunSession.ts`, `difficultyClock.ts`), `src/scenes/BossArenaScene.ts` (nếu cần đổi thì DỪNG và báo Lead), `src/config/**`, `src/entities/**`, `src/ui/**`, `.claude/`, `CLAUDE.md`, `docs/`, `package*.json`, `tsconfig*.json`, `vite.config.*`. Không commit/push. Cần file ngoài danh sách thì DỪNG và báo Lead. Không đổi số liệu, văn bản hiển thị, `DifficultyClock`, điểm xuất hiện, fade, thời gian sạc.

## 5. Thiết kế
**5.1 `src/systems/gameInstances.ts`** (không `import 'phaser'` ở phần logic; nhận nguồn đồng hồ cấu trúc `{ loop: { time: number } }` để test được; không `Math.random`/`Date.now`/`performance.now`):
```ts
export interface GameClockSource { readonly loop: { readonly time: number } }
export interface GameInstances {
  /** Cấp Instance mới cho `who` ở `mapId`; nếu `who` đang giữ Instance thì giải phóng trước. Map không tồn tại → ném Error. */
  enter(mapId: MapId, who: CharacterUid): InstanceRef;
  /** Chuyển đi: giải phóng Instance đang giữ và cấp Instance mới ở `mapId`. */
  moveTo(mapId: MapId, who: CharacterUid): { from: InstanceRef | null; to: InstanceRef };
  /** Dùng Instance đã cấp sẵn từ vé nếu `who` đang giữ đúng nó và đúng `mapId`; ngược lại như `enter`. */
  resolve(mapId: MapId, who: CharacterUid, ticketTo: InstanceRef | null): InstanceRef;
  /** Giải phóng `ref` của `who`; bỏ qua lỗi unknown_instance/not_occupant (idempotent). */
  leave(ref: InstanceRef, who: CharacterUid): void;
  holdingOf(who: CharacterUid): InstanceRef | null;
  listInstances(mapId?: MapId): readonly InstanceRef[];
}
export function getGameInstances(game: GameClockSource): GameInstances   // WeakMap theo game: một allocator mỗi game; now = () => game.loop.time; nextInstanceNumber = bộ đếm bắt đầu 1 trong closure
```
Dữ liệu `world` = `WORLD` từ `config/worldConfig.ts`.
**5.2 `src/world/instance.ts`:** thêm `isTravelTicket(value: unknown): value is TravelTicket` — kiểm cấu trúc: `characterUid` chuỗi không rỗng; `from` null hoặc `InstanceRef` hợp lệ (`instanceId` bắt đầu `inst.`, `mapId` bắt đầu `map.`); `to.instance` `InstanceRef` hợp lệ; `to.spawnPoint` `{x,y}` số hữu hạn; `carry` hợp lệ theo cùng điều kiện của `CharacterCarry` (vitals null hoặc 3 số hữu hạn, `skillCooldownUntil` object số hữu hạn, `dashChargeReadyAt` mảng số hữu hạn, `dashReadyAt` số hữu hạn). Từ chối `null`/mảng/chuỗi/trường thiếu/`NaN`/`Infinity`.
**5.3 `WorldScene`:**
- Trường: `private instanceRef: InstanceRef | null`, `private incomingTicket: TravelTicket | null`.
- `init(data?: { characterId?; arrivalConnectionId?; ticket?: unknown; clock?: unknown })`: đặt MỖI lần `incomingTicket = isTravelTicket(data?.ticket) ? data.ticket : null`, và `incomingRun` = `{ carry: ticket.carry, clock }` khi cả `ticket` và `clock` hợp lệ và `isRunSession` của đối tượng ghép đó đúng, ngược lại `null` (không có ticket thì không có run). Bỏ `run` khỏi dữ liệu `scene.start`.
- `create()`: sau khi biết `restored`: `this.instanceRef = getGameInstances(this.game).resolve(this.getMapId(), this.characterId, this.incomingTicket?.to.instance ?? null)`. Trong khối `once(SHUTDOWN)` hiện có thêm `getGameInstances(this.game).leave(this.instanceRef, this.characterId)` (nếu có) và đặt `this.instanceRef = null`.
- `startPortalTravel`: giữ `captureRunSession(...)` ở ĐÚNG thời điểm cũ; rồi `const move = getGameInstances(this.game).moveTo(targetMap.id, this.characterId)`; `ticket = createTravelTicket({ characterUid: this.characterId, from: move.from, to: { instance: move.to, spawnPoint: <điểm do resolveSceneArrival(WORLD, targetMap.id, connection.id) trả> }, carry: run.carry })`; `scene.start(targetKey, { characterId, arrivalConnectionId, ticket, clock: run.clock })` trong callback `FADE_OUT_COMPLETE`. Điểm đặt người chơi ở scene đích vẫn do `resolveSceneArrival` như hiện nay (ticket.spawnPoint là cùng giá trị, chỉ để ghi nhận).
- `restartRun()` và `BossArenaScene.restartRun` giữ truyền `{ characterId }` (không ticket, không clock) → lượt mới, `enter` mới.
- Nếu `moveTo` ném lỗi (không xảy ra với dữ liệu hiện có) thì để lỗi nổi lên (không nuốt).

## 6. Tiêu chí nghiệm thu
**A (máy):**
- A1 `npm run build`, `npx tsc --noEmit`, `npm test` qua; test ≥ 706 và tăng.
- A2 Phạm vi git (WORKFLOW §6a): HEAD == baseline; chỉ 3 file sửa + 2 file tạo; không rename/xoá; diff rỗng cho mọi file cấm (đặc biệt `localInstanceAllocator.ts`, `travel.ts`, `RunSession.ts`, `BossArenaScene.ts`, `config/**`).
- A3 Grep `WorldScene.ts`: không còn `run:` trong dữ liệu `scene.start` (chỉ `ticket` và `clock`); có `getGameInstances`, `createTravelTicket`, `isTravelTicket`; `startPortalTravel` gọi `moveTo`; khối SHUTDOWN gọi `leave`.
- A4 `gameInstances.test.ts` (dùng nguồn đồng hồ giả, KHÔNG phaser) có expect thật: `getGameInstances` trả cùng đối tượng cho cùng `game`, khác cho `game` khác; `enter` cấp `inst.1` rồi `enter` lần hai (khi chưa leave) giải phóng cái cũ và cấp `inst.2` (`listInstances()` luôn ≤ 1 cho một người); `moveTo` trả `from` đúng và `to` mới, đếm Instance không tăng; `resolve` với vé khớp trả đúng ref đã cấp (không cấp mới), vé lệch Map hoặc lệch Instance thì cấp mới; `leave` idempotent và không ném lỗi với ref lạ; Map không tồn tại → ném; chuỗi `enter → moveTo → leave` kết thúc với `listInstances()` rỗng; `createdAtMs` lấy từ nguồn đồng hồ giả.
- A5 `instance.test.ts`: `isTravelTicket` chấp nhận vé do `createTravelTicket` tạo (kể cả `from: null`, `vitals: null`, mảng/cooldown rỗng) và từ chối ≥ 8 dạng hỏng (null, mảng, chuỗi, thiếu `carry`, thiếu `to.instance`, `instanceId` sai tiền tố, `spawnPoint` NaN, `carry.dashReadyAt` không số); các test cũ không đổi, số test không giảm; có khoá nguồn: đọc text `WorldScene.ts` khẳng định `scene.start(` truyền `ticket` và không còn `run,`/`run:`.
**Q (QA đọc độc lập, nêu `file:dòng`):**
- Q1 **Vòng đời**: mọi đường vào/ra scene kết thúc với đúng 0–1 Instance được giữ: menu → game (`enter`), qua cổng (`moveTo` rồi `resolve` ở scene đích), chết ở map chính (`restart` → SHUTDOWN `leave` → `create` `enter`), chết ở Arena (`scene.start` → SHUTDOWN → `enter`), vào/ra lặp lại; không có `already_assigned` ném ra; không rò Instance (đếm không tăng sau nhiều lần qua cổng). Tự đọc `SceneManager.processQueue` (:312–317) để xác nhận thứ tự stop → start.
- Q2 **Vé**: tạo ở `startPortalTravel` đúng chỗ; `ticket.carry` bằng `run.carry`; `from` = Instance nguồn, `to.instance` = Instance đã `moveTo`; sao chép sâu; không chứa đồng hồ độ khó (đồng hồ đi qua `clock` riêng, Q1(a)); `init` từ chối vé/đồng hồ hỏng nên rơi về lượt mới, không sập.
- Q3 **Hành vi giữ nguyên**: HP/giáp/năng lượng/hồi chiêu/dash/đồng hồ Boss giữ qua cổng; điểm xuất hiện, màu fade (`arrival.fadeColor`), thời gian sạc, `portalCooldownUntil`; lượt mới khi chết/menu (không `ticket`/`clock` nên `incomingRun = null`); bẫy `scene.restart()` giữ data cũ (P3b) vẫn được xử lý (`restartRun` truyền data tường minh).
- Q4 Trạng thái Instance không đi theo người chơi: `instanceRef` đặt lại về `null` ở SHUTDOWN và gán mới ở mỗi `create`; allocator là singleton theo game chỉ giữ ref/occupants, không giữ đối tượng Phaser; không có biến cấp module chia sẻ nhầm giữa hai game.
- Q5 Không thay đổi hành vi ngoài phạm vi; hunk `WorldScene.ts` chỉ thuộc các hàm ở §3; `gameInstances.ts` thuần ở phần logic.
**Hồi quy QA không bỏ:** P2 (điểm xuất hiện, fade, sạc, nhiều cổng), P3a (đồng hồ Boss, giữ qua cổng, reset khi chết), P3b (carry qua cổng, lượt mới khi chết, không registry), P3c-1 (bộ đếm Instance tạo mới mỗi create); menu → game; save không đổi.
**P (người chơi, Lead lập checklist sau QA):** vào/ra Arena nhiều lần liên tiếp (≥ 10 lần) không lỗi và không chậm dần; giữ HP/hồi chiêu/đồng hồ Boss qua cổng; chết ở map chính, chết ở Arena, chết sau khi qua cổng đều ra lượt mới; menu → game; Console sạch.

## 7. Rủi ro
Sai thứ tự giải phóng/cấp làm ném `already_assigned` hoặc rò Instance; `moveTo` ở lúc khởi hành rồi scene đích không dùng vé nên cấp thêm một Instance; sót chỗ `run` cũ trong `scene.start`; `ticket` hỏng làm mất carry (phải rơi về lượt mới có chủ đích, không sập); đồng hồ giả trong test khác thực tế (`game.loop.time`).

## 8. Báo cáo (≤ 10 dòng, mỗi mục 1 dòng)
Developer: 1 file sửa/tạo · 2 lệnh (build/tsc/test + số) · 3 A1–A5 · 4 lệch brief · 5 chưa kiểm được · 6 cần Lead.
QA: 1 lệnh + HEAD khớp · 2 phạm vi từ git · 3 A1–A5 · 4 Q1–Q5 kèm `file:dòng` · 5 hồi quy · 6 lỗi (Chặn/Không chặn: mức · tái hiện · thực tế · mong đợi · file) · 7 chưa kiểm được · 8 kết luận ĐẠT/KHÔNG ĐẠT. Lỗi Chặn lên đầu.
