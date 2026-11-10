import Phaser from 'phaser';

import { gameConfig } from './config/gameConfig';
import './style.css';

/**
 * Điểm khởi động duy nhất của game.
 * Mọi cấu hình engine nằm trong `config/gameConfig.ts`.
 */
new Phaser.Game(gameConfig);
