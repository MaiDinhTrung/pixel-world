# ART BIBLE — "Tàn Tích Còn Ấm"

Trạng thái: đề xuất, chờ duyệt. Mọi hex là **giá trị khởi đầu**, chưa đo trong game. Quyết định màu đã duyệt (`docs/assets/COLOR_PALETTE.md`) **được giữ nguyên**; mọi thay đổi nằm ở [PALETTE_PROPOSALS.md](PALETTE_PROPOSALS.md) và chỉ có hiệu lực khi được duyệt riêng.

Ảnh tham chiếu đã xem (6/48): Diablo II (môi trường), Soul Knight (nhân vật), vũ khí, VFX kỹ năng, UI, ánh sáng. Chỉ học **nguyên tắc**: nền đất tương phản thấp với một điểm sáng ấm; nhân vật đầu to, viền tối, 3–4 mảng màu; icon ô vuông nền tối viền màu theo loại; khung UI đá nặng, vật phẩm màu bão hòa nổi trên nền ít bão hòa. Không sao chép asset/thiết kế/IP nào.

## 1. Tầm nhìn và sáu nguyên tắc

Thế giới cổ xưa, ẩm lạnh, bị bỏ quên nhưng vẫn còn lửa, người và phép thuật. Màu lạnh/tối ≈ 80% diện tích; màu ấm hoặc phép thuật ≈ 20%, luôn gắn với thứ có ý nghĩa gameplay (lửa, máu, phép, đồ hiếm).

1. **Đọc được trước, đẹp sau.** Người chơi, quái, đạn, vòng báo trước tách khỏi nền ở mọi điều kiện ngày/đêm/Arena.
2. **Silhouette trước chi tiết.** Tô đen toàn bộ vẫn nhận ra loại.
3. **Màu bão hòa là tài nguyên khan hiếm.** Nền bão hòa thấp; chỉ lửa, máu, phép thuật, đồ hiếm, UI trọng yếu được bão hòa cao.
4. **Chiều sâu bằng giá trị sáng, không bằng độ mờ.**
5. **Mỗi khu một màu chủ đạo phụ, chung một bảng nền.**
6. **Chỉ đổi sprite/animation/VFX.** Hitbox, số liệu, thời điểm sát thương giữ nguyên (xem GAMEPLAY_INVARIANTS.md).

## 2. Bảng màu

### A. Nền (bão hòa thấp) [ĐX]

| Vai trò | Hex | Dùng cho |
|---|---|---|
| Đen-xanh sâu | `#0c0e12` | Viền ngoài, vực tối, nền menu |
| Đá tối | `#1c2026` | Bóng đổ, mặt trong tường |
| Xám đá lạnh | `#3a4048` | Tường, đường lát |
| Xám đá sáng | `#5c646c` | Mặt sáng đá, highlight gạch |
| Rêu tối / Rêu / Rêu khô | `#1f2a1c` / `#3a4a2c` / `#5a5e34` | Cỏ bóng / cỏ chính / lá úa |
| Nâu đất tối / Nâu đất / Nâu đất sáng | `#2a1e16` / `#4a3624` / `#6e5a3e` | Đất ẩm, gỗ, da |
| Xương/giấy | `#b8ac90` | Xương, vải bạc, chữ phụ |

Ghi chú: cỏ pack hiện `#284c14/#38681c` (lệch Grim Dark, `COLOR_PALETTE.md` §6). Rêu mới chỉ áp qua tint/ground texture (DP-3), không sửa PNG gốc.

### B. Nhấn (dùng hạn chế)

| Vai trò | Hex (lõi / thân / viền) | Nguồn |
|---|---|---|
| Lửa đuốc | `#ffd070` / `#e0702a` / `#8e2a10` | **= `ELEMENT_PALETTE.fire`** [XM] (giữ một nguồn) |
| Máu | `#d8303a` / `#a01c2c` / `#4a0f1e` | Thân gần `NEON.boss #c8243a`, `BOSS.dark #4a0f1e` [XM] |
| Phép xanh lục-lam | `#d8fff4` / `#2fd9b0` / `#0e5c52` | `#2fd9b0` đã có (`BOSS_ARENA_RETURN_COLOR`) [XM] — DP-9 |
| Đạn người chơi | `#5fe0ff` | Giữ (đã duyệt) |
| Hư không / Dark | `#d8c4ff` / `#8a62c8` / `#2e1850` | `ELEMENT_PALETTE.dark` |
| Sét | `#fff4b0` / `#e8c030` / `#8a5c14` | Giữ vàng (đã duyệt) |
| Băng | `#e8f6fc` / `#7cc0d8` / `#24506e` | `ELEMENT_PALETTE.ice` |

