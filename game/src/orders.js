// Orders, scoring and the shift clock for Dapur Kilat.
// This module owns the rules; kitchen.js only draws what it returns.

import { DISHES, DISH_BY_ID, INGREDIENT_BY_ID, dishForPlate, sameMultiset } from './recipes.js';
import { pick } from './rng.js';

export const MAX_ACTIVE_ORDERS = 3;
export const MAX_PLATE = 4;
export const MAX_HEARTS = 3;
export const SHIFT_LENGTH = 180; // seconds per shift
export const COMBO_WINDOW = 6; // seconds between serves to keep a combo
export const SERVES_PER_LEVEL = 5;

// A fresh game state. `rng` is the session generator (seeded in shot mode).
export function createState(rng) {
  return {
    rng,
    mode: 'title', // 'title' | 'playing' | 'gameover'
    time: 0,
    score: 0,
    coins: 0,
    hearts: MAX_HEARTS,
    level: 1,
    serves: 0,
    combo: 0,
    bestCombo: 0,
    comboLeft: 0,
    dishesServed: 0,
    ordersExpired: 0,
    shiftLeft: SHIFT_LENGTH,
    shiftsDone: 0,
    spawnIn: 1.5, // first order arrives quickly
    orders: [],
    plate: [],
    message: '',
    messageTimer: 0,
    banner: null, // { text, sub, timer }
    shake: 0,
    nextOrderId: 1,
    flashBin: null, // ingredient id that just got added (button pop)
    flashTimer: 0,
    servePulse: 0, // 0..1, makes the SERVE button glow when ready
    particles: [], // floating score texts and coin pops {x,y,vy,text?,kind,life,maxLife,size,color}
  };
}

// Add a floating popup (score text or a coin) at canvas coordinates.
export function spawnPopup(state, kind, x, y, text = '', color = '#ffd34d', size = 26) {
  state.particles.push({ kind, x, y, vy: -46, text, color, size, life: 1.1, maxLife: 1.1 });
}

// Rise and fade the popups; dead ones are dropped.
export function tickParticles(state, dt) {
  for (const p of state.particles) {
    p.y += p.vy * dt;
    p.vy *= 0.96;
    p.life -= dt;
  }
  state.particles = state.particles.filter((p) => p.life > 0);
}

// How long an order lives at the current level (seconds).
export function orderLifetime(level) {
  return Math.max(25, 45 - (level - 1) * 3);
}

// How often a new order spawns at the current level (seconds).
export function spawnInterval(level) {
  return Math.max(7, 12 - (level - 1) * 1.2);
}

// Spawn one order. Early levels favour the easy two-ingredient dishes.
export function spawnOrder(state) {
  const pool = state.level === 1 ? DISHES.filter((d) => d.needs.length <= 3) : DISHES;
  const dish = pick(state.rng, pool);
  const lifetime = orderLifetime(state.level);
  state.orders.push({
    id: state.nextOrderId++,
    dishId: dish.id,
    timeLeft: lifetime,
    timeMax: lifetime,
  });
}

// The active order whose dish exactly matches the plate, or null.
export function matchedOrder(state) {
  const dish = dishForPlate(state.plate);
  if (!dish) return null;
  return state.orders.find((o) => o.dishId === dish.id) ?? null;
}

// Add one ingredient to the plate. Returns false when the plate is full.
export function addIngredient(state, ingredientId) {
  if (state.mode !== 'playing') return false;
  if (state.plate.length >= MAX_PLATE) {
    setMessage(state, 'Piring penuh! Sajikan atau buang dulu.');
    return false;
  }
  state.plate.push(ingredientId);
  state.flashBin = ingredientId;
  state.flashTimer = 0.18;
  return true;
}

// Empty the plate.
export function clearPlate(state) {
  state.plate = [];
}

// Serve the plate. Returns an object describing what happened so the
// caller can play the right sound and show the right message.
export function serve(state) {
  if (state.mode !== 'playing') return { ok: false, reason: 'not-playing' };
  if (state.plate.length === 0) {
    setMessage(state, 'Piring kosong — tambah bahan dulu!');
    return { ok: false, reason: 'empty' };
  }
  const order = matchedOrder(state);
  if (!order) {
    state.score = Math.max(0, state.score - 10);
    state.shake = 0.35;
    state.combo = 0;
    state.comboLeft = 0;
    clearPlate(state);
    setMessage(state, 'Salah! Tidak ada pesanan yang cocok.');
    return { ok: false, reason: 'mismatch' };
  }
  const dish = DISH_BY_ID[order.dishId];
  // Combo: serving again inside the window raises the multiplier.
  state.combo = state.comboLeft > 0 ? state.combo + 1 : 1;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  state.comboLeft = COMBO_WINDOW;
  const multiplier = Math.min(3, state.combo);
  const timeBonus = Math.round(order.timeLeft * 2);
  const gained = (dish.points + timeBonus) * multiplier;
  state.score += gained;
  state.coins += dish.coins + (multiplier - 1) * 2;
  state.serves += 1;
  state.dishesServed += 1;
  state.orders = state.orders.filter((o) => o.id !== order.id);
  clearPlate(state);
  state.banner = {
    text: `+${gained}  ${dish.name} tersaji!`,
    sub: multiplier > 1 ? `Kombo x${multiplier} 🔥` : 'Enak! Pelanggan senang.',
    timer: 1.4,
  };
  state.servePulse = 0;
  const leveled = state.serves % SERVES_PER_LEVEL === 0;
  if (leveled) state.level += 1;
  return { ok: true, dish, gained, multiplier, leveled };
}

