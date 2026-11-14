import Phaser from 'phaser';

import {
  BOSS_FAN_TYPE,
  BOSS_METEOR_TYPE,
  BOSS_NOVA_TYPE,
  ELEMENTAL_ENEMIES_ENABLED,
  type DamageType,
  BOSS_MIN_SPEED_MULT,
  DARK_LEECH_BOSS_MULT,
  RES_CAP_BOSS,
  WIND_BOSS_PUSH_MULT,
} from '../config/damageTypeConfig';

import {
  STATUS_BOSS_DURATION_MULT,
  BOSS_BASE_CONTACT_DAMAGE,
  BOSS_BASE_HEALTH,
  BOSS_BASE_SLAM_DAMAGE,
  BOSS_BASE_SPEED,
  BOSS_BULLET_DAMAGE,
  BOSS_BULLET_SPEED,
  BOSS_ENRAGE_COOLDOWN_MULT,
  BOSS_ENRAGE_EXTRA_BULLETS,
  BOSS_ENRAGE_HEALTH_RATIO,
  BOSS_ENRAGE_SPEED_MULT,
  BOSS_FAN_BASE_BULLETS,
  BOSS_FAN_SPREAD_DEGREES,
  BOSS_FAN_TELEGRAPH_MS,
  BOSS_HEALTH_PER_PLAYER_LEVEL,
  BOSS_HEALTH_PER_TIER,
  BOSS_MAX_SPEED,
  BOSS_METEOR_BASE_COUNT,
  BOSS_METEOR_MAX_COUNT,
  BOSS_METEOR_RADIUS,
  BOSS_METEOR_SCATTER,
  BOSS_METEOR_TELEGRAPH_MS,
  BOSS_MIN_SKILL_COOLDOWN_MS,
  BOSS_NOVA_BASE_BULLETS,
  BOSS_NOVA_BULLETS_PER_TIER,
  BOSS_NOVA_MAX_BULLETS,
  BOSS_NOVA_TELEGRAPH_MS,
  BOSS_SKILL_COOLDOWN_MS,
  BOSS_SKILL_COOLDOWN_PER_TIER_MS,
  BOSS_SLAM_RADIUS,
  BOSS_SLAM_RADIUS_PER_TIER,
  BOSS_SLAM_TELEGRAPH_MS,
  BOSS_SLAM_TRIGGER_RANGE,
  BOSS_SPEED_PER_TIER,
  BOSS_SUMMON_BASE_COUNT,
  BOSS_SUMMON_COOLDOWN_MS,
  BOSS_SUMMON_MAX_COUNT,
  BOSS_SUMMON_TELEGRAPH_MS,
} from '../config/combatConfig';
import { TEXTURE_KEYS } from '../config/constants';
import { NEON } from '../config/palette';
import { spawnBurst, spawnGlow, spawnRing } from '../utils/effects';
import { fireEnemyBullet } from '../utils/projectile';
import { EnemyBase, type EnemyTarget } from './EnemyBase';

export interface BossSlam {
  x: number;
  y: number;
  radius: number;
  damage: number;
  /** Loại sát thương; bỏ trống = vật lý. */
  type?: DamageType;
}

export type BossSlamHandler = (slam: BossSlam) => void;

export interface BossHooks {
  /** Vùng nổ giáng xuống (slam và từng thiên thạch). */
  onSlam: BossSlamHandler;
  /** Triệu hồi quái hộ tống; trả về số quái thực sự được tạo. */
  onSummon: (count: number, boss: BossEnemy) => number;
  projectiles: Phaser.Physics.Arcade.Group;
}

/** Nguyên tố của chiêu boss; tắt cờ ELEMENTAL_ENEMIES_ENABLED thì mọi chiêu là vật lý. */
function bossType(type: DamageType): DamageType | undefined {
  return ELEMENTAL_ENEMIES_ENABLED ? type : undefined;
}

