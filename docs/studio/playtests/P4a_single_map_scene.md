# PLAYTEST_CHECKLIST — P4a: một scene map chung (giữ tên WorldScene)

Trạng thái: **ACCEPTED** (người dùng nghiệm thu 2026-11-17) (QA Đạt, chưa commit). Ngày lập: 2026-11-17.
Nhiệm vụ: P4a (cấp L, Lean). **Không đổi gameplay**: Đấu Trường Boss trước là một scene riêng (`BossArenaScene`), nay map chính và Đấu Trường chạy chung một scene, khác biệt của Arena đọc từ dữ liệu map. Mục tiêu chơi thử: **mọi thứ y như trước**, nhất là trong Đấu Trường và khi qua lại nhiều lần. Gói này nằm trên P3d (cũng chưa commit), nên có thể kiểm chung với `P3d_tech_debt.md`.
Baseline: HEAD `73c7b69` + P3d + P4a chưa commit. Brief + QA Plan: `docs/studio/lean-handoff/P4A_FEATURE_BRIEF.md`.

## Đã kiểm tự động (KHÔNG cần bạn kiểm lại)
`tsc` sạch · build qua · `npm test` 748/748 (tăng 14) · phạm vi git đúng, thay đổi P3d còn nguyên · QA đối chiếu từng hành vi của Arena cũ với bản mới (ánh sáng, nút ngày/đêm, vùng an toàn, quái ban đầu, luật quái con, trần quái, điểm Boss, camera, chết về làng, đẩy quái khỏi vùng cổng) · vùng an toàn mới khớp vùng làng cũ trên lưới 40 px kể cả cạnh/góc · không listener tích luỹ khi scene tự khởi động lại · thứ tự giải phóng/cấp Instance đúng.
**Chưa kiểm được bằng máy:** toàn bộ cảm giác chơi thật bên dưới.

## Cách chạy
`npm run dev`, mở địa chỉ Vite in ra, F12 → Console. Cổng đỏ vào Đấu Trường ở ngoài làng, sát cổng thành phía Bắc. Phím N đổi ngày/đêm ở map chính. Muốn gặp Boss nhanh: đợi đồng hồ Boss (2:00) về 0 rồi vào Đấu Trường.

