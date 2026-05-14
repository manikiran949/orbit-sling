export interface Vec2 {
  x: number;
  y: number;
}

export type PlanetType = 'rocky' | 'gas' | 'ice' | 'lava' | 'earth';
export type DeathReason = 'asteroid' | 'comet' | 'out-of-bounds' | 'fell-behind' | '';
export type PowerUpType = 'shield' | 'magnet' | 'wormhole' | 'time_dilation' | 'gravity_pulse';

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
  planetType: PlanetType;
  earthBonusClaimed: boolean;
}

export interface Asteroid {
  x: number;
  y: number;
  radius: number;
  rotation: number;
  vertices: number[];
  spin: number;
  vx: number;
  vy: number;
}

export interface Comet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  rotation: number;
  spin: number;
  trail: Vec2[];
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

export interface SolarFlare {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  color: string;
  opacity: number;
}

export interface PowerUp {
  x: number;
  y: number;
  type: PowerUpType;
  radius: number;
  bobPhase: number;
  collected: boolean;
}

export interface ActiveEffect {
  type: PowerUpType;
  timer: number;
  maxTimer: number;
}

export interface GameSettings {
  musicVolume: number;
  sfxVolume: number;
  lowGraphics: boolean;
  rocketType: 'aerospace' | 'classic' | 'stealth';
  muted: boolean;
  reducedMotion: boolean;
}

export interface ScreenShake {
  intensity: number;
  duration: number;
}

export interface LifetimeStats {
  totalFlights: number;
  totalDistance: number;
  totalEarths: number;
  totalCombo: number;
  totalCloseCalls: number;
  bestCombo: number;
  cometsDodged: number;
  powerupsCollected: number;
  rocketUsage: { aerospace: number; classic: number; stealth: number };
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
  comets: Comet[];
  powerups: PowerUp[];
  activeEffects: ActiveEffect[];

  stars: Star[];
  nebulae: Nebula[];
  particles: Particle[];
  solarFlares: SolarFlare[];
  camera: Vec2;
  score: number;
  distanceMeters: number;
  comboBonusEarned: number;
  earthBonusEarned: number;
  highScore: number;
  isOrbiting: boolean;
  orbitPlanetIndex: number;

  orbitAngle: number;
  orbitDirection: number;
  captureProgress: number;
  captureStartDist: number;
  lastReleasedPlanet: number;
  difficulty: number;
  phase: 'menu' | 'playing' | 'gameover' | 'stats';
  scoreBonus: number;
  scoreBonusTimer: number;
  scoreBonusLabel: 'combo' | 'earth' | '';
  combo: number;
  comboTimer: number;
  comboMultiplier: number;
  maxCombo: number;
  earthsFound: number;
  screenShake: ScreenShake;
  paused: boolean;
  settings: GameSettings;
  sunAngle: number;
  lastOrbitTime: number;
  shareMessage: string;
  deathReason: DeathReason;
  showTutorial: boolean;
  activeThemeIndex: number;
  themeBannerTimer: number;
  themeBannerIndex: number;
  closeCalls: number;
  closeCallTimer: number;
  closeCallCooldown: number;
  shieldHitTimer: number;
  wormholeFlashTimer: number;
  timeDilationFlashTimer: number;
  gravityPulseTimer: number;
  powerupsCollectedThisRun: number;
  lifetimeStats: LifetimeStats;
}
