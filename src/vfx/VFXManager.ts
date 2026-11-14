import Phaser from 'phaser';

import { TEXTURE_KEYS } from '../config/constants';
import {
  VFX_DEPTH,
  VFX_MAX_PARTICLES,
  VFX_MAX_SPRITES,
  VFX_RING_RADIUS,
  VFX_SLASH_RADIUS,
  VFX_TOUCH_PARTICLE_SCALE,
} from '../config/vfxConfig';
import { isTouchDevice } from '../utils/device';
import { VFXPool } from './VFXPool';
import { VFX_ANIMS, VFX_TEXTURES } from './vfxTextures';
import type { VFXHandle, VFXId, VFXPlayOptions, VFXTarget } from './vfxTypes';

const managers = new WeakMap<Phaser.Scene, VFXManager>();

/** Làm tròn scale tới bước 0.5 để khối pixel không bị méo nhiều. */
function snapScale(value: number): number {
  return Math.max(0.5, Math.round(value * 2) / 2);
}

/**
 * Cửa duy nhất để phát hiệu ứng hình ảnh. Mỗi scene có một manager
 * (tạo lười qua `VFXManager.for`), tự dọn khi scene shutdown.
 */
export class VFXManager {
  private readonly pool: VFXPool;
  private readonly emitter: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly particleScale = isTouchDevice()
    ? VFX_TOUCH_PARTICLE_SCALE
    : 1;
  private readonly attached = new Set<VFXHandle>();

  static for(scene: Phaser.Scene): VFXManager {
    let manager = managers.get(scene);

    if (!manager) {
      manager = new VFXManager(scene);
      managers.set(scene, manager);
    }

    return manager;
  }

  private readonly scene: Phaser.Scene;

