// All rendering for Dapur Kilat: the kitchen, order board, bins, plate,
// HUD, title and game-over screens. Everything is drawn on one canvas
// (1280x720) with flat warm colours, a red-check accent and a little chef
// mascot. No images, no fonts to load — system type and emoji only.

import { INGREDIENTS, INGREDIENT_BY_ID, DISH_BY_ID, DISHES } from './recipes.js';
import { matchedOrder, hintText, formatClock, orderUrgency } from './orders.js';

export const W = 1280;
export const H = 720;

// ---- palette: warm wood, cream walls, red-check accents ----
const C = {
  wall: '#f6ead1',
  wallShade: '#eed9ae',
  wood: '#a96f3c',
  woodDark: '#7a4c26',
  woodLight: '#c08a4e',
  board: '#2e2015',
  boardEdge: '#4a3220',
  cream: '#fff8e7',
  paper: '#fffdf4',
  ink: '#2e2015',
  inkSoft: '#6b543a',
  red: '#d94f3d',
  redDark: '#a82e20',
  green: '#43a047',
  greenDark: '#2e7d32',
  gold: '#f2b705',
  ticket: '#fff8e7',
};

export const MAX_SLOTS = 3;

// ---- layout ----
export const LAYOUT = {
  tickets: [
    { x: 16, y: 10, w: 272, h: 72 },
    { x: 300, y: 10, w: 272, h: 72 },
    { x: 584, y: 10, w: 272, h: 72 },
  ],
  hud: { x: 880, y: 8, w: 384, h: 76 },
  bins: INGREDIENTS.map((ing, i) => ({ x: 40 + i * 202, y: 196, w: 190, h: 148, ingredientId: ing.id })),
  plate: { x: 640, y: 438 },
  serve: { x: 90, y: 548, w: 250, h: 76 },
  clear: { x: 360, y: 558, w: 160, h: 56 },
};

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, weight = 'bold', align = 'left', font = 'system-ui, sans-serif') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

