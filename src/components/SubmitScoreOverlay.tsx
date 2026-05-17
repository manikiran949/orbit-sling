import React, { useState } from 'react';
import { submitScore, LeaderboardEntry } from '@/lib/supabase';
import { GameState } from '@/game/types';
import { saveSettings } from '@/game/engine';

interface SubmitScoreOverlayProps {
  state: GameState;
  onSubmitted: () => void;
}

export const SubmitScoreOverlay: React.FC<SubmitScoreOverlayProps> = ({ state, onSubmitted }) => {
  const [name, setName] = useState(state.settings.playerName || '');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  // Only show if score > 0
  if (state.score === 0) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim().slice(0, 15);
    if (!cleanName) return;

    setStatus('submitting');
    
    // Save name locally for next time
    state.settings.playerName = cleanName;
    saveSettings(state.settings);

    const entry: LeaderboardEntry = {
      player_name: cleanName,
      score: state.score,
      distance: state.distanceMeters,
      max_combo: state.maxCombo,
      rocket_type: state.settings.rocketType,
    };

    const success = await submitScore(entry);
    if (success) {
      setStatus('success');
      setTimeout(() => {
        onSubmitted();
      }, 1500);
    } else {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  if (status === 'success') {
    return (
      <div className="absolute right-4 md:right-12 top-1/2 -translate-y-1/2 bg-emerald-950/80 border border-emerald-500/50 text-emerald-400 px-8 py-3 rounded-full font-black tracking-[0.2em] uppercase backdrop-blur-xl shadow-[0_0_30px_rgba(16,185,129,0.3)] pointer-events-auto z-10">
        Score Posted
      </div>
    );
  }

  return (
    <div className="absolute right-4 md:right-12 top-1/2 -translate-y-1/2 bg-slate-950/80 border border-sky-500/20 p-5 rounded-2xl backdrop-blur-xl shadow-[0_0_40px_rgba(14,165,233,0.15)] pointer-events-auto w-[320px] z-10">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="text-xs font-bold text-sky-400/80 tracking-[0.2em] uppercase text-center drop-shadow-[0_0_5px_rgba(56,189,248,0.4)]">
          Post to Global Leaderboard
        </label>
        <div className="flex relative group">
          <input 
            type="text" 
            maxLength={15}
            placeholder="PILOT NAME"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={status === 'submitting'}
            className="flex-1 min-w-0 bg-slate-900 border-2 border-slate-700/60 border-r-0 rounded-l-full pl-5 pr-3 py-2.5 text-sky-100 font-bold tracking-wider placeholder:text-slate-600 focus:outline-none focus:border-sky-500/60 focus:bg-slate-800 transition-all disabled:opacity-50"
          />
          <button 
            type="submit"
            disabled={!name.trim() || status === 'submitting'}
            className="bg-slate-900 border-2 border-slate-700/60 border-l-0 text-sky-400 font-black tracking-widest px-5 rounded-r-full transition-all group-focus-within:border-sky-500/60 hover:bg-sky-500/20 hover:text-sky-200 hover:border-sky-400 disabled:opacity-50 disabled:hover:bg-slate-900 disabled:hover:text-sky-400 disabled:hover:border-slate-700/60"
          >
            {status === 'submitting' ? '...' : 'POST'}
          </button>
        </div>
        {status === 'error' && (
          <div className="text-red-400 text-xs text-center font-bold tracking-wider uppercase drop-shadow-[0_0_5px_rgba(248,113,113,0.5)]">
            Transmission Failed
          </div>
        )}
      </form>
    </div>
  );
};
