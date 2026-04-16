import { useRef, useEffect, useCallback } from 'react';
import { createInitialState, releaseRocket, update } from '@/game/engine';
import { render, renderMenu, renderGameOver } from '@/game/renderer';
import { GameState } from '@/game/types';

const OrbitGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createInitialState());
  const animRef = useRef<number>(0);

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
    const state = stateRef.current;
    if (state.phase === 'menu') {
      state.phase = 'playing';
      return;
    }
    if (state.phase === 'gameover') {
      const hs = state.highScore;
      stateRef.current = createInitialState();
      stateRef.current.highScore = hs;
      stateRef.current.phase = 'playing';
      return;
    }
    releaseRocket(state);
  }, []);

  useEffect(() => {
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [resize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const loop = (time: number) => {
      const state = stateRef.current;
      const w = window.innerWidth;
      const h = window.innerHeight;

      if (state.phase === 'menu') {
        renderMenu(ctx, w, h, time, state.highScore);
      } else if (state.phase === 'playing') {
        const alive = update(state, w, h);
        if (!alive) {
          state.phase = 'gameover';
          if (state.score > state.highScore) {
            state.highScore = state.score;
            localStorage.setItem('orbitHighScore', String(state.score));
          }
        }
        render(ctx, state, w, h, time);
        if (state.phase === 'gameover') {
          const isNew = state.score >= state.highScore;
          renderGameOver(ctx, w, h, state.score, state.highScore, isNew);
        }
      } else {
        render(ctx, state, w, h, time);
        const isNew = state.score >= state.highScore;
        renderGameOver(ctx, w, h, state.score, state.highScore, isNew);
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
      onMouseDown={handleTap}
      onTouchStart={handleTap}
    />
  );
};

export default OrbitGame;
