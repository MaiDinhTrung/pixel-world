# VISUAL OVERHAUL — Dark Fantasy Stylized Pixel Art

Trạng thái: **Feature Specification, chờ duyệt Cổng 1** (2026-11-16). Chưa code, chưa thay asset, chưa commit. Tài liệu do AI Lead tổng hợp từ báo cáo của `visual-designer` và `gameplay-designer` (chỉ đọc) và từ việc Lead tự đọc code. Nhãn: **[XM]** đã xác minh bằng đọc code/tài liệu; **[SUY]** suy ra, chưa chạy thử; **[ĐX]** đề xuất; **[?]** chưa xác định.

## Mục lục

| # | Tài liệu | Nội dung |
|---|---|---|
| 1 | [ART_BIBLE.md](ART_BIBLE.md) | Nguyên tắc, bảng màu, pixel scale, kích thước, ánh sáng/bóng, animation, VFX |
| 2 | [PALETTE_PROPOSALS.md](PALETTE_PROPOSALS.md) | Đối chiếu với `COLOR_PALETTE.md` đã duyệt; mọi thay đổi tách thành đề xuất riêng DP-1…DP-10 |
| 3 | [ASSET_INVENTORY.md](ASSET_INVENTORY.md) | Asset Inventory, Asset Replacement Map, phân loại Procedural/Image/Hybrid, module sinh hình ảnh và cách tách visual khỏi gameplay |
| 4 | [CHARACTER_SPEC.md](CHARACTER_SPEC.md) | Đặc tả nhân vật (4 lớp, 3 tầng trang bị) |
| 5 | [ENVIRONMENT_SPEC.md](ENVIRONMENT_SPEC.md) | Môi trường, làng, thành trì, Arena, cổng, NPC |
| 6 | [MONSTER_BOSS_SPEC.md](MONSTER_BOSS_SPEC.md) | Quái thường, quái bắn xa nguyên tố, Boss, phân cấp hình ảnh |
| 7 | [ANIMATION_VFX_SPEC.md](ANIMATION_VFX_SPEC.md) | Animation, VFX, lớp (depth), quy tắc không che thông tin |
| 8 | [UI_SPEC.md](UI_SPEC.md) | HUD, menu, panel, shop, skill tree, icon, font |
| 9 | [GAMEPLAY_INVARIANTS.md](GAMEPLAY_INVARIANTS.md) | Bất biến, bản đồ animation ↔ timing, độ đọc gameplay (từ Gameplay Designer, đã đối chiếu code) |
| 10 | [PROTOTYPE_PLAN.md](PROTOTYPE_PLAN.md) | Lát cắt dọc đưa vào Phaser để duyệt trước khi sản xuất hàng loạt |
| 11 | [FEATURE_SPEC.md](FEATURE_SPEC.md) | Chia gói, file bị ảnh hưởng, Acceptance Criteria (6 tiêu chí), kế hoạch kiểm thử, rủi ro |

## Kết luận ngắn

1. Toàn bộ art hiện là **procedural** (sinh bằng code lúc chạy) trừ pack làng CC0 (37 PNG). Đề xuất giữ **Procedural / Image / Hybrid theo từng nhóm** (xem mục 3), không chuyển hàng loạt sang spritesheet. Lý do lớn nhất: ngoại hình nhân vật được **vẽ lại theo trang bị đang mặc** và AI-dev không tạo được file PNG.
2. Gameplay đọc **kích thước khung/scale/body** (hitbox), **tọa độ tay cầm vũ khí**, **kích thước texture của đạn người chơi** (chính là hitbox đạn), **tên frame/anim key**. Đây là các bất biến phải đóng băng bằng test **trước** khi vẽ lại gì (Gói 0).
3. Có ba **mâu thuẫn** giữa mong muốn mỹ thuật và gameplay/quyết định cũ đã được giải quyết hoặc tách thành câu hỏi riêng (mục "Mâu thuẫn" dưới đây).
4. Lộ trình: **Gói 0** đóng băng bất biến → **Prototype** (cờ `?art=v2` + trang `?gallery`, không xóa/ghi đè asset cũ) → bạn duyệt → sản xuất theo mức rủi ro (palette → môi trường → UI → quái → nhân vật/vũ khí → VFX → Boss/Arena).

## Mâu thuẫn đã phát hiện và cách xử lý (WORKFLOW §7)

