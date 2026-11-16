# ASSET INVENTORY & REPLACEMENT MAP

Nguồn: `docs/assets/ASSET_CATALOG.md` [XM] + Grep bổ sung của Designer/Lead. Không đổi/xóa asset nào trong đợt khảo sát này.

## 1. Phân loại: Procedural Graphics / Image Assets / Hybrid

Định nghĩa:
- **Procedural Graphics (PG):** hình ảnh sinh bằng code lúc chạy (lưới ký tự `rows` trong TS, hàm vẽ canvas, `Graphics`). Không có file ảnh.
- **Image Assets (IA):** file PNG/atlas nạp bằng `load.image/atlas`. Hiện chỉ pack làng CC0 (`public/assets/village`). **AI-dev (Developer) không tạo được PNG** (không có công cụ; Bash bị allowlist, WORKFLOW §8) nên IA mới chỉ đến từ bạn hoặc pack bên thứ ba có giấy phép.
- **Hybrid (HY):** kết hợp: ví dụ ảnh gốc + tint/decal procedural; hoặc lưới ký tự (data) + hàm lắp ghép/biến thể theo trạng thái; hoặc PG nướng (bake) thành texture rồi dùng như ảnh.

**Nguyên tắc chọn (không mặc định spritesheet):** nhóm nào có **biến thể theo trạng thái runtime** (trang bị đang mặc, nguyên tố, tier) hoặc **cần kiểm bằng test cấu trúc** → PG/HY; nhóm **tĩnh, chi tiết cao, nhiều pixel** (nhà, hình menu lớn) → IA hoặc HY nếu có nguồn hợp lệ.

| Nhóm | Hiện tại | Phân loại đề xuất | Lý do |
|---|---|---|---|
| Nhân vật 4 lớp (sheet 48 px) | PG (`placeholderPlayer.ts`) | **HY** (lưới theo bộ phận + hàm lắp ghép theo hướng/frame/gear) | Vẽ lại theo gear đang mặc mỗi lần đổi đồ (`WorldScene` refreshHeroLook) — PNG tĩnh không làm được nếu không có layer; hand offset tính theo công thức |
| Gear (hình trên người) | PG (`gearLook.ts`) | **PG** (tham số `GearLook` → hàm vẽ) | Biến thể 3 tầng × 3 ô |
| Quái cận chiến/bắn xa | PG (`enemySprites.ts` SHEETS) | **HY** (lưới thân + biến thể theo nguyên tố bằng palette) | 4 hệ nguyên tố dùng chung thân |
| Boss | PG | **HY** (lưới 32 px + chi tiết theo tier) | Scale lẻ, nhiều Graphics trực tiếp (`BossEnemy.ts`) |
| Minion | PG | PG | Nhỏ, đơn giản |
| NPC + dân làng | PG (`NPC_ROWS`) | **HY** (lưới thân + phụ kiện nhận diện) | |
| Vũ khí cầm tay (12) | PG (`weaponArt.ts`, ký tự, 1 texel = 1 px) | **PG** (giữ cơ chế `buildArt` + test `weaponArt.test.ts`) | `grip` theo texel; có test cấu trúc |
| Đạn/mũi tên/orb người chơi | PG (`createPixelTexture` ×2) | **PG, kích thước texture bất biến** | Kích thước texture **là hitbox** (I13) |
| Đạn quái (6) | PG (`vfxTextures.ts`) | PG | Đã duyệt; chỉ chi tiết |
| VFX texture + anim | PG (`vfxTextures.ts`, `VFXManager.ts`) | PG | Trắng + tint theo hệ |
| VFX vẽ `Graphics` trực tiếp | PG (`combat/*Weapon.ts`, `BossEnemy.ts`, `skills/*`) | PG (chỉ chỉnh màu/độ dày/biên; không chuyển sang sprite hàng loạt) | Gắn timing/hitbox |
| Ground / wall / rock | PG (`PreloadScene`) | **PG** (nhiều biến thể ô, nhiễu hạt cố định) | Dễ phá lặp |
| Tileset pack (grass, dirt, cobble, farmland, water, wood chưa dùng) | **IA** (CC0) | **HY** (IA + tint + decal procedural) | Giữ giấy phép, không sửa PNG |
| Nhà (10), prop pack | **IA** | **HY** (IA + tint + decal cũ nát + bóng) → có thể IA mới ở đợt sau (D4) | |
| Prop mới (đuốc có anim, bia mộ, cây khô, xương, ánh cửa sổ) | — | **PG** (nhỏ, bổ sung, M6) | Pack không có |
| Tường thành | PG (`castleWall.ts` + `brickBox.ts`) | PG | Đã procedural, chỉ đổi palette/chi tiết |
| Boss Arena (`arena-*`) | PG (`bossArena.ts`) | PG | |
| Cổng dịch chuyển | PG (`portal.ts`) | PG | |
| Hòm | PG (`chestArt.ts`) | PG | |
| Icon trang bị (9) | PG | **PG → bake texture** | |
| Icon vũ khí | **dùng chung texture cầm tay** (I17) | PG; key riêng sau (D8) | |
| Icon kỹ năng/ngọc | **Chưa có** | **PG lưới 16×16** | |
| UI khung/nút/thanh | PG (`Graphics`, `Text`) | **HY** (vẽ procedural rồi **bake** thành texture/9-slice, dùng như ảnh) | Giảm vẽ lại mỗi frame |
| Font | `monospace` hệ thống; số sát thương bitmap 5×7 | **PG** bitmap font pixel có dấu (D6) hoặc font ngoài | |
| Hình lớn (menu/nền chọn lớp) | PG/không có | PG; **IA** nếu bạn cung cấp (D4) | |
| Ánh sáng/ngày-đêm/sương | PG (`vfx/atmosphere.ts`, RenderTexture) | **Giữ** | Đã duyệt |

