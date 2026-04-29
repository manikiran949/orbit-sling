import { GameState, Planet, PlanetType, Asteroid, Star, Nebula, Particle, SolarFlare, GameSettings, Comet, LifetimeStats, PowerUp, PowerUpType, ActiveEffect } from './types';
import { getThemeIndex } from './themes';

const ROCKET_SPEED = 4.2;
const ORBIT_SPEED_FACTOR = 3.5;

const TRAIL_LENGTH = 60;
const COMBO_WINDOW = 180;

const ROCKET_STATS: Record<string, { speedMult: number; hitboxRadius: number; orbitRadiusBonus: number }> = {
  aerospace: { speedMult: 1.0, hitboxRadius: 6, orbitRadiusBonus: 0 },
  classic: { speedMult: 1.15, hitboxRadius: 7, orbitRadiusBonus: 8 },
  stealth: { speedMult: 0.95, hitboxRadius: 4, orbitRadiusBonus: -5 },
};

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
  const defaults: GameSettings = {
    musicVolume: 0.5,
    sfxVolume: 0.7,
    lowGraphics: false,
    rocketType: 'aerospace',
    muted: false,
    reducedMotion: false,
  };
  try {
    const s = localStorage.getItem('orbitSettings');
    if (s) return { ...defaults, ...JSON.parse(s) };
  } catch { /* ignore */ }
  return defaults;
}

export function saveSettings(settings: GameSettings) {
  localStorage.setItem('orbitSettings', JSON.stringify(settings));
}

function defaultLifetimeStats(): LifetimeStats {
  return {
    totalFlights: 0, totalDistance: 0, totalEarths: 0, totalCombo: 0,
    totalCloseCalls: 0, bestCombo: 0, cometsDodged: 0, powerupsCollected: 0,
    rocketUsage: { aerospace: 0, classic: 0, stealth: 0 },
  };
}

export function loadLifetimeStats(): LifetimeStats {
  try {
    const s = localStorage.getItem('orbitLifetimeStats');
    if (s) return { ...defaultLifetimeStats(), ...JSON.parse(s) };
  } catch { /* ignore */ }
  return defaultLifetimeStats();
}

export function saveLifetimeStats(stats: LifetimeStats) {
  localStorage.setItem('orbitLifetimeStats', JSON.stringify(stats));
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
    y: rand(canvasH * 0.18, canvasH * 0.82),
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
    earthBonusClaimed: false,
  };
}

