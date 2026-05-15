import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create a single supabase client for interacting with your database
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

export interface LeaderboardEntry {
  id?: string;
  player_name: string;
  score: number;
  distance: number;
  max_combo: number;
  rocket_type: string;
  created_at?: string;
}

export async function fetchTopScores(limit = 100): Promise<LeaderboardEntry[]> {
  if (!supabase) {
    console.warn('Supabase not configured. Returning empty leaderboard.');
    return [];
  }

  const { data, error } = await supabase
    .from('leaderboard')
    .select('*')
    .order('score', { ascending: false })
    .order('distance', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }

  return data as LeaderboardEntry[];
}

export async function submitScore(entry: LeaderboardEntry): Promise<boolean> {
  if (!supabase) {
    console.warn('Supabase not configured. Cannot submit score.');
    return false;
  }

  const { error } = await supabase
    .from('leaderboard')
    .insert([entry]);

  if (error) {
    console.error('Error submitting score:', error);
    return false;
  }

  return true;
}
