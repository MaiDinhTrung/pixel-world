/**
 * Chọn archetype từ bảng sinh theo vùng (Gói M1): quay vòng xác định theo chỉ số sinh. Thuần.
 */

/** `pattern[spawnIndex % pattern.length]`; pattern rỗng → null. */
export function pickArchetype<T extends string>(
  pattern: readonly T[],
  spawnIndex: number,
): T | null {
  if (pattern.length === 0) {
    return null;
  }

  return pattern[spawnIndex % pattern.length];
}
