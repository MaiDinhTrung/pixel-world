# Bảng màu & quyết định nghệ thuật — Pixel World

Định hướng tổng thể: xem `docs/DESIGN_PILLARS.md` (Grim Dark là bản sắc; Soul Knight là cách thể hiện silhouette/animation).

Định hướng chính thức: **Grim Dark Fantasy Pixel Art** (thư viện ảnh tham chiếu ghi là "Diablo-inspired Dark Fantasy"; chỉ học nguyên tắc, không sao chép tài sản độc quyền — xem `docs/references/visual/README.md`).

Tài liệu này chỉ ghi **quyết định đã được người dùng duyệt** (mục 1–3) và **quyết định đã duyệt nhưng chưa triển khai** (mục 4). Mọi đề xuất chưa duyệt nằm ở mục 5 và **không phải** quy chuẩn.

Trạng thái: Giai đoạn 1 (chuẩn hóa bảng màu) và Giai đoạn 2 (ambient, vignette, ánh sáng, tint môi trường) và Giai đoạn 3 (chu kỳ ngày/đêm, sương mù, bố trí lại làng) đã triển khai và được người dùng duyệt. Giai đoạn 4 chưa bắt đầu.

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
  - Mỗi thuộc tính có một texture đạn riêng, sinh ở `src/vfx/vfxTextures.ts` (`createEnemyBullets`, khóa qua `enemyBulletTextureKey`): đạn có hệ lấy 3 lớp lõi/thân/viền từ `ELEMENT_PALETTE[hệ]`; đạn vật lý của quái, và đạn boss không có hệ, dùng texture mặc định với thân `NEON.enemyBullet` (lõi trộn trắng 65%, viền trộn đen 50%). `fireEnemyBullet` (`src/utils/projectile.ts`) chọn texture theo hệ và gọi `setTexture` mỗi lần bắn (vì `Group.get` bỏ qua khóa texture với đạn lấy lại từ pool); không còn tint.
  - Hình dạng khi bay: **hình trụ** (viên thuốc, thân đều, hai đầu bo tròn) dài 44 × rộng 20 px, xoay theo hướng bay; vùng va chạm giữ vuông 10 px ở tâm như đạn cũ (`ENEMY_BULLET_VISUAL` trong `config/vfxConfig.ts`). Người dùng yêu cầu hình trụ, màu theo thuộc tính, rộng hơn 10%, dài hơn 40% so với bản 32×18 và "sáng rực"; kích thước do AI làm tròn, chưa được người dùng xem lại.
  - Đạn quái vẽ ở depth 2702 (trên ambient, không bị làm tối); đổi `depth` về 9 trong `ENEMY_BULLET_VISUAL` để trở về cách vẽ cũ.
  - Lý do: texture cũ nhuộm hồng làm đạn nguyên tố bị ám tím/đỏ khi nhân tint.
- **Giữ nguyên** (đã quyết định chưa đổi): màu thân và viền sprite quái/boss (`enemySprites.ts`), glow quái thường (`BRUTE.glow`) và glow boss (`BOSS.glow`), `NEON.meleeEnemy`, `NEON.enemyBullet`, màu cuồng nộ của boss, và màu telegraph nova của boss (`#9d6bff`, màu riêng, không gộp vào bảng nguyên tố).
- **Bỏ hồng neon của quái bắn xa và boss (đã duyệt, đã triển khai):**
  - `NEON.rangedEnemy` `#ff4fd8` → `#a02848` (đỏ thẫm).
  - Mắt quái bắn xa `CASTER.glow` `#ff4fd8` → `#c8385a`.
  - `NEON.boss` `#ff5577` → `#c8243a` (đỏ máu đậm; vòng báo trước, glow, aura, thanh máu boss theo màu này).
- **Đồng bộ màu Dark (đã duyệt, đã triển khai):** `void_rift` (màu nhận diện, vòng, glow, vùng ảnh hưởng, burst) → `ELEMENT_COLORS.dark`; glow Khiên Phép (`Player.ts`) → `ELEMENT_COLORS.dark`; slash Shadow Dance → `ELEMENT_COLORS.dark`, nhấn trúng đòn → `ELEMENT_PALETTE.dark.core`.
- **Giữ màu tím cho `arcane_nova` và `arcane_chain`** (kỹ năng 'arcane', dù sát thương hệ Lightning); không chuyển sang vàng Lightning.

