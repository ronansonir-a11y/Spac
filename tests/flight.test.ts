import { describe, expect, it } from 'vitest';
import { FlightModel, type FlightInput } from '../src/Physics/FlightModel';

const neutral: FlightInput = { strafe: 0, lift: 0, thrust: 0, pitch: 0, yaw: 0, roll: 0, boost: false };

describe('6DoF flight model', () => {
  it('accelerates forward and brakes with flight assist', () => {
    const ship = new FlightModel();
    for (let i = 0; i < 300; i++) ship.update({ ...neutral, thrust: 1 }, 1 / 60);
    expect(ship.position.z).toBeLessThan(-100);
    expect(ship.velocity.length()).toBeGreaterThan(200);
    for (let i = 0; i < 300; i++) ship.update(neutral, 1 / 60);
    expect(ship.velocity.length()).toBeLessThan(0.01);
  });
  it('conserves momentum with flight assist off', () => {
    const ship = new FlightModel(); ship.assist = false;
    for (let i = 0; i < 60; i++) ship.update({ ...neutral, thrust: 1 }, 1 / 60);
    const speed = ship.velocity.length();
    const position = ship.position.clone();
    for (let i = 0; i < 60; i++) ship.update(neutral, 1 / 60);
    expect(ship.velocity.length()).toBeCloseTo(speed, 8);
    expect(ship.position.distanceTo(position)).toBeGreaterThan(50);
  });
  it('rotates around all local axes without NaN values', () => {
    const ship = new FlightModel();
    for (let i = 0; i < 600; i++) ship.update({ ...neutral, pitch: 0.4, yaw: -0.3, roll: 0.6, strafe: 0.2 }, 1 / 60);
    expect(ship.quaternion.length()).toBeCloseTo(1, 8);
    expect(Number.isFinite(ship.position.length())).toBe(true);
  });
});
