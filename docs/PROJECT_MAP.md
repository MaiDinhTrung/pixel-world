# PROJECT_MAP — Pixel World (Codebase Map, cấp L1)

Stack: Phaser 4.2.1 + TypeScript + Vite (`npm run dev` / `npm run build` / `npm test` = vitest qua `scripts/run-vitest.mjs` — chuẩn hoá chữ hoa/thường ổ đĩa của cwd trên Windows trước khi chạy (FIX-01); `*.test.ts` cạnh mã nguồn). Gameplay cho người chơi: `README.md`. Định hướng: `docs/DESIGN_PILLARS.md`.
**Index First, Read on Demand:** đọc file này → mở đúng **một** file `docs/codemap/<hệ thống>.md` → Grep/đọc file thật theo offset. Bản đồ là chỉ mục, **không** phải nguồn sự thật: trước khi sửa code luôn đọc file thật và kiểm người gọi (WORKFLOW §13).
Không đọc: `node_modules/`, `dist/`, `package-lock.json`. Bản cũ (trước 2026-11-17, nhiều lịch sử GĐ/Gói): `docs/archive/PROJECT_MAP_legacy.md`.

## 1. Hệ thống (L1)
| Hệ thống | Vai trò | Thư mục / file chính | Chi tiết L2/L3 |
|---|---|---|---|
| Game Scenes | Vòng đời scene; **một** `WorldScene` cho mọi Map; overlay panel/shop | `src/main.ts`, `src/scenes/`, `config/{gameConfig,constants}.ts` | `codemap/scenes.md` |
| Player / Character + Progression | Thực thể người chơi, 4 lớp nhân vật, level/EXP/stat, `PlayerState` thuần | `entities/Player.ts`, `systems/PlayerState.ts`, `progression/{LevelSystem,StatSheet,difficultyClock}.ts`, `config/{characters,statConfig}.ts` | `codemap/player.md` |
| Combat / Weapons / Skills | 11 lớp vũ khí (Staff gồm cả Đũa phép), sát thương 6 loại, skill chủ động, cây kỹ năng, passive, triệu hồi | `src/combat/`, `src/skills/`, `config/combatConfig.ts` | `codemap/combat.md` |
| Enemies / AI / Elite / Boss | Quái 4 archetype, Elite affix, Boss nhiều đòn, chỉ số theo bậc | `entities/{EnemyBase,Enemy,RangedEnemy,BossEnemy,EliteMarker}.ts`, `config/enemyConfig.ts` | `codemap/enemies.md` |
| World / Region / Map / Zone / Instance / Boss Arena | Thế giới theo dữ liệu, builder từng Map, cổng + travel, Instance cục bộ, làng | `src/world/`, `config/{worldConfig,witheredWoodsConfig,bossArenaConfig}.ts` | `codemap/world.md` |
| Inventory / Equipment / Economy | Túi, trang bị, cấp đồ, ngọc, vàng, shop/thợ rèn, hòm, đồ rơi | `config/{gearConfig,gemConfig,economyConfig,weaponInfo}.ts`, `systems/VillageService.ts`, `entities/{WeaponChest,LootDrop}.ts` | `codemap/items.md` |
| Save / Load | localStorage v8, revision, migration, sao lưu; RunSession | `src/progression/` (Progress*, save*, RunSession) | `codemap/save.md` |
| UI / HUD / Input | HUD PC + mobile, panel cây kỹ năng, biển tên vùng, input | `src/ui/`, `src/input/`, `systems/InputController.ts`, `config/controlsConfig.ts` | `codemap/ui.md` |
| VFX / Atmosphere / Art / Audio | VFX, số sát thương, ngày/đêm + ánh sáng, texture runtime. **Audio: chưa có** | `src/vfx/`, `src/art/`, `src/utils/` (sprite), `config/{vfxConfig,atmosphereConfig}.ts` | `codemap/visuals.md` |

Số liệu cân bằng: chỉ ở `src/config/` (chú thích tiếng Việt từng hằng: đơn vị, ý nghĩa). Asset: `docs/assets/` (catalog, quy chuẩn). Studio/quy trình: `docs/studio/` (§5).

