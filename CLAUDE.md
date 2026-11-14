# Pixel World — hướng dẫn cho Claude

Phaser 4 + TypeScript + Vite. Lệnh: `npm run dev`, `npm run build` (chạy `tsc` trước).

## Quy tắc làm việc
1. Đầu nhiệm vụ: xác định phạm vi thay đổi (chức năng nào, file/hệ thống nào bị ảnh hưởng).
2. Dùng `docs/PROJECT_MAP.md` (mục "Tìm file khi cần sửa…") để định vị file.
3. Chỉ đọc file/đoạn code liên quan; với file lớn (`WorldScene.ts`, `CharacterPanelScene.ts`, `placeholderPlayer.ts`, `skills.ts`) dùng Grep rồi đọc theo offset/limit.
4. Nếu bản đồ thiếu hoặc sai: mở rộng tìm kiếm bằng Grep/Glob, rồi sửa bản đồ.
5. Không tự động đọc toàn bộ dự án; không đọc `node_modules/`, `dist/`, `package-lock.json`.
6. Khi đổi cấu trúc file hoặc trách nhiệm (thêm/xóa/đổi tên/di chuyển), cập nhật `docs/PROJECT_MAP.md` trong cùng thay đổi.
7. Số liệu cân bằng nằm ở `src/config/`; đừng hard-code trong logic.
8. Trước khi tạo asset mới (sprite, texture, VFX, anim, âm thanh): tra `docs/assets/ASSET_CATALOG.md` và làm theo quy trình ở `docs/assets/README.md` (tái dùng trước, đặt tên theo `ASSET_NAMING.md`, cập nhật catalog cùng thay đổi). Không di chuyển/đổi tên/xóa asset khi chưa được xác nhận.
