# FEATURE BRIEF + QA Plan — P3d: dọn nợ kỹ thuật sau P3 (sửa lỗi đã biết, không đổi gameplay)

Cấp: **L** (đụng `WorldScene.ts`). Căn cứ: người dùng giao chế độ tự chủ (2026-11-17) với ưu tiên "xử lý tồn đọng P3" và "lỗi đã biết theo mức ưu tiên". Đây là **sửa lỗi**, không có thiết kế mới: không đổi số liệu, hình ảnh, văn bản hiển thị hay luật chơi. Một file này là nguồn duy nhất cho Developer VÀ QA. Báo cáo agent **tối đa 10 dòng**, mỗi mục một dòng.

BASELINE: HEAD=73c7b69a235a3e6f5d658056073264daa33800a1 · nhánh=main · tracked sạch · untracked có sẵn: docs/references/visual/** (48), docs/perf/** (1), docs/studio/lean-handoff/** (2 bản nháp M4 + file brief này)
Test baseline: 39 file, 726 test qua; `npx tsc --noEmit` sạch.

## 1. Mục tiêu (5 lỗi, mỗi lỗi một mục độc lập)
- **D1 (L3) Rò texture tường thành:** `src/world/castleWall.ts` đặt key `castle-wall-${nextTextureId}` với bộ đếm cấp module tăng mãi, nên MỖI lần dựng làng (vào map chính, chết, về từ Arena) lại tạo texture mới và không bao giờ xoá → bộ nhớ GPU tăng dần. `drawBlock`/`drawBrickBox` là tất định (không ngẫu nhiên), nên texture chỉ phụ thuộc hình học khối.
- **D2 (N1) Listener RESUME tích luỹ:** `WorldScene.ts` (~dòng 892) `this.events.on(RESUME, () => …)` ở `create()`; `Systems.shutdown` của Phaser (`node_modules/phaser/src/scene/Systems.js:772`) KHÔNG gỡ listener của `sys.events`, scene được dùng lại → mỗi lần restart/qua cổng thêm một listener.
- **D3 (N2) `lastAim` không reset:** trường `lastAim` (~dòng 475, giá trị đầu `(1, 0)`) giữ hướng ngắm của lượt/Map trước vì scene được dùng lại.
- **D4 Nhận dạng Arena mong manh:** `pickSpawnArchetype` (~dòng 1347–1362) coi "vùng có `spawnTable.points` khác rỗng" là Arena. Nếu sau này một vùng thường thêm điểm sinh riêng, nó lặng lẽ đổi cách chọn quái. Khoá bất biến bằng kiểm tra dữ liệu, KHÔNG đổi logic chọn quái.
- **D5 Test nguồn bị yếu (ghi chú QA P3c-2):** `src/progression/RunSession.test.ts:200–207` ("startPortalTravel truyền run trong scene.start") chỉ đòi chữ `run` xuất hiện; nay mã truyền `ticket` + `clock: run.clock` nên test qua vì trùng chữ. Đổi test cho khớp hợp đồng hiện tại.

## 2. Thiết kế
- **D1:** bỏ `nextTextureId`. Key tất định theo hình học: `castle-wall-${width}x${height}-r${rise}-${horizontal ? 'h' : 'v'}-l${lean}` (số làm tròn/ghép đủ để hai khối khác hình không trùng key; nếu `width/height/rise` có thể lẻ thì dùng nguyên giá trị). Giữ `if (!scene.textures.exists(key))` — lần sau dùng lại texture có sẵn. Không đổi cách vẽ, vị trí, độ sâu, hiệu ứng trồi lên. Tách hàm thuần `castleTextureKey(block)` (export) để test được.
- **D2:** đổi sang phương thức có tên (ví dụ `private handleResume(): void { this.panelOpen = false; }`), đăng ký `this.events.on(RESUME, this.handleResume, this)` và trong khối `once(SHUTDOWN)` hiện có (~dòng 754) thêm `this.events.off(RESUME, this.handleResume, this)`. Hành vi không đổi.
- **D3:** thêm `this.lastAim.set(1, 0);` vào `resetPlayerRuntimeState()` (~dòng 573; giữ đúng giá trị khởi tạo của trường).
- **D4:** trong `src/world/worldGraph.ts` (vòng `for (const zone of map.zones)`, ~dòng 505): thêm mã lỗi mới `'zone_spawn_points_outside_boss'` vào union mã lỗi (~dòng 328) và `fail(...)` khi `zone.spawnTable.points.length > 0 && map.kind !== 'boss'`. Sửa chú thích `pickSpawnArchetype` trong `WorldScene.ts` để trỏ tới bất biến này (chỉ chú thích, không đổi mã). `WORLD` hiện có phải vẫn hợp lệ.
- **D5:** sửa test ở `RunSession.test.ts:200–207` thành: đoạn `startPortalTravel` có `scene.start(` truyền `ticket` và `clock`, và KHÔNG có `run,` hay `run:` trong đối tượng truyền (đổi tên test cho đúng). Không xoá test khác.

## 3. Phạm vi
File ĐƯỢC SỬA: `src/world/castleWall.ts`, `src/scenes/WorldScene.ts`, `src/world/worldGraph.ts`, `src/world/worldGraph.test.ts`, `src/progression/RunSession.test.ts`.
File ĐƯỢC TẠO: `src/world/castleWall.test.ts`.
KHÔNG đụng: `src/config/**`, `src/progression/RunSession.ts`, `src/world/localInstanceAllocator.ts`, `src/world/travel.ts`, `src/world/instance.ts`, `src/scenes/BossArenaScene.ts`, `src/vfx/**`, `src/entities/**`, `src/ui/**`, `.claude/`, `CLAUDE.md`, `docs/`, `package*.json`, `tsconfig*.json`, `vite.config.*`. Không commit/push. Cần file ngoài danh sách thì DỪNG và báo Lead. Trong `WorldScene.ts` chỉ được đổi: đăng ký RESUME + khối SHUTDOWN (D2), `resetPlayerRuntimeState` (D3), chú thích `pickSpawnArchetype` (D4).

## 4. Tiêu chí nghiệm thu
**A (máy):**
- A1 `npm run build`, `npx tsc --noEmit`, `npm test` qua; test > 726.
- A2 Phạm vi git (WORKFLOW §6a): HEAD == baseline; chỉ 5 file sửa + 1 file tạo; diff rỗng cho file cấm.
- A3 `castleWall.test.ts` (không cần Phaser thật; nếu import `castleWall.ts` kéo Phaser và không chạy được trong vitest thì đặt `castleTextureKey` ở chỗ test được trong cùng file và mô phỏng, hoặc DỪNG báo Lead): cùng hình học → cùng key; khác bất kỳ một trong width/height/rise/horizontal/lean → khác key; key không phụ thuộc `x`/`y`; gọi nhiều lần không tăng số key khác nhau. Grep `castleWall.ts` không còn `nextTextureId`.
- A4 `worldGraph.test.ts`: `WORLD` hợp lệ; thêm ca hỏng vào bảng mã lỗi: vùng ở map `overworld` có `spawnTable.points` khác rỗng → đúng mã `zone_spawn_points_outside_boss` (và chỉ mã đó cho ca này).
- A5 Khoá nguồn trong test (đọc text `WorldScene.ts`): `RESUME` được `on` với `this.handleResume`/tương đương và `off` trong SHUTDOWN; `resetPlayerRuntimeState` chứa `lastAim.set(1, 0)`. D5: test mới đòi `ticket` + `clock`, cấm `run:`/`run,` trong `scene.start` của `startPortalTravel`; chạy thử bằng đầu óc: mã hiện tại qua.
**Q (QA đọc độc lập, nêu `file:dòng`):**
- Q1 D1: key tất định, không va chạm giữa các khối khác hình trong `buildBlocks()` hiện có (QA tự liệt kê kích thước khối); hình ảnh tường không đổi (cùng `drawBlock`); `textures.exists` vẫn bảo vệ tạo trùng.
- Q2 D2: số listener RESUME không tăng qua restart (on/off cùng hàm + context); `panelOpen` vẫn về `false` khi đóng bảng nhân vật.
- Q3 D3: `lastAim` về `(1,0)` mỗi `create()`; không ảnh hưởng hướng ngắm trong lượt (vẫn cập nhật ở `update`).
- Q4 D4: logic chọn quái không đổi (diff chỉ chú thích); kiểm tra dữ liệu mới không làm `WORLD` lỗi.
- Q5 Không thay đổi hành vi ngoài 5 mục.
**Hồi quy QA không bỏ:** P2 (qua cổng, điểm xuất hiện), P3a–P3c-2 (đồng hồ Boss, carry, Instance), mở/đóng bảng nhân vật (Tab/C/I) rồi điều khiển lại được, menu → game, save không đổi.
**P (người chơi, Lead lập checklist sau QA):** tường làng vẫn trồi lên đẹp như cũ sau khi vào/ra Arena và sau khi chết; mở/đóng bảng nhân vật nhiều lần vẫn chơi bình thường; kỹ năng ngắm theo hướng (nếu có) sau khi chết/qua cổng hướng mặc định hợp lý.

## 5. Rủi ro
Key D1 trùng giữa hai khối khác hình → tường vẽ sai; `castleWall.ts` import Phaser làm test khó chạy; quên `off` đúng context làm D2 không có tác dụng; mã lỗi mới D4 làm hỏng bảng test mã lỗi cũ.

## 6. Báo cáo (≤ 10 dòng, mỗi mục 1 dòng)
Developer: 1 file sửa/tạo · 2 lệnh (build/tsc/test + số) · 3 A1–A5 · 4 lệch brief · 5 chưa kiểm được · 6 cần Lead.
QA: 1 lệnh + HEAD khớp · 2 phạm vi từ git · 3 A1–A5 · 4 Q1–Q5 kèm `file:dòng` · 5 hồi quy · 6 lỗi (Chặn/Không chặn: mức · tái hiện · thực tế · mong đợi · file) · 7 chưa kiểm được · 8 kết luận ĐẠT/KHÔNG ĐẠT. Lỗi Chặn lên đầu.
