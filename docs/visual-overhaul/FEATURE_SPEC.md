# FEATURE SPECIFICATION — Visual Overhaul

Trạng thái: **chờ duyệt Cổng 1** (2026-11-16). Chưa code, chưa thay asset, chưa commit. Đây là spec cho **Gói 0 + Prototype**; các gói sản xuất P1–P7 chỉ ở mức khung và **mỗi gói có Cổng 1 riêng** sau khi prototype được duyệt (không sản xuất hàng loạt trước khi Art Bible được duyệt).

## 1. Mục tiêu và ngoài phạm vi

**Mục tiêu:** thiết kế lại toàn bộ mỹ thuật theo Dark Fantasy Stylized Pixel Art (ART_BIBLE.md) mà **không đổi gameplay**: cơ chế/cây kỹ năng, mọi số liệu, combo, thời gian tích lực, hitbox/phạm vi/thời điểm gây sát thương, cấp/EXP/trang bị/nâng cấp, logic quái/Boss/loot/progression.

**Ngoài phạm vi:** quái tinh anh thật (đổi gameplay), đổi texel/frame người chơi (D1/D2), đổi `ELEMENT_PALETTE`, thay đổi cơ chế ngày/đêm, âm thanh, bất kỳ thay đổi số liệu `src/config/` thuộc chiến đấu.

## 2. Nguyên tắc triển khai

1. **Không phá hủy:** art mới nằm trong module mới, bật bằng cờ; không xóa/đổi tên asset cũ khi chưa được xác nhận.
2. **Đóng băng bất biến trước, vẽ sau:** Gói 0 biến các bất biến (GAMEPLAY_INVARIANTS §1) thành test trước khi động vào art.
3. **Art thuần:** module art không import `entities/combat/skills/scenes` (kiểm bằng test); số liệu art ở `src/config/`.
4. **Phân loại asset theo nhóm** (Procedural/Image/Hybrid, ASSET_INVENTORY §1); **không** mặc định chuyển sang spritesheet.
5. **Mỗi gói:** baseline Git → Developer → QA (6 tiêu chí §4) → chơi thử (§9a) → Cổng 2 → commit. File lớn dùng chung làm tuần tự.
6. Mọi đổi màu so với `COLOR_PALETTE.md` đã duyệt đi qua DP-n (PALETTE_PROPOSALS.md); chưa duyệt thì dùng màu cũ.

## 3. Chia gói

| Gói | Nội dung | Phân loại art | Rủi ro gameplay | Cổng |
|---|---|---|---|---|
| **G0** | Đóng băng bất biến: test art contract, registry màu, baseline hiệu năng | — (test) | Rất thấp | Cổng 1 (spec này) |
| **GP** | Prototype: `?art=v2` (Đấu sĩ, quái cận chiến, quái bắn xa), `?gallery` (làng, VFX chém, UI, font) | HY/PG | Thấp–TB (có nhân vật) | Cổng 1 (spec này) + **duyệt prototype** |
| P1 | Palette/tint (chỉ DP đã duyệt) | PG/HY | Thấp | Cổng 1 riêng |
| P2 | Môi trường: ground/wall/rock, làng (grading + decal + prop nhỏ), tường thành | HY/PG | Thấp–TB | Cổng 1 riêng |
| P3 | UI/icon/font (HUD, panel, shop, skill tree, touch) | HY/PG | Thấp–TB (mobile) | Cổng 1 riêng |
| P4 | Quái thường + NPC + minion | HY | TB | Cổng 1 riêng |
| P5 | Nhân vật 4 lớp + gear + vũ khí | HY/PG | **Cao** | Cổng 1 riêng |
| P6 | VFX (texture, `Graphics` trực tiếp, đạn người chơi, hòm) | PG | **Cao** | Cổng 1 riêng |
| P7 | Boss + Arena + cổng dịch chuyển | HY/PG | **Cao** | Cổng 1 riêng |

Thứ tự theo mức rủi ro gameplay tăng dần (Gameplay Designer). Có thể dừng sau G0, sau GP, hoặc sau bất kỳ P-n.

### 3.1 G0 — Đóng băng bất biến

**Mục tiêu:** biến I1–I20/E1–E7 thành test và đo baseline, **không đổi hành vi, không đổi pixel**.

