# CHARACTER DESIGN SPECIFICATION

Phạm vi: 4 lớp hiện có (`knight` Đấu sĩ, `ranger`, `mage`, `necromancer`) [XM `config/characters.ts`, ASSET_CATALOG]. Phân loại: **Hybrid** (lưới theo bộ phận + hàm lắp ghép) — xem ASSET_INVENTORY §1. Tên hiển thị tiếng Việt chưa đọc lại [?].

## 1. Ràng buộc kỹ thuật [XM]

- Sheet khung **48 px**, 6 cột × 20 hàng (`placeholderPlayer.ts:1055-1059`); 4 hướng `down/left/right/up`; tên frame `<hướng>-<action>-<i>`; anim `<animPrefix>-<hướng>-<action>`. Số frame/fps: idle 4/4, run 6/11, attack 4/13, hurt 1/6, death 4/7.
- **Hitbox:** `setBodySize(24,28)` + `setOffset(12,16)`, origin 0.5, scale 1 (`Player.ts:181-184`) → đáy hitbox ở hàng 44/48. Chân/bóng của art phải khớp. Scale nhân cả body: Cuồng Nộ ×1.3, Khổng Lồ (`Player.ts:734,1026,1344`).
- **Điểm tay:** `getHeroHandOffset` (`placeholderPlayer.ts:1072-1130`) tra tay theo **tên frame + thứ tự frame** bằng công thức, **không đọc từ ảnh**: bob idle `[0,0,1,0]`, run `[0,1,0,0,1,0]`; swing run `[3,2,0,-3,-2,0]`; reach attack `[3,6,9,6]`; hurt −2. Tay chính: down `(12,32)` (đánh `(23,31+reach)`); up `(37,32)` (đánh `(23,13−reach)`); left `(6.5,28.5)`; right `(42.5,28.5)`; tay phụ down `(37,32)`, up `(12,32)`, left `(33,31)`, right `(15,31)`. **Art mới phải đặt bàn tay đúng các điểm này**, hoặc đổi công thức (đụng code → cần duyệt riêng).
- **Muzzle** (điểm bắn) tính từ **tâm người** + `muzzle` theo hướng ngắm, không theo tay (`weaponSprite.ts:75-84`).
- **Thanh trên đầu** đặt theo `player.displayHeight/2` (đỉnh khung, không phải đỉnh art; `PlayerBars.ts:6-12,53`).
- **Depth** `y+20`, vũ khí `y+21` (`Player.ts:192`, `weaponSpriteConfig.ts:38`).
- **Anim attack bị khóa 260 ms** dù clip 4 frame@13 = 308 ms (`Player.ts:53,416`): frame cuối chỉ hiện ~29 ms. Hurt khóa 200 ms; bất tử 900 ms nhấp nháy 80 ms.
- **Vẽ lại theo gear:** `resolveGearLook(equippedGear)` → `{hat, armor, boots}`; `gearLookKey` làm khóa; sheet được vẽ lại khi đổi trang bị (`WorldScene` `refreshHeroLook`). Mũ 3 kiểu `hood/helm/crown`, giáp 3 màu (armor/armorDark/belt), giày 1 màu.

## 2. Silhouette và bảng màu [ĐX]

| Lớp | Silhouette | Màu cơ sở | Dấu nhận diện |
|---|---|---|---|
| Đấu sĩ `knight` | Vai rộng, tư thế vững, đầu nhỏ | Sắt xám lạnh + nâu da + một mảng đỏ máu | Khăn đỏ, vai giáp vuông |
| Cung thủ `ranger` | Gầy, mũ trùm, áo choàng ngắn | Rêu tối + nâu đất + nhấn xanh lục | Mũ trùm, bao tên |
| Pháp sư `mage` | Cao, áo dài rộng ở chân | Tím xám + xám lạnh + nhấn cyan | Mũ nhọn, tay áo rộng |
| Triệu hồi `necromancer` | Gầy, vai gập, mũ trùm có sừng | Đen xanh + tím hư không + xương | Sọ/xương nhỏ, mắt sáng tím |

Quy tắc: viền ngoài 1 px màu tối của vật liệu; rim light trên-trái 1 px (người chơi được phép); 4 mức shade + tối đa 1 nhấn; hướng sáng trên-trái; kiểm silhouette tô đặc.

## 3. Ba tầng trang bị (tích hợp với cơ chế vẽ lại)

Giữ nguyên khung dữ liệu `GearLook`; chỉ nâng chất lượng hàm vẽ mũ/giáp/giày:

| Tầng | Mũ | Giáp | Giày | Nhận diện |
|---|---|---|---|---|
| Vải | Mũ trùm (hạ bão hòa tím `#6d5a8e`) | Áo choàng, dây thắt | Giày rách nâu | Mềm, nhiều nếp |
| Sắt | Mũ sắt có khe nhìn | Giáp ngực + vai | Giày bọc thép | Cạnh cứng, đinh tán |
| Rồng/Hư không | Vương miện có sừng + ngọc đỏ | Giáp đỏ máu, gai, khung vàng | Giày hư không tím (rim sáng) | Silhouette đổi (sừng/gai) + **1–2 px phát sáng** (màu lõi nguyên tố) để nổi dưới ambient đêm |

## 4. Animation cần có (giữ số frame/fps; giữ trong giới hạn 260 ms)

| Action | Frame | Hướng | Ghi chú |
|---|---|---|---|
| idle | 4 | 4 | Thở 1 px; vạt áo bay nhẹ ở frame 3 |
| run | 6 | 4 | Chân xen kẽ, thân nghiêng, vạt áo theo; tay bám bob/swing |
| attack | 4 | 4 | F1 thu lại, F2–3 vươn (bám reach `[3,6,9,6]`), F4 hồi. **Chỉ F1–F3 thực sự hiện** vì bị cắt 260 ms |
| hurt | 1 | 4 | Ngửa, flash; tay lùi |
| death | 4 | 4 | Quỵ → ngã → nằm; `getHeroHandOffset` trả `null` cho death (đã xử lý) |

Mở rộng số frame attack chỉ khi tổng clip ≤ 260 ms **và** hand offset được cập nhật tương ứng (đề xuất riêng).

## 5. Tiêu chí riêng cho nhân vật (bổ sung vào 6 tiêu chí ở FEATURE_SPEC)

1. Test art contract: mọi key frame/anim tồn tại, đủ 4 hướng × 5 action × đúng số frame, sheet 288×960.
2. Test tay: `getHeroHandOffset` nằm trong khung 48 cho mọi (hướng, action, frame); bàn tay trong art trùng điểm này (kiểm bằng gallery overlay).
3. Chân/bóng ở hàng ~44; thân nằm gọn quanh vùng body 24×28.
4. Vũ khí không trôi khỏi tay khi: idle/run/attack, 4 hướng, Cuồng Nộ ×1.3, nhảy Đập Đất (`visualLift`), cầm khiên (off-hand), 12 vũ khí.
5. Đổi mũ/giáp/giày: ngoại hình đổi, không tụt FPS (vẽ lại sheet).
