# FEATURE BRIEF + QA PLAN — P3c-1: InstanceGameplayState

Cấp: **L** (đụng `WorldScene.ts`). Cổng 1: người dùng đã duyệt kiến trúc (W-A5, W-A10, `docs/WORLD_ARCHITECTURE.md` §5.2–5.3) và lệnh "bắt đầu p3c" (2026-11-17). **Chia gói P3c (Lead tự quyết):** **P3c-1** (gói này) gom các bộ đếm gameplay của Instance vào một đối tượng tạo mới mỗi lần vào map → **P3c-2** nối `LocalInstanceAllocator` (cấp/giải phóng Instance theo vòng đời scene) và bọc `TravelTicket` đầy đủ. Mỗi gói có QA và playtest riêng; P3c-2 chỉ bắt đầu khi P3c-1 nghiệm thu. Một file này là nguồn duy nhất cho Developer VÀ QA. Báo cáo agent **tối đa 10 dòng**, mỗi mục một dòng.

BASELINE: HEAD=56dc833c0c765f665adeb6971b3aee0b717f40f0 · nhánh=main · tracked sạch · untracked có sẵn: docs/references/visual/** (48), docs/perf/** (1), docs/studio/lean-handoff/** (2 bản nháp M4 + file brief này)
Test baseline: 37 file, 700 test qua; `npx tsc --noEmit` sạch.

## 1. Mục tiêu
Trạng thái gameplay **thuộc Instance** nay là 7 trường rải trong `WorldScene` được "đặt lại từng cái" ở `create()`. Gom chúng vào `InstanceGameplayState`: **một đối tượng MỚI mỗi lần `create()`**, nên trạng thái Instance không thể "đi theo" người chơi sang Instance khác (nguyên tắc §5.3 mục 3). Đồng thời đặt tên đúng cho `resetInstanceRuntimeState()`: nội dung của nó là cờ/hồi chiêu kỹ năng của người chơi (không phải Instance). **Hành vi giữ nguyên tuyệt đối.**

## 2. Phân loại (ghi vào chú thích đầu file mới)
- **Thuộc Instance, dữ liệu thuần (chuyển vào đối tượng mới):** `spawnIndex`, `zoneSpawnCounts`, `zoneSpawnPoints`, `zoneKillCounts`, `elitesSpawned`, `lastEliteAt`, `nextSpawnAt`.
- **Thuộc Instance nhưng là đối tượng Phaser, giữ ở scene (không đổi ở gói này):** `enemies`, `bullets`, `enemyBullets`, `corpses`, `minions`, `drops`, `chests`, `boss`, `enemyCache`.
- **KHÔNG thuộc Instance (L3: runtime của người chơi, không mang theo):** cờ kỹ năng, nhiệt, mốc ICD passive... trong `resetInstanceRuntimeState()` → đổi tên thành `resetPlayerRuntimeState()` (chỉ đổi tên và chú thích; nội dung giữ nguyên).

## 3. Tham chiếu (không chép lại)
`docs/WORLD_ARCHITECTURE.md` §5.2–5.4. Điểm dùng trong `src/scenes/WorldScene.ts` (Grep `this\.(spawnIndex|zoneSpawnCounts|zoneSpawnPoints|zoneKillCounts|elitesSpawned|lastEliteAt|nextSpawnAt)`, khoảng 30 chỗ, đọc theo offset/limit; không đọc cả file): khai báo ~394–404 và ~477, `create()` ~622–627 và ~672, `pickSpawnArchetype`/`spawnEnemy` ~1345–1386, `countZoneKill` ~1474–1492, `spawnElite` ~1514–1523, `updateEnemySpawning` ~1616–1627, `spawnBoss`/`handleBossDefeated` ~1709 và ~1831, `resetInstanceRuntimeState` ~571 và ~635. `BossArenaScene.ts` không dùng các trường này.

## 4. Phạm vi
File ĐƯỢC SỬA: `src/scenes/WorldScene.ts`, `src/world/worldGraph.test.ts` (CHỈ thêm file mới vào mảng `PURE_SOURCES`).
File ĐƯỢC TẠO: `src/world/instanceState.ts`, `src/world/instanceState.test.ts`.
KHÔNG đụng: `src/scenes/BossArenaScene.ts`, `src/progression/**`, `src/world/` ngoài các file trên, `src/config/**`, `src/entities/**`, `src/systems/**`, `src/ui/**`, `.claude/`, `CLAUDE.md`, `docs/`, `package*.json`, `tsconfig*.json`, `vite.config.*`. Không commit/push. Cần file ngoài danh sách thì DỪNG và báo Lead. Không đổi logic, số liệu, văn bản hiển thị, thứ tự thực hiện.

## 5. Thiết kế
**5.1 `src/world/instanceState.ts` (thuần, không `phaser`, không `Math.random`/`Date.now`):**
```ts
export interface InstanceGameplayState {
  spawnIndex: number;                       // 0
  zoneSpawnCounts: Map<string, number>;     // rỗng
  zoneSpawnPoints: Map<string, number>;     // rỗng
  zoneKillCounts: Map<string, number>;      // rỗng
  elitesSpawned: number;                    // 0
  lastEliteAt: number | null;               // null
  nextSpawnAt: number;                      // 0 (create() gán startNow + 1000 đúng chỗ cũ)
}
export function createInstanceGameplayState(): InstanceGameplayState   // đối tượng MỚI, mọi Map mới
```
**5.2 Scene:** thay 7 trường bằng một trường `protected instanceState: InstanceGameplayState` (hoặc `private`). Ở **đầu `create()`** (chỗ hiện đặt `this.spawnIndex = 0` v.v., trước mọi chỗ dùng) gán `this.instanceState = createInstanceGameplayState()` thay cho khối reset 6 dòng; giữ chỗ gán `nextSpawnAt = startNow + 1000` ở đúng vị trí cũ. Mọi chỗ đọc/ghi cũ đổi sang `this.instanceState.…` đúng ngữ nghĩa và đúng mốc thời gian (`this.time.now` giữ nguyên). Đổi tên `resetInstanceRuntimeState` → `resetPlayerRuntimeState` (cả chỗ gọi) và sửa chú thích cho đúng ("runtime của người chơi, không phải Instance").

## 6. Tiêu chí nghiệm thu
**A (máy):**
- A1 `npm run build`, `npx tsc --noEmit`, `npm test` qua; test ≥ 700 và tăng.
- A2 Phạm vi git (WORKFLOW §6a): HEAD == baseline; chỉ 2 file sửa + 2 file tạo; không rename/xoá; diff rỗng cho mọi file cấm (đặc biệt `BossArenaScene.ts`, `progression/**`, `config/**`).
- A3 Grep `WorldScene.ts`: không còn `this.spawnIndex|this.zoneSpawnCounts|this.zoneSpawnPoints|this.zoneKillCounts|this.elitesSpawned|this.lastEliteAt|this.nextSpawnAt` và không còn khai báo các trường đó; không còn `resetInstanceRuntimeState`; có `resetPlayerRuntimeState`.
- A4 `instanceState.test.ts` có expect thật: giá trị khởi đầu đúng 7 trường; hai lần gọi trả hai đối tượng độc lập (đổi Map/số của đối tượng này không ảnh hưởng đối tượng kia, `not.toBe` từng Map); tập khoá khớp whitelist viết cứng trong test; khoá nguồn: đọc text `WorldScene.ts` khẳng định `createInstanceGameplayState()` được gọi trong `create` và không còn khai báo 7 trường cũ.
- A5 `worldGraph.test.ts`: chỉ thêm 1 phần tử vào `PURE_SOURCES`; không đổi giá trị kỳ vọng nào; số test không giảm.
**Q (QA đọc độc lập, nêu `file:dòng`):**
- Q1 Từng chỗ cũ chuyển đúng ngữ nghĩa (đối chiếu `git diff` với `git show HEAD:src/scenes/WorldScene.ts`): chọn archetype theo vùng (`zoneSpawnCounts`/`zoneSpawnPoints`), điểm sinh `spawnIndex`, đếm kill và reset sau Elite (`zoneKillCounts`), Elite (`elitesSpawned`, `lastEliteAt`), nhịp sinh (`nextSpawnAt`: `updateEnemySpawning`, sau Boss ~1709, sau hạ Boss ~1831).
- Q2 Giá trị khởi đầu y hệt trước; `nextSpawnAt = startNow + 1000` ở đúng điểm cũ; đối tượng mới được tạo trước mọi chỗ dùng trong `create()` (kể cả khi tạo map/handler/quái khởi đầu `getInitialEnemyCount`).
- Q3 Không chia sẻ trạng thái giữa các lần `create()` hoặc giữa scene (mỗi lần một đối tượng; không biến cấp module; `scene.restart()` và `scene.start` đều tạo mới).
- Q4 `resetPlayerRuntimeState`: chỉ đổi tên và chú thích, thân hàm không đổi, vẫn được gọi ở đúng chỗ cũ.
- Q5 Không thay đổi hành vi ngoài phạm vi; hunk chỉ thuộc các hàm ở §3.
**Hồi quy QA không bỏ:** nhịp sinh quái ban đầu và theo bậc; mẫu quái theo vùng gần/xa; Elite sau 25 quái mỗi vùng và đếm riêng từng vùng, reset đếm sau khi Elite sinh; quái con Arena sau Boss; lịch Boss/đồng hồ (P3a) không đổi; qua cổng/chết reset bộ đếm như cũ (scene tạo lại).
**P (người chơi, Lead lập checklist sau QA):** nhịp sinh quái, mẫu quái gần/xa, Elite sau 25 quái từng vùng, chết rồi chơi lại thì bộ đếm Elite về 0, qua Arena và về thì bộ đếm reset như trước, quái con Arena sau Boss, Console sạch.

## 7. Rủi ro
Nhầm chỗ gán `nextSpawnAt` hoặc thứ tự tạo đối tượng làm lệch nhịp sinh quái âm thầm; sót một chỗ `this.spawnIndex` (tsc sẽ bắt); chia sẻ nhầm Map.

## 8. Báo cáo (≤ 10 dòng, mỗi mục 1 dòng)
Developer: 1 file sửa/tạo · 2 lệnh (build/tsc/test + số) · 3 A1–A5 · 4 lệch brief · 5 chưa kiểm được · 6 cần Lead.
QA: 1 lệnh + HEAD khớp · 2 phạm vi từ git · 3 A1–A5 · 4 Q1–Q5 kèm `file:dòng` · 5 hồi quy · 6 lỗi (Chặn/Không chặn: mức · tái hiện · thực tế · mong đợi · file) · 7 chưa kiểm được · 8 kết luận ĐẠT/KHÔNG ĐẠT. Lỗi Chặn lên đầu.