- **Test art contract** (vitest, `*.test.ts`): (a) bằng **import** các hằng/spec đã export (`PLAYER_FRAME_SIZE`, `ACTION_SPECS`/`SHEETS`, `weaponSpriteConfig`, `ENEMY_BULLET_VISUAL`, bảng depth `atmosphereConfig`/`vfxConfig`, `CHARACTERS`) và **kiểm** giá trị bất biến; (b) với literal nằm trong thân code (body người chơi `(24,28)`+`(12,16)`, body quái/Boss, scale quái ×2, công thức Boss, kích thước texture đạn người chơi 8×4/16×4/16×16): **chốt bằng test đọc văn bản nguồn** (regex tripwire) — không sửa file gameplay. Phương án thay thế (Lead không khuyến nghị làm ngay): trích literal ra `config/artContract.ts` và sửa `Player/EnemyBase/BossEnemy/PreloadScene` đọc từ đó (giá trị y hệt) — đụng file hitbox nên cần duyệt riêng.
- **Test thời lượng clip:** tính `frames/fps` từ `ACTION_SPECS` và khẳng định: attack người chơi ≤ 260 ms (hiện 308 ms bị cắt — ghi lại hiện trạng và đặt giới hạn cho art mới là *thời lượng hiển thị ≤ 260 ms*), death quái ≤ 340 ms, windup ≤ giới hạn bảng §2.3 GAMEPLAY_INVARIANTS.
- **Registry màu** `src/config/` (hoặc `art/palette`): gom bảng nhấn/nền ART_BIBLE (chỉ hiệu lực cho module art mới; màu cũ giữ nguyên). Test: mọi hex trong module art mới ∈ registry.
- **Test thuần** module art: không `phaser`-gameplay, không import `entities|combat|skills|scenes`, không `Math.random|Date.`, không `getPixel|snapshot|readPixels`.
- **Baseline hiệu năng** (bạn thực hiện, Lead hướng dẫn): `?perf` ở làng, ngày/đêm, 18 quái + búa tích lực; ghi FPS/frame time/bước vật lý vào `docs/visual-overhaul/PERF_BASELINE.md`.
- **Hook thử Boss (D11):** tham số URL ép vào Arena/spawn Boss — **hoãn** cho tới khi C2b xử lý xong (cần chạm `WorldScene.ts`).
- **File (dự kiến, chốt khi lập brief):** ĐƯỢC TẠO: `src/art/artContract.test.ts` (hoặc `src/config/artContract.test.ts`), `src/art/palette.ts` + test, `docs/visual-overhaul/PERF_BASELINE.md`; ĐƯỢC SỬA: `docs/assets/ASSET_CATALOG.md` nếu cần, `docs/PROJECT_MAP.md` (sau C2b). **Không đụng** `entities/*`, `WorldScene.ts`, `PlayerState.ts`.
- **AC G0:** build/tsc/test đạt; diff `src/` chỉ file mới (không file gameplay nào đổi); test bất biến phủ I1–I13 và E3/E4; QA chứng minh test **thất bại** khi đổi giá trị (suy luận/đột biến thử trên bản sao nếu cho phép); baseline `?perf` được ghi.

### 3.2 GP — Prototype

Xem PROTOTYPE_PLAN.md. Điều kiện: G0 chốt; C2b xử lý (D12). **AC GP:** 6 tiêu chí §4 cho lát cắt + duyệt hình ảnh của bạn (ảnh Gallery, chơi `?art=v2`).

### 3.3 P1–P7 (khung; mỗi gói được chi tiết hóa và duyệt riêng)

| Gói | File chính bị ảnh hưởng (từ ASSET_INVENTORY) | Bất biến nặng | Kiểm riêng |
|---|---|---|---|
| P1 | `config/palette.ts`, `atmosphereConfig.ts`, `world/town.ts` (tint) | 6 hệ phân biệt (R6) | R6–R7, ngày/đêm |
| P2 | `PreloadScene` (ground/wall/rock), `world/town.ts`, `castleWall.ts`, `brickBox.ts` | I14, obstacle, spawn | Obstacle diff rỗng, ảnh Gallery |
| P3 | `ui/*`, `scenes/{MainMenu,CharacterSelect,CharacterPanel,VillageShop}Scene.ts`, `SkillTreeView` | I17, I19, R9 | Không đổi logic; mobile 44 CSS px; chữ có dấu |
| P4 | `utils/enemySprites.ts`, `entities/Npc.ts`, `Villager.ts`, `Minion` | I10, I15, E1–E3, R7 | Chết ≤ 340 ms; body diff rỗng |
| P5 | `utils/placeholderPlayer.ts`, `config/gearLook.ts`, `utils/weaponArt.ts`, `weaponTextures.ts` | I1–I9 | Test tay, `grip/muzzle` diff rỗng, 12 vũ khí × 4 hướng |
| P6 | `vfx/*`, `combat/*Weapon.ts` (tham số hiển thị), `skills/*` (tham số hiển thị), `chestArt.ts`, đạn người chơi | I13, R1–R5, R10 | Kích thước texture đạn bất biến; diff `combat/skills` chỉ tham số hiển thị |
| P7 | `enemySprites.ts` (BOSS), `BossEnemy.ts` (Graphics), `bossArena.ts`, `portal.ts` | I11, I20, telegraph = hitbox | Vòng báo trước đúng bán kính; Arena ambient |

