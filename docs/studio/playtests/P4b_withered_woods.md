# PLAYTEST_CHECKLIST — P4b: Region Rừng Úa, Map Rừng Sâu

Trạng thái: **ACCEPTED** — người dùng nghiệm thu chung 2026-11-17 ("p4b nghiệm thu"; không gửi kết quả từng mục PT, các cột Kết quả để nguyên). QA Đạt, chưa commit. Ngày lập: 2026-11-17.
Nhiệm vụ: P4b (cấp L/XL, Lean). **Nội dung mới:** Region thứ hai **Rừng Úa** với Map **Rừng Sâu** gồm 2 vùng **Bìa Rừng** (nửa Nam, quái khởi điểm bậc 1) và **Lõi Rừng** (nửa Bắc, bậc 3). Không Boss, không vùng an toàn, ánh sáng cố định hoàng hôn, chỉ dùng hình ảnh có sẵn của làng. Map chính và Đấu Trường giữ nguyên.
Baseline: HEAD `e3ca803` + P4b chưa commit. Brief + QA Plan: `docs/studio/lean-handoff/P4B_FEATURE_BRIEF.md`.

## Đã kiểm tự động (KHÔNG cần bạn kiểm lại)
`tsc` sạch · build qua · `npm test` 778/778 (tăng 27) · phạm vi git đúng (8 sửa + 3 tạo, không đụng save/combat/asset) · dữ liệu world hợp lệ: 2 Region, 3 Map · đi hai chiều làng ↔ Rừng đúng đích; về từ Rừng ra cạnh cổng Rừng (Hoang Địa Sâu), về từ Arena vẫn ra giữa làng · bậc khởi điểm 1/3 · mỗi vùng 4 điểm sinh quái · cổng Arena giữ chữ cũ · không asset mới (chỉ key làng có sẵn, cổng dùng màu xanh có sẵn) · làng chỉ thêm cổng Rừng, không đổi gì khác.
**Chưa kiểm được bằng máy:** hình ảnh, độ khó, hiệu năng mobile, luồng chơi thật.

## Cách chạy
`npm run dev`, mở địa chỉ Vite in ra, F12 → Console. **Cổng Rừng (xanh lục, nhãn "Rừng Sâu")**: từ làng đi theo đường lát đá chính về **phía Đông** tới gần mép map (Hoang Địa Sâu). Cổng Đấu Trường (đỏ) vẫn ở phía Bắc làng. Nên có nhân vật cấp vừa phải vì Lõi Rừng bắt đầu ở bậc 3.

