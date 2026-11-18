# TOKEN LOG — số liệu thật theo nhiệm vụ

Quy tắc (WORKFLOW §12.7): chỉ ghi số có thật; ô trống = không có dữ liệu, **không suy đoán**. Dùng để xem xu hướng, không phải thước đo chất lượng. Mỗi nhiệm vụ một nhóm hàng.

Nguồn các số bên dưới: thông báo hoàn tất của từng subagent (trường `subagent_tokens`, `tool_uses`, `duration_ms`). Harness không nói `subagent_tokens` có gồm cache hay không, nên coi là tổng do harness báo.

| Nhiệm vụ | Cấp (lúc làm) | Vai | Subagent tokens | Tool uses | Thời gian | Input / Cache R/W / Output (session chính) |
|---|---|---|---|---|---|---|
| P0b đổi tên Region→Zone | (trước Lean; tương đương L) | Developer | 73 133 | 96 | 175 s | — |
| P0b | | QA | 69 911 | 18 | 51 s | — |
| P1 module Region/Instance | (trước Lean; tương đương L) | Developer | 81 360 | 39 | 171 s | — |
| P1 | | QA | 54 846 | 20 | 71 s | — |
| P2 chuyển Map theo dữ liệu | L (Lean, brief dùng chung) | Developer | 97 832 | 62 | 131 s | — |
| P2 | | QA | 53 141 | 19 | 49 s | — |
| P3a DifficultyClock | L (Lean, brief dùng chung) | Developer | 67 292 | 48 | 113 s | — |
| P3a | | QA | 45 834 | 12 | 48 s | — |
| P3b RunSession qua scene.start | L (Lean, brief dùng chung) | Developer | 55 609 | 33 | 79 s | — |
| P3b | | QA | 48 043 | 15 | 39 s | — |
| P3c-1 InstanceGameplayState | L (Lean, brief dùng chung) | Developer | 47 575 | 44 | 103 s | — |
| P3c-1 | | QA | 41 499 | 13 | 38 s | — |
| P3c-2 Instance cục bộ + TravelTicket | L (Lean, brief dùng chung) | Developer | 65 346 | 41 | 120 s | — |
| P3c-2 | | QA | 48 673 | 21 | 53 s | — |
| P3d Dọn nợ kỹ thuật sau P3 | L (Lean, brief dùng chung) | Developer | 64 482 | 47 | 142 s | — |
| P3d | | QA | 50 211 | 19 | 57 s | — |
| P4a Một scene map chung | L (Lean, brief dùng chung) | Developer | 134 002 | 84 | 268 s | — |
| P4a | | QA | 96 123 | 44 | 142 s | — |
| Sửa kiếm vùng an toàn theo Map | L (Lead tự sửa) | QA | 48 769 | 21 | 64 s | — |
| P4b Rừng Úa / Rừng Sâu | L/XL (Lean, brief dùng chung) | Developer | 170 821 | 98 | 464 s | — |
| P4b | | QA | 88 238 | 26 | 109 s | — |
| P4 khảo sát thiết kế | — | Gameplay Designer | 62 719 | 23 | 116 s | — |
| P4 khảo sát thiết kế | | Visual Designer | 40 369 | 10 | 55 s | — |
| ST-03 | Lead tự làm tài liệu | QA | 74 376 | 23 | 55 s | — |

Ghi chú:
- P2 là nhiệm vụ đầu tiên chạy theo Lean (một Feature Brief + QA Plan dùng chung, báo cáo ≤ 10 dòng); số liệu chỉ để xem xu hướng, các gói khác kích thước nên không so trực tiếp.
- P0b và P1 chạy theo quy trình cũ (trước §12), nên là mốc so sánh; hai gói khác kích thước nên không so trực tiếp.
- Số của session chính (Lead) chưa có: cần người dùng cung cấp (ví dụ `/cost`) nếu muốn ghi.
- Các lượt nghiên cứu/viết tài liệu kiến trúc (không dùng subagent) không có số liệu.
