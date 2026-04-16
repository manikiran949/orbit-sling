import { useRef, useEffect, useCallback } from 'react';
import { createInitialState, startOrbit, releaseOrbit, update } from '@/game/engine';
import { render, renderMenu, renderGameOver } from '@/game/renderer';
import { GameState } from '@/game/types';

const OrbitGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createInitialState());
  const animRef = useRef<number>(0);
  const holdingRef = useRef(false);

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }, []);

  const handleDown = useCallback(() => {
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
    holdingRef.current = true;
    startOrbit(state);
  }, []);

  const handleUp = useCallback(() => {
    holdingRef.current = false;
    const state = stateRef.current;
    if (state.phase === 'playing') {
      releaseOrbit(state);
    }
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
      const w = canvas.width;
      const h = canvas.height;

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
      onMouseDown={handleDown}
      onMouseUp={handleUp}
      onTouchStart={handleDown}
      onTouchEnd={handleUp}
    />
  );
};

export default OrbitGame;