### C. Độ hiếm vật phẩm [ĐX, DP-7]
Thường `#b8ac90` · Tốt `#5e9a5a` · Hiếm `#4a86c8` · Sử thi `#9a5ad0` · Huyền thoại `#ffb347` (= `NEON.legendary`). Số tầng độ hiếm thực tế [?] chưa đọc `WEAPON_RARITY_LABELS`; chỉ áp khi duyệt.

### D. UI [ĐX, DP-8]
Khung kim loại `#2a2622` · viền đồng cổ `#8a6a3a` (đã dùng làm `belt` ở `gearLook.ts`) · nền panel `#12141a` α0.88 · chữ chính `#e8dfc8` · chữ phụ `#9a9484` · cảnh báo `#c8243a` · máu `#b8243c` · mana `#3a6ab8` · xác nhận `#2fd9b0`.

## 3. Pixel scale và texel

Hiện trạng [XM]: màn 960×540, FIT. Người chơi khung 48 scale 1; quái 24 ×2 (`EnemyBase.ts:150`); Boss 32 ×(3.2–4.4) (`BossEnemy.ts:175`); NPC ×3 (`Npc.ts:47`); vũ khí 1:1; tile 32; đạn người chơi `pixelSize 2` (`PreloadScene.ts:242-246`).

→ Mật độ texel **không đồng đều** (1/2/3/lẻ px). Phương án:

| | Mô tả | Hệ quả |
|---|---|---|
| **A (khuyến nghị, D1)** | Giữ lưới hiện tại, vẽ lại đẹp hơn trong lưới đó | Hitbox/scale không đổi; Boss giữ scale lẻ (M1) |
| B | Thống nhất 1 texel = 1 px (quái khung 48, Boss 96–128) | Phải đổi `setScale/setBodySize/offset` giữ hitbox thế giới → chạm vùng cấm hitbox; chỉ thử một thực thể sau prototype |
| C | 1 texel = 2 px cho quái/NPC/Boss | Người chơi tinh hơn quái, lệch phong cách |

## 4. Kích thước sprite chuẩn

| Loại | Hiện trạng [XM] | Chuẩn đề xuất |
|---|---|---|
| Người chơi | Khung 48, 6 cột × 20 hàng; thân ≈ 24×32 | **Giữ 48** (hand offset dùng tọa độ trong khung 48) |
| Quái thường / bắn xa | 24 ×2 | Giữ |
| Quái tinh anh | **Không có trong code** | Chỉ biến thể hình ảnh (D5) |
| Boss | 32 ×(3.2–4.4), body 20×20 | Giữ khung 32 và scale (M1) |
| NPC | `NPC_ROWS` ×3 | Giữ ×3 [?] chưa đo số hàng |
| Nhà | 44–64 px (pack) | Giữ pack + grading/decal; thay ở đợt sau (D4) |
| Prop | 16–48 px | Chuẩn 16/24/32/48 |
| Tile | 32×32 | **Giữ** (map 120×80 ô) |
| Icon | Gear icon `createPixelTexture` (kích thước [?]) | Chuẩn 16×16 và 32×32, hiển thị nguyên ×2/×3 |
| Vũ khí cầm tay | 1:1, `grip` theo texel, ≤ 60 px | Giữ 1:1; **giữ nguyên `grip/forward/muzzle`** |
| Đạn/mũi tên/orb người chơi | 8×4 / 16×4 / 16×16 (hitbox = kích thước texture, I13) | **Kích thước texture bất biến** |
| Số sát thương | Bitmap 5×7 | Giữ |

## 5. Silhouette

- Mỗi lớp có dấu hiệu đầu/vai riêng (CHARACTER_SPEC.md). Mỗi loại quái khác nhau ≥ 2 trong 3 yếu tố: hình tổng thể, vật thể nổi (sừng/gai/vũ khí), tỉ lệ đầu/thân.
- Kiểm tra: tô đặc một màu, mọi loại phải phân biệt được ở kích thước thật (test silhouette trong FEATURE_SPEC).
- Cấm viền sáng bao toàn thân; chỉ rim light một phía.

## 6. Ánh sáng, bóng, viền

