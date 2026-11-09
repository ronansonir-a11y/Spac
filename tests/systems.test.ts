import { describe, expect, it } from 'vitest';
import { ObjectPool } from '../src/Core/ObjectPool';
import { generateGalaxy, generateSector } from '../src/ProcGen/galaxy';
import { createMarket, priceFor } from '../src/Economy/market';

describe('object pooling and procedural systems', () => {
  it('never allocates beyond pool capacity and recycles released objects', () => {
    let allocations = 0;
    const pool = new ObjectPool(500, () => ({ id: allocations++ }));
    const objects = Array.from({ length: 500 }, () => pool.acquire());
    expect(allocations).toBe(500);
    expect(pool.acquire()).toBeNull();
    pool.release(objects[200]!);
    expect(pool.acquire()).toBe(objects[200]);
    expect(allocations).toBe(500);
    pool.releaseAll(); expect(pool.active.size).toBe(0);
  });
  it('generates 50 deterministic, bounded star systems', () => {
    const galaxy = generateGalaxy();
    expect(galaxy).toHaveLength(50);
    expect(galaxy).toEqual(generateGalaxy());
    for (const sector of galaxy) {
      expect(sector.planets.length).toBeGreaterThanOrEqual(3);
      expect(sector.planets.length).toBeLessThanOrEqual(8);
      expect(sector.enemyCount).toBeLessThanOrEqual(12);
    }
  });
  it('uses seed-stable, positive dynamic market prices', () => {
    const market = createMarket(77);
    expect(market).toEqual(createMarket(77));
    market.forEach((item) => expect(priceFor(item)).toBeGreaterThan(0));
    expect(generateSector(77)).toEqual(generateSector(77));
  });
});
