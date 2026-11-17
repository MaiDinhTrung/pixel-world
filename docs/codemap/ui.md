# Codemap — UI / HUD / Input

Xác minh: HEAD `31f5264` (2026-11-17) · Theo dõi: `src/ui/ src/input/ src/systems/InputController.ts src/config/{controlsConfig,scaleConfig}.ts src/utils/{device,textCache,perfOverlay}.ts`
Kiểm lỗi thời: `git log --oneline 31f5264..HEAD -- src/ui src/input src/systems/InputController.ts src/config/controlsConfig.ts`

**Vai trò:** HUD trong trận (PC + cảm ứng), thanh trên đầu, biển tên vùng, panel cây kỹ năng, điều khiển bàn phím/chuột/cảm ứng và bố cục nút tuỳ chỉnh.

## L2 — Module
| Module | Vai trò | File | Phụ thuộc chính |
|---|---|---|---|
| HUD | Máu/giáp/EN, thanh kỹ năng 7 ô, đồng hồ Boss; chỉ vẽ lại khi đổi | `ui/Hud.ts` (~800) | `entities/Player`, `progression/LevelSystem`, `ui/SkillQuickAssign` |
| Thanh trên đầu | Máu / máu ảo / mana | `ui/PlayerBars.ts` | — |
| Gán skill nhanh | Giữ để chọn skill vào ô | `ui/SkillQuickAssign.ts` | — |
| Biển tên vùng | `ZoneBanner` (file tên cũ RegionBanner) | `ui/RegionBanner.ts` | `world/regionTracker` |
| Ngày/đêm | Nút đổi pha (chỉ Map `lighting` động) | `ui/DayNightToggle.ts` | `vfx/atmosphere` |
| Cây kỹ năng | View dựng trong `CharacterPanelScene` | `ui/SkillTreeView.ts` | `skills/tree/*` |
| Combat HUD mobile | Nút hành động, chỉ báo ngắm, HUD, editor bố cục (tab SETTINGS), lưu bố cục | `ui/combat/{ActionButton,AimIndicator,CombatHUD,ControlLayoutEditor,ControlLayoutStore}.ts` | `config/controlsConfig` |
| Input | Bàn phím/chuột + cảm ứng; joystick; kéo-để-ngắm skill | `systems/InputController.ts`, `ui/TouchControls.ts`, `input/{MobileInputManager,VirtualJoystick,SkillAimingController}.ts` | `skills/skillControl` |
| Tiện ích | Phát hiện cảm ứng; cache text; overlay hiệu năng (`?perf`) | `utils/{device,textCache,perfOverlay}.ts` | — |
| Panel nhân vật | Tab Skills/Stats/Inventory/Equipment/Settings | `scenes/CharacterPanelScene.ts` (xem `codemap/scenes.md`) | `WorldScene` (API public) |

## L3 — Thành phần quan trọng
- `controlsConfig.ts`: `HudButtonId`, `BASE_HUD_LAYOUT` + override theo nhân vật, ngưỡng ngắm, khoá lưu cấu hình. `ControlLayoutStore`: `loadControlSettings/saveControlSettings/resolveButton`.
- Ô kỹ năng: ô 0–2 (phím 3/4/5) + 4 ô phụ (6/7/8/9); touch `skill3`–`skill6`; logic `WorldScene.assignSkillToSlot/clearSkillSlot/getSlotIds`.
- Thang số hiển thị: `config/scaleConfig.ts` (máu/giáp ×100, EN ×20, sát thương ×50) — chỉ UI nhân hệ số.

## Ghi chú khi thay đổi
- Chữ hiển thị tiếng Việt; id nội bộ tiếng Anh.
- Mobile Combat HUD: xong bước 1–5 và 7; bước 6 (PC dùng chung bộ ngắm) tạm hoãn.
- Nút chạm tối thiểu `MIN_TOUCH_CSS_PX` (≥ 44 px).
- Thiết kế hình UI: `docs/visual-overhaul/UI_SPEC.md` (Visual Overhaul chưa triển khai).
