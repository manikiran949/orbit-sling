import { GameState, Planet, PlanetType, Asteroid, Star, Nebula, Particle, SolarFlare, GameSettings } from './types';

const ROCKET_SPEED = 4.2;
const ORBIT_SPEED = 0.05;

const TRAIL_LENGTH = 60;
const COMBO_WINDOW = 120; // frames (~2 seconds at 60fps)

const PLANET_PALETTES = [
  { color: '#e8a838', glow: 'rgba(232,168,56,0.45)', accent: '#b87a1c' },    // Gold
  { color: '#38bdf8', glow: 'rgba(56,189,248,0.45)', accent: '#0c7ba8' },    // Cyan
  { color: '#f472b6', glow: 'rgba(244,114,182,0.45)', accent: '#b53d80' },   // Pink
  { color: '#a78bfa', glow: 'rgba(167,139,250,0.45)', accent: '#6d4cc4' },   // Violet
  { color: '#34d399', glow: 'rgba(52,211,153,0.45)', accent: '#0e8a64' },    // Emerald
  { color: '#fb7185', glow: 'rgba(251,113,133,0.45)', accent: '#be3a52' },   // Rose
  { color: '#facc15', glow: 'rgba(250,204,21,0.45)', accent: '#a17a08' },    // Amber
  { color: '#2dd4bf', glow: 'rgba(45,212,191,0.45)', accent: '#0d9488' },    // Teal
  { color: '#fb923c', glow: 'rgba(251,146,60,0.45)', accent: '#c2410c' },    // Coral
  { color: '#818cf8', glow: 'rgba(129,140,248,0.45)', accent: '#4f46e5' },   // Indigo
];

const NEBULA_COLORS = [
  'rgba(100,80,200,0.07)',
  'rgba(40,120,200,0.06)',
  'rgba(180,60,120,0.05)',
  'rgba(30,150,130,0.05)',
  'rgba(60,60,160,0.06)',
  'rgba(140,50,180,0.05)',
];

const STAR_COLORS = [
  '#ffffff',   // white
  '#cbe5ff',   // cool blue-white
  '#a8d8ff',   // light blue
  '#fff5e0',   // warm white
  '#ffe4c4',   // warm peach
  '#d4e4ff',   // pale blue
];

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

function loadSettings(): GameSettings {
  try {
    const s = localStorage.getItem('orbitSettings');
    if (s) return JSON.parse(s);
  } catch { /* ignore */ }
  return { musicVolume: 0.5, sfxVolume: 0.7, lowGraphics: false };
}

export function saveSettings(settings: GameSettings) {
  localStorage.setItem('orbitSettings', JSON.stringify(settings));
}