## 2. Phụ thuộc giữa hệ thống (A → B = A import B)
```
main → config/gameConfig → scenes/*
WorldScene → entities, combat, skills, progression, systems, ui, input, world, vfx, utils, config   (trung tâm)
CharacterPanelScene ⇄ WorldScene (panel gọi API public; World mở panel)
VillageShopScene → WorldScene.getVillage() → systems/VillageService → PlayerState
skills → entities/{Player,EnemyBase}, utils/{effects,projectile}; combat/* → entities/EnemyBase
world/* (thuần) → world/worldGraph, config/worldConfig; builder → config/assets, vfx/atmosphere
progression/ProgressStore → LocalStorageRepository, saveMigration, saveV8
PreloadScene → utils/* (sinh texture), vfx/vfxTextures, progression/ProgressStore
```

## 3. Tìm file khi cần sửa…
| Muốn sửa | Bắt đầu ở |
|---|---|
| Sát thương/cooldown/tầm vũ khí | `config/combatConfig.ts` → `combat/<Tên>Weapon.ts` |
| Thêm vũ khí | checklist ở `codemap/combat.md` "Ghi chú khi thay đổi" |
| Hình/điểm cầm vũ khí | `utils/weaponArt.ts`, `config/weaponSpriteConfig.ts`, `combat/weaponSprite.ts` |
| Skill chủ động / gán ô | `skills/skills.ts`, `skills/treeSkills.ts`; `WorldScene.tryCastSkill/assignSkillToSlot`; `ui/{Hud,SkillQuickAssign}.ts` |
| Cây kỹ năng / passive | `skills/tree/*`, `config/{skillNodeMap,skillLevelConfig,treeSkillsConfig}.ts`, `ui/SkillTreeView.ts` |
| Quái / archetype / AI | `entities/{EnemyBase,Enemy,RangedEnemy}.ts`, `config/enemyConfig.ts`, `systems/enemyStats.ts`, `world/spawnPattern.ts` |
| Elite | `world/eliteRules.ts`, `ELITE_*` (`enemyConfig.ts`), `entities/EliteMarker.ts`, `WorldScene.spawnElite` |
| Boss / Đấu Trường | `entities/BossEnemy.ts`, `world/{bossArena,bossArenaRules}.ts`, `config/bossArenaConfig.ts`, `WorldScene.updateBoss` |
| Spawn / độ khó theo thời gian, vùng | `WorldScene.spawnEnemy/updateEnemySpawning/getThreatTier`, `world/worldGraph.ts` (`effectiveThreatTier`), `THREAT_*` |
| Map / Zone / cổng / chuyển Map | `config/worldConfig.ts`, `world/{worldGraph,mapBuilders,travel,arrival,portal}.ts`; builder `world/{town,bossArena,witheredWoods}.ts` |
| Biển tên vùng | `config/worldConfig.ts` (`ZONE_BANNER`), `world/regionTracker.ts`, `ui/RegionBanner.ts` |
| Di chuyển, dash, máu/giáp/EN | `entities/Player.ts`; `PLAYER_*`, `DASH_*` |
| Phím/chuột/cảm ứng, bố cục nút | `systems/InputController.ts`, `ui/TouchControls.ts`, `input/*`, `ui/combat/*`, `config/controlsConfig.ts` |
| HUD / thanh trên đầu | `ui/Hud.ts`, `ui/PlayerBars.ts` |
| Panel nhân vật | UI `scenes/CharacterPanelScene.ts`; dữ liệu: API public `WorldScene` |
| Stat / XP / level | `config/statConfig.ts`, `progression/{StatSheet,LevelSystem,progressionConfig}.ts`, `WorldScene.addStatPoint/grantExperience` |
| Trang bị / ngọc | `config/{gearConfig,gearLook,gemConfig}.ts`, `systems/PlayerState.ts`, `WorldScene.equip*/applyPlayerStatistics` |
| Vàng, giá, NPC, shop | `config/economyConfig.ts`, `systems/VillageService.ts`, `scenes/VillageShopScene.ts` |
| Hòm / legendary | `entities/WeaponChest.ts`, `WorldScene` (`*Chest*`), `CHEST_*`, `LEGENDARY_*` |
| Lưu/tải, cấu trúc save | `progression/{ProgressStore,LocalStorageRepository,saveV8,saveMigration,CharacterProgress}.ts`, `config/progressConfig.ts` |
| Nhân vật (4 lớp) | `config/characters.ts`, sprite `utils/placeholderPlayer.ts`, `scenes/CharacterSelectScene.ts` |
| VFX / số sát thương | `vfx/VFXManager.ts`, `vfx/vfxTextures.ts`, `config/vfxConfig.ts`; `vfx/DamageNumberManager.ts`, `config/damageNumberConfig.ts` |
| Ngày/đêm, ánh sáng, sương | `vfx/atmosphere.ts`, `config/atmosphereConfig.ts`, `ui/DayNightToggle.ts` |
| Sprite runtime / load asset | `scenes/PreloadScene.ts`, `utils/*`; asset `public/assets/village/`, `config/assets.ts` |
| Danh mục / quy chuẩn asset | `docs/assets/` (`README.md` quy trình, `ASSET_CATALOG.md`, `ASSET_NAMING.md`, `VFX_GUIDE.md`, `ANIMATION_GUIDE.md`, `COLOR_PALETTE.md`) |
| Ảnh tham chiếu nghệ thuật (không phải asset) | `docs/references/visual/` |
| Thêm/đổi scene | `config/constants.ts` (`SCENE_KEYS`), `config/gameConfig.ts` — thêm Map thì **không** thêm scene |
| Buff / level-up chọn buff | Legacy (tắt): `progression/buff*.ts`, `BuffManager.ts`, `scenes/LevelUpScene.ts` (không đăng ký) |

