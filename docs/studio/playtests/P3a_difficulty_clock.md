# PLAYTEST_CHECKLIST — P3a: DifficultyClock

Nhiệm vụ: P3a (cấp L, Lean). **Không đổi gameplay**: đồng hồ độ khó và lịch Boss được gom vào một đối tượng thay vì năm trường rải trong scene. Mục tiêu chơi thử: xác nhận lịch Boss và độ khó theo thời gian vẫn y hệt.
Baseline: HEAD `b1097aa` + thay đổi P3a chưa commit. Brief + QA Plan: `docs/studio/lean-handoff/P3A_FEATURE_BRIEF.md`. Ngày lập: 2026-11-17.
Bản tick được (trang artifact): https://claude.ai/artifact/U6AJkiNNJff8ZLQdNa1GJU

## Đã kiểm tự động (KHÔNG cần bạn kiểm lại)
`tsc` sạch · build qua · `npm test` 691/691 (tăng 14) · phạm vi git đúng (2 sửa + 2 tạo, `RunSession.ts`/`worldGraph.ts`/`bossArenaRules.ts`/`combatConfig.ts` diff rỗng) · công thức bậc theo thời gian khoá bằng test kể cả biên và trần · test mô hình đối chiếu lịch Boss (hết giờ, vào Arena, Boss ra, hạ Boss, đồng hồ kế, cảnh báo) khớp từng bước với logic cũ · đồng hồ khứ hồi qua `RunSession` · QA đọc từng hunk: mốc thời gian mỗi chỗ giữ nguyên, `create()` sau khi chết tạo đồng hồ mới.
**Chưa kiểm được bằng máy:** HUD đếm ngược, Boss ra, chết rồi reset khi chơi thật.

## Cách chạy
`npm run dev`, mở địa chỉ Vite in ra, F12 → Console. **Boss đầu tiên ra sau khoảng 2 phút** kể từ đầu lượt chơi; hãy bắt đầu một lượt mới và để ý đồng hồ ở HUD ("TRÙM SAU m:ss").

| ID | Kiểm | Thao tác | Mong đợi | Kết quả |
|---|---|---|---|---|
| PT-01 | Đếm ngược Boss | Bắt đầu lượt mới (vào game hoặc chết rồi chơi lại), nhìn HUD | "TRÙM SAU 2:00" rồi đếm ngược đều mỗi giây | PASS / FAIL / NOT TESTED |
| PT-02 | Cảnh báo Boss | Chờ gần hết giờ (khoảng cuối đếm ngược) | Có thông báo "TRÙM 1 SẮP XUẤT HIỆN" một lần | PASS / FAIL / NOT TESTED |
| PT-03 | Boss chờ ở Arena | Chờ hết giờ khi đang ở map chính | HUD đổi thành "TRÙM ĐANG CHỜ Ở ĐẤU TRƯỜNG" kèm thông báo; không có Boss ngoài map chính | PASS / FAIL / NOT TESTED |
| PT-04 | Boss ra trong Arena | Qua cổng đỏ vào Arena khi Boss đang chờ | Sau một lúc ngắn Boss xuất hiện giữa Arena, HUD "TRÙM 1" | PASS / FAIL / NOT TESTED |
| PT-05 | Hạ Boss và Boss kế | Hạ Boss | Thông báo "TRÙM 1 BỊ HẠ GỤC", nhận thưởng; quái con sinh ra; HUD bắt đầu đếm ngược Boss kế ("TRÙM SAU …") | PASS / FAIL / NOT TESTED |
| PT-06 | Đồng hồ giữ qua cổng | Khi đếm ngược còn dang dở, qua cổng vào Arena rồi về làng (hoặc ngược lại) | Giờ đếm ngược tiếp tục từ chỗ cũ, không quay về 2:00 | PASS / FAIL / NOT TESTED |
| PT-07 | Reset khi chết | Để chết rồi nhấn R | Lượt mới: HUD "TRÙM SAU 2:00", Boss số 1, không còn Boss chờ | PASS / FAIL / NOT TESTED |
| PT-08 | Quái mạnh dần theo thời gian | Chơi vài phút ở vùng gần/xa làng, so quái lúc đầu và lúc sau | Quái sinh ra về sau mạnh hơn rõ (máu/sát thương) như trước; vùng xa mạnh hơn vùng gần | PASS / FAIL / NOT TESTED |
| PT-09 | Elite vẫn đúng | Hạ khoảng 25 quái ở một vùng | Elite xuất hiện như trước | PASS / FAIL / NOT TESTED |
| PT-10 | Console sạch | Mở Console, chơi qua các mục trên | Không có lỗi đỏ mới | PASS / FAIL / NOT TESTED |

## Giới hạn nói thẳng
- Agent không chơi được game; tôi sẽ **không** tự đánh dấu PASS.
- Các mốc thời gian cụ thể (2:00, thời gian cảnh báo, độ trễ Boss ra) là giá trị đã có từ trước, không đổi trong P3a; nếu bạn thấy khác trước thì ghi FAIL kèm mô tả.
- PT-08 là so sánh cảm nhận, khó tuyệt đối; công thức bậc đã được khoá bằng test.

## Kết quả người dùng gửi (2026-11-17)
**8 Đạt, 0 Không đạt, 2 Chưa kiểm tra / 10.** PT-01, 02, 03, 04, 05, 06, 07, 10: Đạt. **PT-08 (quái mạnh dần theo thời gian) và PT-09 (Elite vẫn đúng): Chưa kiểm tra.** Không có lỗi ngoài checklist.
Ghi chú Lead: PT-08 là mục duy nhất chạm trực tiếp `clock.timeTier`/`clock.elapsedMs` bằng cách chơi thật (công thức đã khoá bằng test kể cả biên và trần, nhưng chưa thấy khi chơi). PT-09 dùng `effectiveThreatTier(clock.elapsedMs(...))` ở `spawnElite`; Elite đã được người dùng kiểm ở P2 (PT-11) trên bản chưa có clock.

## Nghiệm thu
**P3a: ACCEPTED** (người dùng, 2026-11-17: "nghiệm thu p3a"), với 8/10 Đạt và **PT-08, PT-09 chưa kiểm bằng chơi thật** (người dùng chấp nhận; được khoá bằng test và QA đọc mã). Chờ người dùng xác nhận trước khi commit.
