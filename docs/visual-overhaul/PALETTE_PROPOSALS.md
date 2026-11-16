# PALETTE_PROPOSALS — đối chiếu với `COLOR_PALETTE.md` đã duyệt

Nguyên tắc (theo yêu cầu của người dùng): **mọi quyết định đã duyệt trong `docs/assets/COLOR_PALETTE.md` được giữ nguyên.** Mỗi thay đổi dưới đây là **một đề xuất riêng DP-n**, chỉ có hiệu lực khi người dùng duyệt từng mục. Trước khi duyệt, code và prototype dùng đúng giá trị cũ.

## A. Giữ nguyên (không đề xuất đổi)

| Hạng mục đã duyệt | Nguồn |
|---|---|
| Bảng 6 hệ nguyên tố (lõi/thân/viền) `ELEMENT_PALETTE`, nguồn màu duy nhất, số sát thương theo hệ, poison `#4fb83a` | `damageTypeConfig.ts`, COLOR_PALETTE §1–2 |
| Đạn người chơi và dash cyan `#5fe0ff`; đạn quái `NEON.enemyBullet #d8402a` (`#b8243c` đã bị từ chối); texture đạn trụ 44×20 theo hệ; depth 2702 | COLOR_PALETTE §3 |
| Bỏ hồng neon quái bắn xa/boss: `NEON.rangedEnemy #a02848`, `CASTER.glow #c8385a`, `NEON.boss #c8243a` | §3 |
| Đồng bộ màu Dark; `arcane_nova/arcane_chain` giữ tím; telegraph nova Boss `#9d6bff` | §3 |
| Ambient `#20283a` (ngày α0, đêm α0.45), vignette, sương, chu kỳ ngày/đêm, tầm nhìn 238 px, tint môi trường Giai đoạn 2, bố trí làng Giai đoạn 3b | §3, 3a, 3b |
| Nguyên tắc "tint runtime, không sửa/ghi đè PNG gốc" | §4 |
| Mức hoang tàn làng: cũ kỹ, u ám, vẫn có người ở, không thành phế tích | §4 |

## B. Đề xuất thay đổi (mỗi mục duyệt riêng)

