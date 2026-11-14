import Phaser from 'phaser';

/**
 * Độ cao hiển thị cho quái (không đổi x/y nên hitbox/va chạm giữ nguyên).
 * Cùng nguyên lý với `Player.setVisualLift`: dời origin lên và bù `body.offset`
 * để Body.position không đổi.
 */
interface LiftState {
  baseOriginY: number;
  baseOffsetY: number;
}

const lifted = new WeakMap<Phaser.GameObjects.GameObject, LiftState>();

export function isLifted(sprite: Phaser.GameObjects.GameObject): boolean {
  return lifted.has(sprite);
}

export function setSpriteLift(
  sprite: Phaser.Physics.Arcade.Sprite,
  height: number,
): void {
  let state = lifted.get(sprite);

  if (!state) {
    if (height === 0) {
      return;
    }

    const body = sprite.body;

    state = {
      baseOriginY: sprite.originY,
      baseOffsetY: body instanceof Phaser.Physics.Arcade.Body ? body.offset.y : 0,
    };
    lifted.set(sprite, state);
  }

  const scaleY = Math.abs(sprite.scaleY) || 1;
  const localLift = Math.round(height) / scaleY;

  sprite.setOrigin(sprite.originX, state.baseOriginY + localLift / sprite.height);

  const body = sprite.body;

  if (body instanceof Phaser.Physics.Arcade.Body) {
    body.offset.y = state.baseOffsetY + localLift;
  }

  if (height === 0) {
    lifted.delete(sprite);
  }
}

/**
 * Hất quái lên rồi rơi xuống (parabol) chỉ ở lớp hiển thị. Dùng một tween trên
 * object tạm; tự dọn nếu quái chết/biến mất giữa chừng.
 */
export function launchSprite(
  scene: Phaser.Scene,
  sprite: Phaser.Physics.Arcade.Sprite,
  height: number,
  durationMs: number,
): void {
  if (isLifted(sprite)) {
    return;
  }

  const holder = { t: 0 };
  const finish = (): void => {
    if (sprite.active) {
      setSpriteLift(sprite, 0);
    } else {
      lifted.delete(sprite);
    }
  };

  scene.tweens.add({
    targets: holder,
    t: 1,
    duration: durationMs,
    ease: 'Linear',
    onUpdate: (tween) => {
      if (!sprite.active) {
        tween.stop();
        finish();
        return;
      }

      const t = holder.t;

      setSpriteLift(sprite, height * 4 * t * (1 - t));
    },
    onComplete: finish,
    onStop: finish,
  });
}
