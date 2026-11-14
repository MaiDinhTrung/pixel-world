import Phaser from 'phaser';

import { TEXTURE_KEYS } from '../config/constants';

type EnemyAction = 'idle' | 'walk' | 'attack' | 'death';
type EnemyVisual = 'brute' | 'caster' | 'boss';

interface EnemySheetSpec {
  readonly key: string;
  readonly prefix: string;
  readonly visual: EnemyVisual;
  readonly size: number;
}

interface ActionSpec {
  readonly action: EnemyAction;
  readonly frames: number;
  readonly frameRate: number;
  readonly repeat: number;
}

const ACTION_SPECS: readonly ActionSpec[] = [
  { action: 'idle', frames: 2, frameRate: 4, repeat: -1 },
  { action: 'walk', frames: 4, frameRate: 9, repeat: -1 },
  { action: 'attack', frames: 2, frameRate: 10, repeat: 0 },
  { action: 'death', frames: 2, frameRate: 7, repeat: 0 },
];

const SHEETS: readonly EnemySheetSpec[] = [
  {
    key: TEXTURE_KEYS.enemy,
    prefix: TEXTURE_KEYS.enemy,
    visual: 'brute',
    size: 24,
  },
  {
    key: TEXTURE_KEYS.rangedEnemy,
    prefix: TEXTURE_KEYS.rangedEnemy,
    visual: 'caster',
    size: 24,
  },
  {
    key: TEXTURE_KEYS.boss,
    prefix: TEXTURE_KEYS.boss,
    visual: 'boss',
    size: 32,
  },
];

const BRUTE = {
  outline: '#100812',
  dark: '#3a2450',
  body: '#6b3f8a',
  light: '#a56bd4',
  metal: '#8d7aa8',
  cloth: '#7d1f3d',
  glow: '#ffe66d',
  white: '#fff6c2',
} as const;

const CASTER = {
  outline: '#100816',
  dark: '#2e1550',
  body: '#5a2a7a',
  light: '#a75fd8',
  trim: '#e6b3ff',
  glow: '#ff4fd8',
  white: '#fff0ff',
} as const;

const BOSS = {
  outline: '#12060b',
  cape: '#2a0a13',
  dark: '#4a0f1e',
  body: '#7c1734',
  light: '#c93b56',
  metal: '#625668',
  gold: '#ffd75e',
  glow: '#ff3b5c',
  white: '#ffe6b3',
} as const;

function px(
  context: CanvasRenderingContext2D,
  color: string,
  x: number,
  y: number,
  width = 1,
  height = 1,
): void {
  context.fillStyle = color;
  context.fillRect(x, y, width, height);
}

function shadow(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radiusX: number,
  radiusY: number,
): void {
  context.fillStyle = 'rgba(0, 0, 0, 0.3)';
  context.beginPath();
  context.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
  context.fill();
}

function drawBruteArm(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
): void {
  px(context, BRUTE.outline, x, y, 4, 7);
  px(context, BRUTE.body, x + 1, y + 1, 2, 5);
  px(context, BRUTE.light, x + 1, y + 1, 1, 2);
  px(context, BRUTE.outline, x, y + 6, 3, 2);
  px(context, BRUTE.white, x, y + 7, 1, 1);
}

function drawBruteLeg(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  lift: number,
): void {
  px(context, BRUTE.outline, x, y + lift, 4, 8);
  px(context, BRUTE.dark, x + 1, y + 1 + lift, 2, 5);
  px(context, BRUTE.metal, x - 1, y + 7 + lift, 6, 2);
  px(context, BRUTE.light, x - 1, y + 7 + lift, 2, 1);
}

