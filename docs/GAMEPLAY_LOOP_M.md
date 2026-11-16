# GÓI M — Quái đa dạng theo vùng và Elite

Trạng thái: **đã duyệt Cổng 1 (2026-11-16)** theo khuyến nghị của Gameplay Designer. Chưa có code. Nguồn: rà soát vòng lặp cốt lõi (Gameplay Designer, 2026-11-16), đối chiếu `src/config/combatConfig.ts`, `economyConfig.ts`, `worldConfig.ts`, `progressionConfig.ts`, `LevelSystem.ts`, `WorldScene.ts`. Nhãn: [XM] đã xác minh trong code/config, [SUY] suy từ số liệu (tính tay, chưa chơi thật), [?] chưa biết.

Viết cho: người duyệt/đang phát triển Pixel World và Developer sẽ lập brief M1–M3.

## 1. Vòng lặp hiện tại (tóm tắt)

- Quái chỉ có 2 loại, sinh xoay vòng cứng `spawnIndex % 3 === 2` → bắn xa, còn lại cận chiến; hai vùng ngoài làng dùng cùng mẫu `CURRENT_SPAWN_PATTERN` [XM].
- Độ khó theo thời gian: bậc = `floor((t − runStartedAt)/THREAT_INTERVAL_MS)` (60 s), trần `MAX_THREAT_TIER = 6` đạt ở phút 6 (vùng xa +1: phút 5) [XM]. Trần quái `min(18, 6+2·bậc)`, giãn cách sinh `max(700, 2000−250·bậc)` ms [XM].
- EXP phẳng `XP_PER_KILL = 15` cho mọi quái, mọi bậc [XM]. Ngưỡng cấp `XP_BASE = 20` × 1,15/cấp; mỗi cấp 5 điểm chỉ số + 1 điểm kỹ năng; mỗi điểm Sức mạnh +10% sát thương [XM]. Mốc lên cấp nếu hạ hết quái sinh ra: L10 ≈ 1 phút, L20 ≈ 3 phút, L30 ≈ 10 phút [SUY].
- Boss: lần đầu 120 s, sau đó mỗi 150 s; HP = `400 + (n−1)·220 + (L−1)·20`; XP Boss 1 = 105 ≈ 7 quái thường; chỉ một mẫu Boss, chỉ ở Arena [XM].
- Loot: vàng/ngọc/hòm đang ở giá trị demo (tỉ lệ cao), không phụ thuộc vùng hay loại quái [XM/SUY].
- Elite chưa có: `eliteSlots: []` ở mọi vùng [XM].

## 2. Chẩn đoán (theo tác động)

1. Quái đơn điệu, hai vùng ◆/◆◆ chỉ khác +1 bậc.
2. Không có mục tiêu giữa hai lần Boss.
3. EXP phẳng: giết quái yếu luôn tối ưu; quái chững sau bậc 6 trong khi người chơi tăng tuyến tính.
4. Phần thưởng không có ý nghĩa (loot không theo vùng/loại quái, drop demo ngập).
5. Boss ít biến thể (ưu tiên thấp, chỉ ở Arena).

## 3. Quyết định đã duyệt

| Mã | Quyết định |
|---|---|
| M-D1 | EXP theo archetype và bậc (`xpMult`, `XP_TIER_BONUS`), thay vì phẳng 15 (đổi tốc độ lên cấp) |
| M-D2 | Elite xuất hiện theo số quái hạ trong vùng (có thể kèm thời gian chờ tối thiểu) |
| M-D3 | Elite ở cả hai vùng ngoài làng, vùng xa bậc cao hơn; không ở làng/Arena |
| M-D4 | Nguyên tố cho quái cận chiến: để sau |
| M-D5 | Hạ các giá trị drop demo: gói cân bằng riêng sau M3 |
| M-D6 | Gọi Visual Designer cho hình dáng Swarmer/Brute/Elite trước M2/M3 |

Phương án bị loại: hệ nhiệm vụ (cần state/UI/save mới và chưa có đa dạng quái); vùng/bản đồ thứ ba hoặc affix trang bị (D3 chưa thêm bản đồ; affix đụng `PlayerState`/`gearConfig`).

## 4. Chia gói (tuần tự; mỗi gói baseline → Developer → QA → chơi thử → Cổng 2)

Số liệu là **giá trị khởi điểm**, đặt ở `src/config/` (tên hằng đề xuất), chỉnh sau khi chơi thử.

