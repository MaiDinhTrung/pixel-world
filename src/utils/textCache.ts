import type Phaser from 'phaser';

const lastColor = new WeakMap<Phaser.GameObjects.Text, string>();

/**
 * `Text.setColor` luôn vẽ lại canvas của Text rồi upload lên GPU, kể cả khi
 * màu không đổi. HUD gọi hàm này mỗi frame nên chỉ đổi khi thực sự khác.
 */
export function setTextColor(
  text: Phaser.GameObjects.Text,
  color: string,
): void {
  if (lastColor.get(text) === color) {
    return;
  }

  lastColor.set(text, color);
  text.setColor(color);
}

const lastValue = new WeakMap<Phaser.GameObjects.Text, string>();

/**
 * `Text.setText` cũng vẽ lại canvas rồi upload GPU; chỉ gọi khi chuỗi thật sự đổi.
 */
export function setTextValue(
  text: Phaser.GameObjects.Text,
  value: string,
): void {
  if (lastValue.get(text) === value) {
    return;
  }

  lastValue.set(text, value);
  text.setText(value);
}
