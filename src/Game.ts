import * as THREE from 'three';
import { AudioEngine } from './Audio/AudioEngine';
import { generateSector, type SectorData } from './ProcGen/galaxy';
import { createAsteroidGeometry, createShip, createStarfield, createStation } from './ProcGen/meshes';
import { createAtmosphereMaterial, createPlanetMaterial, createShieldMaterial, createStarMaterial } from './Shaders/materials';
import { FlightModel } from './Physics/FlightModel';
import { Hud, type HudTarget } from './UI/Hud';
import { InputController } from './UI/InputController';
import { interceptPoint, SeededRandom } from './Core/math';
import { ObjectPool } from './Core/ObjectPool';

type AIState = 'PATROL' | 'SCAN' | 'INTERCEPT' | 'ATTACK RUN' | 'EVADE';
interface Enemy {
  mesh: THREE.Group; shieldMesh: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  velocity: THREE.Vector3; shield: number; hull: number; state: AIState; cooldown: number;
  name: string; alive: boolean; radius: number; seed: number;
}
interface Projectile {
  mesh: THREE.Mesh; velocity: THREE.Vector3; life: number; hostile: boolean; damage: number;
}
interface Particle { mesh: THREE.Mesh; velocity: THREE.Vector3; life: number; maxLife: number; }
interface Asteroid { position: THREE.Vector3; scale: number; active: boolean; }

const forwardVector = new THREE.Vector3(0, 0, -1);
const rightVector = new THREE.Vector3(1, 0, 0);
const upVector = new THREE.Vector3(0, 1, 0);
const tempA = new THREE.Vector3(), tempB = new THREE.Vector3(), tempC = new THREE.Vector3();