function generateAsteroid(minX: number, planets: Planet[], canvasH = 600): Asteroid | null {
  const radius = rand(8, 16);
  const verts: number[] = [];
  const n = Math.floor(rand(6, 9));
  for (let i = 0; i < n; i++) {
    verts.push(radius * rand(0.7, 1.3));
  }

  // Reject any position within the entire orbit sphere (+ clearance) of any planet.
  // Previously we only rejected spots near the orbit ring, which let asteroids
  // land inside the orbit zone — the rocket's spiral-in path would then collide.
  const clearance = 20;
  let x = 0, y = 0;
  for (let attempt = 0; attempt < 30; attempt++) {
    const xRangeHi = 350 + attempt * 20; // progressively widen search window
    x = minX + rand(150, xRangeHi);
    y = rand(canvasH * 0.1, canvasH * 0.9);

    let overlaps = false;
    for (const p of planets) {
      // Coarse x prune: planets far ahead can't overlap this asteroid.
      if (Math.abs(p.x - x) > p.orbitRadius + radius + clearance + 40) continue;
      const dist = Math.hypot(x - p.x, y - p.y);
      if (dist < p.orbitRadius + radius + clearance) {
        overlaps = true;
        break;
      }
    }
    if (!overlaps) {
      return {
        x,
        y,
        radius,
        rotation: Math.random() * Math.PI * 2,
        vertices: verts,
        spin: rand(-0.02, 0.02),
      };
    }
  }

  // Couldn't find a safe spot after many tries — skip this asteroid rather
  // than placing it on a planet's orbit.
  return null;
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

function generateComet(cameraX: number, canvasW: number, canvasH: number): Comet {
  const radius = rand(5, 10);
  const angleSpread = rand(-0.4, 0.4);
  const speed = rand(5, 8);
  return {
    x: cameraX + canvasW + rand(50, 200),
    y: rand(canvasH * 0.1, canvasH * 0.9),
    vx: -Math.cos(angleSpread) * speed,
    vy: Math.sin(angleSpread) * speed,
    radius,
    rotation: Math.random() * Math.PI * 2,
    spin: rand(-0.08, 0.08),
    trail: [],
  };
}

const POWERUP_DURATIONS: Record<PowerUpType, number> = {
  shield: 600,  // 10 seconds at 60fps
  magnet: 480,  // 8 seconds
  wormhole: 1,  // instant — consumed immediately
};

function generatePowerUp(minX: number, planets: Planet[], canvasH: number): PowerUp | null {
  const types: PowerUpType[] = ['shield', 'magnet', 'wormhole'];
  const typeWeights = [0.40, 0.35, 0.25]; // shield most common, wormhole rarest
  const roll = Math.random();
  let cumulative = 0;
  let type: PowerUpType = 'shield';
  for (let i = 0; i < types.length; i++) {
    cumulative += typeWeights[i];
    if (roll < cumulative) { type = types[i]; break; }
  }

  const radius = 14;
  const clearance = 30;

  for (let attempt = 0; attempt < 20; attempt++) {
    const x = minX + rand(200, 500);
    const y = rand(canvasH * 0.15, canvasH * 0.85);

    let overlaps = false;
    for (const p of planets) {
      if (Math.abs(p.x - x) > p.orbitRadius + radius + clearance + 40) continue;
      const dist = Math.hypot(x - p.x, y - p.y);
      if (dist < p.orbitRadius + radius + clearance) {
        overlaps = true;
        break;
      }
    }
    if (!overlaps) {
      return {
        x,
        y,
        type,
        radius,
        bobPhase: Math.random() * Math.PI * 2,
        collected: false,
      };
    }
  }
  return null;
}


export function createInitialState(canvasH = 600): GameState {
  const planets: Planet[] = [];
  // Hand-tuned starting planet
  planets.push({
    x: 200,
    y: canvasH / 2,
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
    earthBonusClaimed: false,
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
    const a = generateAsteroid(800 + i * 600, planets, canvasH);
    if (a) asteroids.push(a);
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
    comets: [],
    powerups: [],
    activeEffects: [],

    stars: generateStars(),
    nebulae: generateNebulae(),
    particles: [],
    solarFlares: [],
    camera: { x: 0, y: 0 },
    score: 0,
    distanceMeters: 0,
    comboBonusEarned: 0,
    earthBonusEarned: 0,
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
    deathReason: '',
    showTutorial: !localStorage.getItem('orbitTutorialSeen'),
    activeThemeIndex: 0,
    themeBannerTimer: 0,
    themeBannerIndex: 0,
    closeCalls: 0,
    closeCallTimer: 0,
    closeCallCooldown: 0,
    shieldHitTimer: 0,
    wormholeFlashTimer: 0,
    powerupsCollectedThisRun: 0,
    lifetimeStats: loadLifetimeStats(),
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

  const stats = ROCKET_STATS[state.settings.rocketType] || ROCKET_STATS.aerospace;
  const speed = ROCKET_SPEED * stats.speedMult;
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

  // Directional engine exhaust burst — colored by rocket type
  const exhaustColors: Record<string, string> = {
    aerospace: '#38bdf8',
    classic: '#fb923c',
    stealth: '#c084fc',
  };
  const exColor = exhaustColors[state.settings.rocketType] || '#38bdf8';
  const backAngle = tangentAngle + Math.PI;
  for (let i = 0; i < 8; i++) {
    const a = backAngle + rand(-0.5, 0.5);
    const sp = rand(2, 5);
    state.particles.push({
      x: state.rocket.x,
      y: state.rocket.y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 25,
      maxLife: 25,
      color: i % 2 === 0 ? exColor : '#ffffff',
      size: rand(1.5, 3.5),
    });
  }
}

function tryAutoOrbit(state: GameState, frameCount: number): boolean {
  if (state.isOrbiting) return false;
  const r = state.rocket;
  const rStats = ROCKET_STATS[state.settings.rocketType] || ROCKET_STATS.aerospace;
  for (let i = 0; i < state.planets.length; i++) {
    if (i === state.lastReleasedPlanet) continue;
    const p = state.planets[i];
    const dx = r.x - p.x;
    const dy = r.y - p.y;
    const d = Math.hypot(dx, dy);
    const effectiveOrbitBonus = rStats.orbitRadiusBonus + (hasActiveEffect(state, 'magnet') ? 25 : 0);
    if (d <= p.orbitRadius + 8 + effectiveOrbitBonus && d >= p.radius) {


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
        state.comboBonusEarned += comboBonus;
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

      // Earth bonus can be claimed only once per Earth planet.
      if (p.planetType === 'earth' && !p.earthBonusClaimed) {
        p.earthBonusClaimed = true;
        state.earthsFound += 1;
        const bonus = 50;
        state.earthBonusEarned += bonus;
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
  // Keep HUD timers decaying during game over
  if (state.shieldHitTimer > 0) state.shieldHitTimer -= 1;
  if (state.wormholeFlashTimer > 0) state.wormholeFlashTimer -= 1;
}

function hasActiveEffect(state: GameState, type: PowerUpType): boolean {
  return state.activeEffects.some(e => e.type === type && e.timer > 0);
}

function activatePowerUp(state: GameState, type: PowerUpType): void {
  if (type === 'wormhole') {
    // Instant teleport: warp forward 500 world-units
    const warpDistance = 500;
    state.rocket.x += warpDistance;
    state.distanceMeters += Math.floor(warpDistance / 10);
    state.score = state.distanceMeters + state.comboBonusEarned + state.earthBonusEarned;
    state.wormholeFlashTimer = 30; // visual flash
    state.screenShake = { intensity: 6, duration: 20 };
    // Reset orbit state so we don't keep orbiting a planet we're now far from
    if (state.isOrbiting) {
      state.isOrbiting = false;
      state.orbitPlanetIndex = -1;
      const stats = ROCKET_STATS[state.settings.rocketType] || ROCKET_STATS.aerospace;
      const speed = ROCKET_SPEED * stats.speedMult;
      state.rocket.vx = speed;
      state.rocket.vy = 0;
      state.rocket.angle = 0;
    }
    state.lastReleasedPlanet = -1;
    // Clear trail so it doesn't draw a line across the warp
    state.rocket.trail = [];
    // Burst particles at the exit point
    for (let i = 0; i < 24; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = rand(1, 4);
      state.particles.push({
        x: state.rocket.x, y: state.rocket.y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 40, maxLife: 40,
        color: i % 3 === 0 ? '#c084fc' : i % 3 === 1 ? '#e879f9' : '#ffffff',
        size: rand(2, 4),
      });
    }
    return;
  }

  // Timed effects (shield, magnet): stack duration if already active
  const existing = state.activeEffects.find(e => e.type === type);
  const duration = POWERUP_DURATIONS[type];
  if (existing) {
    existing.timer = duration;
    existing.maxTimer = duration;
  } else {
    state.activeEffects.push({ type, timer: duration, maxTimer: duration });
  }
}

function removeActiveEffect(state: GameState, type: PowerUpType): void {
  state.activeEffects = state.activeEffects.filter(e => e.type !== type);
}

export function update(state: GameState, canvasW: number, canvasH: number, frameCount: number): boolean {
  if (state.paused) return true;

  const r = state.rocket;

  // Difficulty ramps slowly with distance
  state.difficulty = Math.min(5, state.distanceMeters / 500);

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

  // Shield / wormhole hit timers
  if (state.shieldHitTimer > 0) state.shieldHitTimer -= 1;
  if (state.wormholeFlashTimer > 0) state.wormholeFlashTimer -= 1;

  // Active effect timers
  for (const e of state.activeEffects) {
    if (e.timer > 0) e.timer -= 1;
  }
  state.activeEffects = state.activeEffects.filter(e => e.timer > 0);

  if (state.isOrbiting && state.orbitPlanetIndex >= 0) {
    const p = state.planets[state.orbitPlanetIndex];
    // Orbit speed inversely proportional to radius — small planets spin fast, big ones slow
    const orbitSpeed = ORBIT_SPEED_FACTOR / p.orbitRadius;
    state.orbitAngle += orbitSpeed * state.orbitDirection;

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

    const moveScale = inFlare ? 0.5 : 1;

    r.x += r.vx * moveScale;
    r.y += r.vy * moveScale;
    r.angle = Math.atan2(r.vy, r.vx);
    tryAutoOrbit(state, frameCount);

    // Thrust trail particles — colored by rocket type
    const thrustColors: Record<string, string> = { aerospace: '#7dd3fc', classic: '#fcd34d', stealth: '#d8b4fe' };
    const thrustChance = state.settings.lowGraphics ? 0.3 : 0.6;
    if (Math.random() < thrustChance) {
      state.particles.push({
        x: r.x - Math.cos(r.angle) * 10,
        y: r.y - Math.sin(r.angle) * 10,
        vx: -Math.cos(r.angle) * 0.5 + rand(-0.3, 0.3),
        vy: -Math.sin(r.angle) * 0.5 + rand(-0.3, 0.3),
        life: 20,
        maxLife: 20,
        color: thrustColors[state.settings.rocketType] || '#fcd34d',
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

  // Update comets — move, trail, remove off-screen
  for (const c of state.comets) {
    c.trail.push({ x: c.x, y: c.y });
    if (c.trail.length > 12) c.trail.shift();
    c.x += c.vx;
    c.y += c.vy;
    c.rotation += c.spin;
  }
  state.comets = state.comets.filter(c => {
    if (c.x < state.camera.x - 100 || c.y < -100 || c.y > canvasH + 100) return false;
    // Destroy comets that enter any planet's orbit zone
    for (const p of state.planets) {
      if (Math.abs(c.x - p.x) > p.orbitRadius + 20) continue;
      if (Math.hypot(c.x - p.x, c.y - p.y) < p.orbitRadius) return false;
    }
    return true;
  });

  r.trail.push({ x: r.x, y: r.y });
  if (r.trail.length > TRAIL_LENGTH) r.trail.shift();

  updateParticles(state);

  if (state.isOrbiting) {
    // Keep rocket centered while orbiting (allows camera to pan left on large planets)
    state.camera.x = r.x - canvasW * 0.3;
  } else {
    // Camera only follows forwards to prevent getting "lost in space" when flying
    state.camera.x = Math.max(state.camera.x, r.x - canvasW * 0.3);
  }
  state.camera.y = 0;

  state.distanceMeters = Math.max(state.distanceMeters, Math.floor(r.x / 10));
  state.score = state.distanceMeters + state.comboBonusEarned + state.earthBonusEarned;

  // Theme milestone detection — score-based so combo/Earth bonuses count.
  const newThemeIdx = getThemeIndex(state.score);
  if (newThemeIdx !== state.activeThemeIndex) {
    state.activeThemeIndex = newThemeIdx;
    if (newThemeIdx > 0) {
      state.themeBannerIndex = newThemeIdx;
      state.themeBannerTimer = 180; // ~3 seconds at 60fps
    }
  }
  if (state.themeBannerTimer > 0) state.themeBannerTimer -= 1;

  const lastPlanet = state.planets[state.planets.length - 1];
  if (r.x > lastPlanet.x - canvasW * 1.5) {
    state.planets.push(generatePlanet(lastPlanet.x, state.difficulty, canvasH));
  }
  const lastAsteroid = state.asteroids[state.asteroids.length - 1];
  if (lastAsteroid && r.x > lastAsteroid.x - canvasW * 1.5) {
    const gap = rand(400 - state.difficulty * 40, 700 - state.difficulty * 60);
    const a = generateAsteroid(lastAsteroid.x + gap, state.planets, canvasH);
    if (a) state.asteroids.push(a);
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

  // Spawn comets at increasing rate with difficulty (start after 300m)
  if (state.distanceMeters > 100) {
    const cometChance = 0.005 + state.difficulty * 0.003;
    if (Math.random() < cometChance && state.comets.length < 3) {
      state.comets.push(generateComet(state.camera.x, canvasW, canvasH));
    }
  }

  // Spawn power-ups — first one at 150m, then roughly every 300-600m
  if (state.distanceMeters > 150) {
    const lastPU = state.powerups[state.powerups.length - 1];
    const spawnAfterX = lastPU ? lastPU.x + rand(300, 600) : r.x + rand(200, 400);
    if (!lastPU || r.x > spawnAfterX - canvasW * 1.5) {
      const pu = generatePowerUp(lastPU ? lastPU.x + rand(300, 600) : r.x + rand(200, 400), state.planets, canvasH);
      if (pu) state.powerups.push(pu);
    }
  }

  // Collect power-ups — fly-through pickup
  const rHitbox = (ROCKET_STATS[state.settings.rocketType] || ROCKET_STATS.aerospace).hitboxRadius;
  const rHitboxPU = rHitbox + 8; // slightly generous pickup radius
  for (const pu of state.powerups) {
    if (pu.collected) continue;
    const d = Math.hypot(pu.x - r.x, pu.y - r.y);
    if (d < pu.radius + rHitboxPU) {
      pu.collected = true;
      activatePowerUp(state, pu.type);
      state.lifetimeStats.powerupsCollected += 1;
      state.powerupsCollectedThisRun += 1;

      // Collection sparkle
      const puColors: Record<PowerUpType, string[]> = {
        shield: ['#38bdf8', '#7dd3fc', '#ffffff'],
        magnet: ['#fbbf24', '#fde68a', '#ffffff'],
        wormhole: ['#c084fc', '#e879f9', '#ffffff'],
      };
      const colors = puColors[pu.type];
      for (let i = 0; i < 16; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = rand(0.5, 3);
        state.particles.push({
          x: pu.x, y: pu.y,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          life: 35, maxLife: 35,
          color: colors[i % colors.length],
          size: rand(2, 4),
        });
      }
    }
  }
  // Remove collected or far-behind power-ups
  state.powerups = state.powerups.filter(pu => !pu.collected && pu.x > state.camera.x - 200);


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
    if (d < a.radius + rHitbox) {
      // Shield absorbs the hit
      if (hasActiveEffect(state, 'shield')) {
        removeActiveEffect(state, 'shield');
        state.shieldHitTimer = 30;
        state.screenShake = { intensity: 4, duration: 15 };
        // Shatter particles
        for (let i = 0; i < 12; i++) {
          const ang = Math.random() * Math.PI * 2;
          const sp = rand(1, 3);
          state.particles.push({
            x: r.x, y: r.y,
            vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
            life: 30, maxLife: 30,
            color: i % 2 === 0 ? '#38bdf8' : '#ffffff',
            size: rand(2, 4),
          });
        }
        continue;
      }
      state.deathReason = 'asteroid';
      spawnDeathExplosion(state);
      // Impact debris — extra rocky chunks
      const debrisColors = ['#8a6a4a', '#6d5438', '#a0785c', '#4d3a28'];
      for (let i = 0; i < 15; i++) {
        const ang = Math.random() * Math.PI * 2;
        const sp = rand(0.5, 2.5);
        state.particles.push({
          x: r.x, y: r.y,
          vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
          life: 80, maxLife: 80,
          color: debrisColors[Math.floor(Math.random() * debrisColors.length)],
          size: rand(2, 5),
        });
      }
      buildShareMessage(state);
      return false;
    }
    if (!state.isOrbiting && d < a.radius + 16 && state.closeCallCooldown === 0) {
      state.closeCalls += 1;
      state.closeCallTimer = 24;
      state.closeCallCooldown = 30;
    }
  }

  // Comet collisions
  for (const c of state.comets) {
    const cd = Math.hypot(c.x - r.x, c.y - r.y);
    if (cd < c.radius + rHitbox) {
      // Shield absorbs the hit
      if (hasActiveEffect(state, 'shield')) {
        removeActiveEffect(state, 'shield');
        state.shieldHitTimer = 30;
        state.screenShake = { intensity: 5, duration: 18 };
        for (let i = 0; i < 12; i++) {
          const ang = Math.random() * Math.PI * 2;
          const sp = rand(1, 3);
          state.particles.push({
            x: r.x, y: r.y,
            vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
            life: 30, maxLife: 30,
            color: i % 2 === 0 ? '#38bdf8' : '#ffffff',
            size: rand(2, 4),
          });
        }
        continue;
      }
      state.deathReason = 'comet';
      spawnDeathExplosion(state);
      buildShareMessage(state);
      return false;
    }
    // Close call with comet
    if (!state.isOrbiting && cd < c.radius + 18 && state.closeCallCooldown === 0) {
      state.closeCalls += 1;
      state.closeCallTimer = 24;
      state.closeCallCooldown = 30;
      state.lifetimeStats.cometsDodged += 1;
    }
  }

  if (state.closeCallTimer > 0) state.closeCallTimer -= 1;
  if (state.closeCallCooldown > 0) state.closeCallCooldown -= 1;

  if (!state.isOrbiting && (r.y < -40 || r.y > canvasH + 40)) {
    state.deathReason = 'out-of-bounds';
    spawnDeathExplosion(state);
    buildShareMessage(state);
    return false;
  }
  if (r.x < state.camera.x - 60) {
    state.deathReason = 'fell-behind';
    spawnDeathExplosion(state);
    buildShareMessage(state);
    return false;
  }

  return true;
}

export function buildShareMessage(state: GameState): void {
  const deathReasonLabel: Record<GameState['deathReason'], string> = {
    asteroid: 'Hit an asteroid',
    comet: 'Struck by a comet',

    'out-of-bounds': 'Flew out of bounds',
    'fell-behind': 'Lost forward momentum',
    '': 'Run ended',
  };

  const total = state.score.toLocaleString();
  const distance = state.distanceMeters.toLocaleString();
  const comboBonus = state.comboBonusEarned.toLocaleString();
  const earthBonus = state.earthBonusEarned.toLocaleString();

  const lines = [
    '🚀 ORBIT SLINGSHOT 🚀',
    '━━━━━━━━━━━━━━━━━━━━',
    `🏆 Total: ${total}m`,
    `📏 Distance: ${distance}m`,
    `🔥 Combo Bonus: +${comboBonus}m`,
    `🌍 Earth Bonus: +${earthBonus}m`,
    `💥 ${deathReasonLabel[state.deathReason]}`,
  ];

  if (state.maxCombo > 1) lines.push(`🔥 Max Combo: x${state.maxCombo}`);
  if (state.earthsFound > 0) lines.push(`🌍 Earths Found: ${state.earthsFound}`);
  if (state.powerupsCollectedThisRun > 0) lines.push(`⚡ Power-ups: ${state.powerupsCollectedThisRun}`);
  if (state.closeCalls > 0) lines.push(`😅 Close Calls: ${state.closeCalls}`);

  lines.push('');
  lines.push('Can you beat this run?');
  lines.push('🔗 https://manikiran949.itch.io/orbit-sling');

  state.shareMessage = lines.join('\n');
}

export function updateLifetimeStatsOnDeath(state: GameState) {
  const ls = state.lifetimeStats;
  ls.totalFlights += 1;
  ls.totalDistance += state.distanceMeters;
  ls.totalEarths += state.earthsFound;
  ls.totalCombo += state.comboBonusEarned;
  ls.totalCloseCalls += state.closeCalls;
  ls.bestCombo = Math.max(ls.bestCombo, state.maxCombo);
  const rt = state.settings.rocketType as keyof typeof ls.rocketUsage;
  ls.rocketUsage[rt] = (ls.rocketUsage[rt] || 0) + 1;
  saveLifetimeStats(ls);
}