function generatePlanet(minX: number, difficulty = 0, canvasH = 600): Planet {
  // Difficulty: smaller planets, farther apart over time
  const radiusMin = Math.max(16, 26 - difficulty * 2);
  const radiusMax = Math.max(24, 44 - difficulty * 3);
  const radius = rand(radiusMin, radiusMax);
  const spacingMin = 220 + difficulty * 30;
  const spacingMax = 380 + difficulty * 60;

  // Determine planet type
  const typeRoll = Math.random();
  let planetType: PlanetType;
  if (typeRoll < 0.15) planetType = 'earth';
  else if (typeRoll < 0.30) planetType = 'ice';
  else if (typeRoll < 0.45) planetType = 'lava';
  else if (typeRoll < 0.65) planetType = 'gas';
  else planetType = 'rocky';

  // Choose colors based on type
  let color: string, glow: string, accent: string;
  switch (planetType) {
    case 'earth':
      color = '#3b82f6';
      glow = 'rgba(59,130,246,0.45)';
      accent = '#16a34a';
      break;
    case 'ice':
      color = '#67e8f9';
      glow = 'rgba(103,232,249,0.45)';
      accent = '#0e7490';
      break;
    case 'lava':
      color = '#ef4444';
      glow = 'rgba(239,68,68,0.45)';
      accent = '#f97316';
      break;
    case 'gas': {
      const gasPalettes = [
        { color: '#e8a838', glow: 'rgba(232,168,56,0.45)', accent: '#b87a1c' },
        { color: '#a78bfa', glow: 'rgba(167,139,250,0.45)', accent: '#6d4cc4' },
        { color: '#fb923c', glow: 'rgba(251,146,60,0.45)', accent: '#c2410c' },
      ];
      const gp = gasPalettes[Math.floor(Math.random() * gasPalettes.length)];
      color = gp.color; glow = gp.glow; accent = gp.accent;
      break;
    }
    default: {
      const c = PLANET_PALETTES[Math.floor(Math.random() * PLANET_PALETTES.length)];
      color = c.color; glow = c.glow; accent = c.accent;
      break;
    }
  }

  const craters: { x: number; y: number; r: number }[] = [];
  const craterCount = planetType === 'gas' ? 0 : Math.floor(rand(2, 5));
  for (let i = 0; i < craterCount; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = Math.random() * radius * 0.65;
    craters.push({
      x: Math.cos(a) * d,
      y: Math.sin(a) * d,
      r: rand(radius * 0.08, radius * 0.18),
    });
  }

  return {
    x: minX + rand(spacingMin, spacingMax),
    y: rand(140, Math.max(460, canvasH - 140)),
    radius,
    orbitRadius: radius + rand(40, 60),
    color,
    glowColor: glow,
    accentColor: accent,
    hasRing: planetType === 'gas' ? Math.random() < 0.5 : Math.random() < 0.15,
    ringTilt: rand(-0.4, 0.4),
    craters,
    rotation: Math.random() * Math.PI * 2,
    planetType,
  };
}

function generateAsteroid(minX: number, planets: Planet[], canvasH = 600): Asteroid {
  const radius = rand(8, 16);
  const verts: number[] = [];
  const n = Math.floor(rand(6, 9));
  for (let i = 0; i < n; i++) {
    verts.push(radius * rand(0.7, 1.3));
  }

  // Try up to 10 times to find a position that doesn't overlap any orbit path
  let x = 0, y = 0;
  const clearance = 25; // min distance from any orbit ring
  for (let attempt = 0; attempt < 10; attempt++) {
    x = minX + rand(150, 350);
    y = rand(80, Math.max(520, canvasH - 80));
    let overlaps = false;
    for (const p of planets) {
      const dist = Math.hypot(x - p.x, y - p.y);
      // Check if asteroid sits on the orbit ring (too close to orbitRadius)
      if (Math.abs(dist - p.orbitRadius) < radius + clearance) {
        overlaps = true;
        break;
      }
      // Also avoid being inside the planet itself
      if (dist < p.radius + radius + 10) {
        overlaps = true;
        break;
      }
    }
    if (!overlaps) break;
  }

  return {
    x,
    y,
    radius,
    rotation: Math.random() * Math.PI * 2,
    vertices: verts,
    spin: rand(-0.02, 0.02),
  };
}

function generateStars(): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < 300; i++) {
    stars.push({
      x: rand(0, 4000),
      y: rand(0, 700),
      size: rand(0.3, 2.0),
      brightness: rand(0.2, 1),
      twinkleSpeed: rand(0.001, 0.003),
      parallax: rand(0.05, 0.45),
      color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
    });
  }
  return stars;
}

function generateNebulae(): Nebula[] {
  const nebs: Nebula[] = [];
  for (let i = 0; i < 10; i++) {
    nebs.push({
      x: rand(0, 5000),
      y: rand(30, 620),
      radius: rand(180, 400),
      color: NEBULA_COLORS[Math.floor(Math.random() * NEBULA_COLORS.length)],
    });
  }
  return nebs;
}

function generateSolarFlare(minX: number, canvasH: number): SolarFlare {
  const h = rand(40, 100);
  return {
    x: minX + rand(600, 1200),
    y: rand(60, canvasH - 60 - h),
    width: rand(200, 500),
    height: h,
    speed: rand(0.3, 0.8),
    color: Math.random() < 0.5 ? 'rgba(255,120,40,' : 'rgba(255,60,60,',
    opacity: rand(0.12, 0.25),
  };
}



