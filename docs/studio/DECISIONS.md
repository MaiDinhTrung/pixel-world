# DECISIONS — Nhật ký quyết định thiết kế

Chỉ AI Lead ghi file này, sau khi người dùng duyệt ở Cổng 1 (xem `WORKFLOW.md`). Mới nhất ở trên cùng. Việc nhỏ không cần ghi. Số liệu cân bằng nằm ở `src/config/`, ở đây chỉ trỏ tới.

Mẫu mục:

```
### YYYY-MM-DD — Tên quyết định
- **Quyết định:** …
- **Lý do:** …
- **Phương án bị loại:** … (vì …)
- **Ảnh hưởng:** file/hệ thống; số liệu ở `src/config/…`
- **Trạng thái:** Đã duyệt | Đã triển khai | Thay thế bởi …
- **Tài liệu liên quan:** (nếu có)
```

---

### 2026-11-15 — Kiến trúc dữ liệu người chơi: Repository → Item Instance/UID/Revision → PlayerState
- **Quyết định (người dùng chốt):** Định hướng **Single-player trước, Multiplayer sau**; chuẩn bị tối thiểu theo thứ tự **Gói A** (ProgressRepository + ProgressStore, không đổi định dạng save) → **Gói B** (Item Instance + `characterUid` + `revision`, migration SAVE_VERSION 7→8; chia B1 thêm module/test, B2 bật lên) → **Gói C** (PlayerState thuần, 5 bước). Năm lựa chọn: (1) gear trùng loại chỉ nâng level, không tạo món riêng; (2) nạp save sớm ở `PreloadScene`; (3) giữ sao lưu save v7 vĩnh viễn, không tự xóa/ghi đè; (4) khóa save vẫn là `CharacterId`; (5) `revision` xung đột → từ chối ghi và thông báo, không ghi đè.
- **Lead đã tự xác minh bằng đọc code** (không chỉ báo cáo Designer): `PreloadScene.create` đồng bộ → nạp trước khi `scene.start(menu)`; `WorldScene.create` đồng bộ nên cần cache; kho đồ vốn là tập hợp không trùng (normalizer loại trùng, mọi đường thêm đồ kiểm `includes`) nên uid 1:1 với `defId` trong một nhân vật.
- **Lý do:** tách I/O khỏi scene, chuẩn bị server-authoritative với chi phí nhỏ nhất; làm ID/revision sớm vì càng muộn càng tốn.
- **Phương án bị loại:** tái cấu trúc toàn dự án một lượt; mỗi lần nhặt là một instance riêng (đổi thiết kế túi đồ và cân bằng); wrapper `@deprecated` cho hàm save cũ (import vòng với store; chỉ 3 nơi gọi); debounce ghi (mất hợp đồng "ghi đồng bộ khi gọi", rủi ro mất dữ liệu khi đóng tab); `registry` làm nơi giữ store (thêm tầng gián tiếp, không cần).
- **Ảnh hưởng:** Gói A: `src/progression/{CharacterProgress,ProgressRepository,LocalStorageRepository,ProgressStore}.ts` (+ 2 test), `src/config/progressConfig.ts`, `WorldScene.ts`, `CharacterSelectScene.ts`, `PreloadScene.ts`, `docs/PROJECT_MAP.md`. Gói B/C: danh sách chốt khi lập brief. Giới hạn đã biết của A: hai tab cùng một nhân vật vẫn "ghi sau thắng" cho tới khi có `revision` ở B.
- **Trạng thái:** Đã chốt 5 lựa chọn; **Cổng 1 Gói A: đã duyệt (2026-11-15)**, kèm đồng ý commit riêng 3 file docs để cây tracked sạch trước baseline. **Gói A: đã triển khai, QA Đạt (build, tsc, 129/129 test, phạm vi sạch), người dùng đồng ý chốt (Cổng 2, 2026-11-15)**; người dùng không gửi báo cáo Đạt/Chưa đạt từng mục chơi thử nên các mục "phải chơi thật" (AC 7–10) chưa được xác nhận riêng. Đã biết, chưa sửa (không chặn): (1) `persistent` không về `true` sau khi ghi thành công; (2) listener `onError` ném lỗi làm kẹt hàng đợi (chưa có listener nào); (3) test thiếu 4 ca và một assertion luôn đúng; (5) `PROJECT_MAP.md` chưa liệt kê 2 file test mới. Giới hạn: hai tab cùng một nhân vật vẫn "ghi sau thắng" cho tới Gói B. Gói B, C: chờ Cổng 1 riêng.
- **Tài liệu liên quan:** `docs/DATA_ARCHITECTURE.md` (Feature Specification đầy đủ, ánh xạ trường, migration, Acceptance Criteria)

