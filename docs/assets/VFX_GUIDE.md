# VFX_GUIDE

## Hiện trạng [CÓ]
- Cửa duy nhất: `VFXManager.for(scene).play(id, opts)`; hiệu ứng kéo dài: `.attach('aura.shield' | 'aura.fury', target, tint)` trả `VFXHandle.stop()`. Mỗi scene một manager, tự dọn khi shutdown; một emitter particle dùng chung (`src/vfx/VFXManager.ts`).
- `VFXId` (10): `slash.arc`, `ring.shock`, `burst.sparks`, `impact.hit`, `glow.flash`, `ground.crack`, `dust.puff`, `ghost.afterimage`, `aura.shield`, `aura.fury`. Tùy chọn: `VFXPlayOptions` ở `vfx/vfxTypes.ts` (`x, y, angle, scale, radius, tint, durationMs, count, speed, texture, frame`).
- Texture VFX (`VFX_TEXTURES`, `vfx/vfxTextures.ts`): `vfx-pixel`, `vfx-ring`, `vfx-slash`, `vfx-crack`, `vfx-aura`, `vfx-spear`, `vfx-spear-sharp`, `vfx-ellipse`, `vfx-bolt`.
- Quy ước kỹ thuật:
  - Texture vẽ **màu trắng** (alpha theo ô), tô màu bằng `tint`.
  - Sprite vẽ **hướng sang phải (+x)**, xoay theo `angle`.
  - Lưới pixel `CELL = 2` (hàm `paint()`).
  - Pool sprite có trần `VFX_MAX_SPRITES` (80); particle tối đa `VFX_MAX_PARTICLES` (250); cảm ứng nhân số particle với `VFX_TOUCH_PARTICLE_SCALE` (0.6).
  - Depth: `VFX_DEPTH.ground` 4 (dưới nhân vật), `normal` 3000, `top` 3010 (`config/vfxConfig.ts`).
  - Không tạo/hủy object khi chơi — dùng pool.
- Số sát thương: `vfx/DamageNumberManager.ts` (pool BitmapText, không tween) — chi tiết trong `docs/PROJECT_MAP.md`.
- Hiện 6 skill Đấu sĩ dùng `attachAura`, `slash.arc`, `ground.crack` (`skills/skills.ts`).
- Một số hiệu ứng vẽ `Graphics` trực tiếp, không qua VFXManager (danh sách ở `ASSET_CATALOG.md` mục 3).

## Quy chuẩn đề xuất [ĐỀ XUẤT]
1. Hiệu ứng mới = thêm id vào `VFXId` + nhánh trong `VFXManager.play`, texture trắng trong `vfxTextures.ts`, số liệu ở `config/vfxConfig.ts`. Không vẽ `Graphics` rời cho hiệu ứng lặp nhiều lần (chỗ đang vẽ trực tiếp thì để nguyên).
2. Màu theo hệ sát thương lấy từ `ELEMENT_PALETTE` (lõi/thân/viền) trong `config/damageTypeConfig.ts` — nguồn duy nhất; `ELEMENT_COLORS` và `DAMAGE_NUMBER_COLORS` lấy màu thân từ đó. Màu khác (đạn, heal…) ở `config/palette.ts`. Không hard-code mã màu trong logic.
3. Ưu tiên tái dùng id có sẵn, đổi `tint`/`scale`/`count` trước khi thêm id mới.
4. Hiệu ứng kéo dài phải `stop()` khi mục tiêu mất hoặc đổi scene.
