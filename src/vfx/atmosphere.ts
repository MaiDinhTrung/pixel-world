import Phaser from 'phaser';

import {
  AMBIENT,
  ATMOSPHERE_DEPTH,
  ATMOSPHERE_ENABLED,
  DAY_NIGHT,
  FOG,
  FOG_TEXTURE_KEY,
  GROUND_WASH,
  LIGHT_SOURCES,
  LIGHT_TEXTURE_KEY,
  NIGHT,
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
import { isTouchDevice } from '../utils/device';

/** Chế độ thời gian: tự động theo chu kỳ, hoặc ép luôn ban ngày / ban đêm (để thử). */
export type TimeMode = 'auto' | 'day' | 'night';

interface AtmosphereSettings {
  enabled: boolean;
  /** Độ đậm ambient ban đêm. */
  ambientAlpha: number;
  vignetteStrength: number;
  /** Nhân độ đậm sương (1 = như config, 0 = tắt lớp bóng tối + sương ban đêm). */
  fogMultiplier: number;
  time: TimeMode;
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

/** Chế độ thời gian hiện tại (auto/day/night). */
export function getTimeMode(): TimeMode {
  return getSettings().time;
}

/** Đổi chế độ thời gian (ví dụ từ nút thử); có hiệu lực ở frame kế tiếp, chuyển mượt. */
export function setTimeMode(mode: TimeMode): void {
  getSettings().time = mode;
}

/** Hệ số ban đêm đang hiển thị (0 = ngày, 1 = đêm hẳn); cập nhật mỗi frame. */
let currentNight = 0;

export function getCurrentNightFactor(): number {
  return currentNight;
}

/** Đọc tham số URL để thử nhanh (xem đầu `atmosphereConfig.ts`); lỗi thì dùng config. */
function readSettings(): AtmosphereSettings {
  const settings: AtmosphereSettings = {
    enabled: ATMOSPHERE_ENABLED,
    ambientAlpha: AMBIENT.nightAlpha,
    vignetteStrength: VIGNETTE.strength,
    fogMultiplier: 1,
    time: 'auto',
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

    const fog = Number(params.get('fog'));

    if (params.get('fog') === 'off') {
      settings.fogMultiplier = 0;
    } else if (params.has('fog') && Number.isFinite(fog)) {
      settings.fogMultiplier = Phaser.Math.Clamp(fog, 0, 3);
    }

    const time = params.get('time');

    if (time === 'day' || time === 'night') {
      settings.time = time;
    }
  } catch {
    // Không đọc được URL: giữ giá trị config.
  }

  return settings;
}

// ─────────────────────────────────────────────────────────────────────────────
// Chu kỳ ngày/đêm
// ─────────────────────────────────────────────────────────────────────────────

const smoothstep = (t: number): number => t * t * (3 - 2 * t);

/**
 * Hệ số ban đêm 0 (ban ngày) … 1 (đêm hẳn) theo thời gian đã trôi qua từ lúc vào màn.
 * Chu kỳ: ngày → hoàng hôn → đêm → bình minh → lặp lại; bắt đầu vào ban ngày.
 */
function nightFactor(elapsedMs: number, mode: TimeMode): number {
  if (mode === 'day') {
    return 0;
  }

  if (mode === 'night') {
    return 1;
  }

  const { dayMs, nightMs, transitionMs } = DAY_NIGHT;
  const t = elapsedMs % (dayMs + nightMs + transitionMs * 2);

  if (t < dayMs) {
    return 0;
  }

  if (t < dayMs + transitionMs) {
    return smoothstep((t - dayMs) / transitionMs);
  }

  if (t < dayMs + transitionMs + nightMs) {
    return 1;
  }

  return 1 - smoothstep((t - dayMs - transitionMs - nightMs) / transitionMs);
}

// ─────────────────────────────────────────────────────────────────────────────
// Texture sinh runtime
// ─────────────────────────────────────────────────────────────────────────────

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

/** Số giả ngẫu nhiên cố định (mulberry32) để sương giống nhau mỗi lần chạy. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;

    let t = state;

    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Sinh texture mây trắng lặp liền mạch (nhiễu giá trị nhiều octave, lưới bọc vòng) một lần cho cả game.
 * Chỉ có kênh alpha thay đổi; màu trắng để tint theo `FOG.color`.
 */
function ensureFogTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(FOG_TEXTURE_KEY)) {
    return;
  }

  const size = FOG.textureSize;
  const texture = scene.textures.createCanvas(FOG_TEXTURE_KEY, size, size);

  if (!texture) {
    return;
  }

  const random = seededRandom(20261114);
  const grids = FOG.octaves.map((cells) => {
    const values = new Float32Array(cells * cells);

    for (let i = 0; i < values.length; i += 1) {
      values[i] = random();
    }

    return { cells, values };
  });
  const weights = FOG.octaves.map((_, index) => 1 / 2 ** (index + 1));
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  const context = texture.getContext();
  const image = context.createImageData(size, size);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let noise = 0;

      grids.forEach(({ cells, values }, index) => {
        const fx = (x * cells) / size;
        const fy = (y * cells) / size;
        const x0 = Math.floor(fx);
        const y0 = Math.floor(fy);
        const tx = smoothstep(fx - x0);
        const ty = smoothstep(fy - y0);
        const xa = x0 % cells;
        const xb = (x0 + 1) % cells;
        const ya = y0 % cells;
        const yb = (y0 + 1) % cells;
        const top = values[ya * cells + xa] * (1 - tx) + values[ya * cells + xb] * tx;
        const bottom = values[yb * cells + xa] * (1 - tx) + values[yb * cells + xb] * tx;

        noise += (top * (1 - ty) + bottom * ty) * weights[index];
      });

      const cloud = smoothstep(
        Phaser.Math.Clamp((noise / weightSum - FOG.cloudStart) / FOG.cloudSpan, 0, 1),
      );
      const offset = (y * size + x) * 4;

      image.data[offset] = 255;
      image.data[offset + 1] = 255;
      image.data[offset + 2] = 255;
      image.data[offset + 3] = Math.round(cloud * 255);
    }
  }

  context.putImageData(image, 0, 0);
  texture.refresh();
}

