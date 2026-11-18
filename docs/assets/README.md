# Asset Library — Pixel World

Thư viện tài nguyên là **danh mục tham chiếu**, không phải thư mục ảnh: chỉ `public/assets/village/` là file thật; mọi art khác (nhân vật, quái, vũ khí, hòm, VFX…) được **sinh bằng code lúc chạy** trong `PreloadScene.create()`.

| File | Nội dung |
|---|---|
| [ASSET_CATALOG.md](ASSET_CATALOG.md) | Danh mục từng tài nguyên: key, nguồn, nơi dùng, trạng thái |
| [VFX_GUIDE.md](VFX_GUIDE.md) | Quy chuẩn hiệu ứng hình ảnh |
| [ANIMATION_GUIDE.md](ANIMATION_GUIDE.md) | Quy chuẩn animation |
| [ASSET_NAMING.md](ASSET_NAMING.md) | Quy tắc đặt tên |

Mọi mục trong các file này mang nhãn **[CÓ]** (đã kiểm chứng trong repo) hoặc **[ĐỀ XUẤT]** (quy ước mới, chưa áp dụng). Cập nhật lần cuối: 2026-11-18 (ST-03: làm mới `ASSET_CATALOG.md`, thêm mục Rừng Úa + "Tái dùng nhanh").

**Kiểm kê tự động bằng script (ST-03: chỉ đánh giá, chưa làm):** catalog nhỏ (37 file ảnh thật, phần còn lại là key sinh bằng code) nên kiểm tay bằng Grep đủ dùng. Chỉ đáng viết script khi có ≥ 100 file ảnh hoặc có âm thanh/atlas: script quét `public/assets/` + khóa trong `config/assets.ts`, in danh sách "file có mà không khai báo" / "khai báo mà không có file" / "key không tham chiếu trong `src`" (chỉ đọc, không sinh bản sao). Hiện không triển khai.

## Quy trình trước khi tạo tài nguyên mới

1. **Tra catalog**: tìm theo nhóm/từ khóa trong `ASSET_CATALOG.md`.
2. **Kiểm lại bằng Grep** (catalog có thể cũ): `TEXTURE_KEYS` ở `src/config/constants.ts`, `VFXId` ở `src/vfx/vfxTypes.ts`, `VILLAGE` ở `src/config/assets.ts`, `VFX_TEXTURES`/`VFX_ANIMS` ở `src/vfx/vfxTextures.ts`.
2b. **Ghi kết quả tìm** vào bảng Reuse Analysis của Task Map (WORKFLOW §13.4): nơi đã tìm + key/file tìm thấy, hoặc "Đã Grep `<từ khóa>` tại `<nơi>`: không có". Không suy đoán nội dung ảnh từ tên file.
3. **Ưu tiên theo thứ tự**: (a) dùng đúng cái có sẵn; (b) dùng cái có sẵn + `tint`/`scale`/`angle`/tham số số liệu; (c) chỉ khi không đủ mới tạo mới.
4. **Khi tạo mới**: đặt tên theo `ASSET_NAMING.md`, đăng ký ở đúng nơi (xem bảng "Tìm file" trong `docs/PROJECT_MAP.md`), thêm vào `ASSET_CATALOG.md` trong cùng thay đổi, và ghi lý do không tái dùng được.
5. **Không** di chuyển/đổi tên/xóa asset hiện có khi chưa có kế hoạch được xác nhận; **không** tạo bản sao; asset mới chỉ đi kèm tính năng được yêu cầu.
