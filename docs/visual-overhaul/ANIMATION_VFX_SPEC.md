# ANIMATION & VFX SPECIFICATION

Phân loại: **Procedural** (texture trắng + tint; `Graphics`). Nguyên tắc cốt lõi: **VFX nhìn theo sự kiện đã có, không điều khiển sự kiện**; mọi VFX gắn tại cùng điểm gọi `VFXManager.play`/`Graphics` hiện tại; không đổi thời điểm phát; anticipation hiển thị nằm trong cửa sổ logic sẵn có.

## 1. Bảng animation theo loại thực thể

| Thực thể | Hiện trạng [XM] | Đề xuất | Giới hạn thời lượng |
|---|---|---|---|
| Người chơi | idle 4, run 6, attack 4, hurt 1, death 4; 4 hướng | Giữ số frame, nâng pose | attack ≤ 260 ms (bị cắt), hurt 200 ms |
| Quái thường | idle 2, walk 4, attack 2, death 2 (4/9/10/7 fps) | idle 2–4; attack thêm 1 frame anticipation; death thêm 1 frame tan | windup ≤ 200 ms; **death ≤ 340 ms** |
| Quái bắn xa | như trên | Pose gồng giữ đến lúc bắn | ≤ 480 ms (telegraph) |
| Boss | như quái, fps ×0.7 | attack 3–4 frame, death 4 frame | Theo từng chiêu (600–950 ms); anim attack giữ frame cuối suốt cast |
| NPC | Tĩnh | idle 2 frame "thở" | — |
| Portal | vortex 8f@10fps | Giữ, đổi palette | — |
| Hòm | 2 trạng thái | Giữ; điểm sáng khi legendary | — |
| Lửa/đuốc | **Tĩnh** (pack không có anim) | Thêm anim 4 frame procedural (tách khỏi ánh sáng điểm đã có) | — |
| Slash | `vfx.slash.arc` 6f/30fps, khung 96 | Thay texture, biến thể theo hệ bằng tint | Giữ tổng thời lượng |

Không logic gameplay nào gắn vào `animationcomplete`/frame callback của người chơi/quái/Boss (chỉ `VFXManager.ts:368-371` trả sprite về pool) — số frame tự do trong các giới hạn trên (GAMEPLAY_INVARIANTS E1).

## 2. Phân tầng lớp (depth)

Giữ hệ hiện tại (xem ART_BIBLE §7). **Đề xuất DP-6** (chờ duyệt): đạn quái + vòng báo trước quái/Boss chuyển lên dải 3020–3050 để không bị glow VFX người chơi che. Chưa duyệt thì giữ 2702.

## 3. Quy tắc VFX không che thông tin

| Mục | Quy tắc |
|---|---|
| Alpha | VFX ADD chồng lên người chơi/đạn quái: alpha đỉnh ≤ 0.6; glow lớn (> 96 px) chỉ ở depth `ground` hoặc alpha ≤ 0.4 |
| Thời lượng | Đòn thường ≤ 250 ms; skill ≤ 600 ms; AoE/Boss ≤ 800 ms; **vùng kéo dài** vẽ biên = bán kính thật (lốc xoáy `SCYTHE_WHIRL_RADIUS 98`, Void `VOID_RADIUS 200`) |
| Kích thước | Hình ảnh đòn không lớn hơn hitbox quá ~20% (không "ảo hóa" tầm). Vệt kiếm tầm thật 56–82 px |
| Boss/AoE | Viền rõ + fill ≤ 0.2 alpha; không hiệu ứng khác chồng lên viền trong cửa sổ telegraph |
| Chớp sáng (D9) | ≤ 3 chớp toàn màn/giây; `camera.flash` ≤ 180 ms (hiện 140–260 ms ở 5 chỗ `skills.ts`); không nhấp nháy diện tích lớn > 3 Hz. Nhấp nháy bất tử 80 ms (~6 Hz, nhỏ) và búa READY giữ nguyên |
| Rung màn hình | Giữ 32 chỗ `cameras.main.shake`; VFX mới không cộng thêm |
| Ban đêm | VFX gameplay quan trọng ≥ 3000; trang trí nằm dưới lớp tối |
| Pool | Mỗi hiệu ứng khai báo sprite tối đa; trang trí tự tắt khi `getActiveCount() > 60` (ngưỡng ĐX); **telegraph không dùng pool** |
| Hạt | Cảm ứng ×0.6; trần 250 |

**Hiệu ứng hiện có nguy cơ che** (suy ra từ depth/kích thước, chưa chơi): `glow.flash` Thiên Thạch scale 3 (`skills.ts:1686`) depth 3000 phủ đạn 2702; aura Boss ADD α≤0.32, scale 2.7 (~173 px, `BossEnemy.ts:200-209`); ground cracks depth 4 cùng depth vòng Arc Boss (`VFXManager.ts:456-464`, `BossEnemy.ts:669`); glow búa tích lực scale 1.2 α0.8 (`vfxConfig.ts:58-67`).

## 4. Ngân sách hiệu năng [XM]

`VFX_MAX_SPRITES = 80`; `VFXPool.acquire` **trả `null` khi đầy** và hiệu ứng bị bỏ (`VFXPool.ts:19-25`); `VFX_MAX_PARTICLES = 250`; cảm ứng ×0.6; sương 1 lớp trên cảm ứng. Đề xuất: mỗi anim VFX mới ≤ 8 frame, khung ≤ 96 px; không tăng 80/250; nhiều quái bắn xa (trần sống `MAX_ALIVE_CAP 18`, 1/3 bắn xa ≈ 6 telegraph × 2 sprite) + búa tích lực (~18 sprite) gần trần → đo bằng `?perf` (R10).

## 5. Đồng bộ với thời điểm sát thương

Bảng timing đầy đủ ở GAMEPLAY_INVARIANTS §2. Quy tắc: tiếp xúc hình ảnh trong [−33 ms, +50 ms] quanh mốc logic; recovery hình ảnh ≤ thời gian khóa logic; telegraph còn nhìn thấy tại thời điểm resolve. Búa là mẫu chuẩn: thông số hiển thị đã tách ở `vfxConfig.ts:23-68` (`HAMMER_VFX_*`).

**Lệch hiện có** (không do art mới, ghi để QA biết): tay kiếm đạt reach tối đa sau ~154–231 ms trong khi sát thương ở 40 ms (logic đi trước hình thân; hình đòn do sprite vũ khí/Graphics đảm nhận); vòng ring telegraph quái bắn xa có alpha → 0 đúng lúc bắn (cùng easing Quad.easeOut trong 480 ms) — tín hiệu mạnh nhất nằm nửa đầu cửa sổ (R4).

## 6. Tiêu chí riêng

1. Mỗi VFX mới ghi: id, texture, số frame, thời lượng, depth, alpha đỉnh, số sprite tối đa.
2. Không đổi điểm gọi/thời điểm phát (diff các file `combat/*`, `skills/*` chỉ ở tham số hiển thị).
3. R1–R10 (GAMEPLAY_INVARIANTS §3) đạt cho phần liên quan.
