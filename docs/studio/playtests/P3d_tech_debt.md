# PLAYTEST_CHECKLIST — P3d: dọn nợ kỹ thuật sau P3 + các mục cũ chưa chơi thử

Trạng thái: **ACCEPTED** (người dùng nghiệm thu 2026-11-17) (QA Đạt, chưa commit). Ngày lập: 2026-11-17.
Nhiệm vụ: P3d (cấp L, Lean). **Không đổi gameplay.** Sửa 5 lỗi đã biết: (D1) tường thành làng tạo texture mới mỗi lần dựng làng mà không xoá (rò bộ nhớ) → nay dùng lại; (D2) listener "đóng bảng nhân vật" tích luỹ mỗi lần chơi lại/qua cổng; (D3) hướng ngắm cũ dính sang lượt mới; (D4) khoá luật dữ liệu "chỉ map Boss mới có điểm sinh riêng"; (D5) siết một test. Phần B gom các mục của gói trước **bạn chưa kiểm** (không bắt buộc, nhưng nên kiểm một lần).
Baseline: HEAD `73c7b69` + thay đổi P3d chưa commit. Brief + QA Plan: `docs/studio/lean-handoff/P3D_FEATURE_BRIEF.md`.

## Đã kiểm tự động (KHÔNG cần bạn kiểm lại)
`tsc` sạch · build qua · `npm test` 734/734 (tăng 8) · phạm vi git đúng (5 sửa + 1 tạo, không đụng file cấm) · QA tự liệt kê mọi khối tường: không hai khối khác hình nào dùng chung texture · QA đọc Phaser xác nhận lỗi listener là thật và bản sửa gỡ đúng · `WORLD` vẫn hợp lệ với luật dữ liệu mới.
**Chưa kiểm được bằng máy:** hình ảnh tường, cảm giác điều khiển sau khi đóng bảng, bộ nhớ GPU thật.

## Cách chạy
`npm run dev`, mở địa chỉ Vite in ra, F12 → Console. Cổng đỏ vào Arena ở ngoài làng, sát cổng thành phía Bắc. Tab/C/I mở bảng nhân vật.

## A. P3d (mới)
| ID | Kiểm | Thao tác | Mong đợi | Kết quả |
|---|---|---|---|---|
| PT-01 | Tường làng lúc vào game | Vào game từ menu, nhìn tường thành | Tường trồi lên từng đoạn kèm bụi ở chân tháp, hình gạch/răng cưa y như trước, không có đoạn nào méo/sai hình | PASS / FAIL / NOT TESTED |
| PT-02 | Tường sau khi vào/ra Arena | Vào Arena rồi về làng, lặp 5 lần | Mỗi lần về tường vẫn trồi lên đúng hình như PT-01; không chậm dần | PASS / FAIL / NOT TESTED |
| PT-03 | Tường sau khi chết | Chết ngoài làng, nhấn R, lặp 3 lần | Tường dựng lại đúng như PT-01 | PASS / FAIL / NOT TESTED |
| PT-04 | Đóng/mở bảng nhân vật | Mở bảng (Tab, C, I) rồi đóng, lặp ≥ 5 lần; sau mỗi lần thử di chuyển, tấn công | Sau khi đóng điều khiển được ngay, không kẹt | PASS / FAIL / NOT TESTED |
| PT-05 | Bảng nhân vật sau khi chơi lại/qua cổng | Chết + chơi lại, qua cổng 2–3 lần, rồi lặp PT-04 (cả trong Arena) | Như PT-04 | PASS / FAIL / NOT TESTED |
| PT-06 | Hướng ngắm sau lượt mới (nếu có) | Nếu có Đà Chém cấp 5: ngắm sang trái, chết, chơi lại, kích sóng chém trước khi ngắm | Sóng chém đi về bên phải (hướng mặc định), không theo hướng của lượt trước. Không có kỹ năng này thì ghi NOT TESTED | PASS / FAIL / NOT TESTED |
| PT-07 | Quái và Arena như cũ | Chơi vài phút ngoài làng rồi vào Arena | Quái ngoài làng đủ loại như trước; Arena sinh quái/Boss như trước | PASS / FAIL / NOT TESTED |
| PT-08 | Console sạch | Mở Console suốt các mục trên | Không có lỗi đỏ mới | PASS / FAIL / NOT TESTED |

## B. Mục cũ bạn chưa kiểm (từ P3a, P3c-1, M2)
| ID | Kiểm | Thao tác | Mong đợi | Kết quả |
|---|---|---|---|---|
| PT-09 | (P3a PT-08) Quái mạnh dần | Chơi vài phút ở vùng gần rồi vùng xa làng, so quái lúc đầu và lúc sau | Quái về sau mạnh hơn rõ; vùng xa mạnh hơn vùng gần | PASS / FAIL / NOT TESTED |
| PT-10 | (P3a PT-09) Elite | Hạ khoảng 25 quái ở một vùng | Elite (viền ngà, thấy từ xa cả ban đêm) xuất hiện | PASS / FAIL / NOT TESTED |
| PT-11 | (P3c-1 PT-07) Qua Arena rồi về thì bộ đếm reset | Hạ khoảng 15 quái, vào Arena, về làng, hạ tiếp | Quái và Elite sinh bình thường (bộ đếm bắt đầu lại sau khi về) | PASS / FAIL / NOT TESTED |
| PT-12 | (M2) Nhận ra Swarmer/Brute | Ở vùng xa, quan sát quái | Phân biệt được quái nhỏ nhanh (Swarmer) và quái to chậm đau (Brute) với grunt/caster, cả trên màn nhỏ và ban đêm (`?time=night` hoặc phím N) | PASS / FAIL / NOT TESTED |
| PT-13 | (M2) Lên cấp | Chơi 5–10 phút từ cấp 1 | Tốc độ lên cấp hợp lý, không quá nhanh/chậm (cảm nhận) | PASS / FAIL / NOT TESTED |

## Giới hạn nói thẳng
- Agent không chơi được game; tôi **không** tự đánh dấu PASS. P3d chỉ được ghi ACCEPTED sau khi bạn xác nhận.
- Ghi chú QA không chặn: hai đoạn tường Tây/Đông có độ dài số lẻ nên có thể tạo thêm vài texture cố định (không rò, không ảnh hưởng hình).
- Lỗi đã biết còn lại, **chưa sửa vì cần quyết định thiết kế**: L5 (vùng sạch quanh cổng về trong Arena không chặn đạn/đòn quét: có nên chặn không?), `goldMult` của quái chưa dùng (cân bằng kinh tế).

## Mẫu phản hồi
Mỗi dòng: `PT-xx: PASS` hoặc `PT-xx: FAIL — <mô tả / bước tái hiện>` hoặc `NOT TESTED`.

## Kết quả người dùng gửi (2026-11-17)
"pt01 -pt17 đều pass nghiệm thu p3d và p4a" → **mọi mục PASS, 0 FAIL, 0 NOT TESTED**; người dùng nghiệm thu → **ACCEPTED**.
