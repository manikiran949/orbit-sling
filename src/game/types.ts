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
}

export interface Asteroid {
  x: number;
  y: number;
  radius: number;
  rotation: number;
  vertices: number[];
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
  camera: Vec2;
  score: number;
  highScore: number;
  isOrbiting: boolean;
  orbitPlanetIndex: number;
  orbitAngle: number;
  orbitDirection: number;
  phase: 'menu' | 'playing' | 'gameover';
}
