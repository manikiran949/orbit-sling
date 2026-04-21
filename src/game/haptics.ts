/**
 * Tiny wrapper around navigator.vibrate. Silently no-ops on platforms that
 * don't support the API (iOS Safari, desktop) so call sites don't need to
 * feature-detect. Duration is in milliseconds, or a pattern array.
 */
export function vibrate(pattern: number | readonly number[]): void {
  if (typeof navigator === 'undefined') return;
  if (typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(pattern as number | number[]);
  } catch {
    /* some browsers throw if called before any user gesture — ignore */
  }
}

/** Haptic presets for specific game events. */
export const HAPTIC = {
  capture: 8,
  release: 14,
  death: [40, 40, 80],
  themeUnlock: [20, 30, 40],
  click: 5,
} as const;