// ---- the kitchen shell: wall, check strip, wooden counter ----
function drawShell(ctx, state) {
  // Cream wall with a soft vignette.
  ctx.fillStyle = C.wall;
  ctx.fillRect(0, 0, W, H);
  const wallGrad = ctx.createLinearGradient(0, 92, 0, 520);
  wallGrad.addColorStop(0, C.wall);
  wallGrad.addColorStop(1, C.wallShade);
  ctx.fillStyle = wallGrad;
  ctx.fillRect(0, 92, W, 428);

  // Red-check tile strip above the counter (the kitchen's signature).
  const stripY = 128;
  const cell = 24;
  for (let x = 0; x < W; x += cell) {
    ctx.fillStyle = (x / cell) % 2 === 0 ? C.red : '#fff8e7';
    ctx.fillRect(x, stripY, cell, 22);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  ctx.fillRect(0, stripY + 22, W, 3);

  // Wooden counter top with a highlight edge.
  const woodGrad = ctx.createLinearGradient(0, 152, 0, 196);
  woodGrad.addColorStop(0, C.woodLight);
  woodGrad.addColorStop(0.5, C.wood);
  woodGrad.addColorStop(1, C.woodDark);
  ctx.fillStyle = woodGrad;
  ctx.fillRect(0, 152, W, 44);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(0, 152, W, 4);

  // Counter front: vertical wood panels.
  ctx.fillStyle = C.woodDark;
  ctx.fillRect(0, 196, W, 324);
  for (let x = 0; x < W; x += 128) {
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(x, 196, 3, 324);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(x + 3, 196, 10, 324);
  }

  // Bottom action bar: darker wood.
  ctx.fillStyle = '#3a2413';
  ctx.fillRect(0, 520, W, 200);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(0, 520, W, 3);

  // Top order board: dark chalkboard bar.
  ctx.fillStyle = C.board;
  ctx.fillRect(0, 0, W, 92);
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(0, 88, W, 4);
}

// ---- one order ticket ----
function drawTicket(ctx, order, slot, state, highlight) {
  const box = LAYOUT.tickets[slot];
  const dish = DISH_BY_ID[order.dishId];
  const urg = orderUrgency(order);
  const urgent = order.timeLeft <= 5;
  const t = state.time;
  const pulse = urgent ? 0.5 + 0.5 * Math.sin(t * 9) : 0;

  ctx.save();
  if (highlight) {
    ctx.shadowColor = '#7dff8a';
    ctx.shadowBlur = 22 + 8 * Math.sin(t * 6);
  } else if (urgent) {
    ctx.shadowColor = `rgba(255,60,40,${0.5 + 0.5 * pulse})`;
    ctx.shadowBlur = 16;
  }
  ctx.fillStyle = C.ticket;
  rr(ctx, box.x, box.y, box.w, box.h, 12);
  ctx.fill();
  ctx.restore();

  // Border: green when ready, red pulsing when urgent, wood otherwise.
  ctx.lineWidth = highlight ? 4 : urgent ? 3 : 2;
  ctx.strokeStyle = highlight
    ? '#2e7d32'
    : urgent
      ? `rgba(217,47,32,${0.6 + 0.4 * pulse})`
      : '#c9a06a';
  rr(ctx, box.x, box.y, box.w, box.h, 12);
  ctx.stroke();

  // Dish emoji + name.
  text(ctx, dish.emoji, box.x + 26, box.y + 24, 30, C.ink, 'bold', 'center');
  text(ctx, dish.name, box.x + 48, box.y + 20, 19, C.ink);
  // Required ingredient icons.
  let ix = box.x + 48;
  for (const id of dish.needs) {
    text(ctx, INGREDIENT_BY_ID[id].emoji, ix + 12, box.y + 48, 22, C.ink, 'bold', 'center');
    ix += 28;
  }
  // Countdown: bar + seconds, right-aligned inside the ticket.
  const barX = box.x + 168;
  const barW = 52;
  const barY = box.y + 44;
  ctx.fillStyle = '#e5d9bd';
  rr(ctx, barX, barY, barW, 12, 6);
  ctx.fill();
  const frac = Math.max(0, urg);
  ctx.fillStyle = frac > 0.5 ? '#43a047' : frac > 0.25 ? '#f2b705' : '#d94f3d';
  if (frac > 0.02) {
    rr(ctx, barX, barY, Math.max(8, barW * frac), 12, 6);
    ctx.fill();
  }
  text(ctx, `${Math.ceil(order.timeLeft)}s`, box.x + box.w - 8, barY + 6, 15, urgent ? '#d94f3d' : C.inkSoft, 'bold', 'right');
  if (urgent) text(ctx, '!', box.x + box.w - 14, box.y + 16, 22, '#d94f3d');
  if (highlight) text(ctx, '✓ SIAP', box.x + box.w - 8, box.y + 16, 13, '#2e7d32', 'bold', 'right');
}

// Empty ticket slot.
function drawEmptySlot(ctx, slot) {
  const box = LAYOUT.tickets[slot];
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = 'rgba(255,248,231,0.12)';
  rr(ctx, box.x, box.y, box.w, box.h, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,248,231,0.35)';
  ctx.setLineDash([6, 6]);
  ctx.lineWidth = 2;
  rr(ctx, box.x, box.y, box.w, box.h, 12);
  ctx.stroke();
  ctx.restore();
  text(ctx, 'Menunggu pesanan…', box.x + box.w / 2, box.y + box.h / 2, 15, 'rgba(255,248,231,0.6)', 'bold', 'center');
}

// ---- HUD (right side of the top bar) ----
function drawHud(ctx, state) {
  const { x, y } = LAYOUT.hud;
  text(ctx, `⭐ ${state.score}`, x + 8, y + 18, 24, '#ffe9a8');
  text(ctx, `🪙 ${state.coins}`, x + 150, y + 18, 24, '#ffd34d');
  // Hearts.
  let hx = x + 250;
  for (let i = 0; i < 3; i++) {
    text(ctx, i < state.hearts ? '❤️' : '🖤', hx, y + 18, 22, '#fff', 'bold', 'center');
    hx += 30;
  }
  text(ctx, `LV ${state.level}`, x + 8, y + 52, 17, '#fff8e7');
  const shift = `⏱ ${formatClock(state.shiftLeft)}`;
  text(ctx, shift, x + 90, y + 52, 17, state.shiftLeft <= 30 ? '#ffb3a7' : '#d9c9a8');
  // Shift progress bar.
  const barW = 200;
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  rr(ctx, x + 170, y + 46, barW, 10, 5);
  ctx.fill();
  ctx.fillStyle = '#f2b705';
  rr(ctx, x + 170, y + 46, Math.max(6, barW * (state.shiftLeft / 180)), 10, 5);
  ctx.fill();
}

// ---- ingredient bins ----
function drawBins(ctx, state) {
  for (let i = 0; i < INGREDIENTS.length; i++) {
    const ing = INGREDIENTS[i];
    const box = LAYOUT.bins[i];
    const flashing = state.flashBin === ing.id && state.flashTimer > 0;
    const scale = flashing ? 1.06 : 1;
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);
    // Bin body: tinted by the ingredient, wood frame.
    ctx.fillStyle = C.woodDark;
    rr(ctx, box.x - 4, box.y - 4, box.w + 8, box.h + 8, 16);
    ctx.fill();
    ctx.fillStyle = ing.color;
    rr(ctx, box.x, box.y, box.w, box.h, 12);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    rr(ctx, box.x, box.y, box.w, 34, 12);
    ctx.fill();
    // Big emoji, name, key badge.
    text(ctx, ing.emoji, cx, box.y + 62, 58, C.ink, 'bold', 'center');
    text(ctx, ing.name, cx, box.y + 116, 20, C.ink);
    ctx.fillStyle = C.board;
    ctx.beginPath();
    ctx.arc(box.x + 22, box.y + 22, 15, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, ing.key, box.x + 22, box.y + 23, 16, '#fff8e7', 'bold', 'center');
    ctx.restore();
  }
}

