import { GameState, Planet } from './types';

export const GAME_OVER_LAYOUT = {
  cardWidthMax: 300,
  cardHeight: 415,
  cardYOffset: -10,
  shareButtonWidth: 160,
  shareButtonHeight: 36,
  shareButtonYOffset: 55,
} as const;

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

function getDeathFeedback(deathReason: GameState['deathReason']): { title: string; tip: string; accent: string } {
  switch (deathReason) {
    case 'asteroid':
      return {
        title: 'CRASHED INTO ASTEROID',
        tip: 'Tip: Release a little earlier and avoid dense rock lanes.',
        accent: '#fb7185',
      };
    case 'out-of-bounds':
      return {
        title: 'LOST IN SPACE',
        tip: 'Tip: Use a backtrack orbit to re-aim before committing.',
        accent: '#fb923c',
      };
    case 'fell-behind':
      return {
        title: 'MOMENTUM LOST',
        tip: 'Tip: Chain forward captures to keep pace with the camera.',
        accent: '#38bdf8',
      };
    default:
      return {
        title: 'RUN ENDED',
        tip: 'Tip: One clean release can recover most bad trajectories.',
        accent: '#94a3b8',
      };
  }
}

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];

  const lines: string[] = [];
  let current = words[0];

  for (let i = 1; i < words.length; i++) {
    const candidate = `${current} ${words[i]}`;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = words[i];
      if (lines.length === maxLines) break;
    }
  }

  if (lines.length < maxLines) {
    lines.push(current);
  }

  if (lines.length > maxLines) {
    lines.length = maxLines;
  }

  if (lines.length === maxLines) {
    const allWordsUsed = lines.join(' ').split(/\s+/).length;
    if (allWordsUsed < words.length) {
      const base = lines[maxLines - 1];
      let truncated = base;
      while (truncated.length > 0 && ctx.measureText(`${truncated}…`).width > maxWidth) {
        truncated = truncated.slice(0, -1);
      }
      lines[maxLines - 1] = `${truncated}…`;
    }
  }

  return lines;
}

