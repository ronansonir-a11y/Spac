import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { interceptPoint, PIDController, SeededRandom } from '../src/Core/math';

describe('intercept solver', () => {
  it('finds a stationary target intercept', () => {
    const point = interceptPoint(new THREE.Vector3(100, 0, 0), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), 50);
    expect(point?.distanceTo(new THREE.Vector3(100, 0, 0))).toBeLessThan(1e-8);
  });
  it('leads a crossing target and compensates shooter velocity', () => {
    const target = new THREE.Vector3(0, 100, -300), velocity = new THREE.Vector3(30, 0, 0);
    const point = interceptPoint(target, velocity, new THREE.Vector3(), new THREE.Vector3(10, 0, 0), 200);
    expect(point).not.toBeNull();
    expect(point!.x).toBeGreaterThan(0);
    expect(point!.z).toBe(-300);
  });
  it('rejects impossible interception', () => {
    expect(interceptPoint(new THREE.Vector3(100, 0, 0), new THREE.Vector3(200, 0, 0), new THREE.Vector3(), new THREE.Vector3(), 50)).toBeNull();
  });
});

describe('seed and PID determinism', () => {
  it('reproduces seeded sequences', () => {
    const a = new SeededRandom(42), b = new SeededRandom(42);
    expect(Array.from({ length: 20 }, () => a.next())).toEqual(Array.from({ length: 20 }, () => b.next()));
  });
  it('limits PID output', () => {
    const pid = new PIDController(2, 0.1, 0.2, 5);
    expect(pid.update(100, 1 / 60)).toBe(5);
    expect(pid.update(-100, 1 / 60)).toBe(-5);
  });
});
