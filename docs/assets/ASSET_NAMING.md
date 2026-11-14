# ASSET_NAMING

## Hiện trạng [CÓ] (không hoàn toàn nhất quán; KHÔNG đổi tên cái cũ)
| Nhóm | Dạng | Ví dụ |
|---|---|---|
| File ảnh làng | `village-<tên>[-<kích thước>].png`, kebab-case, thư mục theo loại | `buildings/village-tavern.png`, `tilesets/village-grass-tile-32.png` |
| Texture key làng | `village-<tên>` | `village-oak` |
| VFX texture | `vfx-<tên>` | `vfx-ring` |
| VFX id | `<nhóm>.<tên>` | `slash.arc`, `aura.fury` |
| Anim | `<nhóm>.<tên>.<biến thể>` (VFX) hoặc `<prefix>-<hướng>-<action>` (người chơi) | `vfx.slash.arc`, `knight-down-idle` |
| Trang bị | `gear-<tên>` | `gear-iron-helm` |
| Đồng minh | `minion-<tên>` | `minion-skeleton` |
| Người chơi | `player-<classId>` | `player-knight` |
| Texture key cũ | camelCase | `rangedEnemy`, `dragonBow`, `chestClosed` |
| Id nội bộ (vũ khí, skill) | snake_case tiếng Anh | `dragon_bow`, `shield_bash` |
| Hằng key | object SCREAMING_SNAKE | `TEXTURE_KEYS`, `VFX_TEXTURES` |

Chữ hiển thị cho người chơi: tiếng Việt; id/key: tiếng Anh.

## Quy tắc đề xuất cho asset MỚI [ĐỀ XUẤT]
- File: `<nhóm>-<tên>[-<biến thể>][-<kích thước>].<ext>`, chữ thường kebab-case, không dấu, không khoảng trắng; đặt trong `public/assets/<loại>/` (ví dụ `audio/`, `ui/`, `characters/`), chỉ tạo thư mục khi có file thật.
- Texture key mới: kebab-case có tiền tố nhóm (`gear-`, `vfx-`, `minion-`, `ui-`, `sfx-`); khai báo trong hằng tập trung (`TEXTURE_KEYS`, `VILLAGE`, `VFX_TEXTURES`), không chuỗi rải rác.
- Frame: `<hướng>-<action>-<i>` (nhân vật) hoặc `<prefix>-<action>-<i>` (quái).
- Anim/VFX id: `<nhóm>.<tên>[.<biến thể>]`.
- Âm thanh (khi có): `sfx-<nhóm>-<tên>`, `bgm-<tên>`.
- Mọi asset mới ghi vào `ASSET_CATALOG.md` cùng thay đổi; giữ giấy phép/nguồn cạnh asset ngoài (như `LICENSE.txt` của pack làng).
