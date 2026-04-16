import { GameState, Planet, Asteroid } from './types';

const ROCKET_SPEED = 4.2;
const ORBIT_SPEED = 0.05;
const TRAIL_LENGTH = 50;
const PLANET_COLORS = [
  { color: '#e8a838', glow: '#e8a83866' },
  { color: '#38bdf8', glow: '#38bdf866' },
  { color: '#f472b6', glow: '#f472b666' },
  { color: '#a78bfa', glow: '#a78bfa66' },
  { color: '#34d399', glow: '#34d39966' },
];

function randomRange(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function generatePlanet(minX: number): Planet {
  const c = PLANET_COLORS[Math.floor(Math.random() * PLANET_COLORS.length)];
  const radius = randomRange(20, 38);
  return {
    x: minX + randomRange(220, 380),
    y: randomRange(140, 460),
    radius,
    orbitRadius: radius + randomRange(40, 60),
    color: c.color,
    glowColor: c.glow,
  };
}

function generateAsteroid(minX: number): Asteroid {
  const radius = randomRange(8, 16);
  const verts: number[] = [];
  const n = Math.floor(randomRange(5, 8));
  for (let i = 0; i < n; i++) {
    verts.push(radius * randomRange(0.7, 1.3));
  }
  return {
    x: minX + randomRange(150, 350),
    y: randomRange(80, 520),
    radius,
    rotation: Math.random() * Math.PI * 2,
    vertices: verts,
  };
}

export function createInitialState(): GameState {
  const planets: Planet[] = [];
  planets.push({
    x: 180,
    y: 300,
    radius: 32,
    orbitRadius: 75,
    color: '#e8a838',
    glowColor: '#e8a83866',
  });
  let lastX = 180;
  for (let i = 0; i < 8; i++) {
    const p = generatePlanet(lastX);
    planets.push(p);
    lastX = p.x;
  }

  const asteroids: Asteroid[] = [];
  for (let i = 0; i < 4; i++) {
    asteroids.push(generateAsteroid(400 + i * 400));
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
    camera: { x: 0, y: 0 },
    score: 0,
    highScore: parseInt(localStorage.getItem('orbitHighScore') || '0'),
    isOrbiting: true,
    orbitPlanetIndex: 0,
    orbitAngle: startAngle,
    orbitDirection: 1,
    lastReleasedPlanet: -1,
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
}

function tryAutoOrbit(state: GameState): void {
  if (state.isOrbiting) return;
  const r = state.rocket;
  for (let i = 0; i < state.planets.length; i++) {
    // Skip the planet we just released from
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
      return;
    }
  }

  // Clear lastReleasedPlanet once we're far enough away
  if (state.lastReleasedPlanet >= 0) {
    const lp = state.planets[state.lastReleasedPlanet];
    const d = Math.hypot(r.x - lp.x, r.y - lp.y);
    if (d > lp.orbitRadius + 40) {
      state.lastReleasedPlanet = -1;
    }
  }
}

export function update(state: GameState, canvasW: number, canvasH: number): boolean {
  const r = state.rocket;

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
  }

  r.trail.push({ x: r.x, y: r.y });
  if (r.trail.length > TRAIL_LENGTH) r.trail.shift();

  state.camera.x = r.x - canvasW * 0.3;
  state.camera.y = 0;

  state.score = Math.max(state.score, Math.floor(r.x / 10));

  const lastPlanet = state.planets[state.planets.length - 1];
  if (r.x > lastPlanet.x - canvasW * 1.5) {
    state.planets.push(generatePlanet(lastPlanet.x));
  }
  const lastAsteroid = state.asteroids[state.asteroids.length - 1];
  if (lastAsteroid && r.x > lastAsteroid.x - canvasW * 1.5) {
    state.asteroids.push(generateAsteroid(lastAsteroid.x + randomRange(250, 500)));
  }

  for (const a of state.asteroids) {
    const d = Math.hypot(a.x - r.x, a.y - r.y);
    if (d < a.radius + 6) return false;
  }

  if (r.y < -40 || r.y > canvasH + 40) return false;
  if (r.x < state.camera.x - 60) return false;

  return true;
}
