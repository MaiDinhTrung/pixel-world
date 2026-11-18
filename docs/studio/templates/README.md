# AGENT TEMPLATES — mẫu nào, ai dùng, khi nào

Mỗi Agent chỉ **điền** đúng mẫu của mình, không tự thiết kế lại định dạng. Mẫu là nguồn duy nhất cho định dạng; WORKFLOW chỉ trỏ tới đây. Quy trình: `docs/studio/WORKFLOW.md` §13.

| Agent | Mẫu | Khi nào | Đầu vào cần có | Đầu ra bắt buộc | Ai nhận |
|---|---|---|---|---|---|
| **AI Lead** | `TASK_MAP.md` | Nhận nhiệm vụ mới (mọi cấp, kể cả S) | Yêu cầu người dùng, `CURRENT_TASK.md`, `PROJECT_MAP.md` (L1) | `tasks/<ID>_<slug>.md` + hàng trong `CURRENT_TASK.md`; cập nhật trạng thái mỗi bước | Lead (phiên sau), người dùng |
| AI Lead | `LEAD.md` §A | Cần Designer | Task Map, codemap hệ thống liên quan | Brief khảo sát | gameplay-designer / visual-designer |
| AI Lead | `LEAD.md` §B | Trước khi code thiết kế mới (Cổng 1) | Báo cáo Designer, codemap | Đề xuất + khuyến nghị + câu hỏi; mục DECISIONS sau khi duyệt | Người dùng |
| AI Lead | `FEATURE_BRIEF.md` | Sau Cổng 1, trước Developer | Thiết kế đã duyệt, BASELINE (§6a), codemap | `lean-handoff/<ID>_FEATURE_BRIEF.md` | game-developer + qa-tester (cùng file) |
| AI Lead | `PLAYTEST.md` | QA PASS và thay đổi chơi được | Tiêu chí P, "chưa kiểm được" của QA | `playtests/<ID>_<slug>.md` | Người dùng |
| AI Lead | `LEAD.md` §C, §D | Sau nghiệm thu; đóng nhiệm vụ | Kết quả QA + playtest | Xin commit; TASK_HISTORY, CURRENT_TASK, TOKEN_LOG, báo cáo 5 dòng | Người dùng |
| **Gameplay Designer** | `AGENT_REPORTS.md` → Gameplay | Lead gửi brief khảo sát (cơ chế, skill, cân bằng, tiến trình) | Brief §A, codemap, `src/config/` | Báo cáo ≤ 10 dòng: hiện trạng, đề xuất, số liệu, tiêu chí A/Q/P | Lead |
| **Visual Designer** | `AGENT_REPORTS.md` → Visual | Lead gửi brief khảo sát (hình, anim, VFX, asset) | Brief §A, `docs/assets/ASSET_CATALOG.md` + quy chuẩn asset | Báo cáo ≤ 10 dòng: tái dùng trước, asset mới (nếu có), tiêu chí P | Lead |
| **Developer** | `AGENT_REPORTS.md` → Developer | Có Feature Brief đã duyệt đủ 5 điều kiện | Feature Brief | Code trong 2 danh sách + báo cáo ≤ 10 dòng (gồm CẤU TRÚC ĐỔI) | Lead |
| **QA Tester** | `AGENT_REPORTS.md` → QA | Sau Developer (L/XL luôn; M khi cần) | Feature Brief (BASELINE + 2 danh sách) | Báo cáo ≤ 10 dòng: PASS/BLOCKED, phạm vi từ git, lỗi theo mẫu, codemap cần cập nhật | Lead |
| **Playtest / Handover** | `PLAYTEST.md` | Như trên | Như trên | Checklist PT-xx; người dùng trả PASS/FAIL/NOT TESTED | Người dùng → Lead (Feedback Loop §9b) |

Reuse Analysis (ST-03) không có mẫu riêng: bảng nằm trong `TASK_MAP.md` mục "Reuse Analysis", luật ở WORKFLOW §13.4; Designer/Developer/QA đọc bảng qua brief.

Mẫu khác giữ ở chỗ cũ (không nhân bản): mục quyết định — đầu `docs/studio/DECISIONS.md`; số token — `docs/studio/lean-handoff/TOKEN_LOG.md`; khung một file codemap — `docs/PROJECT_MAP.md` mục "Bảo trì".
Mẫu cũ `lean-handoff/QA_PLAN_TEMPLATE.md`, `lean-handoff/REPORT_TEMPLATE.md` đã thay bằng `FEATURE_BRIEF.md` §5 và `AGENT_REPORTS.md` (giữ file để không gãy tham chiếu trong brief cũ).
