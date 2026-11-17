# PLAYTEST_CHECKLIST — P2: chuyển Map theo dữ liệu

Nhiệm vụ: P2 (cấp L, Lean). **Không đổi gameplay**: điểm xuất hiện, màu fade, thời gian sạc, kẹp vị trí quái/hòm giờ đọc từ dữ liệu Map/Connection. Mục tiêu chơi thử: xác nhận qua cổng và chết/chơi lại vẫn y hệt.
Baseline: HEAD `8b18a36` + thay đổi P2 chưa commit. Brief + QA Plan: `docs/studio/lean-handoff/P2_FEATURE_BRIEF.md`. Ngày lập: 2026-11-17.
Bản tick được (trang artifact): https://claude.ai/artifact/UgQMxvFCDqYRNrGyAucErP

## Đã kiểm tự động (KHÔNG cần bạn kiểm lại)
`tsc` sạch · `npm run build` qua · `npm test` 677/677 · phạm vi git đúng (5 sửa + 2 tạo) · không còn `WORLD_WIDTH/HEIGHT`, `BOSS_ARENA_FADE_TO_*`, `BOSS_ARENA_PORTAL_CHARGE_MS`, `town.playerSpawn`, `town.portal` trong scene · điểm vào Arena {800,900}, về làng {1920,1440}, màu fade, sạc 800 ms, kẹp theo `MapDef.size` đều khoá bằng test · QA đọc mã: `init` đặt lại connection mỗi lần, luồng sạc/huỷ sạc, thứ tự ưu tiên tương tác giữ nguyên.
**Chưa kiểm được bằng máy:** fade/sạc/điểm xuất hiện khi chơi thật; cổng thứ hai (dữ liệu chỉ có 1 cổng mỗi Map).

## Cách chạy
`npm run dev`, mở địa chỉ Vite in ra; F12 → Console. Cổng đỏ ngoài làng, sát cổng thành phía Bắc.

| ID | Kiểm | Thao tác | Mong đợi | Kết quả |
|---|---|---|---|---|
| PT-01 | Vào Arena | Đi tới cổng đỏ, nhấn F, chờ sạc | Prompt "NHẤN F ĐỂ VÀO ĐẤU TRƯỜNG"; vòng sạc đầy ~0,8 giây; màn hình mờ sang màu **đỏ thẫm**; vào Arena ở rìa Nam, ngay phía Bắc cổng về | PASS / FAIL / NOT TESTED |
| PT-02 | Trạng thái giữ qua cổng | Trước khi vào, để HP/giáp/năng lượng không đầy và có vài kỹ năng đang hồi chiêu | Sau khi vào Arena giá trị và hồi chiêu giữ nguyên; thấy hiệu ứng mờ dần vào | PASS / FAIL / NOT TESTED |
| PT-03 | Về làng | Hạ Boss (hoặc khi cổng về đã mở), qua cổng về | Màn hình mờ sang màu **xanh lục**; về đúng điểm giữa làng; biển "Làng Khởi Nguyên" hiện | PASS / FAIL / NOT TESTED |
| PT-04 | Cổng về khóa | Trong Arena khi Boss còn sống, lại gần cổng về | Cổng ghi "(KHÓA)", thông báo "CỔNG KHÓA — HẠ TRÙM ĐỂ MỞ", không sạc được | PASS / FAIL / NOT TESTED |
| PT-05 | Hủy sạc | Bắt đầu sạc cổng rồi bước ra xa trước khi đầy | Vòng sạc biến mất, không bị dịch chuyển | PASS / FAIL / NOT TESTED |
| PT-06 | Chết ở map chính | Để chết ở vùng ngoài làng, nhấn R | Chơi lại ở **giữa làng** (không ở cổng đỏ); quái và đồ trên sàn reset; trang bị/túi/vàng/ngọc/level còn | PASS / FAIL / NOT TESTED |
| PT-07 | Chết ở Arena | Vào Arena rồi để chết, nhấn R | Về làng như PT-06 (không xuất hiện sai chỗ, không đứng trong Arena) | PASS / FAIL / NOT TESTED |
| PT-08 | Vào/ra lặp lại | Vào Arena, về, vào lại, về thêm vài lần liên tiếp | Luôn đúng điểm xuất hiện, đúng màu fade từng chiều, không kẹt, không lỗi | PASS / FAIL / NOT TESTED |
| PT-09 | Chết sau khi qua cổng | Vào Arena, về làng, rồi chết ở làng/ngoài làng và nhấn R | Vẫn về giữa làng (không dùng điểm của lần qua cổng trước) | PASS / FAIL / NOT TESTED |
| PT-10 | Quái Arena sinh đúng chỗ | Trong Arena (trước khi hạ Boss) quan sát quái con sinh | Quái sinh bên trong Arena, không ra ngoài tường, không kẹt trong tường | PASS / FAIL / NOT TESTED |
| PT-11 | Elite và hòm | Ở vùng gần/xa hạ khoảng 25 quái; nhặt hòm rơi | Elite sinh bình thường; hòm hiện đúng chỗ quái chết | PASS / FAIL / NOT TESTED |
| PT-12 | Tương tác lân cận | Đứng gần cổng + NPC/hòm, nhấn F | Ưu tiên như trước (nhặt đồ > NPC > cổng > hòm đóng); prompt đúng | PASS / FAIL / NOT TESTED |
| PT-13 | Console sạch | Mở Console, chơi qua các mục trên | Không có lỗi đỏ mới | PASS / FAIL / NOT TESTED |

## Giới hạn nói thẳng
- Agent không chơi được game; tôi sẽ **không** tự đánh dấu PASS.
- Không kiểm được cổng thứ hai (dữ liệu chỉ có 1 cổng mỗi Map); thay đổi để hỗ trợ nhiều cổng chỉ được kiểm bằng test thuần và đọc mã.
- Tên màu fade (đỏ thẫm / xanh lục) lấy theo giá trị cấu hình; nếu bạn thấy màu khác thì ghi FAIL kèm mô tả.

## Kết quả người dùng gửi (2026-11-17)
**Cập nhật cuối: 13/13 Đạt** (người dùng thử lại PT-05 và báo Đạt). Kết quả lần gửi đầu bên dưới giữ để lưu vết: 12 Đạt, 0 Không đạt, 1 Chưa kiểm tra / 13. PT-01, 02, 03, 04, 06, 07, 08, 09, 10, 11, 12, 13: Đạt. **PT-05 (Hủy sạc): Chưa kiểm tra** (ghi chú người dùng: "Chưa hiểu cơ chế như thế nào"). Không có lỗi ngoài checklist.
Giải thích cơ chế PT-05 đã gửi lại người dùng: nhấn F gần cổng để bắt đầu sạc (~0,8 giây); nếu bước ra khỏi tầm tương tác của cổng trước khi đầy thì vòng sạc biến mất và không dịch chuyển. Hủy sạc không đổi ở P2 (QA đọc mã `WorldScene.ts` xác nhận); chờ người dùng quyết định thử lại PT-05 hay chấp nhận để mục này ở "chưa kiểm bằng chơi thật".

## Nghiệm thu
**P2: ACCEPTED** (người dùng, 2026-11-17: "pt05 đạt, nghiệm thu p2"). Chờ người dùng xác nhận trước khi commit.
