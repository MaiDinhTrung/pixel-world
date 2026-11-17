# MẪU — Feature Brief + QA Plan (một file dùng chung)

Người viết: **AI Lead**, sau Cổng 1, trước khi gọi Developer. Người đọc: **game-developer** (triển khai) và **qa-tester** (kiểm), cùng một file — không viết brief riêng cho từng bên (WORKFLOW §12.3).
Lưu: `docs/studio/lean-handoff/<ID>_FEATURE_BRIEF.md`. Ví dụ thật: `lean-handoff/P4B_FEATURE_BRIEF.md`.
Thiếu một trong: mục tiêu · dòng "đã duyệt" · BASELINE · ĐƯỢC SỬA · ĐƯỢC TẠO · tiêu chí → Developer dừng; QA ghi phạm vi "Chưa kiểm được".
Tham chiếu tài liệu/spec bằng đường dẫn, **không chép lại**. Mỗi số liệu chỉ ghi tên hằng ở `src/config/` + giá trị khởi điểm.

Chép từ dòng dưới đây:

---

# FEATURE BRIEF + QA Plan — <ID>: <tên>

Cấp: **<S/M/L/XL>** (lý do). Cổng 1: người dùng duyệt <ngày> ("<trích lời>"; DECISIONS mục <tên>). Task Map: `docs/studio/tasks/<ID>_<slug>.md`. Báo cáo agent **≤ 10 dòng** theo `docs/studio/templates/AGENT_REPORTS.md`.

BASELINE: HEAD=<sha đầy đủ> · nhánh=<tên> · tracked sạch · untracked có sẵn: <mẫu> (<số>) [· tài liệu Lead: <mẫu docs/**> — chỉ khi Lead buộc phải sửa song song, WORKFLOW §6a; ưu tiên commit trước]
Test baseline: <n> file, <m> test qua; `npx tsc --noEmit` sạch.

## 1. Mục tiêu
2–4 dòng: làm gì, người chơi thấy gì, cái gì KHÔNG đổi.

## 2. Tham chiếu (không chép lại)
Codebase Map: `docs/codemap/<hệ thống>.md`. File/ký hiệu cần đọc kèm vị trí gần đúng (`file.ts` `hàm` ~dòng). Tài liệu thiết kế.

## 3. Phạm vi
File ĐƯỢC SỬA: …
File ĐƯỢC TẠO: …
KHÔNG đụng: … (luôn gồm vùng cấm §8: `.claude/`, `CLAUDE.md`, `docs/studio/DECISIONS.md`, `package*.json`, `tsconfig*.json`, `vite.config.*`). Không commit/push. Cần file ngoài danh sách → DỪNG báo Lead.

## 4. Thiết kế
4.1 Số liệu — `src/config/<file>.ts`: tên hằng = giá trị khởi điểm.
4.2 … (mỗi mục một thay đổi, đủ để làm mà không phải đoán)

## 5. Tiêu chí nghiệm thu
**A (máy, Developer tự kiểm + QA chạy lại):**
- A1 build, `npx tsc --noEmit`, `npm test` qua; test > <m>.
- A2 Phạm vi §6a: HEAD == baseline; chỉ file trong §3; vùng cấm không đổi.
- A3 …
**Q (QA đọc độc lập, nêu `file:dòng`):**
- Q1 …
**Hồi quy không bỏ (QA Plan mục C):** hệ thống/vũ khí lân cận, gameplay invariants (`docs/visual-overhaul/GAMEPLAY_INVARIANTS.md` nếu liên quan), gói trước.
**P (người chơi — chuyển vào checklist playtest):** …
**Cấu trúc:** nếu thêm/xoá/đổi tên file hoặc trách nhiệm → Developer khai ở dòng CẤU TRÚC ĐỔI; Lead cập nhật `docs/codemap/…`.

## 6. Rủi ro
1–5 dòng.

## 7. Báo cáo
Developer: mục "Developer" trong `AGENT_REPORTS.md` (+ chỉ số riêng nếu cần: …).
QA: mục "QA" trong `AGENT_REPORTS.md`, tiêu chí theo ID A/Q ở §5. QA **không** nhận danh sách file của Developer.
