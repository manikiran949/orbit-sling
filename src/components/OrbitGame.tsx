import { useRef, useEffect, useCallback } from 'react';
import { createInitialState, releaseRocket, update, togglePause, saveSettings, updateVisualsOnly } from '@/game/engine';
import { render, renderMenu, renderGameOver, renderPause } from '@/game/renderer';
import { GameState } from '@/game/types';
import { audio } from '@/game/audio';

const OrbitGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createInitialState(typeof window !== 'undefined' ? window.innerHeight : 600));
  const animRef = useRef<number>(0);
  const frameRef = useRef<number>(0);
  const audioInitRef = useRef(false);
  const draggingRef = useRef<string | null>(null);
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

  const handleTap = useCallback((e?: React.MouseEvent | React.TouchEvent) => {
    if (e) e.preventDefault();
    initAudio();
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
      if (canvas && e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in (e as any) ? (e as React.TouchEvent).touches[0]?.clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in (e as any) ? (e as React.TouchEvent).touches[0]?.clientY : (e as React.MouseEvent).clientY;
        if (clientX !== undefined && clientY !== undefined) {
          const mx = clientX - rect.left;
          const my = clientY - rect.top;
          const w = window.innerWidth;
          const h = window.innerHeight;
          const cardW = Math.min(280, w * 0.8);
          const cardH = 220;
          const cardY = (h - cardH) / 2 - 10;
          const shareBtnW = 160;
          const shareBtnH = 36;
          const shareBtnX = (w - shareBtnW) / 2;
          const shareBtnY = cardY + cardH + 55;
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
      const clientX = 'touches' in (e as any) ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY = 'touches' in (e as any) ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;
      const mx = clientX - rect.left;
      const my = clientY - rect.top;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const cardW = Math.min(320, w * 0.85);
      const cardX = (w - cardW) / 2;
      const cardY = (h - 280) / 2 - 20;
      const sliderX = cardX + 30;
      const sliderW = cardW - 60;
      const toggleX = sliderX + sliderW - 40;
      const toggleY = cardY + 174;

      // Music slider
      if (mx >= sliderX && mx <= sliderX + sliderW && my >= cardY + 90 && my <= cardY + 115) {
        state.settings.musicVolume = Math.max(0, Math.min(1, (mx - sliderX) / sliderW));
        audio.setMusicVolume(state.settings.musicVolume);
        saveSettings(state.settings);
        return;
      }
      // SFX slider
      if (mx >= sliderX && mx <= sliderX + sliderW && my >= cardY + 135 && my <= cardY + 160) {
        state.settings.sfxVolume = Math.max(0, Math.min(1, (mx - sliderX) / sliderW));
        audio.setSfxVolume(state.settings.sfxVolume);
        audio.playClick();
        saveSettings(state.settings);
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
  }, [initAudio]);

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
            renderGameOver(ctx, w, h, state.score, state.highScore, isNewHigh, shareFlashRef.current > 0);
          }
        }
      } else {
        // gameover phase — isNewHigh was captured when game ended
        const isNewHigh = state.score > state.highScore;
        if (shareFlashRef.current > 0) shareFlashRef.current--;
        updateVisualsOnly(state);
        render(ctx, state, w, h, time);
        renderGameOver(ctx, w, h, state.score, state.highScore, isNewHigh, shareFlashRef.current > 0);
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
      onPointerDown={handleTap}
    />
  );
};

export default OrbitGame;