## 2. Asset Replacement Map

Ưu tiên: P0 = Gói 0 (bất biến) · PT = prototype · P1–P7 = đợt sản xuất theo mức rủi ro (xem FEATURE_SPEC). "Hành động": **Giữ**, **Tinh chỉnh** (không đổi hình, chỉ màu/độ dày), **Thay** (vẽ lại, giữ key/khung/neo).

| Asset | Nguồn file | Hành động | Ưu tiên | Rủi ro / lưu ý |
|---|---|---|---|---|
| Palette registry (mới) | `config/palette.ts`, `damageTypeConfig.ts` | Thêm registry hex cho module art mới | P0/P1 | Thấp |
| Art contract tests (mới) | test mới | Thêm | P0 | Đóng băng bất biến |
| Tint/ground wash | `atmosphereConfig.ts`, `world/town.ts` | Tinh chỉnh (DP-3) | P1 | Thấp |
| `ground`, `wall`, `rock` | `PreloadScene` (`createGroundTexture/WallTexture`, `createPixelTexture`) | Thay (PG nhiều biến thể) | P2 / PT | Thấp |
| Nhà, prop pack | `world/town.ts` + `public/assets/village/*` | Tinh chỉnh (grading + decal) | P2 | Obstacle theo `displayWidth×0.72` (I14) |
| Prop mới | `town.ts` DECOR | Thêm (PG) | P2 | Không đổi vật cản/spawn |
| Tường thành | `world/castleWall.ts`, `vfx/brickBox.ts` | Thay palette/chi tiết | P2 | Chặn vật lý qua `obstacles` — không đổi |
| UI (HUD, panel, menu, shop, skill tree, touch) | `ui/*`, `scenes/*Scene.ts` | Thay phong cách | P3 | `CharacterPanelScene` 1879 dòng; mobile 44 CSS px |
| Icon (mới + trang bị) | `PreloadScene`, `ui` | Thêm/Thay | P3 | I17 |
| Quái cận chiến, bắn xa | `utils/enemySprites.ts` | Thay (giữ khung 24, ×2, key, anim key) | PT / P4 | Body 20×20; chết ≤ 340 ms (E3) |
| Minion | `PreloadScene` | Thay | P4 | Thấp |
| NPC, dân làng | `entities/Npc.ts`, `Villager.ts` | Thay (giữ origin (0.5,1), ×3) | P4 | Chữ tên đặt cố định `y−78/−62/−96` (I15) |
| Người chơi 4 lớp | `utils/placeholderPlayer.ts` | Thay (giữ khung 48, layout, tên frame, hand offset) | PT (Đấu sĩ) / P5 | **Cao** |
| Gear trên người | `config/gearLook.ts` | Thay | P5 | Cao |
| Vũ khí cầm tay (12) | `utils/weaponArt.ts` | Thay/Tinh chỉnh (giữ `grip/forward/muzzle`) | P5 | I8–I9; icon dùng chung |
| Đạn người chơi | `PreloadScene` (bullet/arrow/orb) | Tinh chỉnh **không đổi kích thước texture** | P6 | I13 (hitbox) |
| VFX texture/anim | `vfx/vfxTextures.ts` | Thay | PT / P6 | Pool ≤ 80, hạt ≤ 250 |
| VFX `Graphics` trực tiếp | `combat/*`, `BossEnemy.ts`, `skills/*` | Tinh chỉnh | P6 | Gắn timing/hitbox |
| Hòm | `utils/chestArt.ts` | Thay | P6 | Icon trong hòm (I16) |
| Cổng dịch chuyển | `world/portal.ts` | Thay palette | P7 | |
| Boss + Arena | `enemySprites.ts` (BOSS), `BossEnemy.ts`, `world/bossArena.ts` | Thay | P7 | Telegraph = hitbox |
| Số sát thương | `vfx/damageNumberFont.ts` | Tinh chỉnh viền | P3 | Thấp |
| Atmosphere | `vfx/atmosphere.ts` | **Giữ** | — | Đã duyệt |

