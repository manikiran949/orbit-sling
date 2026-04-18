export interface Vec2 {
  x: number;
  y: number;
}

export interface Planet {
  x: number;
  y: number;
  radius: number;
  orbitRadius: number;
  color: string;
  glowColor: string;
  accentColor: string;
  hasRing: boolean;
  ringTilt: number;
  craters: { x: number; y: number; r: number }[];
  rotation: number;
}

export interface Asteroid {
  x: number;
  y: number;
  radius: number;
  rotation: number;
  vertices: number[];
  spin: number;
}

export interface Star {
  x: number;
  y: number;
  size: number;
  brightness: number;
  twinkleSpeed: number;
  parallax: number;
  color: string;
}

export interface Nebula {
  x: number;
  y: number;
  radius: number;
  color: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface Rocket {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  trail: Vec2[];
}

export interface GameState {
  rocket: Rocket;
  planets: Planet[];
  asteroids: Asteroid[];
  stars: Star[];
  nebulae: Nebula[];
  particles: Particle[];
  camera: Vec2;
  score: number;
  highScore: number;
  isOrbiting: boolean;
  orbitPlanetIndex: number;
  orbitAngle: number;
  orbitDirection: number;
  lastReleasedPlanet: number;
  difficulty: number;
  phase: 'menu' | 'playing' | 'gameover';
}
