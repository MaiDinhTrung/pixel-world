# ANIMATION_GUIDE

## Hiện trạng [CÓ]
Chỉ 3 nơi gọi `scene.anims.create`; tất cả chạy trong `PreloadScene.create()`, frame lấy từ texture sinh bằng code.

| Nhóm | Key anim | Frame name | Hành động (số frame / fps / repeat) | File |
|---|---|---|---|---|
| Người chơi (4 hướng `down/left/right/up`) | `${animPrefix}-${direction}-${action}` (vd `knight-down-idle`) | `${direction}-${action}-${i}` | idle 4/4/-1, run 6/11/-1, attack 4/13/0, hurt 1/6/0, death 4/7/0 | `utils/placeholderPlayer.ts` (`ACTION_SPECS`, `createPlayerAnimations`) |
| Quái / boss | dựng từ spec trong `enemySprites.ts` | `${prefix}-${action}-${i}` | idle 2/4/-1, walk 4/9/-1, attack 2/10/0, death 2/7/0; boss fps ×0.7 (tối thiểu 3) | `utils/enemySprites.ts` (`ACTION_SPECS`) |
| VFX | `vfx.slash.arc` | số `0..5` | 6 frame, 30 fps, khung 96 px | `vfx/vfxTextures.ts` (`VFX_ANIMS`) |

Quy ước đang dùng:
- Bọc `if (!scene.anims.exists(key))` trước `create` (an toàn khi scene khởi động lại).
- Cỡ khung: người chơi 48 px, quái 24 px, boss 32 px, slash 96 px.
- Hướng ngang dùng frame `left/right` riêng; vũ khí lật bằng scale âm (`setWeaponMirror`), không dùng `setFlipY`.
- attack/hurt/death `repeat: 0`; idle/run/walk `repeat: -1`.
- Số khung/fps nằm trong bảng `ACTION_SPECS` của từng file, không hard-code ở chỗ gọi `play`.

## Quy chuẩn đề xuất [ĐỀ XUẤT — chỉ áp cho anim mới]
- Key mới dạng `<nhóm>.<tên>[.<biến thể>]` như `vfx.slash.arc`.
- Khai báo key anim trong một hằng (như `VFX_ANIMS`), không chuỗi rải rác.
- Nhân vật/quái mới: tái dùng `ACTION_SPECS` hiện có; chỉ thêm action khi cần và cập nhật bảng trên.
- Mọi anim mới đăng ký qua một hàm `create…Animations` gọi từ `PreloadScene`.