- **Hướng sáng:** trên-trái (10–11 giờ), thống nhất.
- **Shade:** nhân vật/quái 4 mức (viền, tối, chính, sáng) + tối đa 1 màu nhấn; prop/nền 3 mức; tile 3 mức + 1–2 màu lẻ phá lặp.
- **Viền:** nhân vật/quái/NPC viền ngoài 1 px màu tối của chính vật liệu (không đen tuyền; mẫu hiện có `#100812`, `#12060b`). Prop/nhà/tile không viền ngoài.
- **Rim light:** 1 px ở cạnh trên-trái, chỉ cho thực thể quan trọng (người chơi, Boss, tinh anh dự phòng).
- **Bóng dưới chân:** hiện quái vẽ ellipse `rgba(0,0,0,0.3)` ngay trong sprite (`enemySprites.ts:95-106`) và có texture `shadow`; chuẩn hóa một kiểu bóng (elip α0.3–0.4, ngay dưới thực thể; Boss lớn theo scale).
- **Bóng đổ prop/nhà:** elip kéo về dưới-phải, alpha thấp.

## 7. Chiều sâu [XM]

Giữ hệ depth hiện có: thực thể `y+20`, vũ khí `y+21`, ambient 2700, tối/sương 2701, đạn quái + ánh sáng điểm 2702, vignette 2705, VFX 3000/3010, `PlayerBars` 4900, HUD 5000+, số sát thương 9500. Thêm lớp decal phẳng (máu, nứt, rêu) ở depth thấp 1–3 để không đụng y-sort. **Không dùng parallax nền** (top-down); chiều sâu qua bóng, vignette, sương. Thay đổi depth đạn/telegraph quái → DP-6.

## 8. Animation guidelines

| Quy tắc | Giá trị |
|---|---|
| Anticipation | ≥ 1 frame "thu lại" **nằm trong cửa sổ logic sẵn có** (xem GAMEPLAY_INVARIANTS §2.3) |
| Squash-stretch | 1–2 px trên khung 48; chỉ nhảy/đáp/trúng đòn |
| Idle | "Thở" ±1 px |
| Hurt | 1 frame flash; không dùng tint làm kênh trạng thái chính (`clearTint` xóa tint Boss/băng, E7) |
| Death | Quỵ → ngã → tan; **quái ≤ 340 ms** (object bị `destroy` sau 340 ms) |
| Nhận biết trạng thái | Run: chân xen kẽ + thân nghiêng; attack: trọng tâm tới; bất tử: nhấp nháy alpha 0.4↔1 mỗi 80 ms (giữ) |
| Ease | Giữ pose cuối lâu hơn thay vì nội suy tween trên sprite pixel |
| Số frame | Tự do **miễn trong giới hạn thời lượng**: attack người chơi ≤ 260 ms, windup quái cận chiến ≤ 200 ms, quái bắn xa ≤ 480 ms. Không logic nào gắn vào `animationcomplete`/frame (E1) |

## 9. VFX guidelines

- Vệt chém dày 2–4 texel: lõi 1 (màu lõi), thân 2, viền tối 1. Alpha: lõi 1.0; thân 0.7–0.9; hào quang ADD ≤ 0.5; hạ alpha đầu/cuối.
- Lớp: `ground` 4 (dưới thực thể) · `normal` 3000 · `top` 3010. VFX luôn ≥ 3000 để sáng trên lớp tối.
- Bảng màu VFX: chỉ lõi/thân/viền của `ELEMENT_PALETTE` + bảng nhấn mục 2B; **cấm màu mới ngoài bảng**.
- Quy tắc không che gameplay chi tiết: ANIMATION_VFX_SPEC.md §3.

## 10. Checklist chấm điểm mỗi asset (0–2/mục; đạt ≥ 80% và không mục nào = 0 ở "bắt buộc")

1. **[Bắt buộc]** Silhouette nhận ra ở kích thước thật.
2. **[Bắt buộc]** Chỉ dùng màu trong bảng Art Bible (kiểm bằng test: mọi hex ∈ registry).
3. **[Bắt buộc]** Đúng khung/neo/kích thước; hitbox và `grip` không đổi.
4. Hướng sáng nhất quán. 5. Viền đúng quy tắc, không orphan pixel. 6. Đúng số mức shade, không banding. 7. Đọc được ngày/đêm/Arena. 8. Animation giữ nhịp, trong giới hạn thời lượng. 9. Không vượt ngân sách VFX/hạt. 10. Đặt tên và catalog đã cập nhật.
