# PLAYTEST_CHECKLIST — P3b: trạng thái qua cổng bằng dữ liệu `scene.start`

Nhiệm vụ: P3b (cấp L, Lean). **Không đổi gameplay**: HP/giáp/năng lượng, hồi chiêu, dash và đồng hồ Boss mang qua cổng bằng dữ liệu của `scene.start` thay vì kho toàn cục (registry). Có một điểm sửa đáng kể: `scene.restart()` của Phaser không xoá dữ liệu cũ nếu không truyền data, nên sau khi chết game phải khởi động lượt mới đúng nghĩa. Mục tiêu chơi thử: xác nhận giữ trạng thái khi qua cổng và **lượt mới thật sự khi chết**.
Baseline: HEAD `4d511f1` + thay đổi P3b chưa commit. Brief + QA Plan: `docs/studio/lean-handoff/P3B_FEATURE_BRIEF.md`. Ngày lập: 2026-11-17.
Bản tick được (trang artifact): https://claude.ai/artifact/NFKmhqfm2i2kug1gKpBS3Q

## Đã kiểm tự động (KHÔNG cần bạn kiểm lại)
`tsc` sạch · build qua · `npm test` 700/700 (tăng 9) · phạm vi git đúng (5 sửa, không tạo) · không còn kênh registry hay `scene.restart()` trần (test khoá nguồn) · `isRunSession` từ chối dữ liệu hỏng (null, thiếu trường, NaN/Infinity, sai kiểu) và chấp nhận mọi bản chụp thật · khứ hồi JSON · QA tự xác minh hành vi Phaser và lập luận chuỗi vào Arena → về làng → chết → R ra lượt mới; chết ở Arena; menu → game.
**Chưa kiểm được bằng máy:** các luồng chơi thật bên dưới.

## Cách chạy
`npm run dev`, mở địa chỉ Vite in ra, F12 → Console. HP/hồi chiêu/đồng hồ Boss xem ở HUD.

| ID | Kiểm | Thao tác | Mong đợi | Kết quả |
|---|---|---|---|---|
| PT-01 | HP, giáp, năng lượng giữ qua cổng | Để HP/giáp/năng lượng không đầy, qua cổng vào Arena | Các giá trị giữ nguyên sau khi vào | PASS / FAIL / NOT TESTED |
| PT-02 | Hồi chiêu và dash giữ qua cổng | Dùng vài kỹ năng và dash ngay trước khi qua cổng | Hồi chiêu và dash tiếp tục từ chỗ cũ, không bị reset | PASS / FAIL / NOT TESTED |
| PT-03 | Đồng hồ Boss giữ qua cổng | Khi đếm ngược "TRÙM SAU …" còn dang dở, vào Arena rồi về làng | Giờ đếm ngược tiếp tục từ chỗ cũ, không về 2:00 | PASS / FAIL / NOT TESTED |
| PT-04 | **Chết sau khi qua cổng = lượt mới** | Làm HP/hồi chiêu không đầy, vào Arena rồi về làng, để chết, nhấn R | HP/giáp/năng lượng **đầy**, hồi chiêu **sạch**, đồng hồ Boss **về 2:00**, đứng giữa làng | PASS / FAIL / NOT TESTED |
| PT-05 | Chết ở Arena | Vào Arena, để chết, nhấn R | Về làng, lượt mới (HP đầy, đồng hồ Boss 2:00) | PASS / FAIL / NOT TESTED |
| PT-06 | Chết ở map chính (chưa qua cổng) | Để chết ở ngoài làng, nhấn R | Lượt mới, HP đầy, đồng hồ 2:00, trang bị/túi/vàng/level còn | PASS / FAIL / NOT TESTED |
| PT-07 | Vào game từ menu | Thoát về menu hoặc tải lại trang, chọn nhân vật, vào game | Lượt mới (HP đầy, đồng hồ 2:00); không dính trạng thái lượt trước | PASS / FAIL / NOT TESTED |
| PT-08 | Vào và ra lặp lại | Vào Arena, về, vào lại, về thêm vài lần | Luôn giữ đúng trạng thái, đúng điểm xuất hiện và màu fade, không lỗi | PASS / FAIL / NOT TESTED |
| PT-09 | Cổng, fade, khóa vẫn đúng | Vào Arena (fade đỏ thẫm), cổng về khi Boss sống ghi "(KHÓA)", về làng (fade xanh lục) | Như trước P3b | PASS / FAIL / NOT TESTED |
| PT-10 | Console sạch | Mở Console, chơi qua các mục trên | Không có lỗi đỏ mới | PASS / FAIL / NOT TESTED |

## Giới hạn nói thẳng
- Agent không chơi được game; tôi sẽ **không** tự đánh dấu PASS.
- PT-04 là mục quan trọng nhất của P3b (trước đây kho registry được xoá thủ công; nay dựa vào data tường minh khi khởi động lại).
- Các mốc thời gian (2:00, thời gian sạc, fade) là giá trị đã có từ trước, không đổi.

## Kết quả người dùng gửi (2026-11-17)
Người dùng **không gửi kết quả từng mục** (PT-01 … PT-10 ở trạng thái chưa ghi nhận); chỉ báo nghiệm thu và cho phép commit. Các mục chơi thật, trong đó PT-04 (chết sau khi qua cổng ra lượt mới), **chưa được xác nhận riêng bằng kết quả playtest**; được khoá bằng test và QA đọc mã.

## Nghiệm thu
**P3b: ACCEPTED** (người dùng, 2026-11-17: "nghiệm thu p3b, commit đi"). Commit theo lệnh người dùng.
