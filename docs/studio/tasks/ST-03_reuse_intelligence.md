# ST-03 — Reuse Intelligence & Knowledge Maintenance

| Mục | Giá trị |
|---|---|
| Cấp | L (đổi WORKFLOW + `.claude/agents/` ⇒ rủi ro cao, §12.1; chỉ tài liệu, không code game) |
| Trạng thái tổng | CLOSED |
| Tiến độ | 9/9 bước |
| Mở | 2026-11-18 · Đóng: 2026-11-18 |
| BASELINE | Lead tự làm toàn bộ (Developer bị cấm sửa `.claude/`, nhiệm vụ chỉ tài liệu). HEAD lúc mở `7b7c23a`, tracked sạch |

Ghi chú ID: brief người dùng đặt tên "ST-02" nhưng ST-02 đã đóng (baseline + tự chủ) → dùng **ST-03**.

## Mục tiêu
Thêm bước Reuse Analysis (NEW/REUSE/EXTEND/REFACTOR/HYBRID) vào quy trình Lead, quy trình bảo trì Codebase Map rõ hơn, và làm Asset Catalog đúng/đủ để tra tái dùng. Không đổi quyền agent, hook, permissions.

## Phạm vi (dự kiến, chờ Cổng 1)
- ĐƯỢC SỬA: `docs/studio/WORKFLOW.md`, `docs/studio/AI_STUDIO_PROCESS_MAP.md`, `docs/studio/templates/{TASK_MAP,LEAD,FEATURE_BRIEF,AGENT_REPORTS,README}.md` (chỉ chỗ cần), `docs/assets/{README,ASSET_CATALOG}.md`, `docs/PROJECT_MAP.md`, `.claude/agents/{game-developer,visual-designer,gameplay-designer,qa-tester}.md` (chỉ văn bản hướng dẫn), `CLAUDE.md` (1 dòng trỏ tới)
- ĐƯỢC TẠO: không bắt buộc (ưu tiên chèn vào file có sẵn); có thể thêm `docs/studio/tasks/ST-03_*.md` (file này)
- KHÔNG đụng: `.claude/settings*.json`, hook, quyền agent, `src/`, asset thật, file untracked (`docs/perf/`, `docs/references/`)
- Hệ thống (codemap): không codemap game; `docs/PROJECT_MAP.md` §3/§6, `docs/codemap/visuals.md` (nếu catalog đổi trỏ)

## Điều kiện hoàn thành
- [x] 7 tình huống QA §4 áp dụng được (QA PASS)
- [x] Catalog trỏ file thật, không bản sao asset
- [x] Không thay quyền agent/hook; build/test vẫn qua
- [x] người dùng nghiệm thu (2026-11-18, "Nghiệm thu st03")

## Các bước
| # | Bước | Agent | Trạng thái | Đầu ra | Ghi chú |
|---|---|---|---|---|---|
| 1 | Audit hiện trạng | Lead | DONE | báo cáo đề xuất Cổng 1 | catalog đã tồn tại (54 dòng), thiếu Rừng Úa (P4b); đã có quy tắc "tái dùng trước" rải rác |
| 2 | Đề xuất Cổng 1 | Lead → người dùng | DONE | duyệt 2026-11-18 | DECISIONS "ST-03" |
| 3 | Reuse Analysis + Knowledge Maintenance | Lead | DONE | WORKFLOW §13.4–13.5, 5 mẫu | |
| 4 | Kiểm kê + sửa Asset Catalog | Lead | DONE | ASSET_CATALOG mục 1,5 + README | wood, fence, hedge thực tế có dùng; chỉ bridge chưa dùng |
| 5 | Cập nhật 4 file agent (văn bản) | Lead | DONE | 4 file + CLAUDE.md | `tools:` không đổi |
| 6 | QA dry-run (Q1–Q8) | qa-tester | DONE | PASS, không lỗi Chặn (build, 778 test, phạm vi sạch) | 2 ghi chú không chặn đã xử lý |
| 7 | Checklist nghiệm thu | Lead → người dùng | DONE | playtests/ST-03_reuse_intelligence.md | người dùng nghiệm thu chung, không kèm từng mục |
| 8 | Cổng 2 commit | Lead → người dùng | DONE | `git log --grep=ST-03` | chờ đồng ý commit; không push |
| 9 | Đóng nhiệm vụ | Lead | DONE | TASK_HISTORY, CURRENT_TASK, TOKEN_LOG | |

## Codebase Map cần cập nhật
- [x] `docs/PROJECT_MAP.md` — thêm hàng "Tìm cái đã có" vào bảng §3
- [x] `docs/codemap/*` — KHÔNG đổi: không có thay đổi cấu trúc code, đường dẫn tham chiếu không đổi (đã đối chiếu git diff: không A/D/R, không đụng src)

## Nhật ký
- 2026-11-18 — mở nhiệm vụ; audit xong; chờ Cổng 1
- 2026-11-18 — Cổng 1 duyệt; Lead viết xong tài liệu; tsc sạch; gọi QA
- 2026-11-18 — QA PASS (Q1–Q8, 778 test); sửa 2 ghi chú nhỏ; checklist ST-03 lập, chờ người dùng nghiệm thu
- 2026-11-18 — người dùng nghiệm thu ('Nghiệm thu st03'); đóng nhiệm vụ, chờ đồng ý commit
