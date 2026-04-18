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
  const [cr, cg_val, cb] = hexToRgb(p.color);

  // Layered atmospheric glow — soft outer + vivid inner
  const outerGlow = ctx.createRadialGradient(p.x, p.y, p.radius * 0.8, p.x, p.y, p.radius * 3.2);
  outerGlow.addColorStop(0, `rgba(${cr},${cg_val},${cb},0.35)`);
  outerGlow.addColorStop(0.4, `rgba(${cr},${cg_val},${cb},0.12)`);
  outerGlow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = outerGlow;
  ctx.fillRect(p.x - p.radius * 3.5, p.y - p.radius * 3.5, p.radius * 7, p.radius * 7);

  // Ring (back half) — multi-band with transparency
  if (p.hasRing) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.ringTilt);
    const ringWidths = [1.45, 1.6, 1.8, 2.0];
    const ringAlphas = [0.15, 0.3, 0.2, 0.1];
    const ringThick = [3, 4, 2.5, 1.5];
    for (let i = 0; i < ringWidths.length; i++) {
      ctx.strokeStyle = `rgba(${cr},${cg_val},${cb},${ringAlphas[i]})`;
      ctx.lineWidth = ringThick[i];
      ctx.beginPath();
      ctx.ellipse(0, 0, p.radius * ringWidths[i], p.radius * ringWidths[i] * 0.22, 0, Math.PI, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Planet body — rich radial gradient
  const bodyGrad = ctx.createRadialGradient(
    p.x - p.radius * 0.35, p.y - p.radius * 0.35, p.radius * 0.05,
    p.x, p.y, p.radius
  );
  bodyGrad.addColorStop(0, shade(p.color, 1.5));
  bodyGrad.addColorStop(0.3, shade(p.color, 1.15));
  bodyGrad.addColorStop(0.65, p.color);
  bodyGrad.addColorStop(1, shade(p.color, 0.4));
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
  ctx.fillStyle = bodyGrad;
  ctx.fill();

  // Atmospheric bands (horizontal stripes clipped to sphere)
  ctx.save();
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.radius * 0.98, 0, Math.PI * 2);
  ctx.clip();
  const bandCount = 6;
  for (let i = 0; i < bandCount; i++) {
    const by = p.y - p.radius + (p.radius * 2 * i) / bandCount + p.radius * 0.08;
    const bh = (p.radius * 2) / bandCount * 0.45;
    ctx.fillStyle = i % 2 === 0
      ? `rgba(${Math.min(255, cr + 30)},${Math.min(255, cg_val + 20)},${Math.min(255, cb + 15)},0.12)`
      : `rgba(0,0,0,0.08)`;
    ctx.fillRect(p.x - p.radius, by, p.radius * 2, bh);
  }
  ctx.restore();

  // Surface detail (craters) with rotation
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rotation);
  ctx.beginPath();
  ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
  ctx.clip();
  for (const c of p.craters) {
    // Dark dimple — darker center fading outward
    const cgrad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
    cgrad.addColorStop(0, 'rgba(0,0,0,0.25)');
    cgrad.addColorStop(0.7, 'rgba(0,0,0,0.1)');
    cgrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = cgrad;
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.fill();
    // Tiny highlight rim on upper-left edge (lit from above-left)
    ctx.beginPath();
    ctx.arc(c.x - c.r * 0.3, c.y - c.r * 0.3, c.r * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fill();
  }
  ctx.restore();

  // Specular highlight — sharper, more realistic
  const hg = ctx.createRadialGradient(
    p.x - p.radius * 0.4, p.y - p.radius * 0.4, 0,
    p.x - p.radius * 0.4, p.y - p.radius * 0.4, p.radius * 0.55
  );
  hg.addColorStop(0, 'rgba(255,255,255,0.55)');
  hg.addColorStop(0.4, 'rgba(255,255,255,0.15)');
  hg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
  ctx.fillStyle = hg;
  ctx.fill();

  // Rim light (back-lit edge glow)
  ctx.save();
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
  ctx.clip();
  const rim = ctx.createRadialGradient(
    p.x - p.radius * 0.5, p.y - p.radius * 0.5, p.radius * 0.8,
    p.x, p.y, p.radius * 1.05
  );
  rim.addColorStop(0, 'rgba(0,0,0,0)');
  rim.addColorStop(0.7, 'rgba(0,0,0,0)');
  rim.addColorStop(1, `rgba(${Math.min(255, cr + 60)},${Math.min(255, cg_val + 60)},${Math.min(255, cb + 60)},0.35)`);
  ctx.fillStyle = rim;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Terminator shadow — smooth dark crescent
  const tg = ctx.createRadialGradient(
    p.x + p.radius * 0.55, p.y + p.radius * 0.55, 0,
    p.x + p.radius * 0.35, p.y + p.radius * 0.35, p.radius * 1.15
  );
  tg.addColorStop(0, 'rgba(0,0,0,0.5)');
  tg.addColorStop(0.5, 'rgba(0,0,0,0.2)');
  tg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
  ctx.fillStyle = tg;
  ctx.fill();

  // Ring (front half) — multi-band
  if (p.hasRing) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.ringTilt);
    const ringWidths = [1.45, 1.6, 1.8, 2.0];
    const ringAlphas = [0.25, 0.5, 0.35, 0.18];
    const ringThick = [3, 5, 3, 2];
    for (let i = 0; i < ringWidths.length; i++) {
      ctx.strokeStyle = `rgba(${cr},${cg_val},${cb},${ringAlphas[i]})`;
      ctx.lineWidth = ringThick[i];
      ctx.beginPath();
      ctx.ellipse(0, 0, p.radius * ringWidths[i], p.radius * ringWidths[i] * 0.22, 0, 0, Math.PI);
      ctx.stroke();
    }
    // Ring highlight
    ctx.strokeStyle = `rgba(255,255,255,0.1)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, 0, p.radius * 1.6, p.radius * 1.6 * 0.22, 0, 0.2, Math.PI * 0.6);
    ctx.stroke();
    ctx.restore();
  }

  // Orbit ring — dashed with subtle glow
  ctx.save();
  ctx.setLineDash([4, 8]);
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.orbitRadius, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(${cr},${cg_val},${cb},0.08)`;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