### 2026-11-15 — Định hướng thiết kế tổng thể (Design Pillars)
- **Quyết định (người dùng chỉ đạo):** Visual lấy cảm hứng Soul Knight (silhouette rõ, animation sinh động); World & Gameplay kiểu MMORPG 2D lấy cảm hứng Ngọc Rồng Online; Combat & Skills kiểu Action RPG lấy cảm hứng Diablo; Identity giữ Grim Dark Fantasy, IP/hình ảnh/kỹ năng nguyên bản, không sao chép tài sản game tham khảo.
- **Lý do:** có một nguồn định hướng chung cho Designer và Developer.
- **Phương án bị loại:** ghi vào `CLAUDE.md` (file đó chỉ chứa quy trình).
- **Ảnh hưởng:** chỉ tài liệu: `docs/DESIGN_PILLARS.md` (mới, nguồn chính), `docs/PROJECT_MAP.md`, `README.md` (dòng mô tả), `docs/assets/COLOR_PALETTE.md` (dòng trỏ). Không đổi code, cân bằng hay quyết định đã có. Grim Dark = bản sắc, Soul Knight = cách thể hiện.
- **Trạng thái:** Đã duyệt, đã ghi tài liệu.
- **Tài liệu liên quan:** `docs/DESIGN_PILLARS.md`

### 2026-11-15 — Boss Arena: bản đồ Boss riêng + cổng dịch chuyển
- **Quyết định (người dùng chốt):** (1) **Kiến trúc A:** `BossArenaScene` là scene Phaser riêng, không dùng `mapMode` trong `WorldScene`. (2) Cổng vào đặt **bên ngoài Làng Khởi Nguyên**. (3) **Khóa cổng trở về khi Boss còn sống.** (4) **Sau khi hạ Boss, người chơi được chọn ở lại Arena** để đánh quái con và cày cấp. (5) **Ánh sáng Arena cố định**, không theo chu kỳ ngày/đêm.
- **Giữ từ đề xuất (người dùng chưa phản đối, nhưng chưa xác nhận riêng):** đồng hồ boss chạy toàn cục, boss chỉ xuất hiện trong Arena (`bossReady` khi hết giờ ở map chính); cơ chế và số liệu `BOSS_*` của `BossEnemy` không đổi; chết thì về map chính, run reset như cũ; không lưu map hiện tại vào save; Arena 50×34 tile, cổng vào đỏ / cổng về xanh ngọc; số liệu mới ở `src/config/bossArenaConfig.ts`.
- **Người dùng chốt thêm (lượt sau):** (6) Dùng **nguồn trạng thái người chơi dùng chung** giữa hai scene, bảo toàn HP, EXP, cấp, trang bị và dữ liệu cần thiết; Lead đề xuất cách làm. (7) Sau khi hạ Boss kích hoạt cơ chế **quái con xuất hiện/respawn** để cày cấp; **không hồi sinh Boss ngay**. (8) Cổng vào **ngoài làng, gần cổng Bắc, trên lối đi dễ nhận biết**. Cây Git đã sạch (commit 1130482, f883bf9, 2c0bd23). Ảnh `docs/references/visual/**` chưa commit, chưa `.gitignore`, chờ đề xuất riêng.
- **Thiết kế đã duyệt (Cổng 1, 2026-11-15):** `RunSession` (registry) giữ HP/năng lượng/hồi chiêu/dash/đồng hồ boss tuyệt đối; chuyển scene bằng stop→start sau `saveProgress`; `BossArenaScene extends WorldScene` (hạ `private`→`protected` các hàm map-phụ-thuộc); boss `bossReady` chờ ở Arena; cổng vào đỏ ngoài làng sát cổng Bắc, cổng về xanh ngọc khóa khi boss sống; sau khi hạ boss Arena sinh quái con (dùng `ENEMY_*`/`THREAT_*`), boss kế sau `BOSS_RESPAWN_MS`, tới giờ dọn quái con + khóa cổng; Arena 1600×1088 ánh sáng cố định; số liệu ở `bossArenaConfig.ts`. Ảnh tham chiếu: chưa xử lý, giữ nguyên untracked.
- **Lý do:** tách Boss thành khu riêng, giữ nguyên cơ chế thời gian của Boss.
- **Phương án bị loại:** B (`mapMode` trong `WorldScene`, ít đồng bộ hơn nhưng người dùng chọn A); cổng trong làng (Gameplay khuyến nghị, vì cổng vào ngoài làng cần vùng an toàn riêng); cho rút lui giữa trận (mở exploit vào-ra); Arena theo ngày/đêm (telegraph khó đọc).
- **Ảnh hưởng (dự kiến):** `src/scenes/BossArenaScene.ts` (mới), `src/config/constants.ts` (`SCENE_KEYS`), `src/main.ts` (đăng ký scene), `src/scenes/WorldScene.ts`, `src/world/town.ts`, `src/config/bossArenaConfig.ts` (mới), `docs/PROJECT_MAP.md`.
- **Trạng thái:** Đã triển khai, đã nghiệm thu (người dùng chơi thử và xác nhận "đạt", 2026-11-15). QA đạt sau vòng 1 sửa L1/L2/L4/L6/L7. Đã biết, chưa sửa: L3 (rò texture `castleWall.ts`, chờ người dùng quyết), L5 (vùng sạch cổng về không chặn đạn/đòn quét), N1 (listener RESUME tích lũy), N2 (`lastAim` không reset).

