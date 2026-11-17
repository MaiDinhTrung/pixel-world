# Codemap — VFX / Atmosphere / Art / Audio

Xác minh: HEAD `31f5264` (2026-11-17) · Theo dõi: `src/vfx/ src/art/ src/utils/{effects,pixelTexture,enemySprites,enemyVariantSprites,placeholderPlayer,weaponArt}.ts src/config/{vfxConfig,atmosphereConfig,damageNumberConfig,palette}.ts public/assets/`
Kiểm lỗi thời: `git log --oneline 31f5264..HEAD -- src/vfx src/art src/config/vfxConfig.ts src/config/atmosphereConfig.ts`

**Vai trò:** hiệu ứng chiến đấu, số sát thương nổi, không khí (ngày/đêm, sương, ánh sáng, vignette), texture sinh runtime, bảng màu nghệ thuật.
**Audio: chưa tồn tại** — không có mã âm thanh hay file âm thanh (đã Grep 2026-11-17). Khi thêm: tạo mục ở đây + `docs/assets/ASSET_CATALOG.md`.

## L2 — Module
| Module | Vai trò | File | Phụ thuộc chính |
|---|---|---|---|
| VFX | `VFXManager.play(id, …)` (thêm id mới ở đây), pool sprite/particle, kiểu `VFXId` | `vfx/{VFXManager,VFXPool,vfxTypes}.ts` | `vfx/vfxTextures`, `config/vfxConfig` |
| Texture VFX | `VFX_TEXTURES`, `VFX_ANIMS`, đạn quái theo nguyên tố | `vfx/vfxTextures.ts` | `config/damageTypeConfig` (`ELEMENT_PALETTE`) |
| Số sát thương | Pool BitmapText, gộp, trần, màu theo loại | `vfx/{DamageNumberManager,damageNumberFont,damageNumberLayout}.ts` (+ test) | `config/damageNumberConfig` |
| Không khí | Bật/tắt, `TimeMode`, ambient, sương, vignette, đèn điểm, tint môi trường, ground wash | `vfx/atmosphere.ts` (~600) | `config/atmosphereConfig` |
| Vẽ khối gạch | Tường gạch chiếu xiên (Fortress) | `vfx/brickBox.ts` | — |
| Hiệu ứng cũ | `spawnHitSpark/Glow/Burst/Ring/Dust/Afterimage` — lớp tương thích, chỉ chuyển sang `VFXManager` | `utils/effects.ts` | `vfx/VFXManager` |
| Sprite sinh runtime | Người chơi, quái, biến thể, vũ khí, hòm, texture pixel | `utils/{placeholderPlayer,enemySprites,enemyVariantSprites,weaponArt,weaponTextures,chestArt,pixelTexture}.ts` (gọi từ `PreloadScene`) | — |
| Art Visual Overhaul | Chỉ bảng màu + test; **chưa nối vào game**. `artContract.test.ts` đóng băng bất biến gameplay↔art (hitbox, frame 48, scale quái/Boss, texture đạn, clip, tay cầm); module art không được import `entities|combat|skills|scenes` (`artPurity.test.ts`) | `art/palette.ts` + `art/*.test.ts` | — |
| Asset ảnh | Ảnh làng (PNG + LICENSE) | `public/assets/village/`, đường dẫn `config/assets.ts` (`VILLAGE`) | — |

## Ghi chú khi thay đổi
- Trước khi tạo asset/texture/VFX/anim mới: `docs/assets/README.md` (tái dùng trước), `ASSET_CATALOG.md`, `ASSET_NAMING.md`, `VFX_GUIDE.md`, `ANIMATION_GUIDE.md`, `COLOR_PALETTE.md`; cập nhật catalog cùng thay đổi; không đổi tên/xoá asset khi chưa xác nhận.
- Depth các lớp: `ATMOSPHERE_DEPTH` (`atmosphereConfig.ts`), `VFX_DEPTH` (`vfxConfig.ts`).
- Tham số gỡ lỗi: `?atmo=off`, `?vignette=0`, `?time=night`, `?perf`; phím N đổi ngày/đêm.
- Hiệu năng mobile: trần `VFX_MAX_SPRITES/PARTICLES`, `DAMAGE_NUMBER_MAX_ACTIVE_TOUCH`; kế hoạch đo `docs/perf/MOBILE_BENCHMARK_PLAN.md`.
- Visual Overhaul (Dark Fantasy): `docs/visual-overhaul/` — chưa triển khai, cần quyết định thiết kế trước.
