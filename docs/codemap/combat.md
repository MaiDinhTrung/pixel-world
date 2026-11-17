# Codemap — Combat / Weapons / Skills

Xác minh: HEAD `31f5264` (2026-11-17) · Theo dõi: `src/combat/ src/skills/ src/config/{combatConfig,damageTypeConfig,swordComboConfig,treeSkillsConfig,necromancerConfig,skillLevelConfig,skillNodeMap,weaponInfo,weaponSpriteConfig}.ts src/utils/{weaponArt,weaponTextures,projectile}.ts src/systems/{MinionManager,CorpseManager}.ts src/entities/Minion.ts`
Kiểm lỗi thời: `git log --oneline 31f5264..HEAD -- src/combat src/skills src/config/combatConfig.ts src/config/treeSkillsConfig.ts`

**Vai trò:** vũ khí (đánh thường), giải quyết sát thương 6 loại, kỹ năng chủ động/bị động, cây kỹ năng, triệu hồi.

## L2 — Module
| Module | Vai trò | File | Phụ thuộc chính |
|---|---|---|---|
| Interface vũ khí | `Weapon`, `WeaponId`; `cancelAttack?` | `combat/Weapon.ts` | `entities/EnemyBase` |
| Vũ khí (mỗi loại 1 file) | Sword (combo 3), Shield (đỡ/đập), Blaster, Bow, DragonBow, Staff/Wand (sạc), VoidStaff, Scythe (combo 4 + lốc), Excalibur (tích lực), DualBlades (combo 3), Hammer (giáng / chấn địa) | `combat/*Weapon.ts` | `config/combatConfig`, `combat/weaponSprite` |
| Logic thuần vũ khí (+ test) | combo kiếm, combo song đao, máy pha búa, tường Fortress, kết giới Domain | `combat/{swordCombo,dualBladesCombo,hammerCharge,fortressWall,domainBarrier}.ts` | — |
| Hình vũ khí | Art ký tự → texture; gắn tay, depth, lật bằng scale âm | `utils/weaponArt.ts`, `utils/weaponTextures.ts`, `config/weaponSpriteConfig.ts`, `combat/weaponSprite.ts`, `combat/swordFireVfx.ts` | — |
| Chọn mục tiêu | Auto-aim, skill loại `target` | `combat/targeting.ts` | — |
| Sát thương 6 loại | `resolveDamage`, `splitPlayerDamage`, `applyDamageFloor`, `stochasticRound`; hiệu ứng nguyên tố (chain, ice stack, leech) | `combat/damage/{resolveDamage,elementEffects}.ts` (+ test) | `config/damageTypeConfig` |
| Skill chủ động | 18 skill gốc (`SKILLS`, `getSkill`, `SkillContext`, `SkillDefinition`), helper `damageInRadius`, `spawnArrow`… | `skills/skills.ts` (~2450, file lớn) | `entities/{Player,EnemyBase}`, `utils/{effects,projectile}` |
| Skill từ cây | 15+ skill `TREE_*`, Necromancer `NEC_*` | `skills/treeSkills.ts`, `skills/necromancerSkills.ts`, `skills/divineDomain.ts`, `skills/fortressStand.ts`, `skills/leap/*` | `config/treeSkillsConfig`, `config/necromancerConfig` |
| Điều khiển skill | `SkillControl` (instant/directional/point/target) cho HUD mobile | `skills/skillControl.ts` | — |
| Cây kỹ năng | Kiểu, dữ liệu node/nhánh, luật học/respec, passive | `skills/tree/{skillTreeTypes,skillTreeData,skillTreeRules,passiveEffects}.ts` | `config/{skillNodeMap,skillLevelConfig}` |
| Triệu hồi / xác | Đồng minh Necromancer; xác chết | `entities/Minion.ts`, `systems/MinionManager.ts`, `systems/CorpseManager.ts` | `config/necromancerConfig` |

## L3 — Thành phần quan trọng
- Tạo vũ khí: `WorldScene.createWeaponById`; loot `SPECIAL/LEGENDARY_WEAPON_IDS`; lớp được cầm: `characters.ts` `allowedWeapons`.
- Cast: `WorldScene.tryCastSkill` → `SkillDefinition.cast(SkillContext)`; `canCast`, `toggle`, `requiresNode`, `damageParts`/`damageNoProc` → `skillHitInfo`.
- Cấp skill: `LIVE_SKILL_NODE` (`skillNodeMap.ts`), `getSkillPower`/`getSkillCooldownMult` (`skillLevelConfig.ts`), `WorldScene.getEffectiveCooldown`.
- Passive: `computePassiveBundle` → `WorldScene.refreshPassives`; hook "khi trúng" = sự kiện `damaged` của `EnemyBase` → `WorldScene.watchEnemyHits/handlePlayerHit`.
- Cây: `getUnlockStatus`, `learnSkill`, `respecAll`, `getTotalSkillPoints` (SP = level − 1); UI `ui/SkillTreeView.ts`.
- Domain/Fortress: `isHitBlockedByDomain` gọi đầu `EnemyBase.takeDamage` và `Player.takeDamage`; `tryAbsorbHit` ngay sau.

## Ghi chú khi thay đổi
- Số liệu ở `combatConfig.ts` (`<VŨ_KHÍ>_*`, `THREAT_*`, `CHEST_*`, `DUAL_GUARD_*`, `FORTRESS_*`) = **rủi ro cao ⇒ ≥ L**.
- Thêm vũ khí: `Weapon.ts` (WeaponId) · file mới · `weaponInfo.ts` · `constants.ts` (TEXTURE_KEYS) · `combatConfig.ts` · `createWeaponById` · `characters.ts` · `weaponArt.ts` + `weaponSpriteConfig.ts` (test `utils/weaponArt.test.ts` bắt buộc art + spec).
- `skills.ts`, `treeSkills.ts` lớn: Grep id skill rồi đọc theo offset.
- `vitest`: `*.test.ts` cạnh mã nguồn (loại khỏi `tsconfig`).
- Thiết kế: `docs/CLASS_REDESIGN.md`, `docs/CLASS_EXPANSION.md`; DECISIONS "Búa".