  private constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.pool = new VFXPool(scene, VFX_MAX_SPRITES);
    this.emitter = scene.add
      .particles(0, 0, VFX_TEXTURES.pixel, {
        emitting: false,
        maxAliveParticles: VFX_MAX_PARTICLES,
        alpha: { start: 1, end: 0 },
        scale: { start: 1.6, end: 0.3 },
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(VFX_DEPTH.top);

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  play(id: VFXId, options: VFXPlayOptions): void {
    switch (id) {
      case 'slash.arc':
        this.playSlash(options);
        break;
      case 'ring.shock':
        this.playRing(options);
        break;
      case 'burst.sparks':
        this.burst(options);
        break;
      case 'impact.hit':
        this.playImpact(options);
        break;
      case 'glow.flash':
        this.playGlow(options);
        break;
      case 'ground.crack':
        this.playCrack(options);
        break;
      case 'dust.puff':
        this.playDust(options);
        break;
      case 'ghost.afterimage':
        this.playAfterimage(options);
        break;
      default:
        break;
    }
  }

  /**
   * Đâm thương về phía trước theo bảng màu vệt đâm của Liềm: nhiều lớp chồng nhau
   * (ngoài hồng dày → lõi trắng mảnh), cộng sáng. Mũi thương vọt ra theo `angle`,
   * bám theo `target` khi nó lướt rồi mờ. Mỗi lớp là một sprite từ pool; `stop()` thu hồi sớm.
   */
  spearThrust(
    target: VFXTarget,
    angle: number,
    durationMs: number,
    length = 76,
    style: {
      /** 4 màu từ lớp ngoài tới lõi; mặc định bảng hồng của Liềm. */
      colors?: readonly [number, number, number, number];
      /** Nhân độ dày (1 = mặc định). */
      thickMult?: number;
      /** true = chỉ 2 lớp (ngoài + lõi) để nhẹ khi phát nhiều tia cùng lúc. */
      simple?: boolean;
      /** true = thương thon, mũi dài và nhọn hơn. */
      sharp?: boolean;
      /** true = thêm các vòng sóng hình elip vuông góc với thương, nhỏ → to → vừa dọc theo thân. */
      rings?: boolean;
    } = {},
  ): VFXHandle {
    const [c0, c1, c2, c3] = style.colors ?? [0xff8fa3, 0xff8fa3, 0xffc2cf, 0xffffff];
    const m = style.thickMult ?? 1;
    const all: readonly { tint: number; thick: number; alpha: number }[] = [
      { tint: c0, thick: 4.4 * m, alpha: 0.35 },
      { tint: c1, thick: 2.9 * m, alpha: 0.6 },
      { tint: c2, thick: 1.8 * m, alpha: 0.85 },
      { tint: c3, thick: 0.9 * m, alpha: 1 },
    ];
    // Thương `sharp`: giữ tỉ lệ dài/rộng để mũi thật nhọn (nhân Y lớn sẽ làm mũi bè ra).
    const sharpLayers: readonly { tint: number; thick: number; alpha: number }[] = [
      { tint: c0, thick: 1.6 * m, alpha: 0.45 },
      { tint: c1, thick: 1.15 * m, alpha: 0.8 },
      { tint: c3, thick: 0.5 * m, alpha: 1 },
    ];
    const layers = style.sharp ? sharpLayers : style.simple ? [all[1], all[3]] : all;
    const reach = length / 128;
    const sprites: Phaser.GameObjects.Sprite[] = [];
    const ringSprites: { sprite: Phaser.GameObjects.Sprite; along: number }[] = [];
    let done = false;

    const stop = (): void => {
      if (done) {
        return;
      }

      done = true;
      this.scene.events.off(Phaser.Scenes.Events.UPDATE, follow);

      for (const sprite of sprites) {
        this.pool.release(sprite);
      }

      for (const ring of ringSprites) {
        this.pool.release(ring.sprite);
      }
    };
    const follow = (): void => {
      if (!target.active) {
        stop();
        return;
      }

      const x = Math.round(target.x + Math.cos(angle) * 12);
      const y = Math.round(target.y + Math.sin(angle) * 12 - 4);

      for (const sprite of sprites) {
        sprite.setPosition(x, y);
      }

      for (const ring of ringSprites) {
        ring.sprite.setPosition(
          Math.round(target.x + Math.cos(angle) * ring.along),
          Math.round(target.y + Math.sin(angle) * ring.along - 4),
        );
      }
    };

    for (const layer of layers) {
      const sprite = this.pool.acquire(
        style.sharp ? VFX_TEXTURES.spearSharp : VFX_TEXTURES.spear,
      );

      if (!sprite) {
        continue;
      }

      sprite
        .setOrigin(0, 0.5)
        .setRotation(angle)
        .setDepth(VFX_DEPTH.normal)
        .setTint(layer.tint)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(0.15, layer.thick)
        .setAlpha(layer.alpha);
      sprites.push(sprite);
      // Vọt ra nhanh (đâm), giữ, rồi mờ.
      this.scene.tweens.add({
        targets: sprite,
        scaleX: reach,
        duration: Math.max(40, durationMs * 0.25),
        ease: 'Quad.easeOut',
      });
      this.scene.tweens.add({
        targets: sprite,
        alpha: 0,
        delay: durationMs * 0.65,
        duration: durationMs * 0.35,
        onComplete: stop,
      });
    }

    if (style.rings) {
      // Vòng sóng elip đôi vuông góc với thân thương, nhỏ → to → to nhất → vừa (theo hình vẽ);
      // kích thước tính theo chiều dài thương nên tầm giữ nguyên. Hiện dần theo mũi thương.
      const stops: readonly { f: number; across: number }[] = [
        { f: 0.08, across: 0.11 },
        { f: 0.34, across: 0.3 },
        { f: 0.58, across: 0.36 },
        { f: 0.84, across: 0.26 },
      ];

      stops.forEach((spec, index) => {
        const sprite = this.pool.acquire(VFX_TEXTURES.ellipse);

        if (!sprite) {
          return;
        }

        const full = (length * spec.across) / 63; // nửa trục dài (63px texture) → px thế giới
        const along = length * spec.f;

        sprite
          .setRotation(angle)
          .setDepth(VFX_DEPTH.normal)
          .setTint(c3)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setScale(full * 0.7)
          .setAlpha(0);
        ringSprites.push({ sprite, along });
        const appearAt = durationMs * 0.25 * spec.f + index * 6;

        this.scene.tweens.add({
          targets: sprite,
          alpha: { from: 0.95, to: 0 },
          scale: { from: full * 0.7, to: full * 1.12 },
          delay: appearAt,
          duration: Math.max(120, durationMs * 0.75 - appearAt),
          ease: 'Quad.easeOut',
        });
      });
    }

    follow();
    this.scene.events.on(Phaser.Scenes.Events.UPDATE, follow);

    return { stop };
  }

  /** Tia sét ngoằn ngoèo nối hai điểm, chớp rồi tắt nhanh (sprite pool, ngẫu nhiên độ dày/lật). */
  lightningBolt(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    tint = 0xfff6b0,
    durationMs = 180,
  ): void {
    const bolt = this.pool.acquire(VFX_TEXTURES.bolt);

    if (!bolt) {
      return;
    }

    const distance = Math.hypot(x2 - x1, y2 - y1);

    bolt
      .setOrigin(0, 0.5)
      .setPosition(x1, y1)
      .setRotation(Math.atan2(y2 - y1, x2 - x1))
      .setScale(Math.max(0.1, distance / 128), Phaser.Math.FloatBetween(0.7, 1.4))
      .setFlipY(Math.random() < 0.5)
      .setDepth(VFX_DEPTH.top)
      .setTint(tint)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({
      targets: bolt,
      alpha: { from: 1, to: 0 },
      duration: durationMs,
      ease: 'Cubic.easeIn',
      onComplete: () => this.pool.release(bolt),
    });
  }

  /** Hiệu ứng kéo dài bám theo mục tiêu; gọi `stop()` khi buff hết. */
  attach(id: 'aura.shield' | 'aura.fury', target: VFXTarget, tint: number): VFXHandle {
    const aura = this.pool.acquire(VFX_TEXTURES.aura);
    let lastEmber = 0;

    if (aura) {
      aura
        .setDepth(VFX_DEPTH.ground)
        .setTint(tint)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.8);
      this.scene.tweens.add({
        targets: aura,
        alpha: 0.35,
        duration: id === 'aura.fury' ? 380 : 700,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    const follow = (_time: number, delta: number): void => {
      if (!target.active) {
        handle.stop();
        return;
      }

      aura?.setPosition(target.x, target.y + 14);

      if (id === 'aura.fury') {
        lastEmber += delta;

        if (lastEmber > 130) {
          lastEmber = 0;
          this.rise(target.x + Phaser.Math.Between(-12, 12), target.y + 10, tint);
        }
      }
    };

    const handle: VFXHandle = {
      stop: () => {
        if (!this.attached.delete(handle)) {
          return;
        }

        this.scene.events.off(Phaser.Scenes.Events.UPDATE, follow);

        if (aura) {
          this.scene.tweens.killTweensOf(aura);
          this.fadeOut(aura, 220);
        }
      },
    };

    this.attached.add(handle);
    this.scene.events.on(Phaser.Scenes.Events.UPDATE, follow);

    return handle;
  }

  private playSlash(o: VFXPlayOptions): void {
    const sprite = this.pool.acquire(VFX_TEXTURES.slash, 0);

    if (!sprite) {
      return;
    }

    const duration = o.durationMs ?? 200;

    sprite
      .setPosition(o.x, o.y)
      .setDepth(VFX_DEPTH.normal)
      .setRotation(o.angle ?? 0)
      .setScale(snapScale((o.radius ?? 90) / VFX_SLASH_RADIUS))
      .setTint(o.tint ?? 0xffffff)
      .setBlendMode(Phaser.BlendModes.ADD);
    sprite.play({ key: VFX_ANIMS.slash, duration });
    sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () =>
      this.pool.release(sprite),
    );
  }

  private playRing(o: VFXPlayOptions): void {
    const sprite = this.pool.acquire(VFX_TEXTURES.ring);

    if (!sprite) {
      return;
    }

    sprite
      .setPosition(o.x, o.y)
      .setDepth(VFX_DEPTH.normal)
      .setTint(o.tint ?? 0xffffff)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.2)
      .setAlpha(0.9);
    this.scene.tweens.add({
      targets: sprite,
      scale: (o.radius ?? 100) / VFX_RING_RADIUS,
      alpha: 0,
      duration: o.durationMs ?? 300,
      ease: 'Quad.easeOut',
      onComplete: () => this.pool.release(sprite),
    });
  }

  private playGlow(o: VFXPlayOptions): void {
    const sprite = this.pool.acquire(TEXTURE_KEYS.glow);

    if (!sprite) {
      return;
    }

    const scale = o.scale ?? 1;

    sprite
      .setPosition(o.x, o.y)
      .setDepth(VFX_DEPTH.normal)
      .setTint(o.tint ?? 0xffffff)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(scale)
      .setAlpha(o.alpha ?? 0.9);
    this.scene.tweens.add({
      targets: sprite,
      alpha: 0,
      scale: scale * 1.4,
      duration: o.durationMs ?? 250,
      ease: 'Quad.easeOut',
      onComplete: () => this.pool.release(sprite),
    });
  }

  private playImpact(o: VFXPlayOptions): void {
    const tint = o.tint ?? 0xffe66d;

    this.playGlow({ x: o.x, y: o.y, tint, scale: 0.7, durationMs: 140 });

    const spark = this.pool.acquire(TEXTURE_KEYS.spark);

    if (spark) {
      spark
        .setPosition(o.x, o.y)
        .setDepth(VFX_DEPTH.top)
        .setTint(tint)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.scene.tweens.add({
        targets: spark,
        alpha: 0,
        scale: 1.6,
        duration: 110,
        ease: 'Quad.easeOut',
        onComplete: () => this.pool.release(spark),
      });
    }

    this.burst({ x: o.x, y: o.y, tint, count: 3, speed: 70 });
  }

  private playCrack(o: VFXPlayOptions): void {
    const radius = o.radius ?? 120;
    const angle = o.angle ?? 0;
    const hot = this.pool.acquire(VFX_TEXTURES.crack);
    const scar = this.pool.acquire(VFX_TEXTURES.crack);

    if (scar) {
      scar
        .setPosition(o.x, o.y)
        .setDepth(VFX_DEPTH.ground)
        .setRotation(angle)
        .setScale(snapScale(radius / 56))
        .setTint(0x1a1008)
        .setAlpha(0.7);
      this.fadeOut(scar, o.durationMs ?? 900, 250);
    }

    if (hot) {
      hot
        .setPosition(o.x, o.y)
        .setDepth(VFX_DEPTH.ground + 1)
        .setRotation(angle)
        .setScale(snapScale(radius / 56))
        .setTint(o.tint ?? 0xff9a3d)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.fadeOut(hot, 450);
    }
  }

  private playDust(o: VFXPlayOptions): void {
    const dust = this.pool.acquire(TEXTURE_KEYS.spark);

    if (!dust) {
      return;
    }

    dust
      .setPosition(o.x, o.y)
      .setDepth(5)
      .setTint(o.tint ?? 0x9aa0ad)
      .setAlpha(0.28)
      .setScale(0.55, 0.35);
    this.scene.tweens.add({
      targets: dust,
      x: o.x + Phaser.Math.Between(-5, 5),
      y: o.y - 5,
      alpha: 0,
      scaleX: 1,
      scaleY: 0.5,
      duration: 300,
      ease: 'Quad.easeOut',
      onComplete: () => this.pool.release(dust),
    });
  }

  private playAfterimage(o: VFXPlayOptions): void {
    const ghost = this.pool.acquire(o.texture ?? TEXTURE_KEYS.player, o.frame);

    if (!ghost) {
      return;
    }

    ghost
      .setPosition(o.x, o.y)
      .setDepth(2990)
      .setTint(o.tint ?? 0xffffff)
      .setAlpha(0.45)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({
      targets: ghost,
      alpha: 0,
      scale: 1.1,
      duration: 220,
      ease: 'Quad.easeOut',
      onComplete: () => this.pool.release(ghost),
    });
  }

  /** Các mảnh pixel bắn đều ra mọi hướng (dùng emitter chung). */
  private burst(o: VFXPlayOptions): void {
    const count = Math.max(1, Math.round((o.count ?? 8) * this.particleScale));
    const speed = o.speed ?? 120;

    this.emitter
      .setParticleTint(o.tint ?? 0xffe66d)
      .setParticleSpeed(speed * 0.5, speed)
      .setParticleLifespan({ min: 260, max: 420 })
      .explode(count, o.x, o.y);
  }

  /** Một hạt pixel bay lên (ember/khí buff). */
  private rise(x: number, y: number, tint: number): void {
    const dot = this.pool.acquire(VFX_TEXTURES.pixel);

    if (!dot) {
      return;
    }

    dot
      .setPosition(x, y)
      .setDepth(VFX_DEPTH.normal)
      .setTint(tint)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({
      targets: dot,
      y: y - 30,
      alpha: 0,
      duration: 600,
      ease: 'Quad.easeOut',
      onComplete: () => this.pool.release(dot),
    });
  }

  private fadeOut(
    sprite: Phaser.GameObjects.Sprite,
    durationMs: number,
    delayMs = 0,
  ): void {
    this.scene.tweens.add({
      targets: sprite,
      alpha: 0,
      delay: delayMs,
      duration: durationMs,
      onComplete: () => this.pool.release(sprite),
    });
  }

  private destroy(): void {
    for (const handle of [...this.attached]) {
      handle.stop();
    }

    this.pool.destroy();
    managers.delete(this.scene);
  }
}
