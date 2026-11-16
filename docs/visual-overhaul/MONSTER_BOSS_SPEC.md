# MONSTER / BOSS DESIGN SPECIFICATION

Phân loại: **Hybrid** (lưới thân + biến thể theo nguyên tố/tier bằng palette). Mọi đổi màu thân/viền/glow sprite quái/boss **cần DP-1** (và DP-2 cho hue quái cận chiến); trước khi duyệt dùng đúng màu cũ.

## 1. Hiện trạng [XM]

- 3 sheet: brute (cận chiến) 24 px, caster (bắn xa) 24 px, boss 32 px (`utils/enemySprites.ts`). Anim `<prefix>-idle/walk/attack/death` = 2/4/2/2 frame @ 4/9/10/7 fps (repeat -1/-1/0/0); Boss fps ×0.7 (tối thiểu 3). Quái **không có hướng**, dùng `setFlipX` (E6).
- Quái `setScale(2)` + `setBodySize(...)` (`EnemyBase.ts:150-151`); Boss `setScale(min(4.4, 3.2+0.15(tier−1)))` + body 20×20 (`BossEnemy.ts:175-176`).
- **Không có quái tinh anh** trong code (Grep `elite|tinh anh|champion` chỉ trúng mô tả skill). Chỉ `Enemy`, `RangedEnemy`, `BossEnemy`, và `Minion` (đồng minh).
- Quái bắn xa: tier ≥ 2 bắn 3 viên (xòe 14°), 50% có nguyên tố (fire/ice/lightning/dark), đạn ×0.7, kháng 50% hệ đó (`damageTypeConfig.ts`, `RangedEnemy.ts:74-86`). **Hệ chỉ thể hiện qua màu telegraph/đạn, sprite không đổi.**
- Bóng elip vẽ trong sprite (`enemySprites.ts:95-106`).

## 2. Quái cận chiến [ĐX]

Thân lùn, vai rộng, vũ khí thô (gậy/rìu), giáp rách, mắt sáng vàng nhạt hoặc đỏ nhạt. Silhouette: hình vuông-thấp, hai cánh tay to (đã có `drawBruteArm`). Hue chủ đạo: giữ tím (hiện `#6b3f8a`) cho tới khi DP-2 được duyệt; đề xuất đổi sang xanh rêu-xám hoặc đỏ nâu để tách khỏi hệ Dark và minion.

**Hành vi hình ảnh [XM]:** sát thương xảy ra **bất cứ lúc nào body chạm người** (`WorldScene.ts:1189-1212`); anim "vồ" chạy khi ≤ 64 px, mỗi 620 ms, 260 ms (`Enemy.ts:67-69`) và **chỉ là trang trí**. Windup hình ảnh ≤ 200 ms, không hứa "hit ở frame X".

## 3. Quái bắn xa [ĐX]

Dáng cao, gầy, mũ trùm, một tay cầm vật phát sáng. **Biến thể nguyên tố bằng palette trên cùng một thân:** đổi màu vật phát sáng + điểm sáng trên mũ + viền theo `ELEMENT_PALETTE` (fire/ice/lightning/dark), không làm 4 sprite riêng. Đây là **cải thiện độ đọc thực sự**: người chơi biết hệ **trước** khi quái bắn. Chỉ làm đủ hệ mà quái thật sự dùng (kiểm trong `RangedEnemy.ts`).

**Timing [XM]:** telegraph **480 ms** rồi bắn (`combatConfig.ts:193`, `RangedEnemy.ts:116-144`); pose gồng nằm trọn trong 480 ms, giữ pose đến lúc bắn (clip attack 2 frame@10 rồi giữ frame cuối). **Ban đêm** quái bắn xa đứng ở 240–400 px (ngoài tầm nhìn 238 px, `RangedEnemy.ts:160-165`) nên sprite gần như mất: sprite **không được là kênh duy nhất** báo "sắp bắn" (giữ vòng ring + đạn ở dải sáng).