function drawBrute(
  context: CanvasRenderingContext2D,
  action: EnemyAction,
  frame: number,
): void {
  const walking = action === 'walk';
  const attacking = action === 'attack';
  const step = walking ? [-2, 0, 2, 0][frame] : 0;
  const bob =
    walking
      ? frame % 2 === 0
        ? 0
        : 1
      : action === 'idle' && frame === 1
        ? 1
        : 0;
  const armSwing = walking ? [1, 0, -1, 0][frame] : 0;

  shadow(context, 12, 22.5, 7, 2);

  context.save();
  context.translate(attacking && frame === 1 ? 1 : 0, bob);

  drawBruteLeg(context, 6, 14, step > 0 ? 1 : 0);
  drawBruteLeg(context, 14, 14, step < 0 ? 1 : 0);

  // Cánh tay sau lưng, lắc theo nhịp bước.
  if (!attacking) {
    drawBruteArm(context, 1, 9 - armSwing);
    drawBruteArm(context, 19, 9 + armSwing);
  }

  // Thân hình gù, giáp vai và các vết sẹo.
  px(context, BRUTE.outline, 4, 6, 16, 11);
  px(context, BRUTE.body, 5, 7, 14, 9);
  px(context, BRUTE.dark, 5, 13, 14, 3);
  px(context, BRUTE.light, 6, 7, 3, 5);
  px(context, BRUTE.outline, 2, 7, 5, 6);
  px(context, BRUTE.dark, 3, 8, 3, 4);
  px(context, BRUTE.light, 3, 8, 2, 1);
  px(context, BRUTE.outline, 17, 7, 5, 6);
  px(context, BRUTE.dark, 18, 8, 3, 4);
  px(context, BRUTE.light, 20, 8, 1, 1);
  px(context, BRUTE.outline, 1, 5, 2, 3);
  px(context, BRUTE.metal, 1, 5, 1, 2);
  px(context, BRUTE.outline, 21, 5, 2, 3);
  px(context, BRUTE.metal, 22, 5, 1, 2);
  px(context, BRUTE.outline, 8, 11, 7, 1);
  px(context, BRUTE.outline, 9, 13, 5, 1);
  px(context, BRUTE.cloth, 8, 15, 8, 3);
  px(context, BRUTE.outline, 9, 18, 6, 1);

  // Đầu, sừng và mắt phát sáng.
  px(context, BRUTE.outline, 8, 1, 8, 8);
  px(context, BRUTE.body, 9, 2, 6, 6);
  px(context, BRUTE.light, 9, 2, 2, 2);
  px(context, BRUTE.outline, 6, 1, 2, 3);
  px(context, BRUTE.metal, 6, 1, 1, 2);
  px(context, BRUTE.outline, 16, 1, 2, 3);
  px(context, BRUTE.metal, 17, 1, 1, 2);
  px(context, BRUTE.glow, 10, 5, 1, 1);
  px(context, BRUTE.glow, 13, 5, 1, 1);
  px(context, BRUTE.white, 10, 7, 1, 1);
  px(context, BRUTE.white, 13, 7, 1, 1);

  if (attacking) {
    const reach = frame === 0 ? 1 : 2;

    px(context, BRUTE.outline, 0, 11, 5 + reach, 3);
    px(context, BRUTE.body, 1, 11, 4, 2);
    px(context, BRUTE.white, 0, 12, 1, 1);
    px(context, BRUTE.white, 2, 12, 1, 1);
    px(context, BRUTE.outline, 19 - reach, 11, 5 + reach, 3);
    px(context, BRUTE.body, 19 - reach, 11, 4, 2);
    px(context, BRUTE.white, 22, 12, 1, 1);
    px(context, BRUTE.white, 20, 12, 1, 1);
    px(context, BRUTE.outline, 9, 6, 6, 2);
    px(context, BRUTE.glow, 10, 6, 4, 1);
  }

  context.restore();
}

