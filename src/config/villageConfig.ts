/** Dân làng trang trí: đứng yên, không tên, không tương tác (khác `VILLAGE_NPCS` trong economyConfig). */

export type VillagerPalette = Record<'h' | 'f' | 'e' | 'c' | 'b', string>;

export interface VillagerSpec {
  readonly id: string;
  readonly x: number; // chân dân làng
  readonly y: number;
  readonly palette: VillagerPalette;
}

export const VILLAGE_VILLAGERS: readonly VillagerSpec[] = [
  {
    id: 'a',
    x: 1830,
    y: 1195,
    palette: { h: '#3a3226', f: '#b89a7c', e: '#2a1f1a', c: '#5a5448', b: '#2a241c' },
  },
  {
    id: 'b',
    x: 1610,
    y: 1455,
    palette: { h: '#6a5a48', f: '#a88a6c', e: '#2a1f1a', c: '#4e4a56', b: '#2a2620' },
  },
  {
    id: 'c',
    x: 2420,
    y: 1518,
    palette: { h: '#8a8a82', f: '#c0a080', e: '#2a1f1a', c: '#6a4a3a', b: '#2a241c' },
  },
];