## 4. Boss [ĐX]

Giữ palette đỏ máu (`BOSS` thân `#7c1734`, `NEON.boss #c8243a`, glow); thêm áo choàng, giáp xương/kim loại cũ, sừng/gai, lõi sáng ở ngực. Khung 32 giữ nguyên. Boss tier 1–6: scale tự tăng (không đổi, M1); thêm **một chi tiết hình ảnh mỗi 1–2 tier** (gai, vầng sáng, lửa nhỏ) — tier tối đa [?] cần xác nhận với `BOSS_*`.

**Telegraph = hitbox [XM]:** slam tức thời tại `castEndAt` = 750 ms, vùng chọn theo vị trí người **lúc bắt đầu cast**, trúng nếu `distance ≤ radius` (`BOSS_SLAM_RADIUS 160 + 10×(tier−1)`); thiên thạch 950 ms, 4–9 vùng bán kính 78; nova 800 ms, 15–24 viên (tier ≥ 4 hoặc cuồng nộ có vòng 2 sau 380 ms); quạt 600 ms; triệu hồi 700 ms. Vòng/đường báo trước vẽ **đúng bán kính** thật, nét ≥ 3 px, còn nhìn thấy tại thời điểm resolve (R4), không phụ thuộc pool VFX (R5; đường nova/quạt và Arc slam hiện là `Graphics` không pool — giữ).

Chuẩn màu telegraph (đã duyệt): đỏ máu `NEON.boss` = slam/thiên thạch/vật lý; vòng màu hệ = đòn nguyên tố; tím `#9d6bff` = nova/hư không/triệu hồi; cuồng nộ `#ff7a7a` tint, aura `#ff3b3b`.

Lưu ý lỗi hiện có (E7): `EnemyBase.flash` gọi `clearTint()` xóa tint cuồng nộ Boss và băng. **Art mới không dựa vào tint làm kênh trạng thái chính**; dùng biến thể texture hoặc lớp phủ. Việc sửa lỗi này nằm ngoài đợt visual (hỏi ý bạn nếu muốn kèm).

## 5. Phân cấp thường / tinh anh / Boss (chỉ hình ảnh — D5)

Không thêm quái tinh anh thật (đổi gameplay → Cổng 1 riêng). Phân cấp hình ảnh dựa **biến đã có**: `tier` (threat 0–6, +1 mỗi 60 s), `element`, `enraged`.

| Cấp | Điều kiện | Nhận diện |
|---|---|---|
| Thường | tier 0–1 | 4 màu, không rim light, viền tối |
| Mạnh (hình ảnh) | tier 2–3 | Thêm 1 phụ kiện (vòng cổ/mũ sừng), bóng lớn hơn ~20% |
| Rất mạnh (hình ảnh) | tier 4–6 | Phụ kiện thứ hai, viền ngoài màu hiếm 1 px, hào quang nhấp nháy nhẹ (DP-6 nếu cần depth) |
| Boss | — | Scale lớn, rim light, lõi sáng, áo choàng, thanh máu riêng |

Cần lộ ra thuộc tính chỉ-đọc (`tier`/`element` hiện `private`, `RangedEnemy.ts:39-42`) — đổi code hiển thị thuần, ghi vào danh sách file lúc lập brief.

## 6. Tiêu chí riêng

1. Giữ khung 24/32, `setScale(2)`, body, anim key `<prefix>-idle/walk/attack/death`, số frame trong giới hạn: **chết ≤ 340 ms** (E3), windup ≤ 200 ms (cận chiến) / ≤ 480 ms (bắn xa).
2. Chịu được lật ngang (`setFlipX`).
3. Quái địch vs minion không cùng hue chủ đạo (R7).
4. Đọc được ban đêm/Arena (R2, R8); 6 hệ phân biệt cả khi bỏ hue (R6).
5. Hitbox (body quái/Boss) không đổi — diff `EnemyBase.ts:150-151`, `BossEnemy.ts:175-176` rỗng.
