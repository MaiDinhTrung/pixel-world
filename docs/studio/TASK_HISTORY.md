# TASK HISTORY — nhiệm vụ đã đóng

Mới nhất ở trên. Mỗi nhiệm vụ 3–5 dòng; chi tiết ở Task Map (nếu có), quyết định ở `DECISIONS.md`, kết quả playtest ở `playtests/`. Không xoá mục cũ.
Mẫu: `### <ID> — <tên> · <ngày mở> → <ngày đóng> · <ACCEPTED/HUỶ>` + dòng Kết quả · Commit · Tài liệu · Tồn đọng.
Quy ước nhãn: tiêu đề ở đây ghi **kết quả** (ACCEPTED = người dùng nghiệm thu/đồng ý chốt; HUỶ = dừng không làm); Task Map tương ứng luôn có Trạng thái tổng **CLOSED**.
Quy ước commit (từ ST-02): ghi `git log --grep=<ID>` thay vì SHA, để đóng nhiệm vụ trong **cùng** commit (không để lại diff ghi SHA sau commit). Message commit luôn chứa `(<ID>)`.

Các nhiệm vụ trước khi có Task Map (ST-01) không có file `tasks/`; tóm tắt lấy từ `DECISIONS.md` và `TOKEN_LOG.md`.

### FIX-01 — `npm test` lỗi khi cwd là `d:\` (chữ thường) · 2026-11-17 → 2026-11-17 · ACCEPTED
- Kết quả: `npm test` chạy qua `scripts/run-vitest.mjs` (chuẩn hoá chữ hoa/thường ổ đĩa của cwd bằng `realpathSync.native` trước khi spawn vitest); cwd `d:\` và `D:\` đều 44/44 file, 778/778; tsc + build qua.
- Commit: `git log --grep=FIX-01` (đã push). Task Map: `tasks/FIX-01_test_drive_case.md`.
- Tồn đọng: `npx vitest run --root . <file>` chạy trực tiếp từ `d:\` vẫn có thể lỗi giả ở 2 file có `vi.mock`.

### ST-02 — Luật baseline tài liệu Lead (T2) + Chế độ tự chủ (T4) · 2026-11-17 → 2026-11-17 · ACCEPTED
- Kết quả: WORKFLOW §6a quy tắc "tài liệu Lead" (ưu tiên commit trước baseline; nếu song song thì khai mẫu `docs/**`, QA xếp loại "Lead"); WORKFLOW §14 Chế độ tự chủ (memory chỉ trỏ về đây); mẫu FEATURE_BRIEF/AGENT_REPORTS/LEAD cập nhật. Chỉ tài liệu.
- Commit: `git log --grep=ST-02` (chưa push; gồm commit chính + commit bổ sung mục lịch sử này). Task Map: `tasks/ST-02_baseline_autonomy.md`. DECISIONS "ST-02".
- Cùng lượt (ngoài ST-02): `settings.local.json` gỡ `python -` và quyền dùng một lần; `settings.json` commit 3 quyền npm (`dfa552b`).

### ST-01 — Task Map + Codebase Map + Agent Templates · 2026-11-17 → 2026-11-17 · ACCEPTED
- Kết quả: Codebase Map 3 cấp (`PROJECT_MAP.md` 73 KB → 9,7 KB + 9 file `docs/codemap/`), 6 mẫu `docs/studio/templates/`, Task Map (`CURRENT_TASK`, `tasks/`, `TASK_HISTORY`), WORKFLOW §0 + §13, CLAUDE.md, 4 file agent. Chỉ tài liệu; hook self-test 29/29.
- Commit: `613a660` (chưa push). Task Map: `tasks/ST-01_studio_maps.md`. DECISIONS "ST-01". Bản cũ giữ: `docs/archive/PROJECT_MAP_legacy.md`.
- Tồn đọng: `.claude/settings.json` chờ quyết; T2, T4 của `AI_STUDIO_PROCESS_MAP.md` §9.4 chưa xử lý.

### P4b — Region Rừng Úa + Map Rừng Sâu · 2026-11-17 → 2026-11-17 · ACCEPTED
- Kết quả: Region thứ hai, Map overworld 2 vùng (bậc 1/3), cổng hai chiều, lời nhắc cổng theo dữ liệu. QA Đạt 778/778; người dùng nghiệm thu chung.
- Commit: `31f5264` (chưa push). Tài liệu: `lean-handoff/P4B_FEATURE_BRIEF.md`, `playtests/P4b_withered_woods.md`, DECISIONS "P4".
- Tồn đọng (không chặn): NB1 vignette mất khi `?atmo=off`; NB2 ambient Rừng không theo `?atmo=off`.

### P4a — Một scene map chung · 2026-11-17 · ACCEPTED
- Commit `e3ca803` (gồm sửa kiếm theo vùng an toàn của Map). Playtest `playtests/P4a_single_map_scene.md`.

### P3 (P3a–P3d) — Instance cục bộ, RunSession, dọn nợ · 2026-11-17 · ACCEPTED
- Commit `4d511f1` (P3a), `56dc833` (P3b), `80b23eb` (P3c-1), `73c7b69` (P3c-2), `d0797c4` (P3d). Playtest `playtests/P3*.md`.
