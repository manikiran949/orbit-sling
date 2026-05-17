import { useRef, useEffect, useCallback, useState } from 'react';
import { createInitialState, releaseRocket, update, togglePause, saveSettings, updateVisualsOnly, updateLifetimeStatsOnDeath } from '@/game/engine';
import { render, renderMenu, renderGameOver, renderPause, renderStats, getPauseButtonCenter, getMuteButtonGeom, getRetryButtonBounds, getShareButtonBounds, getStatsButtonBounds, getStatsBackButtonBounds, getLeaderboardButtonBounds } from '@/game/renderer';
import { GameState } from '@/game/types';
import { audio } from '@/game/audio';
import { vibrate, HAPTIC } from '@/game/haptics';
import { LeaderboardOverlay } from './LeaderboardOverlay';
import { SubmitScoreOverlay } from './SubmitScoreOverlay';

type PauseSliderTarget = 'music' | 'sfx';

const OrbitGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createInitialState(typeof window !== 'undefined' ? window.innerHeight : 600));
  const animRef = useRef<number>(0);
  const frameRef = useRef<number>(0);
  const audioInitRef = useRef(false);
  const draggingRef = useRef<PauseSliderTarget | null>(null);
  const shareFlashRef = useRef(0);
  const mousePosRef = useRef<{ x: number; y: number } | null>(null);
  const gameOverStartRef = useRef<number>(-1);
  const countUpTickRef = useRef<number>(0);
  const gameOverWasNewHighRef = useRef<boolean>(false);
  const deathTipSeedRef = useRef<number>(0);
  const leaderboardSourceRef = useRef<GameState['phase']>('menu');

  // Sync phase to React state to mount HTML overlays
  const [phaseState, setPhaseState] = useState<GameState['phase']>('menu');
  const [hasSubmittedScore, setHasSubmittedScore] = useState(false);

  const COUNT_UP_DURATION_MS = 1500;
  const COUNT_UP_TICK_MS = 200;

  const initAudio = useCallback(() => {
    if (audioInitRef.current) return;
    audioInitRef.current = true;
    audio.init();
    const s = stateRef.current.settings;
    audio.setMusicVolume(s.musicVolume);
    audio.setSfxVolume(s.sfxVolume);
    audio.setMuted(s.muted);
  }, []);

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, []);

  const getPauseCardLayout = useCallback(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const cardW = Math.min(320, w * 0.85);
    const cardX = (w - cardW) / 2;
    // Keep in sync with renderPause card height and getMuteButtonGeom.
    const cardY = (h - 320) / 2 - 20;
    const sliderX = cardX + 30;
    const sliderW = cardW - 60;
    const toggleX = sliderX + sliderW - 40;
    const toggleY = cardY + 174;
    return { cardY, sliderX, sliderW, toggleX, toggleY };
  }, []);

  const applyPauseSliderValue = useCallback((target: PauseSliderTarget, value: number, persist = false) => {
    const state = stateRef.current;
    const clamped = Math.max(0, Math.min(1, value));

    if (target === 'music') {
      state.settings.musicVolume = clamped;
      audio.setMusicVolume(clamped);
    } else {
      state.settings.sfxVolume = clamped;
      audio.setSfxVolume(clamped);
    }

    if (persist) {
      saveSettings(state.settings);
    }
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    initAudio();
    draggingRef.current = null;
    const state = stateRef.current;

    if (state.phase === 'menu') {
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const w = window.innerWidth;
        const h = window.innerHeight;

        const py = h / 2 + 10;
        const verticalScale = Math.max(0.85, Math.min(1.1, h / 800));
        const startY = py + 160 * verticalScale;
        const selectorY = startY + 110 * verticalScale;
        const pillW = 340 * verticalScale;
        const pillH = 104 * verticalScale;
        const pillX = w / 2 - pillW / 2;
        const pillY = selectorY - pillH / 2;

        // Tap anywhere inside the carousel pill to rotate the selection.
        // Left half → previous, right half → next.
        if (mx >= pillX && mx <= pillX + pillW && my >= pillY && my <= pillY + pillH) {
          const types: ('aerospace' | 'classic' | 'stealth')[] = ['aerospace', 'classic', 'stealth'];
          let currentIdx = types.indexOf(state.settings.rocketType || 'aerospace');
          const deadZone = 30 * verticalScale; // center rocket passes through so tap-to-start still works? no — center also rotates next
          if (mx < w / 2 - deadZone) {
            currentIdx = (currentIdx - 1 + types.length) % types.length;
          } else if (mx > w / 2 + deadZone) {
            currentIdx = (currentIdx + 1) % types.length;
          } else {
            // Tap on the selected rocket — cycle forward for quick browsing
            currentIdx = (currentIdx + 1) % types.length;
          }
          state.settings.rocketType = types[currentIdx];
          saveSettings(state.settings);
          audio.playClick();
          updateVisualsOnly(state);
          return;
        }

        // Leaderboard button
        const lbBtn = getLeaderboardButtonBounds(w, h);
        if (mx >= lbBtn.x && mx <= lbBtn.x + lbBtn.width && my >= lbBtn.y && my <= lbBtn.y + lbBtn.height) {
          leaderboardSourceRef.current = 'menu';
          state.phase = 'leaderboard';
          audio.playClick();
          return;
        }
      }

      state.phase = 'playing';
      audio.startMusic();
      audio.playClick();
      return;
    }
    if (state.phase === 'gameover') {
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const ww = window.innerWidth;
        const hh = window.innerHeight;

        // Share button
        const share = getShareButtonBounds(ww, hh);
        if (mx >= share.x && mx <= share.x + share.width && my >= share.y && my <= share.y + share.height) {
          navigator.clipboard.writeText(state.shareMessage).then(() => {
            shareFlashRef.current = 60;
          }).catch(() => { /* clipboard failed silently */ });
          audio.playClick();
          return;
        }

        // Stats button
        const statsBtn = getStatsButtonBounds(ww, hh);
        if (mx >= statsBtn.x && mx <= statsBtn.x + statsBtn.width && my >= statsBtn.y && my <= statsBtn.y + statsBtn.height) {
          state.phase = 'stats';
          audio.playClick();
          return;
        }

        // Leaderboard button
        const lbBtn = getLeaderboardButtonBounds(ww, hh);
        if (mx >= lbBtn.x && mx <= lbBtn.x + lbBtn.width && my >= lbBtn.y && my <= lbBtn.y + lbBtn.height) {
          leaderboardSourceRef.current = 'gameover';
          state.phase = 'leaderboard';
          audio.playClick();
          return;
        }
      }
      const hs = state.highScore;
      const settings = state.settings;
      stateRef.current = createInitialState(window.innerHeight);
      stateRef.current.highScore = hs;
      stateRef.current.settings = settings;
      stateRef.current.phase = 'playing';
      audio.playClick();
      if (!audio.isPlaying) audio.startMusic();
      return;
    }
    if (state.phase === 'stats') {
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const backBtn = getStatsBackButtonBounds(window.innerWidth, window.innerHeight);
        if (mx >= backBtn.x && mx <= backBtn.x + backBtn.width && my >= backBtn.y && my <= backBtn.y + backBtn.height) {
          state.phase = 'gameover';
          audio.playClick();
          return;
        }
      }
      return;
    }
    if (state.paused) {
      // Check if tap is on a slider or toggle
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX;
      const clientY = e.clientY;
      const mx = clientX - rect.left;
      const my = clientY - rect.top;
      const { cardY, sliderX, sliderW, toggleX, toggleY } = getPauseCardLayout();

      // Music slider
      if (mx >= sliderX && mx <= sliderX + sliderW && my >= cardY + 90 && my <= cardY + 115) {
        draggingRef.current = 'music';
        e.currentTarget.setPointerCapture(e.pointerId);
        applyPauseSliderValue('music', (mx - sliderX) / sliderW);
        return;
      }
      // SFX slider
      if (mx >= sliderX && mx <= sliderX + sliderW && my >= cardY + 135 && my <= cardY + 160) {
        draggingRef.current = 'sfx';
        e.currentTarget.setPointerCapture(e.pointerId);
        applyPauseSliderValue('sfx', (mx - sliderX) / sliderW);
        audio.playClick();
        return;
      }
      // Low graphics toggle — clear in-flight particles so the density
      // change is clean instead of popping mid-flight.
      if (mx >= toggleX && mx <= toggleX + 40 && my >= toggleY && my <= toggleY + 20) {
        state.settings.lowGraphics = !state.settings.lowGraphics;
        state.particles = [];
        audio.playClick();
        saveSettings(state.settings);
        return;
      }

      // Reduced Motion toggle — sits directly below Low Graphics
      const rmToggleY = toggleY + 40;
      if (mx >= toggleX && mx <= toggleX + 40 && my >= rmToggleY && my <= rmToggleY + 20) {
        state.settings.reducedMotion = !state.settings.reducedMotion;
        if (state.settings.reducedMotion) {
          state.screenShake = { intensity: 0, duration: 0 };
        }
        audio.playClick();
        saveSettings(state.settings);
        return;
      }

      // Mute button (top-right of pause card)
      const mb = getMuteButtonGeom(window.innerWidth, window.innerHeight);
      if (Math.hypot(mx - mb.cx, my - mb.cy) <= mb.r + 4) {
        state.settings.muted = !state.settings.muted;
        audio.setMuted(state.settings.muted);
        saveSettings(state.settings);
        if (!state.settings.muted) audio.playClick();
        return;
      }

      togglePause(state);
      audio.playClick();
      return;
    }

    // Pause button hit-test (top-right HUD) — intercept before release
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const pb = getPauseButtonCenter(window.innerWidth);
      if (Math.hypot(mx - pb.cx, my - pb.cy) <= pb.r + 6) {
        togglePause(state);
        audio.playClick();
        return;
      }
    }

    // Track previous orbit state for audio
    const wasOrbiting = state.isOrbiting;
    releaseRocket(state);
    if (wasOrbiting) {
      audio.playThrust();
      vibrate(HAPTIC.release);
    }
  }, [applyPauseSliderValue, getPauseCardLayout, initAudio]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    // Track mouse position for hover effects (mouse only — touch has no hover)
    if (e.pointerType === 'mouse') {
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        mousePosRef.current = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };
      }
    }

    const dragTarget = draggingRef.current;
    if (!dragTarget) return;

    const state = stateRef.current;
    if (state.phase !== 'playing' || !state.paused) {
      draggingRef.current = null;
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const { sliderX, sliderW } = getPauseCardLayout();
    applyPauseSliderValue(dragTarget, (mx - sliderX) / sliderW);
  }, [applyPauseSliderValue, getPauseCardLayout]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!draggingRef.current) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    saveSettings(stateRef.current.settings);
    draggingRef.current = null;
  }, []);

  useEffect(() => {
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [resize]);

  // Keyboard shortcuts:
  // - Space / Enter: start, retry, or release from orbit
  // - Escape / P: pause or resume
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      const code = e.code;
      const key = e.key.toLowerCase();
      const isActionKey = code === 'Space' || code === 'Enter';
      const isPauseKey = key === 'escape' || key === 'p';

      // Dev-only theme cheat — press T while playing to jump +500 score and
      // trigger the next theme milestone. Stripped out of production builds.
      if (import.meta.env.DEV && key === 't' && !e.repeat) {
        const state = stateRef.current;
        if (state.phase === 'playing' && !state.paused) {
          state.distanceMeters += 500;
          state.score = state.distanceMeters + state.comboBonusEarned + state.earthBonusEarned;
        }
        return;
      }


      if (!isActionKey && !isPauseKey) return;
      if (e.repeat) return;

      e.preventDefault();
      initAudio();
      const state = stateRef.current;

      if (isPauseKey) {
        if (state.phase === 'playing') {
          togglePause(state);
          audio.playClick();
        }
        return;
      }

      if (state.phase === 'menu') {
        state.phase = 'playing';
        audio.startMusic();
        audio.playClick();
        return;
      }

      if (state.phase === 'gameover') {
        const hs = state.highScore;
        const settings = state.settings;
        stateRef.current = createInitialState(window.innerHeight);
        stateRef.current.highScore = hs;
        stateRef.current.settings = settings;
        stateRef.current.phase = 'playing';
        audio.playClick();
        if (!audio.isPlaying) audio.startMusic();
        return;
      }

      if (state.phase === 'stats') {
        state.phase = 'gameover';
        audio.playClick();
        return;
      }

      if (state.phase === 'playing' && state.paused) {
        togglePause(state);
        audio.playClick();
        return;
      }

      if (state.phase === 'playing') {
        const wasOrbiting = state.isOrbiting;
        releaseRocket(state);
        if (wasOrbiting) {
          audio.playThrust();
          vibrate(HAPTIC.release);
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [initAudio]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    let prevOrbiting = false;
    let prevThemeIdx = 0;
    let prevCloseCalls = 0;
    let prevPowerupCount = 0;
    let prevHadShield = false;

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const computeAnimScores = (state: GameState, time: number) => {
      if (gameOverStartRef.current < 0) {
        gameOverStartRef.current = time;
        countUpTickRef.current = 0;
      }
      const elapsed = time - gameOverStartRef.current;
      const raw = Math.max(0, Math.min(1, elapsed / COUNT_UP_DURATION_MS));
      const t = easeOutCubic(raw);

      const animScore = Math.floor(state.score * t);
      const animDist = Math.floor(state.distanceMeters * t);
      const animCombo = Math.floor(state.comboBonusEarned * t);
      const animEarth = Math.floor(state.earthBonusEarned * t);

      // Tick sound cadence while counting — respects SFX volume setting.
      if (raw < 1 && state.settings.sfxVolume > 0 && state.score > 0) {
        const tickIdx = Math.floor(elapsed / COUNT_UP_TICK_MS);
        if (tickIdx > countUpTickRef.current) {
          countUpTickRef.current = tickIdx;
          audio.playClick();
        }
      }

      return { animScore, animDist, animCombo, animEarth };
    };

    const loop = (time: number) => {
      const state = stateRef.current;
      const w = window.innerWidth;
      const h = window.innerHeight;
      frameRef.current += 1;

      if ((state.phase === 'playing' || state.phase === 'menu') && gameOverStartRef.current >= 0) {
        gameOverStartRef.current = -1;
        countUpTickRef.current = 0;
        gameOverWasNewHighRef.current = false;
      }

      // If state was reset (retry), allow future milestone chimes to fire again.
      if (prevThemeIdx > state.activeThemeIndex) {
        prevThemeIdx = state.activeThemeIndex;
      }
      if (prevCloseCalls > state.closeCalls) {
        prevCloseCalls = state.closeCalls;
      }
      if (prevPowerupCount > state.lifetimeStats.powerupsCollected) {
        prevPowerupCount = state.lifetimeStats.powerupsCollected;
        prevHadShield = false;
      }

      if (state.phase === 'menu') {
        renderMenu(ctx, w, h, time, state.highScore, state.settings.rocketType || 'aerospace');
      } else if (state.phase === 'playing') {
        if (state.paused) {
          render(ctx, state, w, h, time);
          renderPause(ctx, w, h, state);
        } else {
          const alive = update(state, w, h, frameRef.current);

          // Audio triggers
          if (state.isOrbiting && !prevOrbiting) {
            audio.playCapture();
            vibrate(HAPTIC.capture);
            if (state.combo > 1) {
              audio.playCombo(state.combo);
            }
            // Check if we just captured an Earth
            if (state.orbitPlanetIndex >= 0) {
              const p = state.planets[state.orbitPlanetIndex];
              if (p.planetType === 'earth' && state.scoreBonusLabel === 'earth' && state.scoreBonusTimer === 90) {
                audio.playBonus();
              }
            }
          }
          prevOrbiting = state.isOrbiting;

          // Theme unlock chime
          if (state.activeThemeIndex > prevThemeIdx) {
            audio.playThemeUnlock();
            vibrate(HAPTIC.themeUnlock);
          }
          prevThemeIdx = state.activeThemeIndex;

          // Close-call audio + haptic (fires when counter bumps)
          if (state.closeCalls > prevCloseCalls) {
            audio.playCloseCall();
            vibrate(HAPTIC.capture);
          }
          prevCloseCalls = state.closeCalls;

          // Power-up pickup audio
          if (state.lifetimeStats.powerupsCollected > prevPowerupCount) {
            // Determine which type was just collected by checking flash timers or active effects
            if (state.wormholeFlashTimer > 25) {
              audio.playWormholeActivate();
            } else if (state.gravityPulseTimer > 35) {
              audio.playGravityPulse();
            } else if (state.activeEffects.some(e => e.type === 'magnet' && e.timer > 450)) {
              audio.playMagnetPickup();
            } else if (state.activeEffects.some(e => e.type === 'time_dilation' && e.timer > 400)) {
              audio.playShieldPickup(); // time dilation uses generic pickup
            } else {
              audio.playShieldPickup();
            }
            vibrate(HAPTIC.capture);
          }
          prevPowerupCount = state.lifetimeStats.powerupsCollected;

          // Shield break audio
          const hasShieldNow = state.activeEffects.some(e => e.type === 'shield' && e.timer > 0);
          if (prevHadShield && !hasShieldNow && state.shieldHitTimer > 25) {
            audio.playShieldBreak();
            vibrate(HAPTIC.death);
          }
          prevHadShield = hasShieldNow;

          // Music intensity tracks combo multiplier (1x..5x → 0..1)
          audio.setMusicIntensity((state.comboMultiplier - 1) / 4);

          const isNewHigh = state.score > state.highScore;
          if (!alive) {
            state.phase = 'gameover';
            audio.playExplosion();
            vibrate(HAPTIC.death);
            audio.stopMusic();
            gameOverStartRef.current = time;
            countUpTickRef.current = 0;
            gameOverWasNewHighRef.current = isNewHigh;
            deathTipSeedRef.current = Math.floor(Math.random() * 1_000_000);
            updateLifetimeStatsOnDeath(state);
            if (isNewHigh) {
              state.highScore = state.score;
              localStorage.setItem('orbitHighScore', String(state.score));
            }
          }
          render(ctx, state, w, h, time);
          if (state.phase === 'gameover') {
            if (shareFlashRef.current > 0) shareFlashRef.current--;
            const { animScore, animDist, animCombo, animEarth } = computeAnimScores(state, time);
            const retry = getRetryButtonBounds(w, h);
            const share = getShareButtonBounds(w, h);
            const mp = mousePosRef.current;
            const isRetryHover =
              !!mp && mp.x >= retry.x && mp.x <= retry.x + retry.width &&
              mp.y >= retry.y && mp.y <= retry.y + retry.height;
            const isShareHover =
              !!mp && mp.x >= share.x && mp.x <= share.x + share.width &&
              mp.y >= share.y && mp.y <= share.y + share.height;
            renderGameOver(
              ctx,
              w,
              h,
              animScore,
              animDist,
              animCombo,
              animEarth,
              state.deathReason,
              state.highScore,
              gameOverWasNewHighRef.current,
              shareFlashRef.current > 0,
              isRetryHover,
              isShareHover,
              deathTipSeedRef.current,
              state.closeCalls
            );
          }
        }
      } else if (state.phase === 'stats') {
        renderStats(ctx, w, h, state.lifetimeStats);
      } else if (state.phase === 'gameover') {
        if (shareFlashRef.current > 0) shareFlashRef.current--;
        updateVisualsOnly(state);
        render(ctx, state, w, h, time);
        const { animScore, animDist, animCombo, animEarth } = computeAnimScores(state, time);
        const retry = getRetryButtonBounds(w, h);
        const share = getShareButtonBounds(w, h);
        const mp = mousePosRef.current;
        const isRetryHover =
          !!mp && mp.x >= retry.x && mp.x <= retry.x + retry.width &&
          mp.y >= retry.y && mp.y <= retry.y + retry.height;
        const isShareHover =
          !!mp && mp.x >= share.x && mp.x <= share.x + share.width &&
          mp.y >= share.y && mp.y <= share.y + share.height;
        renderGameOver(
          ctx,
          w,
          h,
          animScore,
          animDist,
          animCombo,
          animEarth,
          state.deathReason,
          state.highScore,
          gameOverWasNewHighRef.current,
          shareFlashRef.current > 0,
          isRetryHover,
          isShareHover,
          deathTipSeedRef.current,
          state.closeCalls
        );
      }

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  useEffect(() => {
    // Keep React state in sync with game engine phase (poll every 100ms)
    const interval = setInterval(() => {
      if (stateRef.current.phase !== phaseState) {
        setPhaseState(stateRef.current.phase);
        if (stateRef.current.phase !== 'gameover') {
          setHasSubmittedScore(false);
        }
      }
    }, 100);
    return () => clearInterval(interval);
  }, [phaseState]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none font-sans text-white">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 touch-none cursor-pointer"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={() => { mousePosRef.current = null; }}
      />
      {phaseState === 'leaderboard' && (
        <LeaderboardOverlay onClose={() => {
          stateRef.current.phase = leaderboardSourceRef.current;
          setPhaseState(leaderboardSourceRef.current);
          audio.playClick();
        }} />
      )}
      {phaseState === 'gameover' && !hasSubmittedScore && stateRef.current.score > 0 && (
        <SubmitScoreOverlay 
          state={stateRef.current} 
          onSubmitted={() => setHasSubmittedScore(true)} 
        />
      )}
    </div>
  );
};

export default OrbitGame;

