# ST-01 — Task Map + Codebase Map + Agent Templates

| Mục | Giá trị |
|---|---|
| Cấp | L (đụng `.claude/agents/`, `CLAUDE.md`, WORKFLOW; chỉ tài liệu) |
| Trạng thái tổng | CLOSED |
| Tiến độ | 9/9 bước |
| Mở | 2026-11-17 · Đóng: 2026-11-17 |
| BASELINE | Lead tự làm (không giao subagent). HEAD lúc bắt đầu `31f5264` |

## Mục tiêu
Nâng AI Studio thành hệ quản lý phát triển 3 phần: Task Map, Codebase Map 3 cấp, bộ mẫu chuẩn cho từng Agent; tích hợp vào WORKFLOW theo nguyên tắc Index First, Read on Demand.

## Phạm vi
- ĐƯỢC SỬA: `docs/PROJECT_MAP.md`, `docs/studio/WORKFLOW.md`, `docs/studio/AI_STUDIO_PROCESS_MAP.md`, `docs/studio/DECISIONS.md`, `docs/studio/lean-handoff/{QA_PLAN_TEMPLATE,REPORT_TEMPLATE}.md`, `.claude/agents/*.md` (chỉ bước đọc + định dạng báo cáo), `CLAUDE.md`, memory `playtest-handover-workflow`
- ĐƯỢC TẠO: `docs/codemap/*.md` (9), `docs/studio/templates/*.md` (6), `docs/studio/{CURRENT_TASK,TASK_HISTORY}.md`, `docs/studio/tasks/*.md`, `docs/archive/PROJECT_MAP_legacy.md`
- KHÔNG đụng: `src/**`, `.claude/settings*.json`, `.claude/hooks/**`, `package*.json`
- Hệ thống (codemap): tất cả (tạo mới)

## Điều kiện hoàn thành
- [ ] 9 file codemap, mỗi mục có vai trò · file · thành phần · phụ thuộc · ghi chú khi đổi; chỉ thành phần tồn tại thật
- [ ] PROJECT_MAP ≤ ~8 KB, giữ bảng "Tìm file…"
- [ ] 6 mẫu + ma trận agent; mẫu cũ trỏ sang mới, không gãy tham chiếu
- [ ] WORKFLOW §0 + §13; CLAUDE.md; 4 file agent trỏ mẫu
- [ ] Người dùng xem và chấp nhận; Cổng 2 commit

## Các bước
| # | Bước | Agent | Trạng thái | Đầu ra | Ghi chú |
|---|---|---|---|---|---|
| 1 | G0 Audit + thiết kế G1–G4 | Lead | DONE | báo cáo trong hội thoại | |
| 2 | Cổng 1 | người dùng | DONE | DECISIONS "ST-01" | "duyệt khuyến nghị làm liền từ g1 - g 4" |
| 3 | G3 Task Map (mẫu, CURRENT_TASK, TASK_HISTORY, Task Map này) | Lead | DONE | `docs/studio/{CURRENT_TASK,TASK_HISTORY}.md`, `templates/TASK_MAP.md` | |
| 4 | G2 Agent Templates (6 mẫu, stub mẫu cũ) | Lead | DONE | `docs/studio/templates/` (README, TASK_MAP, LEAD, FEATURE_BRIEF, AGENT_REPORTS, PLAYTEST) | mẫu cũ thành dòng trỏ |
| 5 | G1 Codebase Map (9 file + PROJECT_MAP chỉ mục) | Lead | DONE | `docs/codemap/` (9), `docs/PROJECT_MAP.md` 73 KB → 9,7 KB, bản cũ `docs/archive/PROJECT_MAP_legacy.md` | dữ liệu: Grep export + method; sửa 5 chỗ lỗi thời của bản cũ |
| 6 | G4 Tích hợp (WORKFLOW, CLAUDE.md, agents, PROCESS_MAP, memory) | Lead | DONE | WORKFLOW §0 + §13, §6 trỏ mẫu; CLAUDE.md mục 2/6/11; 4 file agent; PROCESS_MAP; memory playtest | tools/quyền agent không đổi |
| 7 | Tự kiểm (tham chiếu gãy, kích thước, đường dẫn tồn tại) | Lead | DONE | mọi đường dẫn `docs/…md` và `src/…ts` trong map/mẫu/agent tồn tại; hook self-test 29/29 | không đụng `src/`, settings, hook |
| 8 | Người dùng xem + Cổng 2 commit | người dùng | DONE | commit ST-01 (SHA ở TASK_HISTORY) | "commit st-01, giữ bản legacy" |
| 9 | Đóng nhiệm vụ | Lead | DONE | TASK_HISTORY, CURRENT_TASK | không có playtest (chỉ tài liệu); không có số token subagent |

## File liên quan
- DECISIONS: mục "2026-11-17 — ST-01"

## Codebase Map cần cập nhật
- (nhiệm vụ này tạo Codebase Map)

## Nhật ký
- 2026-11-17 — P4b nghiệm thu + commit `31f5264` trước khi bắt đầu, nên PROJECT_MAP không trộn diff P4b.
- 2026-11-17 — Người dùng đồng ý commit; giữ `docs/archive/PROJECT_MAP_legacy.md`. `.claude/settings.json` (4 quyền allow) không thuộc ST-01, vẫn chờ quyết.
