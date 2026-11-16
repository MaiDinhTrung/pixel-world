# PROTOTYPE PLAN

Mục tiêu: đưa **một lát cắt dọc** vào Phaser để bạn duyệt Art Bible trước khi sản xuất hàng loạt. Prototype **không xóa, không ghi đè, không đổi tên asset cũ** (CLAUDE.md quy tắc 8); bật bằng cờ URL, tắt thì game y hệt hiện nay.

Điều kiện tiên quyết: **Gói 0** (đóng băng bất biến) xong và chốt — xem FEATURE_SPEC §3. Cây Git: C2b đang chờ playtest (D12).

## 1. Nội dung lát cắt

| # | Phần | Khung | Dùng để thử | Bất biến nặng được kiểm |
|---|---|---|---|---|
| 1 | **Đấu sĩ (`knight`)** 4 hướng × idle/run/attack, bộ gear vải và bộ rồng (2 tầng), cầm Kiếm + Khiên + Búa | 48, layout 6×20 | Tay cầm vũ khí, gear 3 tầng, độ đọc, hitbox | I1–I9, E4, hand offset |
| 2 | **Quái cận chiến (`enemy`)** idle/walk/attack/death | 24 ×2 | Mật độ quái, silhouette, tách khỏi hệ Dark/minion | I10, E1–E3, E6, R7 |
| 3 | **Quái bắn xa (`rangedEnemy`)** 1 thân + 2 biến thể nguyên tố bằng palette | 24 ×2 | Dấu hệ trên sprite, telegraph 480 ms, ban đêm | I10, I12, R1–R6 |
| 4 | **Mảng làng ~12×8 ô** (nhà pack + grading + decal cũ nát, đường, đuốc procedural có anim, cây khô, bia mộ, bóng đổ) | ô 32 | E1: pack sau grading còn hợp không; ngày/đêm | I14, ambient |
| 5 | **VFX vệt chém `slash.arc` mới** (6 frame, 96 px) + impact | 96 | Độ dày, tách khỏi ambient, không che gameplay | pool ≤ 80, R3 |
| 6 | **Một khung UI**: panel đá + nút + 1 hàng 5 ô icon vật phẩm theo độ hiếm + font có dấu tiếng Việt | ~320×200 | Pipeline procedural + bake, chữ có dấu | R9, 44 CSS px |
| 7 | **Asset Gallery** (`?gallery`) | – | Xem tất cả ở 1×/3×, nền sáng/tối/đêm, lưới + điểm tay/chân/hitbox overlay | Chụp màn hình cho review |

**Không gồm:** Boss, Arena (thử chi phí cao, Q7/D11), cổng, NPC, 3 lớp còn lại, 12 vũ khí khác. Chọn vì năm rủi ro lớn nhất của cả đợt: ràng buộc tay/hitbox (1), mật độ texel (2–3), môi trường tint vs thay (4), VFX vs ambient (5), UI/font (6).

## 2. Cách tích hợp (không phá hủy)

- **Cờ `?art=v2`**: `PreloadScene` đăng ký texture `player-knight`/`enemy`/`rangedEnemy` từ module art mới **thay vì** module cũ khi cờ bật; không cờ → mã cũ chạy nguyên. Đối xứng với cơ chế `?time=night`, `?perf`, `?fog` hiện có (đọc URL).
- **Module art mới** ở `src/art/v2/` (thư mục mới, thuần: không import `entities/combat/skills/scenes`): sinh texture/anim, nhận `scene`, trả texture. Palette từ registry trong `src/config/`.
- **`?gallery`**: scene mới `GalleryScene` (đăng ký trong `gameConfig.ts`, key trong `constants.ts`); chỉ dành cho dev/duyệt, không xuất hiện trong luồng chơi.
- **Làng**: mảng làng prototype nằm **trong Gallery** (ghép từ pack + tint + decal), không sửa `world/town.ts` ở prototype.
- Prototype **in-game** chỉ gồm 1–3 (nhân vật/quái) để thử hitbox/tay/ban đêm bằng cách chơi thật.

## 3. File dự kiến (chốt bằng Grep lúc lập brief; WorldScene.ts KHÔNG nằm trong danh sách)

- **ĐƯỢC TẠO:** `src/art/v2/*` (knight, enemies, village patch, vfx slash, ui panel, font, palette registry nếu chưa có), `src/scenes/GalleryScene.ts`, `src/art/v2/*.test.ts`, `src/config/artContract.ts` (nếu Gói 0 chưa tạo), tài liệu `docs/visual-overhaul/PROTOTYPE_RESULT.md`.
- **ĐƯỢC SỬA:** `src/scenes/PreloadScene.ts` (rẽ nhánh cờ), `src/config/gameConfig.ts` (+ scene), `src/config/constants.ts` (+ key), `docs/assets/ASSET_CATALOG.md`, `docs/PROJECT_MAP.md` (sau khi C2b xử lý xong).
- Không đụng: `WorldScene.ts`, `PlayerState.ts`, logic combat, `config/combatConfig.ts`, `weaponSpriteConfig.ts`.

## 4. Tiêu chí duyệt prototype

Toàn bộ 6 tiêu chí của FEATURE_SPEC §4 áp cho lát cắt, cộng:
1. Bạn xem Gallery (ảnh chụp ở 1×/3×, ngày/đêm) và chơi 5 phút với `?art=v2`: nhân vật, quái, vệt chém đọc rõ và đúng phong cách mong muốn.
2. Chấm điểm checklist Art Bible §10 ≥ 80% cho từng asset prototype (Visual Designer chấm, bạn xác nhận).
3. Số đo hiệu năng `?perf` trước/sau (Gói 0 ghi baseline).
4. Không đổi hitbox/tay/timing (6 tiêu chí).

## 5. Rủi ro

- Đổi `placeholderPlayer.ts`-tương đương (module art mới) có thể làm vũ khí trôi tay: chặn bằng test tay + overlay Gallery.
- Grading pack có thể chưa đủ "u tối" → chuyển E2/E4 sau prototype.
- Font tiếng Việt có dấu tốn công; thử sớm trong prototype.
- **Chưa kiểm trong game:** ambient 2700 + sprite mới có làm tối quá không; cơ chế RenderTexture/erase ban đêm (COLOR_PALETTE ghi chưa chạy thử); vì vậy chơi `?time=night`.
- Không có công cụ xem ảnh cho Developer: chất lượng cảm tính phụ thuộc bạn và ảnh chụp Gallery.
