import { SeededRandom } from '../Core/math';

export interface Commodity { id: string; name: string; base: number; stock: number; }
export function createMarket(seed: number): Commodity[] {
  const random = new SeededRandom(seed);
  return [
    { id: 'ore', name: 'Ferrite ore', base: 24, stock: random.int(35, 150) },
    { id: 'titanium', name: 'Titanium', base: 76, stock: random.int(12, 80) },
    { id: 'opal', name: 'Void opal', base: 240, stock: random.int(0, 20) },
  ];
}
export function priceFor(item: Commodity): number { return Math.max(1, Math.round(item.base * (1.5 - item.stock / 200))); }
