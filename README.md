# Orbit Slingshot

A visually rich, physics-based arcade game built with React, HTML5 Canvas, and TypeScript. Navigate the vastness of space by slingshotting your rocket from planet to planet!

## 🚀 Gameplay

- **Slingshot Mechanics:** Your rocket automatically enters the orbit of nearby planets. Click or tap to release from orbit and slingshot your way deeper into space.
- **Dynamic Difficulty:** As you travel further, planets become smaller and more sparsely distributed, increasing the challenge.
- **Score System:** Travel as far as you can. Your distance determines your score.
- **Earth Bonus:** Keep an eye out for rare Earth planets! Entering Earth's orbit grants an instant +50 bonus score and a spectacular particle burst.

## 🌌 Visuals & Aesthetics

The game features a premium, modern space aesthetic achieved purely through Canvas rendering:

- **Deep Space Environment:** Rich multi-stop gradient backgrounds, subtle cosmic dust bands (Milky Way effect), and layered nebulae with parallax scrolling.
- **Dynamic Starfield:** Hundreds of stars with varying colors, sizes, and twinkle animations. Bright stars feature soft glow halos and cross-glints.
- **Sleek Rocket:** A detailed rocket with a metallic gradient body, swept-back fins, glowing cockpit, and a multi-layered, flickering engine flame.
- **Glassmorphism UI:** Modern, frosted-glass UI panels for the HUD, Main Menu, and Game Over screens.

## 🪐 Procedural Planets

Planets are procedurally generated with distinct types, each featuring detailed lighting (terminator shadows, specular highlights, rim lighting, and atmospheric glows):

- **Earth:** Rare blue planets with procedurally generated clustered landmasses and subtle cloud wisps.
- **Gas Giants:** Massive planets with beautiful horizontal atmospheric bands and a high chance of spectacular multi-band planetary rings.
- **Lava:** Scorching red and orange planets.
- **Ice:** Frigid cyan planets with teal accents.
- **Rocky:** Standard terrestrial planets with procedurally generated dark dimple craters.

## 🛠️ Technology Stack

- **Framework:** React
- **Rendering:** HTML5 `<canvas>` API (2D Context)
- **Language:** TypeScript
- **Styling:** Vanilla CSS (for UI overlays)
- **Build Tool:** Vite

## 🏃‍♂️ Running Locally

1. Ensure you have Node.js installed.
2. Clone this repository.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Open your browser to the local URL provided in the terminal (usually `http://localhost:5173`).

## 🎮 Controls

- **Mouse/Touch:** Click or tap anywhere on the screen to release the rocket from its current orbit.

---

*Fly far, explorer!*
