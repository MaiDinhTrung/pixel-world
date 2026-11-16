# TOKEN LOG — số liệu thật theo nhiệm vụ

Quy tắc (WORKFLOW §12.7): chỉ ghi số có thật; ô trống = không có dữ liệu, **không suy đoán**. Dùng để xem xu hướng, không phải thước đo chất lượng. Mỗi nhiệm vụ một nhóm hàng.

Nguồn các số bên dưới: thông báo hoàn tất của từng subagent (trường `subagent_tokens`, `tool_uses`, `duration_ms`). Harness không nói `subagent_tokens` có gồm cache hay không, nên coi là tổng do harness báo.

| Nhiệm vụ | Cấp (lúc làm) | Vai | Subagent tokens | Tool uses | Thời gian | Input / Cache R/W / Output (session chính) |
|---|---|---|---|---|---|---|
| P0b đổi tên Region→Zone | (trước Lean; tương đương L) | Developer | 73 133 | 96 | 175 s | — |
| P0b | | QA | 69 911 | 18 | 51 s | — |
| P1 module Region/Instance | (trước Lean; tương đương L) | Developer | 81 360 | 39 | 171 s | — |
| P1 | | QA | 54 846 | 20 | 71 s | — |

Ghi chú:
- P0b và P1 chạy theo quy trình cũ (trước §12), nên là mốc so sánh; hai gói khác kích thước nên không so trực tiếp.
- Số của session chính (Lead) chưa có: cần người dùng cung cấp (ví dụ `/cost`) nếu muốn ghi.
- Các lượt nghiên cứu/viết tài liệu kiến trúc (không dùng subagent) không có số liệu.