### 2026-11-15 — Búa: đánh thường 2 kiểu (Giáng Búa / tích lực), nâng cấp `HammerWeapon`
- **Quyết định:** Nâng cấp `HammerWeapon` hiện có (không làm vũ khí mới). Giữ nút → tích 1000 ms → READY → **không tự đập**; thả mới đập (phương án B do người dùng xác nhận). Thả trước 1000 ms = đòn thường. Giơ búa bắt đầu ngay lúc nhấn (tap nhanh vẫn chạm đất ở ~250 ms như cũ). Cooldown tính từ lúc bắt đầu giáng. READY không hết hạn. Đòn thường: choáng ngắn + đẩy, không hất tung; đòn tích lực: vùng lớn, choáng dài, hất tung nhẹ ở lớp hiển thị (tối đa 8 quái, không boss). Đi chậm khi tích (hệ số riêng trong `Player`, không dùng `setMoveSpeedFactor`). Hit-stop dùng phương án thay thế (khựng búa tại điểm va chạm + rung + chớp), chưa làm hệ thống hit-stop thật. Bản nhẹ: xoay búa, dùng id VFX có sẵn, không asset mới. Chỉ báo READY ở depth VFX (≥3000) để không bị lớp tối ban đêm che. Sửa nhánh release ở `WorldScene` chỉ áp cho vũ khí có `cancelAttack` (Búa); vũ khí khác giữ hành vi cũ.
- **Suy ra từ lệnh "duyệt theo khuyến nghị" (cần đính chính nếu sai):** tên hiển thị đòn thường "GIÁNG BÚA", đòn tích lực "CHẤN ĐỊA KÍCH" (đề xuất của Gameplay, không dùng "Đập Đất"); thông số mục 4 của Feature Specification dùng làm **giá trị khởi điểm**, chỉnh sau khi người dùng chơi thử; dấu hiệu choáng riêng (ngôi sao) chưa làm.
- **Lý do:** Búa hiện chỉ có đòn bấm một lần; người dùng muốn cảm giác nặng và có tích lực. Tái dùng khuôn tích lực Excalibur, `applyStun`, `launchSprite`, VFX có sẵn.
- **Phương án bị loại:** hệ thống hit-stop thật (hạ tầng mới, rủi ro cao); sát thương nội suy theo thời gian giữ (trái yêu cầu READY nhị phân); READY tự hủy sau N giây; dùng `setMoveSpeedFactor` (bị `applyDualGuardState` ghi đè về 1); sửa lỗi bắn-trong-làng của Excalibur/Cung/Liềm (ngoài phạm vi); gom hệ số tốc chạy Song Thủ/Tàng hình (ngoài phạm vi).
- **Ảnh hưởng:** `src/combat/HammerWeapon.ts`, `src/combat/hammerCharge.ts` (mới, logic thuần + test), `src/combat/Weapon.ts`, `src/config/combatConfig.ts` (HAMMER_*), `src/config/vfxConfig.ts`, `src/scenes/WorldScene.ts` (nhánh release), `src/entities/Player.ts`, `src/config/weaponInfo.ts`, `docs/PROJECT_MAP.md`.
- **Thay đổi phá vỡ hành vi cũ:** sát thương 6 → 8, bán kính 36 → 44, đòn thường có choáng 450 ms, `HAMMER_COOLDOWN_MS` đổi nghĩa (từ lúc bắt đầu giáng) và giá trị, tốc chạy giảm khi đánh.
- **Trạng thái:** Đã triển khai, đã nghiệm thu (người dùng xác nhận sau khi chơi thử, 2026-11-15).
- **Tài liệu liên quan:** báo cáo Visual Designer và Gameplay Designer phiên 2026-11-15; Feature Specification trong hội thoại.