function drawBruteDeath(
  context: CanvasRenderingContext2D,
  frame: number,
): void {
  shadow(context, 12, 22.5, 8, 2.2);

  if (frame === 0) {
    px(context, BRUTE.outline, 7, 14, 10, 7);
    px(context, BRUTE.body, 8, 15, 8, 5);
    px(context, BRUTE.dark, 8, 19, 8, 2);
    px(context, BRUTE.outline, 8, 11, 8, 6);
    px(context, BRUTE.body, 9, 12, 6, 4);
    px(context, BRUTE.outline, 5, 18, 6, 3);
    px(context, BRUTE.dark, 6, 18, 4, 1);
    px(context, BRUTE.outline, 14, 18, 6, 3);
    px(context, BRUTE.dark, 14, 18, 4, 1);
    px(context, BRUTE.glow, 10, 13, 1, 1);
    px(context, BRUTE.glow, 14, 13, 1, 1);
    return;
  }

  px(context, BRUTE.outline, 3, 17, 18, 5);
  px(context, BRUTE.body, 4, 18, 16, 3);
  px(context, BRUTE.dark, 5, 21, 14, 1);
  px(context, BRUTE.outline, 7, 14, 7, 5);
  px(context, BRUTE.body, 8, 15, 5, 3);
  px(context, BRUTE.outline, 5, 20, 4, 2);
  px(context, BRUTE.outline, 16, 20, 4, 2);
  px(context, BRUTE.outline, 2, 17, 3, 2);
  px(context, BRUTE.outline, 20, 17, 3, 2);
  px(context, BRUTE.metal, 9, 12, 2, 2);
  px(context, BRUTE.metal, 14, 12, 2, 2);
  px(context, BRUTE.glow, 11, 17, 1, 1);
  px(context, BRUTE.glow, 14, 17, 1, 1);
}

function drawOrb(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
): void {
  px(context, CASTER.outline, x - 1, y - 1, size + 2, size + 2);
  px(context, CASTER.glow, x, y, size, size);
  px(context, CASTER.white, x + 1, y + 1, Math.max(1, size - 2), Math.max(1, size - 2));
}

function drawCaster(
  context: CanvasRenderingContext2D,
  action: EnemyAction,
  frame: number,
): void {
  const walking = action === 'walk';
  const attacking = action === 'attack';
  const bob =
    action === 'idle'
      ? frame === 1
        ? -1
        : 0
      : walking
        ? frame % 2 === 0
          ? 0
          : -1
        : 0;
  const sway = walking ? [-1, 0, 1, 0][frame] : 0;

  shadow(context, 12, 22.5, 6, 2);

  context.save();
  context.translate(sway, bob);

  // Áo choàng dài, gấu áo rách và dải thắt lưng phát sáng.
  px(context, CASTER.outline, 8, 9, 8, 8);
  px(context, CASTER.outline, 7, 13, 10, 4);
  px(context, CASTER.outline, 6, 16, 12, 3);
  px(context, CASTER.body, 9, 10, 6, 7);
  px(context, CASTER.body, 8, 14, 8, 4);
  px(context, CASTER.body, 7, 17, 10, 2);
  px(context, CASTER.dark, 14, 11, 2, 7);
  px(context, CASTER.light, 8, 10, 2, 5);
  px(context, CASTER.light, 7, 14, 2, 2);
  px(context, CASTER.dark, 7, 19, 10, 1);
  px(context, CASTER.outline, 7, 20, 2, 1);
  px(context, CASTER.outline, 11, 20, 2, 1);
  px(context, CASTER.outline, 15, 20, 1, 1);
  px(context, CASTER.trim, 8, 14, 8, 1);
  px(context, CASTER.glow, 11, 14, 2, 1);

  // Mũ trùm và gương mặt bóng tối với đôi mắt magenta.
  px(context, CASTER.outline, 11, 1, 3, 3);
  px(context, CASTER.dark, 11, 2, 2, 2);
  px(context, CASTER.outline, 8, 3, 8, 7);
  px(context, CASTER.dark, 9, 4, 6, 5);
  px(context, CASTER.body, 9, 3, 3, 2);
  px(context, CASTER.outline, 10, 6, 4, 3);
  px(context, CASTER.glow, 10, 7, 1, 1);
  px(context, CASTER.glow, 13, 7, 1, 1);

  // Tay áo, bàn tay và quả cầu phép.
  const armY = attacking ? 10 : 12;

  px(context, CASTER.outline, 3, armY, 5, 3);
  px(context, CASTER.body, 4, armY, 4, 2);
  px(context, CASTER.light, 4, armY, 1, 1);
  px(context, CASTER.outline, 16, armY, 5, 3);
  px(context, CASTER.body, 16, armY, 4, 2);
  px(context, CASTER.light, 19, armY, 1, 1);
  px(context, CASTER.trim, 7, armY + 2, 2, 2);
  px(context, CASTER.trim, 15, armY + 2, 2, 2);

  if (attacking) {
    const size = frame === 0 ? 4 : 5;
    drawOrb(context, 11 - Math.floor(size / 2), 9, size);
    px(context, CASTER.glow, 4, 8, 1, 1);
    px(context, CASTER.glow, 19, 9, 1, 1);
  } else {
    drawOrb(context, 10, 13, 3);
    px(context, CASTER.glow, 3, 10, 1, 1);
    px(context, CASTER.light, 20, 16, 1, 1);
  }

  context.restore();
}

