import { GameState } from './types';

const STAR_COUNT = 120;
let stars: { x: number; y: number; size: number; brightness: number }[] = [];

function initStars(w: number, h: number) {
  stars = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push({
      x: Math.random() * w * 4,
      y: Math.random() * h,
      size: Math.random() * 1.5 + 0.5,
      brightness: Math.random() * 0.6 + 0.4,
    });
  }
}

export function render(ctx: CanvasRenderingContext2D, state: GameState, w: number, h: number, time: number) {
  if (stars.length === 0) initStars(w, h);

  const cx = state.camera.x;
  const cy = state.camera.y;

  // Background
  ctx.fillStyle = '#080c18';
  ctx.fillRect(0, 0, w, h);

  // Stars (parallax)
  ctx.fillStyle = '#ffffff';
  for (const s of stars) {
    const sx = ((s.x - cx * 0.3) % (w * 2) + w * 2) % (w * 2);
    const sy = s.y;
    ctx.globalAlpha = s.brightness * (0.7 + 0.3 * Math.sin(time * 0.002 + s.x));
    ctx.fillRect(sx, sy, s.size, s.size);
  }
  ctx.globalAlpha = 1;

  ctx.save();
  ctx.translate(-cx, -cy);

  // Planets
  for (const p of state.planets) {
    // Orbit ring
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.orbitRadius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Glow
    const grad = ctx.createRadialGradient(p.x, p.y, p.radius * 0.5, p.x, p.y, p.radius * 2.5);
    grad.addColorStop(0, p.glowColor);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(p.x - p.radius * 3, p.y - p.radius * 3, p.radius * 6, p.radius * 6);

    // Planet body
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();

    // Highlight
    ctx.beginPath();
    ctx.arc(p.x - p.radius * 0.3, p.y - p.radius * 0.3, p.radius * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fill();
  }

  // Asteroids
  for (const a of state.asteroids) {
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(a.rotation + time * 0.001);
    ctx.beginPath();
    const n = a.vertices.length;
    for (let i = 0; i <= n; i++) {
      const angle = (i / n) * Math.PI * 2;
      const r = a.vertices[i % n];
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = '#6b3a3a';
    ctx.fill();
    ctx.strokeStyle = '#9c5555';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  // Rocket trail
  const trail = state.rocket.trail;
  if (trail.length > 1) {
    for (let i = 1; i < trail.length; i++) {
      const alpha = i / trail.length;
      ctx.beginPath();
      ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
      ctx.lineTo(trail[i].x, trail[i].y);
      ctx.strokeStyle = `hsla(190, 90%, 55%, ${alpha * 0.7})`;
      ctx.lineWidth = alpha * 3;
      ctx.stroke();
    }
  }

  // Rocket
  const r = state.rocket;
  ctx.save();
  ctx.translate(r.x, r.y);
  ctx.rotate(r.angle);

  // Flame
  const flameSize = 8 + Math.sin(time * 0.02) * 3;
  ctx.beginPath();
  ctx.moveTo(-8, 0);
  ctx.lineTo(-8 - flameSize, -4);
  ctx.lineTo(-8 - flameSize * 0.6, 0);
  ctx.lineTo(-8 - flameSize, 4);
  ctx.closePath();
  ctx.fillStyle = '#f59e0b';
  ctx.fill();

  // Body
  ctx.beginPath();
  ctx.moveTo(12, 0);
  ctx.lineTo(-8, -5);
  ctx.lineTo(-6, 0);
  ctx.lineTo(-8, 5);
  ctx.closePath();
  ctx.fillStyle = '#e0f2fe';
  ctx.fill();
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();

  // Orbit indicator
  if (state.isOrbiting && state.orbitPlanetIndex >= 0) {
    const p = state.planets[state.orbitPlanetIndex];
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.orbitRadius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 8]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Tether line
    ctx.beginPath();
    ctx.moveTo(r.x, r.y);
    ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  ctx.restore();

  // UI - Score
  ctx.fillStyle = '#e0f2fe';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${state.score}m`, 20, 36);

  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(224, 242, 254, 0.5)';
  ctx.fillText(`Best: ${state.highScore}m`, 20, 56);
}

export function renderMenu(ctx: CanvasRenderingContext2D, w: number, h: number, time: number, highScore: number) {
  ctx.fillStyle = '#080c18';
  ctx.fillRect(0, 0, w, h);

  if (stars.length === 0) initStars(w, h);
  for (const s of stars) {
    const sx = (s.x % w + w) % w;
    ctx.globalAlpha = s.brightness * (0.7 + 0.3 * Math.sin(time * 0.002 + s.x));
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(sx, s.y, s.size, s.size);
  }
  ctx.globalAlpha = 1;

  // Demo planet
  const px = w / 2;
  const py = h / 2 - 20;
  const grad = ctx.createRadialGradient(px, py, 15, px, py, 80);
  grad.addColorStop(0, '#e8a83866');
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.fillRect(px - 100, py - 100, 200, 200);
  ctx.beginPath();
  ctx.arc(px, py, 30, 0, Math.PI * 2);
  ctx.fillStyle = '#e8a838';
  ctx.fill();

  // Orbiting dot
  const orbitAngle = time * 0.003;
  const ox = px + Math.cos(orbitAngle) * 65;
  const oy = py + Math.sin(orbitAngle) * 65;
  ctx.beginPath();
  ctx.arc(ox, oy, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#38bdf8';
  ctx.fill();

  // Orbit ring
  ctx.beginPath();
  ctx.arc(px, py, 65, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#e0f2fe';
  ctx.font = 'bold 32px system-ui, sans-serif';
  ctx.fillText('Orbit Slingshot', w / 2, py - 80);

  ctx.font = '14px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(224, 242, 254, 0.6)';
  ctx.fillText('Tap to release · Auto-orbits the next planet', w / 2, py + 90);

  const pulse = 0.7 + 0.3 * Math.sin(time * 0.005);
  ctx.globalAlpha = pulse;
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText('Tap to Start', w / 2, py + 130);
  ctx.globalAlpha = 1;

  if (highScore > 0) {
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(224, 242, 254, 0.4)';
    ctx.fillText(`Best: ${highScore}m`, w / 2, py + 160);
  }
}

export function renderGameOver(ctx: CanvasRenderingContext2D, w: number, h: number, score: number, highScore: number, isNew: boolean) {
  ctx.fillStyle = 'rgba(8, 12, 24, 0.85)';
  ctx.fillRect(0, 0, w, h);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ef4444';
  ctx.font = 'bold 36px system-ui, sans-serif';
  ctx.fillText('Game Over', w / 2, h / 2 - 50);

  ctx.fillStyle = '#e0f2fe';
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillText(`${score}m`, w / 2, h / 2);

  if (isNew) {
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText('🏆 New Best!', w / 2, h / 2 + 28);
  }

  ctx.font = '14px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(224, 242, 254, 0.5)';
  ctx.fillText(`Best: ${highScore}m`, w / 2, h / 2 + 55);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText('Tap to Retry', w / 2, h / 2 + 95);
}