function drawEarth(ctx: CanvasRenderingContext2D, p: Planet) {
  const r = p.radius;

  // Atmosphere glow — soft blue
  const outerGlow = ctx.createRadialGradient(p.x, p.y, r * 0.85, p.x, p.y, r * 2.8);
  outerGlow.addColorStop(0, 'rgba(80,160,255,0.22)');
  outerGlow.addColorStop(0.5, 'rgba(60,140,220,0.08)');
  outerGlow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = outerGlow;
  ctx.fillRect(p.x - r * 3, p.y - r * 3, r * 6, r * 6);

  // Ocean body
  const bodyGrad = ctx.createRadialGradient(
    p.x - r * 0.3, p.y - r * 0.3, r * 0.05,
    p.x, p.y, r
  );
  bodyGrad.addColorStop(0, '#5b9df5');
  bodyGrad.addColorStop(0.35, '#2563eb');
  bodyGrad.addColorStop(0.7, '#1d4ed8');
  bodyGrad.addColorStop(1, '#1e3a6e');
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fillStyle = bodyGrad;
  ctx.fill();

  // Continents — small clusters of circles, muted earthy tones
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rotation);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.96, 0, Math.PI * 2);
  ctx.clip();

  const lands = [
    { x: -r*0.32, y: -r*0.3, s: r*0.1, a: 0.45 },
    { x: -r*0.25, y: -r*0.2, s: r*0.12, a: 0.4 },
    { x: -r*0.28, y: -r*0.1, s: r*0.08, a: 0.35 },
    { x: -r*0.22, y: 0.0, s: r*0.07, a: 0.3 },
    { x: -r*0.18, y: r*0.1, s: r*0.06, a: 0.25 },
    { x: r*0.15, y: -r*0.25, s: r*0.09, a: 0.4 },
    { x: r*0.25, y: -r*0.18, s: r*0.11, a: 0.45 },
    { x: r*0.35, y: -r*0.12, s: r*0.08, a: 0.35 },
    { x: r*0.28, y: -r*0.05, s: r*0.07, a: 0.3 },
    { x: r*0.08, y: r*0.2, s: r*0.09, a: 0.4 },
    { x: r*0.12, y: r*0.3, s: r*0.08, a: 0.35 },
    { x: r*0.05, y: r*0.35, s: r*0.06, a: 0.25 },
    { x: -r*0.05, y: -r*0.5, s: r*0.05, a: 0.3 },
  ];
  for (const d of lands) {
    const cg = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.s);
    cg.addColorStop(0, `rgba(55,120,55,${d.a})`);
    cg.addColorStop(0.7, `rgba(70,110,45,${d.a * 0.6})`);
    cg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.s, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cloud wisps
  ctx.globalAlpha = 0.13;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(-r*0.35, -r*0.08, r*0.2, r*0.022, 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(r*0.15, -r*0.3, r*0.16, r*0.018, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(r*0.05, r*0.22, r*0.14, r*0.016, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();

  // Specular highlight
  const hg = ctx.createRadialGradient(
    p.x - r * 0.38, p.y - r * 0.38, 0,
    p.x - r * 0.38, p.y - r * 0.38, r * 0.5
  );
  hg.addColorStop(0, 'rgba(255,255,255,0.45)');
  hg.addColorStop(0.35, 'rgba(255,255,255,0.1)');
  hg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fillStyle = hg;
  ctx.fill();

  // Terminator shadow
  const tg = ctx.createRadialGradient(
    p.x + r * 0.5, p.y + r * 0.5, 0,
    p.x + r * 0.35, p.y + r * 0.35, r * 1.1
  );
  tg.addColorStop(0, 'rgba(0,0,0,0.45)');
  tg.addColorStop(0.5, 'rgba(0,0,0,0.15)');
  tg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fillStyle = tg;
  ctx.fill();

  // Thin atmosphere rim
  ctx.beginPath();
  ctx.arc(p.x, p.y, r + 1, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(100,180,255,0.18)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Mark Earths whose +50 reward was already claimed.
  if (p.earthBonusClaimed) {
    const badgeR = Math.max(7, r * 0.2);
    const badgeX = p.x + r * 0.5;
    const badgeY = p.y - r * 0.5;

    ctx.save();
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(16,185,129,0.92)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(209,250,229,0.9)';
    ctx.lineWidth = 1.3;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(badgeX - badgeR * 0.45, badgeY + badgeR * 0.02);
    ctx.lineTo(badgeX - badgeR * 0.1, badgeY + badgeR * 0.34);
    ctx.lineTo(badgeX + badgeR * 0.5, badgeY - badgeR * 0.32);
    ctx.strokeStyle = '#ecfdf5';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  // Orbit ring
  ctx.save();
  ctx.setLineDash([4, 8]);
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.orbitRadius, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(59,130,246,0.1)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawRocketShip(ctx: CanvasRenderingContext2D, time: number, type: 'aerospace' | 'classic' | 'stealth') {
  if (type === 'aerospace') {
    // Ambient glow around rocket
    const rocketGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, 28);
    rocketGlow.addColorStop(0, 'rgba(56,189,248,0.2)');
    rocketGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rocketGlow;
    ctx.fillRect(-28, -28, 56, 56);

    // Engine flame — high-tech ion drive
    const flicker1 = Math.sin(time * 0.05) * 0.2 + 0.9;
    const flicker2 = Math.sin(time * 0.08 + 1) * 0.2 + 0.9;
    const flameLen = 22 * flicker1;
    const flameLen2 = 12 * flicker2;

    ctx.globalCompositeOperation = 'screen';
    
    // Outer ion plume
    const outerFlame = ctx.createLinearGradient(-10, 0, -10 - flameLen, 0);
    outerFlame.addColorStop(0, 'rgba(56, 189, 248, 0.9)');
    outerFlame.addColorStop(0.4, 'rgba(14, 165, 233, 0.4)');
    outerFlame.addColorStop(1, 'rgba(2, 132, 199, 0)');
    ctx.fillStyle = outerFlame;
    ctx.beginPath();
    ctx.moveTo(-10, -4);
    ctx.lineTo(-10 - flameLen, 0);
    ctx.lineTo(-10, 4);
    ctx.closePath();
    ctx.fill();

    // Inner plasma core
    const innerFlame = ctx.createLinearGradient(-10, 0, -10 - flameLen2, 0);
    innerFlame.addColorStop(0, '#ffffff');
    innerFlame.addColorStop(0.5, '#7dd3fc');
    innerFlame.addColorStop(1, 'rgba(125, 211, 252, 0)');
    ctx.fillStyle = innerFlame;
    ctx.beginPath();
    ctx.moveTo(-10, -2);
    ctx.lineTo(-10 - flameLen2, 0);
    ctx.lineTo(-10, 2);
    ctx.closePath();
    ctx.fill();

    ctx.globalCompositeOperation = 'source-over';

    // Delta Wings — Sleek aerospace aesthetic
    const drawWing = (yDir: number) => {
      ctx.beginPath();
      ctx.moveTo(0, 3 * yDir);
      ctx.lineTo(-6, 12 * yDir);
      ctx.lineTo(-12, 12 * yDir);
      ctx.lineTo(-10, 4 * yDir);
      ctx.closePath();
      
      const wingGrad = ctx.createLinearGradient(-10, 3 * yDir, 0, 12 * yDir);
      wingGrad.addColorStop(0, '#f8fafc');
      wingGrad.addColorStop(1, '#94a3b8');
      ctx.fillStyle = wingGrad;
      ctx.fill();
      
      // Racing stripe on the wing
      ctx.beginPath();
      ctx.moveTo(-2, 4 * yDir);
      ctx.lineTo(-7, 11 * yDir);
      ctx.lineTo(-8.5, 11 * yDir);
      ctx.lineTo(-3.5, 4 * yDir);
      ctx.fillStyle = '#f97316'; // Vibrant orange
      ctx.fill();
      
      // Wing outline
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.stroke();
    };
    drawWing(1);
    drawWing(-1);

    // Jet Canards (small front wings)
    const drawCanard = (yDir: number) => {
      ctx.beginPath();
      ctx.moveTo(10, 2 * yDir);
      ctx.lineTo(6, 6 * yDir);
      ctx.lineTo(4, 6 * yDir);
      ctx.lineTo(6, 2 * yDir);
      ctx.closePath();
      ctx.fillStyle = '#cbd5e1';
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
    drawCanard(1);
    drawCanard(-1);

    // Main Hull (sleek aerodynamic bullet)
    ctx.beginPath();
    ctx.moveTo(18, 0); // Very sharp nose
    ctx.bezierCurveTo(12, -4.5, 0, -5, -12, -4);
    ctx.lineTo(-12, 4);
    ctx.bezierCurveTo(0, 5, 12, 4.5, 18, 0);
    ctx.closePath();
    
    // Clean white glossy hull
    const hullGrad = ctx.createLinearGradient(-12, -5, 18, 5);
    hullGrad.addColorStop(0, '#e2e8f0');
    hullGrad.addColorStop(0.3, '#ffffff');
    hullGrad.addColorStop(0.8, '#f8fafc');
    hullGrad.addColorStop(1, '#ffffff');
    ctx.fillStyle = hullGrad;
    ctx.fill();
    
    // Dimensional under-shadow
    const hullUnder = ctx.createLinearGradient(0, 0, 0, 5);
    hullUnder.addColorStop(0, 'rgba(0,0,0,0)');
    hullUnder.addColorStop(1, 'rgba(71,85,105,0.2)');
    ctx.fillStyle = hullUnder;
    ctx.fill();

    // Vibrant Orange Racing Stripe down the hull
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-12, 0);
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Engine nozzle housing
    ctx.beginPath();
    ctx.moveTo(-11, -3);
    ctx.lineTo(-13.5, -4);
    ctx.lineTo(-13.5, 4);
    ctx.lineTo(-11, 3);
    ctx.closePath();
    ctx.fillStyle = '#334155';
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Golden Reflection Cockpit 
    ctx.beginPath();
    ctx.moveTo(10, -0.5);
    ctx.lineTo(2, -3.5);
    ctx.lineTo(-4, -3.5);
    ctx.lineTo(1, -0.5);
    ctx.closePath();
    
    const cockpitGrad = ctx.createLinearGradient(-4, -3.5, 10, -0.5);
    cockpitGrad.addColorStop(0, '#fcd34d');
    cockpitGrad.addColorStop(0.5, '#f59e0b');
    cockpitGrad.addColorStop(1, '#ffffff');
    ctx.fillStyle = cockpitGrad;
    ctx.fill();
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Soft hull rim light (top edge)
    ctx.beginPath();
    ctx.moveTo(16, -1);
    ctx.bezierCurveTo(10, -4, 0, -4.5, -10, -3.5);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
  } else if (type === 'classic') {
    // Ambient glow around rocket
    const rocketGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, 22);
    rocketGlow.addColorStop(0, 'rgba(56,189,248,0.12)');
    rocketGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rocketGlow;
    ctx.fillRect(-22, -22, 44, 44);

    // Engine flame — multi-layered animated
    const flicker1 = Math.sin(time * 0.03) * 0.3 + 1;
    const flicker2 = Math.sin(time * 0.05 + 1) * 0.2 + 1;
    const flameLen = 14 * flicker1;
    const flameLen2 = 10 * flicker2;

    // Outer flame (red-orange glow)
    const outerFlame = ctx.createLinearGradient(-9, 0, -9 - flameLen, 0);
    outerFlame.addColorStop(0, 'rgba(251,146,60,0.8)');
    outerFlame.addColorStop(0.5, 'rgba(220,38,38,0.4)');
    outerFlame.addColorStop(1, 'rgba(220,38,38,0)');
    ctx.fillStyle = outerFlame;
    ctx.beginPath();
    ctx.moveTo(-9, -5);
    ctx.lineTo(-9 - flameLen, 0);
    ctx.lineTo(-9, 5);
    ctx.closePath();
    ctx.fill();

    // Inner flame (white-hot core)
    const innerFlame = ctx.createLinearGradient(-9, 0, -9 - flameLen2, 0);
    innerFlame.addColorStop(0, '#fef3c7');
    innerFlame.addColorStop(0.5, '#fbbf24');
    innerFlame.addColorStop(1, 'rgba(251,191,36,0)');
    ctx.fillStyle = innerFlame;
    ctx.beginPath();
    ctx.moveTo(-9, -3);
    ctx.lineTo(-9 - flameLen2, 0);
    ctx.lineTo(-9, 3);
    ctx.closePath();
    ctx.fill();

    // Fins — swept back, larger
    const finGrad = ctx.createLinearGradient(0, -6, 0, -10);
    finGrad.addColorStop(0, '#0369a1');
    finGrad.addColorStop(1, '#0284c7');
    ctx.fillStyle = finGrad;
    ctx.beginPath();
    ctx.moveTo(-5, -6);
    ctx.lineTo(-11, -10);
    ctx.lineTo(-8, -10);
    ctx.lineTo(-2, -6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#0c4a6e';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    const finGrad2 = ctx.createLinearGradient(0, 6, 0, 10);
    finGrad2.addColorStop(0, '#0369a1');
    finGrad2.addColorStop(1, '#0284c7');
    ctx.fillStyle = finGrad2;
    ctx.beginPath();
    ctx.moveTo(-5, 6);
    ctx.lineTo(-11, 10);
    ctx.lineTo(-8, 10);
    ctx.lineTo(-2, 6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#0c4a6e';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Rocket body — sleek with metallic gradient
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.quadraticCurveTo(10, -6, -2, -6);
    ctx.lineTo(-9, -5);
    ctx.lineTo(-9, 5);
    ctx.lineTo(-2, 6);
    ctx.quadraticCurveTo(10, 6, 16, 0);
    ctx.closePath();
    const bodyGrad = ctx.createLinearGradient(0, -6, 0, 6);
    bodyGrad.addColorStop(0, '#e0f2fe');
    bodyGrad.addColorStop(0.3, '#bae6fd');
    bodyGrad.addColorStop(0.5, '#7dd3fc');
    bodyGrad.addColorStop(0.7, '#38bdf8');
    bodyGrad.addColorStop(1, '#0284c7');
    ctx.fillStyle = bodyGrad;
    ctx.fill();
    ctx.strokeStyle = '#0c4a6e';
    ctx.lineWidth = 0.7;
    ctx.stroke();

    // Panel line detail
    ctx.beginPath();
    ctx.moveTo(-4, -5.5);
    ctx.lineTo(-4, 5.5);
    ctx.strokeStyle = 'rgba(12,74,110,0.3)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Engine nozzle
    ctx.beginPath();
    ctx.moveTo(-9, -4.5);
    ctx.lineTo(-10.5, -5);
    ctx.lineTo(-10.5, 5);
    ctx.lineTo(-9, 4.5);
    ctx.closePath();
    ctx.fillStyle = '#475569';
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Cockpit window — glowing
    ctx.save();
    ctx.shadowColor = 'rgba(34,211,238,0.5)';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(6, 0, 2.8, 0, Math.PI * 2);
    const cockpitGrad = ctx.createRadialGradient(5.5, -0.5, 0, 6, 0, 2.8);
    cockpitGrad.addColorStop(0, '#a5f3fc');
    cockpitGrad.addColorStop(0.5, '#22d3ee');
    cockpitGrad.addColorStop(1, '#0891b2');
    ctx.fillStyle = cockpitGrad;
    ctx.fill();
    ctx.strokeStyle = '#0c4a6e';
    ctx.lineWidth = 0.6;
    ctx.stroke();
    ctx.restore();

    // Nose tip highlight
    ctx.beginPath();
    ctx.arc(14, 0, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fill();
  } else if (type === 'stealth') {
    // Ambient glow around rocket
    const rocketGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, 28);
    rocketGlow.addColorStop(0, 'rgba(56,189,248,0.2)');
    rocketGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rocketGlow;
    ctx.fillRect(-28, -28, 56, 56);

    // Engine flame — high-tech ion drive
    const flicker1 = Math.sin(time * 0.05) * 0.2 + 0.9;
    const flicker2 = Math.sin(time * 0.08 + 1) * 0.2 + 0.9;
    const flameLen = 22 * flicker1;
    const flameLen2 = 12 * flicker2;

    ctx.globalCompositeOperation = 'screen';
    
    // Outer ion plume
    const outerFlame = ctx.createLinearGradient(-10, 0, -10 - flameLen, 0);
    outerFlame.addColorStop(0, 'rgba(168, 85, 247, 0.9)'); // Purple
    outerFlame.addColorStop(0.4, 'rgba(192, 132, 252, 0.4)');
    outerFlame.addColorStop(1, 'rgba(192, 132, 252, 0)');
    ctx.fillStyle = outerFlame;
    ctx.beginPath();
    ctx.moveTo(-10, -4);
    ctx.lineTo(-10 - flameLen, 0);
    ctx.lineTo(-10, 4);
    ctx.closePath();
    ctx.fill();

    // Inner plasma core
    const innerFlame = ctx.createLinearGradient(-10, 0, -10 - flameLen2, 0);
    innerFlame.addColorStop(0, '#ffffff');
    innerFlame.addColorStop(0.5, '#e879f9');
    innerFlame.addColorStop(1, 'rgba(232, 121, 249, 0)');
    ctx.fillStyle = innerFlame;
    ctx.beginPath();
    ctx.moveTo(-10, -2);
    ctx.lineTo(-10 - flameLen2, 0);
    ctx.lineTo(-10, 2);
    ctx.closePath();
    ctx.fill();

    ctx.globalCompositeOperation = 'source-over';

    // Delta Wings — sleek and sweeping
    const drawWing = (yDir: number) => {
      ctx.beginPath();
      ctx.moveTo(2, 4 * yDir);
      ctx.lineTo(-8, 11 * yDir);
      ctx.lineTo(-11, 11 * yDir);
      ctx.lineTo(-6, 3 * yDir);
      ctx.closePath();
      const wingGrad = ctx.createLinearGradient(0, 3 * yDir, 0, 11 * yDir);
      wingGrad.addColorStop(0, '#1e293b');
      wingGrad.addColorStop(1, '#020617');
      ctx.fillStyle = wingGrad;
      ctx.fill();
      
      // Wing edge highlight (neon purple)
      ctx.beginPath();
      ctx.moveTo(2, 4 * yDir);
      ctx.lineTo(-8, 11 * yDir);
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 1;
      ctx.stroke();
    };
    drawWing(1);  // right wing
    drawWing(-1); // left wing

    // Main Hull (sleek modern dart design)
    ctx.beginPath();
    ctx.moveTo(18, 0); // Sharper nose
    ctx.bezierCurveTo(10, -5.5, -2, -5.5, -10, -3.5);
    ctx.lineTo(-10, 3.5);
    ctx.bezierCurveTo(-2, 5.5, 10, 5.5, 18, 0);
    ctx.closePath();
    
    // Metallic dark gradient for stealth hull
    const hullGrad = ctx.createLinearGradient(-10, -5, 18, 5);
    hullGrad.addColorStop(0, '#334155');
    hullGrad.addColorStop(0.4, '#475569');
    hullGrad.addColorStop(0.7, '#cbd5e1');
    hullGrad.addColorStop(0.9, '#f1f5f9');
    hullGrad.addColorStop(1, '#ffffff');
    ctx.fillStyle = hullGrad;
    ctx.fill();
    
    // Dimensional under-shadow
    const hullUnder = ctx.createLinearGradient(0, 0, 0, 6);
    hullUnder.addColorStop(0, 'rgba(0,0,0,0)');
    hullUnder.addColorStop(1, 'rgba(2,6,23,0.5)');
    ctx.fillStyle = hullUnder;
    ctx.fill();

    // Engine nozzle housing
    ctx.beginPath();
    ctx.moveTo(-9, -3.5);
    ctx.lineTo(-12, -4.5);
    ctx.lineTo(-12, 4.5);
    ctx.lineTo(-9, 3.5);
    ctx.closePath();
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Neon Energy Seam down the rear fuselage
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(2, 0);
    ctx.strokeStyle = '#e879f9';
    ctx.lineWidth = 1.2;
    ctx.save();
    ctx.shadowColor = '#e879f9';
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.restore();

    // Angular Cockpit (black glass canopy)
    ctx.beginPath();
    ctx.moveTo(11, 0);
    ctx.lineTo(4, -3.5);
    ctx.lineTo(-1, -3.5);
    ctx.lineTo(4, 0);
    ctx.closePath();
    ctx.fillStyle = '#020617';
    ctx.fill();
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Canopy reflection gloss
    ctx.beginPath();
    ctx.moveTo(9, -0.5);
    ctx.lineTo(4, -2.5);
    ctx.lineTo(1, -2.5);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Nose tip highlight gleam
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(15, -1);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawPlanet(ctx: CanvasRenderingContext2D, p: Planet) {
  if (p.planetType === 'earth') {
    drawEarth(ctx, p);
    return;
  }
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
  const settings = state.settings;
  const rocketType = settings.rocketType || 'aerospace';
  // Screen shake
  ctx.save();
  if (state.screenShake.duration > 0) {
    // Fade out shake over the last 30 frames
    const fade = Math.min(1, state.screenShake.duration / 30);
    const si = state.screenShake.intensity * fade;
    ctx.translate(
      (Math.random() - 0.5) * si * 2,
      (Math.random() - 0.5) * si * 2
    );
  }

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

  // Solar flares
  for (const f of state.solarFlares) {
    const fx = f.x;
    if (fx + f.width < cx || fx > cx + w) continue;
    const pulse = 0.7 + 0.3 * Math.sin(time * 0.003 + f.x * 0.01);
    const flareGrad = ctx.createLinearGradient(0, f.y, 0, f.y + f.height);
    flareGrad.addColorStop(0, 'rgba(0,0,0,0)');
    flareGrad.addColorStop(0.3, `${f.color}${f.opacity * pulse})`);
    flareGrad.addColorStop(0.5, `${f.color}${f.opacity * pulse * 1.2})`);
    flareGrad.addColorStop(0.7, `${f.color}${f.opacity * pulse})`);
    flareGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = flareGrad;
    ctx.fillRect(f.x, f.y, f.width, f.height);
    ctx.strokeStyle = `${f.color}${f.opacity * 0.5})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(f.x, f.y);
    ctx.lineTo(f.x + f.width, f.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(f.x, f.y + f.height);
    ctx.lineTo(f.x + f.width, f.y + f.height);
    ctx.stroke();
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
  drawRocketShip(ctx, time, rocketType);
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

    // High-tech projected trajectory arc (replaces the clunky arrow)
    ctx.save();
    ctx.translate(p.x, p.y);
    
    const gap = 0.08 * state.orbitDirection;     // Gap from the nose
    const mid = 0.32 * state.orbitDirection;     // Main bright arc
    const tail = 0.45 * state.orbitDirection;    // Fading tail dot
    
    ctx.beginPath();
    ctx.arc(0, 0, p.orbitRadius, state.orbitAngle + gap, state.orbitAngle + mid, state.orbitDirection < 0);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, p.orbitRadius, state.orbitAngle + mid + (0.05 * state.orbitDirection), state.orbitAngle + tail, state.orbitDirection < 0);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.stroke();
    
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

  // Combo meter HUD — visible whenever a combo window is open
  if (state.comboTimer > 0) {
    const progress = Math.max(0, Math.min(1, state.comboTimer / 120));
    const mult = state.comboMultiplier;
    const isMax = mult >= 5;
    const fadeIn = Math.min(1, (120 - state.comboTimer) / 6 + 0.35);
    const fadeOut = Math.min(1, state.comboTimer / 20);
    const alpha = Math.min(fadeIn, fadeOut);

    const cmW = 184;
    const cmH = 56;
    const cmX = w / 2 - cmW / 2;
    const cmY = 14;

    ctx.save();
    ctx.globalAlpha = alpha;

    ctx.beginPath();
    ctx.roundRect(cmX, cmY, cmW, cmH, 10);
    ctx.fillStyle = 'rgba(10, 14, 36, 0.55)';
    ctx.fill();
    ctx.strokeStyle = isMax ? 'rgba(251, 146, 60, 0.55)' : 'rgba(251, 191, 36, 0.22)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Multiplier value
    ctx.textAlign = 'left';
    ctx.shadowColor = isMax ? 'rgba(251, 146, 60, 0.8)' : 'rgba(251, 191, 36, 0.6)';
    ctx.shadowBlur = isMax ? 16 : 10;
    ctx.font = '800 22px "Inter", system-ui, sans-serif';
    ctx.fillStyle = isMax ? '#fb923c' : '#fbbf24';
    ctx.fillText(`×${mult.toFixed(1)}`, cmX + 14, cmY + 28);

    ctx.shadowBlur = 0;
    ctx.font = '600 10px "Inter", system-ui, sans-serif';
    ctx.letterSpacing = '2px';
    ctx.fillStyle = isMax ? '#fb923c' : 'rgba(253, 230, 138, 0.8)';
    ctx.fillText(isMax ? 'MAX COMBO' : `COMBO ×${state.combo}`, cmX + 14, cmY + 44);
    ctx.letterSpacing = '0px';

    // "Next capture" hint on right side
    ctx.textAlign = 'right';
    ctx.font = '500 10px "Inter", system-ui, sans-serif';
    ctx.fillStyle = 'rgba(186, 230, 253, 0.5)';
    ctx.letterSpacing = '1px';
    ctx.fillText('CHAIN', cmX + cmW - 14, cmY + 20);
    ctx.letterSpacing = '0px';
    ctx.font = '700 16px "Inter", system-ui, sans-serif';
    const nextMult = Math.min(5, 1 + (state.combo + 1) * 0.5);
    ctx.fillStyle = '#e0f2fe';
    ctx.fillText(`×${nextMult.toFixed(1)}`, cmX + cmW - 14, cmY + 38);

    // Progress bar — color shifts to red as time runs low
    const barX = cmX + 14;
    const barY = cmY + cmH - 8;
    const barW = cmW - 28;
    const barH = 4;
    ctx.fillStyle = 'rgba(251, 191, 36, 0.12)';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 2);
    ctx.fill();
    const barColor = progress < 0.25 ? '#fb7185' : isMax ? '#fb923c' : '#fbbf24';
    ctx.fillStyle = barColor;
    ctx.beginPath();
    ctx.roundRect(barX, barY, Math.max(1, barW * progress), barH, 2);
    ctx.fill();
    ctx.restore();
  }

  // Score bonus popup
  if (state.scoreBonusTimer > 0) {
    const bonusAlpha = Math.min(1, state.scoreBonusTimer / 30);
    const bonusY = h * 0.35 - (90 - state.scoreBonusTimer) * 0.5;
    ctx.save();
    ctx.globalAlpha = bonusAlpha;
    ctx.textAlign = 'center';

    if (state.scoreBonusLabel === 'earth') {
      ctx.shadowColor = 'rgba(52,211,153,0.6)';
      ctx.shadowBlur = 15;
      ctx.font = '800 28px "Inter", system-ui, sans-serif';
      ctx.fillStyle = '#34d399';
      ctx.fillText(`+${state.scoreBonus}`, w / 2, bonusY);
      ctx.font = '500 12px "Inter", system-ui, sans-serif';
      ctx.fillStyle = '#6ee7b7';
      ctx.fillText('EARTH BONUS!', w / 2, bonusY + 20);
    } else {
      ctx.shadowColor = 'rgba(251,191,36,0.5)';
      ctx.shadowBlur = 12;
      ctx.font = '800 24px "Inter", system-ui, sans-serif';
      ctx.fillStyle = '#fbbf24';
      ctx.fillText(`+${state.scoreBonus}`, w / 2, bonusY);
      ctx.font = '500 11px "Inter", system-ui, sans-serif';
      ctx.fillStyle = '#fde68a';
      ctx.fillText('COMBO BONUS!', w / 2, bonusY + 18);
    }

    ctx.restore();
  }

  // End screen shake save
  ctx.restore();
}

export function renderMenu(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number,
  highScore: number,
  rocketType: 'aerospace' | 'classic' | 'stealth' = 'aerospace'
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

  // Demo planet — large, prominent, majestic
  const px = w / 2;
  const py = h / 2 + 10;
  const planet: Planet = {
    x: px,
    y: py,
    radius: 65,
    orbitRadius: 135,
    color: '#e8a838',
    glowColor: 'rgba(232,168,56,0.6)',
    accentColor: '#b87a1c',
    hasRing: true,
    ringTilt: -0.22,
    craters: [
      { x: -16, y: -14, r: 9 },
      { x: 18, y: 16, r: 8 },
      { x: -8, y: 22, r: 6 },
      { x: 10, y: -20, r: 5 },
    ],
    rotation: time * 0.0004,
    planetType: 'gas',
    earthBonusClaimed: false,
  };
  drawPlanet(ctx, planet);

  // Orbiting rocket — glowing trail dot
  const orbitAngle = time * 0.0015;
  const ox = px + Math.cos(orbitAngle) * 135;
  const oy = py + Math.sin(orbitAngle) * 135;
  // Trail glow
  const rg = ctx.createRadialGradient(ox, oy, 0, ox, oy, 14);
  rg.addColorStop(0, 'rgba(56,189,248,0.6)');
  rg.addColorStop(0.5, 'rgba(56,189,248,0.15)');
  rg.addColorStop(1, 'rgba(56,189,248,0)');
  ctx.fillStyle = rg;
  ctx.fillRect(ox - 14, oy - 14, 28, 28);
  
  // Draw sleek miniature rocket
  ctx.save();
  ctx.translate(ox, oy);
  ctx.rotate(orbitAngle + Math.PI / 2); // tangent to orbit
  ctx.scale(0.8, 0.8);
  drawRocketShip(ctx, time, rocketType);
  ctx.restore();

  // Title - massive, clean typography
  ctx.textAlign = 'center';
  
  // Title glow
  ctx.save();
  ctx.shadowColor = 'rgba(56,189,248,0.4)';
  ctx.shadowBlur = 40;
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 64px "Inter", system-ui, sans-serif';
  ctx.letterSpacing = '4px';
  ctx.fillText('ORBIT', w / 2, py - 150);
  ctx.restore();

  ctx.font = '300 24px "Inter", system-ui, sans-serif';
  ctx.letterSpacing = '12px';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText('SLINGSHOT', w / 2, py - 100);

  // Divider line
  const gw = w * 0.4;
  const lineGrad = ctx.createLinearGradient(w / 2 - gw / 2, 0, w / 2 + gw / 2, 0);
  lineGrad.addColorStop(0, 'rgba(56,189,248,0)');
  lineGrad.addColorStop(0.5, 'rgba(56,189,248,0.5)');
  lineGrad.addColorStop(1, 'rgba(56,189,248,0)');
  ctx.fillStyle = lineGrad;
  ctx.fillRect(w / 2 - gw / 2, py - 70, gw, 1);

  const verticalScale = Math.max(0.85, Math.min(1.1, h / 800));

  // Pulse effect for main Start prompt
  const pulse = 0.5 + 0.5 * Math.sin(time * 0.003);
  const startY = py + 160 * verticalScale;

  ctx.save();
  ctx.globalAlpha = 0.6 + 0.4 * pulse;
  ctx.shadowColor = 'rgba(56,189,248,0.6)';
  ctx.shadowBlur = 20 + 10 * pulse;
  ctx.font = `800 ${Math.round(28 * verticalScale)}px "Inter", system-ui, sans-serif`;
  ctx.letterSpacing = '3px';
  ctx.fillStyle = '#f0f9ff';
  ctx.fillText('TAP TO START', w / 2, startY);
  ctx.restore();

  // Unified minimal instructions
  ctx.font = `400 ${Math.round(14 * verticalScale)}px "Inter", system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(186, 230, 253, 0.7)';
  ctx.letterSpacing = '1px';
  ctx.fillText('Tap / Space to launch  •  Esc to pause', w / 2, startY + 50 * verticalScale);

  // Rocket carousel — preview all three variants with the selected one centered
  const selectorY = startY + 110 * verticalScale;
  const rocketTypes: ('aerospace' | 'classic' | 'stealth')[] = ['aerospace', 'classic', 'stealth'];
  const currentIdx = rocketTypes.indexOf(rocketType);
  const prevIdx = (currentIdx - 1 + rocketTypes.length) % rocketTypes.length;
  const nextIdx = (currentIdx + 1) % rocketTypes.length;

  const pillW = 340 * verticalScale;
  const pillH = 104 * verticalScale;
  const pillX = w / 2 - pillW / 2;
  const pillY = selectorY - pillH / 2;
  const sideOffset = 110 * verticalScale;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillW, pillH, 14);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Side rocket previews (dimmed)
  const drawPreview = (type: 'aerospace' | 'classic' | 'stealth', dx: number, scale: number, alpha: number) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(w / 2 + dx, selectorY - 6 * verticalScale);
    ctx.scale(scale, scale);
    drawRocketShip(ctx, time, type);
    ctx.restore();
  };

  drawPreview(rocketTypes[prevIdx], -sideOffset, 0.6 * verticalScale, 0.35);
  drawPreview(rocketTypes[nextIdx], sideOffset, 0.6 * verticalScale, 0.35);

  // Selected rocket — larger, glowing, gentle bob
  const bob = Math.sin(time * 0.0028) * 2;
  ctx.save();
  ctx.shadowColor = 'rgba(56, 189, 248, 0.55)';
  ctx.shadowBlur = 18;
  ctx.translate(w / 2, selectorY - 6 * verticalScale + bob);
  ctx.scale(1.05 * verticalScale, 1.05 * verticalScale);
  drawRocketShip(ctx, time, rocketType);
  ctx.restore();

  // Navigation arrows
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 8;
  ctx.font = `600 ${Math.round(16 * verticalScale)}px "Inter", system-ui, sans-serif`;
  ctx.fillStyle = '#e0f2fe';
  ctx.textAlign = 'center';
  ctx.fillText('◀', pillX + 18 * verticalScale, selectorY + 5);
  ctx.fillText('▶', pillX + pillW - 18 * verticalScale, selectorY + 5);

  // Name label below
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 ${Math.round(13 * verticalScale)}px "Inter", system-ui, sans-serif`;
  ctx.letterSpacing = '5px';
  ctx.fillText(rocketType.toUpperCase(), w / 2, pillY + pillH + 20 * verticalScale);
  ctx.letterSpacing = '0px';
  ctx.restore();

  if (highScore > 0) {
    ctx.font = `700 ${Math.round(13 * verticalScale)}px "Inter", system-ui, sans-serif`;
    ctx.letterSpacing = '2px';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`BEST: ${highScore}m`, w / 2, py - 220);
  }
}

export function renderGameOver(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  score: number,
  distanceMeters: number,
  comboBonusEarned: number,
  earthBonusEarned: number,
  deathReason: GameState['deathReason'],
  highScore: number,
  isNew: boolean,
  isCopied: boolean
) {
  const deathFeedback = getDeathFeedback(deathReason);

  // Dark overlay with vignette
  ctx.fillStyle = 'rgba(4, 6, 15, 0.85)';
  ctx.fillRect(0, 0, w, h);
  const vig = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.8);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.4)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  // Card panel
  const cardW = Math.min(GAME_OVER_LAYOUT.cardWidthMax, w * 0.85);
  const cardH = GAME_OVER_LAYOUT.cardHeight;
  const cardX = (w - cardW) / 2;
  const cardY = (h - cardH) / 2 + GAME_OVER_LAYOUT.cardYOffset;
  
  // Outer subtle glow for the panel
  ctx.save();
  ctx.shadowColor = 'rgba(10, 14, 36, 0.9)';
  ctx.shadowBlur = 40;
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 20);
  ctx.fillStyle = 'rgba(7, 10, 24, 0.75)'; // Darker, cleaner background
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = 'rgba(248, 113, 113, 0.15)'; // Softer borders
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.textAlign = 'center';

  // Title with clean letter spacing and subtle neon glow
  ctx.save();
  ctx.shadowColor = 'rgba(248,113,113,0.5)';
  ctx.shadowBlur = 25;
  ctx.fillStyle = '#fca5a5';
  ctx.font = '800 26px "Inter", system-ui, sans-serif';
  ctx.letterSpacing = '6px';
  ctx.fillText('GAME OVER', w / 2, cardY + 54);
  ctx.restore();
  ctx.letterSpacing = '0px';

  // Divider
  const divGrad = ctx.createLinearGradient(w / 2 - 80, 0, w / 2 + 80, 0);
  divGrad.addColorStop(0, 'rgba(248,113,113,0)');
  divGrad.addColorStop(0.5, 'rgba(248,113,113,0.25)');
  divGrad.addColorStop(1, 'rgba(248,113,113,0)');
  ctx.fillStyle = divGrad;
  ctx.fillRect(w / 2 - 80, cardY + 70, 160, 1);

  // Score
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 68px "Inter", system-ui, sans-serif';
  ctx.letterSpacing = '-2px';
  ctx.fillText(`${score}`, w / 2, cardY + 138);
  ctx.letterSpacing = '0px';
  
  ctx.font = '600 12px "Inter", system-ui, sans-serif';
  ctx.letterSpacing = '4px';
  ctx.fillStyle = 'rgba(186, 230, 253, 0.4)';
  ctx.fillText('TOTAL METERS', w / 2, cardY + 160);
  ctx.letterSpacing = '0px';

  // Score breakdown panel
  const breakdownX = cardX + 24;
  const breakdownY = cardY + 180;
  const breakdownW = cardW - 48;
  const breakdownH = 92;
  ctx.beginPath();
  ctx.roundRect(breakdownX, breakdownY, breakdownW, breakdownH, 12);
  ctx.fillStyle = 'rgba(12, 17, 36, 0.6)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)';
  ctx.lineWidth = 1;
  ctx.stroke();

  const leftX = breakdownX + 16;
  const rightX = breakdownX + breakdownW - 16;
  let rowY = breakdownY + 22;
  const rowGap = 18;

  ctx.textAlign = 'left';
  ctx.font = '500 12px "Inter", system-ui, sans-serif';
  ctx.letterSpacing = '1px';
  ctx.fillStyle = 'rgba(186, 230, 253, 0.5)';
  ctx.fillText('DISTANCE', leftX, rowY);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#cbd5e1';
  ctx.letterSpacing = '0px';
  ctx.fillText(`${distanceMeters}`, rightX, rowY);

  rowY += rowGap;
  ctx.textAlign = 'left';
  ctx.letterSpacing = '1px';
  ctx.fillStyle = 'rgba(186, 230, 253, 0.5)';
  ctx.fillText('COMBO BONUS', leftX, rowY);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#fbbf24';
  ctx.letterSpacing = '0px';
  ctx.fillText(`+${comboBonusEarned}`, rightX, rowY);

  rowY += rowGap;
  ctx.textAlign = 'left';
  ctx.letterSpacing = '1px';
  ctx.fillStyle = 'rgba(186, 230, 253, 0.5)';
  ctx.fillText('EARTH BONUS', leftX, rowY);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#34d399';
  ctx.letterSpacing = '0px';
  ctx.fillText(`+${earthBonusEarned}`, rightX, rowY);

  // Mini divider before total
  ctx.fillStyle = 'rgba(148, 163, 184, 0.1)';
  ctx.fillRect(leftX, rowY + 6, breakdownW - 32, 1);

  rowY += rowGap + 5;
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(186, 230, 253, 0.8)';
  ctx.font = '700 12px "Inter", system-ui, sans-serif';
  ctx.letterSpacing = '1px';
  ctx.fillText('TOTAL', leftX, rowY);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  ctx.letterSpacing = '0px';
  ctx.fillText(`${score}`, rightX, rowY);

  // Contextual death feedback
  const tipX = breakdownX;
  const tipY = breakdownY + breakdownH + 16;
  const tipW = breakdownW;
  const tipH = 68;
  ctx.beginPath();
  ctx.roundRect(tipX, tipY, tipW, tipH, 12);
  ctx.fillStyle = 'rgba(12, 17, 36, 0.6)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.font = '800 11px "Inter", system-ui, sans-serif';
  ctx.letterSpacing = '1.5px';
  ctx.fillStyle = deathFeedback.accent;
  ctx.fillText(deathFeedback.title.toUpperCase(), tipX + 16, tipY + 22);
  ctx.letterSpacing = '0px';

  ctx.font = '500 11px "Inter", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(186, 230, 253, 0.65)';
  const tipTextY = tipY + 40;
  // Use slightly shorter width for inner padding
  const tipLines = wrapTextLines(ctx, deathFeedback.tip, tipW - 32, 2);
  const tipLineHeight = 14;
  for (let i = 0; i < tipLines.length; i++) {
    ctx.fillText(tipLines[i], tipX + 16, tipTextY + i * tipLineHeight);
  }

  // Adjust Best score position if needed, pushed up slightly from the card bottom
  if (isNew) {
    ctx.save();
    ctx.shadowColor = 'rgba(251,191,36,0.6)';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#fbbf24';
    ctx.font = '800 14px "Inter", system-ui, sans-serif';
    ctx.letterSpacing = '3px';
    ctx.textAlign = 'center';
    ctx.fillText('NEW BEST SCORE', w / 2, cardY + cardH - 24);
    ctx.restore();
    ctx.letterSpacing = '0px';
  } else {
    ctx.font = '600 12px "Inter", system-ui, sans-serif';
    ctx.letterSpacing = '3px';
    ctx.fillStyle = 'rgba(186, 230, 253, 0.4)';
    ctx.textAlign = 'center';
    ctx.fillText(`BEST ${highScore}`, w / 2, cardY + cardH - 24);
    ctx.letterSpacing = '0px';
  }

  // Retry CTA below card
  ctx.save();
  ctx.shadowColor = 'rgba(56,189,248,0.5)';
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#38bdf8';
  ctx.font = '800 18px "Inter", system-ui, sans-serif';
  ctx.letterSpacing = '4px';
  ctx.textAlign = 'center';
  ctx.fillText('TAP TO RETRY', w / 2, cardY + cardH + 48);
  ctx.restore();
  ctx.letterSpacing = '0px';

  // Share Score button
  const shareBtnW = GAME_OVER_LAYOUT.shareButtonWidth;
  const shareBtnH = GAME_OVER_LAYOUT.shareButtonHeight;
  const shareBtnX = (w - shareBtnW) / 2;
  const shareBtnY = cardY + cardH + GAME_OVER_LAYOUT.shareButtonYOffset;
  ctx.beginPath();
  ctx.roundRect(shareBtnX, shareBtnY, shareBtnW, shareBtnH, 8);
  
  if (isCopied) {
    ctx.fillStyle = 'rgba(52,211,153,0.15)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(52,211,153,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.font = '700 12px "Inter", system-ui, sans-serif';
    ctx.letterSpacing = '1px';
    ctx.fillStyle = '#34d399';
    ctx.fillText('✓ CARD COPIED', w / 2, shareBtnY + 23);
    ctx.letterSpacing = '0px';
  } else {
    ctx.fillStyle = 'rgba(56,189,248,0.12)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(56,189,248,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.font = '600 12px "Inter", system-ui, sans-serif';
    ctx.letterSpacing = '1px';
    ctx.fillStyle = '#7dd3fc';
    ctx.fillText('📋 COPY RUN CARD', w / 2, shareBtnY + 23);
    ctx.letterSpacing = '0px';
  }
}

export function renderPause(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  state: GameState
) {
  // Dark overlay
  ctx.fillStyle = 'rgba(4, 6, 15, 0.75)';
  ctx.fillRect(0, 0, w, h);

  // Card
  const cardW = Math.min(320, w * 0.85);
  const cardH = 280;
  const cardX = (w - cardW) / 2;
  const cardY = (h - cardH) / 2 - 20;
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 16);
  ctx.fillStyle = 'rgba(10, 14, 36, 0.7)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.textAlign = 'center';

  // Title
  ctx.save();
  ctx.shadowColor = 'rgba(56,189,248,0.3)';
  ctx.shadowBlur = 15;
  ctx.fillStyle = '#e0f2fe';
  ctx.font = '700 28px "Inter", system-ui, sans-serif';
  ctx.fillText('PAUSED', w / 2, cardY + 45);
  ctx.restore();

  // Divider
  const divGrad = ctx.createLinearGradient(w / 2 - 40, 0, w / 2 + 40, 0);
  divGrad.addColorStop(0, 'rgba(56,189,248,0)');
  divGrad.addColorStop(0.5, 'rgba(56,189,248,0.3)');
  divGrad.addColorStop(1, 'rgba(56,189,248,0)');
  ctx.fillStyle = divGrad;
  ctx.fillRect(w / 2 - 40, cardY + 55, 80, 1);

  // Settings labels and sliders
  const sliderX = cardX + 30;
  const sliderW = cardW - 60;
  const settings = state.settings;

  // Music volume
  ctx.textAlign = 'left';
  ctx.font = '500 13px "Inter", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(186, 230, 253, 0.7)';
  ctx.fillText('Music Volume', sliderX, cardY + 90);
  // Slider track
  ctx.fillStyle = 'rgba(56,189,248,0.12)';
  ctx.fillRect(sliderX, cardY + 98, sliderW, 6);
  // Slider fill
  ctx.fillStyle = 'rgba(56,189,248,0.5)';
  ctx.fillRect(sliderX, cardY + 98, sliderW * settings.musicVolume, 6);
  // Slider handle
  ctx.beginPath();
  ctx.arc(sliderX + sliderW * settings.musicVolume, cardY + 101, 7, 0, Math.PI * 2);
  ctx.fillStyle = '#38bdf8';
  ctx.fill();

  // SFX volume
  ctx.fillStyle = 'rgba(186, 230, 253, 0.7)';
  ctx.fillText('SFX Volume', sliderX, cardY + 135);
  ctx.fillStyle = 'rgba(56,189,248,0.12)';
  ctx.fillRect(sliderX, cardY + 143, sliderW, 6);
  ctx.fillStyle = 'rgba(56,189,248,0.5)';
  ctx.fillRect(sliderX, cardY + 143, sliderW * settings.sfxVolume, 6);
  ctx.beginPath();
  ctx.arc(sliderX + sliderW * settings.sfxVolume, cardY + 146, 7, 0, Math.PI * 2);
  ctx.fillStyle = '#38bdf8';
  ctx.fill();

  // Low Graphics toggle
  ctx.fillStyle = 'rgba(186, 230, 253, 0.7)';
  ctx.fillText('Low Graphics', sliderX, cardY + 185);
  // Toggle box
  const toggleX = sliderX + sliderW - 40;
  const toggleY = cardY + 174;
  ctx.beginPath();
  ctx.roundRect(toggleX, toggleY, 40, 20, 10);
  ctx.fillStyle = settings.lowGraphics ? 'rgba(52,211,153,0.6)' : 'rgba(56,189,248,0.15)';
  ctx.fill();
  // Toggle knob
  ctx.beginPath();
  ctx.arc(settings.lowGraphics ? toggleX + 28 : toggleX + 12, toggleY + 10, 7, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // Resume hint
  ctx.textAlign = 'center';
  ctx.font = '400 12px "Inter", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(186, 230, 253, 0.4)';
  ctx.fillText('Press ESC or tap to resume', w / 2, cardY + cardH - 20);
}