### Giai đoạn 2 — đã duyệt và triển khai (giá trị khởi đầu, chỉnh trong `src/config/atmosphereConfig.ts`)

Người dùng đã duyệt các giá trị đang triển khai. Chúng là giá trị khởi đầu, có thể tinh chỉnh sau nhưng mọi thay đổi phải qua phê duyệt. Lưu ý: người dùng chỉ duyệt kết quả tổng thể sau khi xem trong game; các số bên dưới là giá trị trong code.

- **Ambient (MULTIPLY, depth 2700):** màu `#20283a`, alpha `0.25` khi được duyệt. **Đã được thay thế ở Giai đoạn 3 theo yêu cầu người dùng:** ban ngày không phủ (alpha 0, sáng bình thường), ban đêm alpha `0.45` (xem mục "Chu kỳ ngày/đêm" bên dưới). Chỉ tăng alpha khi có căn cứ từ kiểm tra khả năng nhìn rõ nhân vật, quái, địa hình, gameplay.
- **Vignette (depth 2705):** độ đen góc `0.5`, vùng giữa trong suốt tới `0.55` bán kính.
- **Ánh sáng điểm (ADD nhấp nháy, depth 2702):** màu `#ff9a30`; `campfire` bán kính 190 px (alpha 0.5), `lamppost` ×6 bán kính 150 px (alpha 0.38). Chưa có ánh sáng cho lò rèn, quán.
- **Tint môi trường (runtime, không sửa PNG):**
  - Lớp rửa nền cỏ `#3c4636` alpha `0.38` (cỏ bão hòa 58% → khoảng 41%).
  - Nước `#90a89c`, cây/bụi/cây trồng/bồn hoa `#d0a0c0`, cờ `#a89880`, sạp chợ `#b8a898`.
  - `market-stall`, `flower-bed`, `oak-tree` vẫn giữ, chỉ chỉnh màu.
- Thử nhanh bằng URL: `?atmo=off` (tắt tất cả), `?ambient=…`, `?vignette=…`.

### Giai đoạn 3a — chu kỳ ngày/đêm và sương mù (đã triển khai và được duyệt, giá trị khởi đầu)

Yêu cầu của người dùng: sương phải "mù mịt" hơn nữa, **tầm nhìn bị giảm xuống một vòng quanh người**, ngọn lửa xua tan sương, và **phân ngày/đêm**: ngày sáng bình thường, đêm tối om với sương mù che phủ. Người dùng đã duyệt Giai đoạn 3 sau khi xem trong game; các giá trị cụ thể (thời lượng chu kỳ, độ tối, bán kính, màu sương) do AI chọn và được người dùng chỉnh theo phản hồi (đậm hơn, tầm nhìn giảm 15%). Chúng là giá trị khởi đầu, có thể tinh chỉnh sau nhưng mọi thay đổi phải qua phê duyệt. Cấu hình ở `src/config/atmosphereConfig.ts` (`DAY_NIGHT`, `AMBIENT`, `NIGHT`, `FOG`).