type BossSkill ='slam' | 'nova' | 'fan' | 'meteor' | 'summon';

interface Impact {
  x: number;
  y: number;
  radius: number;
}

/**
 * Boss: HP lớn, không bị đẩy lùi, đuổi Player và luân phiên nhiều kỹ năng
 * (slam, nova đạn, quạt đạn, mưa thiên thạch, triệu hồi). Tier càng cao càng
 * nhiều kỹ năng; dưới 50% HP boss cuồng nộ: nhanh hơn, hồi chiêu ngắn hơn.
 */
export class BossEnemy extends EnemyBase {
  private readonly tier: number;
  private readonly moveSpeed: number;
  private readonly chargeSpeed: number;
  private readonly contactDamage: number;
  private readonly slamDamage: number;
  private readonly slamRadius: number;
  private readonly skillCooldownMs: number;
  private readonly hooks: BossHooks;
  private readonly healthBar: Phaser.GameObjects.Graphics;
  private readonly nameText: Phaser.GameObjects.Text;
  private readonly aura: Phaser.GameObjects.Image;
  private readonly auraTween: Phaser.Tweens.Tween;

  private nextSkillAt: number;
  private nextSummonAt: number;
  private nextChargeAt: number;
  private chargeUntil = 0;
  private enraged = false;
  private lastSkill: BossSkill | null = null;

