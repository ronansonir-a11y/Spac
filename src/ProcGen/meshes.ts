import * as THREE from 'three';
import { SeededRandom } from '../Core/math';

const dark = new THREE.MeshStandardMaterial({ color: 0x101820, metalness: 0.85, roughness: 0.3 });
const trim = new THREE.MeshStandardMaterial({ color: 0x52616c, metalness: 0.9, roughness: 0.24 });

export function createShip(color = 0x55e6d5, enemy = false): THREE.Group {
  const ship = new THREE.Group();
  const hull = new THREE.MeshStandardMaterial({ color: enemy ? 0x302126 : 0x26343b, metalness: 0.82, roughness: 0.3 });
  const glow = new THREE.MeshBasicMaterial({ color, toneMapped: false });
  const body = new THREE.Mesh(new THREE.ConeGeometry(1.05, 5.8, 5), hull);
  body.rotation.x = -Math.PI / 2; body.position.z = -0.3; body.scale.set(1, 0.52, 1); ship.add(body);
  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.38, 4.8), trim); spine.position.set(0, 0.45, 0.1); ship.add(spine);
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 8), new THREE.MeshStandardMaterial({ color: 0x07141d, metalness: 0.7, roughness: 0.08, emissive: color, emissiveIntensity: 0.15 }));
  canopy.scale.set(0.75, 0.48, 1.5); canopy.position.set(0, 0.52, -0.75); ship.add(canopy);
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.14, 2.1), hull);
    wing.position.set(side * 1.55, -0.03, 0.75); wing.rotation.y = side * -0.22; ship.add(wing);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.045, 0.07), glow);
    edge.position.set(side * 1.75, 0.06, 1.64); edge.rotation.y = side * -0.22; ship.add(edge);
    const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.52, 1.65, 10), dark);
    engine.rotation.x = Math.PI / 2; engine.position.set(side * 1.55, 0, 1.2); ship.add(engine);
    const exhaust = new THREE.Mesh(new THREE.CircleGeometry(0.35, 12), glow);
    exhaust.position.set(side * 1.55, 0, 2.04); exhaust.rotation.y = Math.PI; ship.add(exhaust);
    const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.2, 6), trim);
    gun.rotation.x = Math.PI / 2; gun.position.set(side * 2.7, 0, -0.2); ship.add(gun);
  }
  ship.userData.radius = 2.8;
  return ship;
}

export function createAsteroidGeometry(seed = 1): THREE.BufferGeometry {
  const random = new SeededRandom(seed);
  const geometry = new THREE.IcosahedronGeometry(1, 1);
  const positions = geometry.attributes.position;
  const scales = new Map<string, number>();
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
    const key = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
    if (!scales.has(key)) scales.set(key, random.range(0.72, 1.25));
    const scale = scales.get(key)!;
    positions.setXYZ(i, x * scale, y * scale, z * scale);
  }
  geometry.computeVertexNormals();
  return geometry;
}

export function createStation(): THREE.Group {
  const station = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0x29343e, metalness: 0.85, roughness: 0.36 });
  const glow = new THREE.MeshBasicMaterial({ color: 0x4debd8, toneMapped: false });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(30, 3.2, 10, 48), metal); ring.rotation.y = Math.PI / 2; station.add(ring);
  const lightRing = new THREE.Mesh(new THREE.TorusGeometry(30, 0.24, 5, 64), glow); lightRing.rotation.y = Math.PI / 2; station.add(lightRing);
  const core = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 46, 12), metal); core.rotation.z = Math.PI / 2; station.add(core);
  for (let i = 0; i < 6; i++) {
    const angle = i / 6 * Math.PI * 2;
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(3, 25, 1.6), metal);
    spoke.position.set(0, Math.cos(angle) * 16, Math.sin(angle) * 16); spoke.rotation.x = angle; station.add(spoke);
  }
  for (const x of [-24, 24]) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(10, 7, 3, 12), metal); cap.rotation.z = Math.PI / 2; cap.position.x = x; station.add(cap);
  }
  station.userData.radius = 35;
  return station;
}

export function createStarfield(random: SeededRandom, count = 3500, radius = 18000): THREE.Points {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const direction = new THREE.Vector3(random.range(-1, 1), random.range(-1, 1), random.range(-1, 1)).normalize().multiplyScalar(random.range(radius * 0.5, radius));
    positions.set(direction.toArray(), i * 3);
    const c = new THREE.Color().setHSL(random.range(0.48, 0.68), random.range(0.05, 0.4), random.range(0.65, 1));
    colors.set(c.toArray(), i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return new THREE.Points(geometry, new THREE.PointsMaterial({ size: 9, sizeAttenuation: true, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false }));
}
