# PLAYTEST_CHECKLIST — ST-03: Reuse Intelligence & Knowledge Maintenance

Trạng thái: **ACCEPTED** (2026-11-18, người dùng: "Nghiệm thu st03" — nghiệm thu chung, cột Kết quả để nguyên). Ngày lập: 2026-11-18.
Nhiệm vụ: ST-03 (cấp L, chỉ tài liệu quy trình). **Nội dung mới:** không có gì thay đổi trong game; đây là checklist đọc tài liệu và đánh giá quy trình. Bạn không cần chạy `npm run dev`.
Baseline: HEAD `7b7c23a0def65ebccff47e242d23ffad29f6df74` + thay đổi chưa commit. Brief: `docs/studio/lean-handoff/ST-03_FEATURE_BRIEF.md`. Task Map: `docs/studio/tasks/ST-03_reuse_intelligence.md`.

## Đã kiểm tự động (KHÔNG cần bạn kiểm lại)
`npm run build` · `npm test` 778/778 (44 file) · `tsc --noEmit` · phạm vi git (17 file sửa, 2 file tạo, đều trong danh sách) · dòng `tools:`/`name:`/`description:` của 4 agent không đổi · `settings*`, hook, `src/`, `public/`, `docs/codemap/` không đổi · dry-run Q1–Q8 (QA PASS, không lỗi Chặn).
**Chưa kiểm được:** hành vi của Lead ở một phiên thật (chỉ biết tài liệu đủ để làm theo, chưa chứng minh Lead sẽ làm đúng); hook self-test (ngoài allowlist của QA; hook không đổi theo git).

## Cách xem
Mở các file dưới đây trong editor; không cần chạy game.

| ID | Kiểm | Thao tác | Mong đợi | Kết quả |
|---|---|---|---|---|
| PT-01 | Reuse Analysis đọc được | Đọc `docs/studio/WORKFLOW.md` §13.4 | Hiểu ngay: 5 nhãn, bảng REUSE/MODIFY/CREATE, "không tái dùng bằng mọi giá", cấp S được bỏ | PASS / FAIL / NOT TESTED |
| PT-02 | Bảng trong Task Map | Xem `docs/studio/templates/TASK_MAP.md` mục "Reuse Analysis" | Bảng 4 cột, có chỗ ghi kết quả tìm khi CREATE | PASS / FAIL / NOT TESTED |
| PT-03 | Cổng 1 cho thay đổi cấu hình | Đọc `WORKFLOW.md` §5 (dòng "Việc nhỏ") và §13.4 | Chỉ đổi cấu hình/tham số thì một câu xác nhận; số liệu combat/enemy vẫn cần Cổng 1; bạn đồng ý cách chia này | PASS / FAIL / NOT TESTED |
| PT-04 | Knowledge Maintenance | Đọc `WORKFLOW.md` §13.5 | Rõ 3 thời điểm (trước/khi/sau + trước đóng); chỉ sửa codemap bị ảnh hưởng | PASS / FAIL / NOT TESTED |
| PT-05 | Asset Catalog đúng | Đọc `docs/assets/ASSET_CATALOG.md` mục 1 và 5; mở `public/assets/village/` đối chiếu | Đường dẫn có thật; chỉ `bridge` ghi "chưa dùng"; mục Rừng Úa khớp `src/world/witheredWoods.ts` | PASS / FAIL / NOT TESTED |
| PT-06 | Tái dùng nhanh | Đọc đầu `ASSET_CATALOG.md` ("Tái dùng nhanh") | Biết đi đâu khi làm map/quái/vũ khí/cổng mới | PASS / FAIL / NOT TESTED |
| PT-07 | Văn bản agent | `git diff HEAD -- .claude/agents` | Chỉ thêm câu về bảng Reuse; không đổi `tools:`, quyền, hook | PASS / FAIL / NOT TESTED |
| PT-08 | Không quá tay | Xem `git diff HEAD --stat` | Không thấy sửa `src/`, `public/`, `docs/codemap/`, `settings*`, hook; không thấy bản sao asset | PASS / FAIL / NOT TESTED |
| PT-09 | Script kiểm kê | Đọc `docs/assets/README.md` (đoạn "Kiểm kê tự động") | Chỉ có đánh giá, chưa có script; đồng ý ngưỡng "≥ 100 file" | PASS / FAIL / NOT TESTED |
| PT-10 | Nên thử thật | Giao một task cấp M thật (vd "map mới dựa trên Rừng Sâu") | Lead lập bảng Reuse đúng nguồn (không bắt buộc ở lần nghiệm thu này) | PASS / FAIL / NOT TESTED |

## Giới hạn nói thẳng
- Agent không chơi/đánh giá thay bạn; Lead không tự đánh PASS. ST-03 chỉ ACCEPTED sau khi bạn xác nhận.
- Lỗi đã biết, không chặn (QA): mục 5 của catalog không nhắc đăng ký Map ở `worldConfig.ts` (đã thêm 1 dòng chỉ chỗ này); thứ tự mục 9/10 ở `AI_STUDIO_PROCESS_MAP.md` §9.6 (đã sửa). Luồng §4 của process map chưa vẽ lại bước Reuse (cố ý, ghi ở mục 10).

## Mẫu phản hồi
Mỗi dòng: `PT-xx: PASS` · `PT-xx: FAIL — <mô tả>` · `PT-xx: NOT TESTED`.
