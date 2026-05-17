import { GameState, Planet, Comet, PowerUpType } from './types';
import { getActiveTheme, THEMES, parseColor } from './themes';

export const GAME_OVER_LAYOUT = {
  cardWidthMax: 300,
  cardHeight: 415,
  cardYOffset: -10,
  // Buttons sit side-by-side below the card to keep the whole screen in view
  // on shorter windows. Share is narrower / secondary; retry is primary.
  buttonYOffset: 28,
  buttonHeight: 42,
  buttonGap: 12,
  retryButtonWidth: 180,
  shareButtonWidth: 160,
} as const;

export const PAUSE_BUTTON = {
  r: 18,
  offsetX: 32,
  offsetY: 90,
} as const;

export function getPauseButtonCenter(w: number): { cx: number; cy: number; r: number } {
  return { cx: w - PAUSE_BUTTON.offsetX, cy: PAUSE_BUTTON.offsetY, r: PAUSE_BUTTON.r };
}

function getButtonRowY(h: number): number {
  const cardH = GAME_OVER_LAYOUT.cardHeight;
  const cardY = (h - cardH) / 2 + GAME_OVER_LAYOUT.cardYOffset;
  return cardY + cardH + GAME_OVER_LAYOUT.buttonYOffset;
}

export function getRetryButtonBounds(w: number, h: number): { x: number; y: number; width: number; height: number } {
  const width = GAME_OVER_LAYOUT.retryButtonWidth;
  const totalW = width + GAME_OVER_LAYOUT.buttonGap + GAME_OVER_LAYOUT.shareButtonWidth;
  return {
    x: (w - totalW) / 2,
    y: getButtonRowY(h),
    width,
    height: GAME_OVER_LAYOUT.buttonHeight,
  };
}

export function getShareButtonBounds(w: number, h: number): { x: number; y: number; width: number; height: number } {
  const width = GAME_OVER_LAYOUT.shareButtonWidth;
  const totalW = GAME_OVER_LAYOUT.retryButtonWidth + GAME_OVER_LAYOUT.buttonGap + width;
  return {
    x: (w - totalW) / 2 + GAME_OVER_LAYOUT.retryButtonWidth + GAME_OVER_LAYOUT.buttonGap,
    y: getButtonRowY(h),
    width,
    height: GAME_OVER_LAYOUT.buttonHeight,
  };
}

export function getStatsButtonBounds(w: number, h: number): { x: number; y: number; width: number; height: number } {
  const btnW = 100;
  return {
    x: 20,
    y: 20,
    width: btnW,
    height: 36,
  };
}

export function getMuteButtonGeom(w: number, h: number): { cx: number; cy: number; r: number } {
  const cardW = Math.min(320, w * 0.85);
  const cardH = 320;
  const cardX = (w - cardW) / 2;
  const cardY = (h - cardH) / 2 - 20;
  return { cx: cardX + cardW - 32, cy: cardY + 45, r: 14 };
}

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

const DEATH_FEEDBACK: Record<
  NonNullable<GameState['deathReason']> | 'default',
  { title: string; accent: string; tips: string[] }
> = {
  asteroid: {
    title: 'CRASHED INTO ASTEROID',
    accent: '#fb7185',
    tips: [
      'Tip: Release a little earlier and avoid dense rock lanes.',
      'Tip: Asteroid fields cluster. Thread the gaps, don’t punch through.',
      'Tip: If you see rocks ahead, orbit further around for a safer angle.',
      'Tip: A lost combo beats a shattered rocket. Dodge first, chain later.',
      'Tip: The safest exit from orbit is rarely the straightest one.',
      'Tip: Asteroids don’t move. You do. Plan the arc, then commit.',
    ],
  },
  comet: {
    title: 'STRUCK BY COMET',
    accent: '#fbbf24',
    tips: [
      'Tip: Comets streak across fast. Watch for the bright trail.',
      'Tip: Don’t fly in a straight line for too long—comets punish predictability.',
      'Tip: Orbiting a planet shields you from passing comets.',
    ],
  },
  'out-of-bounds': {
    title: 'LOST IN SPACE',
    accent: '#fb923c',
    tips: [
      'Tip: Use a backtrack orbit to realign before committing.',
      'Tip: A half orbit gives you a cleaner launch angle than a quarter.',
      'Tip: When nothing’s ahead, arc toward the center band where planets spawn.',
      'Tip: Don’t release blind. Wait for the orbit marker to line up.',
      'Tip: Gravity bends your trajectory. Account for it before firing.',
      'Tip: Small course corrections beat one desperate recovery.',
    ],
  },
  'fell-behind': {
    title: 'MOMENTUM LOST',
    accent: '#38bdf8',
    tips: [
      'Tip: Chain forward captures to keep pace with the camera.',
      'Tip: Every wasted orbit lets the camera gain ground.',
      'Tip: Short, direct slingshots stack faster than long graceful ones.',
      'Tip: Momentum compounds. Each orbit feeds the next.',
      'Tip: Don’t linger in orbit. The camera doesn’t wait.',
      'Tip: When in doubt, launch forward. Backward orbits cost you.',
    ],
  },
  '': {
    title: 'RUN ENDED',
    accent: '#94a3b8',
    tips: [
      'Tip: One clean release can recover most bad trajectories.',
      'Tip: The best runs feel unhurried. Read the field before you act.',
    ],
  },
  default: {
    title: 'RUN ENDED',
    accent: '#94a3b8',
    tips: ['Tip: One clean release can recover most bad trajectories.'],
  },
};

