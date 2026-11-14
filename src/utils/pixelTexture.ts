import Phaser from 'phaser';

type Palette = Readonly<Record<string, string>>;

/**
 * Sinh texture pixel art từ mảng chuỗi ký tự.
 *
 * Mỗi ký tự tương ứng một "pixel"; ký tự không có trong palette (vd. '.')
 * được để trong suốt. Texture chỉ được tạo một lần cho mỗi key.
 */
export function createPixelTexture(
  scene: Phaser.Scene,
  key: string,
  rows: readonly string[],
  palette: Palette,
  pixelSize = 1,
): void {
  if (scene.textures.exists(key)) {
    return;
  }

  const height = rows.length;
  const width = Math.max(...rows.map((row) => row.length));
  const graphics = scene.make.graphics({}, false);

  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x += 1) {
      const color = palette[row[x]];

      if (!color) {
        continue;
      }

      graphics.fillStyle(Phaser.Display.Color.HexStringToColor(color).color, 1);
      graphics.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
    }
  });

  graphics.generateTexture(key, width * pixelSize, height * pixelSize);
  graphics.destroy();
}
