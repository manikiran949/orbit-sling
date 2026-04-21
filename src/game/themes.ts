/**
 * Visual themes that unlock at score milestones (distance + combo + Earth bonuses).
 * Crossing a milestone triggers a 40-point color blend from the previous theme,
 * giving a smooth morph rather than a hard cut.
 */

export interface Theme {
  name: string;
  tagline: string;
  startDistance: number;
  accentColor: string;
  // 5-stop gradient for the deep-space backdrop
  bgStops: string[];
  // Cosmic dust band tint (rgba)
  dust: string;
  // 4 candidate nebula tints — each nebula picks one by index % length
  nebulaColors: string[];
  // Optional full-screen overlay tint to shift the mood
  vignetteOverlay: string | null;
}

export const THEMES: Theme[] = [
  {
    name: 'Deep Space',
    tagline: 'Cold stars, quiet dark',
    startDistance: 0,
    accentColor: '#38bdf8',
    bgStops: ['#020515', '#070d2a', '#0b1030', '#06091e', '#020410'],
    dust: 'rgba(80, 70, 140, 0.04)',
    nebulaColors: [
      'rgba(100, 80, 200, 0.05)',
      'rgba(40, 120, 200, 0.04)',
      'rgba(140, 50, 180, 0.035)',
      'rgba(60, 60, 160, 0.04)',
    ],
    vignetteOverlay: null,
  },
  {
    name: 'Nebula Rift',
    tagline: 'Color bleeds through spacetime',
    startDistance: 500,
    accentColor: '#c084fc',
    bgStops: ['#0a0218', '#1a0430', '#2a0640', '#1a0428', '#070210'],
    dust: 'rgba(180, 80, 200, 0.05)',
    nebulaColors: [
      'rgba(200, 80, 180, 0.07)',
      'rgba(240, 100, 200, 0.05)',
      'rgba(140, 60, 200, 0.06)',
      'rgba(180, 100, 220, 0.05)',
    ],
    vignetteOverlay: 'rgba(120, 40, 160, 0.1)',
  },
  {
    name: 'Solar Corona',
    tagline: 'Heat builds at the edge',
    startDistance: 1000,
    accentColor: '#fb923c',
    bgStops: ['#1a0408', '#2a0a08', '#3a1404', '#280a02', '#0a0200'],
    dust: 'rgba(220, 120, 40, 0.05)',
    nebulaColors: [
      'rgba(255, 140, 60, 0.06)',
      'rgba(220, 80, 40, 0.05)',
      'rgba(255, 180, 80, 0.04)',
      'rgba(220, 120, 60, 0.05)',
    ],
    vignetteOverlay: 'rgba(180, 60, 20, 0.1)',
  },
  {
    name: 'Ice Belt',
    tagline: 'A frozen silence',
    startDistance: 1500,
    accentColor: '#67e8f9',
    bgStops: ['#021018', '#062030', '#0a2840', '#06202e', '#020810'],
    dust: 'rgba(120, 220, 255, 0.04)',
    nebulaColors: [
      'rgba(150, 230, 255, 0.05)',
      'rgba(100, 200, 240, 0.04)',
      'rgba(200, 240, 255, 0.035)',
      'rgba(120, 220, 255, 0.04)',
    ],
    vignetteOverlay: 'rgba(40, 100, 140, 0.08)',
  },
  {
    name: 'The Void',
    tagline: 'Nothing remains',
    startDistance: 2000,
    accentColor: '#cbd5e1',
    bgStops: ['#000000', '#030306', '#05050a', '#030306', '#000000'],
    dust: 'rgba(100, 100, 100, 0.015)',
    nebulaColors: [
      'rgba(60, 60, 70, 0.03)',
      'rgba(40, 40, 50, 0.025)',
      'rgba(80, 80, 90, 0.02)',
      'rgba(50, 50, 60, 0.025)',
    ],
    vignetteOverlay: 'rgba(0, 0, 0, 0.25)',
  },
  {
    name: 'Supernova',
    tagline: 'The sky ignites',
    startDistance: 2500,
    accentColor: '#f472b6',
    bgStops: ['#040218', '#0a0a3a', '#1a0a4a', '#2a0a3a', '#040218'],
    dust: 'rgba(240, 120, 220, 0.06)',
    nebulaColors: [
      'rgba(255, 100, 200, 0.08)',
      'rgba(100, 200, 255, 0.07)',
      'rgba(200, 255, 100, 0.05)',
      'rgba(255, 220, 100, 0.05)',
    ],
    vignetteOverlay: 'rgba(200, 60, 180, 0.12)',
  },
];

export const TRANSITION_METERS = 40;

function parseColor(s: string): [number, number, number, number] {
  if (s.startsWith('#')) {
    const h = s.slice(1);
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
      1,
    ];
  }
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const parts = m[1].split(',').map((p) => parseFloat(p.trim()));
    return [parts[0] || 0, parts[1] || 0, parts[2] || 0, parts[3] ?? 1];
  }
  return [0, 0, 0, 1];
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpColor(a: string, b: string, t: number): string {
  const [ar, ag, ab, aa] = parseColor(a);
  const [br, bg, bb, ba] = parseColor(b);
  const r = Math.round(lerp(ar, br, t));
  const g = Math.round(lerp(ag, bg, t));
  const bl = Math.round(lerp(ab, bb, t));
  const al = lerp(aa, ba, t);
  return `rgba(${r}, ${g}, ${bl}, ${al.toFixed(3)})`;
}

export function getThemeIndex(scoreValue: number): number {
  for (let i = THEMES.length - 1; i >= 0; i--) {
    if (scoreValue >= THEMES[i].startDistance) return i;
  }
  return 0;
}

export interface ResolvedTheme {
  name: string;
  tagline: string;
  accentColor: string;
  bgStops: string[];
  dust: string;
  nebulaColors: string[];
  vignetteOverlay: string | null;
  index: number;
}

/**
 * Returns the active theme for the given distance, with colors blended
 * from the previous theme over the first TRANSITION_METERS after each milestone.
 */
export function getActiveTheme(scoreValue: number): ResolvedTheme {
  const idx = getThemeIndex(scoreValue);
  const current = THEMES[idx];

  // Outside transition zone or first theme — return as-is
  const distIntoTheme = scoreValue - current.startDistance;
  if (idx === 0 || distIntoTheme >= TRANSITION_METERS) {
    return {
      name: current.name,
      tagline: current.tagline,
      accentColor: current.accentColor,
      bgStops: current.bgStops,
      dust: current.dust,
      nebulaColors: current.nebulaColors,
      vignetteOverlay: current.vignetteOverlay,
      index: idx,
    };
  }

  const prev = THEMES[idx - 1];
  const t = distIntoTheme / TRANSITION_METERS;

  return {
    name: current.name,
    tagline: current.tagline,
    accentColor: lerpColor(prev.accentColor, current.accentColor, t),
    bgStops: current.bgStops.map((c, i) => lerpColor(prev.bgStops[i], c, t)),
    dust: lerpColor(prev.dust, current.dust, t),
    nebulaColors: current.nebulaColors.map((c, i) =>
      lerpColor(prev.nebulaColors[i], c, t)
    ),
    vignetteOverlay:
      prev.vignetteOverlay || current.vignetteOverlay
        ? lerpColor(
            prev.vignetteOverlay || 'rgba(0,0,0,0)',
            current.vignetteOverlay || 'rgba(0,0,0,0)',
            t
          )
        : null,
    index: idx,
  };
}
