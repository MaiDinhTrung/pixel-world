import Phaser from 'phaser';

import {
  VOID_COOLDOWN_MS,
  VOID_DURATION_MS,
  VOID_ENERGY_COST,
  VOID_FINAL_DAMAGE,
  VOID_PULL_SPEED,
  VOID_RADIUS,
  VOID_TICK_DAMAGE,
  VOID_TICK_MS,
} from '../config/combatConfig';
import { TEXTURE_KEYS } from '../config/constants';
import { NEON } from '../config/palette';
import type { EnemyBase } from '../entities/EnemyBase';
import type { Player } from '../entities/Player';
import {
  spawnBurst,
  spawnGlow,
  spawnHitSpark,
  spawnRing,
} from '../utils/effects';
import { pureDamage } from './damage/resolveDamage';
import type { Weapon } from './Weapon';
import { createWeaponImage, placeWeaponImage } from './weaponSprite';

/** Hố đen gây sát thương Dark (nguyền + hút sinh lực). */
const VOID_HIT = { parts: pureDamage('dark') };

/** VOID STAFF: hố đen hút quái, tick damage và nổ lớn khi kết thúc. */
export class VoidStaffWeapon implements Weapon {
  readonly id = 'void_staff';
  readonly name = 'TRƯỢNG HƯ KHÔNG';
  readonly energyCost = VOID_ENERGY_COST;

  private readonly scene: Phaser.Scene;
  private readonly player: Player;
  private readonly sprite: Phaser.GameObjects.Image;

  private cooldownUntil = 0;
  private fieldActive = false;
  private fieldX = 0;
  private fieldY = 0;
  private fieldUntil = 0;
  private nextTickAt = 0;
  private fieldGlow: Phaser.GameObjects.Image | null = null;
  private fieldTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, player: Player) {
    this.scene = scene;
    this.player = player;

    this.sprite = createWeaponImage(scene, 'void_staff', player.x, player.y);
  }

  setActive(active: boolean): void {
    this.sprite.setVisible(active);
  }

  update(_time: number, aim: Phaser.Math.Vector2): void {
    placeWeaponImage(this.sprite, this.player, 'void_staff', aim);
  }

  tryAttack(time: number, aim: Phaser.Math.Vector2): boolean {
    if (this.player.isDead() || time < this.cooldownUntil) {
      return false;
    }

    const stats = this.player.getStats();
    const bounds = this.scene.physics.world.bounds;

    this.cooldownUntil = time + VOID_COOLDOWN_MS * stats.cooldownMultiplier;
    this.fieldX = Phaser.Math.Clamp(
      this.player.x + aim.x * 220,
      bounds.left + 60,
      bounds.right - 60,
    );
    this.fieldY = Phaser.Math.Clamp(
      this.player.y + aim.y * 220,
      bounds.top + 60,
      bounds.bottom - 60,
    );
    this.fieldActive = true;
    this.fieldUntil = time + VOID_DURATION_MS;
    this.nextTickAt = time + VOID_TICK_MS;

    this.createFieldVisual();
    spawnRing(this.scene, this.fieldX, this.fieldY, VOID_RADIUS, NEON.void, 500);
    spawnGlow(this.scene, this.fieldX, this.fieldY, NEON.void, 2.2, 500);
    this.scene.cameras.main.shake(80, 0.003);

    return true;
  }

  /** Chạy sau AI quái để lực hút không bị AI ghi đè. */
  applyField(enemies: EnemyBase[], time: number): void {
    if (!this.fieldActive) {
      return;
    }

    if (time >= this.fieldUntil) {
      this.endField(enemies);
      return;
    }

    for (const enemy of enemies) {
      if (!enemy.isAlive()) {
        continue;
      }

      const distance = Phaser.Math.Distance.Between(
        enemy.x,
        enemy.y,
        this.fieldX,
        this.fieldY,
      );

      if (distance > VOID_RADIUS) {
        continue;
      }

      const pull = new Phaser.Math.Vector2(
        this.fieldX - enemy.x,
        this.fieldY - enemy.y,
      );

      if (pull.lengthSq() > 4) {
        pull.normalize().scale(VOID_PULL_SPEED);
        enemy.setVelocity(pull.x, pull.y);
      }
    }

    if (time >= this.nextTickAt) {
      this.nextTickAt = time + VOID_TICK_MS;

      const damage = VOID_TICK_DAMAGE * this.player.getStats().damageMultiplier;

      for (const enemy of enemies) {
        if (!enemy.isAlive()) {
          continue;
        }

        const distance = Phaser.Math.Distance.Between(
          enemy.x,
          enemy.y,
          this.fieldX,
          this.fieldY,
        );

        if (distance <= VOID_RADIUS) {
          enemy.takeDamage(damage, this.fieldX, this.fieldY, VOID_HIT);
          spawnHitSpark(this.scene, enemy.x, enemy.y, NEON.void);
        }
      }
    }
  }

  destroy(): void {
    this.clearFieldVisual();
    this.fieldActive = false;
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.destroy();
  }

  private createFieldVisual(): void {
    this.clearFieldVisual();

    this.fieldGlow = this.scene.add
      .image(this.fieldX, this.fieldY, TEXTURE_KEYS.glow)
      .setDepth(2995)
      .setTint(NEON.void)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(2.2)
      .setAlpha(0.65);

    this.fieldTween = this.scene.tweens.add({
      targets: this.fieldGlow,
      scale: { from: 2, to: 2.6 },
      alpha: { from: 0.45, to: 0.8 },
      duration: 450,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private clearFieldVisual(): void {
    this.fieldTween?.stop();
    this.fieldTween = null;
    this.fieldGlow?.destroy();
    this.fieldGlow = null;
  }

  private endField(enemies: EnemyBase[]): void {
    const damage = VOID_FINAL_DAMAGE * this.player.getStats().damageMultiplier;

    for (const enemy of enemies) {
      if (!enemy.isAlive()) {
        continue;
      }

      const distance = Phaser.Math.Distance.Between(
        enemy.x,
        enemy.y,
        this.fieldX,
        this.fieldY,
      );

      if (distance <= VOID_RADIUS) {
        enemy.takeDamage(damage, this.fieldX, this.fieldY, VOID_HIT);
      }
    }

    spawnRing(this.scene, this.fieldX, this.fieldY, VOID_RADIUS, NEON.void, 380);
    spawnBurst(this.scene, this.fieldX, this.fieldY, NEON.void, 16, 220);
    spawnGlow(this.scene, this.fieldX, this.fieldY, NEON.void, 3, 400);
    this.scene.cameras.main.shake(150, 0.006);

    this.clearFieldVisual();
    this.fieldActive = false;
  }
}
