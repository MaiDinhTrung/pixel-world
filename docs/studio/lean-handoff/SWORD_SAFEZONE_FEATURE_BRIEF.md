# FEATURE BRIEF + QA Plan — Sửa lỗi: kiếm huỷ combo theo toạ độ làng cứng

Cấp: **L theo quy tắc** (đụng `WorldScene.ts`, một dòng) — Lead tự sửa, QA độc lập. Người dùng đồng ý sửa (2026-11-17: "đồng ý sửa máp", sau đề xuất trong báo cáo P4a / mục P4 của `docs/studio/DECISIONS.md`). Báo cáo QA **tối đa 10 dòng**.

BASELINE (ngoại lệ có hash, chồng lên P3d + P4a chưa commit, đã QA Đạt): HEAD=73c7b69a235a3e6f5d658056073264daa33800a1 · nhánh=main · tracked chưa sạch · hash trước khi sửa: `src/scenes/WorldScene.ts` 62c11a283f4ca6429444d010e6031f7fec9a91f8 · `src/combat/SwordWeapon.ts` 7baf6f1dd97c53b19ddd55754e63b1c482c53b14 (= HEAD) · mọi file khác giữ nguyên hash so với lúc QA P4a kết thúc.

## Lỗi
`src/combat/SwordWeapon.ts` (bản HEAD dòng ~126–133) huỷ hàng đợi/combo khi `isInsideVillage(player.x, player.y)` — toạ độ cứng `VILLAGE_ZONE` (x 1300–2540, y 900–1620), không theo Map. Đấu Trường 1600×1088 trùng góc Đông-Nam (x 1300–1600, y 900–1088) ⇒ combo kiếm bị huỷ ở đó dù Arena không có vùng an toàn. Map mới (P4b) cũng sẽ dính.

## Sửa
- `SwordWeapon` nhận tham số thứ 4 bắt buộc `isSafePoint: (x, y) => boolean`, dùng thay `isInsideVillage`; bỏ import `isInsideVillage`.
- `WorldScene.createWeaponById('sword')` truyền `(x, y) => this.isSafeZonePoint(x, y)` (P4a: `zoneAt(map, x, y)?.safe === true`).
- Test mới `src/combat/swordSafeZone.test.ts`.

File ĐƯỢC SỬA: `src/combat/SwordWeapon.ts`, `src/scenes/WorldScene.ts` (chỉ chỗ `new SwordWeapon`). File ĐƯỢC TẠO: `src/combat/swordSafeZone.test.ts`. Tài liệu Lead: `docs/studio/**`, `docs/PROJECT_MAP.md`.

## Tiêu chí
- A1 build, `npx tsc --noEmit`, `npm test` qua (≥ 751).
- A2 So với hash baseline: chỉ `SwordWeapon.ts`, `WorldScene.ts` (một hunk tạo kiếm) đổi + 1 file test mới; không file nào khác đổi hash so với trạng thái sau P4a.
- Q1 Ở map chính hành vi không đổi: `isSafeZonePoint` ⇔ `isInsideVillage` (đã khoá ở `src/scenes/worldSceneMap.test.ts` A6); mọi chỗ khác dùng vùng an toàn trong `WorldScene` đã theo Map từ P4a.
- Q2 Ở Arena: QA xác nhận người chơi **đứng tới được** vùng x 1300–1600, y 900–1088 hay không (đọc biên/tường trong `src/world/bossArena.ts`, `src/config/bossArenaConfig.ts`); nêu rõ lỗi có thực sự chạm được khi chơi.
- Q3 Không còn chỗ nào trong `src/` (ngoài `WorldScene`/`economyConfig`/test) gọi `isInsideVillage` theo toạ độ cứng mà đáng lẽ phải theo Map; liệt kê nếu có.
- Hồi quy: kiếm combo 3 đòn ngoài làng; vào làng giữa combo thì huỷ như cũ; vũ khí khác không đổi.
