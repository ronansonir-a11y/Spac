import './style.css';
import { layout } from './UI/layout';
import { Game } from './Game';

const app = document.getElementById('app')!;
app.innerHTML = layout;
const game = new Game(document.getElementById('game-canvas') as HTMLCanvasElement);

const manual = document.getElementById('manual')!;
document.getElementById('how-button')!.addEventListener('click', () => manual.classList.remove('hidden'));
document.getElementById('close-manual')!.addEventListener('click', () => manual.classList.add('hidden'));
document.getElementById('launch')!.addEventListener('click', () => game.start());

if (import.meta.env.DEV) {
  Object.assign(window, { __AETHER6__: game });
}
