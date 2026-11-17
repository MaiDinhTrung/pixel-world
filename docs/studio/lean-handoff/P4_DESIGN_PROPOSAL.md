# P4 — Thiết kế đã duyệt

Trạng thái: **ĐÃ DUYỆT CỔNG 1 (người dùng, 2026-11-17: "Duyệt theo khuyến nghị cả 7 quyết định")**. Câu trả lời cho §3 = mặc định trong ngoặc; bậc quái Lõi Rừng = 3 (1 + offset 2). P4b chỉ bắt đầu sau khi P4a nghiệm thu. Nguồn: Gameplay Designer + Visual Designer (2026-11-17, chỉ đọc), Lead tổng hợp. Kiến trúc gốc: `docs/WORLD_ARCHITECTURE.md` (W-A9, W-A16, G4, Q6, R10), `docs/WORLD_MAP_DESIGN.md` D3.

## 1. Khuyến nghị của Lead
Tách P4 thành hai gói tuần tự; P4b chỉ bắt đầu khi P4a đã nghiệm thu.
- **P4a — MapScene chung (cấp L, không nội dung mới, người chơi không thấy khác):** một scene map dùng chung + registry `builderId → buildMap()` (W-A9). Thay các hook `BossArenaScene` đang ghi đè bằng dữ liệu `MapDef`: `inBossArena` ← `kind === 'boss'`; vùng an toàn ← `zones[].safe` (bỏ `isInsideVillage` cứng); ánh sáng ← `MapDef.lighting` (đóng R10); trần quái ← `maxAliveCap`; camera/điểm sinh Boss ← kết quả builder. `validateWorld` bắt `builderId` lạ. Chữ lời nhắc cổng lấy từ dữ liệu connection thay vì `PortalKind`. Xoá/thu `LevelUpScene` resume cứng `SCENE_KEYS.world` (hiện là mã chết, không ai mở) và shop resume theo key chung.
- **P4b — Region + Map thứ hai (phương án B):** Region mới (dự kiến `region.withered`) gồm **một** Map overworld nhỏ "Rừng Sâu", 2 vùng (gần cổng / sâu), không vùng an toàn, không Boss. Cổng vào trong Hoang Địa Sâu (`ZONE_WILDS_FAR`), cổng về đặt cạnh cổng vào. Vai trò: khu cày tuỳ chọn, rủi ro cao thưởng cao. Quái dùng archetype có sẵn, nghiêng caster/swarmer. Hình ảnh: tái dùng 100% asset làng (cây sồi dày, bụi, hàng rào, nước + cầu, đá), không cần ảnh mới; nhận diện bằng bảng màu nền riêng + ánh sáng + biển tên vùng + màu cổng. Số liệu ở file mới `src/config/witheredWoodsConfig.ts` (tên hằng `WOODS_*`) và `worldConfig.ts`.
- **Sửa D3:** "Khởi Nguyên giữ 3 vùng trên 2 map. P4b thêm đúng một Region thứ hai gồm một Map overworld (2 vùng, không Boss, không vùng an toàn) để kiểm chứng kiến trúc. Map thứ ba, Boss thứ hai, ambient theo vùng để sau. D5/D6 giữ: vị trí không lưu, chết về làng."

## 2. Phương án bị loại
- P4b-A: map thứ hai trong cùng Region (không kiểm chứng Region thứ hai).
- P4b-C: hầm ánh sáng cố định với Elite chắc chắn (cần luật mới "Elite khi vào map" = hệ thống mới).
- Hình ảnh Hầm mỏ/Tàn tích: phải tách tham số khỏi `bossArena.ts`/`castleWall.ts`, dễ va Visual Overhaul.

## 3. Người dùng cần quyết (Lead đề xuất mặc định trong ngoặc)
1. Tách P4a/P4b? (**có**)
2. P4a đổi tên lớp `WorldScene` → `MapScene` hay giữ tên? (**giữ tên lớp ở P4a** để diff nhỏ; đổi tên là gói đổi tên riêng sau)
3. Map thứ hai: B Rừng Sâu? (**B**)
4. Tên tiếng Việt cho Region/Map/2 vùng? (đề xuất: Region "Rừng Úa", Map "Rừng Sâu", vùng "Bìa Rừng" / "Lõi Rừng")
5. Ánh sáng map mới: `day_night` hay `fixed` hoàng hôn? (**fixed hoàng hôn xanh lục** — nhận diện rõ hơn; cần P4a đọc `lighting`)
6. Bậc khởi điểm: `WOODS_TIER_FLOOR = 1`, `WOODS_DEEP_TIER_OFFSET = 2` (giá trị khởi điểm, chỉnh sau playtest)
7. Biển tên Region khi đổi Region, hay chỉ biển tên vùng? (**chỉ biển tên vùng** ở P4b)

## 4. Tiêu chí nghiệm thu
**P4a máy:** build/tsc/test qua, test không giảm; chỉ một scene map đăng ký trong `gameConfig.ts`; `validateWorld` bắt `builderId` lạ; `src/` không còn ghi đè `getMapId`/`inBossArena`; diff rỗng ở `combatConfig.ts`, `enemyConfig.ts`, `bossArenaConfig.ts`, `src/progression/**`.
**P4a chơi thật:** vào/ra Arena giữ HP/hồi chiêu; cổng về khoá khi Boss còn sống; Boss sinh sau độ trễ, quái con sau khi hạ Boss; chết ở Arena về làng; shop/bảng nhân vật hoạt động; ngày/đêm và biển tên vùng chỉ ở map chính; Console sạch.
**P4b máy:** `WORLD` có 2 Region, `validateWorld` rỗng; test `requestTravel` hai chiều Hoang Địa ↔ Rừng; điểm đến lệch khỏi cổng; `zoneAt` trả đúng 2 vùng mới, không an toàn; quyết định Boss ở map mới không bao giờ `spawn`; save không chứa id map/region.
**P4b chơi thật:** thấy cổng trong Hoang Địa Sâu, lời nhắc đúng tên đích; chuyển cảnh + biển tên mới trong ~3 s; ảnh chụp phân biệt được với làng/Hoang Địa; phím N không đổi pha ở map `fixed`; quái vùng sâu trâu hơn rõ; Elite xuất hiện được; đồng hồ Boss vẫn chạy; chết về làng; tải lại vào làng; không có vùng an toàn giả ở toạ độ làng; mobile không giật.

## 5. Rủi ro
P4a đụng `WorldScene.ts` + `BossArenaScene.ts` (cấp L, dễ mất ca riêng của Arena: độ trễ Boss, khoá cổng, quái con); Phaser `scene.start` chính nó; P4b: `tierFloor` 1 cho thưởng sớm cao; bộ đếm Elite reset mỗi lần vào map nên chuyến ngắn ít Elite; số cây/ánh sáng ảnh hưởng mobile (giới hạn trong config, đo bằng `?perf`).