| ID | Kiểm | Thao tác | Mong đợi | Kết quả |
|---|---|---|---|---|
| PT-01 | Vào game | Menu → chọn nhân vật → vào game | Đứng giữa làng, tường trồi lên, HP đầy, đồng hồ Boss 2:00, biển tên "Làng Khởi Nguyên" | PASS / FAIL / NOT TESTED |
| PT-02 | Làng như cũ | Đi trong làng, nói chuyện NPC, mở shop (F), nhấn N | Quái bị đẩy khỏi làng, không đánh được trong làng, shop mở/đóng bình thường, N đổi ngày/đêm | PASS / FAIL / NOT TESTED |
| PT-03 | Vào Đấu Trường | Ra cổng đỏ, sạc, vào | Fade đỏ thẫm, đứng rìa Nam Arena, ánh sáng Arena cố định như trước, **không** có biển tên vùng, Arena lúc vào trống quái | PASS / FAIL / NOT TESTED |
| PT-04 | Không ngày/đêm trong Arena | Trong Arena nhấn N, tìm nút ngày/đêm | Không có nút, N không làm gì | PASS / FAIL / NOT TESTED |
| PT-05 | Boss trong Arena | Vào Arena khi đồng hồ Boss đã hết (hoặc đợi trong Arena) | Boss sinh ở vị trí cũ sau độ trễ như trước; camera thấy cả đỉnh tường Bắc | PASS / FAIL / NOT TESTED |
| PT-06 | Cổng về khoá khi Boss sống | Đứng ở cổng về khi Boss còn sống | Cổng khoá như trước; hạ Boss xong thì mở | PASS / FAIL / NOT TESTED |
| PT-07 | Quái con và vùng sạch cổng | Sau khi hạ Boss, ở lại Arena một lúc; đứng gần cổng về | Quái con sinh như trước (số lượng tối đa như cũ); quái không nán lại sát cổng về (bị đẩy ra) | PASS / FAIL / NOT TESTED |
| PT-08 | Về làng | Qua cổng về | Fade xanh lục, đứng giữa làng; ngày/đêm, biển tên, quái ngoài làng trở lại như cũ | PASS / FAIL / NOT TESTED |
| PT-09 | **Qua lại nhiều lần** | Vào Arena và về làng ≥ 10 lần, thỉnh thoảng mở bảng nhân vật (Tab) | Không lỗi, không chậm dần; HP/hồi chiêu/đồng hồ Boss giữ qua cổng; làng không lẫn thứ của Arena và ngược lại | PASS / FAIL / NOT TESTED |
| PT-10 | Chết ở Arena | Để chết trong Arena, nhấn R | Về làng, lượt mới (HP đầy, đồng hồ Boss 2:00); trang bị/túi/vàng/level còn | PASS / FAIL / NOT TESTED |
| PT-11 | Chết ở map chính | Để chết ngoài làng, nhấn R | Lượt mới giữa làng như trước | PASS / FAIL / NOT TESTED |
| PT-12 | Bảng nhân vật ở cả hai map | Mở/đóng Tab/C/I ở làng và trong Arena | Game dừng khi mở, chạy tiếp khi đóng, điều khiển được ngay | PASS / FAIL / NOT TESTED |
| PT-13 | Quái/Elite ở map chính | Chơi vài phút ngoài làng, hạ ~25 quái | Quái đủ loại, Elite xuất hiện như trước | PASS / FAIL / NOT TESTED |
| PT-14 | Tải lại trang | Đang ở Arena, F5, vào lại | Vào làng như PT-01; save còn | PASS / FAIL / NOT TESTED |
| PT-16 | **Kiếm ở góc Đông-Nam Arena (đã sửa)** | Cầm Kiếm, vào Arena, đi sang phía Đông của chỗ xuất hiện tới gần góc Đông-Nam (sát tường Nam, bên phải), đánh combo 3 đòn vào quái con | Combo đủ 3 đòn, không bị huỷ giữa chừng | PASS / FAIL / NOT TESTED |
| PT-17 | Kiếm vẫn huỷ khi vào làng | Ở map chính, đánh combo rồi chạy vào làng giữa combo | Combo bị huỷ khi vào làng như trước; ngoài làng đánh bình thường | PASS / FAIL / NOT TESTED |
| PT-15 | Console sạch | Mở Console suốt các mục trên | Không có lỗi đỏ mới | PASS / FAIL / NOT TESTED |

## Giới hạn nói thẳng
- Agent không chơi được game; tôi **không** tự đánh dấu PASS. P4a chỉ ACCEPTED sau khi bạn xác nhận; P4b chỉ bắt đầu sau đó.
- Ghi chú QA không chặn: một bộ đếm nội bộ của hút máu nguyên tố Dark nay về 0 mỗi lần vào map (mất tối đa vài HP hồi ở đòn đầu, không nhận ra được khi chơi).
- **Đã sửa (người dùng đồng ý 2026-11-17):** combo kiếm từng bị huỷ ở góc Đông-Nam Đấu Trường vì kiếm kiểm "trong làng" theo toạ độ cứng; nay kiếm hỏi vùng an toàn của Map hiện tại (PT-16, PT-17). QA Đạt, 751/751 test.

## Mẫu phản hồi
Mỗi dòng: `PT-xx: PASS` hoặc `PT-xx: FAIL — <mô tả / bước tái hiện>` hoặc `NOT TESTED`.

## Kết quả người dùng gửi (2026-11-17)
"pt01 -pt17 đều pass nghiệm thu p3d và p4a" → **mọi mục PASS, 0 FAIL, 0 NOT TESTED**; người dùng nghiệm thu → **ACCEPTED**.
