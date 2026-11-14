import Phaser from 'phaser';

import {
  GROUND_SLAM_ANTICIPATION_MS,
  GROUND_SLAM_ASCEND_MS,
  GROUND_SLAM_DESCEND_MS,
  GROUND_SLAM_LAUNCH_HEIGHT,
  GROUND_SLAM_LAUNCH_MS,
  GROUND_SLAM_MAX_LAUNCHED,
  GROUND_SLAM_MAX_RANGE,
  GROUND_SLAM_MIN_RANGE,
  GROUND_SLAM_PEAK_HEIGHT,
  GROUND_SLAM_QUICK_REACH,
  GROUND_SLAM_RECOVERY_MS,
  GROUND_SLAM_STUN_MS,
} from '../../config/combatConfig';
import { BossEnemy } from '../../entities/BossEnemy';
import type { EnemyBase } from '../../entities/EnemyBase';
import type { Player } from '../../entities/Player';
import { VFXManager } from '../../vfx/VFXManager';
import type { VFXHandle } from '../../vfx/vfxTypes';
import { computeLanding } from './landing';
import { launchSprite } from './visualLift';

/** Phần SkillContext mà cú nhảy cần (tránh phụ thuộc vòng với skills.ts). */
export interface LeapContext {
  scene: Phaser.Scene;
  player: Player;
  time: number;
  /** Điểm ngắm (world) khi người chơi kéo nút kỹ năng; undefined = chạm nhanh. */
  aimPoint?: Phaser.Math.Vector2;
}

export interface LeapOptions {
  color: number;
  radius: number;
  /**
   * Gây sát thương diện tròn tại điểm đáp (đi qua pipeline sát thương hiện có)
   * và trả về danh sách quái trúng; mỗi quái chỉ trúng một lần.
   */
  onImpact: (x: number, y: number) => EnemyBase[];
}

type Phase = 'anticipation' | 'ascend' | 'descend' | 'recovery';

interface Visuals {
  shadow: Phaser.GameObjects.Ellipse;
  marker: Phaser.GameObjects.Graphics;
}

/** Màu tia sét (cùng Xung Phong). */
const BOLT_COLOR = 0xfff6b0;

const visuals = new WeakMap<Phaser.Scene, Visuals>();
/** Mỗi scene chỉ một cú nhảy tại một thời điểm. */
const running = new WeakSet<Phaser.Scene>();

/** Bóng và vòng đánh dấu được tạo một lần mỗi scene rồi tái sử dụng. */
function getVisuals(scene: Phaser.Scene): Visuals {
  let v = visuals.get(scene);

  if (!v) {
    v = {
      shadow: scene.add
        .ellipse(0, 0, 26, 10, 0x000000, 0.4)
        .setDepth(3)
        .setVisible(false),
      marker: scene.add.graphics().setDepth(3).setVisible(false),
    };
    visuals.set(scene, v);
  }

  return v;
}

export function isLeapRunning(scene: Phaser.Scene): boolean {
  return running.has(scene);
}

const easeOutQuad = (t: number): number => 1 - (1 - t) * (1 - t);
const easeInQuad = (t: number): number => t * t;

