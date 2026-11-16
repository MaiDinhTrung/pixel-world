# PLAYTEST_CHECKLIST — P1: mô hình Region/Instance (module thuần, chưa nối vào game)

Nhiệm vụ: P1. **Không đổi gameplay**; chỉ thêm module thuần có test. Mục tiêu chơi thử: xác nhận game chạy y hệt.
Baseline: HEAD `61335dd` + thay đổi P1 chưa commit. Ngày lập: 2026-11-17.
Bản tick được (trang artifact): https://claude.ai/artifact/WX9MhNy6bGHJTP2kj6f6DL

## Đã kiểm tự động (KHÔNG cần bạn kiểm lại)
`tsc` sạch · `npm run build` qua · `npm test` 663/663 · phạm vi git đúng (4 sửa + 6 tạo) · `scenes/progression/systems/entities/ui` diff rỗng · scene không import module mới · module mới không dùng phaser/Math.random/Date.now · 12 mã lỗi `validateWorld` mới đều có test · `CharacterCarry` không chứa đồng hồ độ khó.
**Chưa kiểm được bằng máy:** game chạy y hệt khi chơi thật.

## Cách chạy
`npm run dev`, mở địa chỉ Vite in ra. F12 → Console để xem lỗi.

| ID | Kiểm | Thao tác | Mong đợi | Kết quả |
|---|---|---|---|---|
| PT-01 | Nhân vật cũ vào game đúng | Chọn nhân vật đã chơi, vào game | Cấp, túi đồ, trang bị, vàng, ngọc đúng như trước; không lỗi | PASS / FAIL / NOT TESTED |
| PT-02 | Console sạch | Mở Console trước khi vào game, chơi các mục còn lại | Không có lỗi đỏ mới | PASS / FAIL / NOT TESTED |
| PT-03 | Biển tên vùng vẫn đúng | Đi làng → vùng gần → vùng xa | "Làng Khởi Nguyên", "Đồng Hoang Úa" (1 ◆), "Hoang Địa Sâu" (2 ◆), không nhấp nháy | PASS / FAIL / NOT TESTED |
| PT-04 | Quái và Elite theo vùng | Hạ khoảng 25 quái mỗi vùng | Quái bình thường, làng không có quái, Elite ở cả hai vùng | PASS / FAIL / NOT TESTED |
| PT-05 | Vào và ra Arena | Qua cổng đỏ vào Arena, rồi về sau khi hạ Boss | HP/giáp/năng lượng/hồi chiêu giữ nguyên, về đúng điểm cũ, cổng về "(KHÓA)" khi Boss sống | PASS / FAIL / NOT TESTED |
| PT-06 | Chết và chơi lại | Để chết, nhấn R | Chơi lại ở làng như trước, không lỗi | PASS / FAIL / NOT TESTED |
| PT-07 | Hệ thống lân cận | N đổi ngày/đêm, cửa hàng làng, panel nhân vật | Bình thường như trước | PASS / FAIL / NOT TESTED |

## Giới hạn nói thẳng
- Agent không chơi được game; tôi sẽ không tự đánh dấu PASS.
- Region, Instance, allocator và điểm xuất hiện mới chưa chạy trong game nên bạn không thấy được chúng.
- QA suy ra "không đổi hành vi" từ diff và test, không so sánh lúc chạy.

## Kết quả người dùng gửi (2026-11-17)
**7/7 PASS** (PT-01 … PT-07). Không phát hiện lỗi ngoài checklist.

### PT-13 (từ P0b): xác nhận hành vi khi chết
Người dùng xác nhận: khi chết và nhấn R, phiên chơi reset và nhân vật về làng; quái thường và Boss reset, Boss quay lại lịch chờ xuất hiện; vật phẩm trên mặt đất bị reset; trang bị, đồ trong túi, vàng, ngọc và level giữ nguyên như trước khi chết. **Đây là hành vi người dùng chấp nhận, không yêu cầu đổi gameplay** (khớp với code `restartRun` và `saveProgress` lúc chết).

## Nghiệm thu
**P1: ACCEPTED** (người dùng, 2026-11-17: "Tôi nghiệm thu P1"). Chờ người dùng xác nhận trước khi commit. P2 chưa bắt đầu.