| Mã | Đề xuất | Mâu thuẫn với quyết định cũ | Lợi ích / rủi ro | Tác động code | Khuyến nghị |
|---|---|---|---|---|---|
| **DP-1** | Cho phép **vẽ lại sprite quái/boss** (đổi thân/viền/glow `BRUTE`, `CASTER`, `BOSS`, `BRUTE.glow`, `BOSS.glow`) | §3 "Giữ nguyên (đã quyết định chưa đổi): màu thân và viền sprite quái/boss, glow quái thường và boss" | Điều kiện cần của Visual Overhaul quái/boss. Rủi ro: mất nhận diện nếu màu quá gần nền | `utils/enemySprites.ts`, `config/palette.ts` | **Duyệt** (bắt buộc nếu muốn vẽ lại quái/boss). Giữ nguyên các màu **thông tin chiến đấu**: đạn, telegraph, nova `#9d6bff`, cuồng nộ `#ff7a7a/#ff3b3b` |
| **DP-2** | Quái cận chiến: đổi hue chủ đạo từ **tím `#6b3f8a`** sang xanh rêu-xám hoặc đỏ nâu. Đồng thời thống nhất `NEON.meleeEnemy #b45cff` với thân | §5 "Đề xuất CHƯA duyệt" (`meleeEnemy #8a3a6a`) | Tách khỏi hệ Dark/minion tím (Bone mage `0xb48bff`, `Minion.ts:53`) — Gameplay Designer tiêu chí R7. Rủi ro: ít | `enemySprites.ts`, `palette.ts` | **Duyệt** (phụ thuộc DP-1) |
| **DP-3** | Bảng nền môi trường mới (rêu, nâu đất, đá lạnh — `ART_BIBLE.md` §2A) áp qua **tint/ground texture/decal**, không sửa PNG gốc | §4 "không dùng texture sinh bằng code thay mọi asset môi trường"; chưa xét E2 (PNG palette-shift) | Gỡ lệch Grim Dark của cỏ/nước pack (§6). Rủi ro: tint chỉ làm tối/lệch màu, không thêm chi tiết | `world/town.ts`, `atmosphereConfig.ts`, `PreloadScene` (ground/wall/rock) | **Duyệt cho E1 + prop nhỏ**; E2/E3/E4 xét sau prototype (D4) |
| **DP-4** | Ban ngày: lớp grading rất nhẹ (MULTIPLY `#e8e4d8`, α ≤ 0.12) cho "u tối" cả ban ngày | §3a: ngày sáng bình thường, **do người dùng yêu cầu** | Hợp phong cách; rủi ro: trái yêu cầu cũ | `atmosphereConfig.ts` | **Không đề xuất mặc định.** Chỉ làm nếu bạn muốn |
| **DP-5** | Màu vũ khí trong `NEON` (sword, bow, scythe `#ff8fa3` hồng nhạt, dualBlades, staff), `NEON_CSS.magenta #ff4fd8` (không dùng), `heal #7fc99a` | §5 liệt kê "chưa duyệt"; §6 "để Giai đoạn 4" | Đồng bộ với phong cách; rủi ro thấp (chỉ hiển thị) | `config/palette.ts`, `combat/*`, `weaponArt.ts` | Duyệt cùng gói vũ khí |
| **DP-6** | Nâng depth **đạn quái + vòng báo trước** lên dải 3020–3050 (trên mọi VFX); thêm "hào quang thực thể" cho Boss/tinh anh | §3: đạn quái depth 2702; M3 | Đạn không bị glow skill che (Gameplay R3). Rủi ro: đạn đè VFX người chơi, ban đêm vẫn sáng (đã vậy) | `config/vfxConfig.ts` (`ENEMY_BULLET_VISUAL.depth`), vòng báo trước trong `VFXManager` | **Duyệt** (thay đổi hiển thị thuần; có test depth) |
| **DP-7** | Màu độ hiếm vật phẩm 5–6 tầng (`ART_BIBLE` §2C) | Chưa có quyết định cũ; `WEAPON_RARITY_LABELS` chưa đọc [?] | Phân biệt độ hiếm bằng màu | `config/weaponInfo.ts`, `gearConfig.ts` (phần màu), UI | Duyệt cùng gói UI sau khi Lead đọc hệ độ hiếm thật |
| **DP-8** | Bảng màu UI mới (`ART_BIBLE` §2D) | Chưa có quyết định cũ | Nhất quán giao diện | `ui/*`, scenes UI | Duyệt cùng gói UI |
| **DP-9** | Họ màu "phép xanh lục-lam" (`#d8fff4/#2fd9b0/#0e5c52`) làm màu nhấn chính thức (cổng, xác nhận, rune) | Không mâu thuẫn; `#2fd9b0` đã dùng ở cổng về Arena | Bổ sung màu nhấn thứ ba ngoài lửa/máu | `config/palette.ts` | Duyệt khi dùng lần đầu |
| **DP-10** | Hạ thêm độ bão hòa thân Fire/Ice/Lightning, thêm hệ Poison vào `ELEMENT_PALETTE`, tăng mật độ pixel nhân vật | §5 liệt kê "chưa duyệt" | Hợp phong cách tối; **rủi ro mất phân biệt 6 hệ** (Fire gần vật lý; Ice cùng hue đạn người chơi — §6) | `damageTypeConfig.ts` | **Không đề xuất làm trong đợt này**; xét lại sau khi chơi thử |

## C. Quy tắc áp dụng

1. Mỗi DP ghi kết quả duyệt (Đạt/Sửa/Bỏ) vào `docs/studio/DECISIONS.md` bởi AI Lead.
2. Màu **thông tin chiến đấu** (đạn, telegraph, vòng sát thương, trạng thái người chơi) có kiểm riêng độ phân biệt (GAMEPLAY_INVARIANTS §3, R2/R6/R7) trước khi đổi.
3. Mọi hex mới phải nằm trong một registry duy nhất ở `src/config/` (gói 0/1), và có test "không hex nào ngoài registry" cho module art mới.