const CLEAR_TEXTURE_SIZE = 128;

/** Sinh texture lỗ xóa: đặc ở giữa (xóa hết bóng tối/sương), mờ dần ra rìa. */
function ensureClearTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(FOG.clearTextureKey)) {
    return;
  }

  const texture = scene.textures.createCanvas(
    FOG.clearTextureKey,
    CLEAR_TEXTURE_SIZE,
    CLEAR_TEXTURE_SIZE,
  );

  if (!texture) {
    return;
  }

  const context = texture.getContext();
  const center = CLEAR_TEXTURE_SIZE / 2;
  const gradient = context.createRadialGradient(center, center, 0, center, center, center);

  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.4, 'rgba(255,255,255,0.95)');
  gradient.addColorStop(0.75, 'rgba(255,255,255,0.3)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, CLEAR_TEXTURE_SIZE, CLEAR_TEXTURE_SIZE);
  texture.refresh();
}

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

// ─────────────────────────────────────────────────────────────────────────────
// Ánh sáng điểm (đăng ký ở đây để lớp đêm biết chỗ khoét lỗ)
// ─────────────────────────────────────────────────────────────────────────────

interface LightEntry {
  x: number;
  y: number;
  /** Bán kính vùng bóng tối/sương bị xua tan quanh nguồn sáng ban đêm (px). */
  clearRadius: number;
  image: Phaser.GameObjects.Image;
  baseAlpha: number;
  baseScale: number;
  /** Pha và chu kỳ nhấp nháy (ms), khác nhau mỗi nguồn để không nhấp nháy đồng bộ. */
  phase: number;
  periodMs: number;
}

const lightRegistry = new WeakMap<Phaser.Scene, LightEntry[]>();

