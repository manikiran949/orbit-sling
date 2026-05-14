# Orbit Slingshot

A fast-paced, physics-based arcade game built with React and HTML5 Canvas. Navigate deep space by slingshotting your rocket from planet to planet!

## How to Play

- **Auto-Orbit:** Your rocket automatically enters the orbit of nearby planets.
- **Slingshot:** Click or tap anywhere to release from orbit and slingshot forward.
- **Score:** Travel as far as you can!
- **Combos & Hazards:** Avoid solar flares, asteroids, and nebulas. Build momentum combos to boost your score.

## Features

- **Procedural Universe:** Endless, procedurally generated planets (Earths, Gas Giants, Lava, Ice) and cosmic hazards (Asteroids, Comets).
- **Precision Landings:** Master the timing! Release at the perfect angle to hit the next planet dead-on for "PERFECT" or "GREAT" rating bonuses.
- **Power-ups & Abilities:** Collect shields, magnets, wormholes, and time dilation power-ups to survive longer and boost your score.
- **Dynamic Physics:** Smooth orbital mechanics, momentum multipliers, and an escalating combo system that rewards speed.
- **Procedural Audio:** All sounds, music layers, and crystal bell chimes are synthesized entirely via the Web Audio API without requiring any external audio assets.
- **Haptic Feedback:** Includes tactile feedback on supported mobile devices using the Native Vibrate API (`navigator.vibrate`) for deep immersion.
- **Premium Aesthetics:** Glassmorphic UI overlays rendered directly on the canvas, dynamic starfields, interactive cosmic backgrounds, and rich particle systems.
- **Player Progression:** Tracks lifetime stats across runs including total distance, best combos, comets dodged, and precision landings.
- **Player Settings:** Built-in support for multiple rocket skins (Aerospace, Classic, Stealth), customizable volume settings, low graphics mode, and reduced motion toggles.
- **Share Your Score:** Built-in social sharing (like Wordle) using seamless clipboard integration to challenge your friends.

## Tech Stack

- **Core:** React 18 & TypeScript
- **Engine & Graphics:** Native HTML5 Canvas 2D Context driven by an optimized `requestAnimationFrame` loop.
- **Styles:** Tailwind CSS (used for layout and UI components)
- **Tooling:** Vite for lightning-fast bundling and development.
- **Testing:** Vitest for test runners.

## Project Structure

- `src/game/`: The core independent game engine modules.
  - `engine.ts`: Pure state mutation, procedurally generating universe items (planets, asteroids), physics simulations.
  - `renderer.ts`: Pure canvas drawing and layout abstractions.
  - `audio.ts`: The procedural Web Audio Synthesizer class.
  - `haptics.ts`: Haptic feedback controllers.
  - `types.ts` & `themes.ts`: Global interfaces and theme data.
- `src/components/`:
  - `OrbitGame.tsx`: The primary React Canvas wrapper connecting input, resize logic, styling overlays, and firing the game loop.
  - `ui/`: The Shadcn/UI integration folder, for reusable web-layer components.
- `src/pages/`: App routing and primary views (`Index.tsx`, `NotFound.tsx`).

## Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Run Tests (Optional):
   ```bash
   npm run test
   ```

*Fly far, explorer!*
