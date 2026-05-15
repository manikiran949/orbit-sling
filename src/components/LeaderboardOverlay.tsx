import React, { useEffect, useState } from 'react';
import { fetchTopScores, LeaderboardEntry } from '@/lib/supabase';

interface LeaderboardOverlayProps {
  onClose: () => void;
}

export const LeaderboardOverlay: React.FC<LeaderboardOverlayProps> = ({ onClose }) => {
  const [scores, setScores] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTopScores(100).then(data => {
      setScores(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto">
      <div className="relative w-[90%] max-w-md h-[80%] max-h-[600px] bg-slate-900/90 rounded-2xl border border-sky-400/30 shadow-[0_0_40px_rgba(56,189,248,0.15)] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex-none p-5 border-b border-sky-400/20 bg-slate-800/50 flex justify-between items-center">
          <h2 className="text-xl font-black tracking-widest text-sky-100">GLOBAL TOP 100</h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-700/50 text-sky-300 hover:bg-slate-600/50 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-sky-400"></div>
            </div>
          ) : scores.length === 0 ? (
            <div className="text-center text-slate-400 mt-10">No scores posted yet. Be the first!</div>
          ) : (
            scores.map((entry, idx) => (
              <div key={entry.id} className="flex items-center p-3 rounded-lg bg-slate-800/40 border border-slate-700/50">
                <div className="w-8 text-center font-bold text-slate-400 text-lg mr-3">
                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-sky-50 text-base">{entry.player_name}</div>
                  <div className="text-xs text-sky-200/60 font-medium">
                    {entry.distance.toLocaleString()}m • x{entry.max_combo} Combo
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-black text-sky-400 text-lg tracking-wide">{entry.score.toLocaleString()}</div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{entry.rocket_type}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