### M1 — Archetype thành dữ liệu, hành vi giữ nguyên
- Mục tiêu: tách "loại quái" thành dữ liệu; `spawnTable.pattern` chứa id archetype, quay vòng xác định; mặc định tái tạo đúng 2:1.
- Sửa: `config/worldConfig.ts`, `world/worldGraph.ts` (mở rộng `EnemyKind` → id archetype), `scenes/WorldScene.ts` (`spawnEnemy`), `entities/Enemy.ts`, `entities/RangedEnemy.ts` (nhận tham số archetype, mặc định = hiện tại), `docs/PROJECT_MAP.md`. Tạo: `config/enemyConfig.ts` (`ENEMY_ARCHETYPES`: `healthMult`, `speedMult`, `contactDamageBonus`, `xpMult`, `goldMult`), `world/spawnPattern.ts` + test.
- Nghiệm thu: mẫu mặc định, 300 chỉ số đầu cho cùng kết quả `i % 3 === 2 ? ranged : melee`; `combatConfig.ts` diff rỗng; id duy nhất, hệ số > 0, pattern chỉ chứa id có thật; build/tsc/test đạt. Chơi thật: giống hệt trước.

### M2 — Hai archetype mới + EXP theo quái
- `melee_swarmer`: HP ×0.5, tốc ×1.35, xp ×0.8. `melee_brute`: HP ×2.5, tốc ×0.75, chạm +1, xp ×2. `XP_TIER_BONUS = 0.1`. Mẫu gần `[grunt, grunt, caster, swarmer]`; mẫu xa `[grunt, brute, caster, swarmer, caster, brute]`.
- Sửa: `enemyConfig.ts`, `worldConfig.ts`, `progression/progressionConfig.ts`, `WorldScene.ts` (`handleEnemyKilled(xp)`, `dropLoot`), entities như M1. Test thêm vào `spawnPattern.test.ts`.
- Nghiệm thu: không quái sinh trong vùng an toàn; tần suất archetype mỗi chu kỳ khớp bảng; XP là hàm thuần của (archetype, bậc) có test; `BossEnemy.ts`/`bossArenaConfig.ts` diff rỗng; tổng quái sống ≤ `MAX_ALIVE_CAP`. Chơi thật: vùng xa có "khác" không; nhận ra Brute/Swarmer trên màn nhỏ (cần Visual Designer); tốc độ lên cấp; lớp Song Thủ Khiên không bị "vây".

### M3 — Elite có affix
- Mỗi vùng ngoài làng: 1 Elite sau mỗi `ELITE_KILLS_INTERVAL = 25` quái hạ trong vùng; `ELITE_MAX_ALIVE = 1`, `ELITE_HEALTH_MULT = 5`, `ELITE_XP_MULT = 8`, `ELITE_GEM_COUNT = 2`, hòm chắc chắn; affix `swift` (tốc ×1.4), `armored` (nhận ×0.7), `escorted` (kèm 3 swarmer). Báo bằng toast. Chỉ lưu trong bộ nhớ, không vào save.
- Sửa: `worldConfig.ts` (`eliteSlots`), `worldGraph.ts`, `WorldScene.ts`, `enemyConfig.ts`, `entities/EnemyBase.ts` (hệ số nhận sát thương nếu chưa có), `PROJECT_MAP.md`. Tạo: `world/eliteRules.ts` + test.
- Nghiệm thu: `shouldSpawnElite(killsInRegion, aliveElites, region)` thuần, test biên; không Elite ở làng/Arena; không quá `ELITE_MAX_ALIVE`; chọn affix xác định theo seed; `BossEnemy.ts` diff rỗng. Chơi thật: đáng săn không; affix khác biệt; Elite có quá yếu khi L17+.

## 5. Rủi ro và chưa xác định

- Elite HP ×5 có thể thành quái thường khi người chơi L17+ (sát thương +50%/cấp nếu dồn Sức mạnh) → chỉnh sau chơi thật.
- EXP theo archetype/bậc đổi tốc độ lên cấp; chưa có dữ liệu chơi thật.
- Swarmer nhanh + lớp Song Thủ Khiên (chạy chậm) → cảm giác bị vây; chơi thử riêng.
- [?] `Player.takeDamage` quy đổi (`PLAYER_MAX_HEALTH = 6`, đạn quái 5; comment `scaleConfig.ts` nói "máu 12"): độ nguy hiểm thực của đạn.
- [?] `Enemy.ts` có hỗ trợ scale/tint truyền vào chưa; `EnemyBase` có kháng sát thương vật lý không; `spawnIndex` có mang qua scene không; có cách đánh dấu Elite (toast đủ cho bản đầu).
- [?] Nguồn `BOSS_LOOT_GEAR_IDS` và bảng drop trang bị thực tế.
- Không đụng: `combatConfig.ts` (trừ khi gói nêu rõ), Boss, `bossArenaConfig.ts`, save v8, `PlayerState`, `RunSession`, hitbox/timing chiến đấu. Tối ưu Android và Visual Overhaul vẫn hoãn.
