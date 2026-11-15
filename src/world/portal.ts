import Phaser from 'phaser';

import {
  PORTAL_PARTICLES,
  PORTAL_PARTICLES_TOUCH,
  PORTAL_PEDESTAL_SIZE,
  PORTAL_VORTEX_FPS,
  PORTAL_VORTEX_FRAMES,
  PORTAL_VORTEX_SIZE,
} from '../config/bossArenaConfig';
import type { PortalKind } from './bossArenaRules';
import { isTouchDevice } from '../utils/device';
import { spawnBurst, spawnGlow, spawnRing } from '../utils/effects';

/**
 * Cổng dịch chuyển vẽ procedural (bệ đá + vòng xoáy 8 frame + hạt + nhãn).
 * Chỉ là hiển thị: luật dùng cổng nằm ở `world/bossArenaRules.ts`, điều phối ở `WorldScene`.
 * Texture sinh một lần cho cả game (khoá theo màu), nên vào/ra scene nhiều lần không tạo thêm.
 */

export interface PortalSpec {
  x: number;
  y: number;
  kind: PortalKind;
  color: number;
  label: string;
  /** Màu chữ nhãn (CSS). */
  labelColor: string;
}

/** Cổng trong một scene: vị trí và hình hiển thị. */
export interface ScenePortal {
  x: number;
  y: number;
  kind: PortalKind;
  visual: PortalVisual;
}

const LOCKED_TINT = 0x6b6f80;
const GLOW_KEY = 'portal-glow';
const GLOW_SIZE = 64;

function hex(color: number): string {
  return color.toString(16).padStart(6, '0');
}

function ensureGlowTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(GLOW_KEY)) {
    return;
  }

  const texture = scene.textures.createCanvas(GLOW_KEY, GLOW_SIZE, GLOW_SIZE);

  if (!texture) {
    return;
  }

  const context = texture.getContext();
  const c = GLOW_SIZE / 2;
  const gradient = context.createRadialGradient(c, c, 0, c, c, c);

  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.4, 'rgba(255,255,255,0.4)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, GLOW_SIZE, GLOW_SIZE);
  texture.refresh();
}

function ensurePedestalTexture(scene: Phaser.Scene, color: number): string {
  const key = `portal-pedestal-${hex(color)}`;

  if (scene.textures.exists(key)) {
    return key;
  }

  const size = PORTAL_PEDESTAL_SIZE;
  const g = scene.add.graphics();
  const c = size / 2;

  // Bệ đá dẹt (elip) + viền sáng + vòng rune màu cổng.
  g.fillStyle(0x15131c, 1);
  g.fillEllipse(c, c + 4, size - 4, size * 0.58);
  g.fillStyle(0x2d2a38, 1);
  g.fillEllipse(c, c, size - 8, size * 0.52);
  g.lineStyle(3, 0x4b465c, 1);
  g.strokeEllipse(c, c, size - 8, size * 0.52);
  g.lineStyle(2, color, 0.9);
  g.strokeEllipse(c, c, size - 28, size * 0.3);
  g.fillStyle(color, 0.28);
  g.fillEllipse(c, c, size - 36, size * 0.24);

  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2;

    g.fillStyle(color, 0.9);
    g.fillRect(
      c + Math.cos(angle) * (size / 2 - 12) - 2,
      c + Math.sin(angle) * (size * 0.26 - 4) - 2,
      4,
      4,
    );
  }

  g.generateTexture(key, size, size);
  g.destroy();

  return key;
}

/** Vòng xoáy: các nhánh xoắn ốc, mỗi frame xoay thêm một bước (lặp liền mạch sau FRAMES frame). */
function ensureVortexTextures(scene: Phaser.Scene, color: number): string[] {
  const keys: string[] = [];
  const size = PORTAL_VORTEX_SIZE;
  const arms = 4;
  const c = size / 2;

  for (let frame = 0; frame < PORTAL_VORTEX_FRAMES; frame += 1) {
    const key = `portal-vortex-${hex(color)}-${frame}`;

    keys.push(key);

    if (scene.textures.exists(key)) {
      continue;
    }

    const g = scene.add.graphics();
    const rotation = (frame / PORTAL_VORTEX_FRAMES) * ((Math.PI * 2) / arms);

    g.fillStyle(color, 0.18);
    g.fillCircle(c, c, c - 2);
    g.fillStyle(0x05030a, 0.75);
    g.fillCircle(c, c, c * 0.34);

    for (let arm = 0; arm < arms; arm += 1) {
      const base = rotation + (arm / arms) * Math.PI * 2;
      let prevX = c;
      let prevY = c;

      for (let step = 1; step <= 16; step += 1) {
        const t = step / 16;
        const radius = t * (c - 3);
        const angle = base + t * 2.6;
        const x = c + Math.cos(angle) * radius;
        const y = c + Math.sin(angle) * radius;

        g.lineStyle(Math.max(1, 4 - t * 3), color, 0.35 + (1 - t) * 0.65);
        g.lineBetween(prevX, prevY, x, y);
        prevX = x;
        prevY = y;
      }
    }

    g.lineStyle(2, 0xffffff, 0.35);
    g.strokeCircle(c, c, c * 0.34);
    g.generateTexture(key, size, size);
    g.destroy();
  }

  return keys;
}

