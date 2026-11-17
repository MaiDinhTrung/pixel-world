/**
 * Luật thuần (không phụ thuộc Phaser) của Đấu Trường Boss: khi nào Boss được sinh,
 * khi nào cổng bị từ chối, khi nào sinh quái con, và vị trí có nằm trong vùng sạch cổng không.
 */

// ── Boss ────────────────────────────────────────────────────────────────────

export type BossTickAction = 'none' | 'warn' | 'mark_ready' | 'spawn';

export interface BossTickInput {
  /** true = đang ở Map loại 'boss' (Đấu Trường). Chỉ khi true mới được 'spawn'. */
  inArena: boolean;
  now: number;
  nextBossAt: number;
  bossAlive: boolean;
  bossReady: boolean;
  bossWarningShown: boolean;
  warningMs: number;
  /** Thời điểm vào Arena (null ở map chính). */
  arenaEntryAt: number | null;
  entrySpawnDelayMs: number;
}

/**
 * Quyết định việc cần làm với Boss ở frame này.
 * - Map chính: hết giờ thì chỉ 'mark_ready' (Boss chờ ở Arena), không bao giờ 'spawn'.
 * - Arena: Boss ra ở max(nextBossAt, lúc vào + độ trễ), nên vào lúc đã sẵn sàng thì ra sau độ trễ,
 *   còn ở sẵn trong Arena thì ra đúng nextBossAt.
 */
export function decideBossAction(input: BossTickInput): BossTickAction {
  if (input.bossAlive) {
    return 'none';
  }

  if (!input.inArena) {
    if (input.bossReady) {
      return 'none';
    }

    if (input.now >= input.nextBossAt) {
      return 'mark_ready';
    }

    return shouldWarn(input) ? 'warn' : 'none';
  }

  const entryAt = input.arenaEntryAt ?? input.now;
  const spawnAt = Math.max(input.nextBossAt, entryAt + input.entrySpawnDelayMs);

  if (input.now >= spawnAt) {
    return 'spawn';
  }

  return !input.bossReady && shouldWarn(input) ? 'warn' : 'none';
}

function shouldWarn(input: BossTickInput): boolean {
  return (
    !input.bossWarningShown && input.now >= input.nextBossAt - input.warningMs
  );
}

// ── Quái con ────────────────────────────────────────────────────────────────

export interface ArenaMinionInput {
  inArena: boolean;
  /** Số Boss đã xuất hiện trong lượt này; 0 = chưa có Boss đầu → Arena trống. */
  bossNumber: number;
  bossAlive: boolean;
  bossReady: boolean;
  now: number;
  nextBossAt: number;
}

/** Quái con chỉ sinh sau khi hạ Boss, và dừng khi tới giờ Boss kế (hoặc Boss đang chờ/sống). */
export function shouldSpawnArenaMinions(input: ArenaMinionInput): boolean {
  return (
    input.inArena &&
    input.bossNumber >= 1 &&
    !input.bossAlive &&
    !input.bossReady &&
    input.now < input.nextBossAt
  );
}

// ── Cổng ────────────────────────────────────────────────────────────────────

export type PortalKind = 'enter' | 'return';

export type PortalDenyReason =
  | 'panel_open'
  | 'player_dead'
  | 'cooldown'
  | 'leaping'
  | 'traveling'
  | 'boss_alive';

export interface PortalAccessInput {
  kind: PortalKind;
  panelOpen: boolean;
  playerDead: boolean;
  now: number;
  portalCooldownUntil: number;
  leaping: boolean;
  traveling: boolean;
  bossAlive: boolean;
}

/** null = được dùng cổng; ngược lại là lý do bị từ chối. */
export function getPortalDenyReason(
  input: PortalAccessInput,
): PortalDenyReason | null {
  if (input.panelOpen) {
    return 'panel_open';
  }

  if (input.playerDead) {
    return 'player_dead';
  }

  if (input.traveling) {
    return 'traveling';
  }

  if (input.now < input.portalCooldownUntil) {
    return 'cooldown';
  }

  if (input.leaping) {
    return 'leaping';
  }

  if (input.kind === 'return' && input.bossAlive) {
    return 'boss_alive';
  }

  return null;
}

/** Lý do nào đáng hiện toast cho người chơi (các lý do còn lại im lặng). */
export function isPortalDenyToastWorthy(reason: PortalDenyReason): boolean {
  return reason === 'boss_alive';
}

/** Tiến độ sạc 0..1 (kẹp). */
export function getPortalChargeProgress(
  now: number,
  chargeStartedAt: number,
  chargeMs: number,
): number {
  if (chargeMs <= 0) {
    return 1;
  }

  return Math.min(1, Math.max(0, (now - chargeStartedAt) / chargeMs));
}

/** Điểm (x, y) có nằm trong vùng sạch (hình tròn) quanh cổng không. */
export function isInsidePortalSafeZone(
  x: number,
  y: number,
  portalX: number,
  portalY: number,
  safeRadius: number,
): boolean {
  return Math.hypot(x - portalX, y - portalY) < safeRadius;
}