## 4. Sáu tiêu chí nghiệm thu (áp cho **mọi** gói; cách kiểm cụ thể)

### 4.1 Visual Consistency (VC)
- VC1: mọi hex trong module art mới ∈ registry (test tự động).
- VC2: checklist Art Bible §10 ≥ 80%, mục bắt buộc 1–3 không bằng 0 (Visual Designer chấm trên ảnh Gallery; bạn xác nhận).
- VC3: test silhouette: tô đặc, các loại cùng nhóm khác nhau ≥ ngưỡng pixel (ngưỡng đề xuất 12% diện tích).
- VC4: hướng sáng trên-trái, viền 1 px tối của vật liệu, số shade đúng — kiểm trên Gallery (có lưới/overlay).
- VC5: đặt tên theo `ASSET_NAMING.md`; `ASSET_CATALOG.md` cập nhật cùng thay đổi.

### 4.2 Gameplay Readability (GR)
- R1–R10 (GAMEPLAY_INVARIANTS §3.4) cho phần liên quan; riêng: R2 (tương phản đạn ≥ 3:1) **tính bằng script/test** trên màu thực sau ADD/MULTIPLY (5 mẫu nền × ngày/đêm trong-ngoài tầm nhìn/Arena); R6 6 hệ phân biệt khi bỏ hue; R9 FIT 640×360.
- Ảnh chụp ở ngày, đêm, Arena, FIT 844×390 đính kèm báo cáo.

### 4.3 Hitbox Invariance (HI)
- Test art contract (G0) **xanh**: body người chơi, body/scale quái và Boss, kích thước texture đạn/mũi tên/orb người chơi, `ENEMY_BULLET_VISUAL.hitbox`, obstacle công trình (`displayWidth×0.72`), `PLAYER_FRAME_SIZE`, `weaponSpriteConfig` (`grip/forward/muzzle`).
- `git diff` rỗng ở: `Player.ts:181-184`, `EnemyBase.ts:150-151`, `BossEnemy.ts:175-176`, `weaponSpriteConfig.ts`, `combatConfig.ts` (mọi hằng chiến đấu).
- Gallery overlay hiển thị body/điểm tay/chân; chân art ≈ hàng 44/48.

### 4.4 Animation Timing Invariance (ATI)
- Test thời lượng clip theo bảng giới hạn: attack người chơi ≤ 260 ms, quái chết ≤ 340 ms, windup cận chiến ≤ 200 ms, quái bắn xa ≤ 480 ms, Boss ≤ telegraph từng chiêu.
- `git diff` rỗng ở mọi hằng thời gian chiến đấu (`*_MS`, `hitDelayMs`, `HAMMER_*`, `SCYTHE_*`, `BOSS_*`), `ATTACK_ANIM_MS`, `Player.ts:53-55`.
- Không logic gắn `animationcomplete`/frame (E1) — test Grep giữ nguyên.
- Chơi thật: kiếm 40/60/275 ms, búa 250 ms, telegraph Boss khớp vùng.

### 4.5 Performance (PF)
- `VFX_MAX_SPRITES = 80`, `VFX_MAX_PARTICLES = 250` không tăng; mỗi anim VFX mới ≤ 8 frame, khung ≤ 96 px; kịch bản 18 quái + búa tích lực: `getActiveCount()` < 80 (R10, đo `?perf`).
- So `?perf` với baseline G0: **frame time p95 không tệ hơn +10%**, FPS trung bình không giảm > 5% (ngưỡng ĐỀ XUẤT, bạn duyệt); mobile (cảm ứng ×0.6 hạt) kiểm riêng.
- Thời gian nạp (Preload): không tăng > 20% hoặc ≤ 1 s tuyệt đối thêm (ĐỀ XUẤT; đo thủ công bằng đồng hồ/console).
- Đổi gear vẽ lại sheet: không giật khung đáng kể (quan sát + `?perf`).
- Bake UI: không vẽ lại khung tĩnh mỗi frame.

