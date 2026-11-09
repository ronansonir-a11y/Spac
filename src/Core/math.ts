import * as THREE from 'three';

export class SeededRandom {
  private state: bigint;
  constructor(seed: bigint | number) {
    this.state = BigInt(seed) & 0xffffffffffffffffn;
  }
  next(): number {
    this.state = (this.state * 6364136223846793005n + 1442695040888963407n) & 0xffffffffffffffffn;
    return Number((this.state >> 11n) & 0x1fffffffffffffn) / 0x20000000000000;
  }
  range(min: number, max: number): number { return min + (max - min) * this.next(); }
  int(min: number, max: number): number { return Math.floor(this.range(min, max + 1)); }
  pick<T>(items: readonly T[]): T { return items[Math.floor(this.next() * items.length)]; }
}

/** Solves |Pt + Vt*t - (Ps + Vs*t)| = projectileSpeed*t. */
export function interceptPoint(
  targetPosition: THREE.Vector3,
  targetVelocity: THREE.Vector3,
  shooterPosition: THREE.Vector3,
  shooterVelocity: THREE.Vector3,
  projectileSpeed: number,
): THREE.Vector3 | null {
  const r = targetPosition.clone().sub(shooterPosition);
  const v = targetVelocity.clone().sub(shooterVelocity);
  const a = v.lengthSq() - projectileSpeed * projectileSpeed;
  const b = 2 * r.dot(v);
  const c = r.lengthSq();
  let t = 0;
  if (Math.abs(a) < 1e-7) {
    if (Math.abs(b) < 1e-7) return null;
    t = -c / b;
  } else {
    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return null;
    const root = Math.sqrt(discriminant);
    const t1 = (-b - root) / (2 * a);
    const t2 = (-b + root) / (2 * a);
    const valid = [t1, t2].filter((value) => value > 0.001);
    if (!valid.length) return null;
    t = Math.min(...valid);
  }
  if (!Number.isFinite(t) || t <= 0) return null;
  return targetPosition.clone().addScaledVector(targetVelocity, t);
}

export class PIDController {
  private integral = 0;
  private previousError = 0;
  constructor(public kp: number, public ki: number, public kd: number, public limit = Infinity) {}
  reset(): void { this.integral = 0; this.previousError = 0; }
  update(error: number, dt: number): number {
    this.integral = THREE.MathUtils.clamp(this.integral + error * dt, -this.limit, this.limit);
    const derivative = dt > 0 ? (error - this.previousError) / dt : 0;
    this.previousError = error;
    return THREE.MathUtils.clamp(this.kp * error + this.ki * this.integral + this.kd * derivative, -this.limit, this.limit);
  }
}

export function damp(current: number, target: number, lambda: number, dt: number): number {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * dt));
}

export function formatDistance(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
}
