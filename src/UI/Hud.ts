import * as THREE from 'three';
import { formatDistance } from '../Core/math';

export interface HudTarget { name: string; distance: number; shield: number; hull: number; state: string; screen: THREE.Vector3; lead: THREE.Vector3 | null; }

export class Hud {
  private element = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
  private radar = this.element<HTMLCanvasElement>('radar');
  private radarContext = this.radar.getContext('2d')!;
  private toastTimer = 0;
  showGame(): void { this.element('boot').classList.add('hidden'); this.element('hud').classList.remove('hidden'); }
  toast(message: string): void {
    const toast = this.element('toast'); toast.textContent = message; toast.classList.add('visible'); this.toastTimer = 2.8;
  }
  update(dt: number, data: { sector: string; speed: number; throttle: number; credits: number; shield: number; hull: number; heat: number; assist: boolean; hostiles: number; target: HudTarget | null; velocityScreen: THREE.Vector3 | null; }): void {
    this.toastTimer -= dt; if (this.toastTimer <= 0) this.element('toast').classList.remove('visible');
    this.element('sector').textContent = data.sector;
    this.element('speed').textContent = Math.round(data.speed).toString().padStart(3, '0');
    this.element('speed-bar').style.width = `${Math.min(100, data.speed / 6)}%`;
    this.element('throttle').textContent = `${Math.round(Math.abs(data.throttle) * 100)}%`;
    this.element('credits').textContent = Math.round(data.credits).toString();
    this.element('shield-text').textContent = Math.ceil(data.shield).toString();
    this.element('hull-text').textContent = Math.ceil(data.hull).toString();
    this.element('heat-text').textContent = Math.ceil(data.heat).toString();
    this.element('shield-bar').style.width = `${data.shield}%`;
    this.element('hull-bar').style.width = `${data.hull}%`;
    this.element('heat-bar').style.width = `${data.heat}%`;
    this.element('hostiles').textContent = `${data.hostiles} CONTACT${data.hostiles === 1 ? '' : 'S'}`;
    this.element('objective').textContent = data.hostiles ? 'CLEAR HOSTILE CONTACTS' : 'SECTOR SECURE';
    this.element('assist-status').textContent = data.assist ? 'FA' : 'OFF';
    this.element('assist-status').classList.toggle('off', !data.assist);
    this.element('assist-button').innerHTML = `FLIGHT ASSIST <b>${data.assist ? 'ON' : 'OFF'}</b>`;
    const targetPanel = this.element('target-panel'), targetBox = this.element('target-box'), lead = this.element('lead');
    targetPanel.classList.toggle('hidden', !data.target); targetBox.classList.toggle('hidden', !data.target); lead.classList.toggle('hidden', !data.target?.lead);
    if (data.target) {
      this.element('target-name').textContent = data.target.name;
      this.element('target-distance').textContent = formatDistance(data.target.distance);
      this.element('target-state').textContent = data.target.state;
      this.element('target-shield').style.width = `${data.target.shield}%`;
      this.element('target-hull').style.width = `${data.target.hull}%`;
      this.positionElement(targetBox, data.target.screen, 48);
      if (data.target.lead) this.positionElement(lead, data.target.lead, 0);
    }
    const velocity = this.element('velocity-marker'); velocity.classList.toggle('hidden', !data.velocityScreen);
    if (data.velocityScreen) this.positionElement(velocity, data.velocityScreen, 0);
    this.element('alert').classList.toggle('hidden', data.shield > 20 || data.hull <= 0);
    this.element('alert').textContent = data.shield <= 0 ? 'HULL INTEGRITY COMPROMISED' : 'SHIELDS CRITICAL';
  }
  private positionElement(element: HTMLElement, screen: THREE.Vector3, offset: number): void {
    element.style.left = `${(screen.x * 0.5 + 0.5) * innerWidth + offset}px`;
    element.style.top = `${(-screen.y * 0.5 + 0.5) * innerHeight + offset}px`;
    element.classList.toggle('behind', screen.z > 1);
  }
  drawRadar(player: THREE.Vector3, forward: THREE.Vector3, right: THREE.Vector3, up: THREE.Vector3, contacts: { position: THREE.Vector3; hostile: boolean }[]): void {
    const ctx = this.radarContext, size = this.radar.width, center = size / 2, scale = size * 0.43 / 5000;
    ctx.clearRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(84,228,213,.18)'; ctx.lineWidth = 1;
    for (const r of [0.25, 0.5, 0.75, 1]) { ctx.beginPath(); ctx.arc(center, center, center * 0.86 * r, 0, Math.PI * 2); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(center, 10); ctx.lineTo(center, size - 10); ctx.moveTo(10, center); ctx.lineTo(size - 10, center); ctx.stroke();
    for (const contact of contacts) {
      const relative = contact.position.clone().sub(player);
      if (relative.length() > 5000) continue;
      const x = relative.dot(right) * scale, y = relative.dot(forward) * scale, z = relative.dot(up) * scale;
      const px = center + x, py = center - y;
      ctx.strokeStyle = contact.hostile ? 'rgba(255,91,91,.3)' : 'rgba(84,228,213,.3)';
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py - z * 0.35); ctx.stroke();
      ctx.fillStyle = contact.hostile ? '#ff666d' : '#61e9d9'; ctx.fillRect(px - 2, py - z * 0.35 - 2, 4, 4);
    }
    ctx.fillStyle = '#d9fffa'; ctx.beginPath(); ctx.moveTo(center, center - 5); ctx.lineTo(center - 3, center + 4); ctx.lineTo(center + 3, center + 4); ctx.fill();
  }
}
