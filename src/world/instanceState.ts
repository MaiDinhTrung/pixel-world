/**
 * Trạng thái gameplay THUỘC Instance (dữ liệu thuần), tạo MỚI mỗi lần `WorldScene.create()`
 * nên không thể "đi theo" người chơi sang Instance khác (docs/WORLD_ARCHITECTURE.md §5.3).
 *
 * Phân loại:
 *  - Thuộc Instance, dữ liệu thuần (ở đây): spawnIndex, zoneSpawnCounts, zoneSpawnPoints, zoneKillCounts,
 *    elitesSpawned, lastEliteAt, nextSpawnAt.
 *  - Thuộc Instance nhưng là đối tượng Phaser (enemies, bullets, corpses, drops, chests, boss...): giữ ở scene.
 *  - Runtime của người chơi (cờ kỹ năng, nhiệt, ICD passive): `resetPlayerRuntimeState()` trong scene, không phải Instance.
 *
 * Module thuần: không import engine, không ngẫu nhiên, không đọc đồng hồ hệ thống.
 */
export interface InstanceGameplayState {
  /** Chỉ số điểm sinh quái (làng). */
  spawnIndex: number;
  /** M2: số lần đã sinh quái theo vùng (id vùng → đếm), chọn archetype lệch pha với điểm sinh. */
  zoneSpawnCounts: Map<string, number>;
  /** M2: số điểm sinh của từng vùng (tính một lần mỗi lượt chơi). */
  zoneSpawnPoints: Map<string, number>;
  /** M3: số quái thường đã hạ theo vùng kể từ lần Elite gần nhất của vùng. */
  zoneKillCounts: Map<string, number>;
  /** M3: số Elite đã sinh trong lượt này. */
  elitesSpawned: number;
  /** M3: thời điểm (`time.now`) Elite xuất hiện gần nhất; null = chưa có. */
  lastEliteAt: number | null;
  /** Mốc thời gian lần sinh quái kế tiếp (create() gán startNow + 1000). */
  nextSpawnAt: number;
}

export function createInstanceGameplayState(): InstanceGameplayState {
  return {
    spawnIndex: 0,
    zoneSpawnCounts: new Map<string, number>(),
    zoneSpawnPoints: new Map<string, number>(),
    zoneKillCounts: new Map<string, number>(),
    elitesSpawned: 0,
    lastEliteAt: null,
    nextSpawnAt: 0,
  };
}
