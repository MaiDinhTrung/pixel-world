# Bảng màu & quyết định nghệ thuật — Pixel World

Định hướng chính thức: **Grim Dark Fantasy Pixel Art** (thư viện ảnh tham chiếu ghi là "Diablo-inspired Dark Fantasy"; chỉ học nguyên tắc, không sao chép tài sản độc quyền — xem `docs/references/visual/README.md`).

Tài liệu này chỉ ghi **quyết định đã được người dùng duyệt** (mục 1–3) và **quyết định đã duyệt nhưng chưa triển khai** (mục 4). Mọi đề xuất chưa duyệt nằm ở mục 5 và **không phải** quy chuẩn.

Trạng thái: Giai đoạn 1 (chuẩn hóa bảng màu) đã triển khai và được người dùng kiểm tra trực quan, xác nhận ổn.

## 1. Nguồn màu duy nhất (đã triển khai)

| Nội dung | Nơi khai báo |
|---|---|
| Màu 6 hệ sát thương (lõi / thân / viền) | `ELEMENT_PALETTE` trong `src/config/damageTypeConfig.ts` |
| Màu đạn / vòng báo trước theo hệ | `ELEMENT_COLORS` (= màu thân của `ELEMENT_PALETTE`) |
| Màu số sát thương | `DAMAGE_NUMBER_COLORS` trong `src/config/damageNumberConfig.ts` (lấy từ `ELEMENT_PALETTE`) |
| Màu hiệu ứng khác (đạn, heal, vũ khí…) | `NEON` trong `src/config/palette.ts` |
| Đổi màu số → chuỗi CSS cho UI | `cssColor()` trong `src/config/palette.ts` |

Quy tắc: không hard-code mã màu của hệ nguyên tố trong logic; lấy từ `ELEMENT_PALETTE` / `ELEMENT_COLORS`.

## 2. Bảng màu nguyên tố (đã duyệt, là giá trị khởi đầu)

Có thể tinh chỉnh sau khi xem trong game; mọi thay đổi phải qua phê duyệt.

| Hệ | Lõi | Thân | Viền |
|---|---|---|---|
| Physical | `#f2e8cc` | `#cdbf9c` | `#5a4a30` |
| Fire | `#ffd070` | `#e0702a` | `#8e2a10` |
| Ice | `#e8f6fc` | `#7cc0d8` | `#24506e` |
| Lightning (giữ vàng) | `#fff4b0` | `#e8c030` | `#8a5c14` |
| Wind | `#eef8f2` | `#8ec4b0` | `#36705f` |
| Dark | `#d8c4ff` | `#8a62c8` | `#2e1850` |

- **Poison** không phải hệ nguyên tố chính thức. Chỉ giữ màu số sát thương `#4fb83a` (`DAMAGE_NUMBER_COLORS.poison`).
- **Số sát thương:** Physical dùng màu lõi (trắng ngà `#f2e8cc`); các hệ còn lại dùng màu thân. Số vật lý trên người chơi vẫn `#ff5a5a` (không đổi).
- `NEON.nova` và `NEON.void` lấy từ `ELEMENT_PALETTE.dark.body`.

## 3. Các quyết định khác đã duyệt và đã triển khai

- **Kỹ năng Fire/Ice** đồng bộ với `ELEMENT_PALETTE`: màu nhận diện, vòng, glow, vùng ảnh hưởng dùng màu thân; điểm nhấn sáng dùng màu lõi.
  - Fire: Hỏa Bạo, Tường Lửa, Thiên Thạch → `#e0702a` (nhấn `#ffd070`).
  - Ice: Băng Thương, Sóng Băng, Độ Không Tuyệt Đối → `#7cc0d8` (nhấn `#e8f6fc`).
  - Tia chạm sét lan (`#e8c030`) và Mồi Lửa (`#e0702a`) dùng `ELEMENT_COLORS`.
- **Đạn người chơi và dash:** giữ cyan `#5fe0ff`.
- **Đạn quái:** `NEON.enemyBullet` giữ `#d8402a`.
  - Texture đạn quái là xám trung tính (`PreloadScene.ts`); màu thật do tint quyết định trong `fireEnemyBullet` (`src/utils/projectile.ts`).
  - Đạn có hệ → `ELEMENT_COLORS[hệ]`; đạn vật lý của quái, và đạn boss không có hệ → `NEON.enemyBullet`.
  - Lý do: texture cũ nhuộm hồng làm đạn nguyên tố bị ám tím/đỏ khi nhân tint.
- **Giữ nguyên** (đã quyết định chưa đổi): màu thân và viền sprite quái/boss (`enemySprites.ts`), glow quái/boss, `NEON.meleeEnemy`, `NEON.rangedEnemy`, `NEON.boss`, và màu telegraph nova của boss (`#9d6bff`, màu riêng, không gộp vào bảng nguyên tố).