- **Chu kỳ:** bắt đầu ban ngày → 150 s ngày → 20 s hoàng hôn → 90 s đêm → 20 s bình minh → lặp lại. Hệ số đêm `n` từ 0 đến 1, chuyển mượt (smoothstep).
- **Ban ngày (n = 0):** không có ambient, không bóng tối/sương, vignette còn 35%, ánh sáng ấm của lửa/đèn chỉ còn 10% — cảnh sáng bình thường. Lớp tint/rửa màu môi trường (Giai đoạn 2) vẫn giữ.
- **Ban đêm (n = 1):** ambient `#20283a` alpha `0.45`; lớp bóng tối `#040608` alpha `0.72` phủ toàn màn; 2 lớp sương xám xanh tối `#303c48` (alpha `0.55` và `0.4`, độ phủ khoảng 88%) trôi chậm; vignette đầy đủ.
- **Tầm nhìn:** quanh người chơi một vòng bán kính `238` px (giảm 15% so với `280` ban đầu theo yêu cầu người dùng) được xóa mềm hết bóng tối và sương (giữa trong suốt hoàn toàn, rìa mờ dần); quanh ngọn lửa cũng xóa (`LIGHT_SOURCES.fogClearRadius`: lửa trại 260 px, đèn sáng 180 px; đèn hỏng không phát sáng nên không xóa). Tối đa 12 lỗ cùng lúc, chỉ vẽ lỗ trong màn hình.
- **Độ sáng tính được ban đêm (công thức, chưa thấy trong game):** ngoài tầm nhìn mọi thứ chỉ còn khoảng 14–20% độ sáng và ngả xám đồng nhất; trong tầm nhìn nhân vật khoảng 50%, nền khoảng 19–34%.
- **Còn nằm trên lớp tối (vẫn sáng ban đêm):** đạn quái (depth 2702), VFX (3000+), số sát thương, HUD — nên đạn bay tới vẫn thấy được dù ngoài tầm nhìn.
- **Cơ chế:** lớp tối + sương vẽ vào một `RenderTexture` mỗi frame (chỉ khi n > 0.01) rồi khoét lỗ; thiết bị cảm ứng chỉ dùng lớp sương đầu. Cơ chế `RenderTexture`/erase của Phaser 4 chưa được chạy thử trong game; nếu lỗi, dùng `?fog=off`.
- **Thử nhanh bằng URL:** `?time=day`, `?time=night`, `?fog=off`, `?fog=1.5`, `?ambient=0.5` (ambient ban đêm), `?vignette=…`, `?atmo=off`.
- **Nút thử trong game:** nút ở góc phải màn hình (dưới cụm thông tin vũ khí) và phím `N` xoay vòng TỰ ĐỘNG → ÉP NGÀY → ÉP ĐÊM; đổi chế độ chuyển mượt trong 1,5 s (`DAY_NIGHT.manualEaseSeconds`). Nút dùng để kiểm tra; chưa có quyết định giữ hay bỏ nút này trong bản chính thức (`ui/DayNightToggle.ts`).
- **Ảnh hưởng gameplay:** chỉ hiển thị; không đổi sát thương, spawn, vật cản. Quái ngoài tầm nhìn ban đêm vẫn tồn tại nhưng khó thấy.

### Giai đoạn 3b — bố trí lại làng (đã triển khai và được duyệt; người dùng chọn cả 4 gói)

Chỉ dùng asset có sẵn, chỉ thêm/bớt vật trang trí; **không đổi** vật cản va chạm, điểm spawn, vùng làng an toàn, NPC. Vị trí đã được kiểm tra bằng script hình học (không chồng nhà, cây, prop, NPC, đường, hồ, ruộng, tường); chưa xem bằng mắt trong game.

- **Dọn bớt bồn hoa:** 9 → 4 (giữ cạnh giếng và hai bên khu chợ), bỏ 5 bồn trên quảng trường.
- **Hàng rào gãy + bụi um tùm:** 9 đoạn `fence` quanh ruộng (đứt quãng, vài đoạn nghiêng 5–8°), 12 đoạn `hedge` ven đường ngoài làng và bờ hồ. **Hàng rào đang TẠM ẨN** theo yêu cầu người dùng (dữ liệu còn trong `DECOR`; bật lại bằng cách bỏ `fence` khỏi `TEMPORARILY_HIDDEN` trong `src/world/town.ts`).
- **Xe đẩy (`cart`, prop gốc ở 2400,1660) cũng TẠM ẨN** theo yêu cầu (không có vật cản; cùng cơ chế `TEMPORARILY_HIDDEN`).
- **Dấu hiệu có người ở:** thùng, thùng gỗ, xô quanh hai sạp chợ và lò rèn; sàn gỗ 128×32 trước quán; 2 đống lửa trại (có ánh sáng) ngoài hai cổng làng.
- **Suy tàn nhẹ:** 2/6 cột đèn hỏng (nghiêng 4–5°, không phát sáng); một thùng nghiêng -9°, xe đẩy nghiêng 12°.
- Dữ liệu: `PROPS`, `DECOR` trong `src/world/town.ts`. Chưa thêm cây khô, nghĩa địa, xương (không có asset; để Giai đoạn 4).

## 4. Đã duyệt về nguyên tắc, chưa triển khai (Giai đoạn 4)

Chưa có thay đổi code nào cho các mục này.