export class PortalVisual {
  private readonly scene: Phaser.Scene;
  private readonly spec: PortalSpec;
  private readonly vortex: Phaser.GameObjects.Image;
  private readonly glow: Phaser.GameObjects.Image;
  private readonly label: Phaser.GameObjects.Text;
  private readonly chargeRing: Phaser.GameObjects.Graphics;
  private readonly vortexKeys: string[];
  private readonly particles: Phaser.GameObjects.Image[] = [];
  private readonly baseLabel: string;
  private locked = false;
  private charge = 0;

  constructor(scene: Phaser.Scene, spec: PortalSpec) {
    this.scene = scene;
    this.spec = spec;
    this.baseLabel = spec.label;
    ensureGlowTexture(scene);
    this.vortexKeys = ensureVortexTextures(scene, spec.color);

    scene.add
      .image(spec.x, spec.y, ensurePedestalTexture(scene, spec.color))
      .setDepth(4);

    this.glow = scene.add
      .image(spec.x, spec.y - 36, GLOW_KEY)
      .setTint(spec.color)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(3.4)
      .setAlpha(0.55)
      .setDepth(spec.y + 1);
    this.vortex = scene.add
      .image(spec.x, spec.y - 36, this.vortexKeys[0])
      .setDepth(spec.y + 2);
    this.chargeRing = scene.add.graphics().setDepth(spec.y + 3);
    this.label = scene.add
      .text(spec.x, spec.y - 88, spec.label, {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: spec.labelColor,
        fontStyle: 'bold',
        backgroundColor: '#0b0c12',
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5)
      .setAlpha(0.9)
      .setDepth(spec.y + 4);

    const count = isTouchDevice() ? PORTAL_PARTICLES_TOUCH : PORTAL_PARTICLES;

    for (let i = 0; i < count; i += 1) {
      this.particles.push(
        scene.add
          .image(spec.x, spec.y - 36, GLOW_KEY)
          .setTint(spec.color)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setScale(0.28)
          .setDepth(spec.y + 3),
      );
    }

    this.update(0);
  }

  /** Khoá/mở: khoá thì xám, mờ, nhãn có hậu tố. */
  setLocked(locked: boolean): void {
    if (this.locked === locked) {
      return;
    }

    this.locked = locked;
    this.label.setText(locked ? `${this.baseLabel} (KHÓA)` : this.baseLabel);
    this.label.setColor(locked ? '#9aa0b4' : this.spec.labelColor);

    if (locked) {
      this.vortex.setTint(LOCKED_TINT);
      this.glow.setTint(LOCKED_TINT);
    } else {
      this.vortex.clearTint();
      this.glow.setTint(this.spec.color);
    }
  }

  isLocked(): boolean {
    return this.locked;
  }

  /** Tiến độ sạc 0..1 (vẽ vòng cung quanh cổng). */
  setCharge(progress: number): void {
    this.charge = Phaser.Math.Clamp(progress, 0, 1);
  }

  /** Hiệu ứng bùng sáng khi dịch chuyển (tái dùng ring.shock/glow.flash/burst.sparks). */
  playActivate(): void {
    const y = this.spec.y - 36;

    spawnRing(this.scene, this.spec.x, y, 110, this.spec.color, 420);
    spawnGlow(this.scene, this.spec.x, y, this.spec.color, 2.4, 500);
    spawnBurst(this.scene, this.spec.x, y, this.spec.color, 14, 180);
  }

  update(time: number): void {
    const frame =
      Math.floor((time / 1000) * PORTAL_VORTEX_FPS) % PORTAL_VORTEX_FRAMES;
    const pulse = 1 + 0.05 * Math.sin(time / 260);
    const speed = this.locked ? 0.4 : 1;

    this.vortex.setTexture(this.vortexKeys[this.locked ? 0 : frame]);
    this.vortex.setScale(pulse * (1 + this.charge * 0.35));
    this.glow
      .setAlpha((this.locked ? 0.2 : 0.5 + this.charge * 0.35) * (0.9 + 0.1 * Math.sin(time / 190)))
      .setScale(3.4 * pulse);

    this.particles.forEach((particle, index) => {
      const phase = (index / this.particles.length) * Math.PI * 2;
      const angle = phase + (time / 1000) * 1.4 * speed;
      const rise = (((time / 1000) * 0.5 * speed + index * 0.37) % 1);

      particle
        .setPosition(
          this.spec.x + Math.cos(angle) * (34 - rise * 10),
          this.spec.y - 36 + Math.sin(angle) * 14 - rise * 46,
        )
        .setAlpha(this.locked ? 0.15 : (1 - rise) * 0.8);
    });

    this.chargeRing.clear();

    if (this.charge > 0) {
      this.chargeRing.lineStyle(4, 0xffffff, 0.9);
      this.chargeRing.beginPath();
      this.chargeRing.arc(
        this.spec.x,
        this.spec.y - 36,
        42,
        -Math.PI / 2,
        -Math.PI / 2 + this.charge * Math.PI * 2,
        false,
      );
      this.chargeRing.strokePath();
    }
  }
}

/** Dựng cổng: trả về vị trí + hình hiển thị để scene tra khoảng cách và điều khiển. */
export function createPortal(scene: Phaser.Scene, spec: PortalSpec): ScenePortal {
  return {
    x: spec.x,
    y: spec.y,
    kind: spec.kind,
    visual: new PortalVisual(scene, spec),
  };
}
