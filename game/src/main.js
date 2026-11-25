// Dapur Kilat — entry point.
// Wires the canvas, the game loop and the input API together. The rules
// live in orders.js, the drawing in kitchen.js, the sounds in audio.js.
// With ?shot=<name> in the URL the game stages one frozen scene instead
// of playing (see shots.js).

import { createState, addIngredient, clearPlate, serve, tick, resetRun, matchedOrder, spawnPopup } from './orders.js';
import { render, W, H } from './kitchen.js';
import { attachInput } from './input.js';
import { parseShot, stageShot } from './shots.js';
import { mulberry32 } from './rng.js';
import {
  initAudio, playChop, playSizzle, playServe, playReady, playLevelUp,
  playExpire, playWrong, playClick, playGameOver, playShiftDone,
  setMuted, isMuted,
} from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = W;
canvas.height = H;

// The session RNG: time-seeded for real play, replaced by the shot's seed
// when a screenshot is staged.
const state = createState(mulberry32((Date.now() % 2147483647) >>> 0));
state.shiftsDone = 0;

// Last whole second shown per order, for the urgent ticking sound.
const lastTick = new Map();

function tickSounds() {
  for (const order of state.orders) {
    if (order.timeLeft > 5) continue;
    const whole = Math.ceil(order.timeLeft);
    if (lastTick.get(order.id) !== whole) {
      lastTick.set(order.id, whole);
      playClick();
    }
  }
}

// The actions input.js calls. Each answers at once: a sound, a popup, a
// message — the click must feel like it did something.
const api = {
  onGesture() {
    initAudio();
  },
  start() {
    initAudio();
    playClick();
    resetRun(state);
  },
  restart() {
    initAudio();
    playClick();
    resetRun(state);
  },
  addIngredient(id) {
    if (state.mode !== 'playing') return;
    initAudio();
    if (addIngredient(state, id)) {
      playChop();
      if (state.plate.length >= 2) playSizzle();
      if (matchedOrder(state)) {
        state.servePulse = 1;
        playReady();
      }
    } else {
      playWrong();
    }
  },
  serve() {
    if (state.mode !== 'playing') return;
    initAudio();
    const result = serve(state);
    if (!result.ok) {
      if (result.reason === 'mismatch') playWrong();
      else playClick();
      return;
    }
    playServe();
    spawnPopup(state, 'text', 640, 400, `+${result.gained}`, '#ffd34d', 30);
    spawnPopup(state, 'coin', 700, 420, '', '#ffd34d', 30);
    if (result.leveled) {
      playLevelUp();
      spawnPopup(state, 'text', 640, 330, `LEVEL ${state.level}!`, '#7dff8a', 28);
    }
  },
  clearPlate() {
    if (state.mode !== 'playing') return;
    initAudio();
    clearPlate(state);
    playClick();
  },
  toggleMute() {
    setMuted(!isMuted());
  },
};

attachInput(canvas, () => state, api);

// Debug/testing handle: lets a play-test read the state and drive the
// game (start, add, serve) without poking at module internals.
window.__dapur = { state, api };

// ---- screenshot mode: stage one scene, render one frozen frame ----
const shot = parseShot();
if (shot) {
  document.body.classList.add('shot');
  stageShot(state, shot.name, shot.seed);
  render(ctx, state);
} else {
  // ---- normal play: requestAnimationFrame loop ----
  let last = performance.now();
  let shiftNoted = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (state.mode === 'playing') {
      const shiftsBefore = state.shiftsDone;
      const outcome = tick(state, dt);
      if (state.shiftsDone > shiftsBefore && state.shiftsDone !== shiftNoted) {
        shiftNoted = state.shiftsDone;
        playShiftDone();
      }
      if (outcome === 'expired') playExpire();
      if (outcome === 'gameover') playGameOver();
      tickSounds();
    } else {
      // Title and game-over screens still animate (mascot bob, blinking).
      state.time += dt;
    }
    render(ctx, state);
    requestAnimationFrame(frame);
  }
  render(ctx, state);
  requestAnimationFrame(frame);
}
