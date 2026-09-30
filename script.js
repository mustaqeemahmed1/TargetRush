/**
 * TARGET RUSH — Fast-Paced Arcade Reflex & Aim Trainer
 * Built with HTML5, CSS3, and Vanilla JavaScript.
 */

// ============================================================================
// GAME CONFIGURATION & CONSTANTS
// ============================================================================
const CONFIG = {
  GAME_DURATION: 30, // Total seconds per round
  BASE_SPAWN_INTERVAL: 850, // ms between spawns at start
  MIN_SPAWN_INTERVAL: 440,  // ms between spawns at end of round
  BASE_TARGET_SIZE: 74,     // px diameter at start
  MIN_TARGET_SIZE: 48,      // px diameter at end of round
  STORAGE_KEY_HIGHSCORE: 'target_rush_high_score',
  STORAGE_KEY_SOUND: 'target_rush_sound_muted',

  // Target type characteristics
  TARGET_TYPES: {
    normal: {
      type: 'normal',
      name: 'Normal',
      points: 10,
      baseLifespan: 1700,
      minLifespan: 1050,
      sizeFactor: 1.0,
      color: '#00f0ff'
    },
    fast: {
      type: 'fast',
      name: 'Fast',
      points: 20,
      baseLifespan: 1100,
      minLifespan: 680,
      sizeFactor: 0.85,
      color: '#ffb703'
    },
    bonus: {
      type: 'bonus',
      name: 'Bonus',
      points: 50,
      baseLifespan: 1300,
      minLifespan: 800,
      sizeFactor: 0.9,
      color: '#e024c3'
    },
    danger: {
      type: 'danger',
      name: 'Danger',
      points: -25, // Score penalty
      baseLifespan: 1800,
      minLifespan: 1200,
      sizeFactor: 1.0,
      color: '#ff0055'
    }
  }
};

// ============================================================================
// GAME STATE
// ============================================================================
const gameState = {
  isPlaying: false,
  score: 0,
  combo: 0,
  maxCombo: 0,
  targetsHit: 0,
  totalShots: 0, // Clicks inside arena (hits + misses)
  bestReactionTime: null, // Minimum reaction time in ms
  timeRemaining: CONFIG.GAME_DURATION,
  highScore: 0,
  soundMuted: false,

  // Loop & Timer IDs
  gameTimerInterval: null,
  spawnTimerTimeout: null,
  activeTargets: new Map(), // id -> { element, timeoutId, spawnTime, type }
  targetCounter: 0
};

// ============================================================================
// DOM ELEMENTS
// ============================================================================
const DOM = {
  // Screens
  startScreen: document.getElementById('start-screen'),
  gameOverScreen: document.getElementById('game-over-screen'),
  countdownOverlay: document.getElementById('countdown-overlay'),
  countdownNumber: document.getElementById('countdown-number'),

  // Buttons
  startBtn: document.getElementById('start-btn'),
  restartBtn: document.getElementById('restart-btn'),
  soundToggleBtn: document.getElementById('sound-toggle-btn'),
  soundIcon: document.getElementById('sound-icon'),

  // Arena & Layers
  gameArena: document.getElementById('game-arena'),
  targetsLayer: document.getElementById('targets-layer'),
  fxLayer: document.getElementById('fx-layer'),

  // HUD Elements
  hudScore: document.getElementById('hud-score'),
  hudCombo: document.getElementById('hud-combo'),
  hudMultiplier: document.getElementById('hud-multiplier'),
  hudAccuracy: document.getElementById('hud-accuracy'),
  hudTimer: document.getElementById('hud-timer'),
  timerBar: document.getElementById('timer-bar'),

  // High Scores & Results
  startHighScore: document.getElementById('start-high-score'),
  resultsScore: document.getElementById('results-score'),
  resultsHits: document.getElementById('results-hits'),
  resultsAccuracy: document.getElementById('results-accuracy'),
  resultsReaction: document.getElementById('results-reaction'),
  resultsMaxCombo: document.getElementById('results-max-combo'),
  resultsHighScore: document.getElementById('results-high-score'),
  newRecordBadge: document.getElementById('new-record-badge'),
  defaultBadge: document.getElementById('default-badge')
};

// ============================================================================
// WEB AUDIO SYNTHESIZER (No external files needed)
// ============================================================================
class SoundEffects {
  constructor() {
    this.ctx = null;
  }

