# PLAYTEST_CHECKLIST — P3c-2: Instance cục bộ và TravelTicket

Nhiệm vụ: P3c-2 (cấp L, Lean; gói cuối của P3). **Không đổi gameplay**: mỗi lần vào một Map game giữ một Instance do bộ cấp phát cục bộ cấp, và chuyển Map đi qua một "vé" (TravelTicket) thay vì dữ liệu rời. Với chính sách mặc định, mỗi lần vào Map là Instance mới, rời đi thì huỷ. Mục tiêu chơi thử: xác nhận qua cổng, chết, chơi lại và vào game vẫn y hệt, và **chơi lâu với nhiều lần qua cổng vẫn không lỗi, không chậm dần**.
Baseline: HEAD `80b23eb` + thay đổi P3c-2 chưa commit. Brief + QA Plan: `docs/studio/lean-handoff/P3C2_FEATURE_BRIEF.md`. Ngày lập: 2026-11-17.
Bản tick được (trang artifact): https://claude.ai/artifact/3fnAc37RsipXFGCP4tBjh1

## Đã kiểm tự động (KHÔNG cần bạn kiểm lại)
`tsc` sạch · build qua · `npm test` 726/726 (tăng 20) · phạm vi git đúng (3 sửa + 2 tạo; `localInstanceAllocator.ts`, `travel.ts`, `RunSession.ts`, `BossArenaScene.ts`, `config/` diff rỗng) · `isTravelTicket` từ chối 11 dạng vé hỏng · test bộ cấp phát: cấp lại khi chưa giải phóng, `moveTo`, `resolve` vé khớp/lệch, `leave` idempotent, chuỗi vào, chuyển, rời kết thúc rỗng, qua cổng nhiều lần không rò Instance · QA tự đọc Phaser (`processQueue`): SHUTDOWN của scene cũ luôn chạy trước init/create của scene mới, rồi lập luận từng đường (menu, qua cổng, chết ở map chính, chết ở Arena, lặp lại).
**Chưa kiểm được bằng máy:** các luồng chơi thật bên dưới, đặc biệt chơi lâu.

## Cách chạy
`npm run dev`, mở địa chỉ Vite in ra, F12 → Console. Cổng đỏ ở ngoài làng, sát cổng thành phía Bắc.

| ID | Kiểm | Thao tác | Mong đợi | Kết quả |
|---|---|---|---|---|
| PT-01 | Vào game từ menu | Chọn nhân vật, vào game | Vào bình thường, HP đầy, đồng hồ Boss 2:00, đứng giữa làng, không lỗi | PASS / FAIL / NOT TESTED |
| PT-02 | Qua cổng giữ trạng thái | Để HP/hồi chiêu/đồng hồ Boss dang dở, vào Arena rồi về | HP, giáp, năng lượng, hồi chiêu, dash và đồng hồ Boss giữ nguyên qua mỗi lần qua cổng | PASS / FAIL / NOT TESTED |
| PT-03 | Điểm xuất hiện và fade | Vào Arena (fade đỏ thẫm), về làng (fade xanh lục) | Đúng điểm cũ (Arena rìa Nam, làng giữa), đúng màu, sạc khoảng 0,8 giây | PASS / FAIL / NOT TESTED |
| PT-04 | **Vào và ra lặp lại ≥ 10 lần** | Qua cổng vào Arena và về làng liên tục ít nhất 10 lần | Không lỗi, không giật, không chậm dần, trạng thái giữ đúng mọi lần | PASS / FAIL / NOT TESTED |
| PT-05 | Chết ở map chính | Để chết ngoài làng, nhấn R | Lượt mới: HP đầy, hồi chiêu sạch, đồng hồ Boss 2:00, giữa làng; trang bị/túi/vàng/level còn | PASS / FAIL / NOT TESTED |
| PT-06 | Chết ở Arena | Vào Arena, để chết, nhấn R | Về làng, lượt mới như PT-05 | PASS / FAIL / NOT TESTED |
| PT-07 | Chết sau khi đã qua cổng | Vào Arena, về làng, để chết, nhấn R | Lượt mới thật sự (không khôi phục trạng thái cũ) | PASS / FAIL / NOT TESTED |
| PT-08 | Chết nhiều lần liên tiếp | Chết, chơi lại, chết, chơi lại vài lần | Không lỗi, mỗi lần đều là lượt mới | PASS / FAIL / NOT TESTED |
| PT-09 | Quay về menu rồi vào lại | Thoát về menu (hoặc tải lại trang), chọn nhân vật, vào game | Vào bình thường như PT-01, không dính trạng thái lượt trước | PASS / FAIL / NOT TESTED |
| PT-10 | Quái, Elite, Boss vẫn đúng | Chơi vài phút: hạ quái, đợi Boss, vào Arena | Nhịp sinh, Elite sau khoảng 25 quái, lịch Boss, Boss ra trong Arena đều như trước | PASS / FAIL / NOT TESTED |
| PT-11 | Console sạch | Mở Console, chơi qua các mục trên | Không có lỗi đỏ mới | PASS / FAIL / NOT TESTED |

## Giới hạn nói thẳng
- Agent không chơi được game; tôi sẽ **không** tự đánh dấu PASS.
- Bạn không thấy trực tiếp Instance hay vé; mục tiêu là xác nhận không có gì hỏng. PT-04 là mục quan trọng nhất (phát hiện rò Instance hoặc lỗi cấp phát khi chuyển nhiều lần).
- Các mốc thời gian (2:00, sạc, fade) và số 25 quái là giá trị có từ trước, không đổi.

## Kết quả người dùng gửi (2026-11-17)
**11 Đạt, 0 Không đạt, 0 Chưa kiểm tra / 11** (PT-01 … PT-11, gồm PT-04 vào/ra Arena ≥ 10 lần, PT-05…08 chết ở nhiều tình huống, PT-09 menu rồi vào lại, PT-11 Console sạch). Không có lỗi ngoài checklist. (Người dùng gửi kết quả qua phản hồi khi từ chối một lệnh công cụ; nội dung do người dùng viết.) Chờ người dùng nghiệm thu và cho phép commit.

## Nghiệm thu
**P3c-2: ACCEPTED** (người dùng, 2026-11-17: "Tôi xác nhận nghiệm thu P3c-2"; chấp nhận hai ghi chú QA đã ghi trong DECISIONS.md). Cho phép commit, chưa push. **P3 hoàn tất** (P3a, P3b, P3c-1, P3c-2 đều đã nghiệm thu). P4 chưa bắt đầu.
