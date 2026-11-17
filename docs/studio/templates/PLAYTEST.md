# MẪU — Playtest checklist / Handover / Retest

Người viết: **AI Lead**, khi QA PASS (hoặc tự kiểm xong ở cấp S) và thay đổi chơi được (WORKFLOW §9a, §12.5). Người nhận: **người dùng**. Kết quả quay về Lead → Feedback Loop (§9b).
Lưu: `docs/studio/playtests/<ID>_<slug>.md` (retest: `<ID>_<slug>_retest<n>.md`). Ví dụ thật: `playtests/P4b_withered_woods.md`.
Nguồn mục PT: tiêu chí **P** của brief + mục "Chưa kiểm được" của QA + ca biên + hồi quy lân cận + PC/cảm ứng nếu liên quan. Một hành vi một mục, ID ổn định (không đánh số lại khi retest).
**Lead không bao giờ điền PASS thay người dùng.** Người dùng nghiệm thu chung (không kèm từng mục) → ghi đúng như vậy ở dòng Trạng thái, để nguyên cột Kết quả.

Chép từ dòng dưới đây:

---

# PLAYTEST_CHECKLIST — <ID>: <tên>

Trạng thái: **READY FOR PLAYTEST** (QA Đạt, chưa commit). Ngày lập: <ngày>.
<!-- Chuyển: NEEDS REVISION (có FAIL) → READY FOR PLAYTEST (retest) → ACCEPTED (người dùng xác nhận, ghi ngày + lời) -->
Nhiệm vụ: <ID> (cấp …). **Nội dung mới:** 2–3 dòng người chơi thấy gì.
Baseline: HEAD `<sha>` + thay đổi chưa commit. Brief: `docs/studio/lean-handoff/<ID>_FEATURE_BRIEF.md`. Task Map: `docs/studio/tasks/<ID>_<slug>.md`.

## Đã kiểm tự động (KHÔNG cần bạn kiểm lại)
tsc · build · `npm test` <n>/<n> · phạm vi git · … (1 dòng)
**Chưa kiểm được bằng máy:** hình ảnh, cảm giác, cân bằng, hiệu năng mobile, …

## Cách chạy
`npm run dev`, mở địa chỉ Vite in ra, F12 → Console. Điều kiện để thấy tính năng (nhân vật, vũ khí/kỹ năng và cách lấy, vị trí). Tham số URL hữu ích (`?time=night`, `?perf`, phím N…).

| ID | Kiểm | Thao tác | Mong đợi | Kết quả |
|---|---|---|---|---|
| PT-01 | … | … | … | PASS / FAIL / NOT TESTED |
| PT-xx | Console sạch | Mở Console suốt các mục trên | Không lỗi đỏ mới | PASS / FAIL / NOT TESTED |

## Giới hạn nói thẳng
- Agent không chơi được game; Lead không tự đánh PASS. <ID> chỉ ACCEPTED sau khi bạn xác nhận.
- Mọi số là **giá trị khởi điểm** ở `src/config/<file>.ts`; báo cảm nhận để chỉnh.
- Lỗi đã biết, không chặn: …

## Mẫu phản hồi
Mỗi dòng: `PT-xx: PASS` · `PT-xx: FAIL — <mô tả / bước tái hiện>` · `PT-xx: NOT TESTED`. Ảnh chụp nếu có.

---

## Phụ lục cho Lead — xử lý phản hồi (§9b, không chép vào checklist)
| Loại | Ví dụ | Xử lý |
|---|---|---|
| Lỗi | sai tiêu chí đã duyệt | Developer sửa trong phạm vi cũ → QA → retest |
| Chỉnh thông số | quá khó, quá nhanh | đề xuất giá trị ở `src/config/` → một câu xác nhận |
| Đổi thiết kế | khác thiết kế đã duyệt | đề xuất + tiêu chí mới → duyệt → ghi DECISIONS |
| Ngoài phạm vi | ý tưởng mới | ghi vào Task Map mục Nhật ký / backlog, không làm lần này |
Retest: checklist mới chỉ gồm mục FAIL/bị ảnh hưởng + hồi quy, giữ ID PT cũ. Mỗi vòng cập nhật Task Map (bước 7–8) ngay.