export function createInitialState(canvasH = 600): GameState {
  const planets: Planet[] = [];
  // Hand-tuned starting planet
  planets.push({
    x: 200,
    y: Math.max(320, canvasH / 2),
    radius: 36,
    orbitRadius: 80,
    color: '#e8a838',
    glowColor: 'rgba(232,168,56,0.45)',
    accentColor: '#b87a1c',
    hasRing: false,
    ringTilt: 0,
    craters: [
      { x: -8, y: -6, r: 5 },
      { x: 10, y: 8, r: 4 },
      { x: -3, y: 14, r: 3 },
    ],
    rotation: 0,
    planetType: 'rocky',
  });

  // More starting planets, easier spacing
  let lastX = 200;
  for (let i = 0; i < 14; i++) {
    const p = generatePlanet(lastX, 0, canvasH);
    planets.push(p);
    lastX = p.x;
  }

  const asteroids: Asteroid[] = [];
  // Fewer/farther asteroids early
  for (let i = 0; i < 4; i++) {
    asteroids.push(generateAsteroid(800 + i * 600, planets, canvasH));
  }

  const firstPlanet = planets[0];
  const startAngle = Math.PI;

  return {
    rocket: {
      x: firstPlanet.x + Math.cos(startAngle) * firstPlanet.orbitRadius,
      y: firstPlanet.y + Math.sin(startAngle) * firstPlanet.orbitRadius,
      vx: 0,
      vy: 0,
      angle: 0,
      trail: [],
    },
    planets,
    asteroids,

    stars: generateStars(),
    nebulae: generateNebulae(),
    particles: [],
    solarFlares: [],
    camera: { x: 0, y: 0 },
    score: 0,
    highScore: parseInt(localStorage.getItem('orbitHighScore') || '0'),
    isOrbiting: true,
    orbitPlanetIndex: 0,

    orbitAngle: startAngle,
    orbitDirection: 1,
    captureProgress: 1,
    captureStartDist: 0,
    lastReleasedPlanet: -1,
    difficulty: 0,
    phase: 'menu',
    scoreBonus: 0,
    scoreBonusTimer: 0,
    scoreBonusLabel: '',
    combo: 0,
    comboTimer: 0,
    comboMultiplier: 1,
    maxCombo: 0,
    earthsFound: 0,
    screenShake: { intensity: 0, duration: 0 },
    paused: false,
    settings: loadSettings(),
    sunAngle: -Math.PI / 4,
    lastOrbitTime: 0,
    shareMessage: '',
    showTutorial: !localStorage.getItem('orbitTutorialSeen'),
  };
}

export function togglePause(state: GameState): void {
  if (state.phase !== 'playing') return;
  state.paused = !state.paused;
}

export function releaseRocket(state: GameState): void {
  if (!state.isOrbiting) return;
  if (state.orbitPlanetIndex < 0) return;

  const tangentAngle = state.orbitAngle + (state.orbitDirection * Math.PI / 2);

  const speed = ROCKET_SPEED;
  state.rocket.vx = Math.cos(tangentAngle) * speed;
  state.rocket.vy = Math.sin(tangentAngle) * speed;
  state.rocket.angle = tangentAngle;

  state.lastReleasedPlanet = state.orbitPlanetIndex;
  state.isOrbiting = false;
  state.orbitPlanetIndex = -1;

  // Burst particles on release
  const burstColor = state.lastReleasedPlanet >= 0
    ? state.planets[state.lastReleasedPlanet].color
    : '#67e8f9';
  for (let i = 0; i < 12; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = rand(0.5, 2.5);
    state.particles.push({
      x: state.rocket.x,
      y: state.rocket.y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 30,
      maxLife: 30,
      color: burstColor,
      size: rand(1.5, 3),
    });
  }
}

