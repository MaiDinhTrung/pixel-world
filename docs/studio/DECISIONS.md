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
