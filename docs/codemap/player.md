# Codemap — Player / Character + Progression (EXP, Level, Stat)

Xác minh: HEAD `31f5264` (2026-11-17) · Theo dõi: `src/entities/Player.ts src/systems/PlayerState.ts src/progression/{LevelSystem,StatSheet,progressionConfig,difficultyClock}.ts src/config/{characters,statConfig,scaleConfig}.ts src/utils/placeholderPlayer.ts`
Kiểm lỗi thời: `git log --oneline 31f5264..HEAD -- src/entities/Player.ts src/systems/PlayerState.ts src/progression/LevelSystem.ts src/progression/StatSheet.ts src/progression/progressionConfig.ts src/progression/difficultyClock.ts src/config/characters.ts src/config/statConfig.ts src/config/scaleConfig.ts src/utils/placeholderPlayer.ts`

**Vai trò:** nhân vật người chơi trong scene (di chuyển, máu/giáp/năng lượng, dash, trạng thái) và luật tiến trình thuần (level, EXP, stat, kho đồ — `PlayerState`).

## L2 — Module
| Module | Vai trò | File | Phụ thuộc chính |
|---|---|---|---|
| Thực thể Player | Di chuyển, HP/giáp/EN, dash + lượt lướt (`configureDashCharges/tryConsumeDashCharge`), khiên đỡ, rage (BERSERK/EXHAUSTED), hệ số tốc/sát thương nhận, anim | `entities/Player.ts` (~1420) | `config/combatConfig`, `progression/buffTypes` (`CombatStats`), `utils/placeholderPlayer` |
| Định nghĩa nhân vật | 4 lớp `knight` · `ranger` · `mage` · `necromancer`; `allowedWeapons`, `treeSkills`, `baseResist` | `config/characters.ts` | — |
| Sprite nhân vật | Sheet sinh runtime, anim, điểm tay cầm vũ khí | `utils/placeholderPlayer.ts` (~1170, file lớn) | — |
| PlayerState (thuần) | Luật kho đồ/trang bị/level/tiến trình; `fromSave/toSave` là nguồn lưu duy nhất | `systems/PlayerState.ts` (~920) + test | `progression/saveV8`, `config/*` |
| Level / EXP | `LevelSystem`; hằng `XP_PER_KILL`, `XP_TIER_BONUS`, `XP_BASE`, `XP_GROWTH` | `progression/LevelSystem.ts`, `progression/progressionConfig.ts` | — |
| Stat | 6 stat, điểm mỗi level; cộng stat → chỉ số; thang hiển thị | `config/statConfig.ts`, `progression/StatSheet.ts`, `config/scaleConfig.ts` | — |
| Đồng hồ độ khó | `DifficultyClock`, bậc theo thời gian lượt chơi | `progression/difficultyClock.ts` | `world/worldGraph` (`timeThreatTier`) |
| Legacy buff | Hệ buff/level-up đã tắt; `buffTypes.ts` vẫn cấp `CombatStats/createBaseStats` cho Player | `progression/{BuffManager,buffCatalog,buffTypes}.ts` | — |

## L3 — Thành phần quan trọng
- `Player`: `takeDamage(…, source, damageScale)` (cổng domain → tường Fortress → khiên → né → bể giáp/kháng), `setGuard`, `setDamageTakenFactor`, `setMoveSpeedFactor`, `setWeaponMoveFactor`, `setImmobilized`, `setFacingOverride`, `startSkillDash`, `configureQuickDraw`, `configureMomentum`, `onArmorBroken`, `onDodge`. Dash chung chỉ chạy khi `GENERIC_DASH_ENABLED`.
- `PlayerState`: `PlayerRules`, `PlayerEconomy`, kết quả `Fail`; nạp `PlayerState.fromSave(progressStore.get(id), …)`, lưu `progressStore.commit(id, playerState.toSave(economy, base))`.
- `WorldScene` nối: `grantExperience`, `addStatPoint`, `applyPlayerStatistics` (gom gear + gem + passive + kháng → `CombatStats`), `refreshHeroLook` (ngoại hình đồ: `config/gearLook.ts`).
- SP (điểm kỹ năng) = level − 1, suy ra, không lưu (`codemap/combat.md` cây kỹ năng).

## Ghi chú khi thay đổi
- Số liệu Player ở `combatConfig.ts` (`PLAYER_*`, `DASH_*`, `BERSERK_*`…) — **rủi ro cao ⇒ ≥ L**.
- Đổi trường lưu của nhân vật ⇒ xem `codemap/save.md` (v8, migration) — rủi ro cao.
- `placeholderPlayer.ts` lớn: Grep rồi đọc theo offset.
- Test: `systems/PlayerState.test.ts`, `config/gearResist.test.ts`.
- Thiết kế: `docs/CLASS_REDESIGN.md`, `docs/CLASS_EXPANSION.md`, `docs/DATA_ARCHITECTURE.md` §4 (PlayerState).
