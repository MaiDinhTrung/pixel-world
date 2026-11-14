# Asset Library — Pixel World

Thư viện tài nguyên là **danh mục tham chiếu**, không phải thư mục ảnh: chỉ `public/assets/village/` là file thật; mọi art khác (nhân vật, quái, vũ khí, hòm, VFX…) được **sinh bằng code lúc chạy** trong `PreloadScene.create()`.

| File | Nội dung |
|---|---|
| [ASSET_CATALOG.md](ASSET_CATALOG.md) | Danh mục từng tài nguyên: key, nguồn, nơi dùng, trạng thái |
| [VFX_GUIDE.md](VFX_GUIDE.md) | Quy chuẩn hiệu ứng hình ảnh |
| [ANIMATION_GUIDE.md](ANIMATION_GUIDE.md) | Quy chuẩn animation |
| [ASSET_NAMING.md](ASSET_NAMING.md) | Quy tắc đặt tên |

Mọi mục trong các file này mang nhãn **[CÓ]** (đã kiểm chứng trong repo) hoặc **[ĐỀ XUẤT]** (quy ước mới, chưa áp dụng). Cập nhật lần cuối: 2026-11-14.

## Quy trình trước khi tạo tài nguyên mới

1. **Tra catalog**: tìm theo nhóm/từ khóa trong `ASSET_CATALOG.md`.
2. **Kiểm lại bằng Grep** (catalog có thể cũ): `TEXTURE_KEYS` ở `src/config/constants.ts`, `VFXId` ở `src/vfx/vfxTypes.ts`, `VILLAGE` ở `src/config/assets.ts`, `VFX_TEXTURES`/`VFX_ANIMS` ở `src/vfx/vfxTextures.ts`.
3. **Ưu tiên theo thứ tự**: (a) dùng đúng cái có sẵn; (b) dùng cái có sẵn + `tint`/`scale`/`angle`/tham số số liệu; (c) chỉ khi không đủ mới tạo mới.
4. **Khi tạo mới**: đặt tên theo `ASSET_NAMING.md`, đăng ký ở đúng nơi (xem bảng "Tìm file" trong `docs/PROJECT_MAP.md`), thêm vào `ASSET_CATALOG.md` trong cùng thay đổi, và ghi lý do không tái dùng được.
5. **Không** di chuyển/đổi tên/xóa asset hiện có khi chưa có kế hoạch được xác nhận; **không** tạo bản sao; asset mới chỉ đi kèm tính năng được yêu cầu.
