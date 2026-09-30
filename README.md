# Target Rush 🎯

> **Test Your Reflexes. Beat Your Score.**

A fast-paced, arcade-style reflex and aim-training browser game built strictly with **pure HTML5, CSS3, and Vanilla JavaScript** — zero external libraries, frameworks, or backend required.

---

## 📖 Project Description

**Target Rush** tests your reaction speed, precision, and focus. Players have **30 seconds** to click as many randomly appearing targets as possible while avoiding penalty traps.

As the clock ticks down, the game gets progressively harder: targets spawn faster, shrink in size, and vanish more quickly. Chaining hits builds up powerful combo multipliers, rewarding both high speed and pinpoint accuracy.

---

## ✨ Features

- **⚡ Fast-Paced Gameplay**: 30-second rapid-fire reflex challenge with dynamic difficulty scaling.
- **🎯 4 Distinct Target Types**:
  - **Normal Target** (+10 pts): Standard glowing cyan target with inner bullseye.
  - **Fast Target** (+20 pts): High-speed amber target that disappears rapidly.
  - **Bonus Target** (+50 pts): Rare neon purple star target for huge score boosts.
  - **Danger Target** (-25 pts & Combo Reset): Menacing red hazard target that must be avoided.
- **🔥 Dynamic Combo System**:
  - Consecutive hits build your combo streak:
    - 1–4 hits: `1.0x`
    - 5–9 hits: `1.5x`
    - 10–14 hits: `2.0x`
    - 15–19 hits: `2.5x`
    - 20+ hits: `3.0x`
- **🎯 Precision Miss Detection**: Clicking the empty arena area counts as a miss, resetting your combo and impacting your accuracy.
- **📊 Real-Time Statistics & Performance Metrics**:
  - Real-time score counter with pop animations
  - Active combo streak & multiplier badge
  - Accuracy calculation (`Hits / Total Clicks`)
  - Best reaction time tracking (measured in milliseconds from spawn to hit)
  - Maximum combo streak achieved
- **⏳ Visual Urgency**:
  - Digital millisecond timer with animated countdown progress bar
  - Target despawn ring showing remaining lifespan on every target
  - Critical warning state during the final 5 seconds
- **🏆 Persistent High Score**: Saved automatically in browser `localStorage`.
- **🔊 Web Audio API Sound System**:
  - Fully synthesized procedural sound effects (hit chimes, laser pop, bonus arpeggios, hazard buzzer, miss click, and game over fanfare).
  - No external audio files or network requests needed.
  - Sound mute/unmute toggle with preference persistence.
- **📱 Responsive & Touch-Ready**:
  - Optimized for desktop mice and mobile touchscreens (`pointerdown` events ensure instant response with zero mobile tap delay).
  - Modern cyberpunk/aim-trainer dark theme with glassmorphism, subtle neon glow, floating combat text, and spark particles.

---

## 🛠️ Technologies Used

This project adheres strictly to vanilla web standards:

- **HTML5**: Semantic elements, accessible role attributes, responsive viewport metadata.
- **CSS3**: Custom CSS properties (variables), Flexbox, CSS Grid, Glassmorphism (`backdrop-filter`), keyframe animations, responsive media queries.
- **Vanilla JavaScript (ES6+)**:
  - Event listeners and DOM manipulation
  - High-resolution timing with `performance.now()`
  - Web Audio API (`AudioContext`, `OscillatorNode`, `GainNode`) for synthesized SFX
  - Browser `localStorage` for high score and sound settings persistence
  - Zero dependencies, zero build steps, zero bundlers.

---

## 🚀 How to Run the Game

No installation, build step, or server configuration is required.

### Option 1: Direct File Opening
1. Download or clone this repository.
2. Double-click `index.html` (or right-click and select **Open with** > **Google Chrome / Microsoft Edge / Firefox / Safari**).
3. The game will launch immediately!

### Option 2: Local HTTP Server (Optional)
If you prefer running through a local development server:
```bash
# Using Python 3:
python -m http.server 8080

# Using Node npx:
npx serve .
```
Then visit `http://localhost:8080` in your web browser.

---

## 🎮 How to Play

1. Click **START GAME** on the home screen.
2. A 3-second countdown (*3, 2, 1, RUSH!*) will prepare you.
3. Once the round begins, targets will spawn across the arena field.
4. **Click or tap** targets before their circular timer ring expires.
5. Avoid clicking the **Danger (✕)** targets!
6. Keep an eye on your **Time Remaining** in the top-right HUD.
7. When the 30 seconds expire, review your final score, accuracy, best reaction time, and high score.

---

## 📜 Game Rules & Scoring

| Target Type | Color | Points | Behavior / Notes |
| :--- | :--- | :--- | :--- |
| **Normal** | Neon Cyan | **+10 PTS** | Balanced spawn rate and lifespan. |
| **Fast** | Radiant Amber | **+20 PTS** | Faster despawn rate; rewards quick reaction. |
| **Bonus** | Neon Magenta / Star | **+50 PTS** | Rare spawn; awards massive points. |
| **Danger** | Crimson Red / Cross | **-25 PTS** | **Avoid!** Deducts points and resets combo streak to zero. |

### Combo Rules:
- Hitting valid targets continuously increases your combo counter.
- Higher combos unlock multipliers (`1.5x`, `2.0x`, `2.5x`, `3.0x`), multiplying points awarded for every hit.
- Missing a shot (clicking empty arena floor) or hitting a Danger target immediately resets the combo streak to `0`.

---

## 📁 Project Structure

```
TargetRush/
├── index.html       # Game structure, HUD components, modals, and screen overlays
├── style.css        # Cyberpunk dark mode theme, HUD styles, target visual FX, animations
├── script.js        # Game engine, timer loop, target spawner, Web Audio synth, localStorage
└── README.md        # Complete game documentation and setup instructions
```

---

## 🔮 Future Improvements

Here are a few optional features that could be added in future versions:
- **Game Modes**: e.g., "Endless Survival" (3 lives, no timer), "Precision Mode" (smaller targets only), or "Speedrun" (hit 50 targets as fast as possible).
- **Customization**: Player-selectable crosshair styles and arena color themes.
- **Global Leaderboard**: Optional integration with an online backend database.
- **Difficulty Presets**: Easy, Normal, and Hardcore difficulty settings.

---

## 📄 License

This project is open-source and free to use for educational and personal projects.
