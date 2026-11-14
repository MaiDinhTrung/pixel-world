import { BUFFS, getBuffById, SYNERGIES } from './buffCatalog';
import type {
  BuffDefinition,
  CombatStats,
  LevelUpChoice,
  SynergyDefinition,
} from './buffTypes';
import { createBaseStats } from './buffTypes';

export interface AcquireResult {
  definition: BuffDefinition;
  stacks: number;
  newSynergies: SynergyDefinition[];
}

/**
 * Nguồn sự thật duy nhất của buff trong một run.
 * Mỗi khi có buff mới, toàn bộ CombatStats được tính lại từ đầu
 * (buff trước, synergy sau) để tránh cộng dồn sai.
 */
export class BuffManager {
  private readonly stacks = new Map<string, number>();
  private stats: CombatStats = createBaseStats();
  private activeSynergies: SynergyDefinition[] = [];

  /** Rút ngẫu nhiên các buff còn có thể nâng cấp, không trùng nhau. */
  rollChoices(count: number): BuffDefinition[] {
    const eligible = BUFFS.filter(
      (buff) => (this.stacks.get(buff.id) ?? 0) < buff.maxStacks,
    );
    const shuffled = [...eligible];

    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const temporary = shuffled[i];

      shuffled[i] = shuffled[j];
      shuffled[j] = temporary;
    }

    return shuffled.slice(0, count);
  }

  acquire(buffId: string): AcquireResult | null {
    const definition = getBuffById(buffId);

    if (!definition) {
      return null;
    }

    const current = this.stacks.get(buffId) ?? 0;

    if (current >= definition.maxStacks) {
      return null;
    }

    const previousSynergyIds = new Set(
      this.activeSynergies.map((synergy) => synergy.id),
    );

    this.stacks.set(buffId, current + 1);
    this.recompute();

    const newSynergies = this.activeSynergies.filter(
      (synergy) => !previousSynergyIds.has(synergy.id),
    );

    return {
      definition,
      stacks: current + 1,
      newSynergies,
    };
  }

  getStacks(buffId: string): number {
    return this.stacks.get(buffId) ?? 0;
  }

  getStats(): Readonly<CombatStats> {
    return this.stats;
  }

  getActiveSynergies(): readonly SynergyDefinition[] {
    return this.activeSynergies;
  }

  toChoice(definition: BuffDefinition): LevelUpChoice {
    return {
      id: definition.id,
      name: definition.name,
      description: definition.description,
      tags: definition.tags,
      rarity: definition.rarity,
      stacks: this.getStacks(definition.id),
      maxStacks: definition.maxStacks,
    };
  }

  private recompute(): void {
    const stats = createBaseStats();

    for (const [buffId, count] of this.stacks) {
      const definition = getBuffById(buffId);

      if (!definition) {
        continue;
      }

      for (let i = 0; i < count; i += 1) {
        definition.apply(stats);
      }
    }

    const synergies = SYNERGIES.filter((synergy) =>
      synergy.requiredBuffIds.every((buffId) => (this.stacks.get(buffId) ?? 0) > 0),
    );

    for (const synergy of synergies) {
      synergy.apply(stats);
    }

    this.stats = stats;
    this.activeSynergies = synergies;
  }
}