export function render(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  w: number,
  h: number,
  time: number
) {
  const cx = state.camera.x;

  // Deep space background — rich multi-stop gradient
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#020515');
  bg.addColorStop(0.25, '#070d2a');
  bg.addColorStop(0.5, '#0b1030');
  bg.addColorStop(0.75, '#06091e');
  bg.addColorStop(1, '#020410');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Subtle cosmic dust band (horizontal milky-way feel)
  const dustY = h * 0.42;
  const dustH = h * 0.35;
  const dust = ctx.createRadialGradient(w * 0.5, dustY, 0, w * 0.5, dustY, w * 0.7);
  dust.addColorStop(0, 'rgba(80, 70, 140, 0.04)');
  dust.addColorStop(0.5, 'rgba(50, 60, 120, 0.025)');
  dust.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = dust;
  ctx.fillRect(0, dustY - dustH / 2, w, dustH);

  // Nebulae — layered with multi-stop gradients for depth
  for (const n of state.nebulae) {
    const nx = n.x - cx * 0.12;
    if (nx + n.radius < 0 || nx - n.radius > w) continue;
    const ng = ctx.createRadialGradient(nx, n.y, 0, nx, n.y, n.radius);
    ng.addColorStop(0, n.color);
    ng.addColorStop(0.4, n.color.replace(/[\d.]+\)$/, (m) => `${parseFloat(m) * 0.5})`));
    ng.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ng;
    ctx.fillRect(nx - n.radius, n.y - n.radius, n.radius * 2, n.radius * 2);
  }

  // Stars — colored with soft glow halos
  for (const s of state.stars) {
    const sx = s.x - cx * s.parallax;
    if (sx < -10 || sx > w + 10) continue;
    const tw = 0.6 + 0.4 * Math.sin(time * s.twinkleSpeed + s.x);
    const alpha = s.brightness * tw;
    ctx.globalAlpha = alpha;

    // Soft glow halo on brighter/larger stars
    if (s.size > 1.0 && alpha > 0.5) {
      const halo = ctx.createRadialGradient(sx, s.y, 0, sx, s.y, s.size * 4);
      halo.addColorStop(0, s.color.replace(')', '').replace('rgb(', 'rgba(') || `rgba(255,255,255,${alpha * 0.15})`);
      halo.addColorStop(0, `rgba(200,220,255,${alpha * 0.12})`);
      halo.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = halo;
      ctx.fillRect(sx - s.size * 4, s.y - s.size * 4, s.size * 8, s.size * 8);
    }

    // Star dot
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(sx, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();

    // Cross-glint on bright stars
    if (s.size > 1.3) {
      ctx.globalAlpha = alpha * 0.25;
      ctx.fillStyle = s.color;
      ctx.fillRect(sx - s.size * 3, s.y - 0.25, s.size * 6, 0.5);
      ctx.fillRect(sx - 0.25, s.y - s.size * 3, 0.5, s.size * 6);
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

  // HUD — glassmorphism score panel
  ctx.save();
  // Left panel bg
  const panelW = 120, panelH = 52, panelR = 10;
  ctx.beginPath();
  ctx.roundRect(14, 14, panelW, panelH, panelR);
  ctx.fillStyle = 'rgba(10, 14, 36, 0.55)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.font = '700 26px "Inter", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#e0f2fe';
  ctx.fillText(`${state.score}`, 26, 46);
  ctx.font = '500 11px "Inter", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(125, 211, 252, 0.7)';
  ctx.fillText('METERS', 26, 60);

  // Right panel bg
  const rPanelW = 110;
  ctx.beginPath();
  ctx.roundRect(w - rPanelW - 14, 14, rPanelW, panelH, panelR);
  ctx.fillStyle = 'rgba(10, 14, 36, 0.55)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(186, 230, 253, 0.1)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.textAlign = 'right';
  ctx.font = '500 11px "Inter", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(186, 230, 253, 0.5)';
  ctx.fillText('BEST', w - 26, 36);
  ctx.font = '700 20px "Inter", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(186, 230, 253, 0.75)';
  ctx.fillText(`${state.highScore}`, w - 26, 58);
  ctx.restore();
}

export function renderMenu(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number,
  highScore: number
) {
  // Deep space background — matching gameplay quality
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#020515');
  bg.addColorStop(0.3, '#070d2a');
  bg.addColorStop(0.5, '#0b1030');
  bg.addColorStop(0.7, '#06091e');
  bg.addColorStop(1, '#020410');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Cosmic dust band
  const dustY = h * 0.45;
  const dustBand = ctx.createRadialGradient(w * 0.5, dustY, 0, w * 0.5, dustY, w * 0.6);
  dustBand.addColorStop(0, 'rgba(80, 70, 140, 0.035)');
  dustBand.addColorStop(0.5, 'rgba(50, 60, 120, 0.02)');
  dustBand.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = dustBand;
  ctx.fillRect(0, 0, w, h);

  // Animated nebula blobs
  const nebulaData = [
    { cx: w * 0.15, cy: h * 0.25, r: 220, color: 'rgba(100,80,200,0.05)' },
    { cx: w * 0.8, cy: h * 0.55, r: 280, color: 'rgba(40,120,200,0.04)' },
    { cx: w * 0.45, cy: h * 0.75, r: 200, color: 'rgba(140,50,180,0.035)' },
    { cx: w * 0.65, cy: h * 0.2, r: 160, color: 'rgba(60,60,160,0.04)' },
  ];
  for (const nb of nebulaData) {
    const drift = Math.sin(time * 0.0004 + nb.cx * 0.01) * 20;
    const ng = ctx.createRadialGradient(nb.cx + drift, nb.cy, 0, nb.cx + drift, nb.cy, nb.r);
    ng.addColorStop(0, nb.color);
    ng.addColorStop(0.5, nb.color.replace(/[\d.]+\)$/, (m) => `${parseFloat(m) * 0.4})`));
    ng.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ng;
    ctx.fillRect(nb.cx - nb.r, nb.cy - nb.r, nb.r * 2, nb.r * 2);
  }

  // Stars — colored with glow halos
  const starColors = ['#ffffff', '#cbe5ff', '#a8d8ff', '#fff5e0', '#ffe4c4', '#d4e4ff'];
  for (let i = 0; i < 160; i++) {
    const sx = (i * 137.5 + i * i * 0.3) % w;
    const sy = (i * 73.3 + i * 0.7) % h;
    const sz = ((i * 13) % 20) / 10 + 0.3;
    const tw = 0.5 + 0.5 * Math.sin(time * 0.0018 + i * 1.7);
    const alpha = tw * 0.7;
    ctx.globalAlpha = alpha;
    const sc = starColors[i % starColors.length];

    // Glow halo on larger stars
    if (sz > 1.0 && alpha > 0.45) {
      const halo = ctx.createRadialGradient(sx, sy, 0, sx, sy, sz * 4);
      halo.addColorStop(0, `rgba(200,220,255,${alpha * 0.1})`);
      halo.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = halo;
      ctx.fillRect(sx - sz * 4, sy - sz * 4, sz * 8, sz * 8);
    }

    ctx.fillStyle = sc;
    ctx.beginPath();
    ctx.arc(sx, sy, sz, 0, Math.PI * 2);
    ctx.fill();
    if (sz > 1.3) {
      ctx.globalAlpha = alpha * 0.2;
      ctx.fillRect(sx - sz * 3, sy - 0.25, sz * 6, 0.5);
      ctx.fillRect(sx - 0.25, sy - sz * 3, 0.5, sz * 6);
    }
  }
  ctx.globalAlpha = 1;

  // Demo planet — larger and more prominent
  const px = w / 2;
  const py = h / 2 + 15;
  const planet: Planet = {
    x: px,
    y: py,
    radius: 52,
    orbitRadius: 105,
    color: '#e8a838',
    glowColor: 'rgba(232,168,56,0.5)',
    accentColor: '#b87a1c',
    hasRing: true,
    ringTilt: -0.25,
    craters: [
      { x: -12, y: -10, r: 7 },
      { x: 14, y: 12, r: 6 },
      { x: -6, y: 18, r: 5 },
      { x: 8, y: -14, r: 4 },
    ],
    rotation: time * 0.0006,
  };
  drawPlanet(ctx, planet);

  // Orbiting rocket — glowing trail dot
  const orbitAngle = time * 0.002;
  const ox = px + Math.cos(orbitAngle) * 105;
  const oy = py + Math.sin(orbitAngle) * 105;
  // Trail glow
  const rg = ctx.createRadialGradient(ox, oy, 0, ox, oy, 14);
  rg.addColorStop(0, 'rgba(56,189,248,0.6)');
  rg.addColorStop(0.5, 'rgba(56,189,248,0.15)');
  rg.addColorStop(1, 'rgba(56,189,248,0)');
  ctx.fillStyle = rg;
  ctx.fillRect(ox - 14, oy - 14, 28, 28);
  ctx.beginPath();
  ctx.arc(ox, oy, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#7dd3fc';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(ox, oy, 2, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // Title — with text shadow
  ctx.textAlign = 'center';
  ctx.save();
  // Shadow pass
  ctx.shadowColor = 'rgba(56,189,248,0.3)';
  ctx.shadowBlur = 30;
  ctx.fillStyle = '#f0f9ff';
  ctx.font = '800 48px "Inter", system-ui, sans-serif';
  ctx.fillText('ORBIT', w / 2, py - 140);
  ctx.shadowBlur = 0;
  ctx.restore();
  ctx.font = '300 26px "Inter", system-ui, sans-serif';
  ctx.fillStyle = '#7dd3fc';
  ctx.fillText('SLINGSHOT', w / 2, py - 104);

  // Decorative line
  const lineGrad = ctx.createLinearGradient(w / 2 - 60, 0, w / 2 + 60, 0);
  lineGrad.addColorStop(0, 'rgba(56,189,248,0)');
  lineGrad.addColorStop(0.5, 'rgba(56,189,248,0.4)');
  lineGrad.addColorStop(1, 'rgba(56,189,248,0)');
  ctx.fillStyle = lineGrad;
  ctx.fillRect(w / 2 - 60, py - 88, 120, 1);

  // Subtitle
  ctx.font = '400 13px "Inter", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(186, 230, 253, 0.55)';
  ctx.fillText('Tap to release  ·  Auto-orbit the next planet', w / 2, py + 140);

  // CTA — pulsing with glow
  const pulse = 0.65 + 0.35 * Math.sin(time * 0.004);
  ctx.globalAlpha = pulse;
  ctx.save();
  ctx.shadowColor = 'rgba(56,189,248,0.5)';
  ctx.shadowBlur = 15;
  ctx.font = '600 18px "Inter", system-ui, sans-serif';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText('TAP TO START', w / 2, py + 178);
  ctx.restore();
  ctx.globalAlpha = 1;

  if (highScore > 0) {
    ctx.font = '500 12px "Inter", system-ui, sans-serif';
    ctx.fillStyle = 'rgba(186, 230, 253, 0.4)';
    ctx.fillText(`BEST  ${highScore} m`, w / 2, py + 210);
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
  // Dark overlay with vignette
  ctx.fillStyle = 'rgba(4, 6, 15, 0.85)';
  ctx.fillRect(0, 0, w, h);
  const vig = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.8);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.4)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  // Card panel
  const cardW = Math.min(280, w * 0.8);
  const cardH = 220;
  const cardX = (w - cardW) / 2;
  const cardY = (h - cardH) / 2 - 10;
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 16);
  ctx.fillStyle = 'rgba(10, 14, 36, 0.65)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(248, 113, 113, 0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.textAlign = 'center';

  // Title with glow
  ctx.save();
  ctx.shadowColor = 'rgba(248,113,113,0.4)';
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#f87171';
  ctx.font = '700 32px "Inter", system-ui, sans-serif';
  ctx.fillText('GAME OVER', w / 2, cardY + 50);
  ctx.restore();

  // Divider
  const divGrad = ctx.createLinearGradient(w / 2 - 50, 0, w / 2 + 50, 0);
  divGrad.addColorStop(0, 'rgba(248,113,113,0)');
  divGrad.addColorStop(0.5, 'rgba(248,113,113,0.3)');
  divGrad.addColorStop(1, 'rgba(248,113,113,0)');
  ctx.fillStyle = divGrad;
  ctx.fillRect(w / 2 - 50, cardY + 62, 100, 1);

  // Score
  ctx.fillStyle = '#f0f9ff';
  ctx.font = '800 52px "Inter", system-ui, sans-serif';
  ctx.fillText(`${score}`, w / 2, cardY + 120);
  ctx.font = '500 11px "Inter", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(186, 230, 253, 0.5)';
  ctx.fillText('METERS', w / 2, cardY + 140);

  if (isNew) {
    ctx.save();
    ctx.shadowColor = 'rgba(251,191,36,0.5)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#fbbf24';
    ctx.font = '600 14px "Inter", system-ui, sans-serif';
    ctx.fillText('★ NEW BEST ★', w / 2, cardY + 170);
    ctx.restore();
  } else {
    ctx.font = '500 12px "Inter", system-ui, sans-serif';
    ctx.fillStyle = 'rgba(186, 230, 253, 0.45)';
    ctx.fillText(`BEST  ${highScore}`, w / 2, cardY + 170);
  }

  // Retry CTA below card
  ctx.save();
  ctx.shadowColor = 'rgba(56,189,248,0.4)';
  ctx.shadowBlur = 12;
  ctx.fillStyle = '#38bdf8';
  ctx.font = '600 16px "Inter", system-ui, sans-serif';
  ctx.fillText('TAP TO RETRY', w / 2, cardY + cardH + 40);
  ctx.restore();
}