  private casting: BossSkill | null = null;
  private castEndAt = 0;
  private impacts: Impact[] = [];
  private zones: Phaser.GameObjects.Arc[] = [];
  private readonly pathGfx: Phaser.GameObjects.Graphics;
  private castStartAt = 0;
  private novaOffset = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    tier: number,
    playerLevel: number,
    hooks: BossHooks,
  ) {
    const health =
      BOSS_BASE_HEALTH +
      (tier - 1) * BOSS_HEALTH_PER_TIER +
      Math.max(0, playerLevel - 1) * BOSS_HEALTH_PER_PLAYER_LEVEL;

    super(
      scene,
      x,
      y,
      TEXTURE_KEYS.boss,
      TEXTURE_KEYS.boss,
      health,
      20,
      20,
      NEON.boss,
    );

    this.tier = tier;
    // Boss không thể miễn nhiễm hoàn toàn một nguyên tố.
    this.defense = { resCap: RES_CAP_BOSS };
    this.moveSpeed = Math.min(
      BOSS_MAX_SPEED,
      BOSS_BASE_SPEED + (tier - 1) * BOSS_SPEED_PER_TIER,
    );
    this.chargeSpeed = this.moveSpeed * 2.4;
    this.contactDamage =
      BOSS_BASE_CONTACT_DAMAGE + Math.floor((tier - 1) / 2);
    this.slamDamage =
      BOSS_BASE_SLAM_DAMAGE + Math.floor((tier - 1) / 2);
    this.slamRadius =
      BOSS_SLAM_RADIUS + (tier - 1) * BOSS_SLAM_RADIUS_PER_TIER;
    this.skillCooldownMs = Math.max(
      BOSS_MIN_SKILL_COOLDOWN_MS,
      BOSS_SKILL_COOLDOWN_MS - (tier - 1) * BOSS_SKILL_COOLDOWN_PER_TIER_MS,
    );
    this.hooks = hooks;
    this.nextSkillAt = scene.time.now + 1800;
    this.nextSummonAt = scene.time.now + 6000;
    this.nextChargeAt = scene.time.now + 2500;

    this.setScale(Math.min(4.4, 3.2 + (tier - 1) * 0.15));
    this.setBodySize(20, 20);
    this.setDepth(8);

    this.pathGfx = scene.add.graphics().setDepth(5);
    this.healthBar = scene.add.graphics();
    this.nameText = scene.add
      .text(0, 0, `TRÙM ${tier}`, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#ffe066',
        fontStyle: 'bold',
        stroke: '#12060b',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1);

    this.aura = scene.add
      .image(x, y, TEXTURE_KEYS.glow)
      .setTint(NEON.boss)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.16)
      .setScale(2.2)
      .setDepth(7);

    this.auraTween = scene.tweens.add({
      targets: this.aura,
      alpha: { from: 0.12, to: 0.32 },
      scaleX: { from: 2, to: 2.7 },
      scaleY: { from: 2, to: 2.7 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.once('died', () => {
      this.clearZones();
      this.pathGfx.destroy();
      this.auraTween.stop();
      this.aura.destroy();
      this.healthBar.destroy();
      this.nameText.destroy();
    });

    this.updateOverheadBar();
  }

  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);

    if (this.aura.active) {
      this.aura.setPosition(this.x, this.y);
      this.aura.setDepth(this.y + 19);
    }

    this.updateOverheadBar();
  }

  override getContactDamage(): number {
    return this.contactDamage;
  }

  protected override getStatusDurationMult(): number {
    return STATUS_BOSS_DURATION_MULT;
  }

  protected override canBeFrozen(): boolean {
    return false;
  }

  protected override getPushMult(): number {
    return WIND_BOSS_PUSH_MULT;
  }

  protected override getLeechMult(): number {
    return DARK_LEECH_BOSS_MULT;
  }

  protected override getMinSpeedMult(): number {
    return BOSS_MIN_SPEED_MULT;
  }

  /** Boss kháng khống chế: choáng ngắn hơn và chậm ít hơn quái thường. */
  override applyStun(durationMs: number): void {
    if (durationMs <= 0) {
      return;
    }

    super.applyStun(
      Math.max(180, Math.min(700, durationMs * 0.35)),
    );
  }

  override applySlow(multiplier: number, durationMs: number): void {
    if (durationMs <= 0) {
      return;
    }

    super.applySlow(
      Math.max(0.65, multiplier),
      durationMs * 0.6,
    );
  }

  /** Boss đứng vững trước đòn đánh thường. */
  protected override applyKnockback(
    _sourceX: number,
    _sourceY: number,
  ): void {
    // Boss không bị đẩy lùi.
  }

  updateAI(target: EnemyTarget, time: number): void {
    if (!this.canAct(time)) {
      this.pathGfx.clear();
      return;
    }

    this.checkEnrage();

    if (this.casting) {
      this.setVelocity(0, 0);
      this.drawBulletPaths(this.casting, target, time);

      if (time >= this.castEndAt) {
        this.resolveSkill(this.casting, target, time);
      }

      return;
    }

    const distance = Phaser.Math.Distance.Between(
      this.x,
      this.y,
      target.x,
      target.y,
    );

    if (time >= this.nextSkillAt) {
      const skill = this.pickSkill(distance, time);

      if (skill) {
        this.beginSkill(skill, target, time);
        return;
      }
    }

    // Nếu Player chạy xa, boss lao tới với tốc độ cao để không bị kite mãi.
    if (distance > 260 && time >= this.nextChargeAt) {
      this.nextChargeAt = time + (this.enraged ? 3000 : 4200);
      this.chargeUntil = time + 550;
      spawnGlow(this.scene, this.x, this.y, NEON.boss, 1, 300);
    }

    const direction = new Phaser.Math.Vector2(
      target.x - this.x,
      target.y - this.y,
    );

    if (direction.lengthSq() < 1) {
      this.setVelocity(0, 0);
      return;
    }

    const speed =
      (time < this.chargeUntil ? this.chargeSpeed : this.moveSpeed) *
      (this.enraged ? BOSS_ENRAGE_SPEED_MULT : 1) *
      this.getSpeedMultiplier(time);

    direction.normalize().scale(speed);
    this.setVelocity(direction.x, direction.y);
    this.setFlipX(direction.x < 0);
  }

  private checkEnrage(): void {
    if (
      this.enraged ||
      this.health > this.maxHealth * BOSS_ENRAGE_HEALTH_RATIO
    ) {
      return;
    }

    this.enraged = true;
    this.setTint(0xff7a7a);
    this.aura.setTint(0xff3b3b);
    this.nextSkillAt = Math.min(this.nextSkillAt, this.scene.time.now + 700);
    spawnRing(this.scene, this.x, this.y, 200, 0xff3b3b, 600);
    spawnGlow(this.scene, this.x, this.y, 0xff3b3b, 2.4, 600);
    spawnBurst(this.scene, this.x, this.y, 0xff3b3b, 16, 200);
    this.scene.cameras.main.shake(260, 0.007);
    this.nameText.setColor('#ff6b6b');
  }

  /** Chọn kỹ năng theo tier, khoảng cách; tránh lặp kỹ năng vừa dùng. */
  private pickSkill(distance: number, time: number): BossSkill | null {
    const pool: BossSkill[] = ['fan'];

    if (distance <= BOSS_SLAM_TRIGGER_RANGE) {
      pool.push('slam', 'slam');
    }

    if (this.tier >= 2) {
      pool.push('nova');
    }

    if (this.tier >= 3 || this.enraged) {
      pool.push('meteor');
    }

    if (
      (this.tier >= 2 || this.enraged) &&
      time >= this.nextSummonAt
    ) {
      pool.push('summon', 'summon');
    }

    const options = pool.filter((skill) => skill !== this.lastSkill);
    const list = options.length > 0 ? options : pool;

    return Phaser.Utils.Array.GetRandom(list) ?? null;
  }

  private beginSkill(
    skill: BossSkill,
    target: EnemyTarget,
    time: number,
  ): void {
    this.casting = skill;
    this.lastSkill = skill;
    this.castStartAt = time;
    this.novaOffset = Math.random() * Math.PI;
    this.setVelocity(0, 0);

    let telegraphMs = BOSS_SLAM_TELEGRAPH_MS;

    switch (skill) {
      case 'slam':
        telegraphMs = BOSS_SLAM_TELEGRAPH_MS;
        this.addImpactZone(target.x, target.y, this.slamRadius);
        break;

      case 'meteor': {
        telegraphMs = BOSS_METEOR_TELEGRAPH_MS;
        const count = Math.min(
          BOSS_METEOR_MAX_COUNT,
          BOSS_METEOR_BASE_COUNT +
            Math.floor(this.tier / 2) +
            (this.enraged ? 2 : 0),
        );

        // Viên đầu nhắm thẳng vào Player, các viên còn lại rải quanh.
        this.addImpactZone(target.x, target.y, BOSS_METEOR_RADIUS);

        for (let i = 1; i < count; i += 1) {
          const angle = Math.random() * Math.PI * 2;
          const dist = 60 + Math.random() * BOSS_METEOR_SCATTER;

          this.addImpactZone(
            target.x + Math.cos(angle) * dist,
            target.y + Math.sin(angle) * dist,
            BOSS_METEOR_RADIUS,
          );
        }

        break;
      }

      case 'nova':
        telegraphMs = BOSS_NOVA_TELEGRAPH_MS;
        spawnRing(this.scene, this.x, this.y, 150, NEON.enemyBullet, telegraphMs);
        break;

      case 'fan':
        telegraphMs = BOSS_FAN_TELEGRAPH_MS;
        spawnRing(this.scene, this.x, this.y, 90, NEON.enemyBullet, telegraphMs);
        break;

      case 'summon':
        telegraphMs = BOSS_SUMMON_TELEGRAPH_MS;
        spawnRing(this.scene, this.x, this.y, 170, 0x9d6bff, telegraphMs);
        break;
    }

    this.castEndAt = time + telegraphMs;
    this.playAttackAnimation(telegraphMs);
    spawnGlow(this.scene, this.x, this.y, NEON.boss, 1.3, telegraphMs);
  }

  private resolveSkill(
    skill: BossSkill,
    target: EnemyTarget,
    time: number,
  ): void {
    this.casting = null;
    this.pathGfx.clear();

    const cooldown =
      this.skillCooldownMs *
      (this.enraged ? BOSS_ENRAGE_COOLDOWN_MULT : 1);

    this.nextSkillAt = time + cooldown;

    switch (skill) {
      case 'slam':
      case 'meteor': {
        const impacts = this.impacts;

        this.impacts = [];
        this.clearZones();

        for (const impact of impacts) {
          this.hooks.onSlam({
            ...impact,
            damage: this.slamDamage,
            type: skill === 'meteor' ? bossType(BOSS_METEOR_TYPE) : undefined,
          });
        }

        break;
      }

      case 'nova':
        this.fireNova();
        break;

      case 'fan':
        this.fireFan(target);
        break;

      case 'summon': {
        this.nextSummonAt = time + BOSS_SUMMON_COOLDOWN_MS;
        this.hooks.onSummon(
          Math.min(
            BOSS_SUMMON_MAX_COUNT,
            BOSS_SUMMON_BASE_COUNT + Math.floor(this.tier / 3),
          ),
          this,
        );
        spawnBurst(this.scene, this.x, this.y, 0x9d6bff, 12, 160);
        break;
      }
    }
  }

  private getNovaCount(): number {
    return Math.min(
      BOSS_NOVA_MAX_BULLETS,
      BOSS_NOVA_BASE_BULLETS +
        (this.tier - 1) * BOSS_NOVA_BULLETS_PER_TIER +
        (this.enraged ? BOSS_ENRAGE_EXTRA_BULLETS * 2 : 0),
    );
  }

  private getFanCount(): number {
    return (
      BOSS_FAN_BASE_BULLETS +
      Math.floor(this.tier / 2) * 2 +
      (this.enraged ? BOSS_ENRAGE_EXTRA_BULLETS : 0)
    );
  }

  /** Vẽ đường đạn báo trước cho nova/quạt; đậm dần tới lúc bắn. */
  private drawBulletPaths(
    skill: BossSkill,
    target: EnemyTarget,
    time: number,
  ): void {
    const g = this.pathGfx;

    g.clear();

    if (skill !== 'nova' && skill !== 'fan') {
      return;
    }

    const progress = Phaser.Math.Clamp(
      (time - this.castStartAt) / Math.max(1, this.castEndAt - this.castStartAt),
      0,
      1,
    );
    const alpha = 0.2 + progress * 0.6;
    const length = 520;
    const inner = 30;
    const line = (angle: number, a: number): void => {
      g.lineStyle(2, NEON.enemyBullet, a);
      g.beginPath();
      g.moveTo(this.x + Math.cos(angle) * inner, this.y + Math.sin(angle) * inner);
      g.lineTo(
        this.x + Math.cos(angle) * length,
        this.y + Math.sin(angle) * length,
      );
      g.strokePath();
    };

    if (skill === 'nova') {
      const count = this.getNovaCount();

      for (let i = 0; i < count; i += 1) {
        line(this.novaOffset + (i / count) * Math.PI * 2, alpha);
      }

      if (this.enraged || this.tier >= 4) {
        const second = Math.PI / count + 0.05;

        for (let i = 0; i < count; i += 1) {
          line(second + (i / count) * Math.PI * 2, alpha * 0.4);
        }
      }

      return;
    }

    const count = this.getFanCount();
    const spread = Phaser.Math.DegToRad(BOSS_FAN_SPREAD_DEGREES);
    const baseAngle = Math.atan2(target.y - this.y, target.x - this.x);

    for (let i = 0; i < count; i += 1) {
      line(baseAngle + (i - (count - 1) / 2) * spread * 0.6, alpha);
    }
  }

  private fireNova(): void {
    const count = this.getNovaCount();
    const ring = (offset: number): void => {
      if (!this.active) {
        return;
      }

      for (let i = 0; i < count; i += 1) {
        const angle = offset + (i / count) * Math.PI * 2;

        fireEnemyBullet(
          this.scene,
          this.hooks.projectiles,
          this.x + Math.cos(angle) * 30,
          this.y + Math.sin(angle) * 30,
          angle,
          BOSS_BULLET_SPEED,
          BOSS_BULLET_DAMAGE,
          true,
          bossType(BOSS_NOVA_TYPE),
        );
      }

      spawnBurst(this.scene, this.x, this.y, NEON.enemyBullet, 10, 140);
    };

    ring(this.novaOffset);

    // Cuồng nộ hoặc tier cao: thêm vòng thứ hai lệch nửa khoảng.
    if (this.enraged || this.tier >= 4) {
      this.scene.time.delayedCall(380, () =>
        ring(Math.PI / count + 0.05),
      );
    }
  }

  private fireFan(target: EnemyTarget): void {
    const count = this.getFanCount();
    const spread = Phaser.Math.DegToRad(BOSS_FAN_SPREAD_DEGREES);
    const baseAngle = Math.atan2(target.y - this.y, target.x - this.x);

    for (let i = 0; i < count; i += 1) {
      const angle = baseAngle + (i - (count - 1) / 2) * spread * 0.6;

      fireEnemyBullet(
        this.scene,
        this.hooks.projectiles,
        this.x + Math.cos(angle) * 30,
        this.y + Math.sin(angle) * 30,
        angle,
        BOSS_BULLET_SPEED * 1.15,
        BOSS_BULLET_DAMAGE,
        true,
        bossType(BOSS_FAN_TYPE),
      );
    }

    spawnBurst(this.scene, this.x, this.y, NEON.enemyBullet, 8, 120);
  }

  private addImpactZone(x: number, y: number, radius: number): void {
    this.impacts.push({ x, y, radius });

    const telegraphMs =
      radius === BOSS_METEOR_RADIUS
        ? BOSS_METEOR_TELEGRAPH_MS
        : BOSS_SLAM_TELEGRAPH_MS;

    this.zones.push(
      this.scene.add
        .circle(x, y, radius, NEON.boss, 0.18)
        .setStrokeStyle(3, NEON.boss, 0.95)
        .setDepth(4),
    );
    spawnRing(this.scene, x, y, radius, NEON.boss, telegraphMs);
  }

  private clearZones(): void {
    for (const zone of this.zones) {
      zone.destroy();
    }

    this.zones = [];
  }

  private updateOverheadBar(): void {
    if (!this.active || !this.healthBar.active) {
      return;
    }

    const ratio = Phaser.Math.Clamp(
      this.health / this.maxHealth,
      0,
      1,
    );
    const width = 108 + Math.min(36, (this.tier - 1) * 6);
    const top = this.y - this.displayHeight / 2 - 20;

    this.healthBar.setPosition(this.x, top);
    this.healthBar.setDepth(this.y + 25);
    this.healthBar.clear();
    this.healthBar.fillStyle(0x05060a, 0.9);
    this.healthBar.fillRect(-width / 2 - 2, -2, width + 4, 10);
    this.healthBar.fillStyle(0x45101c, 1);
    this.healthBar.fillRect(-width / 2, 0, width, 6);

    if (ratio > 0) {
      this.healthBar.fillStyle(this.enraged ? 0xff3b3b : NEON.boss, 1);
      this.healthBar.fillRect(
        -width / 2,
        0,
        Math.ceil(width * ratio),
        6,
      );
    }

    this.healthBar.lineStyle(1, 0xffd75e, 0.9);
    this.healthBar.strokeRect(-width / 2 - 2, -2, width + 4, 10);

    this.nameText.setPosition(this.x, top - 6);
    this.nameText.setDepth(this.y + 26);
    this.nameText.setText(
      `TRÙM ${this.tier}  ${Math.max(0, Math.ceil(this.health))}/${this.maxHealth}`,
    );
  }
}