## 3. Module sinh hình ảnh sẽ được thiết kế lại và cách tách khỏi gameplay

### 3.1 Danh sách module (đọc từ Grep/ASSET_CATALOG; phần "hàm vẽ" bên trong chưa đọc hết [?])

| Module | Dòng | Sinh gì | Mức đụng chạm gameplay |
|---|---|---|---|
| `utils/placeholderPlayer.ts` | 1170 | Sheet 48 px 4 lớp, anim, `getHeroHandOffset` | **Cao**: `getHeroHandOffset` (tay) là dữ liệu gameplay-adjacent; `ACTION_SPECS` (frame/fps) |
| `utils/enemySprites.ts` | 647 | Sheet quái/Boss, `ACTION_SPECS` | Trung bình: key anim, body, thời lượng chết |
| `utils/weaponArt.ts` + `weaponTextures.ts` + `config/weaponSpriteConfig.ts` | 865 + … | Sprite vũ khí, frame kéo dây, grip/muzzle | Cao: `grip/forward/muzzle` quyết định điểm bắn |
| `utils/chestArt.ts`, `PreloadScene.ts` (ground/wall/rock/gear icon/đạn) | 108 / 457 | Hòm, nền, icon, đạn | Đạn: texture = hitbox |
| `vfx/vfxTextures.ts`, `vfx/VFXManager.ts`, `VFXPool.ts`, `config/vfxConfig.ts` | 450 / 585 / 71 / 100 | Texture VFX, anim, phát hiệu ứng | Pool/trần |
| `vfx/brickBox.ts`, `world/castleWall.ts`, `world/bossArena.ts`, `world/portal.ts`, `world/town.ts` | 189 / 292 / 574 / 315 / 532 | Tường, Arena, cổng, làng | `town.ts`: vật cản, `VILLAGE_ZONE`; `castleWall`: obstacles |
| `config/gearLook.ts`, `config/characters.ts` (palette/style) | 85 / – | Ngoại hình theo gear/lớp | Thấp |
| `ui/Hud.ts`, `ui/PlayerBars.ts`, `ui/combat/*`, `scenes/{MainMenu,CharacterSelect,CharacterPanel,VillageShop}Scene.ts`, `ui/SkillTreeView.ts`, `ui/SkillQuickAssign.ts` | 806 / 101 / … | Toàn bộ UI | Thấp–Trung bình (bố cục cảm ứng) |
| `combat/*Weapon.ts`, `entities/BossEnemy.ts`, `skills/*` (phần `Graphics`) | – | VFX vẽ trực tiếp | **Cao**: lẫn trong logic combat |

### 3.2 Nguyên tắc tách visual khỏi gameplay logic

1. **Hợp đồng bất biến (Art Contract)** — một module cấu hình `src/config/artContract.ts` (đề xuất, Gói 0) khai báo **bằng hằng số có chú thích** các giá trị mà gameplay đọc từ art: `PLAYER_FRAME_SIZE`, body người chơi (24×28, offset 12/16), frame/scale/body quái và Boss, kích thước texture đạn người chơi, hand offset, depth, thời lượng giới hạn clip. Code entity **đọc** từ đó (thay literal) hoặc test **ghim** literal (chọn ở Gói 0). Đổi art không đổi file này; đổi file này là đổi gameplay → có QA riêng.
2. **Module art thuần:** các module sinh hình ảnh mới (đề xuất thư mục `src/art/…`) **không import** `entities/`, `combat/`, `skills/`, `scenes/` (trừ kiểu Phaser cần để tạo texture). Chúng nhận `scene`/tham số và trả về texture/anim; không đọc trạng thái chiến đấu. Kiểm bằng test import-graph (Grep) hoặc vitest quét `import`.
3. **Dữ liệu art ở config:** palette, kích thước, số frame/fps nằm ở `src/config/` (đã là quy ước dự án), không hard-code trong hàm vẽ. Mục tiêu dài hạn: gom 142 hex của `weaponArt.ts`, 26 của `gearLook.ts`, 16 của `chestArt.ts`, 14 của `VFXManager.ts` về registry.
4. **Tách VFX trực tiếp:** với hiệu ứng `Graphics` nằm trong `combat/*Weapon.ts`/`BossEnemy.ts`/`skills/*`, **không** di chuyển logic; chỉ rút các tham số hiển thị (màu, độ dày, alpha) ra `config/vfxConfig.ts` (đã có `HAMMER_VFX_*` làm mẫu). Thời điểm phát/dừng giữ nguyên tại điểm gọi hiện tại.
5. **Chuyển đổi không phá hủy:** art mới đăng ký sau cờ `?art=v2` (prototype); art cũ giữ nguyên cho tới khi bạn duyệt chuyển hẳn. Không xóa/đổi tên asset cũ khi chưa xác nhận (CLAUDE.md quy tắc 8).
6. **Không để logic phụ thuộc màu/pixel:** đã xác minh Grep `getPixel|snapshot|readPixels` rỗng — giữ như vậy (test).
