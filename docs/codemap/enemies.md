# Codemap — Enemies / Enemy AI / Elite / Boss

Xác minh: HEAD `31f5264` (2026-11-17) · Theo dõi: `src/entities/{EnemyBase,Enemy,RangedEnemy,BossEnemy,EliteMarker}.ts src/systems/enemyStats.ts src/world/{eliteRules,spawnPattern,bossArenaRules}.ts src/config/{enemyConfig,enemyVisualConfig}.ts src/utils/{enemySprites,enemyVariantSprites}.ts`
Kiểm lỗi thời: `git log --oneline 31f5264..HEAD -- src/entities src/systems/enemyStats.ts src/world/eliteRules.ts src/config/enemyConfig.ts`

**Vai trò:** quái thường (cận chiến/bắn xa, 4 archetype), Elite có affix, Boss nhiều đòn; chỉ số theo bậc; sinh quái theo vùng. Bản đồ Đấu Trường: `codemap/world.md`.

## L2 — Module
| Module | Vai trò | File | Phụ thuộc chính |
|---|---|---|---|
| Lớp nền quái | Nhận sát thương (`HitInfo`, kháng, `damageTakenMult`, `hitModifier`), stun/slow/push, DoT (`applyDot` burn/poison), vulnerable (mark/curse), chill/freeze, sự kiện `damaged`/`died` | `entities/EnemyBase.ts` (~730) | `combat/damage/*`, `combat/domainBarrier`, `config/{combatConfig,damageTypeConfig}` |
| Quái thường | `Enemy` (cận chiến, nhận `archetype`, `statProfile?`), `RangedEnemy` (bắn xa; tier ≥ 2 có thể mang nguyên tố) | `entities/Enemy.ts`, `entities/RangedEnemy.ts` | `systems/enemyStats`, `config/enemyVisualConfig`, `utils/projectile` |
| Archetype | `grunt`, `caster`, `swarmer`, `brute` (hệ số máu/tốc/xp/gold) | `config/enemyConfig.ts` (`ENEMY_ARCHETYPES`) | — |
| Chỉ số theo bậc (thuần) | `meleeStats`, `rangedStats`, `killXp` | `systems/enemyStats.ts` (+ test) | `progression/progressionConfig` |
| Chọn loại theo vùng | `pickArchetype`, `pickStaggeredArchetype` | `world/spawnPattern.ts` (+ test) | `world/worldGraph` (`SpawnTable`) |
| Elite | Luật thuần (`shouldSpawnElite`, `pickEliteAffix`, `eliteArchetype`, `pickEliteSpawnPoint`, `escortOffsets`); hiển thị vòng chân/thanh máu/biểu tượng affix | `world/eliteRules.ts` (+ test), `entities/EliteMarker.ts`, `config/enemyConfig.ts` (`ELITE_*`), `config/enemyVisualConfig.ts` (`ELITE_VISUAL`) | — |
| Boss | Slam, nova, quạt đạn, mưa thiên thạch, triệu hồi, cuồng nộ < 50% HP; nguyên tố theo đòn | `entities/BossEnemy.ts` (~720) | `config/combatConfig` (`BOSS_*`) |
| Luật Boss / Arena (thuần) | `decideBossAction`, `shouldSpawnArenaMinions`, `getPortalDenyReason` | `world/bossArenaRules.ts` (+ test) | — |
| Sprite quái | Sheet grunt/caster/boss; biến thể swarmer/brute | `utils/enemySprites.ts`, `utils/enemyVariantSprites.ts`, `ENEMY_VISUALS`, `ENEMY_VARIANT_PALETTES` | — |

## L3 — Điều phối trong `WorldScene`
`spawnEnemy` (bậc = `effectiveThreatTier(thời gian, zoneAt(điểm sinh))`), `updateEnemySpawning`, `getThreatTier` (toàn cục: trần quái, nhịp, HUD), `watchSpawnedEnemyDeath` (handler `died` chung), `countZoneKill`, `spawnElite` (cờ `enemy.getData('elite')`), `spawnEliteEscort`, `dropEliteLoot`; Boss: `updateBoss`, `spawnBoss`, `handleBossSlam`, `summonBossMinions`, `handleBossDefeated`, `grantBossLoot`. Đạn quái: `utils/projectile.fireEnemyBullet(…, fromBoss, type?)`.

## Ghi chú khi thay đổi
- `enemyConfig.ts`, `combatConfig.ts` (ENEMY_/BOSS_/THREAT_) = **rủi ro cao ⇒ ≥ L**.
- Elite phải là archetype cận chiến (luật `eliteArchetype`).
- Hitbox: `bodySize × displayScale = ENEMY_HITBOX_WORLD_SIZE` (40) — test `enemyVisualConfig.test.ts`.
- `goldMult` của archetype khai báo nhưng chưa dùng.
- Thiết kế: `docs/GAMEPLAY_LOOP_M.md` (M1–M3), DECISIONS "Gói M", "Boss Arena".
