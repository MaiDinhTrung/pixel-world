/**
 * Chọn archetype từ bảng sinh theo vùng (Gói M1/M2): xác định, không ngẫu nhiên. Thuần.
 */

/** `pattern[spawnIndex % pattern.length]`; pattern rỗng → null. Dùng cho vùng có điểm sinh riêng (Arena): chuỗi y hệt M1. */
export function pickArchetype<T extends string>(
  pattern: readonly T[],
  spawnIndex: number,
): T | null {
  if (pattern.length === 0) {
    return null;
  }

  return pattern[spawnIndex % pattern.length];
}

/**
 * Chọn archetype cho vùng ngoài làng (M2) với bộ đếm RIÊNG của vùng, tránh việc mỗi điểm sinh luôn ra một loại.
 *
 * Vấn đề: WorldScene chọn điểm sinh `spawnIndex % 8`, nên mỗi vùng nhận các điểm của nó theo thứ tự lặp (vùng gần: 4 điểm,
 * vùng xa: 4 điểm). Nếu loại quái là `pattern[đếm % độ dài]` với độ dài chia hết cho số điểm, điểm nào cũng chỉ gặp một loại.
 *
 * Công thức: `c` = số lần đã sinh trong vùng, `P` = số điểm sinh của vùng, `L` = độ dài mẫu.
 * `vòng r = floor(c / P)`, `chỉ số = (c + r) % L`.
 * Mỗi lần điểm sinh quay lại (r tăng 1) chỉ số dịch thêm 1 so với mẫu → điểm `j` gặp vị trí `(j + r*(P+1)) % L`.
 * Khi gcd(P + 1, L) = 1 thì qua L vòng mỗi điểm gặp ĐỦ mọi vị trí của mẫu đúng bằng nhau → tần suất mỗi archetype
 * khớp mẫu chính xác theo chu kỳ P*L (vùng gần 4x4 = 16, vùng xa 4x6 = 24). Test khóa điều này cho dữ liệu thật.
 *
 * Mẫu rỗng → null. `pointsInRegion` < 1 coi như 1.
 */
export function pickStaggeredArchetype<T extends string>(
  pattern: readonly T[],
  regionSpawnCount: number,
  pointsInRegion: number,
): T | null {
  if (pattern.length === 0) {
    return null;
  }

  const points = Math.max(1, Math.floor(pointsInRegion));
  const round = Math.floor(regionSpawnCount / points);

  return pattern[(regionSpawnCount + round) % pattern.length];
}
