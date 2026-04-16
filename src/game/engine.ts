import { GameState, Planet, Asteroid, Vec2 } from './types';

const ROCKET_SPEED = 3.5;
const ORBIT_SPEED = 0.04;
const TRAIL_LENGTH = 40;
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
  const radius = randomRange(18, 40);
  return {
    x: minX + randomRange(250, 450),
    y: randomRange(120, 480),
    radius,
    orbitRadius: radius + randomRange(35, 65),
    color: c.color,
    glowColor: c.glow,
  };
}

function generateAsteroid(minX: number): Asteroid {
  const radius = randomRange(8, 18);
  const verts: number[] = [];
  const n = Math.floor(randomRange(5, 8));
  for (let i = 0; i < n; i++) {
    verts.push(radius * randomRange(0.7, 1.3));
  }
  return {
    x: minX + randomRange(100, 400),
    y: randomRange(60, 540),
    radius,
    rotation: Math.random() * Math.PI * 2,
    vertices: verts,
  };
}

export function createInitialState(): GameState {
  const planets: Planet[] = [];
  // First planet close so the player can grab it
  planets.push({
    x: 200,
    y: 300,
    radius: 30,
    orbitRadius: 70,
    color: '#e8a838',
    glowColor: '#e8a83866',
  });
  let lastX = 200;
  for (let i = 0; i < 8; i++) {
    const p = generatePlanet(lastX);
    planets.push(p);
    lastX = p.x;
  }

  const asteroids: Asteroid[] = [];
  for (let i = 0; i < 5; i++) {
    asteroids.push(generateAsteroid(300 + i * 350));
  }

  return {
    rocket: {
      x: 60,
      y: 300,
      vx: ROCKET_SPEED,
      vy: 0,
      angle: 0,
      trail: [],
    },
    planets,
    asteroids,
    camera: { x: 0, y: 0 },
    score: 0,
    highScore: parseInt(localStorage.getItem('orbitHighScore') || '0'),
    isOrbiting: false,
    orbitPlanetIndex: -1,
    orbitAngle: 0,
    orbitDirection: 1,
    phase: 'menu',
  };
}

export function findNearestPlanet(state: GameState): number {
  let minDist = Infinity;
  let idx = -1;
  const { x, y } = state.rocket;
  state.planets.forEach((p, i) => {
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < p.orbitRadius + 80 && d < minDist) {
      minDist = d;
      idx = i;
    }
  });
  return idx;
}

export function startOrbit(state: GameState): void {
  const idx = findNearestPlanet(state);
  if (idx === -1) return;
  state.isOrbiting = true;
  state.orbitPlanetIndex = idx;
  const p = state.planets[idx];
  state.orbitAngle = Math.atan2(state.rocket.y - p.y, state.rocket.x - p.x);
  // Determine orbit direction based on approach angle
  const cross = (state.rocket.vx) * (p.y - state.rocket.y) - (state.rocket.vy) * (p.x - state.rocket.x);
  state.orbitDirection = cross > 0 ? 1 : -1;
}

export function releaseOrbit(state: GameState): void {
  if (!state.isOrbiting) return;
  state.isOrbiting = false;
  // Tangent direction
  const tangentAngle = state.orbitAngle + (state.orbitDirection * Math.PI / 2);
  const speed = ROCKET_SPEED * 1.3;
  state.rocket.vx = Math.cos(tangentAngle) * speed;
  state.rocket.vy = Math.sin(tangentAngle) * speed;
  state.rocket.angle = tangentAngle;
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
  }

  // Trail
  r.trail.push({ x: r.x, y: r.y });
  if (r.trail.length > TRAIL_LENGTH) r.trail.shift();

  // Camera follows rocket
  state.camera.x = r.x - canvasW * 0.25;
  state.camera.y = 0;

  // Score
  state.score = Math.max(state.score, Math.floor(r.x / 10));

  // Generate more planets/asteroids as needed
  const lastPlanet = state.planets[state.planets.length - 1];
  if (r.x > lastPlanet.x - canvasW) {
    state.planets.push(generatePlanet(lastPlanet.x));
  }
  const lastAsteroid = state.asteroids[state.asteroids.length - 1];
  if (lastAsteroid && r.x > lastAsteroid.x - canvasW) {
    state.asteroids.push(generateAsteroid(lastAsteroid.x + randomRange(200, 500)));
  }

  // Collision with asteroids
  for (const a of state.asteroids) {
    const d = Math.hypot(a.x - r.x, a.y - r.y);
    if (d < a.radius + 6) return false;
  }

  // Off screen (top/bottom)
  if (r.y < -30 || r.y > canvasH + 30) return false;
  // Going backwards too far
  if (r.x < state.camera.x - 50) return false;

  return true;
}
