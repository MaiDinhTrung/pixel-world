# DESIGN PILLARS — Định hướng thiết kế tổng thể

Ghi ngày 2026-11-15 theo chỉ đạo của người dùng. Đây là **định hướng**, không phải đặc tả: không thay đổi quyết định đã có trong `docs/studio/DECISIONS.md`. Khi đề xuất mới mâu thuẫn với tài liệu này, AI Lead nêu rõ cho người dùng quyết.

Nguyên tắc chung: **chỉ học nguyên tắc và cảm giác của game tham khảo; dùng IP, nhân vật, hình ảnh, kỹ năng nguyên bản; không sao chép tài sản hoặc thiết kế đặc trưng.**

## 1. Visual — cảm hứng Soul Knight
- Pixel Art, hình ảnh rõ ràng; nhân vật và quái vật có **silhouette dễ nhận diện**; animation sinh động.
- Quan hệ với Grim Dark: Grim Dark là **bản sắc** (tông màu, không khí, ánh sáng), Soul Knight là **cách thể hiện** (độ rõ, silhouette, nhịp animation). Bảng màu và quy chuẩn: `docs/assets/COLOR_PALETTE.md`, `docs/assets/ANIMATION_GUIDE.md`, `docs/assets/VFX_GUIDE.md`.

## 2. World & Gameplay — cảm hứng Ngọc Rồng Online (MMORPG 2D)
- Trọng tâm: khám phá bản đồ, luyện cấp, săn quái, Boss, trang bị, phát triển nhân vật.
- Đã có: Làng Khởi Nguyên, Boss Arena (cổng dịch chuyển), tiến trình lớp/cấp/trang bị.

## 3. Combat & Skills — cảm hứng Diablo (Action RPG)
- Trọng tâm: kỹ năng có chiều sâu, hiệu ứng chiến đấu mạnh, combo, sát thương diện rộng, khống chế.
- Thiết kế lớp/kỹ năng hiện hành: `docs/CLASS_REDESIGN.md`, `docs/CLASS_EXPANSION.md`. Số liệu ở `src/config/`.

## 4. Identity — Grim Dark Fantasy
- Giữ bản sắc Grim Dark Fantasy đã thống nhất.
- Dùng IP, nhân vật, hình ảnh, kỹ năng **nguyên bản**. Ảnh trong `docs/references/visual/` chỉ để học nguyên tắc (xem README ở đó).

## Cách dùng
- Designer đối chiếu đề xuất với bốn trụ cột này; Lead ghi mâu thuẫn (nếu có) vào brief cho người dùng.
- Tài liệu này không chứa số liệu cân bằng.