- **Giai đoạn 4:** mở rộng asset.
- **Biến đổi màu môi trường:** ưu tiên tint runtime; không sửa hay ghi đè PNG gốc; chỉ xét xuất lại PNG palette-shift sau khi phong cách đã được kiểm chứng.
- **Asset làng:** tạm giữ `market-stall`, `flower-bed`, `oak-tree`; ưu tiên bố trí lại và chỉnh màu; xét thay thế ở giai đoạn nâng cấp môi trường.
- **Asset ma quái:** chưa bổ sung ngay; tận dụng asset hiện có; tương lai ưu tiên pack CC0 phù hợp; VFX có thể tạo bằng code nhưng không dùng texture sinh bằng code để thay thế mọi asset môi trường.
- **Mức hoang tàn của làng:** cũ kỹ, u ám, suy tàn; không biến thành phế tích; vẫn có cảm giác có người sinh sống.
- **Màu quái/boss:** hướng đỏ thẫm, đỏ máu hoặc đỏ tím, loại bỏ hồng neon; có cấp nhận diện khác nhau cho quái thường, tinh anh, boss; đạn phải phân biệt theo nguồn và hệ. Đã duyệt và áp dụng riêng phần bỏ hồng neon (xem mục 3); **các hex còn lại chưa được duyệt** (xem mục 5).

## 5. Đề xuất CHƯA duyệt (không phải quy chuẩn)

Chỉ để tham khảo; không áp dụng khi chưa có phê duyệt.

- Quái/boss: `meleeEnemy #8a3a6a`, `bossBullet #d8304a`, `bossEnraged #d8304a` (chưa duyệt; các hex `rangedEnemy`, `boss`, `CASTER.glow` đã duyệt, xem mục 3).
- `enemyBullet #b8243c` — **đã bị từ chối**, giữ `#d8402a`.
- Gộp telegraph nova của boss vào `ELEMENT_PALETTE.dark.body` — **chưa áp dụng**.
- Màu vũ khí trong `NEON` (sword, bow, scythe, dualBlades, staff) và `heal #7fc99a`.
- Môi trường (hex ước lượng, thuộc Giai đoạn 3 trở đi): ánh sáng lạnh `#5a88d0`, sương `#607050`, bảng màu cỏ/đất/đá/nước làm đích để tinh chỉnh thêm.
- Hạ thêm độ bão hòa body của Fire/Ice/Lightning, thêm hệ Poison vào `ELEMENT_PALETTE`, tăng mật độ pixel nhân vật theo ảnh tham chiếu.
- Đưa tint mặc định trong `VFXManager.ts`, `combat/*.ts`, `weaponArt.ts` về config.

## 6. Việc còn tồn đọng đã biết

- Màu hard-code còn lại, **đã quyết định để Giai đoạn 4** (màu vũ khí và sprite, chưa có bảng màu duyệt): tint mặc định `VFXManager.ts` (14 hex), `combat/*.ts` (`ExcaliburWeapon` 14, `ScytheWeapon` 7, `swordFireVfx` 5, `StaffWeapon` 3, `DualBladesWeapon` 2, `DragonBowWeapon` 2), `weaponArt.ts` (142), `placeholderPlayer.ts` (4), `chestArt.ts` (16), `gearLook.ts` (26), `weaponInfo.ts` (3), `vfx/brickBox.ts` (5). Không đổi code ở các file này; số liệu là số hex tìm thấy bằng grep, chưa phân loại vai trò từng màu.
- Hard-code nhỏ khác chưa đụng tới: `arrow_rain` `#ff5e6c`, `NEON_CSS.magenta` `#ff4fd8` (không được dùng ở đâu), `NEON` của vũ khí (sword, bow, scythe, dualBlades, staff), `heal`.
- Rủi ro nhìn rõ đạn quái (tính toán, đã được người dùng xem ổn nhưng cần theo dõi khi chơi nhiều quái): đạn Fire gần đạn vật lý của quái; đạn Ice của quái cùng hue với đạn cyan của người chơi (nhưng đạn quái là hình tròn, đạn người chơi là thanh nhỏ nên vẫn phân biệt được qua hình dạng); thân đạn tối hơn trước (~83% độ sáng tint).
- Không có quái tinh anh trong code; phân cấp thường/tinh anh/boss mới áp dụng được cho thường, bắn xa và boss.
- Trích palette PNG pack làng (script chỉ đọc): độ bão hòa trung bình 23–38%, độ sáng trung bình 26–33%; điểm lệch Grim Dark chính là cỏ/cây/bụi xanh bão hòa (`#284c14`, `#38681c`) và nước xanh sáng (`#284870`, `#6888b0`). Viền pack `#1c1c20`, đất `#402c1c`/`#685840`, đá `#58646c`.