### 4.6 Regression (RG)
- `npm run build`, `npx tsc --noEmit`, `npm test` đạt; không test cũ bị xóa/làm yếu.
- Diff số liệu gameplay **rỗng** (GAMEPLAY_INVARIANTS §5A.2); file màu/hiển thị chỉ đổi dòng hiển thị.
- Save không đổi (không đụng `progression/*`, `CharacterSave`, `ProgressStore`).
- **Cờ tắt = game cũ:** không có `?art=v2` → texture/anim cũ, hành vi y hệt (test + chơi).
- Không có `D`/`R` (xóa/đổi tên) trong `git diff --name-status` cho asset cũ và `public/assets/village`.
- Chơi thật rút gọn (GAMEPLAY_INVARIANTS §5D) cho phần gói chạm; PC và cảm ứng nếu có.

## 5. Kế hoạch kiểm thử

| Lớp | Công cụ | Nội dung |
|---|---|---|
| Đơn vị/contract | vitest | Bất biến, thời lượng, palette, thuần, silhouette, cấu trúc art (mở rộng `weaponArt.test.ts`) |
| Tĩnh | `tsc`, `npm run build`, Grep/`git diff` | Phạm vi, diff số liệu rỗng, từ khóa hitbox |
| Hình ảnh | `?gallery` + ảnh chụp (bạn chụp; Visual Designer đọc ảnh bằng Read) | Silhouette, shading, ngày/đêm, overlay tay/body |
| Chơi thật | Bạn | Checklist §9a; ban đêm `?time=night`; FIT nhỏ; Arena |
| Hiệu năng | `?perf` | So baseline G0 |

Giới hạn nói thẳng: agent không chơi được game và không "nhìn" được pixel; chất lượng thẩm mỹ và cảm giác chỉ bạn nghiệm thu được (WORKFLOW §9a). Một số tiêu chí là **công thức tính tay chưa quan sát** (ban đêm, ambient Arena) — đánh dấu [SUY] trong GAMEPLAY_INVARIANTS.

## 6. Git, baseline và C2b (D12)

- Hiện cây tracked có **3 file C2b chưa commit** (`WorldScene.ts`, `PlayerState.ts`, `PROJECT_MAP.md`) đang chờ playtest. WORKFLOW §6a: cây tracked phải sạch trước khi giao Developer. Lựa chọn của bạn: (1) chốt/commit C2b trước; (2) cho tiếp tục với **baseline ngoại lệ** (hash từng file dơ). G0 và GP **không đụng** ba file này nên (2) khả thi.
- Chỉ Lead ghi `DECISIONS.md`; Developer không commit/push; Cổng 2 từng gói.
- Tài liệu này không đụng `PROJECT_MAP.md`; cập nhật bản đồ (thư mục `art/`, `visual-overhaul/`, `GalleryScene`) làm sau khi C2b xử lý.

## 7. Rủi ro tổng

1. Hitbox/neo/tay (I2, I7, I10–I13): kiểm bằng G0.
2. File lớn dùng chung (`placeholderPlayer.ts` 1170, `CharacterPanelScene.ts` 1879, `WorldScene.ts` 3982): tuần tự, mỗi gói một baseline.
3. Không công cụ xem pixel cho AI-dev: Gallery + ảnh chụp + bạn.
4. Grading pack có thể chưa đủ u tối → E2/E4 (cần bạn tạo/cung cấp PNG).
5. Ambient/ban đêm/Arena chưa kiểm trong game; RenderTexture erase chưa chạy thử (COLOR_PALETTE ghi).
6. Chi phí lớn: phân đợt, dừng được sau mỗi gói.
7. Bản quyền: chỉ học nguyên tắc; mới xem 6/48 ảnh tham chiếu và chưa thấy ghi chú nguồn đi kèm.
8. Điều chưa xác định [?]: cấu trúc `economyConfig`/vùng làng, hệ nguyên tố quái thật sự dùng, `NPC_ROWS`, thân hàm vẽ của `placeholderPlayer/weaponArt/town/bossArena`, cách `EnemyBase` tính body theo scale, kích thước icon gear, hệ độ hiếm thật, mốc thời gian từng skill (cần bảng `delayedCall`).

## 8. Đề nghị Cổng 1

Duyệt hoặc chỉnh: (a) Art Bible và quyết định D1–D12 (README); (b) từng DP-1…DP-10 (PALETTE_PROPOSALS.md); (c) **Gói G0 + Prototype GP** được phép bắt đầu (kèm cách xử lý C2b); (d) P1–P7 sẽ có Cổng 1 riêng sau prototype. Chưa duyệt thì không gọi Developer.