export function startGroundSlamLeap(
  context: LeapContext,
  options: LeapOptions,
): boolean {
  const { scene, player } = context;

  if (running.has(scene) || player.isDead() || player.isLeaping()) {
    return false;
  }

  // Hướng đã khoá lúc thả nút: hướng kéo, nếu không có thì hướng nhân vật đang quay mặt.
  const dir = new Phaser.Math.Vector2();
  let reach: number;

  if (context.aimPoint) {
    dir.set(context.aimPoint.x - player.x, context.aimPoint.y - player.y);
    reach = Phaser.Math.Clamp(dir.length() / GROUND_SLAM_MAX_RANGE, 0, 1);
  } else {
    player.getFacingVector(dir);
    reach = GROUND_SLAM_QUICK_REACH;
  }

  if (dir.lengthSq() === 0) {
    player.getFacingVector(dir);
  }

  dir.normalize();

  const world = scene.physics.world.bounds;
  const landing = computeLanding({
    startX: player.x,
    startY: player.y,
    dirX: dir.x,
    dirY: dir.y,
    reach,
    minRange: GROUND_SLAM_MIN_RANGE,
    maxRange: GROUND_SLAM_MAX_RANGE,
    bounds: {
      left: world.left + 24,
      top: world.top + 28,
      right: world.right - 24,
      bottom: world.bottom - 28,
    },
    // Chỉ xét vật cản tĩnh (tường/đồ vật), giống kiểm tra của Xích Kéo/Dịch chuyển.
    isBlocked: (x, y) =>
      scene.physics.overlapRect(x - 12, y - 16, 24, 32, false, true).length > 0,
  });

  const vfx = VFXManager.for(scene);
  const { shadow, marker } = getVisuals(scene);
  const baseScale = player.scaleX;
  const airMs = GROUND_SLAM_ASCEND_MS + GROUND_SLAM_DESCEND_MS;
  const totalMs =
    GROUND_SLAM_ANTICIPATION_MS + airMs + GROUND_SLAM_RECOVERY_MS;
  let phase: Phase = 'anticipation';
  let phaseElapsed = 0;
  let trailTimer = 0;
  let finished = false;
  let spear: VFXHandle | null = null;
  // Điểm bám của mũi thương: vị trí hiển thị (đã trừ độ cao), không phải toạ độ vật lý.
  const spearAnchor = { x: player.x, y: player.y, active: true };

  running.add(scene);
  player.setLeaping(true);
  player.lockAnimation(context.time + totalMs + 400);
  player.root(context.time, GROUND_SLAM_ANTICIPATION_MS);
  player.setWeaponAimOverride(0, -1);

  marker
    .clear()
    .fillStyle(options.color, 0.12)
    .fillCircle(landing.x, landing.y, options.radius)
    .lineStyle(2, options.color, 0.6)
    .strokeCircle(landing.x, landing.y, options.radius)
    .setVisible(true);
  shadow.setVisible(true).setPosition(player.x, player.y + 14).setScale(1);

  for (let i = 0; i < 3; i += 1) {
    vfx.play('dust.puff', {
      x: player.x + Phaser.Math.Between(-10, 10),
      y: player.y + 16,
    });
  }

  const applyBody = (
    lift: number,
    scaleX: number,
    scaleY: number,
    tilt: number,
  ): void => {
    player.setScale(baseScale * scaleX, baseScale * scaleY);
    player.setVisualLift(lift);
    player.setRotation(tilt);
  };

  const cleanup = (): void => {
    if (finished) {
      return;
    }

    finished = true;
    scene.events.off(Phaser.Scenes.Events.UPDATE, update);
    scene.events.off(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    running.delete(scene);
    spearAnchor.active = false;
    spear?.stop();
    shadow.setVisible(false);
    marker.clear().setVisible(false);

    if (player.active) {
      applyBody(0, 1, 1, 0);
      player.setScale(baseScale);
      player.setLeaping(false);
      player.releaseAnimationLock();
    }
  };

  const impact = (): void => {
    const x = player.x;
    const y = player.y;

    applyBody(0, 1, 1, 0);
    player.setWeaponAimOverride(0, 1);
    shadow.setVisible(false);
    marker.clear().setVisible(false);

    const hits = options.onImpact(x, y);
    const launchable = hits
      .filter((enemy) => !(enemy instanceof BossEnemy))
      .sort(
        (a, b) =>
          Phaser.Math.Distance.Between(x, y, a.x, a.y) -
          Phaser.Math.Distance.Between(x, y, b.x, b.y),
      )
      .slice(0, GROUND_SLAM_MAX_LAUNCHED);

    // Choáng sau khi gây sát thương (takeDamage đặt stun ngắn của riêng nó).
    for (const enemy of hits) {
      enemy.applyStun(GROUND_SLAM_STUN_MS);
    }

    // Hất tung chỉ ở lớp hiển thị; boss không bị hất tung (chỉ choáng, đã tự giảm).
    for (const enemy of launchable) {
      launchSprite(
        scene,
        enemy,
        GROUND_SLAM_LAUNCH_HEIGHT,
        GROUND_SLAM_LAUNCH_MS,
      );
    }

    vfx.play('ground.crack', {
      x,
      y,
      radius: options.radius,
      angle: Math.random() * Math.PI * 2,
      tint: options.color,
    });
    vfx.play('ring.shock', {
      x,
      y,
      radius: options.radius,
      tint: options.color,
      durationMs: 360,
    });
    vfx.play('ring.shock', {
      x,
      y,
      radius: options.radius * 0.6,
      tint: 0xffd166,
      durationMs: 240,
    });
    vfx.play('burst.sparks', { x, y, tint: 0x8a6a3c, count: 12, speed: 200 });
    vfx.play('burst.sparks', { x, y, tint: BOLT_COLOR, count: 12, speed: 190 });

    for (let i = 0; i < 5; i += 1) {
      const a = (i / 5) * Math.PI * 2 + Math.random();
      const d = options.radius * (0.3 + Math.random() * 0.5);

      vfx.play('dust.puff', {
        x: x + Math.cos(a) * d,
        y: y + Math.sin(a) * d,
        tint: 0x6b5a45,
      });
    }

    // Sấm sét toả ra từ điểm đâm xuống và nổ dọc rìa vùng ảnh hưởng.
    for (let i = 0; i < 7; i += 1) {
      const a = (i / 7) * Math.PI * 2 + Math.random() * 0.5;
      const inner = Phaser.Math.Between(6, 18);
      const outer = options.radius * Phaser.Math.FloatBetween(0.7, 1);

      vfx.lightningBolt(
        x + Math.cos(a) * inner,
        y + Math.sin(a) * inner,
        x + Math.cos(a) * outer,
        y + Math.sin(a) * outer,
        BOLT_COLOR,
        260,
      );
    }

    scene.cameras.main.shake(170, 0.007);
    player.root(scene.time.now, GROUND_SLAM_RECOVERY_MS);
  };

  const setPhase = (next: Phase): void => {
    phase = next;
    phaseElapsed = 0;
  };

  const update = (_time: number, delta: number): void => {
    if (player.isDead() || !player.active) {
      cleanup();
      return;
    }

    const dt = Math.min(delta, 50);

    phaseElapsed += dt;

    switch (phase) {
      case 'anticipation': {
        const p = Math.min(1, phaseElapsed / GROUND_SLAM_ANTICIPATION_MS);

        // Khuỵu xuống: dẹt người, hạ thấp 3px, vũ khí giơ lên.
        applyBody(-3 * p, 1 + 0.1 * p, 1 - 0.14 * p, 0);

        if (p >= 1) {
          const now = scene.time.now;

          player.grantInvulnerability(now, airMs + 80);

          if (landing.distance > 8) {
            player.startSkillDash(
              dir,
              now,
              airMs,
              landing.distance / (airMs / 1000),
              0,
            );
          }

          vfx.play('dust.puff', { x: player.x, y: player.y + 16 });
          setPhase('ascend');
        }

        break;
      }
      case 'ascend': {
        const p = Math.min(1, phaseElapsed / GROUND_SLAM_ASCEND_MS);
        const lift = GROUND_SLAM_PEAK_HEIGHT * easeOutQuad(p);

        // Bật lên: kéo dài người, nghiêng theo hướng nhảy.
        applyBody(lift, 0.94, 1.1, dir.x * 0.2);

        if (p >= 1) {
          player.setWeaponAimOverride(0, 1);
          player.playAttack(scene.time.now, new Phaser.Math.Vector2(0, 1));
          player.lockAnimation(scene.time.now + totalMs);

          // Đâm thương xuống đất (cùng bảng màu và sấm sét với Xung Phong).
          spearAnchor.x = player.x;
          spearAnchor.y = player.y - player.getVisualLift();
          spear = vfx.spearThrust(
            spearAnchor,
            Math.PI / 2,
            GROUND_SLAM_DESCEND_MS + 260,
            120,
            // Hình lá: nhỏ sát người, to ở giữa, thu về mũi nhọn. Tầm giữ nguyên (120).
            { thickMult: 1, sharp: true, rings: true },
          );

          for (let i = 0; i < 3; i += 1) {
            const a = Math.PI / 2 + Phaser.Math.FloatBetween(-1.2, 1.2);
            const len = Phaser.Math.Between(40, 80);

            vfx.lightningBolt(
              spearAnchor.x,
              spearAnchor.y + 20,
              spearAnchor.x + Math.cos(a) * len,
              spearAnchor.y + 20 + Math.sin(a) * len,
              BOLT_COLOR,
              200,
            );
          }

          setPhase('descend');
        }

        break;
      }
      case 'descend': {
        const p = Math.min(1, phaseElapsed / GROUND_SLAM_DESCEND_MS);
        // Rơi nhanh dần: độ cao giảm theo bình phương thời gian.
        const lift = GROUND_SLAM_PEAK_HEIGHT * (1 - easeInQuad(p));

        applyBody(lift, 0.96, 1.08, dir.x * 0.2 * (1 - p));
        spearAnchor.x = player.x;
        spearAnchor.y = player.y - lift;
        trailTimer += dt;

        if (trailTimer >= 40) {
          trailTimer = 0;
          vfx.play('ghost.afterimage', {
            x: player.x,
            y: player.y - lift,
            tint: options.color,
            texture: player.texture.key,
            frame: String(player.frame.name),
          });
        }

        if (p >= 1) {
          impact();
          setPhase('recovery');
        }

        break;
      }
      case 'recovery': {
        const p = Math.min(1, phaseElapsed / GROUND_SLAM_RECOVERY_MS);

        // Hoàn tất tiếp đất: dẹt nhẹ rồi đứng thẳng.
        applyBody(0, 1 + 0.08 * (1 - p), 1 - 0.1 * (1 - p), 0);

        if (p >= 1) {
          cleanup();
        }

        break;
      }
      default:
        break;
    }

    // Bóng luôn nằm trên mặt đất theo vị trí thật; nhỏ dần khi nhân vật lên cao.
    if (phase === 'ascend' || phase === 'descend') {
      const lift = player.getVisualLift();

      shadow
        .setPosition(Math.round(player.x), Math.round(player.y + 14))
        .setScale(1 - 0.45 * (lift / GROUND_SLAM_PEAK_HEIGHT));
    } else if (shadow.visible) {
      shadow.setPosition(Math.round(player.x), Math.round(player.y + 14));
    }
  };

  scene.events.on(Phaser.Scenes.Events.UPDATE, update);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);

  return true;
}
