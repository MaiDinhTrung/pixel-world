# ENVIRONMENT & ARCHITECTURE SPECIFICATION

Phân loại: làng/nhà/prop pack = **Hybrid (Image + tint + decal)**; nền, thành, Arena, cổng, prop mới = **Procedural**. Xem ASSET_INVENTORY.md.

## 1. Hiện trạng [XM]

- Thế giới 120×80 ô, ô 32 px; nền `ground` procedural; làng dựng ở `world/town.ts` từ pack CC0 (tile 32, nhà 44–64 px), 6 cột đèn (2 hỏng), 2 lửa trại ngoài cổng, 4 bồn hoa; tint/lớp rửa Giai đoạn 2–3b đã duyệt (COLOR_PALETTE §3).
- Công trình: origin (0.5,1), **vật cản rộng `displayWidth×0.72`, cao 28** (`town.ts:246-270`); NPC origin (0.5,1) ×3, chữ tên đặt cố định `y−78/−62/−96`, bán kính tương tác 96 (`Npc.ts`, `economyConfig.ts`).
- Tường thành gạch procedural (`world/castleWall.ts` + `vfx/brickBox.ts`), 4 cổng, chặn vật lý qua nhóm `obstacles`. Boss Arena 50×34 ô (1600×1088), ambient cố định `0x241e34` α0.5, sương α0.1 (`bossArenaConfig.ts:110-121`), cổng vào quanh `(1920,700)`. Cổng dịch chuyển: bệ 96 px, vortex 64 px × 8 frame.
- Hàng rào (`fence`) và xe đẩy (`cart`) đang **tạm ẩn** theo yêu cầu cũ (`TEMPORARILY_HIDDEN`, `town.ts`).

## 2. Nhà và kiến trúc

- Nguyên tắc: mái đá/ngói tối, tường đá thô và gỗ, cửa sổ có ánh vàng ấm (điểm sáng cố định), vữa nứt, rêu ở chân tường, mái lệch/vá. Mức cũ kỹ **không thành phế tích** (đã duyệt, COLOR_PALETTE §4).
- Bốn mức cũ nát: (1) còn khá nguyên — nhà trưởng làng; (2) cũ kỹ — quán, lò rèn; (3) xuống cấp — nhà dân; (4) đổ nát — công trình ngoài cổng. Chỉ khác **decal/tint**, không đổi vật cản.
- Phương án (D4): **E1 (mặc định)** giữ pack + grading + decal procedural + bóng đổ (elip dưới-phải, α thấp); **E2** PNG palette-shift (cần file nhị phân, chỉ bạn tạo/cung cấp); **E3** prop mới nhỏ bằng code; **E4** pack CC0 dark fantasy do bạn tìm. Giới hạn của tint: MULTIPLY chỉ làm tối/lệch màu, không thêm chi tiết.
- **Bất biến:** `displayWidth` công trình (hoặc obstacle đặt cố định) không đổi (I14); không đổi `VILLAGE_ZONE`, spawn, vật cản.

## 3. Thành trì / tường thành

Gạch đá xám lạnh `#3a4048` + `#5c646c`, đỉnh răng cưa, cột chống, đuốc cố định mỗi n ô, rêu/nứt. `castleWall.ts` đã sinh `castle-wall-<n>` bằng `brickBox`: chỉ đổi palette + chi tiết nứt/rêu. Không đổi hình học chặn.

## 4. NPC

Ba vai trò (thương nhân, thợ rèn, trưởng làng) + dân làng: silhouette riêng — thương nhân mũ rộng + bao hàng; thợ rèn tạp dề + búa; trưởng làng gậy + áo choàng. Mỗi NPC một đồ vật nhận diện 3–4 px. Dân làng dùng chung thân, khác màu áo/mũ. Thêm idle 2 frame "thở". **Giữ** origin (0.5,1), ×3, chiều cao nhìn thấy ≤ ~62 px để không đè chữ tên (I15). Marker tương tác giữ nguyên.

## 5. Khu vực có bản sắc (chỉ dựa trên map hiện có; chỉ decor/tint, không đổi spawn)

| Vùng | Cơ sở [XM] | Bản sắc | Màu chủ đạo phụ |
|---|---|---|---|
| Làng Khởi Nguyên | `VILLAGE_ZONE` | Ấm nhất: đuốc, cửa sổ vàng, đất lát | Cam đuốc + nâu đất |
| Tường/cổng thành | `castleWall.ts` | Đá xám lạnh, đuốc đều | Xám đá |
| Đồng hoang ngoài làng | Phần còn lại map; ranh giới chi tiết [?] | Cỏ rêu úa, cây khô, xương, bia mộ, sương dày | Rêu + xanh xám |
| Boss Arena | `bossArena.ts` | Đá đen, vòng rune đỏ máu, ánh lửa | Đỏ máu + đá đen |

Không gắn vành đai với cơ chế threat/spawn (chưa đọc `WorldScene` spawn theo khoảng cách [?]).

## 6. Tile / nền / chuyển tiếp

`ground`, `wall`, `rock` (procedural): 3–4 biến thể ô để phá lặp, nhiễu hạt cố định (seed cố định, không `Math.random`). Chuyển tiếp đất↔cỏ bằng decal viền mềm. Tile giữ 32×32. Arena: sàn gạch 2×2 hiện có + vết nứt, vết máu, rune phát sáng nhấp nháy (đã có `arena-rune`).

## 7. Cổng dịch chuyển & Arena

Giữ hình học (bệ 96, vortex 64×8f@10fps), đổi palette sang họ lục-lam (DP-9) cho cổng về, đỏ máu cho cổng vào. Vòng báo trước Boss **là hitbox** (vẽ đúng bán kính; GAMEPLAY_INVARIANTS §2.2). Arena ambient cố định giữ; kiểm độ đọc vòng Arc đỏ depth 4 dưới ambient (~×0.57) — cần thử bằng mắt.

## 8. Tiêu chí riêng

1. Obstacle làng/thành không đổi (diff hình học `town.ts`/`castleWall.ts` rỗng ngoài màu/decal).
2. Spawn, `VILLAGE_ZONE`, vị trí NPC không đổi.
3. Mọi hex mới ∈ registry. Ban ngày giữ "sáng bình thường" (DP-4 chưa duyệt).
4. Ảnh chụp gallery ở ngày/đêm/Arena (nền sáng/tối/ban đêm) để so sánh.
