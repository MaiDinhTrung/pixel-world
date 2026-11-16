# QA VERIFICATION PLAN — mẫu (Lean Handoff, thử nghiệm)

Lead điền mục A–D **trước khi giao Developer** (cùng Feature Brief, Cổng 1 duyệt cả hai). QA điền mục E khi báo cáo, tối đa 10 dòng (WORKFLOW §12.3) (xem `REPORT_TEMPLATE.md`). Mỗi dòng ở mục B tham chiếu ID tiêu chí của Feature Brief. QA vẫn tự lấy danh sách file đã đổi từ git, không từ lời khai Developer (WORKFLOW §6a).

### A. Scope
- Baseline commit:
- Approved specification:
- Expected change areas:
- Forbidden areas:

### B. Required Checks

| ID | Check | Expected Result | Verification Method |
|---|---|---|---|
| QA-01 | [Nội dung kiểm tra] | [Kết quả mong đợi] | Automated/Manual |
| QA-02 | [Nội dung kiểm tra] | [Kết quả mong đợi] | Automated/Manual |
| QA-03 | [Nội dung kiểm tra] | [Kết quả mong đợi] | Automated/Manual |

### C. Regression Checks
- Các chức năng cũ liên quan:
- Gameplay invariants phải giữ:
- Các rủi ro cần kiểm tra:

### D. Automated Checks
- TypeScript:
- Build:
- Unit tests:
- Git scope validation:

### E. QA Report
- PASS / BLOCKED
- Passed checks:
- Failed checks:
- Findings ngoài checklist:
- Chưa thể xác minh:
- Kết luận độc lập của QA:

---
Quy ước: **Automated** = kiểm bằng lệnh/test, ghi số. **Manual** = QA đọc code/diff và đánh giá độc lập, nêu bằng chứng `file:dòng`. Mục "Findings ngoài checklist" và "Kết luận độc lập của QA" là phần bắt buộc, không được bỏ dù mọi dòng B đều đạt. `PASS` = không còn lỗi Chặn; `BLOCKED` = có lỗi Chặn hoặc không kiểm được tiêu chí bắt buộc.