/**
 * Thêm vầng sáng ấm (ADD, nhấp nháy) cho asset có trong `LIGHT_SOURCES` (campfire, lamppost).
 * (x, y) là điểm đặt của prop (đáy sprite). Asset khác hoặc đã tắt không khí thì bỏ qua.
 * Độ sáng thay đổi theo ngày/đêm trong vòng cập nhật của `createAtmosphere`.
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

  let entries = lightRegistry.get(scene);

  if (!entries) {
    entries = [];
    lightRegistry.set(scene, entries);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      lightRegistry.delete(scene);
    });
  }

  const baseScale = (source.radius * 2) / LIGHT_TEXTURE_SIZE;
  const image = scene.add
    .image(x, y + source.offsetY, LIGHT_TEXTURE_KEY)
    .setTint(POINT_LIGHT.color)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setAlpha(source.alpha)
    .setScale(baseScale)
    .setDepth(ATMOSPHERE_DEPTH.light);

  entries.push({
    x,
    y: y + source.offsetY,
    clearRadius: source.fogClearRadius,
    image,
    baseAlpha: source.alpha,
    baseScale,
    phase: Math.random() * Math.PI * 2,
    periodMs: Phaser.Math.Between(POINT_LIGHT.flickerMinMs, POINT_LIGHT.flickerMaxMs),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Lớp không khí tổng: ambient + vignette + (đêm) bóng tối và sương
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tạo lớp ambient (MULTIPLY), vignette và lớp bóng tối + sương ban đêm, rồi cập nhật mỗi frame theo
 * chu kỳ ngày/đêm. Ban ngày sáng bình thường; ban đêm tối om, sương phủ kín và chỉ nhìn rõ trong
 * một vòng quanh `target` (người chơi) và quanh các ngọn lửa/đèn. Các đối tượng thuộc display list
 * của scene nên tự dọn khi scene shutdown.
 */
