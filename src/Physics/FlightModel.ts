import * as THREE from 'three';
import { damp } from '../Core/math';

export interface FlightInput { strafe: number; lift: number; thrust: number; pitch: number; yaw: number; roll: number; boost: boolean; }

export class FlightModel {
  readonly position = new THREE.Vector3();
  readonly velocity = new THREE.Vector3();
  readonly quaternion = new THREE.Quaternion();
  readonly angularVelocity = new THREE.Vector3();
  assist = true;
  maxSpeed = 300;
  acceleration = 92;
  boostMultiplier = 2.2;
  private readonly inverse = new THREE.Quaternion();
  private readonly localVelocity = new THREE.Vector3();
  private readonly delta = new THREE.Quaternion();
  private readonly euler = new THREE.Euler();

  update(input: FlightInput, dt: number, power = 1): void {
    const rotationResponse = this.assist ? 8 : 2.2;
    this.angularVelocity.x = damp(this.angularVelocity.x, input.pitch * 1.35, rotationResponse, dt);
    this.angularVelocity.y = damp(this.angularVelocity.y, input.yaw * 1.35, rotationResponse, dt);
    this.angularVelocity.z = damp(this.angularVelocity.z, input.roll * 2.1, rotationResponse, dt);
    this.euler.set(this.angularVelocity.x * dt, this.angularVelocity.y * dt, this.angularVelocity.z * dt, 'XYZ');
    this.delta.setFromEuler(this.euler);
    this.quaternion.multiply(this.delta).normalize();

    this.inverse.copy(this.quaternion).invert();
    this.localVelocity.copy(this.velocity).applyQuaternion(this.inverse);
    const boost = input.boost ? this.boostMultiplier : 1;
    const acceleration = this.acceleration * power * boost;
    this.localVelocity.x += input.strafe * acceleration * dt;
    this.localVelocity.y += input.lift * acceleration * dt;
    this.localVelocity.z -= input.thrust * acceleration * dt;

    if (this.assist) {
      const desiredX = input.strafe * this.maxSpeed * 0.35 * boost;
      const desiredY = input.lift * this.maxSpeed * 0.35 * boost;
      const desiredZ = -input.thrust * this.maxSpeed * boost;
      const response = input.thrust || input.strafe || input.lift ? 1.7 : 2.7;
      this.localVelocity.x = damp(this.localVelocity.x, desiredX, response, dt);
      this.localVelocity.y = damp(this.localVelocity.y, desiredY, response, dt);
      this.localVelocity.z = damp(this.localVelocity.z, desiredZ, response, dt);
    }
    const limit = this.maxSpeed * boost * 1.4;
    if (this.localVelocity.length() > limit) this.localVelocity.setLength(limit);
    this.velocity.copy(this.localVelocity).applyQuaternion(this.quaternion);
    this.position.addScaledVector(this.velocity, dt);
  }
}
