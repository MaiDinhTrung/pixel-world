import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it, vi } from 'vitest';

// castleWall.ts chỉ dùng Phaser làm kiểu; spawnDust kéo VFXManager (Phaser thật) nên mô phỏng cả hai.
vi.mock('phaser', () => ({ default: {} }));
vi.mock('../utils/effects', () => ({ spawnDust: () => undefined }));

import { buildVillageWall, castleTextureKey } from './castleWall';

const BASE = { width: 120, height: 16, rise: 40, horizontal: true, lean: 0 } as const;

/** Đối tượng giả nhận mọi lời gọi phương thức (chuỗi được), đủ cho Graphics/Image/Zone trong castleWall. */
function chainable(): unknown {
  const target: Record<string | symbol, unknown> = { x: 0, y: 0 };
  const proxy: unknown = new Proxy(target, {
    get(obj, prop) {
      if (prop in obj) {
        return obj[prop];
      }

      return (...args: unknown[]) => {
        if (prop === 'setY' && typeof args[0] === 'number') {
          obj.y = args[0];
        }

        return proxy;
      };
    },
  });

  return proxy;
}

/** Scene giả: đếm số texture thật sự được tạo (generateTexture) qua nhiều lần dựng làng. */
function fakeScene(): { scene: unknown; created: string[]; textures: Set<string> } {
  const textures = new Set<string>();
  const created: string[] = [];
  const graphics = (): unknown => {
    const g = chainable() as Record<string, unknown>;

    return new Proxy(g, {
      get(obj, prop) {
        if (prop === 'generateTexture') {
          return (key: string) => {
            textures.add(key);
            created.push(key);
          };
        }

        return obj[prop as string];
      },
    });
  };
  const scene = {
    textures: { exists: (key: string) => textures.has(key) },
    add: {
      graphics,
      image: (x: number, y: number) => {
        const image = chainable() as Record<string, unknown>;

        image.x = x;
        image.y = y;

        return image;
      },
      zone: () => chainable(),
    },
    physics: { add: { existing: () => undefined } },
    tweens: { add: () => undefined },
    time: { delayedCall: () => undefined },
  };

  return { scene, created, textures };
}

describe('castleTextureKey (P3d D1)', () => {
  it('cùng hình học → cùng key, gọi lặp lại không sinh key mới', () => {
    const keys = new Set(Array.from({ length: 10 }, () => castleTextureKey({ ...BASE })));

    expect(keys.size).toBe(1);
  });

  it('khác bất kỳ một trong width/height/rise/horizontal/lean → khác key', () => {
    const base = castleTextureKey(BASE);
    const variants = [
      { ...BASE, width: 121 },
      { ...BASE, height: 17 },
      { ...BASE, rise: 41 },
      { ...BASE, horizontal: false },
      { ...BASE, lean: -1 as const },
      { ...BASE, lean: 1 as const },
      { ...BASE, width: 120.5 },
    ];
    const keys = variants.map((variant) => castleTextureKey(variant));

    for (const key of keys) {
      expect(key).not.toBe(base);
    }

    expect(new Set(keys).size).toBe(keys.length);
  });

  it('không phụ thuộc vị trí x/y', () => {
    expect(castleTextureKey({ ...BASE, x: 0, y: 0 } as typeof BASE)).toBe(
      castleTextureKey({ ...BASE, x: 999, y: -50 } as typeof BASE),
    );
  });

  it('dựng làng nhiều lần không tạo thêm texture (dùng lại texture có sẵn)', () => {
    const { scene, created, textures } = fakeScene();
    const obstacles = { add: () => undefined };

    buildVillageWall(scene as never, obstacles as never);
    const afterFirst = textures.size;

    expect(afterFirst).toBeGreaterThan(0);
    expect(created.length).toBe(afterFirst);

    buildVillageWall(scene as never, obstacles as never);
    buildVillageWall(scene as never, obstacles as never);

    expect(textures.size).toBe(afterFirst);
    expect(created.length).toBe(afterFirst);
  });

  it('nguồn không còn bộ đếm nextTextureId', () => {
    const text = readFileSync(fileURLToPath(new URL('./castleWall.ts', import.meta.url)), 'utf8');

    expect(text).not.toContain('nextTextureId');
    expect(text).toContain('scene.textures.exists(key)');
  });
});
