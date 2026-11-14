import Phaser from 'phaser';

import {
  AMBIENT,
  ATMOSPHERE_DEPTH,
  ATMOSPHERE_ENABLED,
  GROUND_WASH,
  LIGHT_SOURCES,
  LIGHT_TEXTURE_KEY,
  POINT_LIGHT,
  TINT_BY_ASSET,
  VIGNETTE,
  VIGNETTE_TEXTURE_KEY,
} from '../config/atmosphereConfig';
import {
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../config/constants';

interface AtmosphereSettings {
  enabled: boolean;
  ambientAlpha: number;
  vignetteStrength: number;
}

let cachedSettings: AtmosphereSettings | null = null;

/** Cài đặt đã đọc (URL không đổi trong phiên nên chỉ đọc một lần). */
function getSettings(): AtmosphereSettings {
  cachedSettings ??= readSettings();
  return cachedSettings;
}

/** Lớp không khí (ambient/vignette/ánh sáng/tint) có đang bật không (?atmo=off tắt hết). */
export function isAtmosphereEnabled(): boolean {
  return getSettings().enabled;
}

/** Đọc tham số URL để thử nhanh (?atmo=off, ?ambient=0.35, ?vignette=0.6); lỗi thì dùng config. */
function readSettings(): AtmosphereSettings {
  const settings: AtmosphereSettings = {
    enabled: ATMOSPHERE_ENABLED,
    ambientAlpha: AMBIENT.alpha,
    vignetteStrength: VIGNETTE.strength,
  };

  try {
    const params = new URLSearchParams(window.location.search);

    if (params.get('atmo') === 'off') {
      settings.enabled = false;
    }

    const ambient = Number(params.get('ambient'));

    if (params.has('ambient') && Number.isFinite(ambient)) {
      settings.ambientAlpha = Phaser.Math.Clamp(ambient, 0, 0.8);
    }

    const vignette = Number(params.get('vignette'));

    if (params.has('vignette') && Number.isFinite(vignette)) {
      settings.vignetteStrength = Phaser.Math.Clamp(vignette, 0, 1);
    }
  } catch {
    // Không đọc được URL: giữ giá trị config.
  }

  return settings;
}

/** Sinh texture vignette (gradient tròn từ trong suốt ra đen) một lần cho cả game. */
function ensureVignetteTexture(scene: Phaser.Scene, strength: number): void {
  if (scene.textures.exists(VIGNETTE_TEXTURE_KEY)) {
    scene.textures.remove(VIGNETTE_TEXTURE_KEY);
  }

  const texture = scene.textures.createCanvas(
    VIGNETTE_TEXTURE_KEY,
    DESIGN_WIDTH,
    DESIGN_HEIGHT,
  );

  if (!texture) {
    return;
  }

  const context = texture.getContext();
  const cx = DESIGN_WIDTH / 2;
  const cy = DESIGN_HEIGHT / 2;
  const radius = Math.hypot(cx, cy);
  const gradient = context.createRadialGradient(cx, cy, 0, cx, cy, radius);

  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(VIGNETTE.clearRadius, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, `rgba(0,0,0,${strength})`);
  context.fillStyle = gradient;
  context.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
  texture.refresh();
}

/**
 * Tạo lớp ambient (MULTIPLY) + vignette cố định theo camera.
 * Các đối tượng thuộc display list của scene nên tự dọn khi scene shutdown.
 */
export function createAtmosphere(scene: Phaser.Scene): void {
  const settings = getSettings();

  if (!settings.enabled) {
    return;
  }

  if (settings.ambientAlpha > 0) {
    scene.add
      .rectangle(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT, AMBIENT.color, settings.ambientAlpha)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setBlendMode(Phaser.BlendModes.MULTIPLY)
      .setDepth(ATMOSPHERE_DEPTH.ambient);
  }

  if (settings.vignetteStrength > 0) {
    ensureVignetteTexture(scene, settings.vignetteStrength);
    scene.add
      .image(0, 0, VIGNETTE_TEXTURE_KEY)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(ATMOSPHERE_DEPTH.vignette);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2b — Ánh sáng điểm
// ─────────────────────────────────────────────────────────────────────────────

const LIGHT_TEXTURE_SIZE = 128;

/** Sinh texture ánh sáng điểm (trắng ở tâm → trong suốt ở rìa, falloff mượt) một lần cho cả game. */
function ensureLightTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(LIGHT_TEXTURE_KEY)) {
    return;
  }

  const texture = scene.textures.createCanvas(
    LIGHT_TEXTURE_KEY,
    LIGHT_TEXTURE_SIZE,
    LIGHT_TEXTURE_SIZE,
  );

  if (!texture) {
    return;
  }

  const context = texture.getContext();
  const center = LIGHT_TEXTURE_SIZE / 2;
  const gradient = context.createRadialGradient(center, center, 0, center, center, center);

  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  gradient.addColorStop(0.55, 'rgba(255,255,255,0.18)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, LIGHT_TEXTURE_SIZE, LIGHT_TEXTURE_SIZE);
  texture.refresh();
}

/**
 * Thêm vầng sáng ấm (ADD, nhấp nháy) cho asset có trong `LIGHT_SOURCES` (campfire, lamppost).
 * (x, y) là điểm đặt của prop (đáy sprite). Asset khác hoặc đã tắt không khí thì bỏ qua.
 */
export function addPointLight(
  scene: Phaser.Scene,
  asset: string,
  x: number,
  y: number,
): void {
  const source = LIGHT_SOURCES[asset];

  if (!source || !isAtmosphereEnabled()) {
    return;
  }

  ensureLightTexture(scene);

  const baseScale = (source.radius * 2) / LIGHT_TEXTURE_SIZE;
  const light = scene.add
    .image(x, y + source.offsetY, LIGHT_TEXTURE_KEY)
    .setTint(POINT_LIGHT.color)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setAlpha(source.alpha)
    .setScale(baseScale)
    .setDepth(ATMOSPHERE_DEPTH.light);

  scene.tweens.add({
    targets: light,
    scale: {
      from: baseScale * (1 - POINT_LIGHT.flickerScale),
      to: baseScale * (1 + POINT_LIGHT.flickerScale),
    },
    alpha: {
      from: source.alpha * (1 - POINT_LIGHT.flickerAlpha),
      to: source.alpha,
    },
    duration: Phaser.Math.Between(POINT_LIGHT.flickerMinMs, POINT_LIGHT.flickerMaxMs),
    delay: Phaser.Math.Between(0, 400),
    ease: 'Sine.easeInOut',
    yoyo: true,
    repeat: -1,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 2c — Tint môi trường (runtime, không sửa PNG)
// ─────────────────────────────────────────────────────────────────────────────

/** Tint nhân cho asset theo `TINT_BY_ASSET` (khóa trong `VILLAGE`). Trả lại chính đối tượng để nối chuỗi. */
export function applyEnvironmentTint<
  T extends Phaser.GameObjects.Image | Phaser.GameObjects.TileSprite,
>(object: T, asset: string): T {
  const tint = TINT_BY_ASSET[asset];

  if (tint !== undefined && isAtmosphereEnabled()) {
    object.setTint(tint);
  }

  return object;
}

/** Lớp rửa màu xám-rêu phủ trên nền cỏ (dưới đường, nước, ruộng) để giảm độ bão hòa của cỏ. */
export function addGroundWash(scene: Phaser.Scene): void {
  if (!isAtmosphereEnabled()) {
    return;
  }

  scene.add
    .rectangle(0, 0, WORLD_WIDTH, WORLD_HEIGHT, GROUND_WASH.color, GROUND_WASH.alpha)
    .setOrigin(0, 0)
    .setDepth(GROUND_WASH.depth);
}