function getDeathFeedback(
  deathReason: GameState['deathReason'],
  tipSeed: number
): { title: string; tip: string; accent: string } {
  const entry = DEATH_FEEDBACK[deathReason] ?? DEATH_FEEDBACK.default;
  const idx = Math.abs(tipSeed) % entry.tips.length;
  return { title: entry.title, accent: entry.accent, tip: entry.tips[idx] };
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
    { x: -r * 0.32, y: -r * 0.3, s: r * 0.1, a: 0.45 },
    { x: -r * 0.25, y: -r * 0.2, s: r * 0.12, a: 0.4 },
    { x: -r * 0.28, y: -r * 0.1, s: r * 0.08, a: 0.35 },
    { x: -r * 0.22, y: 0.0, s: r * 0.07, a: 0.3 },
    { x: -r * 0.18, y: r * 0.1, s: r * 0.06, a: 0.25 },
    { x: r * 0.15, y: -r * 0.25, s: r * 0.09, a: 0.4 },
    { x: r * 0.25, y: -r * 0.18, s: r * 0.11, a: 0.45 },
    { x: r * 0.35, y: -r * 0.12, s: r * 0.08, a: 0.35 },
    { x: r * 0.28, y: -r * 0.05, s: r * 0.07, a: 0.3 },
    { x: r * 0.08, y: r * 0.2, s: r * 0.09, a: 0.4 },
    { x: r * 0.12, y: r * 0.3, s: r * 0.08, a: 0.35 },
    { x: r * 0.05, y: r * 0.35, s: r * 0.06, a: 0.25 },
    { x: -r * 0.05, y: -r * 0.5, s: r * 0.05, a: 0.3 },
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
  ctx.ellipse(-r * 0.35, -r * 0.08, r * 0.2, r * 0.022, 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(r * 0.15, -r * 0.3, r * 0.16, r * 0.018, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(r * 0.05, r * 0.22, r * 0.14, r * 0.016, 0.1, 0, Math.PI * 2);
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

function drawPlanet(ctx: CanvasRenderingContext2D, p: Planet, time: number = 0) {
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

function drawPowerUp(ctx: CanvasRenderingContext2D, x: number, y: number, type: PowerUpType, radius: number, bobPhase: number, time: number) {
  const bob = Math.sin(time * 0.004 + bobPhase) * 4;
  const drawY = y + bob;
  const pulse = 0.8 + 0.2 * Math.sin(time * 0.006 + bobPhase);
  const rotation = time * 0.002 + bobPhase;

  // Color schemes per type
  const colors: Record<PowerUpType, { primary: string; glow: string; icon: string }> = {
    shield: { primary: '#38bdf8', glow: 'rgba(56,189,248,0.5)', icon: '#e0f2fe' },
    magnet: { primary: '#fbbf24', glow: 'rgba(251,191,36,0.5)', icon: '#fef3c7' },
    wormhole: { primary: '#c084fc', glow: 'rgba(192,132,252,0.5)', icon: '#f3e8ff' },
    time_dilation: { primary: '#10b981', glow: 'rgba(16,185,129,0.5)', icon: '#d1fae5' },
    gravity_pulse: { primary: '#818cf8', glow: 'rgba(129,140,248,0.5)', icon: '#e0e7ff' },
  };
  const c = colors[type];

  // Strong, soft glow
  ctx.save();
  ctx.globalAlpha = pulse;
  const glow = ctx.createRadialGradient(x, drawY, 0, x, drawY, radius * 2.2);
  glow.addColorStop(0, c.glow);
  glow.addColorStop(0.4, c.glow.replace('0.5', '0.25'));
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x - radius * 3, drawY - radius * 3, radius * 6, radius * 6);
  ctx.restore();

  // Draw main icon
  ctx.save();
  ctx.translate(x, drawY);

  // Subtle drop shadow for the icon itself to pop off the glow
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;

  if (type === 'shield') {
    // Bold Shield icon
    ctx.scale(1.3, 1.3);
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.quadraticCurveTo(8, -5, 8, 0);
    ctx.quadraticCurveTo(8, 6, 0, 9);
    ctx.quadraticCurveTo(-8, 6, -8, 0);
    ctx.quadraticCurveTo(-8, -5, 0, -7);
    ctx.closePath();

    // Fill
    ctx.fillStyle = c.primary;
    ctx.fill();

    // Checkmark inside
    ctx.shadowColor = 'transparent';
    ctx.beginPath();
    ctx.moveTo(-2.5, 0.5);
    ctx.lineTo(-0.5, 3);
    ctx.lineTo(3.5, -2.5);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

  } else if (type === 'magnet') {
    // Bold Magnet icon
    ctx.scale(1.3, 1.3);

    // Horseshoe body
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI, true); // Top curve
    ctx.lineTo(-5, 4);
    ctx.lineTo(-2, 4);
    ctx.lineTo(-2, 0);
    ctx.arc(0, 0, 2, Math.PI, 0, false); // Inner curve
    ctx.lineTo(2, 4);
    ctx.lineTo(5, 4);
    ctx.closePath();

    ctx.fillStyle = c.primary;
    ctx.fill();

    // Red/Blue tips
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-5, 4, 3, 3);
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(2, 4, 3, 3);

  } else if (type === 'wormhole') {
    // Clean swirling star portal
    ctx.scale(1.2, 1.2);
    ctx.rotate(rotation * 2);

    ctx.fillStyle = c.primary;
    ctx.beginPath();
    // 4-point swirling star
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      ctx.moveTo(0, -2);
      ctx.quadraticCurveTo(2, -2, 8, -8);
      ctx.quadraticCurveTo(2, 2, 2, 0);
    }
    ctx.fill();

    // Bright center
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.primary;
    ctx.beginPath();
    ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
    ctx.fill();

  } else if (type === 'time_dilation') {
    // Hourglass icon
    ctx.scale(1.2, 1.2);
    ctx.fillStyle = c.primary;
    ctx.beginPath();
    ctx.moveTo(-5, -6);
    ctx.lineTo(5, -6);
    ctx.lineTo(1, 0);
    ctx.lineTo(5, 6);
    ctx.lineTo(-5, 6);
    ctx.lineTo(-1, 0);
    ctx.closePath();
    ctx.fill();

    // Sand inside
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-2, 4);
    ctx.lineTo(2, 4);
    ctx.lineTo(0, 1);
    ctx.closePath();
    ctx.fill();

    // Top sand
    ctx.beginPath();
    ctx.moveTo(-3, -5);
    ctx.lineTo(3, -5);
    ctx.lineTo(0, -1);
    ctx.closePath();
    ctx.fill();

  } else if (type === 'gravity_pulse') {
    // Concentric expanding rings icon
    ctx.scale(1.2, 1.2);
    ctx.strokeStyle = c.primary;
    ctx.lineWidth = 1.5;

    // Inner dot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 2, 0, Math.PI * 2);
    ctx.fill();

    // Concentric rings
    ctx.shadowColor = 'transparent';
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.stroke();
  }

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
  // Screen shake — suppressed when the reduced-motion setting is on.
  ctx.save();
  if (state.screenShake.duration > 0 && !settings.reducedMotion) {
    // Fade out shake over the last 30 frames
    const fade = Math.min(1, state.screenShake.duration / 30);
    const si = state.screenShake.intensity * fade;
    ctx.translate(
      (Math.random() - 0.5) * si * 2,
      (Math.random() - 0.5) * si * 2
    );
  }

  const cx = state.camera.x;
  const theme = getActiveTheme(state.score);

  // Deep space background — theme-driven multi-stop gradient
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, theme.bgStops[0]);
  bg.addColorStop(0.25, theme.bgStops[1]);
  bg.addColorStop(0.5, theme.bgStops[2]);
  bg.addColorStop(0.75, theme.bgStops[3]);
  bg.addColorStop(1, theme.bgStops[4]);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Subtle cosmic dust band (milky-way feel) — elliptical gradient so it
  // fades smoothly on both axes instead of hard-edging at a fillRect boundary.
  const dustRY = h * 0.22;
  const dustSX = (w * 0.55) / dustRY;
  ctx.save();
  ctx.translate(w * 0.5, h * 0.5);
  ctx.scale(dustSX, 1);
  const dust = ctx.createRadialGradient(0, 0, 0, 0, 0, dustRY);
  dust.addColorStop(0, theme.dust);
  dust.addColorStop(0.5, theme.dust.replace(/[\d.]+\)$/, (m) => `${parseFloat(m) * 0.6})`));
  dust.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = dust;
  ctx.fillRect(-dustRY, -dustRY, dustRY * 2, dustRY * 2);
  ctx.restore();

  // Nebulae — theme-tinted, layered with multi-stop gradients for depth
  for (let ni = 0; ni < state.nebulae.length; ni++) {
    const n = state.nebulae[ni];
    const nx = n.x - cx * 0.12;
    if (nx + n.radius < 0 || nx - n.radius > w) continue;
    const tinted = theme.nebulaColors[ni % theme.nebulaColors.length];
    const ng = ctx.createRadialGradient(nx, n.y, 0, nx, n.y, n.radius);
    ng.addColorStop(0, tinted);
    ng.addColorStop(0.4, tinted.replace(/[\d.]+\)$/, (m) => `${parseFloat(m) * 0.5})`));
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
    drawPlanet(ctx, p, time);
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

  // Comets — bright streaks
  for (const c of state.comets) {
    if (c.x - cx < -50 || c.x - cx > w + 50) continue;
    // Trail
    if (c.trail.length > 1) {
      for (let i = 1; i < c.trail.length; i++) {
        const a = i / c.trail.length;
        ctx.beginPath();
        ctx.moveTo(c.trail[i - 1].x, c.trail[i - 1].y);
        ctx.lineTo(c.trail[i].x, c.trail[i].y);
        ctx.strokeStyle = `rgba(255, 220, 100, ${a * 0.6})`;
        ctx.lineWidth = a * 3;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
    }
    // Body glow
    const cGlow = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.radius * 3);
    cGlow.addColorStop(0, 'rgba(255,240,180,0.5)');
    cGlow.addColorStop(0.5, 'rgba(255,200,60,0.15)');
    cGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = cGlow;
    ctx.fillRect(c.x - c.radius * 3, c.y - c.radius * 3, c.radius * 6, c.radius * 6);
    // Body
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.rotation);
    const cbg = ctx.createRadialGradient(-c.radius * 0.2, -c.radius * 0.2, 0, 0, 0, c.radius);
    cbg.addColorStop(0, '#fff8dc');
    cbg.addColorStop(0.5, '#fbbf24');
    cbg.addColorStop(1, '#b45309');
    ctx.fillStyle = cbg;
    ctx.beginPath();
    ctx.arc(0, 0, c.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Power-ups — floating pickups in the world
  for (const pu of state.powerups) {
    if (pu.collected) continue;
    if (pu.x - cx < -50 || pu.x - cx > w + 50) continue;
    drawPowerUp(ctx, pu.x, pu.y, pu.type, pu.radius, pu.bobPhase, time);
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

  // Rocket trail — colored by rocket type for visual identity
  const TRAIL_TYPE_COLORS: Record<string, string> = { aerospace: '#38bdf8', classic: '#fb923c', stealth: '#c084fc' };
  const trailBaseColor = TRAIL_TYPE_COLORS[settings.rocketType] || theme.accentColor;
  const trail = state.rocket.trail;
  if (trail.length > 1) {
    const [tr, tg, tb] = parseColor(trailBaseColor);
    for (let i = 1; i < trail.length; i++) {
      const alpha = i / trail.length;
      ctx.beginPath();
      ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
      ctx.lineTo(trail[i].x, trail[i].y);
      ctx.strokeStyle = `rgba(${tr}, ${tg}, ${tb}, ${alpha * 0.85})`;
      ctx.lineWidth = alpha * 4;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
    // Outer glow pass — lifted toward white for a hotter core/halo feel
    for (let i = 1; i < trail.length; i++) {
      const alpha = i / trail.length;
      const gr = Math.min(255, tr + 40);
      const gg = Math.min(255, tg + 40);
      const gb = Math.min(255, tb + 40);
      ctx.beginPath();
      ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
      ctx.lineTo(trail[i].x, trail[i].y);
      ctx.strokeStyle = `rgba(${gr}, ${gg}, ${gb}, ${alpha * 0.2})`;
      ctx.lineWidth = alpha * 9;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }

  // Rocket
  const r = state.rocket;

  // Shield aura around rocket (drawn behind the rocket sprite)
  const hasShield = state.activeEffects.some(e => e.type === 'shield' && e.timer > 0);
  if (hasShield) {
    const shieldEffect = state.activeEffects.find(e => e.type === 'shield')!;
    const shieldAlpha = Math.min(1, shieldEffect.timer / 60) * (0.3 + 0.1 * Math.sin(time * 0.008));
    const shieldRadius = 22;
    const sg = ctx.createRadialGradient(r.x, r.y, shieldRadius * 0.3, r.x, r.y, shieldRadius);
    sg.addColorStop(0, `rgba(56,189,248,${shieldAlpha * 0.1})`);
    sg.addColorStop(0.6, `rgba(56,189,248,${shieldAlpha * 0.3})`);
    sg.addColorStop(0.85, `rgba(125,211,252,${shieldAlpha * 0.5})`);
    sg.addColorStop(1, `rgba(56,189,248,0)`);
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(r.x, r.y, shieldRadius, 0, Math.PI * 2);
    ctx.fill();
    // Animated ring
    const ringRot = time * 0.003;
    ctx.beginPath();
    ctx.arc(r.x, r.y, shieldRadius - 2, ringRot, ringRot + Math.PI * 1.5);
    ctx.strokeStyle = `rgba(125,211,252,${shieldAlpha * 0.8})`;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  // Magnet capture-radius indicator
  const hasMagnet = state.activeEffects.some(e => e.type === 'magnet' && e.timer > 0);
  if (hasMagnet && !state.isOrbiting) {
    const magnetAlpha = 0.08 + 0.04 * Math.sin(time * 0.005);
    ctx.beginPath();
    ctx.arc(r.x, r.y, 33, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(251,191,36,${magnetAlpha * 3})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

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

  // Theme vignette overlay — tints the whole scene without touching the HUD
  if (theme.vignetteOverlay) {
    ctx.fillStyle = theme.vignetteOverlay;
    ctx.fillRect(0, 0, w, h);
  }

  // Time dilation screen effect (greenish vignette and scanlines or just an edge glow)
  const timeDilationEffect = state.activeEffects.find(e => e.type === 'time_dilation');
  if (timeDilationEffect && timeDilationEffect.timer > 0) {
    const tdAlpha = Math.min(1, timeDilationEffect.timer / 60) * 0.15;

    ctx.save();
    // Green vignette
    const tdGrad = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.8);
    tdGrad.addColorStop(0, 'rgba(16, 185, 129, 0)');
    tdGrad.addColorStop(1, `rgba(16, 185, 129, ${tdAlpha})`);
    ctx.fillStyle = tdGrad;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  if (state.timeDilationFlashTimer > 0) {
    ctx.fillStyle = `rgba(16, 185, 129, ${state.timeDilationFlashTimer / 20 * 0.4})`;
    ctx.fillRect(0, 0, w, h);
  }

  // Gravity pulse shockwave ring — expands outward from the rocket
  if (state.gravityPulseTimer > 0) {
    const progress = 1 - state.gravityPulseTimer / 40; // 0 → 1 over 40 frames
    const maxRadius = 500;
    const ringRadius = maxRadius * progress;
    const alpha = (1 - progress) * 0.7;
    const cx = state.camera.x;

    ctx.save();
    ctx.globalAlpha = alpha;
    // Outer ring
    ctx.beginPath();
    ctx.arc(state.rocket.x - cx, state.rocket.y, ringRadius, 0, Math.PI * 2);
    ctx.strokeStyle = '#818cf8';
    ctx.lineWidth = 4 * (1 - progress);
    ctx.stroke();
    // Inner glow ring
    ctx.beginPath();
    ctx.arc(state.rocket.x - cx, state.rocket.y, ringRadius * 0.85, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(167, 139, 250, 0.5)';
    ctx.lineWidth = 8 * (1 - progress);
    ctx.stroke();
    // Flash overlay (brief)
    if (state.gravityPulseTimer > 30) {
      ctx.fillStyle = `rgba(129, 140, 248, ${(state.gravityPulseTimer - 30) / 10 * 0.15})`;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();
  }

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

  // On-screen pause button (top-right, below the BEST panel) — only while playing
  if (state.phase === 'playing' && !state.paused) {
    const pb = getPauseButtonCenter(w);
    ctx.save();
    ctx.beginPath();
    ctx.arc(pb.cx, pb.cy, pb.r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(10, 14, 36, 0.6)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Pause icon — two rounded bars
    ctx.fillStyle = '#e0f2fe';
    const barW = 3.5;
    const barH = 14;
    const barGap = 4;
    ctx.beginPath();
    ctx.roundRect(pb.cx - barGap / 2 - barW, pb.cy - barH / 2, barW, barH, 1);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(pb.cx + barGap / 2, pb.cy - barH / 2, barW, barH, 1);
    ctx.fill();
    ctx.restore();
  }

  // Combo meter HUD — only when a real multiplier is active (×1.5+)
  if (state.combo > 1 && state.comboTimer > 0) {
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

  // Theme-unlock banner — fades in, holds, fades out over ~3s
  if (state.themeBannerTimer > 0) {
    const banner = THEMES[state.themeBannerIndex];
    const MAX = 180;
    const progress = 1 - state.themeBannerTimer / MAX; // 0 → 1 over lifetime
    let alpha = 1;
    if (progress < 0.12) alpha = progress / 0.12;
    else if (progress > 0.82) alpha = Math.max(0, (1 - progress) / 0.18);

    const bw = 300;
    const bh = 76;
    const bx = w / 2 - bw / 2;
    const by = h * 0.16;

    ctx.save();
    ctx.globalAlpha = alpha;

    // Panel
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 12);
    ctx.fillStyle = 'rgba(10, 14, 36, 0.75)';
    ctx.fill();
    ctx.strokeStyle = banner.accentColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Accent bar on the left edge
    ctx.fillStyle = banner.accentColor;
    ctx.fillRect(bx, by + 10, 3, bh - 20);

    // Kicker
    ctx.textAlign = 'left';
    ctx.font = '600 10px "Inter", system-ui, sans-serif';
    ctx.letterSpacing = '3px';
    ctx.fillStyle = banner.accentColor;
    ctx.fillText('NEW BIOME UNLOCKED', bx + 18, by + 22);

    // Theme name (glowing)
    ctx.shadowColor = banner.accentColor;
    ctx.shadowBlur = 14;
    ctx.font = '800 20px "Inter", system-ui, sans-serif';
    ctx.letterSpacing = '2px';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(banner.name.toUpperCase(), bx + 18, by + 44);
    ctx.shadowBlur = 0;

    // Tagline below name
    ctx.font = '400 11px "Inter", system-ui, sans-serif';
    ctx.letterSpacing = '1px';
    ctx.fillStyle = 'rgba(186, 230, 253, 0.6)';
    ctx.fillText(banner.tagline, bx + 18, by + 62);

    // Distance marker on the right
    ctx.textAlign = 'right';
    ctx.font = '700 14px "Inter", system-ui, sans-serif';
    ctx.letterSpacing = '1px';
    ctx.fillStyle = 'rgba(186, 230, 253, 0.65)';
    ctx.fillText(`${banner.startDistance}m`, bx + bw - 18, by + 40);

    ctx.letterSpacing = '0px';
    ctx.restore();
  }

  // Subtle theme tag in the HUD — small pill under the score panel
  {
    const activeTheme = THEMES[state.activeThemeIndex];
    ctx.save();
    ctx.font = '600 9px "Inter", system-ui, sans-serif';
    ctx.letterSpacing = '1.5px';
    ctx.fillStyle = activeTheme.accentColor;
    ctx.globalAlpha = 0.75;
    ctx.textAlign = 'left';
    ctx.fillText(activeTheme.name.toUpperCase(), 26, 82);
    ctx.restore();
  }

  // Close-call flash — a brief amber pulse near the rocket area
  if (state.closeCallTimer > 0) {
    const fade = state.closeCallTimer / 24;
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(251, 146, 60, 0.9)';
    ctx.shadowBlur = 18;
    ctx.font = '800 18px "Inter", system-ui, sans-serif';
    ctx.letterSpacing = '4px';
    ctx.fillStyle = '#fb923c';
    ctx.fillText('CLOSE CALL', w / 2, h * 0.22);
    ctx.letterSpacing = '0px';
    ctx.restore();
  }

  // Active power-up effect HUD — small pills at the bottom-center
  if (state.activeEffects.length > 0) {
    const pillW = 110;
    const pillH = 28;
    const pillGap = 8;
    const totalW = state.activeEffects.length * pillW + (state.activeEffects.length - 1) * pillGap;
    const startX = (w - totalW) / 2;
    const pillY = h - 50;

    const effectMeta: Record<PowerUpType, { label: string; color: string; bg: string }> = {
      shield: { label: '🛡 SHIELD', color: '#38bdf8', bg: 'rgba(56,189,248,0.12)' },
      magnet: { label: '🧲 MAGNET', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
      wormhole: { label: '🌀 WARP', color: '#c084fc', bg: 'rgba(192,132,252,0.12)' },
      time_dilation: { label: '⏳ SLOW-MO', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
      gravity_pulse: { label: '💠 PULSE', color: '#818cf8', bg: 'rgba(129,140,248,0.12)' },
    };

    state.activeEffects.forEach((ef, i) => {
      const px = startX + i * (pillW + pillGap);
      const meta = effectMeta[ef.type];
      const progress = ef.timer / ef.maxTimer;
      const isLow = progress < 0.25;

      ctx.save();
      // Pill background
      ctx.beginPath();
      ctx.roundRect(px, pillY, pillW, pillH, pillH / 2);
      ctx.fillStyle = meta.bg;
      ctx.fill();
      ctx.strokeStyle = isLow ? 'rgba(251,113,133,0.5)' : meta.color;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Progress bar inside the pill (bottom 3px)
      const barY = pillY + pillH - 4;
      const barW = pillW - 16;
      const barX = px + 8;
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW, 2, 1);
      ctx.fill();
      ctx.fillStyle = isLow ? '#fb7185' : meta.color;
      ctx.beginPath();
      ctx.roundRect(barX, barY, Math.max(1, barW * progress), 2, 1);
      ctx.fill();

      // Label
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '700 10px "Inter", system-ui, sans-serif';
      ctx.letterSpacing = '1px';
      ctx.fillStyle = isLow ? '#fb7185' : meta.color;
      ctx.fillText(meta.label, px + pillW / 2, pillY + pillH / 2 - 2);
      ctx.letterSpacing = '0px';
      ctx.textBaseline = 'alphabetic';
      ctx.restore();
    });
  }

  // Wormhole warp flash overlay
  if (state.wormholeFlashTimer > 0) {
    const flashAlpha = (state.wormholeFlashTimer / 30) * 0.35;
    ctx.save();
    ctx.globalAlpha = flashAlpha;
    ctx.fillStyle = '#c084fc';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // Shield-hit flash overlay
  if (state.shieldHitTimer > 0) {
    const flashAlpha = (state.shieldHitTimer / 30) * 0.25;
    ctx.save();
    ctx.globalAlpha = flashAlpha;
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(0, 0, w, h);
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
    craters: [],
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

  drawPreview(rocketTypes[prevIdx], -sideOffset, 0.95 * verticalScale, 0.35);
  drawPreview(rocketTypes[nextIdx], sideOffset, 0.95 * verticalScale, 0.35);

  // Selected rocket — larger, glowing, gentle bob
  const bob = Math.sin(time * 0.0028) * 2;
  ctx.save();
  ctx.shadowColor = 'rgba(56, 189, 248, 0.55)';
  ctx.shadowBlur = 22;
  ctx.translate(w / 2, selectorY - 6 * verticalScale + bob);
  ctx.scale(1.7 * verticalScale, 1.7 * verticalScale);
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

  // Power-up info legend (visible on wider screens)
  if (w > 768) {
    ctx.save();
    // Position to the left of the central planet
    const legendX = (w / 2) - Math.min(380, w * 0.45);
    const legendY = py - 60; // Shifted up slightly to fit 5 items

    ctx.textAlign = 'left';
    ctx.font = '700 11px "Inter", system-ui, sans-serif';
    ctx.letterSpacing = '2px';
    ctx.fillStyle = 'rgba(186, 230, 253, 0.4)';
    ctx.fillText('PICKUPS', legendX + 40, legendY - 20);

    const drawLegendItem = (yOffset: number, type: PowerUpType, title: string, desc: string) => {
      const y = legendY + yOffset;
      // Draw a stationary/slow-bobbing powerup icon
      drawPowerUp(ctx, legendX + 15, y + 6, type, 11, yOffset, time);

      ctx.textAlign = 'left';
      ctx.font = '800 12px "Inter", system-ui, sans-serif';
      ctx.letterSpacing = '1px';
      
      let titleColor = '#ffffff';
      if (type === 'shield') titleColor = '#38bdf8';
      else if (type === 'magnet') titleColor = '#fbbf24';
      else if (type === 'wormhole') titleColor = '#c084fc';
      else if (type === 'time_dilation') titleColor = '#10b981';
      else if (type === 'gravity_pulse') titleColor = '#818cf8';

      ctx.fillStyle = titleColor;
      ctx.fillText(title, legendX + 40, y);

      ctx.font = '500 11px "Inter", system-ui, sans-serif';
      ctx.letterSpacing = '0.5px';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.fillText(desc, legendX + 40, y + 16);
    };

    drawLegendItem(0, 'shield', 'SHIELD', 'Absorbs 1 fatal impact');
    drawLegendItem(40, 'magnet', 'MAGNET', 'Widens orbit capture zone');
    drawLegendItem(80, 'wormhole', 'WORMHOLE', 'Warps 500m forward');
    drawLegendItem(120, 'time_dilation', 'SLOW-MO', 'Slows time by 60%');
    drawLegendItem(160, 'gravity_pulse', 'GRAVITY PULSE', 'Pushes hazards away');

    ctx.restore();
  }

  // Leaderboard Button
  const lbBtn = getLeaderboardButtonBounds(w, h);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(lbBtn.x, lbBtn.y, lbBtn.width, lbBtn.height, lbBtn.height / 2);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = '700 13px "Inter", system-ui, sans-serif';
  ctx.letterSpacing = '2px';
  ctx.fillStyle = '#bae6fd';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🏆 LEADERBOARD', lbBtn.x + lbBtn.width / 2, lbBtn.y + lbBtn.height / 2);
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
  isCopied: boolean,
  isRetryHover: boolean = false,
  isShareHover: boolean = false,
  tipSeed: number = 0,
  closeCalls: number = 0
) {
  const deathFeedback = getDeathFeedback(deathReason, tipSeed);

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

  // Retry CTA below card — pill button, brightens on hover (desktop only)
  const retryBtn = getRetryButtonBounds(w, h);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(retryBtn.x, retryBtn.y, retryBtn.width, retryBtn.height, retryBtn.height / 2);
  ctx.fillStyle = isRetryHover ? 'rgba(56, 189, 248, 0.22)' : 'rgba(56, 189, 248, 0.08)';
  ctx.fill();
  ctx.strokeStyle = isRetryHover ? 'rgba(56, 189, 248, 0.75)' : 'rgba(56, 189, 248, 0.3)';
  ctx.lineWidth = isRetryHover ? 1.5 : 1;
  ctx.stroke();

  ctx.shadowColor = 'rgba(56,189,248,0.6)';
  ctx.shadowBlur = isRetryHover ? 24 : 12;
  ctx.fillStyle = isRetryHover ? '#bae6fd' : '#38bdf8';
  ctx.font = '800 16px "Inter", system-ui, sans-serif';
  ctx.letterSpacing = '3px';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('RETRY', retryBtn.x + retryBtn.width / 2, retryBtn.y + retryBtn.height / 2);
  ctx.textBaseline = 'alphabetic';
  ctx.restore();
  ctx.letterSpacing = '0px';

  // Share button — right side of the button row, hover brightens on desktop
  const share = getShareButtonBounds(w, h);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(share.x, share.y, share.width, share.height, share.height / 2);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const btnTextY = share.y + share.height / 2;
  const btnTextX = share.x + share.width / 2;

  if (isCopied) {
    ctx.fillStyle = isShareHover ? 'rgba(52,211,153,0.28)' : 'rgba(52,211,153,0.15)';
    ctx.fill();
    ctx.strokeStyle = isShareHover ? 'rgba(52,211,153,0.7)' : 'rgba(52,211,153,0.4)';
    ctx.lineWidth = isShareHover ? 1.5 : 1;
    ctx.stroke();
    ctx.shadowColor = 'rgba(52,211,153,0.5)';
    ctx.shadowBlur = isShareHover ? 18 : 0;
    ctx.font = '700 12px "Inter", system-ui, sans-serif';
    ctx.letterSpacing = '1px';
    ctx.fillStyle = isShareHover ? '#a7f3d0' : '#34d399';
    ctx.fillText('✓  COPIED', btnTextX, btnTextY);
    ctx.letterSpacing = '0px';
  } else {
    ctx.fillStyle = isShareHover ? 'rgba(56,189,248,0.22)' : 'rgba(56,189,248,0.12)';
    ctx.fill();
    ctx.strokeStyle = isShareHover ? 'rgba(56,189,248,0.6)' : 'rgba(56,189,248,0.3)';
    ctx.lineWidth = isShareHover ? 1.5 : 1;
    ctx.stroke();
    ctx.shadowColor = 'rgba(56,189,248,0.5)';
    ctx.shadowBlur = isShareHover ? 18 : 0;
    ctx.font = '600 12px "Inter", system-ui, sans-serif';
    ctx.letterSpacing = '1px';
    ctx.fillStyle = isShareHover ? '#bae6fd' : '#7dd3fc';
    ctx.fillText('COPY RUN CARD', btnTextX, btnTextY);
    ctx.letterSpacing = '0px';
  }
  ctx.textBaseline = 'alphabetic';
  ctx.restore();

  // Stats pill button — top-left corner
  const statsBtn = getStatsButtonBounds(w, h);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(statsBtn.x, statsBtn.y, statsBtn.width, statsBtn.height, statsBtn.height / 2);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();
  
  ctx.font = 'bold 13px "Inter", system-ui, sans-serif';
  ctx.letterSpacing = '1px';
  ctx.fillStyle = '#38bdf8';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('📊 STATS', statsBtn.x + statsBtn.width / 2, statsBtn.y + statsBtn.height / 2);
  ctx.textBaseline = 'alphabetic';
  ctx.letterSpacing = '0px';
  ctx.restore();
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
  const cardH = 320;
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

  // Mute toggle — circular button top-right of the card
  const mb = getMuteButtonGeom(w, h);
  ctx.save();
  ctx.beginPath();
  ctx.arc(mb.cx, mb.cy, mb.r, 0, Math.PI * 2);
  ctx.fillStyle = state.settings.muted
    ? 'rgba(251, 113, 133, 0.18)'
    : 'rgba(56, 189, 248, 0.15)';
  ctx.fill();
  ctx.strokeStyle = state.settings.muted
    ? 'rgba(251, 113, 133, 0.5)'
    : 'rgba(56, 189, 248, 0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();
  // Speaker glyph
  const sx = mb.cx - 4;
  const sy = mb.cy;
  ctx.fillStyle = state.settings.muted ? '#fb7185' : '#7dd3fc';
  ctx.beginPath();
  ctx.moveTo(sx - 4, sy - 3);
  ctx.lineTo(sx, sy - 3);
  ctx.lineTo(sx + 4, sy - 6);
  ctx.lineTo(sx + 4, sy + 6);
  ctx.lineTo(sx, sy + 3);
  ctx.lineTo(sx - 4, sy + 3);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = state.settings.muted ? '#fb7185' : '#7dd3fc';
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  if (state.settings.muted) {
    // Slash through the speaker
    ctx.beginPath();
    ctx.moveTo(mb.cx - 7, mb.cy - 7);
    ctx.lineTo(mb.cx + 7, mb.cy + 7);
    ctx.stroke();
  } else {
    // Sound waves
    ctx.beginPath();
    ctx.arc(sx + 5, sy, 3, -Math.PI / 4, Math.PI / 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(sx + 5, sy, 6, -Math.PI / 4, Math.PI / 4);
    ctx.stroke();
  }
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

  // Visual dim when muted — sliders still show their values but faded
  const sliderOpacity = settings.muted ? 0.35 : 1;
  ctx.save();
  ctx.globalAlpha = sliderOpacity;

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

  ctx.restore();
  ctx.textAlign = 'left';

  // Low Graphics toggle
  ctx.fillStyle = 'rgba(186, 230, 253, 0.7)';
  ctx.fillText('Low Graphics', sliderX, cardY + 185);
  const toggleX = sliderX + sliderW - 40;
  const toggleY = cardY + 174;
  ctx.beginPath();
  ctx.roundRect(toggleX, toggleY, 40, 20, 10);
  ctx.fillStyle = settings.lowGraphics ? 'rgba(52,211,153,0.6)' : 'rgba(56,189,248,0.15)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(settings.lowGraphics ? toggleX + 28 : toggleX + 12, toggleY + 10, 7, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // Reduced Motion toggle
  ctx.fillStyle = 'rgba(186, 230, 253, 0.7)';
  ctx.fillText('Reduced Motion', sliderX, cardY + 225);
  const rmToggleY = cardY + 214;
  ctx.beginPath();
  ctx.roundRect(toggleX, rmToggleY, 40, 20, 10);
  ctx.fillStyle = settings.reducedMotion ? 'rgba(52,211,153,0.6)' : 'rgba(56,189,248,0.15)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(settings.reducedMotion ? toggleX + 28 : toggleX + 12, rmToggleY + 10, 7, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // Resume hint
  ctx.textAlign = 'center';
  ctx.font = '400 12px "Inter", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(186, 230, 253, 0.4)';
  ctx.fillText('Press ESC or tap to resume', w / 2, cardY + cardH - 20);
}

export function getStatsBackButtonBounds(w: number, h: number): { x: number; y: number; width: number; height: number } {
  const btnW = 120;
  return { x: 20, y: 20, width: btnW, height: 38 };
}

export function getLeaderboardButtonBounds(w: number, h: number) {
  const width = 160;
  const height = 40;
  return { x: w - width - 20, y: 20, width, height };
}

export function renderStats(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  stats: import('./types').LifetimeStats
) {
  // Dark overlay
  ctx.fillStyle = 'rgba(4, 6, 15, 0.88)';
  ctx.fillRect(0, 0, w, h);

  const cardW = Math.min(320, w * 0.88);
  const cardH = 450;
  const cardX = (w - cardW) / 2;
  const cardY = (h - cardH) / 2 - 10;

  // Card panel
  ctx.save();
  ctx.shadowColor = 'rgba(10, 14, 36, 0.9)';
  ctx.shadowBlur = 40;
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 20);
  ctx.fillStyle = 'rgba(7, 10, 24, 0.8)';
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Title
  ctx.save();
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(56,189,248,0.4)';
  ctx.shadowBlur = 20;
  ctx.font = '800 24px "Inter", system-ui, sans-serif';
  ctx.letterSpacing = '5px';
  ctx.fillStyle = '#e0f2fe';
  ctx.fillText('LIFETIME STATS', w / 2, cardY + 48);
  ctx.restore();
  ctx.letterSpacing = '0px';

  // Divider
  const dg = ctx.createLinearGradient(w / 2 - 60, 0, w / 2 + 60, 0);
  dg.addColorStop(0, 'rgba(56,189,248,0)');
  dg.addColorStop(0.5, 'rgba(56,189,248,0.3)');
  dg.addColorStop(1, 'rgba(56,189,248,0)');
  ctx.fillStyle = dg;
  ctx.fillRect(w / 2 - 60, cardY + 62, 120, 1);

  // Stat rows
  const leftX = cardX + 24;
  const rightX = cardX + cardW - 24;
  let rowY = cardY + 90;
  const rowGap = 28;

  const drawRow = (label: string, value: string, color = '#cbd5e1') => {
    ctx.textAlign = 'left';
    ctx.font = '500 12px "Inter", system-ui, sans-serif';
    ctx.letterSpacing = '1px';
    ctx.fillStyle = 'rgba(186, 230, 253, 0.5)';
    ctx.fillText(label, leftX, rowY);
    ctx.textAlign = 'right';
    ctx.letterSpacing = '0px';
    ctx.fillStyle = color;
    ctx.font = '700 13px "Inter", system-ui, sans-serif';
    ctx.fillText(value, rightX, rowY);
    rowY += rowGap;
  };

  drawRow('TOTAL FLIGHTS', stats.totalFlights.toLocaleString());
  drawRow('TOTAL DISTANCE', `${stats.totalDistance.toLocaleString()}m`);
  drawRow('EARTHS FOUND', stats.totalEarths.toLocaleString(), '#34d399');
  drawRow('COMBO BONUS TOTAL', `+${stats.totalCombo.toLocaleString()}`, '#fbbf24');
  drawRow('CLOSE CALLS', stats.totalCloseCalls.toLocaleString(), '#fb923c');
  drawRow('BEST COMBO', `x${stats.bestCombo}`, '#fbbf24');
  drawRow('COMETS DODGED', stats.cometsDodged.toLocaleString(), '#fcd34d');
  drawRow('POWER-UPS', stats.powerupsCollected.toLocaleString(), '#c084fc');

  // Favorite rocket
  const usage = stats.rocketUsage;
  let fav: 'aerospace' | 'classic' | 'stealth' = 'aerospace';
  if (usage.classic > usage[fav]) fav = 'classic';
  if (usage.stealth > usage[fav]) fav = 'stealth';
  drawRow('FAVORITE ROCKET', fav.toUpperCase(), '#38bdf8');

  // Back button
  const backBtn = getStatsBackButtonBounds(w, h);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(backBtn.x, backBtn.y, backBtn.width, backBtn.height, backBtn.height / 2);
  ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.shadowColor = 'rgba(56,189,248,0.5)';
  ctx.shadowBlur = 12;
  ctx.fillStyle = '#38bdf8';
  ctx.font = '700 14px "Inter", system-ui, sans-serif';
  ctx.letterSpacing = '3px';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('BACK', backBtn.x + backBtn.width / 2, backBtn.y + backBtn.height / 2);
  ctx.textBaseline = 'alphabetic';
  ctx.letterSpacing = '0px';
  ctx.restore();
}
