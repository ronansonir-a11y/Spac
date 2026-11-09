import { SeededRandom } from '../Core/math';

export interface PlanetData { name: string; radius: number; orbit: number; angle: number; color: number; atmosphere: number; }
export interface SectorData { seed: number; name: string; threat: number; planets: PlanetData[]; asteroidCount: number; enemyCount: number; }

const NAMES = ['KEPLER', 'HELIOS', 'NEREID', 'CYGNUS', 'VESPER', 'ORPHEUS', 'LYRA', 'TALOS', 'EREBUS', 'HALCYON'];
const SUFFIX = ['REACH', 'DRIFT', 'EXPANSE', 'RIFT', 'VERGE', 'DEEP'];

export function generateGalaxy(seed = 0xa37e6): SectorData[] {
  return Array.from({ length: 50 }, (_, index) => generateSector(seed + index * 7919, index));
}

export function generateSector(seed: number, index = 0): SectorData {
  const random = new SeededRandom(seed);
  const name = `${random.pick(NAMES)}-${String(index + 1).padStart(2, '0')}`;
  const planets = Array.from({ length: random.int(3, 8) }, (_, planet): PlanetData => ({
    name: `${name} ${planet + 1}`,
    radius: random.range(100, 390),
    orbit: random.range(1500, 7500),
    angle: random.range(0, Math.PI * 2),
    color: random.pick([0x447f86, 0x87654b, 0x4a567c, 0x806b8d, 0x6f7951]),
    atmosphere: random.pick([0x65d8ff, 0xffb16b, 0x9988ff]),
  }));
  return { seed, name: `${name} ${random.pick(SUFFIX)}`, threat: Math.min(5, 1 + Math.floor(index / 8)), planets, asteroidCount: 1600, enemyCount: Math.min(12, 5 + Math.floor(index / 5)) };
}
