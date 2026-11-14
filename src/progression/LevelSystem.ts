import { XP_BASE, XP_GROWTH } from './progressionConfig';

export interface LevelState {
  level: number;
  xp: number;
  xpToNext: number;
}

/** Theo dõi level và XP; có thể khôi phục từ save của nhân vật. */
export class LevelSystem {
  private level = 1;
  private xp = 0;
  private xpToNext = XP_BASE;

  constructor(state?: LevelState) {
    if (state) {
      this.level = Math.max(1, Math.floor(state.level));
      this.xp = Math.max(0, state.xp);
      this.xpToNext = Math.max(1, state.xpToNext);
    }
  }

  /** Cộng XP; trả về số level đã tăng. */
  addXp(amount: number): number {
    this.xp += amount;
    let levelsGained = 0;

    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level += 1;
      this.xpToNext = Math.round(this.xpToNext * XP_GROWTH);
      levelsGained += 1;
    }

    return levelsGained;
  }

  getLevel(): number {
    return this.level;
  }

  getXp(): number {
    return this.xp;
  }

  getXpToNext(): number {
    return this.xpToNext;
  }

  getState(): LevelState {
    return {
      level: this.level,
      xp: this.xp,
      xpToNext: this.xpToNext,
    };
  }
}