### 2026-11-15 — Thiết kế Làng Khởi Nguyên (tiến hóa bản hiện có)
- **Quyết định:** Tiến hóa làng hiện có (giữ tường, 4 cổng, trục chữ thập), không làm mới. Phạm vi lần này: **Giai đoạn 1** (hình ảnh bằng cấu hình: tint công trình, nguồn sáng lò rèn/quán/nhà thờ, đổi viền khu an toàn khỏi xanh neon) rồi **Giai đoạn 2** (Trưởng làng hội thoại tĩnh không đổi save, dân làng trang trí, dời NPC về trước tòa nhà đúng chức năng). Làm tuần tự vì cùng đụng `world/town.ts`; sau mỗi giai đoạn người dùng xem game rồi mới sang giai đoạn kế.
- **Suy ra từ lệnh "phê duyệt" (người dùng không nêu từng mục; cần đính chính nếu sai):** công trình ngoài tường (lò rèn, nhà thờ, chuồng ngựa, cối xay) giữ như "làng mở rộng", không nới `VILLAGE_ZONE`; viền neon **đổi** sang màu đồng trầm (không bỏ); hàng rào gãy và xe đẩy **giữ ẩn** như hiện tại; `dayLightScale` giữ nguyên 0.1; Trưởng làng không lưu cờ "đã gặp" (không đổi save); hệ nhiệm vụ, kho đồ, Giáo sĩ, khu luyện tập, asset mới (Giai đoạn 3) **chưa làm**.
- **Lý do:** làng đã có sẵn bản dựng; tái dùng tối đa, rủi ro thấp, không đổi gameplay ở Giai đoạn 1.
- **Phương án bị loại (lúc này):** nới `VILLAGE_ZONE` hoặc thêm cổng cho công trình ngoài tường (đổi spawn quái và logic an toàn); tăng ánh sáng ban ngày (giá trị đã duyệt); hệ nhiệm vụ (save v8, đụng `WorldScene.ts`); khu luyện tập (chi phí cao hơn giá trị).
- **Ảnh hưởng:** `src/config/atmosphereConfig.ts`, `src/world/town.ts` (GĐ1); `economyConfig.ts`, `Npc.ts`, `VillageShopScene.ts`, `villageConfig.ts` mới (GĐ2). Số liệu mới đặt ở `src/config/`.
- **Trạng thái:** Đã duyệt (Cổng 1); Giai đoạn 1 và 2 đã triển khai (2026-11-15). Giai đoạn 1: người dùng đã xem game và xác nhận ổn. Giai đoạn 2: QA Đạt có điều kiện (85/85 test, phạm vi sạch); người dùng đồng ý commit, **chưa ghi nhận xác nhận bằng chơi thật** (cần xem hội thoại, vị trí NPC; dân làng cạnh sạp chợ chỉ cách ~16 px). Chưa làm: nhiệm vụ, kho đồ, Giáo sĩ, khu luyện tập, asset mới.
- **Tài liệu liên quan:** báo cáo Visual Designer và Gameplay Designer trong phiên 2026-11-15; `docs/assets/COLOR_PALETTE.md`

