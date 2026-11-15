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

### 2026-11-15 — Mô hình điều phối AI Studio
- **Quyết định:** Hub-and-spoke: AI Lead (session chính) điều phối Visual Designer, Gameplay Designer, Game Developer, QA Tester. Hai cổng duyệt của người dùng (trước khi code, trước khi chốt), trần 2 vòng sửa lỗi, chỉ Developer (và Lead) được ghi code, chỉ Lead ghi Knowledge Base.
- **Lý do:** Phù hợp quy mô một người dùng + 4 subagent; tránh xung đột file và quy trình quá nặng.
- **Phương án bị loại:** Subagent gọi nhau trực tiếp (khó kiểm soát, khó truy vết); Gameplay Designer ghi thẳng `src/config/` (tách trách nhiệm thiết kế khỏi triển khai).
- **Ảnh hưởng:** `CLAUDE.md`, `.claude/agents/*`, `docs/studio/*`.
- **Trạng thái:** Đã duyệt, đã triển khai.
- **Tài liệu liên quan:** `docs/studio/WORKFLOW.md`