// Advance timers by dt seconds. Handles order expiry, combo decay, the
// shift clock and spawning. Returns 'gameover' when the last heart is lost.
export function tick(state, dt) {
  state.time += dt;
  tickParticles(state, dt);
  if (state.flashTimer > 0) state.flashTimer -= dt;
  if (state.messageTimer > 0) state.messageTimer -= dt;
  if (state.banner && (state.banner.timer -= dt) <= 0) state.banner = null;
  if (state.shake > 0) state.shake -= dt;
  if (state.servePulse > 0) state.servePulse -= dt;
  if (state.comboLeft > 0) {
    state.comboLeft -= dt;
    if (state.comboLeft <= 0) state.combo = 0;
  }

  // Shift clock: surviving a full shift pays a bonus and starts a new one.
  state.shiftLeft -= dt;
  if (state.shiftLeft <= 0) {
    state.shiftLeft += SHIFT_LENGTH;
    state.shiftsDone += 1;
    const bonus = 250 + state.shiftsDone * 100;
    state.score += bonus;
    state.banner = { text: `Shift selesai! +${bonus}`, sub: 'Kamu bertahan satu shift penuh.', timer: 1.8 };
  }

  // Orders tick down; an expired order costs a heart.
  let expired = null;
  for (const order of state.orders) {
    order.timeLeft -= dt;
    if (order.timeLeft <= 0 && !expired) expired = order;
  }
  if (expired) {
    state.orders = state.orders.filter((o) => o.id !== expired.id);
    state.hearts -= 1;
    state.ordersExpired += 1;
    state.combo = 0;
    state.comboLeft = 0;
    state.shake = 0.4;
    const dish = DISH_BY_ID[expired.dishId];
    setMessage(state, `Pesanan ${dish.name} hangus! -1 ❤️`);
    if (state.hearts <= 0) {
      state.mode = 'gameover';
      return 'gameover';
    }
    return 'expired';
  }

  // Spawning.
  state.spawnIn -= dt;
  if (state.spawnIn <= 0) {
    if (state.orders.length < MAX_ACTIVE_ORDERS) spawnOrder(state);
    state.spawnIn = spawnInterval(state.level);
  }
  return 'ok';
}

export function setMessage(state, text) {
  state.message = text;
  state.messageTimer = 3;
}

// The hint line: what the highlighted (first) order still needs, given
// the plate. Returns a plain string for the bottom bar.
export function hintText(state) {
  if (state.orders.length === 0) return 'Tunggu pesanan masuk…';
  const order = state.orders[0];
  const dish = DISH_BY_ID[order.dishId];
  if (state.plate.length === 0) {
    return `Pesanan: ${dish.name} — butuh ${dish.needs.map((id) => INGREDIENT_BY_ID[id].name).join(', ')}`;
  }
  if (sameMultiset(state.plate, dish.needs)) return `${dish.name} SIAP! Tekan Space / SERVE.`;
  const missing = [];
  const counts = new Map();
  for (const id of dish.needs) counts.set(id, (counts.get(id) ?? 0) + 1);
  for (const id of state.plate) counts.set(id, (counts.get(id) ?? 0) - 1);
  for (const [id, n] of counts) if (n > 0) missing.push(INGREDIENT_BY_ID[id].name);
  if (missing.length === 0) return 'Kombinasi ini bukan pesanan yang aktif — tekan X untuk buang.';
  return `${dish.name} masih butuh: ${missing.join(', ')}`;
}

// Format seconds as M:SS for the shift timer.
export function formatClock(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// Restart a run after game over (or from the title): keep the RNG, reset
// everything else, and deal the first order quickly.
export function resetRun(state) {
  const fresh = createState(state.rng);
  Object.assign(state, fresh, { mode: 'playing' });
  state.message = 'Shift baru! Masak cepat, sajikan tepat.';
  state.messageTimer = 3;
}

// The fraction of an order's time left (1 = fresh, 0 = about to burn).
export function orderUrgency(order) {
  return Math.max(0, Math.min(1, order.timeLeft / order.timeMax));
}