function tryAutoOrbit(state: GameState, frameCount: number): boolean {
  if (state.isOrbiting) return false;
  const r = state.rocket;
  for (let i = 0; i < state.planets.length; i++) {
    if (i === state.lastReleasedPlanet) continue;
    const p = state.planets[i];
    const dx = r.x - p.x;
    const dy = r.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d <= p.orbitRadius + 8 && d >= p.radius) {
      const cross = r.vx * dy - r.vy * dx;
      state.orbitDirection = cross > 0 ? -1 : 1;
      state.orbitAngle = Math.atan2(dy, dx);
      state.orbitPlanetIndex = i;
      state.isOrbiting = true;
      state.lastReleasedPlanet = -1;

      // Smooth capture: store start distance, don't snap position
      state.captureProgress = 0;
      state.captureStartDist = d;

      // Gentle screen shake on capture
      state.screenShake = { intensity: 2, duration: 8 };

      // Combo system
      if (state.comboTimer > 0) {
        state.combo += 1;
        state.comboMultiplier = Math.min(5, 1 + state.combo * 0.5);
        const comboBonus = Math.floor(10 * state.comboMultiplier);
        state.score += comboBonus;
        state.scoreBonus = comboBonus;
        state.scoreBonusTimer = 60;
        state.scoreBonusLabel = 'combo';
      } else {
        state.combo = 1;
        state.comboMultiplier = 1;
      }
      state.comboTimer = COMBO_WINDOW;
      state.maxCombo = Math.max(state.maxCombo, state.combo);
      state.lastOrbitTime = frameCount;

      // Capture sparkle
      const particleCount = state.settings.lowGraphics ? 8 : 16;
      for (let k = 0; k < particleCount; k++) {
        const a = Math.random() * Math.PI * 2;
        const sp = rand(0.3, 1.8);
        state.particles.push({
          x: r.x,
          y: r.y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: 40,
          maxLife: 40,
          color: p.color,
          size: rand(1, 2.5),
        });
      }

      // Earth bonus!
      if (p.planetType === 'earth') {
        state.earthsFound += 1;
        const bonus = 50;
        state.score += bonus;
        state.scoreBonus = bonus;
        state.scoreBonusTimer = 90;
        state.scoreBonusLabel = 'earth';
        // Extra green/blue sparkle burst
        const earthParticles = state.settings.lowGraphics ? 12 : 24;
        for (let k = 0; k < earthParticles; k++) {
          const a = Math.random() * Math.PI * 2;
          const sp = rand(1, 3);
          state.particles.push({
            x: r.x,
            y: r.y,
            vx: Math.cos(a) * sp,
            vy: Math.sin(a) * sp,
            life: 50,
            maxLife: 50,
            color: k % 2 === 0 ? '#34d399' : '#60a5fa',
            size: rand(2, 4),
          });
        }
      }
      return true; // captured
    }
  }



  if (state.lastReleasedPlanet >= 0) {
    const lp = state.planets[state.lastReleasedPlanet];
    const d = Math.hypot(r.x - lp.x, r.y - lp.y);
    if (d > lp.orbitRadius + 40) {
      state.lastReleasedPlanet = -1;
    }
  }
  return false;
}

function spawnDeathExplosion(state: GameState) {
  const r = state.rocket;
  const colors = ['#e0f2fe', '#38bdf8', '#fbbf24', '#fb923c', '#ef4444', '#ffffff'];
  const count = state.settings.lowGraphics ? 25 : 50;
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = rand(1, 5);
    state.particles.push({
      x: r.x,
      y: r.y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 60,
      maxLife: 60,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: rand(1.5, 4.5),
    });
  }
  // Screen shake on death (120 frames = 2 seconds)
  state.screenShake = { intensity: 10, duration: 120 };
}

function updateParticles(state: GameState) {
  state.particles = state.particles.filter((p) => {
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.95;
    p.vy *= 0.95;
    p.life -= 1;
    return p.life > 0;
  });
}