| ID | Kiểm | Thao tác | Mong đợi | Kết quả |
|---|---|---|---|---|
| PT-01 | Thấy cổng Rừng | Đi theo đường lát đá về phía Đông tới gần mép map | Cổng xanh nhãn "Rừng Sâu", không bị cây/vật che, không kẹt đường đi | PASS / FAIL / NOT TESTED |
| PT-02 | Lời nhắc cổng | Đứng sát cổng Rừng; rồi đứng sát cổng Đấu Trường | Cổng Rừng: "NHẤN F ĐỂ VÀO RỪNG SÂU"; cổng Đấu Trường vẫn "… VÀO ĐẤU TRƯỜNG" | PASS / FAIL / NOT TESTED |
| PT-03 | Vào Rừng | Sạc cổng, vào | Fade xanh rêu, đứng phía Nam Rừng, biển tên **Bìa Rừng** hiện | PASS / FAIL / NOT TESTED |
| PT-04 | Rừng nhìn khác làng | Đi quanh Rừng | Hoàng hôn ngả xanh, rừng dày (cây sồi, bụi, đá, hồ), nhận ra ngay không phải làng hay Hoang Địa; không có nhà/NPC | PASS / FAIL / NOT TESTED |
| PT-05 | Ánh sáng cố định | Trong Rừng nhấn N, tìm nút ngày/đêm | Không có nút, N không đổi pha | PASS / FAIL / NOT TESTED |
| PT-06 | Đi vào Lõi Rừng | Đi lên phía Bắc | Biển tên **Lõi Rừng** hiện; có lối đi rõ, không bị cây chặn kín | PASS / FAIL / NOT TESTED |
| PT-07 | Độ khó theo vùng | Đánh quái ở Bìa Rừng rồi ở Lõi Rừng | Bìa Rừng tương đương Hoang Địa Sâu lúc đầu; Lõi Rừng trâu/đau hơn rõ. Ghi lại cảm nhận: quá dễ / vừa / quá khó | PASS / FAIL / NOT TESTED |
| PT-08 | Quái đa dạng + Elite | Hạ khoảng 25 quái ở một vùng | Có nhiều loại (grunt, swarmer, caster, brute ở Lõi); Elite xuất hiện | PASS / FAIL / NOT TESTED |
| PT-09 | Không có vùng an toàn giả | Đi khắp Rừng, kể cả góc Đông-Nam và giữa map | Đánh được ở mọi nơi (kể cả combo kiếm 3 đòn), quái không bị đẩy đi đâu | PASS / FAIL / NOT TESTED |
| PT-10 | Đồng hồ Boss | Ở Rừng tới khi đồng hồ Boss hết | Đồng hồ vẫn chạy; báo "TRÙM ĐANG CHỜ Ở ĐẤU TRƯỜNG"; Boss **không** sinh trong Rừng | PASS / FAIL / NOT TESTED |
| PT-11 | Về Hoang Địa | Dùng cổng về (cạnh chỗ xuất hiện trong Rừng, nhãn "Về Hoang Địa") | Lời nhắc "VỀ HOANG ĐỊA"; ra **cạnh cổng Rừng** ở phía Đông map chính (không ra giữa làng); HP/hồi chiêu/đồng hồ Boss giữ | PASS / FAIL / NOT TESTED |
| PT-12 | Chết ở Rừng | Để chết trong Rừng, nhấn R | Về giữa làng, lượt mới; trang bị/túi/vàng/level còn | PASS / FAIL / NOT TESTED |
| PT-13 | Ba map qua lại | Làng → Rừng → làng → Đấu Trường → làng → Rừng, vài vòng | Không lỗi, không chậm dần; mỗi map đúng hình/ánh sáng của nó | PASS / FAIL / NOT TESTED |
| PT-14 | Tải lại trang ở Rừng | Đang ở Rừng, F5, vào lại | Vào làng như thường; save còn | PASS / FAIL / NOT TESTED |
| PT-15 | Đấu Trường + làng không đổi | Vào Đấu Trường, đánh Boss, về làng | Như P4a (đã nghiệm thu) | PASS / FAIL / NOT TESTED |
| PT-16 | Mobile (nếu có) | Mở trên điện thoại, đi khắp Rừng | Không giật rõ so với làng (Rừng có 47 cây, nhiều hơn làng 21 cây, nhưng tổng vật thể ít hơn) | PASS / FAIL / NOT TESTED |
| PT-17 | Console sạch | Mở Console suốt các mục trên | Không có lỗi đỏ mới | PASS / FAIL / NOT TESTED |

## Giới hạn nói thẳng
- Agent không chơi được game; tôi **không** tự đánh dấu PASS. P4b chỉ ACCEPTED sau khi bạn xác nhận.
- Mọi số (bậc, mẫu quái, vị trí, màu hoàng hôn, mật độ cây) là **giá trị khởi điểm** ở `src/config/witheredWoodsConfig.ts`; báo cảm nhận để chỉnh.
- Lỗi đã biết, không chặn (chỉ khi dùng tham số gỡ lỗi): với `?atmo=off`/`?vignette=0` Rừng mất viền tối (vignette) và lớp hoàng hôn vẫn bật (làng thì tắt theo). Chơi bình thường không gặp.

## Mẫu phản hồi
Mỗi dòng: `PT-xx: PASS` hoặc `PT-xx: FAIL — <mô tả / bước tái hiện>` hoặc `NOT TESTED`. PT-07 kèm cảm nhận độ khó.