export function createAtmosphere(
  scene: Phaser.Scene,
  target: { x: number; y: number },
): void {
  const settings = getSettings();

  if (!settings.enabled) {
    return;
  }

  const startedAt = scene.time.now;
  const camera = scene.cameras.main;
  const ambient = scene.add
    .rectangle(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT, AMBIENT.color, 1)
    .setOrigin(0, 0)
    .setScrollFactor(0)
    .setBlendMode(Phaser.BlendModes.MULTIPLY)
    .setDepth(ATMOSPHERE_DEPTH.ambient);
  let vignette: Phaser.GameObjects.Image | null = null;

  if (settings.vignetteStrength > 0) {
    ensureVignetteTexture(scene, settings.vignetteStrength);
    vignette = scene.add
      .image(0, 0, VIGNETTE_TEXTURE_KEY)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(ATMOSPHERE_DEPTH.vignette);
  }

  // Lớp bóng tối + sương: vẽ vào RenderTexture mỗi frame (chỉ khi là đêm) rồi khoét lỗ.
  const specs = FOG.layers.slice(0, isTouchDevice() ? FOG.touchLayers : FOG.layers.length);
  let veil: Phaser.GameObjects.RenderTexture | null = null;
  let erasers: Phaser.GameObjects.Image[] = [];

  if (settings.fogMultiplier > 0) {
    ensureFogTexture(scene);
    ensureClearTexture(scene);
    veil = scene.add
      .renderTexture(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(ATMOSPHERE_DEPTH.fog)
      .setRenderMode('all')
      .setVisible(false);
    // Ảnh làm "cục tẩy" (không thêm vào display list); vị trí/kích thước đặt lại mỗi frame.
    erasers = Array.from({ length: FOG.maxClearings }, () =>
      new Phaser.GameObjects.Image(scene, 0, 0, FOG.clearTextureKey).setOrigin(0.5, 0.5),
    );
  }

  const drawVeil = (night: number, seconds: number): void => {
    if (!veil) {
      return;
    }

    // Ban ngày không vẽ gì (và không dồn lệnh vào RenderTexture khi nó không được render).
    if (night < 0.01) {
      veil.setVisible(false);

      return;
    }

    veil.setVisible(true);
    veil.clear();
    veil.fill(NIGHT.darknessColor, NIGHT.darknessAlpha * night);

    for (const spec of specs) {
      // `repeat` đọc cả alpha và tint từ config (xem DynamicTexture.repeat) dù kiểu khai báo chỉ nêu
      // TileSpriteConfig, nên truyền qua biến để tránh lỗi thuộc tính thừa.
      const repeatConfig = {
        alpha: Math.min(1, spec.alpha * settings.fogMultiplier * night),
        tint: FOG.color,
        tileScaleX: spec.tileScale,
        tileScaleY: spec.tileScale,
        tilePositionX: (camera.scrollX * spec.parallax + seconds * spec.speedX) / spec.tileScale,
        tilePositionY: (camera.scrollY * spec.parallax + seconds * spec.speedY) / spec.tileScale,
      };

      veil.repeat(FOG_TEXTURE_KEY, undefined, 0, 0, DESIGN_WIDTH, DESIGN_HEIGHT, repeatConfig);
    }

    let used = 0;
    const erase = (worldX: number, worldY: number, radius: number): void => {
      const screenX = worldX - camera.scrollX;
      const screenY = worldY - camera.scrollY;

      if (
        used >= erasers.length ||
        screenX + radius < 0 ||
        screenX - radius > DESIGN_WIDTH ||
        screenY + radius < 0 ||
        screenY - radius > DESIGN_HEIGHT
      ) {
        return;
      }

      const eraser = erasers[used];

      used += 1;
      eraser.setPosition(screenX, screenY).setScale((radius * 2) / CLEAR_TEXTURE_SIZE);
      veil.erase(eraser);
    };

    // Tầm nhìn quanh người chơi, rồi quanh từng ngọn lửa/đèn.
    erase(target.x, target.y, NIGHT.visionRadius);

    for (const light of lightRegistry.get(scene) ?? []) {
      erase(light.x, light.y, light.clearRadius);
    }
  };

  // Hệ số đêm đang hiển thị đuổi theo mục tiêu với tốc độ tối đa để đổi chế độ bằng tay không bị giật;
  // chu kỳ tự động đổi chậm hơn tốc độ này nên vẫn bám sát.
  let night = nightFactor(0, settings.time);
  const update = (_time: number, delta: number): void => {
    const now = scene.time.now;
    const target = nightFactor(now - startedAt, settings.time);
    const maxStep = delta / 1000 / DAY_NIGHT.manualEaseSeconds;

    night += Phaser.Math.Clamp(target - night, -maxStep, maxStep);
    currentNight = night;

    const seconds = now / 1000;
    const ambientAlpha = Phaser.Math.Linear(AMBIENT.dayAlpha, settings.ambientAlpha, night);

    ambient.setAlpha(ambientAlpha).setVisible(ambientAlpha > 0.002);
    vignette?.setAlpha(Phaser.Math.Linear(NIGHT.dayVignetteScale, 1, night));

    // Ánh sáng ấm yếu đi ban ngày, nhấp nháy ban đêm.
    const lightScale = Phaser.Math.Linear(NIGHT.dayLightScale, 1, night);

    for (const light of lightRegistry.get(scene) ?? []) {
      const wave = Math.sin((now / light.periodMs) * Math.PI * 2 + light.phase);
      const alpha =
        light.baseAlpha * lightScale * (1 - POINT_LIGHT.flickerAlpha * (0.5 - 0.5 * wave));

      light.image
        .setAlpha(alpha)
        .setVisible(alpha > 0.004)
        .setScale(light.baseScale * (1 + POINT_LIGHT.flickerScale * wave));
    }

    drawVeil(night, seconds);
  };

  update(0, 0);
  scene.events.on(Phaser.Scenes.Events.UPDATE, update);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.events.off(Phaser.Scenes.Events.UPDATE, update);

    for (const eraser of erasers) {
      eraser.destroy();
    }
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
