// Screenshot staging for Dapur Kilat.
// The game reads ?shot=<name>&seed=<n>. When a shot is present, this module
// builds that exact scene deterministically (seeded RNG, fixed numbers) and
// the main loop renders one frozen frame instead of ticking, so the shot
// is stable shot after shot.

import { mulberry32, seedFromString } from './rng.js';
import { orderLifetime } from './orders.js';

// Read the shot request from the URL, or null when playing normally.
export function parseShot() {
  const params = new URLSearchParams(window.location.search);
  const name = params.get('shot');
  if (!name) return null;
  return { name, seed: params.get('seed') ?? '1' };
}

// One order entry for a staged scene: dish, seconds left, and the level
// whose lifetime it belongs to (so the timer bar fraction looks right).
function stagedOrder(id, dishId, timeLeft, level) {
  return { id, dishId, timeLeft, timeMax: orderLifetime(level) };
}

// Build the requested scene into the state. Unknown names fall back to a
// plain mid-game scene so a bad query never shows a broken screen.
export function stageShot(state, name, seedText) {
  state.rng = mulberry32(seedFromString(`${seedText}:${name}`));
  state.mode = 'playing';
  state.time = 2.5; // fixed phase: every pulse and bob is deterministic
  state.plate = [];
  state.orders = [];
  state.banner = null;
  state.message = '';
  state.messageTimer = 0;
  state.shake = 0;
  state.particles = [];

  if (name === 'kitchen') {
    // COVER: attract screen over the full kitchen — two orders live,
    // bins full, empty plate, shift timer visible, title on top.
    state.mode = 'attract';
    state.score = 0;
    state.coins = 12;
    state.hearts = 3;
    state.level = 1;
    state.serves = 0;
    state.combo = 0;
    state.shiftLeft = 167;
    state.orders = [
      stagedOrder(1, 'nasi-goreng', 32, 1),
      stagedOrder(2, 'ayam-goreng', 20, 1),
    ];
    return;
  }

  if (name === 'assembly') {
    // Mid-game: the plate holds 2 of 4 ingredients for the highlighted
    // order, its ticket is first on the board, timer mid-countdown.
    state.score = 150;
    state.coins = 18;
    state.hearts = 3;
    state.level = 1;
    state.serves = 2;
    state.combo = 1;
    state.comboLeft = 3;
    state.shiftLeft = 143;
    state.orders = [
      stagedOrder(1, 'nasi-goreng', 22, 1),
      stagedOrder(2, 'sayur-tumis', 31, 1),
    ];
    state.plate = ['nasi', 'telur'];
    return;
  }

  if (name === 'serve') {
    // The plate is complete and matches the live order: its ticket glows
    // green, the SERVE button pulses, "SIAP DISAJIKAN!" shows.
    state.score = 350;
    state.coins = 26;
    state.hearts = 3;
    state.level = 2;
    state.serves = 5;
    state.combo = 2;
    state.comboLeft = 4;
    state.shiftLeft = 121;
    state.orders = [stagedOrder(1, 'nasi-goreng', 28, 2)];
    state.plate = ['nasi', 'telur', 'cabai', 'kecap'];
    return;
  }

  if (name === 'rush') {
    // The rush: three orders live, one timer nearly empty (red), a high
    // score and a x3 combo burning.
    state.score = 1250;
    state.coins = 64;
    state.hearts = 2;
    state.level = 3;
    state.serves = 12;
    state.combo = 3;
    state.comboLeft = 5;
    state.shiftLeft = 42;
    state.orders = [
      stagedOrder(1, 'ayam-goreng', 4, 3),
      stagedOrder(2, 'nasi-ayam', 18, 3),
      stagedOrder(3, 'sayur-tumis', 27, 3),
    ];
    state.plate = ['ayam', 'kecap'];
    return;
  }

  // Unknown shot name: a plain mid-game scene.
  state.score = 80;
  state.coins = 10;
  state.hearts = 3;
  state.level = 1;
  state.serves = 1;
  state.shiftLeft = 150;
  state.orders = [stagedOrder(1, 'telur-dadar', 30, 1)];
  state.plate = ['telur'];
}
