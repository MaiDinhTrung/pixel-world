/**
 * Trạng thái lượt chơi KHÔNG nằm trong save, dùng chung giữa WorldScene và BossArenaScene.
 * Logic thuần (không phụ thuộc Phaser): scene chụp vào đây trước khi chuyển, scene đích áp lại.
 * Mọi mốc thời gian là thời gian TUYỆT ĐỐI của game (`game.loop.time`), không phải đồng hồ riêng của scene.
 */

/** Khoá lưu trong Phaser registry. */
export const RUN_SESSION_REGISTRY_KEY = 'runSession';

export interface RunVitals {
  health: number;
  armor: number;
  energy: number;
}

export interface RunSession {
  /** true = vừa chụp để chuyển scene, scene đích phải áp lại rồi hạ cờ; false = lượt mới. */
  pendingRestore: boolean;
  vitals: RunVitals | null;
  skillCooldownUntil: Record<string, number>;
  dashChargeReadyAt: number[];
  dashReadyAt: number;
  runStartedAt: number;
  nextBossAt: number;
  bossNumber: number;
  /** Hết giờ ở map chính, Boss đang chờ ở Đấu Trường. */
  bossReady: boolean;
  bossWarningShown: boolean;
}

/** Phía nguồn: những gì cần đọc từ Player. */
export interface RunVitalsSource {
  getVitals(): RunVitals;
  getDashChargeReadyAt(): number[];
  getDashReadyAt(): number;
}

/** Phía đích: những gì cần ghi vào Player. */
export interface RunVitalsTarget {
  setVitals(vitals: RunVitals): void;
  setDashChargeReadyAt(readyAt: readonly number[]): void;
  setDashReadyAt(readyAt: number): void;
}

/** Trạng thái scene (không thuộc Player) cần mang theo. */
export interface RunSceneState {
  skillCooldownUntil: Readonly<Record<string, number | undefined>>;
  runStartedAt: number;
  nextBossAt: number;
  bossNumber: number;
  bossReady: boolean;
  bossWarningShown: boolean;
}

/** Lượt chơi mới: đồng hồ Boss bắt đầu từ `now`. */
export function createRunSession(now: number, firstBossDelayMs: number): RunSession {
  return {
    pendingRestore: false,
    vitals: null,
    skillCooldownUntil: {},
    dashChargeReadyAt: [],
    dashReadyAt: 0,
    runStartedAt: now,
    nextBossAt: now + firstBossDelayMs,
    bossNumber: 0,
    bossReady: false,
    bossWarningShown: false,
  };
}

/** Chụp trạng thái trước khi chuyển scene. Trả về bản sao độc lập (không giữ tham chiếu vào scene). */
export function captureRunSession(
  player: RunVitalsSource,
  scene: RunSceneState,
): RunSession {
  const cooldowns: Record<string, number> = {};

  for (const [id, until] of Object.entries(scene.skillCooldownUntil)) {
    if (typeof until === 'number') {
      cooldowns[id] = until;
    }
  }

  return {
    pendingRestore: true,
    vitals: { ...player.getVitals() },
    skillCooldownUntil: cooldowns,
    dashChargeReadyAt: [...player.getDashChargeReadyAt()],
    dashReadyAt: player.getDashReadyAt(),
    runStartedAt: scene.runStartedAt,
    nextBossAt: scene.nextBossAt,
    bossNumber: scene.bossNumber,
    bossReady: scene.bossReady,
    bossWarningShown: scene.bossWarningShown,
  };
}

/** Áp phần thuộc Player (gọi SAU khi scene đích đã áp chỉ số/trang bị để kẹp theo tối đa đúng). */
export function applyRunSessionToPlayer(
  session: RunSession,
  player: RunVitalsTarget,
): void {
  if (session.vitals) {
    player.setVitals({ ...session.vitals });
  }

  player.setDashChargeReadyAt(session.dashChargeReadyAt);
  player.setDashReadyAt(session.dashReadyAt);
}

/** Trạng thái scene thu về từ phiên (hồi chiêu là bản sao mới). */
export function extractRunSceneState(session: RunSession): RunSceneState {
  return {
    skillCooldownUntil: { ...session.skillCooldownUntil },
    runStartedAt: session.runStartedAt,
    nextBossAt: session.nextBossAt,
    bossNumber: session.bossNumber,
    bossReady: session.bossReady,
    bossWarningShown: session.bossWarningShown,
  };
}

/** Phiên có cờ đang chờ áp lại không (chỉ hợp lệ khi scene đích vừa được start sau khi chụp). */
export function isRestorable(session: RunSession | null | undefined): session is RunSession {
  return !!session && session.pendingRestore;
}
