import { GameState, Planet, Asteroid, Star, Nebula, Particle } from './types';

const ROCKET_SPEED = 4.2;
const ORBIT_SPEED = 0.05;
const TRAIL_LENGTH = 60;

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

function generatePlanet(minX: number, difficulty = 0): Planet {
  const c = PLANET_PALETTES[Math.floor(Math.random() * PLANET_PALETTES.length)];
  // Difficulty: smaller planets, farther apart over time
  const radiusMin = Math.max(16, 26 - difficulty * 2);
  const radiusMax = Math.max(24, 44 - difficulty * 3);
  const radius = rand(radiusMin, radiusMax);
  const spacingMin = 220 + difficulty * 30;
  const spacingMax = 380 + difficulty * 60;

  const craters: { x: number; y: number; r: number }[] = [];
  const craterCount = Math.floor(rand(2, 5));
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
    y: rand(140, 460),
    radius,
    orbitRadius: radius + rand(40, 60),
    color: c.color,
    glowColor: c.glow,
    accentColor: c.accent,
    hasRing: Math.random() < 0.3,
    ringTilt: rand(-0.4, 0.4),
    craters,
    rotation: Math.random() * Math.PI * 2,
  };
}

function generateAsteroid(minX: number): Asteroid {
  const radius = rand(8, 16);
  const verts: number[] = [];
  const n = Math.floor(rand(6, 9));
  for (let i = 0; i < n; i++) {
    verts.push(radius * rand(0.7, 1.3));
  }
  return {
    x: minX + rand(150, 350),
    y: rand(80, 520),
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

export function createInitialState(): GameState {
  const planets: Planet[] = [];
  // Hand-tuned starting planet
  planets.push({
    x: 200,
    y: 320,
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
  });

  // More starting planets, easier spacing
  let lastX = 200;
  for (let i = 0; i < 14; i++) {
    const p = generatePlanet(lastX, 0);
    planets.push(p);
    lastX = p.x;
  }

  const asteroids: Asteroid[] = [];
  // Fewer/farther asteroids early
  for (let i = 0; i < 4; i++) {
    asteroids.push(generateAsteroid(800 + i * 600));
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
    camera: { x: 0, y: 0 },
    score: 0,
    highScore: parseInt(localStorage.getItem('orbitHighScore') || '0'),
    isOrbiting: true,
    orbitPlanetIndex: 0,
    orbitAngle: startAngle,
    orbitDirection: 1,
    lastReleasedPlanet: -1,
    difficulty: 0,
    phase: 'menu',
  };
}

export function releaseRocket(state: GameState): void {
  if (!state.isOrbiting || state.orbitPlanetIndex < 0) return;
  const tangentAngle = state.orbitAngle + (state.orbitDirection * Math.PI / 2);
  state.rocket.vx = Math.cos(tangentAngle) * ROCKET_SPEED;
  state.rocket.vy = Math.sin(tangentAngle) * ROCKET_SPEED;
  state.rocket.angle = tangentAngle;
  state.lastReleasedPlanet = state.orbitPlanetIndex;
  state.isOrbiting = false;
  state.orbitPlanetIndex = -1;

  // Burst particles on release
  const p = state.planets[state.lastReleasedPlanet];
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
      color: p.color,
      size: rand(1.5, 3),
    });
  }
}

function tryAutoOrbit(state: GameState): void {
  if (state.isOrbiting) return;
  const r = state.rocket;
  for (let i = 0; i < state.planets.length; i++) {
    if (i === state.lastReleasedPlanet) continue;
    const p = state.planets[i];
    const dx = r.x - p.x;
    const dy = r.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d <= p.orbitRadius + 8 && d >= p.radius) {
      const cross = r.vx * dy - r.vy * dx;
      state.orbitDirection = cross > 0 ? 1 : -1;
      state.orbitAngle = Math.atan2(dy, dx);
      state.orbitPlanetIndex = i;
      state.isOrbiting = true;
      state.lastReleasedPlanet = -1;
      r.x = p.x + Math.cos(state.orbitAngle) * p.orbitRadius;
      r.y = p.y + Math.sin(state.orbitAngle) * p.orbitRadius;

      // Capture sparkle
      for (let k = 0; k < 16; k++) {
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
      return;
    }
  }

  if (state.lastReleasedPlanet >= 0) {
    const lp = state.planets[state.lastReleasedPlanet];
    const d = Math.hypot(r.x - lp.x, r.y - lp.y);
    if (d > lp.orbitRadius + 40) {
      state.lastReleasedPlanet = -1;
    }
  }
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

export function update(state: GameState, canvasW: number, canvasH: number): boolean {
  const r = state.rocket;

  // Difficulty ramps slowly with distance
  state.difficulty = Math.min(5, state.score / 500);

  if (state.isOrbiting && state.orbitPlanetIndex >= 0) {
    const p = state.planets[state.orbitPlanetIndex];
    state.orbitAngle += ORBIT_SPEED * state.orbitDirection;
    r.x = p.x + Math.cos(state.orbitAngle) * p.orbitRadius;
    r.y = p.y + Math.sin(state.orbitAngle) * p.orbitRadius;
    r.angle = state.orbitAngle + (state.orbitDirection * Math.PI / 2);
  } else {
    r.x += r.vx;
    r.y += r.vy;
    r.angle = Math.atan2(r.vy, r.vx);
    tryAutoOrbit(state);

    // Thrust trail particles
    if (Math.random() < 0.6) {
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
    state.planets.push(generatePlanet(lastPlanet.x, state.difficulty));
  }
  const lastAsteroid = state.asteroids[state.asteroids.length - 1];
  if (lastAsteroid && r.x > lastAsteroid.x - canvasW * 1.5) {
    const gap = rand(400 - state.difficulty * 40, 700 - state.difficulty * 60);
    state.asteroids.push(generateAsteroid(lastAsteroid.x + gap));
  }

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
    if (d < a.radius + 6) return false;
  }

  if (r.y < -40 || r.y > canvasH + 40) return false;
  if (r.x < state.camera.x - 60) return false;

  return true;
}