| # | Mâu thuẫn | Bên A | Bên B | Xử lý |
|---|---|---|---|---|
| M1 | Boss scale | Visual: làm tròn scale Boss về số nguyên (3 hoặc 4) cho đỡ méo pixel | Gameplay: body Boss = 20×20 nhân theo scale (`BossEnemy.ts:175-176`) nên **đổi scale = đổi hitbox** (I11) | **Cơ chế quyết trước:** giữ công thức scale (3.2→4.4) và body. Art Boss vẽ trong khung 32 sao cho đọc tốt ở scale lẻ. Đổi scale chỉ qua đề xuất riêng (có tính lại body để giữ hitbox thế giới) |
| M2 | Số frame animation | Visual: attack 6 frame, death thêm 1–2 frame, giữ "tổng thời lượng như cũ" | Gameplay: anim attack người chơi bị cắt ở **260 ms** (`Player.ts:53`); quái chết bị `destroy()` sau **340 ms** (`EnemyBase.ts:686-713`); telegraph quái bắn xa 480 ms | Quy tắc cứng: clip attack người chơi ≤ 260 ms, clip chết quái ≤ 340 ms, windup quái cận chiến ≤ 200 ms, windup quái bắn xa ≤ 480 ms (xem GAMEPLAY_INVARIANTS §2.3). Số frame tự do miễn trong các giới hạn đó |
| M3 | Lớp hiển thị | Visual: thêm "hào quang thực thể" ở depth 2702 | Gameplay: **đạn quái (2702) nằm dưới mọi VFX (3000/3010)**; glow ADD của skill người chơi có thể che đạn | Tách thành **DP-6**: nâng depth đạn/telegraph quái lên dải mới (3020–3050) — thay đổi hiển thị thuần, chờ bạn duyệt riêng. Chưa duyệt thì không đổi |
| M4 | Màu sprite quái/boss | Visual: vẽ lại ⇒ đổi màu thân/viền/glow | `COLOR_PALETTE.md` §3: "Giữ nguyên (đã quyết định chưa đổi): màu thân và viền sprite quái/boss…" | **Giữ ràng buộc cho tới khi bạn duyệt DP-1.** Prototype quái dùng đúng bảng màu cũ trừ khi DP-1 được duyệt |
| M5 | Ban ngày | Visual: thêm grading nhẹ cho "u tối" | `COLOR_PALETTE.md` §3a: ngày sáng bình thường (người dùng yêu cầu) | **Giữ nguyên.** Grading ngày chỉ là **DP-4** (tùy chọn) |
| M6 | Môi trường procedural | Visual: có thể tạo prop bằng code (E3) | `COLOR_PALETTE.md` §4: "không dùng texture sinh bằng code để thay thế mọi asset môi trường" | Chỉ prop **nhỏ, bổ sung** (đuốc, bia mộ, cây khô…) bằng code, **không thay** pack. Mức rộng hơn là DP-3 |
| M7 | Icon vũ khí | Visual: bộ icon riêng | Gameplay: icon vũ khí **dùng chung texture** với sprite cầm tay (`CharacterPanelScene.ts:1495,1581,1808-1823`, `WeaponChest.ts:118-123`) nên đổi art cầm tay = đổi luôn icon (I17) | Quyết định D8 (key icon riêng hay chấp nhận dùng chung) |

## Quyết định cần bạn duyệt ở Cổng 1

| Mã | Câu hỏi | Khuyến nghị |
|---|---|---|
| D1 | Mật độ texel: **A giữ lưới hiện tại** (người chơi/tile/vũ khí 1 px, quái ×2, NPC ×3, boss ×3.2–4.4) hay B thống nhất 1 texel = 1 px | **A** (B chạm hitbox/scale, chỉ thử ở một thực thể sau prototype) |
| D2 | Có cho đổi `PLAYER_FRAME_SIZE` (48 px) không | **Không** trong đợt này; nếu cần, đề xuất riêng với hitbox thế giới giữ nguyên |
| D3 | Duyệt từng đề xuất màu DP-1…DP-10 (xem PALETTE_PROPOSALS.md) | Duyệt riêng từng mục; trước khi duyệt giữ nguyên quyết định cũ |
| D4 | Môi trường: E1 (giữ pack + grading + decal) làm mặc định; E2 (xuất PNG palette-shift), E3 (prop mới bằng code), E4 (pack CC0 dark fantasy khác do bạn cung cấp) | **E1 + prop nhỏ bằng code**; E2–E4 xét sau prototype |
| D5 | Phân cấp thường/tinh anh/boss: chỉ **hình ảnh theo tier/nguyên tố đã có**, không thêm quái tinh anh thật (đổi gameplay) | **Chỉ hình ảnh** |
| D6 | Font: bitmap font pixel tự sinh có dấu tiếng Việt (tốn công) hay font ngoài (cần bạn cung cấp/chấp nhận giấy phép) | Bitmap tự sinh, thử trong prototype |
| D7 | Gear vẫn **đổi hình trên người** khi mặc đồ (giữ cơ chế vẽ lại) | **Giữ** (mất = mất phản hồi nâng cấp) |
| D8 | Tạo key **icon vũ khí riêng** (tách khỏi sprite cầm tay) | Có, nhưng ở gói UI, không ở prototype |
| D9 | Chính sách ánh sáng: tối đa 3 chớp toàn màn/giây, `camera.flash` ≤ 180 ms | Duyệt |
| D10 | Prototype **không xóa/ghi đè asset cũ**: bật bằng `?art=v2`, xem bằng `?gallery` | Duyệt |
| D11 | Hook thử Boss (tham số URL ép vào Arena/spawn Boss, không đổi số liệu) để QA nhanh | Duyệt, làm ở Gói 0 |
| D12 | **C2b chưa commit:** khi giao Developer, dùng baseline ngoại lệ có hash (WORKFLOW §6a) hay bạn chốt/commit C2b trước | Bạn chọn; Lead không tự quyết |

## Ràng buộc đã tuân thủ

- Không sửa ba file đang dơ của C2b (`src/scenes/WorldScene.ts`, `src/systems/PlayerState.ts`, `docs/PROJECT_MAP.md`). Mọi tài liệu mới là file riêng trong `docs/visual-overhaul/`. `PROJECT_MAP.md` sẽ cập nhật sau khi C2b được xử lý.
- Không thay đổi, xóa, đổi tên asset nào. Không commit. Không đổi Git baseline.