  // Lazy-initialize AudioContext on first user interaction
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playNormalHit() {
    if (gameState.soundMuted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(580, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  playFastHit() {
    if (gameState.soundMuted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(1300, now + 0.12);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  playBonusHit() {
    if (gameState.soundMuted || !this.ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 arpeggio
    notes.forEach((freq, idx) => {
      const startTime = this.ctx.currentTime + idx * 0.05;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.005, startTime + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.2);
    });
  }

  playDangerHit() {
    if (gameState.soundMuted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.linearRampToValueAtTime(70, now + 0.25);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  playMissSound() {
    if (gameState.soundMuted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.08);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.09);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.09);
  }

  playTick(isFinal) {
    if (gameState.soundMuted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(isFinal ? 880 : 440, now);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  playGameOverFanfare() {
    if (gameState.soundMuted || !this.ctx) return;
    const chords = [
      { f: 523.25, d: 0.15, t: 0 },
      { f: 659.25, d: 0.15, t: 0.15 },
      { f: 783.99, d: 0.2,  t: 0.3 },
      { f: 1046.5, d: 0.45, t: 0.5 }
    ];
    chords.forEach(c => {
      const startTime = this.ctx.currentTime + c.t;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(c.f, startTime);

      gain.gain.setValueAtTime(0.25, startTime);
      gain.gain.exponentialRampToValueAtTime(0.005, startTime + c.d);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + c.d);
    });
  }
}

const sfx = new SoundEffects();

// ============================================================================
// INITIALIZATION & EVENT LISTENERS
// ============================================================================
function init() {
  loadHighScore();
  loadSoundPreference();
  updateStatsUI();

  // Attach button listeners
  DOM.startBtn.addEventListener('click', handleStartButtonClick);
  DOM.restartBtn.addEventListener('click', handleStartButtonClick);
  DOM.soundToggleBtn.addEventListener('click', toggleSound);

  // Arena miss listener (handles clicks that missed any target)
  // Use pointerdown for instant responsiveness across mouse and touch
  DOM.gameArena.addEventListener('pointerdown', handleArenaPointerDown);
}

// ============================================================================
// HIGH SCORE MANAGEMENT (localStorage)
// ============================================================================
function loadHighScore() {
  try {
    const saved = localStorage.getItem(CONFIG.STORAGE_KEY_HIGHSCORE);
    gameState.highScore = saved ? parseInt(saved, 10) : 0;
  } catch (e) {
    gameState.highScore = 0;
  }
  DOM.startHighScore.textContent = gameState.highScore.toLocaleString();
  DOM.resultsHighScore.textContent = gameState.highScore.toLocaleString();
}

function saveHighScore() {
  if (gameState.score > gameState.highScore) {
    gameState.highScore = gameState.score;
    try {
      localStorage.setItem(CONFIG.STORAGE_KEY_HIGHSCORE, gameState.highScore.toString());
    } catch (e) {
      console.warn('Unable to save high score to localStorage:', e);
    }
    return true; // Indicates a new high score was reached
  }
  return false;
}

// Sound toggle & storage
function loadSoundPreference() {
  try {
    const muted = localStorage.getItem(CONFIG.STORAGE_KEY_SOUND) === 'true';
    gameState.soundMuted = muted;
  } catch (e) {
    gameState.soundMuted = false;
  }
  updateSoundIcon();
}

function toggleSound(e) {
  if (e) e.stopPropagation();
  sfx.init();
  gameState.soundMuted = !gameState.soundMuted;
  try {
    localStorage.setItem(CONFIG.STORAGE_KEY_SOUND, gameState.soundMuted.toString());
  } catch (err) {}
  updateSoundIcon();
}

function updateSoundIcon() {
  DOM.soundIcon.textContent = gameState.soundMuted ? '🔇' : '🔊';
  DOM.soundToggleBtn.title = gameState.soundMuted ? 'Unmute Sound' : 'Mute Sound';
}

// ============================================================================
// COUNTDOWN & START GAME
// ============================================================================
function handleStartButtonClick() {
  sfx.init(); // Initialize audio context on explicit user gesture

  // Hide any open dialogs
  DOM.startScreen.classList.remove('active');
  DOM.gameOverScreen.classList.remove('active');

  // Trigger brief 3-2-1-RUSH countdown sequence
  runStartCountdown(() => {
    startGame();
  });
}

function runStartCountdown(callback) {
  DOM.countdownOverlay.classList.add('active');
  let count = 3;
  DOM.countdownNumber.textContent = count;
  sfx.playTick(false);

  const countdownInterval = setInterval(() => {
    count--;
    if (count > 0) {
      DOM.countdownNumber.textContent = count;
      sfx.playTick(false);
    } else if (count === 0) {
      DOM.countdownNumber.textContent = 'RUSH!';
      sfx.playTick(true);
    } else {
      clearInterval(countdownInterval);
      DOM.countdownOverlay.classList.remove('active');
      callback();
    }
  }, 750);
}

/**
 * Starts a 30-second game session.
 */
function startGame() {
  // Reset game state
  gameState.isPlaying = true;
  gameState.score = 0;
  gameState.combo = 0;
  gameState.maxCombo = 0;
  gameState.targetsHit = 0;
  gameState.totalShots = 0;
  gameState.bestReactionTime = null;
  gameState.timeRemaining = CONFIG.GAME_DURATION;
  gameState.targetCounter = 0;

  // Clear existing targets and FX
  clearAllActiveTargets();
  DOM.fxLayer.innerHTML = '';

  // Reset HUD
  document.querySelector('.timer-card').classList.remove('danger');
  updateStatsUI();
  updateTimerUI();

  // Start countdown timer interval (updates every 100ms for smooth display)
  const startTime = Date.now();
  const totalMs = CONFIG.GAME_DURATION * 1000;

  gameState.gameTimerInterval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const remainingMs = Math.max(0, totalMs - elapsed);
    gameState.timeRemaining = remainingMs / 1000;

    updateTimer();

    if (remainingMs <= 0) {
      endGame();
    }
  }, 100);

  // Spawn initial target immediately and schedule subsequent spawns
  spawnTarget();
  scheduleNextSpawn();
}

// ============================================================================
// DIFFICULTY CALCULATION
// ============================================================================
/**
 * Calculates current progress factor (0.0 at start, 1.0 near end)
 * and returns scaled spawn rates, target sizes, and despawn times.
 */
function getDifficulty() {
  const elapsed = CONFIG.GAME_DURATION - gameState.timeRemaining;
  const progress = Math.min(1, Math.max(0, elapsed / CONFIG.GAME_DURATION));

  // Current spawn delay decreases smoothly over time
  const spawnInterval = CONFIG.BASE_SPAWN_INTERVAL - progress * (CONFIG.BASE_SPAWN_INTERVAL - CONFIG.MIN_SPAWN_INTERVAL);

  // Target size decreases slightly as time elapses
  const targetSize = CONFIG.BASE_TARGET_SIZE - progress * (CONFIG.BASE_TARGET_SIZE - CONFIG.MIN_TARGET_SIZE);

  return {
    progress,
    spawnInterval,
    targetSize
  };
}

function scheduleNextSpawn() {
  if (!gameState.isPlaying) return;

  const { spawnInterval } = getDifficulty();
  // Small random jitter (+-15%) for unpredictable rhythm
  const jitter = spawnInterval * (0.85 + Math.random() * 0.3);

  gameState.spawnTimerTimeout = setTimeout(() => {
    if (gameState.isPlaying) {
      // Don't let arena get flooded: keep max 3 concurrent targets
      if (gameState.activeTargets.size < 3) {
        spawnTarget();
      }
      scheduleNextSpawn();
    }
  }, jitter);
}

// ============================================================================
// TARGET SPAWNING & POSITIONING
// ============================================================================
/**
 * Selects a target type based on current game progress.
 */
function chooseTargetType(progress) {
  const rand = Math.random();

  // Probability distribution scales with difficulty
  // Danger targets only appear after early warm-up phase (e.g., progress > 0.15)
  if (progress > 0.18 && rand < 0.16) {
    return CONFIG.TARGET_TYPES.danger;
  }

  // Bonus targets (15% chance)
  if (rand < 0.31) {
    return CONFIG.TARGET_TYPES.bonus;
  }

  // Fast targets (25% chance)
  if (rand < 0.56) {
    return CONFIG.TARGET_TYPES.fast;
  }

  // Default normal target
  return CONFIG.TARGET_TYPES.normal;
}

/**
 * Spawns a target at a random position inside the arena boundary.
 */
function spawnTarget() {
  if (!gameState.isPlaying) return;

  const arenaRect = DOM.gameArena.getBoundingClientRect();
  if (arenaRect.width <= 0 || arenaRect.height <= 0) return;

  const difficulty = getDifficulty();
  const targetType = chooseTargetType(difficulty.progress);
  const targetSize = Math.round(difficulty.targetSize * targetType.sizeFactor);
  const radius = targetSize / 2;

  // Safe inner padding so targets never clip border edges
  const padding = 20;
  const minX = radius + padding;
  const maxX = arenaRect.width - radius - padding;
  const minY = radius + padding;
  const maxY = arenaRect.height - radius - padding;

  if (maxX <= minX || maxY <= minY) return;

  const posX = minX + Math.random() * (maxX - minX);
  const posY = minY + Math.random() * (maxY - minY);

  // Calculate target lifespan based on type and current difficulty
  const lifespan = Math.round(
    targetType.baseLifespan - difficulty.progress * (targetType.baseLifespan - targetType.minLifespan)
  );

  // Create DOM Element
  const targetId = `target-${++gameState.targetCounter}`;
  const targetEl = document.createElement('div');
  targetEl.className = `target target-${targetType.type}`;
  targetEl.id = targetId;
  targetEl.style.width = `${targetSize}px`;
  targetEl.style.height = `${targetSize}px`;
  targetEl.style.left = `${posX}px`;
  targetEl.style.top = `${posY}px`;

  // Internal visual rings & lifespan countdown SVG
  const circumference = 2 * Math.PI * (radius - 4);
  targetEl.innerHTML = `
    <svg class="target-timer-svg" viewBox="0 0 ${targetSize} ${targetSize}">
      <circle class="target-timer-circle"
        cx="${radius}" cy="${radius}" r="${radius - 4}"
        stroke-dasharray="${circumference}"
        stroke-dashoffset="0"
        style="transition: stroke-dashoffset ${lifespan}ms linear;"
      />
    </svg>
    <div class="target-inner-ring"></div>
    <div class="target-core">${targetType.type === 'bonus' ? '★' : targetType.type === 'danger' ? '✕' : ''}</div>
  `;

  // Handle Target Interaction (Click/Touch)
  targetEl.addEventListener('pointerdown', (e) => {
    e.stopPropagation(); // Prevents triggering arena background miss
    handleTargetClick(e, targetId);
  });

  DOM.targetsLayer.appendChild(targetEl);

  // Trigger SVG ring animation in next frame
  requestAnimationFrame(() => {
    const circle = targetEl.querySelector('.target-timer-circle');
    if (circle) {
      circle.style.strokeDashoffset = `${circumference}`;
    }
  });

  // Schedule target expiration/despawn if not clicked
  const timeoutId = setTimeout(() => {
    handleTargetTimeout(targetId);
  }, lifespan);

  // Store in active targets map
  gameState.activeTargets.set(targetId, {
    element: targetEl,
    timeoutId,
    spawnTime: performance.now(),
    type: targetType,
    posX,
    posY
  });
}

/**
 * Handles target expiration when the player fails to click it before it vanishes.
 */
function handleTargetTimeout(targetId) {
  const targetData = gameState.activeTargets.get(targetId);
  if (!targetData) return;

  const { element, type } = targetData;

  // Remove from tracking
  gameState.activeTargets.delete(targetId);

  // Danger targets expiring naturally is a GOOD thing (player avoided it!)
  // Non-danger targets expiring breaks the combo chain
  if (type.type !== 'danger' && gameState.combo > 0) {
    updateCombo(false, false);
    updateStatsUI();
  }

  // Play vanish animation then remove
  element.classList.add('vanish');
  setTimeout(() => {
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }
  }, 220);
}

// ============================================================================
// CLICK & HIT HANDLING
// ============================================================================
/**
 * Handles player clicking on an active target.
 */
function handleTargetClick(e, targetId) {
  if (!gameState.isPlaying) return;

  const targetData = gameState.activeTargets.get(targetId);
  if (!targetData) return;

  const { element, timeoutId, spawnTime, type, posX, posY } = targetData;

  // Clear despawn timer and remove from map immediately
  clearTimeout(timeoutId);
  gameState.activeTargets.delete(targetId);

  // Record reaction time (ms)
  const clickReactionTime = Math.round(performance.now() - spawnTime);
  if (type.type !== 'danger') {
    if (gameState.bestReactionTime === null || clickReactionTime < gameState.bestReactionTime) {
      gameState.bestReactionTime = clickReactionTime;
    }
  }

  // Register shot
  gameState.totalShots++;

  if (type.type === 'danger') {
    // Player clicked DANGER target: penalty & combo break!
    handleDangerHit(posX, posY);
  } else {
    // Successful hit!
    handleSuccessHit(type, posX, posY);
  }

  // Animate target pop and remove
  element.classList.add('hit-pop');
  setTimeout(() => {
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }
  }, 200);

  // Spawn an immediate replacement if none left
  if (gameState.activeTargets.size === 0) {
    spawnTarget();
  }
}

/**
 * Handles successful target hit (Normal, Fast, Bonus).
 */
function handleSuccessHit(type, x, y) {
  gameState.targetsHit++;
  updateCombo(true, false);

  const multiplier = getComboMultiplier();
  const earnedPoints = calculateScore(type.points, multiplier);
  gameState.score += earnedPoints;

  // Sound effects
  if (type.type === 'normal') sfx.playNormalHit();
  else if (type.type === 'fast') sfx.playFastHit();
  else if (type.type === 'bonus') sfx.playBonusHit();

  // Visual effects
  createFloatingText(`+${earnedPoints}`, x, y, type.type);
  createSparkParticles(x, y, type.color, 9);
  bumpScoreAnimation();

  updateStatsUI();
}

/**
 * Handles accidental click on DANGER target.
 */
function handleDangerHit(x, y) {
  updateCombo(false, true); // Reset combo

  const penalty = Math.abs(CONFIG.TARGET_TYPES.danger.points);
  gameState.score = Math.max(0, gameState.score - penalty);

  sfx.playDangerHit();

  // Arena shake & red flash
  triggerArenaShake();
  createFloatingText(`-${penalty} DANGER!`, x, y, 'danger');
  createSparkParticles(x, y, '#ff0055', 12);
  bumpScoreAnimation();

  updateStatsUI();
}

/**
 * Handles clicks on the empty arena floor (Miss).
 */
function handleArenaPointerDown(e) {
  if (!gameState.isPlaying) return;

  // Register miss shot
  gameState.totalShots++;
  updateCombo(false, false); // Resets combo

  sfx.playMissSound();

  // Coordinates relative to arena
  const arenaRect = DOM.gameArena.getBoundingClientRect();
  const x = e.clientX - arenaRect.left;
  const y = e.clientY - arenaRect.top;

  createMissRipple(x, y);
  createFloatingText('MISS', x, y, 'miss');

  updateStatsUI();
}

// ============================================================================
// SCORING, COMBO & STATS MANAGEMENT
// ============================================================================
/**
 * Calculates earned points with combo multiplier.
 */
function calculateScore(basePoints, multiplier) {
  return Math.round(basePoints * multiplier);
}

/**
 * Returns multiplier based on current combo streak:
 * 1-4 hits: 1.0x
 * 5-9 hits: 1.5x
 * 10-14 hits: 2.0x
 * 15-19 hits: 2.5x
 * 20+ hits: 3.0x
 */
function getComboMultiplier() {
  if (gameState.combo >= 20) return 3.0;
  if (gameState.combo >= 15) return 2.5;
  if (gameState.combo >= 10) return 2.0;
  if (gameState.combo >= 5)  return 1.5;
  return 1.0;
}

/**
 * Manages combo streak updates.
 */
function updateCombo(isHit, isDanger) {
  if (isHit) {
    gameState.combo++;
    if (gameState.combo > gameState.maxCombo) {
      gameState.maxCombo = gameState.combo;
    }
  } else {
    // Reset combo on miss, danger, or missed targets
    gameState.combo = 0;
  }
}

/**
 * Calculates current accuracy percentage.
 */
function calculateAccuracy() {
  if (gameState.totalShots === 0) return 100;
  const accuracy = Math.round((gameState.targetsHit / gameState.totalShots) * 100);
  return Math.min(100, Math.max(0, accuracy));
}

/**
 * Synchronizes stats to the HUD UI.
 */
function updateStatsUI() {
  DOM.hudScore.textContent = gameState.score.toLocaleString();
  DOM.hudCombo.textContent = gameState.combo.toString();

  const multiplier = getComboMultiplier();
  DOM.hudMultiplier.textContent = `x${multiplier.toFixed(1)}`;

  // Highlight combo badge at higher levels
  if (multiplier >= 2.0) {
    DOM.hudMultiplier.classList.add('combo-hot');
  } else {
    DOM.hudMultiplier.classList.remove('combo-hot');
  }

  DOM.hudAccuracy.textContent = `${calculateAccuracy()}%`;
}

/**
 * Updates timer text and progress bar.
 */
function updateTimer() {
  updateTimerUI();

  // Warning state during final 5 seconds
  const timerCard = document.querySelector('.timer-card');
  if (gameState.timeRemaining <= 5.0) {
    if (!timerCard.classList.contains('danger')) {
      timerCard.classList.add('danger');
    }
  } else {
    timerCard.classList.remove('danger');
  }
}

function updateTimerUI() {
  const seconds = Math.max(0, gameState.timeRemaining);
  DOM.hudTimer.textContent = `${seconds.toFixed(1)}s`;

  const percent = (seconds / CONFIG.GAME_DURATION) * 100;
  DOM.timerBar.style.width = `${Math.max(0, Math.min(100, percent))}%`;
}

// ============================================================================
// VISUAL FX (Floating Text, Sparks, Arena Shake)
// ============================================================================
function createFloatingText(text, x, y, typeClass) {
  const el = document.createElement('div');
  el.className = `floating-text ${typeClass}`;
  el.textContent = text;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;

  DOM.fxLayer.appendChild(el);

  setTimeout(() => {
    if (el.parentNode) el.parentNode.removeChild(el);
  }, 780);
}

function createSparkParticles(x, y, color, count = 8) {
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'spark-particle';
    p.style.backgroundColor = color;
    p.style.boxShadow = `0 0 6px ${color}`;
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;

    // Random radial trajectory
    const angle = Math.random() * Math.PI * 2;
    const distance = 25 + Math.random() * 45;
    const tx = `${Math.cos(angle) * distance}px`;
    const ty = `${Math.sin(angle) * distance}px`;
    p.style.setProperty('--tx', tx);
    p.style.setProperty('--ty', ty);

    DOM.fxLayer.appendChild(p);

    setTimeout(() => {
      if (p.parentNode) p.parentNode.removeChild(p);
    }, 520);
  }
}

function createMissRipple(x, y) {
  const ripple = document.createElement('div');
  ripple.className = 'miss-ripple';
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;

  DOM.fxLayer.appendChild(ripple);

  setTimeout(() => {
    if (ripple.parentNode) ripple.parentNode.removeChild(ripple);
  }, 420);
}

function triggerArenaShake() {
  DOM.gameArena.classList.remove('arena-shake', 'arena-flash-danger');
  // Trigger reflow to restart animations
  void DOM.gameArena.offsetWidth;
  DOM.gameArena.classList.add('arena-shake', 'arena-flash-danger');

  setTimeout(() => {
    DOM.gameArena.classList.remove('arena-shake', 'arena-flash-danger');
  }, 400);
}

function bumpScoreAnimation() {
  DOM.hudScore.classList.remove('score-bump');
  void DOM.hudScore.offsetWidth;
  DOM.hudScore.classList.add('score-bump');
}

// ============================================================================
// GAME OVER & CLEANUP
// ============================================================================
/**
 * Ends the 30-second game session and presents results.
 */
function endGame() {
  gameState.isPlaying = false;

  // Clear timers
  clearInterval(gameState.gameTimerInterval);
  clearTimeout(gameState.spawnTimerTimeout);

  // Clear all remaining active targets
  clearAllActiveTargets();

  // Play fanfare
  sfx.playGameOverFanfare();

  // Check and save high score
  const isNewHighScore = saveHighScore();

  // Populate results modal
  DOM.resultsScore.textContent = gameState.score.toLocaleString();
  DOM.resultsHits.textContent = gameState.targetsHit.toLocaleString();
  DOM.resultsAccuracy.textContent = `${calculateAccuracy()}%`;
  DOM.resultsReaction.textContent = gameState.bestReactionTime !== null ? `${gameState.bestReactionTime} ms` : '—';
  DOM.resultsMaxCombo.textContent = gameState.maxCombo.toString();
  DOM.resultsHighScore.textContent = gameState.highScore.toLocaleString();

  // High score banner toggle
  if (isNewHighScore && gameState.score > 0) {
    DOM.newRecordBadge.classList.remove('hidden');
    DOM.defaultBadge.classList.add('hidden');
  } else {
    DOM.newRecordBadge.classList.add('hidden');
    DOM.defaultBadge.classList.remove('hidden');
  }

  // Show Game Over Screen
  DOM.gameOverScreen.classList.add('active');
}

function clearAllActiveTargets() {
  gameState.activeTargets.forEach((data) => {
    clearTimeout(data.timeoutId);
    if (data.element && data.element.parentNode) {
      data.element.parentNode.removeChild(data.element);
    }
  });
  gameState.activeTargets.clear();
}

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
