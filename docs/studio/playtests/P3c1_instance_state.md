# PLAYTEST_CHECKLIST — P3c-1: InstanceGameplayState

Nhiệm vụ: P3c-1 (cấp L, Lean). **Không đổi gameplay**: các bộ đếm sinh quái và Elite (số lần sinh, đếm sinh theo vùng, đếm hạ quái theo vùng, số Elite, thời điểm Elite gần nhất, nhịp sinh) được gom vào một đối tượng tạo mới mỗi lần vào map, thay vì bảy trường rải trong scene. Mục tiêu chơi thử: xác nhận nhịp sinh quái, mẫu quái theo vùng và Elite vẫn y hệt, và các bộ đếm reset đúng lúc.
Baseline: HEAD `56dc833` + thay đổi P3c-1 chưa commit. Brief + QA Plan: `docs/studio/lean-handoff/P3C1_FEATURE_BRIEF.md`. Ngày lập: 2026-11-17.
Bản tick được (trang artifact): https://claude.ai/artifact/JWwmfugxuh1QmQVXLxN3cV

## Đã kiểm tự động (KHÔNG cần bạn kiểm lại)
`tsc` sạch · build qua · `npm test` 706/706 (tăng 6) · phạm vi git đúng (2 sửa + 2 tạo, `BossArenaScene.ts`/`progression/`/`config/`/`entities/`/`systems/`/`ui/` diff rỗng) · không còn 7 trường cũ trong scene · mỗi `create()` tạo đối tượng mới, Map độc lập (test) · QA đối chiếu từng hunk với bản gốc: thứ tự đọc/ghi giữ nguyên, `nextSpawnAt = startNow + 1000` ở đúng điểm cũ, đối tượng được tạo trước mọi chỗ dùng.
**Chưa kiểm được bằng máy:** nhịp sinh thật, Elite sau 25 quái, reset khi chết hoặc qua cổng.

## Cách chạy
`npm run dev`, mở địa chỉ Vite in ra, F12 → Console. Elite xuất hiện sau khoảng 25 quái thường hạ trong cùng một vùng.

| ID | Kiểm | Thao tác | Mong đợi | Kết quả |
|---|---|---|---|---|
| PT-01 | Nhịp sinh quái | Vào game, đứng ngoài làng một lúc | Quái sinh đều như trước: lúc vào đã có sẵn một số quái, bị hạ thì được bổ sung dần; nhịp nhanh hơn khi chơi lâu | PASS / FAIL / NOT TESTED |
| PT-02 | Mẫu quái vùng gần và vùng xa | Quan sát loại quái ở vùng gần, rồi vùng xa | Có quái nhỏ nhanh ở cả hai vùng; quái nặng thấy rõ hơn ở vùng xa như trước | PASS / FAIL / NOT TESTED |
| PT-03 | Elite sau khoảng 25 quái | Hạ liên tục quái ở một vùng | Elite xuất hiện sau khoảng 25 quái, có dấu hiệu nhận biết và thưởng như trước | PASS / FAIL / NOT TESTED |
| PT-04 | Đếm Elite theo từng vùng | Hạ khoảng 12 quái ở vùng gần, qua vùng xa hạ thêm | Mỗi vùng đếm riêng, không cộng chung; Elite mới chỉ ra khi một vùng đủ số | PASS / FAIL / NOT TESTED |
| PT-05 | Đếm Elite reset sau khi Elite ra | Hạ Elite rồi tiếp tục đánh ở cùng vùng | Phải hạ thêm khoảng 25 quái mới có Elite kế (không ra liên tục) | PASS / FAIL / NOT TESTED |
| PT-06 | **Chết thì bộ đếm reset** | Hạ khoảng 15 quái, để chết, nhấn R, hạ tiếp | Elite không ra sớm sau khi chơi lại: phải đủ khoảng 25 quái từ đầu | PASS / FAIL / NOT TESTED |
| PT-07 | Qua Arena và về thì reset như trước | Hạ khoảng 15 quái, vào Arena, về làng, hạ tiếp | Hành vi y như trước P3c-1 (scene dựng lại nên bộ đếm về 0); quái và Elite sinh bình thường | PASS / FAIL / NOT TESTED |
| PT-08 | Quái con Arena sau Boss | Hạ Boss trong Arena | Quái con sinh ra sau khi hạ Boss, dừng khi tới giờ Boss kế | PASS / FAIL / NOT TESTED |
| PT-09 | Lịch Boss vẫn đúng | Theo dõi HUD "TRÙM SAU …" khi chơi | Đếm ngược và Boss chờ ở Arena như trước | PASS / FAIL / NOT TESTED |
| PT-10 | Console sạch | Mở Console, chơi qua các mục trên | Không có lỗi đỏ mới | PASS / FAIL / NOT TESTED |

## Giới hạn nói thẳng
- Agent không chơi được game; tôi sẽ **không** tự đánh dấu PASS.
- Số 25 quái là giá trị đã có từ trước (`ELITE_KILLS_INTERVAL`), không đổi trong P3c-1.
- PT-06 là mục quan trọng nhất (bộ đếm trước đây được đặt về 0 từng trường, nay do tạo đối tượng mới).

## Kết quả người dùng gửi (2026-11-17)
**9 Đạt, 0 Không đạt, 1 Chưa kiểm tra / 10.** PT-01, 02, 03, 04, 05, 06 (mục quan trọng nhất: chết thì bộ đếm reset), 08, 09, 10: Đạt. **PT-07 (qua Arena và về thì bộ đếm reset như trước): Chưa kiểm tra.** Không có lỗi ngoài checklist.
Ghi chú Lead: PT-07 dựa trên việc `WorldScene` dựng lại khi qua cổng nên `create()` tạo `instanceState` mới (cùng cơ chế đã được PT-06 xác nhận khi chết); QA đã đối chiếu mã và test khoá `createInstanceGameplayState()` gọi trong `create`.

## Nghiệm thu
**P3c-1: ACCEPTED** (người dùng, 2026-11-17: "nghiệm thu p3c và commit đi"), với 9/10 Đạt và **PT-07 chưa kiểm bằng chơi thật** (cùng cơ chế với PT-06 đã đạt; khoá bằng test và QA đọc mã). Commit theo lệnh người dùng. P3c-2 chưa bắt đầu.