### 2026-11-15 — Cưỡng chế quyền Agent ở tầng harness + baseline Git cho QA
- **Quyết định:** (1) `.claude/settings.json` là policy dùng chung, được commit: `git clean` bị deny, đọc `~/.claude/.credentials.json` bị deny, các lệnh git ghi (`add/commit/push/reset/checkout/restore/stash/rebase/merge/branch -D`) ở mức ask, cho phép sẵn một số lệnh chỉ-đọc/build/test. (2) Hook PreToolUse `.claude/hooks/studio-guard.mjs` kiểm toàn bộ chuỗi Bash theo allowlist cho `qa-tester`, `game-developer` và mọi subagent khác; chỉ `game-developer` được Edit/Write, trừ vùng cấm; subagent thiếu `agent_type`/payload hỏng/lỗi hook → chặn (fail-closed); AI Lead không bị hook can thiệp. (3) Bỏ quyền Read rộng `~/.claude/**`, chỉ giữ `skills/synced/**` ở `settings.local.json`. (4) Cây tracked phải sạch trước khi giao Developer; nếu người dùng cho phép vẫn tiếp tục thì baseline kèm hash từng file. (5) Brief có BASELINE + ĐƯỢC SỬA + ĐƯỢC TẠO; QA nhận nguyên và tự đối chiếu `git diff`/`git status`/`git hash-object`; baseline giữ nguyên qua 2 vòng sửa. (6) Developer không tự quyết commit/push. (7) Không làm manifest `active-task` (Gói C).
- **Lý do:** audit 2026-11-15 (R1, R2) cho thấy các ràng buộc chỉ nằm trong prompt, và QA không có danh sách phạm vi để tự đối chiếu.
- **Phương án bị loại:** `disallowedTools: Bash(...)` trong frontmatter (một mục có specifier gỡ cả công cụ Bash); sandbox OS (không hỗ trợ Windows native); chỉ dựa vào luật `deny` pattern (dễ lách bằng `git -C`, `bash -c`); manifest `active-task` (thêm trạng thái phải quản lý, để sau).
- **Ảnh hưởng:** `.claude/settings.json`, `.claude/settings.local.json`, `.claude/hooks/*`, `.claude/agents/qa-tester.md`, `.claude/agents/game-developer.md`, `docs/studio/WORKFLOW.md` (§6, §6a, §8, §9), `docs/PROJECT_MAP.md` (6b).
- **Kiểm chứng bằng subagent thật (2026-11-15):** `qa-tester` và `Explore` bị chặn `echo`, cho `git rev-parse`; `game-developer` bị chặn ghi `.claude/` và `DECISIONS.md`, ghi/sửa được file thử trong danh sách, không xóa được; `qa-tester` phát hiện đúng file lạc phạm vi. Còn chưa kiểm chứng: luật `ask` với AI Lead, `onFailure: block`, các subagent chỉ-đọc khác.
- **Trạng thái:** Đã duyệt, đã triển khai.
- **Tài liệu liên quan:** `docs/studio/WORKFLOW.md` §6a, §8

### 2026-11-15 — Mô hình điều phối AI Studio
- **Quyết định:** Hub-and-spoke: AI Lead (session chính) điều phối Visual Designer, Gameplay Designer, Game Developer, QA Tester. Hai cổng duyệt của người dùng (trước khi code, trước khi chốt), trần 2 vòng sửa lỗi, chỉ Developer (và Lead) được ghi code, chỉ Lead ghi Knowledge Base.
- **Lý do:** Phù hợp quy mô một người dùng + 4 subagent; tránh xung đột file và quy trình quá nặng.
- **Phương án bị loại:** Subagent gọi nhau trực tiếp (khó kiểm soát, khó truy vết); Gameplay Designer ghi thẳng `src/config/` (tách trách nhiệm thiết kế khỏi triển khai).
- **Ảnh hưởng:** `CLAUDE.md`, `.claude/agents/*`, `docs/studio/*`.
- **Trạng thái:** Đã duyệt, đã triển khai.
- **Tài liệu liên quan:** `docs/studio/WORKFLOW.md`
