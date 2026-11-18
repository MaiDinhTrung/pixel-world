# MẪU — Task Map

Người dùng: **AI Lead** (chỉ Lead ghi). Tạo khi nhận nhiệm vụ (WORKFLOW §13 bước 3), lưu `docs/studio/tasks/<ID>_<slug>.md`, thêm một hàng vào `docs/studio/CURRENT_TASK.md`.
Cập nhật **ngay** khi một bước đổi trạng thái (sau mỗi lần agent trả kết quả / người dùng trả lời), không đợi cuối nhiệm vụ.
Trạng thái bước: `PENDING` · `IN PROGRESS` · `DONE` · `BLOCKED` (ghi lý do + chờ ai). Bước không cần theo cấp → xoá dòng, không để trống.
ID: theo chuỗi đang dùng (`P4c`, `M4`…); việc quy trình `ST-xx`; sửa lỗi lẻ `FIX-xx`. Không trùng ID trong `TASK_HISTORY.md`.

Chép từ dòng dưới đây:

---

# <ID> — <Tên nhiệm vụ>

| Mục | Giá trị |
|---|---|
| Cấp | S / M / L / XL (lý do 1 dòng; rủi ro cao ⇒ ≥ L, WORKFLOW §12.1) |
| Trạng thái tổng | OPEN · IN PROGRESS · READY FOR PLAYTEST · NEEDS REVISION · ACCEPTED · CLOSED |
| Tiến độ | <số DONE>/<tổng> bước |
| Mở | YYYY-MM-DD · Đóng: — |
| BASELINE | (dòng §6a nếu giao subagent; "Lead tự làm" nếu không) |

## Mục tiêu
1–3 dòng.

## Phạm vi
- ĐƯỢC SỬA:
- ĐƯỢC TẠO:
- KHÔNG đụng:
- Hệ thống (codemap): `docs/codemap/<file>.md`, …

## Reuse Analysis (WORKFLOW §13.4; bỏ ở cấp S)
Nhãn task: NEW / REUSE / EXTEND / REFACTOR / HYBRID (một hoặc nhiều).
| Thành phần | Quyết định (REUSE · MODIFY · CREATE) | Nguồn hiện có (file:dòng / key; hoặc "Đã Grep `…` tại `…`: không có") | Thay đổi cần thiết |
|---|---|---|---|
| | | | |

## Điều kiện hoàn thành
- [ ] tiêu chí / ID A·Q·P trong brief
- [ ] người dùng nghiệm thu (nếu có playtest)
- [ ] Codebase Map + catalog cập nhật (mục dưới)

## Các bước
| # | Bước | Agent | Trạng thái | Đầu ra | Ghi chú |
|---|---|---|---|---|---|
| 1 | Phạm vi + tra Codebase Map | Lead | PENDING | mục Phạm vi | |
| 2 | Khảo sát thiết kế (nếu cần) | gameplay-designer ∥ visual-designer | PENDING | báo cáo (AGENT_REPORTS) | bỏ ở S/M rõ |
| 3 | Đề xuất Cổng 1 | Lead → người dùng | PENDING | `LEAD.md` §B; mục DECISIONS | |
| 4 | Feature Brief + QA Plan + BASELINE | Lead | PENDING | `lean-handoff/<ID>_FEATURE_BRIEF.md` | |
| 5 | Triển khai + tự kiểm | game-developer | PENDING | báo cáo Developer | |
| 6 | QA độc lập | qa-tester | PENDING | báo cáo QA (PASS/BLOCKED) | S: bỏ; M: ghi lý do |
| 7 | Playtest handover | Lead → người dùng | PENDING | `playtests/<ID>_<slug>.md` | |
| 8 | Nghiệm thu | người dùng | PENDING | ACCEPTED | |
| 9 | Cập nhật Codebase Map / catalog / PROJECT_MAP | Lead | PENDING | file codemap + `Xác minh: <sha>` | |
| 10 | Cổng 2 commit | Lead → người dùng | PENDING | SHA | |
| 11 | Đóng nhiệm vụ | Lead | PENDING | TASK_HISTORY, CURRENT_TASK, TOKEN_LOG | |

## File liên quan
- Brief: · Playtest: · DECISIONS: mục "<ngày — tên>"

## Codebase Map cần cập nhật
- [ ] `docs/codemap/<file>.md` — lý do (file thêm/xoá/đổi tên/đổi trách nhiệm; thấy lệch khi đọc code)
- Trước khi đóng (WORKFLOW §13.5): đã đối chiếu `git diff --name-status` + code thật; codemap không đụng vì: <lý do> · không có nội dung "kế hoạch" trong bản đồ.

## Nhật ký
- YYYY-MM-DD — sự kiện / blocker / quyết định nhỏ (1 dòng)