export class Game {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.1, 40000);
  private world = new THREE.Group();
  private player = new FlightModel();
  private playerMesh = createShip();
  private playerShield = new THREE.Mesh(new THREE.SphereGeometry(3.7, 24, 16), createShieldMaterial());
  private input: InputController;
  private hud = new Hud();
  readonly audio = new AudioEngine();
  private enemies: Enemy[] = [];
  private asteroids: Asteroid[] = [];
  private asteroidMesh?: THREE.InstancedMesh;
  private projectiles: ObjectPool<Projectile>;
  private particles: ObjectPool<Particle>;
  private sector: SectorData = generateSector(0xa37e6);
  private sectorIndex = 0;
  private target?: Enemy;
  private shield = 100;
  private hull = 100;
  private heat = 0;
  private credits = 0;
  private kills = 0;
  private fireCooldown = 0;
  private timeSinceHit = 10;
  private elapsed = 0;
  private lastTime = 0;
  private accumulator = 0;
  private radarTimer = 0;
  private miningProgress = 0;
  private miningIndex = -1;
  private miningBeam: THREE.Line;
  private running = false;
  private paused = false;
  private destroyed = false;
  private sectorClearTimer = -1;
  private overheated = false;
  private random = new SeededRandom(0xa37e6);
  private animationId = 0;
  private bestScore = Number(localStorage.getItem('aether6-best') ?? 0);

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: devicePixelRatio < 2, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.scene.background = new THREE.Color(0x010409);
    this.scene.fog = new THREE.FogExp2(0x02070d, 0.000018);
    this.scene.add(this.world);
    this.scene.add(new THREE.AmbientLight(0x29475a, 0.75));
    const sunlight = new THREE.DirectionalLight(0xffe5c5, 3.1); sunlight.position.set(-1, 0.4, 0.6); this.scene.add(sunlight);
    this.scene.add(this.playerMesh); this.playerMesh.add(this.playerShield);
    this.projectiles = new ObjectPool<Projectile>(500, () => {
      const material = new THREE.MeshBasicMaterial({ color: 0x63ffee, toneMapped: false });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.075, 5), material);
      mesh.visible = false; mesh.frustumCulled = false; mesh.userData.pooled = true; this.world.add(mesh);
      return { mesh, velocity: new THREE.Vector3(), life: 0, hostile: false, damage: 0 };
    });
    this.particles = new ObjectPool<Particle>(160, () => {
      const mesh = new THREE.Mesh(new THREE.TetrahedronGeometry(0.18), new THREE.MeshBasicMaterial({ color: 0xff8d48, transparent: true, toneMapped: false }));
      mesh.visible = false; mesh.userData.pooled = true; this.world.add(mesh);
      return { mesh, velocity: new THREE.Vector3(), life: 0, maxLife: 1 };
    });
    const beamGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    this.miningBeam = new THREE.Line(beamGeometry, new THREE.LineBasicMaterial({ color: 0x60ffe1, transparent: true, opacity: 0.8 }));
    this.miningBeam.visible = false; this.scene.add(this.miningBeam);
    this.input = new InputController(canvas);
    this.input.onToggleAssist = () => this.toggleAssist();
    this.input.onNextTarget = () => this.nextTarget();
    this.input.onPause = () => this.togglePause();
    this.buildSector(0);
    this.bindUI();
    addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.running && !this.paused) this.togglePause(); });
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  start(): void {
    void this.audio.start();
    this.running = true; this.paused = false; this.destroyed = false;
    this.hud.showGame(); this.input.resetAttitude();
    this.hud.toast('FLIGHT CONTROL ONLINE');
    this.lastTime = performance.now();
  }

  private bindUI(): void {
    document.getElementById('resume')!.addEventListener('click', () => this.togglePause());
    document.getElementById('restart')!.addEventListener('click', () => this.restart());
    document.getElementById('retry')!.addEventListener('click', () => this.restart());
    document.getElementById('audio-button')!.addEventListener('click', (event) => {
      this.audio.enabled = !this.audio.enabled;
      (event.currentTarget as HTMLButtonElement).textContent = `AUDIO: ${this.audio.enabled ? 'ON' : 'OFF'}`;
    });
  }

  private buildSector(index: number): void {
    for (const projectile of this.projectiles.active) { projectile.mesh.visible = false; this.projectiles.release(projectile); }
    for (const particle of this.particles.active) { particle.mesh.visible = false; this.particles.release(particle); }
    for (const child of [...this.world.children]) {
      if (!child.userData.pooled) this.world.remove(child);
    }
    this.sectorIndex = index;
    this.sector = generateSector(0xa37e6 + index * 7919, index);
    this.random = new SeededRandom(this.sector.seed);
    this.enemies = []; this.asteroids = []; this.target = undefined; this.sectorClearTimer = -1;
    this.player.position.set(0, 0, 120); this.player.velocity.set(0, 0, 0); this.player.quaternion.identity(); this.player.angularVelocity.set(0, 0, 0);
    this.playerMesh.visible = true;
    this.shield = 100; this.hull = 100; this.heat = 0; this.overheated = false; this.timeSinceHit = 10;

    const stars = createStarfield(this.random); stars.name = 'starfield'; this.world.add(stars);
    this.addNebula(new THREE.Vector3(-6000, 2000, -10000), 0x164f69, 9000);
    this.addNebula(new THREE.Vector3(7000, -3500, -12000), 0x4f214f, 10000);
    const starMaterial = createStarMaterial();
    const star = new THREE.Mesh(new THREE.SphereGeometry(420, 40, 28), starMaterial);
    star.position.set(-6500, 1200, -6000); star.name = 'star'; this.world.add(star);
    const starGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.radialTexture('rgba(255,195,105,0.65)'), color: 0xffb060, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    starGlow.position.copy(star.position); starGlow.scale.set(2500, 2500, 1); this.world.add(starGlow);
    for (const data of this.sector.planets) {
      const group = new THREE.Group();
      group.position.set(Math.cos(data.angle) * data.orbit, this.random.range(-1400, 1400), -Math.abs(Math.sin(data.angle) * data.orbit) - 1800);
      const planet = new THREE.Mesh(new THREE.SphereGeometry(data.radius, 48, 32), createPlanetMaterial(data.color));
      planet.rotation.z = this.random.range(-0.4, 0.4); group.add(planet);
      const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(data.radius * 1.045, 40, 24), createAtmosphereMaterial(data.atmosphere)); group.add(atmosphere);
      this.world.add(group);
    }
    const station = createStation(); station.position.set(95, -32, -180); station.rotation.set(0.2, 0.6, 0.25); station.scale.setScalar(0.8); this.world.add(station);
    this.createAsteroids();
    for (let i = 0; i < this.sector.enemyCount; i++) this.spawnEnemy(i);
    this.selectNearestTarget();
    this.updateCamera(1);
  }

  private createAsteroids(): void {
    const count = this.sector.asteroidCount;
    const material = new THREE.MeshStandardMaterial({ color: 0x4a4c4b, roughness: 0.94, metalness: 0.18 });
    const mesh = new THREE.InstancedMesh(createAsteroidGeometry(this.sector.seed), material, count);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const matrix = new THREE.Matrix4(), quaternion = new THREE.Quaternion(), scale = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      const angle = this.random.range(0, Math.PI * 2), radius = this.random.range(600, 4800);
      const position = new THREE.Vector3(Math.cos(angle) * radius, this.random.range(-230, 230) + Math.sin(angle * 3) * 120, Math.sin(angle) * radius - 900);
      const size = this.random.range(2.5, 20) * (this.random.next() > 0.96 ? 2.4 : 1);
      quaternion.setFromEuler(new THREE.Euler(this.random.range(0, 6), this.random.range(0, 6), this.random.range(0, 6)));
      scale.set(size, size * this.random.range(0.7, 1.2), size * this.random.range(0.75, 1.25));
      matrix.compose(position, quaternion, scale); mesh.setMatrixAt(i, matrix);
      this.asteroids.push({ position, scale: size, active: true });
    }
    mesh.instanceMatrix.needsUpdate = true; this.asteroidMesh = mesh; this.world.add(mesh);
  }

  private spawnEnemy(index: number): void {
    const mesh = createShip(0xff4b5f, true);
    const angle = index / this.sector.enemyCount * Math.PI * 2;
    mesh.position.set(Math.cos(angle) * this.random.range(280, 1100), this.random.range(-180, 260), -this.random.range(450, 1500));
    mesh.scale.setScalar(1.25);
    const shieldMesh = new THREE.Mesh(new THREE.SphereGeometry(4.4, 18, 12), createShieldMaterial()); mesh.add(shieldMesh);
    this.world.add(mesh);
    this.enemies.push({ mesh, shieldMesh, velocity: new THREE.Vector3(), shield: 65 + this.sector.threat * 8, hull: 70 + this.sector.threat * 10, state: 'SCAN', cooldown: this.random.range(0, 1), name: `RAIDER ${String(index + 1).padStart(2, '0')}`, alive: true, radius: 4.5, seed: this.random.next() * 100 });
  }

  private loop = (now: number): void => {
    this.animationId = requestAnimationFrame(this.loop);
    const frameDt = Math.min(0.05, Math.max(0, (now - this.lastTime) / 1000)); this.lastTime = now;
    if (this.running && !this.paused && !this.destroyed) {
      this.accumulator += frameDt;
      const step = 1 / 60;
      while (this.accumulator >= step) { this.update(step); this.accumulator -= step; }
    } else {
      const star = this.world.getObjectByName('star') as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial> | undefined;
      if (star) star.material.uniforms.time.value = now / 1000;
    }
    this.renderer.render(this.scene, this.camera);
  };

  private update(dt: number): void {
    this.elapsed += dt; this.fireCooldown -= dt; this.timeSinceHit += dt;
    this.input.update();
    this.player.update(this.input.state, dt);
    this.input.afterUpdate();
    this.audio.setThrust(this.input.state.thrust + (this.input.state.boost ? 1 : 0));
    this.playerMesh.position.copy(this.player.position); this.playerMesh.quaternion.copy(this.player.quaternion);
    this.playerShield.material.uniforms.time.value = this.elapsed;
    this.playerShield.material.uniforms.opacity.value = this.shield > 0 ? 1 : 0;
    const star = this.world.getObjectByName('star') as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial> | undefined;
    if (star) star.material.uniforms.time.value = this.elapsed;
    const starfield = this.world.getObjectByName('starfield'); if (starfield) starfield.position.copy(this.player.position);
    this.heat = Math.max(0, this.heat - dt * (this.overheated ? 30 : 21));
    if (this.overheated && this.heat < 32) { this.overheated = false; this.hud.toast('WEAPONS READY'); }
    if (this.input.firing) this.firePlayer();
    if (this.timeSinceHit > 4 && this.shield < 100) this.shield = Math.min(100, this.shield + dt * 8);
    for (const enemy of this.enemies) if (enemy.alive) this.updateEnemy(enemy, dt);
    this.updateProjectiles(dt); this.updateParticles(dt); this.updateMining(dt);
    this.updateCamera(dt); this.handleFloatingOrigin();
    if (this.target && !this.target.alive) this.selectNearestTarget();
    const hostiles = this.enemies.filter((enemy) => enemy.alive).length;
    if (hostiles === 0 && this.sectorClearTimer < 0) { this.sectorClearTimer = 5; this.hud.toast('SECTOR SECURE // JUMP SEQUENCE INITIATED'); }
    if (this.sectorClearTimer >= 0) {
      this.sectorClearTimer -= dt;
      if (this.sectorClearTimer <= 0) { this.buildSector(this.sectorIndex + 1); this.hud.toast(`ENTERING ${this.sector.name}`); }
    }
    this.updateHud(dt, hostiles);
  }

  private updateEnemy(enemy: Enemy, dt: number): void {
    const toPlayer = tempA.copy(this.player.position).sub(enemy.mesh.position);
    const distance = toPlayer.length();
    if (enemy.shield < 15) enemy.state = 'EVADE';
    else if (distance > 1700) enemy.state = 'INTERCEPT';
    else if (distance < 130) enemy.state = 'EVADE';
    else enemy.state = 'ATTACK RUN';
    let desired: THREE.Vector3;
    let speed = 95 + this.sector.threat * 8;
    if (enemy.state === 'EVADE') {
      desired = tempB.copy(toPlayer).normalize().multiplyScalar(-1);
      desired.x += Math.sin(this.elapsed * 2.1 + enemy.seed) * 0.9;
      desired.y += Math.cos(this.elapsed * 1.7 + enemy.seed) * 0.65;
      speed *= 1.55;
    } else {
      const lead = interceptPoint(this.player.position, this.player.velocity, enemy.mesh.position, enemy.velocity, 620);
      desired = tempB.copy(lead ?? this.player.position).sub(enemy.mesh.position).normalize();
      if (enemy.state === 'ATTACK RUN') {
        desired.x += Math.sin(this.elapsed * 0.9 + enemy.seed) * 0.12;
        desired.y += Math.cos(this.elapsed * 1.2 + enemy.seed) * 0.12;
      }
    }
    // Short-range steering whiskers keep fighters clear of the largest rocks.
    for (const asteroid of this.asteroids) {
      if (!asteroid.active || asteroid.scale < 12) continue;
      const away = tempC.copy(enemy.mesh.position).sub(asteroid.position);
      const safe = asteroid.scale + 45;
      if (away.lengthSq() < safe * safe) desired.add(away.normalize().multiplyScalar(1.8));
    }
    desired.normalize();
    const targetRotation = new THREE.Quaternion().setFromUnitVectors(forwardVector, desired);
    enemy.mesh.quaternion.slerp(targetRotation, 1 - Math.exp(-dt * (enemy.state === 'EVADE' ? 2.8 : 1.7)));
    const desiredVelocity = desired.clone().multiplyScalar(speed);
    enemy.velocity.lerp(desiredVelocity, 1 - Math.exp(-dt * 1.25));
    enemy.mesh.position.addScaledVector(enemy.velocity, dt);
    enemy.shieldMesh.material.uniforms.time.value = this.elapsed;
    enemy.shieldMesh.material.uniforms.opacity.value = enemy.shield > 0 ? 0.7 : 0;
    enemy.cooldown -= dt;
    const facing = forwardVector.clone().applyQuaternion(enemy.mesh.quaternion);
    if (distance < 1400 && facing.dot(toPlayer.normalize()) > 0.975 && enemy.cooldown <= 0 && enemy.state !== 'EVADE') {
      this.spawnProjectile(enemy.mesh.position, facing, enemy.velocity, true, 10 + this.sector.threat, 620);
      enemy.cooldown = this.random.range(0.45, 0.9); this.audio.laser(true);
    }
  }

  private firePlayer(): void {
    if (this.fireCooldown > 0 || this.overheated) return;
    if (this.heat >= 100) { this.overheated = true; this.hud.toast('WEAPON OVERHEAT'); return; }
    const direction = forwardVector.clone().applyQuaternion(this.player.quaternion);
    if (this.target?.alive) {
      const lead = interceptPoint(this.target.mesh.position, this.target.velocity, this.player.position, this.player.velocity, 1100);
      if (lead) {
        const assisted = lead.sub(this.player.position).normalize();
        if (assisted.dot(direction) > 0.988) direction.lerp(assisted, 0.75).normalize();
      }
    }
    const origin = this.player.position.clone().addScaledVector(direction, 4);
    this.spawnProjectile(origin, direction, this.player.velocity, false, 24, 1100);
    this.fireCooldown = 0.14; this.heat += 8.5; this.audio.laser();
  }

  private spawnProjectile(origin: THREE.Vector3, direction: THREE.Vector3, inheritedVelocity: THREE.Vector3, hostile: boolean, damage: number, speed: number): void {
    const projectile = this.projectiles.acquire(); if (!projectile) return;
    projectile.mesh.visible = true; projectile.mesh.position.copy(origin);
    projectile.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
    (projectile.mesh.material as THREE.MeshBasicMaterial).color.setHex(hostile ? 0xff4e42 : 0x65ffde);
    projectile.velocity.copy(direction).multiplyScalar(speed).add(inheritedVelocity);
    projectile.life = 3.5; projectile.hostile = hostile; projectile.damage = damage;
  }

  private updateProjectiles(dt: number): void {
    for (const projectile of [...this.projectiles.active]) {
      projectile.mesh.position.addScaledVector(projectile.velocity, dt); projectile.life -= dt;
      let hit = false;
      if (projectile.hostile) {
        if (projectile.mesh.position.distanceToSquared(this.player.position) < 22) {
          this.damagePlayer(projectile.damage, projectile.mesh.position); hit = true;
        }
      } else {
        for (const enemy of this.enemies) {
          if (!enemy.alive || projectile.mesh.position.distanceToSquared(enemy.mesh.position) > enemy.radius * enemy.radius) continue;
          this.damageEnemy(enemy, projectile.damage, projectile.mesh.position); hit = true; break;
        }
      }
      if (hit || projectile.life <= 0) { projectile.mesh.visible = false; this.projectiles.release(projectile); }
    }
  }

  private damagePlayer(amount: number, point: THREE.Vector3): void {
    this.timeSinceHit = 0;
    if (this.shield > 0) {
      this.shield = Math.max(0, this.shield - amount);
      const local = this.playerMesh.worldToLocal(point.clone()).normalize();
      this.playerShield.material.uniforms.hit.value = this.elapsed;
      this.playerShield.material.uniforms.hitPoint.value.copy(local);
    } else {
      this.hull = Math.max(0, this.hull - amount * 1.25);
      this.camera.position.add(new THREE.Vector3(this.random.range(-0.3, 0.3), this.random.range(-0.3, 0.3), 0));
      if (this.hull <= 0) this.destroyPlayer();
    }
    this.audio.hit(); if (navigator.vibrate) navigator.vibrate(25);
  }

  private damageEnemy(enemy: Enemy, amount: number, point: THREE.Vector3): void {
    if (enemy.shield > 0) {
      enemy.shield = Math.max(0, enemy.shield - amount);
      enemy.shieldMesh.material.uniforms.hit.value = this.elapsed;
      enemy.shieldMesh.material.uniforms.hitPoint.value.copy(enemy.mesh.worldToLocal(point.clone()).normalize());
    } else enemy.hull = Math.max(0, enemy.hull - amount * 1.35);
    this.spawnSparks(point, 3, 0x75f9ff);
    if (enemy.hull <= 0) {
      enemy.alive = false; enemy.mesh.visible = false;
      this.kills++; this.credits += 250 + this.sector.threat * 40;
      this.spawnSparks(enemy.mesh.position, 22, 0xff7c3d); this.audio.explosion();
      this.hud.toast(`${enemy.name} DESTROYED // +${250 + this.sector.threat * 40} CR`);
      this.bestScore = Math.max(this.bestScore, this.credits); localStorage.setItem('aether6-best', String(this.bestScore));
    }
  }

  private spawnSparks(position: THREE.Vector3, count: number, color: number): void {
    for (let i = 0; i < count; i++) {
      const particle = this.particles.acquire(); if (!particle) break;
      particle.mesh.visible = true; particle.mesh.position.copy(position);
      (particle.mesh.material as THREE.MeshBasicMaterial).color.setHex(color);
      particle.mesh.scale.setScalar(this.random.range(0.7, 2.5));
      particle.velocity.set(this.random.range(-1, 1), this.random.range(-1, 1), this.random.range(-1, 1)).normalize().multiplyScalar(this.random.range(10, 65));
      particle.life = particle.maxLife = this.random.range(0.35, 1.15);
    }
  }

  private updateParticles(dt: number): void {
    for (const particle of [...this.particles.active]) {
      particle.life -= dt; particle.mesh.position.addScaledVector(particle.velocity, dt);
      particle.mesh.rotation.x += dt * 4; particle.mesh.rotation.y += dt * 3;
      (particle.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, particle.life / particle.maxLife);
      if (particle.life <= 0) { particle.mesh.visible = false; this.particles.release(particle); }
    }
  }

  private updateMining(dt: number): void {
    this.miningBeam.visible = false;
    if (!this.input.mining) { this.miningProgress = 0; this.miningIndex = -1; return; }
    let nearest = -1, distance = 110;
    for (let i = 0; i < this.asteroids.length; i++) {
      const asteroid = this.asteroids[i]; if (!asteroid.active) continue;
      const d = asteroid.position.distanceTo(this.player.position) - asteroid.scale;
      if (d < distance) { distance = d; nearest = i; }
    }
    if (nearest < 0) { this.miningProgress = 0; return; }
    if (this.miningIndex !== nearest) { this.miningIndex = nearest; this.miningProgress = 0; }
    this.miningProgress += dt;
    const asteroid = this.asteroids[nearest];
    const positions = this.miningBeam.geometry.attributes.position as THREE.BufferAttribute;
    positions.setXYZ(0, this.player.position.x, this.player.position.y, this.player.position.z);
    positions.setXYZ(1, asteroid.position.x, asteroid.position.y, asteroid.position.z); positions.needsUpdate = true;
    this.miningBeam.visible = true;
    if (this.miningProgress > 1.35) {
      asteroid.active = false;
      const matrix = new THREE.Matrix4().makeScale(0, 0, 0); this.asteroidMesh?.setMatrixAt(nearest, matrix);
      if (this.asteroidMesh) this.asteroidMesh.instanceMatrix.needsUpdate = true;
      const yieldAmount = Math.round(22 + asteroid.scale * 2.2); this.credits += yieldAmount;
      this.spawnSparks(asteroid.position, 10, 0x69e8d1); this.audio.explosion();
      this.hud.toast(`FERRITE EXTRACTED // +${yieldAmount} CR`);
      this.miningProgress = 0; this.miningIndex = -1;
    }
  }

  private updateCamera(dt: number): void {
    const offset = new THREE.Vector3(0, 4.2, 13.5).applyQuaternion(this.player.quaternion);
    const desired = this.player.position.clone().add(offset);
    const blend = dt >= 1 ? 1 : 1 - Math.exp(-dt * 8);
    this.camera.position.lerp(desired, blend);
    const look = this.player.position.clone().add(forwardVector.clone().applyQuaternion(this.player.quaternion).multiplyScalar(35));
    this.camera.up.copy(upVector).applyQuaternion(this.player.quaternion);
    this.camera.lookAt(look);
    const desiredFov = this.input.state.boost ? 76 : 68;
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, desiredFov, blend); this.camera.updateProjectionMatrix();
  }

  private handleFloatingOrigin(): void {
    if (this.player.position.length() <= 5000) return;
    const shift = this.player.position.clone();
    for (const child of this.world.children) child.position.sub(shift);
    for (const asteroid of this.asteroids) asteroid.position.sub(shift);
    this.player.position.set(0, 0, 0); this.camera.position.sub(shift);
    this.hud.toast('FLOATING ORIGIN RECALIBRATED');
  }

  private updateHud(dt: number, hostiles: number): void {
    let targetData: HudTarget | null = null;
    if (this.target?.alive) {
      const lead = interceptPoint(this.target.mesh.position, this.target.velocity, this.player.position, this.player.velocity, 1100);
      targetData = {
        name: this.target.name, distance: this.target.mesh.position.distanceTo(this.player.position), shield: Math.min(100, this.target.shield / (65 + this.sector.threat * 8) * 100), hull: Math.min(100, this.target.hull / (70 + this.sector.threat * 10) * 100), state: this.target.state,
        screen: this.target.mesh.position.clone().project(this.camera), lead: lead ? lead.project(this.camera) : null,
      };
    }
    const velocityDirection = this.player.velocity.clone().normalize();
    const velocityPoint = this.player.velocity.lengthSq() > 4 ? this.camera.position.clone().add(velocityDirection.multiplyScalar(100)).project(this.camera) : null;
    this.hud.update(dt, { sector: this.sector.name, speed: this.player.velocity.length(), throttle: this.input.state.thrust, credits: this.credits, shield: this.shield, hull: this.hull, heat: this.heat, assist: this.player.assist, hostiles, target: targetData, velocityScreen: velocityPoint });
    this.radarTimer -= dt;
    if (this.radarTimer <= 0) {
      const forward = forwardVector.clone().applyQuaternion(this.player.quaternion), right = rightVector.clone().applyQuaternion(this.player.quaternion), up = upVector.clone().applyQuaternion(this.player.quaternion);
      this.hud.drawRadar(this.player.position, forward, right, up, this.enemies.filter((e) => e.alive).map((e) => ({ position: e.mesh.position, hostile: true })));
      this.radarTimer = 0.1;
    }
  }

  private selectNearestTarget(): void {
    let nearest: Enemy | undefined, distance = Infinity;
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const d = enemy.mesh.position.distanceToSquared(this.player.position);
      if (d < distance) { nearest = enemy; distance = d; }
    }
    this.target = nearest;
  }

  private nextTarget(): void {
    const living = this.enemies.filter((enemy) => enemy.alive); if (!living.length) { this.target = undefined; return; }
    const current = this.target ? living.indexOf(this.target) : -1;
    this.target = living[(current + 1) % living.length]; this.audio.lock();
    this.hud.toast(`TARGET LOCK // ${this.target.name}`);
  }

  private toggleAssist(): void {
    if (!this.running || this.paused) return;
    this.player.assist = !this.player.assist;
    this.hud.toast(this.player.assist ? 'FLIGHT ASSIST ENGAGED' : 'FLIGHT ASSIST OFF // INERTIAL FLIGHT');
  }

  private togglePause(): void {
    if (!this.running || this.destroyed) return;
    this.paused = !this.paused;
    document.getElementById('pause')!.classList.toggle('hidden', !this.paused);
    if (document.pointerLockElement) document.exitPointerLock();
    this.lastTime = performance.now();
  }

  private restart(): void {
    document.getElementById('pause')!.classList.add('hidden'); document.getElementById('debrief')!.classList.add('hidden');
    this.credits = 0; this.kills = 0; this.destroyed = false; this.paused = false;
    this.buildSector(0); this.hud.showGame(); this.hud.toast('NEW FLIGHT INITIALIZED');
  }

  private destroyPlayer(): void {
    this.destroyed = true; this.spawnSparks(this.player.position, 35, 0xff7840); this.audio.explosion();
    this.playerMesh.visible = false;
    document.getElementById('final-kills')!.textContent = String(this.kills);
    document.getElementById('final-credits')!.textContent = String(this.credits);
    document.getElementById('debrief')!.classList.remove('hidden');
    if (document.pointerLockElement) document.exitPointerLock();
    setTimeout(() => { this.playerMesh.visible = true; }, 1000);
  }

  private addNebula(position: THREE.Vector3, color: number, scale: number): void {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.radialTexture('rgba(255,255,255,0.3)'), color, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false }));
    sprite.position.copy(position); sprite.scale.set(scale, scale, 1); this.world.add(sprite);
  }

  private radialTexture(center: string): THREE.CanvasTexture {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
    const context = canvas.getContext('2d')!, gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, center); gradient.addColorStop(0.18, 'rgba(255,255,255,0.14)'); gradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = gradient; context.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(canvas);
  }

  private resize(): void {
    this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6)); this.renderer.setSize(innerWidth, innerHeight);
  }

  dispose(): void {
    cancelAnimationFrame(this.animationId); this.renderer.dispose();
  }
}
