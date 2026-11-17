import Phaser from 'phaser';

import {
  BOSS_ARENA_BOSS_SPAWN,
  BOSS_ARENA_HEIGHT,
  BOSS_ARENA_MINION_MAX_ALIVE,
  BOSS_ARENA_PORTAL_REPEL_SPEED,
  BOSS_ARENA_PORTAL_SAFE_RADIUS,
  BOSS_ARENA_WALL_RISE,
  BOSS_ARENA_WIDTH,
} from '../config/bossArenaConfig';
import { SCENE_KEYS } from '../config/constants';
import { buildBossArena } from '../world/bossArena';
import {
  isInsidePortalSafeZone,
  shouldSpawnArenaMinions,
} from '../world/bossArenaRules';
import type { TownInfo } from '../world/town';
import { findMap, type MapId } from '../world/worldGraph';
import { MAP_BOSS_ARENA_1, WORLD } from '../config/worldConfig';
import { WorldScene } from './WorldScene';

/**
 * Đấu Trường Boss: scene riêng, kế thừa toàn bộ chiến đấu/HUD/kỹ năng của `WorldScene`
 * và chỉ ghi đè phần phụ thuộc bản đồ (xem các hook `protected` ở `WorldScene`).
 * Đây là NƠI DUY NHẤT Boss được sinh. Trạng thái lượt chơi mang sang qua `RunSession`.
 */
export class BossArenaScene extends WorldScene {
  constructor() {
    super(SCENE_KEYS.bossArena);
  }

  protected get inBossArena(): boolean {
    return true;
  }

  protected getMapId(): MapId {
    return MAP_BOSS_ARENA_1;
  }

  protected buildMap(): TownInfo {
    return buildBossArena(this, this.obstacles);
  }

  /** Chừa thêm phía trên để thấy đỉnh tường Bắc (tường vẽ nhô lên). */
  protected getCameraBounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: 0,
      y: -BOSS_ARENA_WALL_RISE,
      width: BOSS_ARENA_WIDTH,
      height: BOSS_ARENA_HEIGHT + BOSS_ARENA_WALL_RISE,
    };
  }

  /** Ánh sáng cố định đã dựng trong `buildBossArena`; không dùng chu kỳ ngày/đêm. */
  protected createLighting(): void {
    // Không làm gì: tránh createAtmosphere (ngày/đêm).
  }

  protected createDayNightControl(): void {
    // Arena không có nút/phím đổi ngày-đêm.
  }

  protected isSafeZonePoint(): boolean {
    return false;
  }

  /** Arena trống lúc vào; quái con chỉ sinh theo luật ở `canSpawnEnemies`. */
  protected getInitialEnemyCount(): number {
    return 0;
  }

  protected canSpawnEnemies(time: number): boolean {
    return shouldSpawnArenaMinions({
      inArena: true,
      bossNumber: this.clock.bossNumber,
      bossAlive: this.boss !== null,
      bossReady: this.clock.bossReady,
      now: time,
      nextBossAt: this.clock.nextBossAt,
    });
  }

  protected getMaxAliveEnemies(tier: number): number {
    return Math.min(super.getMaxAliveEnemies(tier), BOSS_ARENA_MINION_MAX_ALIVE);
  }

  protected getBossSpawnPoint(): { x: number; y: number } {
    return { ...BOSS_ARENA_BOSS_SPAWN };
  }

  /** Chết ở Arena: reset lượt chơi và về WorldScene (như `scene.restart()` ở map chính). */
  protected restartRun(): void {
    const respawnMap = findMap(WORLD, this.getMapDef().deathRespawn.mapId);

    if (respawnMap === null) {
      throw new Error('deathRespawn của map Arena trỏ tới map không tồn tại');
    }

    this.clearRunSession();
    this.scene.start(respawnMap.sceneKey, { characterId: this.characterId });
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
    this.keepEnemiesOutOfPortalZone();
  }

  /** Vùng sạch quanh cổng về: quái/Boss bị đẩy ra ngoài, không bao giờ nán lại trong đó. */
  private keepEnemiesOutOfPortalZone(): void {
    for (const portal of this.town.portals) {
      for (const enemy of this.getEnemies()) {
        if (
          !enemy.isAlive() ||
          !isInsidePortalSafeZone(
            enemy.x,
            enemy.y,
            portal.x,
            portal.y,
            BOSS_ARENA_PORTAL_SAFE_RADIUS,
          )
        ) {
          continue;
        }

        const away = new Phaser.Math.Vector2(enemy.x - portal.x, enemy.y - portal.y);

        if (away.lengthSq() === 0) {
          away.set(0, -1);
        }

        away.normalize().scale(BOSS_ARENA_PORTAL_REPEL_SPEED);
        enemy.setVelocity(away.x, away.y);
      }
    }
  }
}
