import type { FlightInput } from '../Physics/FlightModel';

export class InputController {
  readonly state: FlightInput = { strafe: 0, lift: 0, thrust: 0, pitch: 0, yaw: 0, roll: 0, boost: false };
  firing = false;
  mining = false;
  private keys = new Set<string>();
  private stickPointer: number | null = null;
  private touchPitch = 0;
  private touchYaw = 0;
  private touchThrust = 0;
  onToggleAssist = (): void => undefined;
  onNextTarget = (): void => undefined;
  onPause = (): void => undefined;

  constructor(private canvas: HTMLCanvasElement) {
    addEventListener('keydown', (event) => {
      if (['Space', 'Tab', 'ArrowUp', 'ArrowDown'].includes(event.code)) event.preventDefault();
      if (event.repeat) return;
      this.keys.add(event.code);
      if (event.code === 'KeyF') this.onToggleAssist();
      if (event.code === 'Tab') this.onNextTarget();
      if (event.code === 'Escape') this.onPause();
    });
    addEventListener('keyup', (event) => this.keys.delete(event.code));
    addEventListener('blur', () => { this.keys.clear(); this.firing = false; });
    canvas.addEventListener('click', () => {
      if (matchMedia('(pointer:fine)').matches && !document.pointerLockElement) void canvas.requestPointerLock();
    });
    addEventListener('mousemove', (event) => {
      if (document.pointerLockElement === canvas) {
        this.touchYaw = Math.max(-1, Math.min(1, this.touchYaw - event.movementX * 0.012));
        this.touchPitch = Math.max(-1, Math.min(1, this.touchPitch - event.movementY * 0.012));
      }
    });
    this.bindStick();
    this.bindHold('fire-button', (active) => { this.firing = active; });
    this.bindHold('thrust-button', (active) => { this.touchThrust = active ? 1 : 0; });
    this.bindHold('boost-button', (active) => { this.state.boost = active; });
    this.bindHold('mine-button', (active) => { this.mining = active; });
    document.getElementById('assist-button')!.addEventListener('click', () => this.onToggleAssist());
    document.getElementById('target-button')!.addEventListener('click', () => this.onNextTarget());
    document.getElementById('pause-button')!.addEventListener('click', () => this.onPause());
  }

  update(): void {
    this.state.thrust = Math.max(-1, Math.min(1, this.touchThrust + Number(this.keys.has('KeyW') || this.keys.has('ArrowUp')) - Number(this.keys.has('KeyS') || this.keys.has('ArrowDown'))));
    this.state.strafe = Number(this.keys.has('KeyD')) - Number(this.keys.has('KeyA'));
    this.state.lift = Number(this.keys.has('KeyR')) - Number(this.keys.has('KeyC'));
    this.state.roll = Number(this.keys.has('KeyQ')) - Number(this.keys.has('KeyE'));
    const keyPitch = Number(this.keys.has('KeyI')) - Number(this.keys.has('KeyK'));
    const keyYaw = Number(this.keys.has('KeyJ')) - Number(this.keys.has('KeyL'));
    this.state.pitch = Math.max(-1, Math.min(1, this.touchPitch + keyPitch));
    this.state.yaw = Math.max(-1, Math.min(1, this.touchYaw + keyYaw));
    if (document.pointerLockElement !== this.canvas) { this.touchPitch *= 0.88; this.touchYaw *= 0.88; }
    this.state.boost ||= this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    this.firing ||= this.keys.has('Space');
    this.mining ||= this.keys.has('KeyM');
  }

  afterUpdate(): void {
    if (!this.keys.has('ShiftLeft') && !this.keys.has('ShiftRight') && !document.getElementById('boost-button')?.classList.contains('active')) this.state.boost = false;
    if (!this.keys.has('Space') && !document.getElementById('fire-button')?.classList.contains('active')) this.firing = false;
    if (!this.keys.has('KeyM') && !document.getElementById('mine-button')?.classList.contains('active')) this.mining = false;
  }

  resetAttitude(): void { this.touchPitch = 0; this.touchYaw = 0; this.state.pitch = 0; this.state.yaw = 0; }

  private bindStick(): void {
    const stick = document.getElementById('touch-stick')!, knob = document.getElementById('stick-knob')!;
    const move = (event: PointerEvent) => {
      if (event.pointerId !== this.stickPointer) return;
      const bounds = stick.getBoundingClientRect();
      let x = event.clientX - (bounds.left + bounds.width / 2), y = event.clientY - (bounds.top + bounds.height / 2);
      const length = Math.hypot(x, y), radius = 39;
      if (length > radius) { x *= radius / length; y *= radius / length; }
      knob.style.transform = `translate(${x}px,${y}px)`;
      this.touchYaw = -x / radius; this.touchPitch = -y / radius;
    };
    stick.addEventListener('pointerdown', (event) => { this.stickPointer = event.pointerId; stick.setPointerCapture(event.pointerId); move(event); });
    stick.addEventListener('pointermove', move);
    const end = (event: PointerEvent) => {
      if (event.pointerId !== this.stickPointer) return;
      this.stickPointer = null; this.touchPitch = 0; this.touchYaw = 0; knob.style.transform = '';
    };
    stick.addEventListener('pointerup', end); stick.addEventListener('pointercancel', end);
  }

  private bindHold(id: string, setter: (active: boolean) => void): void {
    const button = document.getElementById(id)!;
    button.addEventListener('pointerdown', (event) => { event.preventDefault(); button.setPointerCapture(event.pointerId); button.classList.add('active'); setter(true); });
    const release = () => { button.classList.remove('active'); setter(false); };
    button.addEventListener('pointerup', release); button.addEventListener('pointercancel', release);
  }
}
