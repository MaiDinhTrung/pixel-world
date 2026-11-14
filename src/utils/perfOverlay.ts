import Phaser from 'phaser';

/**
 * Bảng đo hiệu năng, chỉ bật khi URL có `?perf`.
 * Hiện: FPS, frame time (trung bình / lớn nhất), số frame > 24 ms trong cửa sổ 5 s,
 * số bước vật lý của frame, số object active và heap JS (Chrome).
 * Dùng để so sánh trước/sau khi sửa rung hình, đặc biệt trên màn 90/120 Hz.
 */
const WINDOW_MS = 5000;
const SPIKE_MS = 24;

export function isPerfOverlayEnabled(): boolean {
  try {
    return new URLSearchParams(window.location.search).has('perf');
  } catch {
    return false;
  }
}

export class PerfOverlay {
  private readonly text: Phaser.GameObjects.Text;
  private frames = 0;
  private sum = 0;
  private max = 0;
  private spikes = 0;
  private windowStart = 0;
  private lastSteps = 0;
  private stepsSeen = new Set<number>();

  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.text = scene.add
      .text(4, 4, '', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#7dff9a',
        backgroundColor: '#000000aa',
      })
      .setScrollFactor(0)
      .setDepth(10000);
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.sample, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.sample, this);
    });
  }

  private sample(time: number, delta: number): void {
    this.frames += 1;
    this.sum += delta;
    this.max = Math.max(this.max, delta);

    if (delta > SPIKE_MS) {
      this.spikes += 1;
    }

    const arcade = this.scene.physics?.world;

    if (arcade) {
      this.lastSteps = arcade.stepsLastFrame;
      this.stepsSeen.add(arcade.stepsLastFrame);
    }

    if (this.windowStart === 0) {
      this.windowStart = time;
    }

    if (time - this.windowStart < WINDOW_MS) {
      return;
    }

    const loop = this.scene.game.loop;
    const heap = (performance as unknown as {
      memory?: { usedJSHeapSize: number };
    }).memory;
    const heapMb = heap ? `${(heap.usedJSHeapSize / 1048576).toFixed(1)}MB` : 'n/a';
    const children = this.scene.children.list.length;

    this.text.setText(
      [
        `fps ${loop.actualFps.toFixed(1)}  (target ${loop.targetFps})`,
        `dt avg ${(this.sum / this.frames).toFixed(1)} max ${this.max.toFixed(1)} ms`,
        `spike>${SPIKE_MS}ms: ${this.spikes}/${this.frames}`,
        `phys steps: ${[...this.stepsSeen].join(',')} (last ${this.lastSteps})`,
        `objects ${children}  heap ${heapMb}`,
      ].join('\n'),
    );

    this.frames = 0;
    this.sum = 0;
    this.max = 0;
    this.spikes = 0;
    this.stepsSeen.clear();
    this.windowStart = time;
  }
}
