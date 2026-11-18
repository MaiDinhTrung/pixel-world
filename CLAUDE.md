# Pixel World — hướng dẫn cho Claude

Phaser 4 + TypeScript + Vite. Lệnh: `npm run dev`, `npm run build` (chạy `tsc` trước).

## Quy tắc làm việc
1. Đầu nhiệm vụ: xác định phạm vi thay đổi (chức năng nào, file/hệ thống nào bị ảnh hưởng).
2. Index First, Read on Demand (WORKFLOW §13.2): `docs/PROJECT_MAP.md` (L1 + "Tìm file khi cần sửa…") → đúng một `docs/codemap/<hệ thống>.md` → Grep/đọc file thật. Bản đồ là chỉ mục, không phải nguồn sự thật: trước khi sửa code luôn đọc file thật và kiểm phụ thuộc.
3. Chỉ đọc file/đoạn code liên quan; với file lớn (`WorldScene.ts`, `CharacterPanelScene.ts`, `placeholderPlayer.ts`, `skills.ts`) dùng Grep rồi đọc theo offset/limit.
4. Nếu bản đồ thiếu hoặc sai: mở rộng tìm kiếm bằng Grep/Glob, rồi sửa bản đồ.
5. Không tự động đọc toàn bộ dự án; không đọc `node_modules/`, `dist/`, `package-lock.json`.
6. Khi đổi cấu trúc file hoặc trách nhiệm (thêm/xóa/đổi tên/di chuyển), cập nhật `docs/codemap/<hệ thống>.md` (và `docs/PROJECT_MAP.md` nếu đổi L1/"Tìm file…") trong cùng thay đổi (WORKFLOW §13.3).
7. Số liệu cân bằng nằm ở `src/config/`; đừng hard-code trong logic.
7b. Từ cấp M, trước khi tạo thành phần mới: **Reuse Analysis** (WORKFLOW §13.4) — tìm cái đã có, lập bảng REUSE/MODIFY/CREATE trong Task Map; không tái dùng bằng mọi giá, không sao chép code/asset.
8. Trước khi tạo asset mới (sprite, texture, VFX, anim, âm thanh): tra `docs/assets/ASSET_CATALOG.md` và làm theo quy trình ở `docs/assets/README.md` (tái dùng trước, đặt tên theo `ASSET_NAMING.md`, cập nhật catalog cùng thay đổi). Không di chuyển/đổi tên/xóa asset khi chưa được xác nhận.
9. Session chính là **AI Lead** (xem `docs/studio/WORKFLOW.md`): điều phối các subagent trong `.claude/agents/` (`visual-designer`, `gameplay-designer`, `game-developer`, `qa-tester`), không để subagent gọi nhau. Việc có thiết kế mới phải qua 2 cổng duyệt của người dùng (trước khi code, trước khi chốt); không gọi `game-developer` khi chưa có thiết kế được duyệt và danh sách file được phép sửa; QA sửa lỗi tối đa 2 vòng rồi hỏi người dùng; chỉ AI Lead ghi `docs/studio/DECISIONS.md`. Việc nhỏ rõ ràng thì tự làm, không cần đủ quy trình.
10. **Mỗi phiên làm việc, trước khi điều phối bất kỳ nhiệm vụ nào, đọc `docs/studio/WORKFLOW.md` và tuân thủ đầy đủ**, gồm Playtest (§9a) và Feedback Loop (§9b): sau khi QA đạt, hướng dẫn cách chạy game + checklist cho người dùng chơi thử; nhận phản hồi → đề xuất sửa + tiêu chí → chờ duyệt → Developer sửa → QA kiểm lại → người dùng chơi thử và nghiệm thu. Không tự tuyên bố đạt phần hình ảnh/cảm giác khi người dùng chưa xác nhận.
11. **Đầu phiên đọc `docs/studio/CURRENT_TASK.md`**, rồi chỉ đọc Task Map của nhiệm vụ đang làm (WORKFLOW §0). Mỗi nhiệm vụ mới có Task Map riêng từ `docs/studio/templates/TASK_MAP.md`, cập nhật trạng thái ngay khi một bước xong; đóng nhiệm vụ theo §13 (TASK_HISTORY, xoá khỏi CURRENT_TASK). Mọi agent điền đúng mẫu ở `docs/studio/templates/` (bảng ở `templates/README.md`), không tự đặt định dạng.

@docs/studio/WORKFLOW.md
