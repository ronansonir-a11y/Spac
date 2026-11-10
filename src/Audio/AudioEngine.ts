export class AudioEngine {
  private context?: AudioContext;
  private master?: GainNode;
  private engineOsc?: OscillatorNode;
  private engineGain?: GainNode;
  enabled = true;

  async start(): Promise<void> {
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain(); this.master.gain.value = 0.22; this.master.connect(this.context.destination);
      this.engineOsc = this.context.createOscillator(); this.engineOsc.type = 'sawtooth'; this.engineOsc.frequency.value = 42;
      const filter = this.context.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 150;
      this.engineGain = this.context.createGain(); this.engineGain.gain.value = 0.025;
      this.engineOsc.connect(filter).connect(this.engineGain).connect(this.master); this.engineOsc.start();
    }
    await this.context.resume();
  }
  setThrust(amount: number): void {
    if (!this.context || !this.engineOsc || !this.engineGain) return;
    const now = this.context.currentTime;
    this.engineOsc.frequency.setTargetAtTime(40 + Math.abs(amount) * 34, now, 0.1);
    this.engineGain.gain.setTargetAtTime(0.025 + Math.abs(amount) * 0.025, now, 0.1);
  }
  laser(enemy = false): void { this.tone(enemy ? 150 : 260, enemy ? 70 : 95, 0.11, 'sawtooth', 0.12); }
  hit(): void { this.tone(90, 35, 0.18, 'square', 0.12); }
  lock(): void { this.tone(880, 880, 0.06, 'sine', 0.09); }
  explosion(): void {
    if (!this.context || !this.master || !this.enabled) return;
    const length = Math.floor(this.context.sampleRate * 0.7);
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.4);
    const source = this.context.createBufferSource(); source.buffer = buffer;
    const filter = this.context.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 260;
    const gain = this.context.createGain(); gain.gain.value = 0.5;
    source.connect(filter).connect(gain).connect(this.master); source.start();
  }
  private tone(from: number, to: number, duration: number, type: OscillatorType, volume: number): void {
    if (!this.context || !this.master || !this.enabled) return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator(); oscillator.type = type; oscillator.frequency.setValueAtTime(from, now); oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, to), now + duration);
    const gain = this.context.createGain(); gain.gain.setValueAtTime(volume, now); gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(gain).connect(this.master); oscillator.start(now); oscillator.stop(now + duration);
  }
}
