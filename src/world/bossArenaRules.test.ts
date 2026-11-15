import { describe, expect, it } from 'vitest';

import {
  decideBossAction,
  getPortalChargeProgress,
  getPortalDenyReason,
  isInsidePortalSafeZone,
  isPortalDenyToastWorthy,
  shouldSpawnArenaMinions,
  type BossTickInput,
  type PortalAccessInput,
} from './bossArenaRules';

const boss = (over: Partial<BossTickInput>): BossTickInput => ({
  inArena: false,
  now: 0,
  nextBossAt: 120000,
  bossAlive: false,
  bossReady: false,
  bossWarningShown: false,
  warningMs: 10000,
  arenaEntryAt: null,
  entrySpawnDelayMs: 2500,
  ...over,
});

describe('decideBossAction', () => {
  it('map chính: hết giờ chỉ đánh dấu sẵn sàng, không bao giờ sinh Boss', () => {
    for (const now of [0, 119999, 120000, 500000, 9e9]) {
      for (const ready of [false, true]) {
        expect(
          decideBossAction(boss({ inArena: false, now, bossReady: ready })),
        ).not.toBe('spawn');
      }
    }

    expect(decideBossAction(boss({ now: 120000 }))).toBe('mark_ready');
    expect(decideBossAction(boss({ now: 130000, bossReady: true }))).toBe('none');
  });

  it('map chính: cảnh báo 10 giây, chỉ một lần', () => {
    expect(decideBossAction(boss({ now: 109999 }))).toBe('none');
    expect(decideBossAction(boss({ now: 110000 }))).toBe('warn');
    expect(
      decideBossAction(boss({ now: 115000, bossWarningShown: true })),
    ).toBe('none');
  });

  it('vào Arena lúc Boss đã sẵn sàng: ra sau độ trễ, đúng một lần', () => {
    const base = boss({
      inArena: true,
      bossReady: true,
      nextBossAt: 120000,
      arenaEntryAt: 200000,
    });

    expect(decideBossAction({ ...base, now: 200000 })).toBe('none');
    expect(decideBossAction({ ...base, now: 202499 })).toBe('none');
    expect(decideBossAction({ ...base, now: 202500 })).toBe('spawn');
    // Sau khi sinh: Boss sống → không sinh thêm.
    expect(decideBossAction({ ...base, now: 210000, bossAlive: true })).toBe('none');
  });

  it('đã ở Arena từ trước: Boss ra đúng nextBossAt', () => {
    const base = boss({
      inArena: true,
      nextBossAt: 300000,
      arenaEntryAt: 100000,
    });

    expect(decideBossAction({ ...base, now: 299999 })).not.toBe('spawn');
    expect(decideBossAction({ ...base, now: 300000 })).toBe('spawn');
  });

  it('Arena: cảnh báo 10 giây trước giờ Boss kế', () => {
    const base = boss({ inArena: true, nextBossAt: 300000, arenaEntryAt: 100000 });

    expect(decideBossAction({ ...base, now: 290000 })).toBe('warn');
    expect(
      decideBossAction({ ...base, now: 295000, bossWarningShown: true }),
    ).toBe('none');
  });
});

describe('shouldSpawnArenaMinions', () => {
  const base = {
    inArena: true,
    bossNumber: 1,
    bossAlive: false,
    bossReady: false,
    now: 1000,
    nextBossAt: 150000,
  };

  it('Arena trống trước Boss đầu tiên', () => {
    expect(shouldSpawnArenaMinions({ ...base, bossNumber: 0 })).toBe(false);
  });

  it('sau khi hạ Boss thì sinh quái con', () => {
    expect(shouldSpawnArenaMinions(base)).toBe(true);
  });

  it('dừng khi Boss sống, Boss đang chờ, hoặc tới giờ Boss kế', () => {
    expect(shouldSpawnArenaMinions({ ...base, bossAlive: true })).toBe(false);
    expect(shouldSpawnArenaMinions({ ...base, bossReady: true })).toBe(false);
    expect(shouldSpawnArenaMinions({ ...base, now: 150000 })).toBe(false);
  });

  it('không sinh ngoài Arena', () => {
    expect(shouldSpawnArenaMinions({ ...base, inArena: false })).toBe(false);
  });
});

describe('getPortalDenyReason', () => {
  const ok: PortalAccessInput = {
    kind: 'enter',
    panelOpen: false,
    playerDead: false,
    now: 5000,
    portalCooldownUntil: 0,
    leaping: false,
    traveling: false,
    bossAlive: false,
  };

  it('được dùng khi không vướng điều kiện nào', () => {
    expect(getPortalDenyReason(ok)).toBeNull();
    expect(getPortalDenyReason({ ...ok, kind: 'return' })).toBeNull();
  });

  it('cổng về bị từ chối khi Boss sống, cổng vào thì không', () => {
    expect(getPortalDenyReason({ ...ok, kind: 'return', bossAlive: true })).toBe(
      'boss_alive',
    );
    expect(getPortalDenyReason({ ...ok, kind: 'enter', bossAlive: true })).toBeNull();
    expect(isPortalDenyToastWorthy('boss_alive')).toBe(true);
    expect(isPortalDenyToastWorthy('cooldown')).toBe(false);
  });

  it('mọi cổng bị từ chối khi panel mở / đã chết / đang hồi / đang nhảy / đang chuyển', () => {
    for (const kind of ['enter', 'return'] as const) {
      expect(getPortalDenyReason({ ...ok, kind, panelOpen: true })).toBe('panel_open');
      expect(getPortalDenyReason({ ...ok, kind, playerDead: true })).toBe('player_dead');
      expect(
        getPortalDenyReason({ ...ok, kind, portalCooldownUntil: 6500 }),
      ).toBe('cooldown');
      expect(getPortalDenyReason({ ...ok, kind, leaping: true })).toBe('leaping');
      expect(getPortalDenyReason({ ...ok, kind, traveling: true })).toBe('traveling');
    }
  });

  it('hết hồi thì dùng lại được', () => {
    expect(getPortalDenyReason({ ...ok, portalCooldownUntil: 5000 })).toBeNull();
  });
});

describe('tiện ích cổng', () => {
  it('tiến độ sạc được kẹp 0..1', () => {
    expect(getPortalChargeProgress(100, 100, 800)).toBe(0);
    expect(getPortalChargeProgress(500, 100, 800)).toBe(0.5);
    expect(getPortalChargeProgress(5000, 100, 800)).toBe(1);
    expect(getPortalChargeProgress(0, 100, 800)).toBe(0);
  });

  it('vùng sạch quanh cổng', () => {
    expect(isInsidePortalSafeZone(800, 900, 800, 970, 160)).toBe(true);
    expect(isInsidePortalSafeZone(800, 700, 800, 970, 160)).toBe(false);
  });
});