function drawCasterDeath(
  context: CanvasRenderingContext2D,
  frame: number,
): void {
  shadow(context, 12, 22.5, 7, 2.2);

  if (frame === 0) {
    px(context, CASTER.outline, 8, 13, 8, 8);
    px(context, CASTER.body, 9, 14, 6, 6);
    px(context, CASTER.dark, 8, 19, 8, 1);
    px(context, CASTER.outline, 9, 9, 6, 5);
    px(context, CASTER.dark, 10, 10, 4, 3);
    px(context, CASTER.glow, 10, 11, 1, 1);
    px(context, CASTER.glow, 13, 11, 1, 1);
    px(context, CASTER.outline, 4, 17, 5, 3);
    px(context, CASTER.outline, 15, 17, 5, 3);
    return;
  }

  px(context, CASTER.outline, 4, 18, 16, 4);
  px(context, CASTER.dark, 5, 19, 14, 2);
  px(context, CASTER.body, 6, 18, 12, 2);
  px(context, CASTER.outline, 8, 15, 6, 4);
  px(context, CASTER.dark, 9, 16, 4, 2);
  px(context, CASTER.outline, 2, 19, 4, 2);
  px(context, CASTER.outline, 18, 19, 4, 2);
  px(context, CASTER.dark, 11, 17, 2, 1);
}

function drawBossLeg(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  lift: number,
): void {
  px(context, BOSS.outline, x, y + lift, 5, 7);
  px(context, BOSS.dark, x + 1, y + 1 + lift, 3, 5);
  px(context, BOSS.metal, x, y + 6 + lift, 6, 2);
  px(context, BOSS.gold, x, y + 6 + lift, 1, 1);
  px(context, BOSS.outline, x - 1, y + 7 + lift, 2, 1);
  px(context, BOSS.outline, x + 4, y + 7 + lift, 2, 1);
}

function drawBossArm(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  raised: boolean,
): void {
  px(context, BOSS.outline, x, y, 6, 9);
  px(context, BOSS.body, x + 1, y + 1, 4, 6);
  px(context, BOSS.light, x + 1, y + 1, 1, 2);
  px(context, BOSS.dark, x + 1, y + 6, 4, 2);

  if (raised) {
    px(context, BOSS.outline, x - 1, y - 3, 3, 4);
    px(context, BOSS.white, x - 1, y - 3, 1, 2);
    px(context, BOSS.outline, x + 4, y - 2, 3, 3);
    px(context, BOSS.white, x + 5, y - 2, 1, 2);
  } else {
    px(context, BOSS.outline, x - 1, y + 8, 4, 2);
    px(context, BOSS.white, x - 1, y + 9, 1, 1);
    px(context, BOSS.outline, x + 4, y + 8, 3, 2);
  }
}

