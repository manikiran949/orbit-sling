# Global Leaderboard Implementation Plan

## 1. Overview
The Global Leaderboard will add a competitive multiplayer layer to Orbit Slingshot. Players will be able to see their ranking compared to others worldwide, incentivizing them to improve their scores, distance, and combos. This feature is intended to increase replayability and community engagement.

## 2. Architecture & Technology Stack
Since the game is built using React (Vite + TypeScript) and is fully client-side, we need a lightweight, serverless backend to handle leaderboard data.

**Recommended Provider:** Supabase or Firebase (Firestore).
- **Supabase** is highly recommended as it provides a PostgreSQL database, real-time subscriptions, and a generous free tier.
- **Data Structure:** We will need a simple `leaderboard` table.

### Schema (`leaderboard` table)
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Unique identifier for the run/entry. |
| `player_name` | String | A 3-to-15 character name chosen by the player. |
| `score` | Integer | The total score achieved (primary sort key). |
| `distance` | Integer | The distance traveled (secondary sort key / tiebreaker). |
| `max_combo` | Integer | The highest combo achieved during the run. |
| `rocket_type` | String | The rocket used (e.g., 'aerospace', 'classic', 'stealth'). |
| `created_at` | Timestamp | When the run was recorded. |

## 3. UI/UX Design

### A. The "Submit Score" Flow (End of Run)
When a player finishes a run (Game Over screen):
1. **Condition:** Check if the score qualifies for the Top 100, or if it's a personal best.
2. **Input:** If it qualifies, display a small, sleek input field asking for a "Pilot Name" (max 15 characters).
3. **Persistence:** Save this name to `localStorage` so the player doesn't have to type it every time.
4. **Action:** A "Submit Score" button alongside the "Retry" and "Share" buttons.
5. **Feedback:** A loading spinner followed by a success checkmark when the score is posted.

### B. The Leaderboard View
We will add a new phase to `GameState` (e.g., `phase: 'leaderboard'`) or render it over the menu.
- **Entry Point:** A "🏆 Leaderboard" button on the main menu.
- **Layout:** A clean, glassmorphism modal (similar to the stats screen).
- **Tabs:** 
  - **All-Time Top 100**
  - **Weekly Top 50** (If we want to implement rotating seasons)
- **Row Design:**
  - **Rank:** 1st, 2nd, 3rd (with gold/silver/bronze icons), then 4, 5, etc.
  - **Name:** The player's chosen name.
  - **Score:** Large, glowing number.
  - **Details:** Smaller text showing distance and combo (e.g., "5,000m • x5 Max").
  - **Icon:** A tiny icon representing the rocket type they used.

## 4. Security & Anti-Cheat Considerations
Since the game is entirely client-side, it is vulnerable to people manually posting fake scores via the API.
To mitigate this without building a complex server-side game simulation:
1. **Sanity Checks:** Reject scores that are mathematically impossible based on reasonable timeframes (e.g., if a score is submitted less than 30 seconds after the last game start but claims 100,000 points).
2. **Obfuscation:** Obfuscate the payload or add a simple client-side hash based on the score and a secret salt when sending to the database. (Not foolproof, but stops casual API abuse).
3. **Rate Limiting:** Enforce a limit of, say, 5 submissions per IP per minute.

## 5. Implementation Phases
* **Phase 1: Database Setup.** Create the Supabase project, define the table schema, and set up Row Level Security (RLS) policies to only allow inserts and selects.
* **Phase 2: Client Integration.** Install the Supabase JS client and write a utility file (`src/game/leaderboard.ts`) to handle fetching and posting scores.
* **Phase 3: UI Implementation.** Build the React/Canvas UI for the leaderboard view and the score submission input on the Game Over screen.
* **Phase 4: Testing & Polish.** Test with dummy data, ensure scrolling works smoothly in the Canvas/DOM overlay, and add loading states.
