# ST-02 — Luật baseline khi Lead sửa tài liệu song song (T2) + Chế độ tự chủ vào repo (T4)

| Mục | Giá trị |
|---|---|
| Cấp | M (chỉ tài liệu quy trình, 1 hệ thống: WORKFLOW; không đụng `.claude/`) |
| Trạng thái tổng | CLOSED |
| Tiến độ | 6/6 bước |
| Mở | 2026-11-17 · Đóng: 2026-11-17 |
| BASELINE | Lead tự làm (không giao subagent). HEAD lúc bắt đầu `dfa552b` |

## Mục tiêu
Đóng T2 và T4 của `AI_STUDIO_PROCESS_MAP.md` §9.4: hợp thức hoá (và hạn chế) việc Lead sửa tài liệu trong lúc Developer làm; đưa ranh giới "chế độ tự chủ" từ memory vào WORKFLOW để phiên/máy khác đọc được.

## Phạm vi
- ĐƯỢC SỬA: `docs/studio/WORKFLOW.md` (§6a, §14 mới), `docs/studio/AI_STUDIO_PROCESS_MAP.md` (T2/T4), `docs/studio/DECISIONS.md`, `docs/studio/CURRENT_TASK.md`, `docs/studio/TASK_HISTORY.md`, `docs/studio/templates/FEATURE_BRIEF.md` (dòng BASELINE), `docs/studio/templates/AGENT_REPORTS.md` (QA mục PHẠM VI thêm loại "Lead" — bổ sung trong lúc làm), memory `autonomous-work-protocol`
- ĐƯỢC TẠO: file Task Map này
- KHÔNG đụng: `src/**`, `.claude/**`, `CLAUDE.md`

## Điều kiện hoàn thành
- [ ] §6a có quy tắc "tài liệu Lead": ưu tiên commit trước baseline; nếu song song thì khai mẫu đường dẫn trong BASELINE, QA xếp loại "Lead"
- [ ] WORKFLOW §14 nêu rõ Lead tự quyết gì / cái gì vẫn qua cổng / điều cấm
- [ ] Memory trỏ về §14; T2, T4 đánh dấu đã xử lý
- [ ] Người dùng đồng ý commit (Cổng 2)

## Các bước
| # | Bước | Agent | Trạng thái | Đầu ra | Ghi chú |
|---|---|---|---|---|---|
| 1 | Phân tích T2/T4 + đề xuất hướng xử lý | Lead | DONE | báo cáo kiểm tra sau ST-01 (hội thoại) | |
| 2 | Cổng 1 | người dùng | DONE | DECISIONS "ST-02" | "làm tiếp #3 #4" sau khi xem đề xuất |
| 3 | Sửa WORKFLOW §6a + §14, mẫu FEATURE_BRIEF | Lead | DONE | §6a (quy tắc + dòng BASELINE + loại "Lead" khi QA phân loại), §14, `FEATURE_BRIEF.md`, `AGENT_REPORTS.md` | |
| 4 | Memory + PROCESS_MAP + tự kiểm | Lead | DONE | memory trỏ §14; T2/T4 + §2 + §9.6 mục 2–3 đánh dấu | |
| 5 | Cổng 2 commit | người dùng | DONE | commit "…(ST-02)" (`git log --grep=ST-02`) | "commit st02" |
| 6 | Đóng nhiệm vụ | Lead | DONE | TASK_HISTORY, CURRENT_TASK | không playtest (chỉ tài liệu) |

## File liên quan
- DECISIONS: mục "2026-11-17 — ST-02"; nguồn: `AI_STUDIO_PROCESS_MAP.md` §9.4 T2, T4; memory `autonomous-work-protocol`

## Codebase Map cần cập nhật
- (không — không đổi code)

## Nhật ký
- 2026-11-17 — #3 làm cùng lượt (không thuộc ST-02): `settings.local.json` gỡ `python -`, `export PYTHONIOENCODING`, 3 lệnh wc/awk dùng một lần (file bị git bỏ qua, không commit).