function drawBoss(
  context: CanvasRenderingContext2D,
  action: EnemyAction,
  frame: number,
): void {
  const walking = action === 'walk';
  const attacking = action === 'attack';
  const step = walking ? [-1, 0, 1, 0][frame] : 0;
  const bob =
    walking
      ? frame % 2 === 0
        ? 0
        : 1
      : action === 'idle' && frame === 1
        ? 1
        : 0;
  const armLift = walking ? [1, 0, -1, 0][frame] : 0;

  shadow(context, 16, 30, 11, 3);

  context.save();
  context.translate(0, bob);

  // Áo choàng đỏ thẫm phía sau.
  px(context, BOSS.cape, 9, 9, 14, 19);
  px(context, BOSS.dark, 7, 14, 18, 13);
  px(context, BOSS.cape, 6, 20, 20, 7);
  px(context, BOSS.outline, 6, 27, 20, 1);

  drawBossLeg(context, 9, 22, step > 0 ? 1 : 0);
  drawBossLeg(context, 19, 22, step < 0 ? 1 : 0);

  if (!attacking) {
    drawBossArm(context, 1, 14 - armLift, false);
    drawBossArm(context, 25, 14 + armLift, false);
  }

  // Thân giáp khổng lồ, vệt sáng và rune giữa ngực.
  px(context, BOSS.outline, 6, 9, 20, 15);
  px(context, BOSS.body, 7, 10, 18, 13);
  px(context, BOSS.dark, 7, 18, 18, 5);
  px(context, BOSS.light, 8, 11, 4, 5);
  px(context, BOSS.metal, 11, 13, 10, 6);
  px(context, BOSS.gold, 12, 14, 1, 4);
  px(context, BOSS.gold, 19, 14, 1, 4);
  px(context, BOSS.glow, 15, 15, 2, 3);
  px(context, BOSS.white, 16, 16, 1, 1);
  px(context, BOSS.outline, 7, 22, 18, 1);
  px(context, BOSS.gold, 11, 22, 2, 1);
  px(context, BOSS.gold, 19, 22, 2, 1);

  // Giáp vai và gai.
  px(context, BOSS.outline, 2, 10, 7, 7);
  px(context, BOSS.metal, 3, 11, 5, 5);
  px(context, BOSS.light, 3, 11, 2, 1);
  px(context, BOSS.outline, 23, 10, 7, 7);
  px(context, BOSS.metal, 24, 11, 5, 5);
  px(context, BOSS.light, 27, 11, 1, 1);
  px(context, BOSS.outline, 1, 7, 2, 4);
  px(context, BOSS.white, 1, 7, 1, 2);
  px(context, BOSS.outline, 29, 7, 2, 4);
  px(context, BOSS.white, 30, 7, 1, 2);

  // Đầu, vương miện, sừng và mắt.
  px(context, BOSS.outline, 12, 3, 8, 9);
  px(context, BOSS.body, 13, 4, 6, 7);
  px(context, BOSS.light, 13, 4, 2, 2);
  px(context, BOSS.outline, 10, 1, 3, 5);
  px(context, BOSS.light, 11, 1, 1, 2);
  px(context, BOSS.outline, 19, 1, 3, 5);
  px(context, BOSS.light, 20, 1, 1, 2);
  px(context, BOSS.gold, 14, 1, 1, 2);
  px(context, BOSS.gold, 17, 1, 1, 2);
  px(context, BOSS.glow, 14, 6, 1, 1);
  px(context, BOSS.glow, 18, 6, 1, 1);
  px(context, BOSS.outline, 15, 9, 3, 1);

  if (attacking) {
    drawBossArm(context, 0, 9, true);
    drawBossArm(context, 26, 9, true);
    px(context, BOSS.glow, 14, 9, 4, 1);
    px(context, BOSS.white, 15, 9, 2, 1);
    px(context, BOSS.glow, 14, 15, 4, 4);
    px(context, BOSS.white, 15, 16, 2, 2);
  }

  context.restore();
}