// Called during game over to keep particles and screen shake animating
export function updateVisualsOnly(state: GameState) {
  updateParticles(state);
  if (state.screenShake.duration > 0) {
    state.screenShake.duration -= 1;
    if (state.screenShake.duration <= 0) {
      state.screenShake.intensity = 0;
    }
  }
}

export function update(state: GameState, canvasW: number, canvasH: number, frameCount: number): boolean {
  if (state.paused) return true;

  const r = state.rocket;

  // Difficulty ramps slowly with distance
  state.difficulty = Math.min(5, state.score / 500);

  // Score bonus timer
  if (state.scoreBonusTimer > 0) {
    state.scoreBonusTimer -= 1;
  }

  // Combo timer countdown
  if (state.comboTimer > 0) {
    state.comboTimer -= 1;
    if (state.comboTimer <= 0) {
      state.combo = 0;
      state.comboMultiplier = 1;
    }
  }

  // Screen shake decay
  if (state.screenShake.duration > 0) {
    state.screenShake.duration -= 1;
    if (state.screenShake.duration <= 0) {
      state.screenShake.intensity = 0;
    }
  }

  if (state.isOrbiting && state.orbitPlanetIndex >= 0) {
    const p = state.planets[state.orbitPlanetIndex];
    state.orbitAngle += ORBIT_SPEED * state.orbitDirection;

    // Smooth capture transition: spiral into orbit over ~15 frames
    if (state.captureProgress < 1) {
      state.captureProgress = Math.min(1, state.captureProgress + 0.065);
      const ease = easeOutCubic(state.captureProgress);
      const currentRadius = state.captureStartDist + (p.orbitRadius - state.captureStartDist) * ease;
      r.x = p.x + Math.cos(state.orbitAngle) * currentRadius;
      r.y = p.y + Math.sin(state.orbitAngle) * currentRadius;

      // Smoothly transition rocket angle to tangent direction
      const targetAngle = state.orbitAngle + (state.orbitDirection * Math.PI / 2);
      r.angle = lerpAngle(r.angle, targetAngle, 0.2 + ease * 0.3);
    } else {
      r.x = p.x + Math.cos(state.orbitAngle) * p.orbitRadius;
      r.y = p.y + Math.sin(state.orbitAngle) * p.orbitRadius;
      r.angle = state.orbitAngle + (state.orbitDirection * Math.PI / 2);
    }

  } else {
    // Check solar flare slowdown
    let inFlare = false;
    for (const f of state.solarFlares) {
      if (r.x >= f.x && r.x <= f.x + f.width && r.y >= f.y && r.y <= f.y + f.height) {
        inFlare = true;
        break;
      }
    }
    if (inFlare) {
      // Warning particles
      if (Math.random() < 0.3) {
        state.particles.push({
          x: r.x + rand(-15, 15),
          y: r.y + rand(-15, 15),
          vx: rand(-0.5, 0.5),
          vy: rand(-0.5, 0.5),
          life: 15,
          maxLife: 15,
          color: '#ff6b35',
          size: rand(1, 2.5),
        });
      }
    }

    // Move rocket — slow inside flares, full speed outside
    const moveScale = inFlare ? 0.5 : 1;
    r.x += r.vx * moveScale;
    r.y += r.vy * moveScale;
    r.angle = Math.atan2(r.vy, r.vx);
    tryAutoOrbit(state, frameCount);

    // Thrust trail particles
    const thrustChance = state.settings.lowGraphics ? 0.3 : 0.6;
    if (Math.random() < thrustChance) {
      state.particles.push({
        x: r.x - Math.cos(r.angle) * 10,
        y: r.y - Math.sin(r.angle) * 10,
        vx: -Math.cos(r.angle) * 0.5 + rand(-0.3, 0.3),
        vy: -Math.sin(r.angle) * 0.5 + rand(-0.3, 0.3),
        life: 20,
        maxLife: 20,
        color: '#fcd34d',
        size: rand(1, 2),
      });
    }
  }

  // Slowly rotate planets for life
  for (const p of state.planets) {
    p.rotation += 0.002;
  }
  for (const a of state.asteroids) {
    a.rotation += a.spin;
  }



  r.trail.push({ x: r.x, y: r.y });
  if (r.trail.length > TRAIL_LENGTH) r.trail.shift();

  updateParticles(state);

  state.camera.x = r.x - canvasW * 0.3;
  state.camera.y = 0;

  state.score = Math.max(state.score, Math.floor(r.x / 10));

  const lastPlanet = state.planets[state.planets.length - 1];
  if (r.x > lastPlanet.x - canvasW * 1.5) {
    state.planets.push(generatePlanet(lastPlanet.x, state.difficulty, canvasH));
  }
  const lastAsteroid = state.asteroids[state.asteroids.length - 1];
  if (lastAsteroid && r.x > lastAsteroid.x - canvasW * 1.5) {
    const gap = rand(400 - state.difficulty * 40, 700 - state.difficulty * 60);
    state.asteroids.push(generateAsteroid(lastAsteroid.x + gap, state.planets, canvasH));
  }

  // Generate solar flares at intervals
  if (state.solarFlares.length === 0 || r.x > state.solarFlares[state.solarFlares.length - 1].x - canvasW) {
    const lastFlareX = state.solarFlares.length > 0
      ? state.solarFlares[state.solarFlares.length - 1].x + state.solarFlares[state.solarFlares.length - 1].width
      : r.x + canvasW;
    state.solarFlares.push(generateSolarFlare(lastFlareX, canvasH));
  }
  // Remove old solar flares behind camera
  state.solarFlares = state.solarFlares.filter(f => f.x + f.width > state.camera.x - 200);



  // Extend stars/nebulae as we travel
  if (state.stars.length > 0) {
    const maxStarX = state.stars.reduce((m, s) => Math.max(m, s.x), 0);
    if (r.x > maxStarX - canvasW * 2) {
      for (let i = 0; i < 80; i++) {
        state.stars.push({
          x: maxStarX + rand(0, 2000),
          y: rand(0, canvasH),
          size: rand(0.3, 2.0),
          brightness: rand(0.2, 1),
          twinkleSpeed: rand(0.001, 0.003),
          parallax: rand(0.05, 0.45),
          color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
        });
      }
    }
    const maxNebX = state.nebulae.reduce((m, n) => Math.max(m, n.x), 0);
    if (r.x > maxNebX - canvasW * 2) {
      for (let i = 0; i < 3; i++) {
        state.nebulae.push({
          x: maxNebX + rand(200, 1500),
          y: rand(50, canvasH - 50),
          radius: rand(150, 300),
          color: NEBULA_COLORS[Math.floor(Math.random() * NEBULA_COLORS.length)],
        });
      }
    }
  }

  for (const a of state.asteroids) {
    const d = Math.hypot(a.x - r.x, a.y - r.y);
    if (d < a.radius + 6) {
      spawnDeathExplosion(state);
      buildShareMessage(state);
      return false;
    }
  }

  if (!state.isOrbiting && (r.y < -40 || r.y > canvasH + 40)) {
    spawnDeathExplosion(state);
    buildShareMessage(state);
    return false;
  }
  if (r.x < state.camera.x - 60) {
    spawnDeathExplosion(state);
    buildShareMessage(state);
    return false;
  }

  return true;
}

export function buildShareMessage(state: GameState): void {
  const lines = [
    '🚀 ORBIT SLINGSHOT 🚀',
    '━━━━━━━━━━━━━━━━━━━━',
    `🏆 Score: ${state.score.toLocaleString()}m`
  ];
  
  if (state.maxCombo > 1) lines.push(`🔥 Max Combo: x${state.maxCombo}`);
  if (state.earthsFound > 0) lines.push(`🌍 Earths Found: ${state.earthsFound}`);
  
  lines.push('');
  lines.push('I survived the glass plains! Can you beat my score?');
  lines.push('🔗 https://orbit-slingshot.vercel.app');
  
  state.shareMessage = lines.join('\n');
}
