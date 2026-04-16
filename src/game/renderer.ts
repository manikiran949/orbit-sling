import { GameState, Planet } from './types';

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function shade(hex: string, factor: number): string {
  const [r, g, b] = hexToRgb(hex);
  const nr = Math.max(0, Math.min(255, Math.floor(r * factor)));
  const ng = Math.max(0, Math.min(255, Math.floor(g * factor)));
  const nb = Math.max(0, Math.min(255, Math.floor(b * factor)));
  return `rgb(${nr},${ng},${nb})`;
}

function drawPlanet(ctx: CanvasRenderingContext2D, p: Planet) {
  // Outer atmospheric glow
  const outerGlow = ctx.createRadialGradient(p.x, p.y, p.radius * 0.9, p.x, p.y, p.radius * 2.6);
  outerGlow.addColorStop(0, p.glowColor);
  outerGlow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = outerGlow;
  ctx.fillRect(p.x - p.radius * 3, p.y - p.radius * 3, p.radius * 6, p.radius * 6);

  // Ring (back half)
  if (p.hasRing) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.ringTilt);
    ctx.strokeStyle = `${p.accentColor}99`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, p.radius * 1.6, p.radius * 0.4, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Planet body — radial gradient for sphere shading
  const bodyGrad = ctx.createRadialGradient(
    p.x - p.radius * 0.4,
    p.y - p.radius * 0.4,
    p.radius * 0.1,
    p.x,
    p.y,
    p.radius
  );
  bodyGrad.addColorStop(0, shade(p.color, 1.25));
  bodyGrad.addColorStop(0.5, p.color);
  bodyGrad.addColorStop(1, shade(p.color, 0.55));
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
  ctx.fillStyle = bodyGrad;
  ctx.fill();

  // Craters with rotation
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rotation);
  ctx.beginPath();
  ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
  ctx.clip();
  for (const c of p.craters) {
    const cg = ctx.createRadialGradient(c.x - c.r * 0.3, c.y - c.r * 0.3, 0, c.x, c.y, c.r);
    cg.addColorStop(0, `${p.accentColor}cc`);
    cg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Specular highlight
  const hg = ctx.createRadialGradient(
    p.x - p.radius * 0.45,
    p.y - p.radius * 0.45,
    0,
    p.x - p.radius * 0.45,
    p.y - p.radius * 0.45,
    p.radius * 0.5
  );
  hg.addColorStop(0, 'rgba(255,255,255,0.45)');
  hg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
  ctx.fillStyle = hg;
  ctx.fill();

  // Terminator shadow (subtle dark crescent)
  const tg = ctx.createRadialGradient(
    p.x + p.radius * 0.6,
    p.y + p.radius * 0.6,
    0,
    p.x + p.radius * 0.4,
    p.y + p.radius * 0.4,
    p.radius * 1.1
  );
  tg.addColorStop(0, 'rgba(0,0,0,0.4)');
  tg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
  ctx.fillStyle = tg;
  ctx.fill();

  // Ring (front half)
  if (p.hasRing) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.ringTilt);
    ctx.strokeStyle = p.accentColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, p.radius * 1.6, p.radius * 0.4, 0, 0, Math.PI);
    ctx.stroke();
    ctx.restore();
  }

  // Orbit ring (faint)
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.orbitRadius, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

