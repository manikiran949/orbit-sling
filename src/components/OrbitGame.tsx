import { useRef, useEffect, useCallback } from 'react';
import { createInitialState, releaseRocket, update, togglePause, saveSettings, updateVisualsOnly } from '@/game/engine';
import { render, renderMenu, renderGameOver, renderPause, GAME_OVER_LAYOUT } from '@/game/renderer';
import { GameState } from '@/game/types';
import { audio } from '@/game/audio';

type PauseSliderTarget = 'music' | 'sfx';

const OrbitGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createInitialState(typeof window !== 'undefined' ? window.innerHeight : 600));
  const animRef = useRef<number>(0);
  const frameRef = useRef<number>(0);
  const audioInitRef = useRef(false);
  const draggingRef = useRef<PauseSliderTarget | null>(null);
  const shareFlashRef = useRef(0);

  const initAudio = useCallback(() => {
    if (audioInitRef.current) return;
    audioInitRef.current = true;
    audio.init();
    const s = stateRef.current.settings;
    audio.setMusicVolume(s.musicVolume);
    audio.setSfxVolume(s.sfxVolume);
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
    const cardY = (h - 280) / 2 - 20;
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
      state.phase = 'playing';
      audio.startMusic();
      audio.playClick();
      return;
    }
    if (state.phase === 'gameover') {
      // Check if tap is on the Share button
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.clientX;
        const clientY = e.clientY;
        if (clientX !== undefined && clientY !== undefined) {
          const mx = clientX - rect.left;
          const my = clientY - rect.top;
          const w = window.innerWidth;
          const h = window.innerHeight;
          const cardH = GAME_OVER_LAYOUT.cardHeight;
          const cardY = (h - cardH) / 2 + GAME_OVER_LAYOUT.cardYOffset;
          const shareBtnW = GAME_OVER_LAYOUT.shareButtonWidth;
          const shareBtnH = GAME_OVER_LAYOUT.shareButtonHeight;
          const shareBtnX = (w - shareBtnW) / 2;
          const shareBtnY = cardY + cardH + GAME_OVER_LAYOUT.shareButtonYOffset;
          if (mx >= shareBtnX && mx <= shareBtnX + shareBtnW && my >= shareBtnY && my <= shareBtnY + shareBtnH) {
            navigator.clipboard.writeText(state.shareMessage).then(() => {
              // Brief visual feedback — swap button text via state
              shareFlashRef.current = 60;
            }).catch(() => { /* clipboard failed silently */ });
            audio.playClick();
            return;
          }
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
      // Low graphics toggle
      if (mx >= toggleX && mx <= toggleX + 40 && my >= toggleY && my <= toggleY + 20) {
        state.settings.lowGraphics = !state.settings.lowGraphics;
        audio.playClick();
        saveSettings(state.settings);
        return;
      }

      togglePause(state);
      audio.playClick();
      return;
    }

    // Track previous orbit state for audio
    const wasOrbiting = state.isOrbiting;
    releaseRocket(state);
    if (wasOrbiting) {
      audio.playThrust();
    }
  }, [applyPauseSliderValue, getPauseCardLayout, initAudio]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
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

  // Keyboard handler for pause
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        initAudio();
        const state = stateRef.current;
        if (state.phase === 'playing') {
          togglePause(state);
          audio.playClick();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [initAudio]);

  // Auto-pause when tab is hidden to avoid accidental deaths and timing jumps.
  useEffect(() => {
    const handleVisibilityChange = () => {
      const state = stateRef.current;
      if (document.hidden && state.phase === 'playing' && !state.paused) {
        togglePause(state);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    let prevOrbiting = false;

    const loop = (time: number) => {
      const state = stateRef.current;
      const w = window.innerWidth;
      const h = window.innerHeight;
      frameRef.current += 1;

      if (state.phase === 'menu') {
        renderMenu(ctx, w, h, time, state.highScore);
      } else if (state.phase === 'playing') {
        if (state.paused) {
          render(ctx, state, w, h, time);
          renderPause(ctx, w, h, state);
        } else {
          const alive = update(state, w, h, frameRef.current);

          // Audio triggers
          if (state.isOrbiting && !prevOrbiting) {
            audio.playCapture();
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

          const isNewHigh = state.score > state.highScore;
          if (!alive) {
            state.phase = 'gameover';
            audio.playExplosion();
            audio.stopMusic();
            if (isNewHigh) {
              state.highScore = state.score;
              localStorage.setItem('orbitHighScore', String(state.score));
            }
          }
          render(ctx, state, w, h, time);
          if (state.phase === 'gameover') {
            if (shareFlashRef.current > 0) shareFlashRef.current--;
            renderGameOver(
              ctx,
              w,
              h,
              state.score,
              state.distanceMeters,
              state.comboBonusEarned,
              state.earthBonusEarned,
              state.deathReason,
              state.highScore,
              isNewHigh,
              shareFlashRef.current > 0
            );
          }
        }
      } else {
        // gameover phase — isNewHigh was captured when game ended
        const isNewHigh = state.score > state.highScore;
        if (shareFlashRef.current > 0) shareFlashRef.current--;
        updateVisualsOnly(state);
        render(ctx, state, w, h, time);
        renderGameOver(
          ctx,
          w,
          h,
          state.score,
          state.distanceMeters,
          state.comboBonusEarned,
          state.earthBonusEarned,
          state.deathReason,
          state.highScore,
          isNewHigh,
          shareFlashRef.current > 0
        );
      }

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 touch-none cursor-pointer"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    />
  );
};

export default OrbitGame;