function drawBossDeath(
  context: CanvasRenderingContext2D,
  frame: number,
): void {
  shadow(context, 16, 30, 12, 3.2);

  if (frame === 0) {
    px(context, BOSS.outline, 9, 14, 14, 13);
    px(context, BOSS.body, 10, 15, 12, 11);
    px(context, BOSS.dark, 8, 19, 16, 7);
    px(context, BOSS.outline, 12, 9, 8, 8);
    px(context, BOSS.body, 13, 10, 6, 6);
    px(context, BOSS.glow, 14, 12, 1, 1);
    px(context, BOSS.glow, 18, 12, 1, 1);
    px(context, BOSS.outline, 4, 22, 8, 4);
    px(context, BOSS.outline, 20, 22, 8, 4);
    px(context, BOSS.gold, 10, 7, 2, 2);
    px(context, BOSS.gold, 20, 7, 2, 2);
    return;
  }

  px(context, BOSS.outline, 3, 22, 26, 7);
  px(context, BOSS.body, 4, 23, 24, 5);
  px(context, BOSS.dark, 5, 27, 22, 1);
  px(context, BOSS.cape, 2, 25, 28, 4);
  px(context, BOSS.outline, 11, 18, 10, 6);
  px(context, BOSS.body, 12, 19, 8, 4);
  px(context, BOSS.dark, 6, 21, 6, 3);
  px(context, BOSS.dark, 21, 21, 6, 3);
  px(context, BOSS.gold, 12, 16, 2, 2);
  px(context, BOSS.gold, 20, 16, 2, 2);
  px(context, BOSS.glow, 13, 24, 1, 1);
  px(context, BOSS.glow, 18, 24, 1, 1);
  px(context, BOSS.white, 5, 25, 2, 1);
  px(context, BOSS.white, 25, 25, 2, 1);
}

function drawEnemyFrame(
  context: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  visual: EnemyVisual,
  action: EnemyAction,
  frame: number,
): void {
  context.save();
  context.translate(originX, originY);
  context.imageSmoothingEnabled = false;

  if (visual === 'brute') {
    if (action === 'death') {
      drawBruteDeath(context, frame);
    } else {
      drawBrute(context, action, frame);
    }
  } else if (visual === 'caster') {
    if (action === 'death') {
      drawCasterDeath(context, frame);
    } else {
      drawCaster(context, action, frame);
    }
  } else if (action === 'death') {
    drawBossDeath(context, frame);
  } else {
    drawBoss(context, action, frame);
  }

  context.restore();
}

function createEnemyAnimations(
  scene: Phaser.Scene,
  spec: EnemySheetSpec,
): void {
  for (const actionSpec of ACTION_SPECS) {
    const key = `${spec.prefix}-${actionSpec.action}`;

    if (scene.anims.exists(key)) {
      continue;
    }

    const frames = Array.from(
      { length: actionSpec.frames },
      (_, index) => ({
        key: spec.key,
        frame: `${spec.prefix}-${actionSpec.action}-${index}`,
      }),
    );
    const frameRate =
      spec.visual === 'boss'
        ? Math.max(3, Math.round(actionSpec.frameRate * 0.7))
        : actionSpec.frameRate;

    scene.anims.create({
      key,
      frames,
      frameRate,
      repeat: actionSpec.repeat,
    });
  }
}

/** Sinh spritesheet nhiều khung hình cho quái và boss. */
export function createEnemySpriteSheets(scene: Phaser.Scene): void {
  for (const spec of SHEETS) {
    if (!scene.textures.exists(spec.key)) {
      const totalFrames = ACTION_SPECS.reduce(
        (total, action) => total + action.frames,
        0,
      );
      const texture = scene.textures.createCanvas(
        spec.key,
        spec.size * totalFrames,
        spec.size,
      );

      if (!texture) {
        continue;
      }

      const context = texture.getContext();
      context.imageSmoothingEnabled = false;
      let frameIndex = 0;

      for (const actionSpec of ACTION_SPECS) {
        for (let frame = 0; frame < actionSpec.frames; frame += 1) {
          const x = frameIndex * spec.size;

          drawEnemyFrame(
            context,
            x,
            0,
            spec.visual,
            actionSpec.action,
            frame,
          );
          texture.add(
            `${spec.prefix}-${actionSpec.action}-${frame}`,
            0,
            x,
            0,
            spec.size,
            spec.size,
          );
          frameIndex += 1;
        }
      }

      texture.refresh();
    }

    createEnemyAnimations(scene, spec);
  }
}