export function render(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  w: number,
  h: number,
  time: number
) {
  const cx = state.camera.x;

  // Deep space background gradient
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#06081a');
  bg.addColorStop(0.5, '#0a0e24');
  bg.addColorStop(1, '#04060f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Nebulae (deep parallax)
  for (const n of state.nebulae) {
    const nx = n.x - cx * 0.15;
    if (nx + n.radius < 0 || nx - n.radius > w) continue;
    const ng = ctx.createRadialGradient(nx, n.y, 0, nx, n.y, n.radius);
    ng.addColorStop(0, n.color);
    ng.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ng;
    ctx.fillRect(nx - n.radius, n.y - n.radius, n.radius * 2, n.radius * 2);
  }

  // Stars (parallax + twinkle)
  for (const s of state.stars) {
    const sx = s.x - cx * s.parallax;
    if (sx < -10 || sx > w + 10) continue;
    const tw = 0.6 + 0.4 * Math.sin(time * s.twinkleSpeed + s.x);
    ctx.globalAlpha = s.brightness * tw;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(sx, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();
    if (s.size > 1.5) {
      // Bright stars get a subtle cross-glint
      ctx.globalAlpha *= 0.4;
      ctx.fillRect(sx - s.size * 2.5, s.y - 0.3, s.size * 5, 0.6);
      ctx.fillRect(sx - 0.3, s.y - s.size * 2.5, 0.6, s.size * 5);
    }
  }
  ctx.globalAlpha = 1;

  ctx.save();
  ctx.translate(-cx, 0);

  // Planets
  for (const p of state.planets) {
    if (p.x - cx < -p.radius * 4 || p.x - cx > w + p.radius * 4) continue;
    drawPlanet(ctx, p);
  }

  // Asteroids
  for (const a of state.asteroids) {
    if (a.x - cx < -50 || a.x - cx > w + 50) continue;
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(a.rotation);
    ctx.beginPath();
    const n = a.vertices.length;
    for (let i = 0; i <= n; i++) {
      const ang = (i / n) * Math.PI * 2;
      const r = a.vertices[i % n];
      const px = Math.cos(ang) * r;
      const py = Math.sin(ang) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    const ag = ctx.createRadialGradient(-a.radius * 0.3, -a.radius * 0.3, 0, 0, 0, a.radius);
    ag.addColorStop(0, '#8a4a4a');
    ag.addColorStop(1, '#3d1f1f');
    ctx.fillStyle = ag;
    ctx.fill();
    ctx.strokeStyle = '#a85d5d';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Spike highlight
    ctx.fillStyle = 'rgba(255,180,150,0.25)';
    ctx.beginPath();
    ctx.arc(-a.radius * 0.3, -a.radius * 0.3, a.radius * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Particles
  for (const p of state.particles) {
    const a = p.life / p.maxLife;
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Rocket trail (glowing gradient line)
  const trail = state.rocket.trail;
  if (trail.length > 1) {
    for (let i = 1; i < trail.length; i++) {
      const alpha = i / trail.length;
      ctx.beginPath();
      ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
      ctx.lineTo(trail[i].x, trail[i].y);
      ctx.strokeStyle = `hsla(190, 95%, 60%, ${alpha * 0.85})`;
      ctx.lineWidth = alpha * 4;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
    // Outer glow pass
    for (let i = 1; i < trail.length; i++) {
      const alpha = i / trail.length;
      ctx.beginPath();
      ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
      ctx.lineTo(trail[i].x, trail[i].y);
      ctx.strokeStyle = `hsla(190, 95%, 70%, ${alpha * 0.2})`;
      ctx.lineWidth = alpha * 9;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }

  // Rocket
  const r = state.rocket;
  ctx.save();
  ctx.translate(r.x, r.y);
  ctx.rotate(r.angle);

  // Engine flame
  const flameSize = 10 + Math.sin(time * 0.025) * 3;
  const flameGrad = ctx.createLinearGradient(-8, 0, -8 - flameSize, 0);
  flameGrad.addColorStop(0, '#fef3c7');
  flameGrad.addColorStop(0.4, '#f59e0b');
  flameGrad.addColorStop(1, 'rgba(220,38,38,0)');
  ctx.fillStyle = flameGrad;
  ctx.beginPath();
  ctx.moveTo(-7, -4);
  ctx.lineTo(-8 - flameSize, 0);
  ctx.lineTo(-7, 4);
  ctx.closePath();
  ctx.fill();

  // Rocket body — sleek shape
  ctx.beginPath();
  ctx.moveTo(13, 0);
  ctx.lineTo(-2, -5);
  ctx.lineTo(-8, -5);
  ctx.lineTo(-8, 5);
  ctx.lineTo(-2, 5);
  ctx.closePath();
  const bodyGrad = ctx.createLinearGradient(0, -5, 0, 5);
  bodyGrad.addColorStop(0, '#f0f9ff');
  bodyGrad.addColorStop(0.5, '#bae6fd');
  bodyGrad.addColorStop(1, '#0284c7');
  ctx.fillStyle = bodyGrad;
  ctx.fill();
  ctx.strokeStyle = '#0c4a6e';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Cockpit window
  ctx.beginPath();
  ctx.arc(4, 0, 2.2, 0, Math.PI * 2);
  ctx.fillStyle = '#22d3ee';
  ctx.fill();
  ctx.strokeStyle = '#0c4a6e';
  ctx.stroke();

  // Fins
  ctx.fillStyle = '#0284c7';
  ctx.beginPath();
  ctx.moveTo(-6, -5);
  ctx.lineTo(-9, -8);
  ctx.lineTo(-3, -5);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-6, 5);
  ctx.lineTo(-9, 8);
  ctx.lineTo(-3, 5);
  ctx.closePath();
  ctx.fill();

  ctx.restore();

  // Orbit indicator + tether
  if (state.isOrbiting && state.orbitPlanetIndex >= 0) {
    const p = state.planets[state.orbitPlanetIndex];
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.orbitRadius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 7]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Tether
    ctx.beginPath();
    ctx.moveTo(r.x, r.y);
    ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.18)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Direction indicator (small arrow ahead of rocket)
    const tangentAngle = state.orbitAngle + (state.orbitDirection * Math.PI / 2);
    const ax = r.x + Math.cos(tangentAngle) * 22;
    const ay = r.y + Math.sin(tangentAngle) * 22;
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(tangentAngle);
    ctx.fillStyle = 'rgba(186, 230, 253, 0.55)';
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(-3, -3);
    ctx.lineTo(-3, 3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();

  // HUD — crisp text
  ctx.font = '600 28px "Inter", system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#e0f2fe';
  ctx.fillText(`${state.score}`, 24, 44);
  ctx.font = '500 13px "Inter", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(186, 230, 253, 0.6)';
  ctx.fillText('METERS', 24, 62);

  ctx.textAlign = 'right';
  ctx.font = '500 13px "Inter", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(186, 230, 253, 0.5)';
  ctx.fillText(`BEST  ${state.highScore}`, w - 24, 44);
}

export function renderMenu(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number,
  highScore: number
) {
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#06081a');
  bg.addColorStop(1, '#04060f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Static stars for menu
  for (let i = 0; i < 80; i++) {
    const sx = (i * 137.5) % w;
    const sy = (i * 73.3) % h;
    const sz = ((i * 13) % 20) / 10 + 0.5;
    const tw = 0.5 + 0.5 * Math.sin(time * 0.002 + i);
    ctx.globalAlpha = tw * 0.8;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(sx, sy, sz, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Demo planet
  const px = w / 2;
  const py = h / 2 + 10;
  const planet: Planet = {
    x: px,
    y: py,
    radius: 42,
    orbitRadius: 90,
    color: '#e8a838',
    glowColor: 'rgba(232,168,56,0.5)',
    accentColor: '#b87a1c',
    hasRing: true,
    ringTilt: -0.3,
    craters: [
      { x: -10, y: -8, r: 6 },
      { x: 12, y: 10, r: 5 },
      { x: -5, y: 16, r: 4 },
    ],
    rotation: time * 0.0008,
  };
  drawPlanet(ctx, planet);

  // Orbiting rocket dot
  const orbitAngle = time * 0.0025;
  const ox = px + Math.cos(orbitAngle) * 90;
  const oy = py + Math.sin(orbitAngle) * 90;
  ctx.beginPath();
  ctx.arc(ox, oy, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#38bdf8';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(ox, oy, 8, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(56,189,248,0.3)';
  ctx.fill();

  // Title
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f0f9ff';
  ctx.font = '700 44px "Inter", system-ui, sans-serif';
  ctx.fillText('ORBIT', w / 2, py - 130);
  ctx.font = '300 28px "Inter", system-ui, sans-serif';
  ctx.fillStyle = '#7dd3fc';
  ctx.fillText('SLINGSHOT', w / 2, py - 95);

  // Subtitle
  ctx.font = '400 14px "Inter", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(186, 230, 253, 0.65)';
  ctx.fillText('Tap to release · Auto-orbit the next planet', w / 2, py + 130);

  // CTA
  const pulse = 0.7 + 0.3 * Math.sin(time * 0.005);
  ctx.globalAlpha = pulse;
  ctx.font = '600 18px "Inter", system-ui, sans-serif';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText('TAP TO START', w / 2, py + 170);
  ctx.globalAlpha = 1;

  if (highScore > 0) {
    ctx.font = '500 13px "Inter", system-ui, sans-serif';
    ctx.fillStyle = 'rgba(186, 230, 253, 0.45)';
    ctx.fillText(`BEST  ${highScore} m`, w / 2, py + 200);
  }
}

export function renderGameOver(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  score: number,
  highScore: number,
  isNew: boolean
) {
  ctx.fillStyle = 'rgba(6, 8, 26, 0.82)';
  ctx.fillRect(0, 0, w, h);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#f87171';
  ctx.font = '700 38px "Inter", system-ui, sans-serif';
  ctx.fillText('GAME OVER', w / 2, h / 2 - 60);

  ctx.fillStyle = '#f0f9ff';
  ctx.font = '700 56px "Inter", system-ui, sans-serif';
  ctx.fillText(`${score}`, w / 2, h / 2 + 5);
  ctx.font = '500 12px "Inter", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(186, 230, 253, 0.5)';
  ctx.fillText('METERS', w / 2, h / 2 + 25);

  if (isNew) {
    ctx.fillStyle = '#fbbf24';
    ctx.font = '600 14px "Inter", system-ui, sans-serif';
    ctx.fillText('★ NEW BEST', w / 2, h / 2 + 55);
  } else {
    ctx.font = '500 13px "Inter", system-ui, sans-serif';
    ctx.fillStyle = 'rgba(186, 230, 253, 0.5)';
    ctx.fillText(`BEST  ${highScore}`, w / 2, h / 2 + 55);
  }

  ctx.fillStyle = '#38bdf8';
  ctx.font = '600 16px "Inter", system-ui, sans-serif';
  ctx.fillText('TAP TO RETRY', w / 2, h / 2 + 105);
}