## 4. Đã duyệt về nguyên tắc, chưa triển khai (Giai đoạn 2–4)

Chưa có thay đổi code nào cho các mục này.

- **Giai đoạn 2:** ambient overlay, vignette, ánh sáng, tint môi trường. Ambient alpha **bắt đầu thử ở 0.25** (giá trị thử nghiệm, chỉ tăng khi có kết quả kiểm tra khả năng nhìn rõ nhân vật, quái, địa hình, gameplay).
- **Giai đoạn 3:** sương mù, bố trí lại môi trường.
- **Giai đoạn 4:** mở rộng asset.
- **Biến đổi màu môi trường:** ưu tiên tint runtime; không sửa hay ghi đè PNG gốc; chỉ xét xuất lại PNG palette-shift sau khi phong cách đã được kiểm chứng.
- **Asset làng:** tạm giữ `market-stall`, `flower-bed`, `oak-tree`; ưu tiên bố trí lại và chỉnh màu; xét thay thế ở giai đoạn nâng cấp môi trường.
- **Asset ma quái:** chưa bổ sung ngay; tận dụng asset hiện có; tương lai ưu tiên pack CC0 phù hợp; VFX có thể tạo bằng code nhưng không dùng texture sinh bằng code để thay thế mọi asset môi trường.
- **Mức hoang tàn của làng:** cũ kỹ, u ám, suy tàn; không biến thành phế tích; vẫn có cảm giác có người sinh sống.
- **Màu quái/boss:** hướng đỏ thẫm, đỏ máu hoặc đỏ tím, loại bỏ hồng neon; có cấp nhận diện khác nhau cho quái thường, tinh anh, boss; đạn phải phân biệt theo nguồn và hệ. **Giá trị hex cụ thể chưa được duyệt** (xem mục 5).

## 5. Đề xuất CHƯA duyệt (không phải quy chuẩn)

Chỉ để tham khảo; không áp dụng khi chưa có phê duyệt.

- Quái/boss: `meleeEnemy #8a3a6a`, `rangedEnemy #a02848`, `boss #c8243a`, `bossBullet #d8304a`, `bossEnraged #d8304a`; glow `CASTER #c8385a`.
- `enemyBullet #b8243c` — **đã bị từ chối**, giữ `#d8402a`.
- Gộp telegraph nova của boss vào `ELEMENT_PALETTE.dark.body` — **chưa áp dụng**.
- Màu vũ khí trong `NEON` (sword, bow, scythe, dualBlades, staff) và `heal #7fc99a`.
- Môi trường (hex ước lượng): ambient overlay `#20283a`, vầng sáng ấm `#ff9a30`, ánh lạnh `#5a88d0`, sương `#607050`, vignette, bảng màu cỏ/đất/đá/nước.
- Hạ thêm độ bão hòa body của Fire/Ice/Lightning, thêm hệ Poison vào `ELEMENT_PALETTE`, tăng mật độ pixel nhân vật theo ảnh tham chiếu.
- Đưa tint mặc định trong `VFXManager.ts`, `combat/*.ts`, `weaponArt.ts` về config.

## 6. Việc còn tồn đọng đã biết

- Màu hard-code chưa xử lý (vai trò chưa rõ hoặc ngoài phạm vi): `Player.ts` glow Khiên Phép `#b48cff`, `skills.ts` slash Shadow Dance `#b48cff`; các kỹ năng Lightning/Dark (`arcane_nova`, `arcane_chain`, `void_rift`); `arrow_rain` `#ff5e6c`; tint mặc định trong `VFXManager.ts`; `combat/*.ts` (Excalibur, Scythe, DragonBow, swordFireVfx); `weaponArt.ts` (sprite vũ khí); `placeholderPlayer.ts`.
- Rủi ro nhìn rõ đạn quái (tính toán, đã được người dùng xem ổn nhưng cần theo dõi khi chơi nhiều quái): đạn Fire gần đạn vật lý của quái; đạn Ice của quái cùng hue với đạn cyan của người chơi; thân đạn tối hơn trước (~83% độ sáng tint).
- Không có quái tinh anh trong code; phân cấp thường/tinh anh/boss mới áp dụng được cho thường, bắn xa và boss.
- Trích palette PNG pack làng (script chỉ đọc): độ bão hòa trung bình 23–38%, độ sáng trung bình 26–33%; điểm lệch Grim Dark chính là cỏ/cây/bụi xanh bão hòa (`#284c14`, `#38681c`) và nước xanh sáng (`#284870`, `#6888b0`). Viền pack `#1c1c20`, đất `#402c1c`/`#685840`, đá `#58646c`.