// ---- the stove and plate ----
function drawPlateArea(ctx, state) {
  // Stove top: dark slab with two burners.
  ctx.fillStyle = '#241a12';
  rr(ctx, 420, 368, 440, 142, 18);
  ctx.fill();
  ctx.fillStyle = '#3a2c1e';
  ctx.beginPath();
  ctx.ellipse(560, 438, 62, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(720, 438, 62, 20, 0, 0, Math.PI * 2);
  ctx.fill();

  // The plate: white ellipse with a rim and a warm shadow.
  const px = LAYOUT.plate.x;
  const py = LAYOUT.plate.y;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(px, py + 34, 158, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f7f2e7';
  ctx.beginPath();
  ctx.ellipse(px, py, 150, 52, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d9c9a8';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(px, py, 150, 52, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#efe6cf';
  ctx.beginPath();
  ctx.ellipse(px, py, 118, 38, 0, 0, Math.PI * 2);
  ctx.fill();

  // Ingredients on the plate, in a neat row.
  const n = state.plate.length;
  state.plate.forEach((id, i) => {
    const x = px + (i - (n - 1) / 2) * 56;
    const bob = Math.sin(state.time * 3 + i * 1.3) * 2;
    text(ctx, INGREDIENT_BY_ID[id].emoji, x, py + bob, 44, C.ink, 'bold', 'center');
  });

  // Steam wisps while food is on the plate.
  if (n > 0) drawSteam(ctx, px, py - 44, state.time);
  if (n === 0) {
    text(ctx, 'Piring kosong — klik bahan di atas', px, py + 2, 16, '#8a7a5f', 'bold', 'center');
  }
}

function drawSteam(ctx, x, y, t) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  for (let s = 0; s < 3; s++) {
    const sx = x - 44 + s * 44;
    ctx.globalAlpha = 0.35 + 0.2 * Math.sin(t * 2 + s * 2);
    ctx.beginPath();
    for (let k = 0; k <= 8; k++) {
      const yy = y - k * 6;
      const xx = sx + Math.sin(t * 2.2 + s * 1.7 + k * 0.9) * 7;
      if (k === 0) ctx.moveTo(xx, yy);
      else ctx.lineTo(xx, yy);
    }
    ctx.stroke();
  }
  ctx.restore();
}

// ---- action buttons ----
function drawButtons(ctx, state) {
  const ready = matchedOrder(state) !== null;
  const s = LAYOUT.serve;
  const pulse = ready ? 1 + 0.04 * Math.sin(state.time * 7) : 1;
  ctx.save();
  if (ready) {
    ctx.shadowColor = '#7dff8a';
    ctx.shadowBlur = 24 + 10 * Math.sin(state.time * 7);
  }
  const cx = s.x + s.w / 2;
  const cy = s.y + s.h / 2;
  ctx.translate(cx, cy);
  ctx.scale(pulse, pulse);
  ctx.translate(-cx, -cy);
  ctx.fillStyle = ready ? '#2e9e44' : '#57a773';
  rr(ctx, s.x, s.y, s.w, s.h, 16);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  rr(ctx, s.x, s.y, s.w, 26, 16);
  ctx.fill();
  ctx.restore();
  text(ctx, ready ? '✨ SAJIKAN!' : '🍽️ SAJIKAN', s.x + s.w / 2, s.y + 32, 26, '#ffffff', 'bold', 'center');
  text(ctx, 'Space', s.x + s.w / 2, s.y + 60, 14, 'rgba(255,255,255,0.85)', 'bold', 'center');

  const c = LAYOUT.clear;
  ctx.fillStyle = '#b03a2a';
  rr(ctx, c.x, c.y, c.w, c.h, 14);
  ctx.fill();
  text(ctx, '🗑️ BUANG', c.x + c.w / 2, c.y + 22, 19, '#ffffff', 'bold', 'center');
  text(ctx, 'tombol X', c.x + c.w / 2, c.y + 44, 13, 'rgba(255,255,255,0.8)', 'bold', 'center');

  // Combo flame to the right of the clear button (never over a button).
  if (state.combo >= 2) {
    const cb = `🔥 KOMBO x${Math.min(3, state.combo)}`;
    const bx = LAYOUT.clear.x + LAYOUT.clear.w + 20;
    const by = LAYOUT.clear.y;
    ctx.fillStyle = '#ff7a1a';
    const w = 190;
    rr(ctx, bx, by, w, 44, 22);
    ctx.fill();
    text(ctx, cb, bx + w / 2, by + 23, 20, '#fff', 'bold', 'center');
  }
}

// ---- hint + message line, controls, mascot ----
function drawBottom(ctx, state) {
  const hint = hintText(state);
  text(ctx, hint, 640, 652, 19, '#ffe9a8', 'bold', 'center');
  if (state.messageTimer > 0 && state.message) {
    text(ctx, state.message, 640, 682, 16, '#ffb3a7', 'bold', 'center');
  }
  text(ctx, 'Klik bahan atau tekan 1-6  •  Space = sajikan  •  X = buang', 640, 706, 13, '#b09a7a', 'bold', 'center');
  drawMascot(ctx, 1200, 668, 46, state.time);
}

// The little chef mascot: a smiling face in a chef's hat.
export function drawMascot(ctx, x, y, r, t) {
  const bob = Math.sin(t * 2) * 2;
  ctx.save();
  ctx.translate(x, y + bob);
  // Hat: three bumps + band.
  ctx.fillStyle = '#fffdf4';
  ctx.beginPath();
  ctx.arc(-r * 0.55, -r * 0.95, r * 0.42, 0, Math.PI * 2);
  ctx.arc(0, -r * 1.15, r * 0.48, 0, Math.PI * 2);
  ctx.arc(r * 0.55, -r * 0.95, r * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-r * 0.95, -r * 1.05, r * 1.9, r * 0.45);
  // Face.
  ctx.fillStyle = '#ffdbac';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
  ctx.fill();
  // Eyes + smile.
  ctx.fillStyle = '#2e2015';
  ctx.beginPath();
  ctx.arc(-r * 0.3, -r * 0.08, r * 0.09, 0, Math.PI * 2);
  ctx.arc(r * 0.3, -r * 0.08, r * 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2e2015';
  ctx.lineWidth = r * 0.07;
  ctx.beginPath();
  ctx.arc(0, r * 0.12, r * 0.42, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();
  // Red neckerchief.
  ctx.fillStyle = C.red;
  ctx.beginPath();
  ctx.moveTo(-r * 0.5, r * 0.62);
  ctx.lineTo(0, r * 1.05);
  ctx.lineTo(r * 0.5, r * 0.62);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ---- floating score popups ----
function drawParticles(ctx, state) {
  for (const p of state.particles ?? []) {
    const life = Math.max(0, p.life / p.maxLife);
    ctx.save();
    ctx.globalAlpha = life;
    if (p.kind === 'text') {
      text(ctx, p.text, p.x, p.y, p.size, p.color, 'bold', 'center');
    } else if (p.kind === 'coin') {
      text(ctx, '🪙', p.x, p.y, p.size, '#ffd34d', 'bold', 'center');
    }
    ctx.restore();
  }
}

// ---- the "SIAP DISAJIKAN!" banner ----
function drawBanner(ctx, state) {
  if (!state.banner) return;
  const b = state.banner;
  const alpha = Math.min(1, b.timer / 0.4);
  ctx.save();
  ctx.globalAlpha = alpha;
  const bw = 560;
  const bx = (W - bw) / 2;
  const by = 168;
  ctx.fillStyle = 'rgba(46,125,50,0.94)';
  rr(ctx, bx, by, bw, 64, 16);
  ctx.fill();
  ctx.strokeStyle = '#a5d6a7';
  ctx.lineWidth = 3;
  rr(ctx, bx, by, bw, 64, 16);
  ctx.stroke();
  text(ctx, b.text, W / 2, by + 24, 26, '#ffffff', 'bold', 'center');
  if (b.sub) text(ctx, b.sub, W / 2, by + 50, 15, '#dcedc8', 'bold', 'center');
  ctx.restore();
}

// Ready-to-serve callout: a solid green pill above the plate when the
// plate matches an order, so it reads at a glance over the counter.
function drawReadyCallout(ctx, state) {
  if (!matchedOrder(state)) return;
  const pulse = 0.75 + 0.25 * Math.sin(state.time * 7);
  ctx.save();
  ctx.globalAlpha = pulse;
  const pw = 360;
  const ph = 38;
  const px = (W - pw) / 2;
  const py = 338;
  ctx.fillStyle = '#2e7d32';
  rr(ctx, px, py, pw, ph, 19);
  ctx.fill();
  ctx.strokeStyle = '#a5d6a7';
  ctx.lineWidth = 3;
  rr(ctx, px, py, pw, ph, 19);
  ctx.stroke();
  text(ctx, '✓ SIAP DISAJIKAN!', W / 2, py + ph / 2 + 1, 22, '#ffffff', 'bold', 'center');
  ctx.restore();
}

// ---- full playing scene ----
export function drawPlaying(ctx, state) {
  ctx.save();
  if (state.shake > 0) {
    const m = state.shake * 22;
    ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
  }
  drawShell(ctx, state);
  const ready = matchedOrder(state);
  for (let i = 0; i < MAX_SLOTS; i++) {
    const order = state.orders[i];
    if (order) drawTicket(ctx, order, i, state, ready && ready.id === order.id);
    else drawEmptySlot(ctx, i);
  }
  drawHud(ctx, state);
  drawBins(ctx, state);
  drawPlateArea(ctx, state);
  drawReadyCallout(ctx, state);
  drawButtons(ctx, state);
  drawBottom(ctx, state);
  drawBanner(ctx, state);
  drawParticles(ctx, state);
  ctx.restore();
}

// ---- attract mode (cover shot): the live kitchen with a title overlay ----
// No panel — the kitchen shows through a warm dim, so the cover reads as
// a game first and a title second.
export function drawAttract(ctx, state) {
  drawPlaying(ctx, state);
  ctx.fillStyle = 'rgba(30,18,8,0.42)';
  ctx.fillRect(0, 0, W, H);
  // Title ribbon: a red-check band with the game's name, hung above the
  // counter so the bins, the plate and the orders all stay visible.
  const ry = 102;
  const rh = 90;
  ctx.fillStyle = 'rgba(46,32,21,0.9)';
  rr(ctx, 190, ry, 900, rh, 18);
  ctx.fill();
  ctx.strokeStyle = C.gold;
  ctx.lineWidth = 4;
  rr(ctx, 190, ry, 900, rh, 18);
  ctx.stroke();
  for (let x = 0; x < 900; x += 28) {
    ctx.fillStyle = (x / 28) % 2 === 0 ? C.red : '#fff8e7';
    ctx.fillRect(190 + x, ry, 28, 13);
  }
  drawMascot(ctx, 268, ry + 58, 30, state.time);
  text(ctx, '🍳 DAPUR KILAT', 640, ry + 48, 42, '#fff8e7', 'bold', 'center');
  text(ctx, 'Masak cepat, sajikan tepat!', 640, ry + 76, 18, '#ffd34d', 'bold', 'center');
}

// ---- title screen: the kitchen behind a warm welcome panel ----
export function drawTitle(ctx, state) {
  drawPlaying(ctx, state);
  ctx.fillStyle = 'rgba(30,18,8,0.55)';
  ctx.fillRect(0, 0, W, H);
  // Panel.
  const pw = 760;
  const ph = 480;
  const px = (W - pw) / 2;
  const py = (H - ph) / 2 - 10;
  ctx.fillStyle = C.paper;
  rr(ctx, px, py, pw, ph, 24);
  ctx.fill();
  ctx.strokeStyle = C.red;
  ctx.lineWidth = 6;
  rr(ctx, px, py, pw, ph, 24);
  ctx.stroke();
  // Checkered ribbon across the panel top.
  for (let x = 0; x < pw; x += 28) {
    ctx.fillStyle = (x / 28) % 2 === 0 ? C.red : '#fff8e7';
    ctx.fillRect(px + x, py, 28, 20);
  }
  drawMascot(ctx, px + pw / 2, py + 108, 62, state.time);
  text(ctx, '🍳 DAPUR KILAT', px + pw / 2, py + 212, 52, C.ink, 'bold', 'center');
  text(ctx, 'Masak cepat, sajikan tepat — sebelum pelanggan marah!', px + pw / 2, py + 256, 20, C.inkSoft, 'bold', 'center');
  // Mini recipe menu: the five dishes, so the player can plan.
  const menuY = py + 300;
  DISHES.forEach((dish, i) => {
    const x = px + 40 + i * 140;
    ctx.fillStyle = '#fdf3d8';
    rr(ctx, x, menuY, 128, 84, 12);
    ctx.fill();
    text(ctx, dish.emoji, x + 64, menuY + 22, 28, C.ink, 'bold', 'center');
    text(ctx, dish.name, x + 64, menuY + 52, 13, C.ink, 'bold', 'center');
    text(ctx, dish.needs.map((id) => INGREDIENT_BY_ID[id].emoji).join(''), x + 64, menuY + 72, 15, C.ink, 'bold', 'center');
  });
  text(ctx, 'Klik bahan atau tekan 1-6  •  Space = sajikan  •  X = buang', px + pw / 2, py + 424, 16, C.inkSoft, 'bold', 'center');
  const blink = 0.6 + 0.4 * Math.sin(state.time * 4);
  ctx.save();
  ctx.globalAlpha = blink;
  text(ctx, '▶  Tekan Enter / klik untuk mulai', px + pw / 2, py + 456, 22, C.red, 'bold', 'center');
  ctx.restore();
}

// ---- game over screen ----
export function drawGameOver(ctx, state) {
  drawPlaying(ctx, state);
  ctx.fillStyle = 'rgba(30,18,8,0.6)';
  ctx.fillRect(0, 0, W, H);
  const pw = 620;
  const ph = 420;
  const px = (W - pw) / 2;
  const py = (H - ph) / 2;
  ctx.fillStyle = C.paper;
  rr(ctx, px, py, pw, ph, 24);
  ctx.fill();
  ctx.strokeStyle = C.red;
  ctx.lineWidth = 5;
  rr(ctx, px, py, pw, ph, 24);
  ctx.stroke();
  drawMascot(ctx, px + pw / 2, py + 96, 50, state.time);
  text(ctx, '⏰ SHIFT BERAKHIR!', px + pw / 2, py + 176, 36, C.ink, 'bold', 'center');
  text(ctx, 'Dapur tutup — pelanggan sudah pulang.', px + pw / 2, py + 202, 17, C.inkSoft, 'bold', 'center');
  const rows = [
    ['⭐ Skor akhir', `${state.score}`],
    ['🍽️ Hidangan tersaji', `${state.dishesServed}`],
    ['🔥 Kombo terbaik', `x${Math.min(3, state.bestCombo)}`],
    ['⏱️ Shift bertahan', `${state.shiftsDone}`],
    ['🪙 Koin', `${state.coins}`],
  ];
  rows.forEach(([label, value], i) => {
    const y = py + 244 + i * 30;
    text(ctx, label, px + 70, y, 18, C.ink, 'bold', 'left');
    text(ctx, value, px + pw - 70, y, 18, C.ink, 'bold', 'right');
  });
  const blink = 0.6 + 0.4 * Math.sin(state.time * 4);
  ctx.save();
  ctx.globalAlpha = blink;
  text(ctx, 'Tekan R / klik untuk masak lagi', px + pw / 2, py + 392, 20, C.red, 'bold', 'center');
  ctx.restore();
}

// ---- top-level render dispatch ----
export function render(ctx, state) {
  ctx.clearRect(0, 0, W, H);
  if (state.mode === 'title') drawTitle(ctx, state);
  else if (state.mode === 'attract') drawAttract(ctx, state);
  else if (state.mode === 'gameover') drawGameOver(ctx, state);
  else drawPlaying(ctx, state);
}