## 4. Tài liệu thiết kế theo hệ thống
World: `docs/WORLD_ARCHITECTURE.md`, `docs/WORLD_MAP_DESIGN.md` · Dữ liệu/save: `docs/DATA_ARCHITECTURE.md` · Lớp/skill: `docs/CLASS_REDESIGN.md`, `docs/CLASS_EXPANSION.md` · Vòng lặp quái/Elite: `docs/GAMEPLAY_LOOP_M.md` · Hình ảnh: `docs/visual-overhaul/` (chưa triển khai) · Hiệu năng: `docs/perf/`.

## 5. Studio / Agents
Nhiệm vụ đang làm: `docs/studio/CURRENT_TASK.md` → `docs/studio/tasks/`. Quy trình: `docs/studio/WORKFLOW.md`; mẫu: `docs/studio/templates/README.md`; quyết định: `docs/studio/DECISIONS.md`; tổng quan: `docs/studio/AI_STUDIO_PROCESS_MAP.md`. Subagent: `.claude/agents/`; quyền: `.claude/settings.json` + hook `.claude/hooks/studio-guard.mjs` (self-test: `node --test .claude/hooks/studio-guard.selftest.mjs`; `settings.local.json` bị git bỏ qua).

## 6. Bảo trì Codebase Map
- **Khi nào sửa:** thêm/xoá/đổi tên/di chuyển file, đổi trách nhiệm, thêm hệ thống (Developer khai "CẤU TRÚC ĐỔI", QA đối chiếu A/D/R trong `git diff`, Lead đánh dấu ở Task Map) — Lead cập nhật trước Cổng 2, trong cùng thay đổi. Thấy bản đồ lệch khi đọc code → sửa ngay trong nhiệm vụ đang làm.
- **Phát hiện lỗi thời:** mỗi file codemap có `Xác minh: HEAD <sha>` + dòng "Kiểm lỗi thời" (`git log --oneline <sha>..HEAD -- <đường dẫn theo dõi>`). Có commit chạm vào ⇒ coi mục liên quan là nghi lỗi thời, đọc file thật; cập nhật xong đổi `sha`.
- **Khung một file codemap:** tiêu đề · dòng Xác minh + Theo dõi · Kiểm lỗi thời · Vai trò · `## L2 — Module` (bảng Module · Vai trò · File · Phụ thuộc chính) · `## L3` (ký hiệu quan trọng, 1 dòng/mục; method lớn kèm dòng gần đúng) · `## Ghi chú khi thay đổi` (rủi ro, bất biến, test khoá, tài liệu thiết kế).
- Chỉ ghi thành phần **đang tồn tại**; việc dự kiến ghi nhãn "chưa tồn tại". Không ghi lịch sử (GĐ/Gói) — lịch sử ở `DECISIONS.md`/`TASK_HISTORY.md`. Không liệt kê mọi hàm nhỏ.
- Ngôn ngữ: chữ hiển thị trong game tiếng Việt; id nội bộ tiếng Anh.
