# UI DESIGN SPECIFICATION

Phân loại: **Hybrid** (vẽ procedural rồi **bake** thành texture/9-slice, dùng như ảnh) + Procedural cho icon/font. Chưa đổi hệ thống UI nào; đây là đặc tả.

## 1. Hiện trạng [XM]

UI toàn bằng `Graphics`/`Text`/`BitmapText`, không ảnh: `ui/Hud.ts` (806 dòng), `ui/PlayerBars.ts`, `ui/combat/*` (CombatHUD, ActionButton, AimIndicator, ControlLayoutEditor/Store), `ui/SkillTreeView.ts`, `ui/SkillQuickAssign.ts`, `ui/TouchControls.ts`, `ui/DayNightToggle.ts`, scenes `MainMenu`, `CharacterSelect`, `CharacterPanel` (1879 dòng), `VillageShop` (918 dòng). Font `monospace` hệ thống (≈277 chỗ khai báo font/size trong 19 file, `CharacterPanelScene` 130). Số sát thương: bitmap 5×7 (`0123456789k!`). Thanh trên đầu 51×6, mana 51×2 (`PlayerBars.ts:6-9`), đặt theo `player.displayHeight/2` (I19).

## 2. Phong cách [ĐX]

Khung "đá + kim loại cũ": nền tối α0.88 `#12141a`, viền đồng `#8a6a3a` 2 px (sáng trên, tối dưới = vát), đinh tán 2×2 ở góc. Nguyên tắc từ ảnh tham chiếu: nền tối, khung nặng, vật phẩm bão hòa nổi. Không chép khung của game khác.

| Thành phần | Đề xuất |
|---|---|
| HUD máu/mana | Thanh ngang khung đá + viền sáng trên, hoặc orb vẽ bậc thang; **giữ vị trí/bố cục hiện tại**. Mana không mỏng hơn 3 px thiết kế (R9) |
| Khung/nút | Hàm dùng chung `drawPanel(style)` tạo khung 9-slice **một lần** vào texture rồi dùng `Image` (không vẽ lại mỗi frame) |
| Inventory/Shop/Panel | Ô 32 px, icon 16/24 hiển thị nguyên ×1–2, viền màu độ hiếm (DP-7), nền `#12141a` |
| Skill tree | Nút bát giác/tròn, viền theo hệ, đường nối đồng cũ, nút đã mở có điểm sáng |
| Icon | Lưới ký tự 16×16 trong code (như `weaponArt`), palette 8–12 màu, viền ô theo hệ/độ hiếm. Bộ: trang bị (9), vũ khí (12, key riêng — D8), kỹ năng (18 + 15 từ cây), ngọc (7) |
| Font | Bitmap pixel **có dấu tiếng Việt** (lưới 5×7 không đủ dấu; cần ~5×9 hoặc 6×10) hoặc font ngoài (D6) |
| PC/Cảm ứng | Vùng chạm ≥ 44 CSS px (`MIN_TOUCH_CSS_PX 44`, `controlsConfig.ts`); giữ bố cục `TouchControls`/`ControlLayoutEditor`/`CombatHUD` |

## 3. Ràng buộc

- Icon vũ khí hiện **dùng chung texture** với sprite cầm tay (I17: `CharacterPanelScene.ts:1495,1581,1808-1823`, `WeaponChest.ts:118-123`); đổi art cầm tay = đổi icon. Tách key riêng ở gói UI (D8) và cập nhật `ASSET_CATALOG`.
- Procedural không có gradient mịn kiểu pixel: dùng dithering và dải bậc thang.
- Hiệu năng: bake khung/nút một lần; tránh `Graphics.clear()+draw` mỗi frame cho khung tĩnh.
- Mobile FIT 0.667–0.722 (640×360–844×390): nét ≥ 3 px thiết kế; chưa đo vùng che joystick/nút [?] — cần ảnh chụp ở 844×390.
- File lớn dùng chung (`CharacterPanelScene.ts`, `Hud.ts`) → làm tuần tự, mỗi file một gói.

## 4. Pipeline ảnh (nếu bạn muốn)

PNG 9-slice trong `public/assets/ui/` (tên theo `ASSET_NAMING.md`, ví dụ `ui-panel-stone.png`), nạp bằng `load.image`. Cần bạn (hoặc công cụ ngoài) tạo PNG; Developer không tạo được (WORKFLOW §8).

## 5. Tiêu chí riêng

1. Không đổi logic panel/shop/skill tree (diff chỉ phần vẽ/bố cục tĩnh).
2. Chữ có dấu tiếng Việt hiển thị đúng ở mọi cỡ dùng.
3. Mọi vùng bấm ≥ 44 CSS px ở FIT 0.667; thông tin cốt lõi (HP/giáp/EN, hồi chiêu) đọc được.
4. Màu độ hiếm/UI ∈ registry (sau khi DP-7/DP-8 duyệt).
