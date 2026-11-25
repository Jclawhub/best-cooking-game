// Mouse and keyboard input for Dapur Kilat.
// This module only translates events into game actions; the actions
// themselves (serve, add, clear, start, restart) live in main.js and are
// passed in as `api`. Hit areas come from kitchen.js's LAYOUT so the
// clickable regions always match what is drawn.

import { INGREDIENT_BY_KEY } from './recipes.js';
import { LAYOUT } from './kitchen.js';

function inRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

// Convert a pointer event's client coordinates into canvas coordinates
// (the canvas is 1280x720 internally and may be CSS-scaled).
function toCanvas(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

// Wire up mouse + keyboard on the canvas. Returns a detach function.
export function attachInput(canvas, getState, api) {
  function onPointerDown(event) {
    const state = getState();
    const { x, y } = toCanvas(canvas, event);
    api.onGesture();

    if (state.mode === 'title') {
      api.start();
      return;
    }
    if (state.mode === 'gameover') {
      api.restart();
      return;
    }
    // Playing: bins first, then the two action buttons.
    for (let i = 0; i < LAYOUT.bins.length; i++) {
      if (inRect(x, y, LAYOUT.bins[i])) {
        api.addIngredient(LAYOUT.bins[i].ingredientId);
        return;
      }
    }
    if (inRect(x, y, LAYOUT.serve)) {
      api.serve();
      return;
    }
    if (inRect(x, y, LAYOUT.clear)) {
      api.clearPlate();
      return;
    }
  }

  function onKeyDown(event) {
    const state = getState();
    const key = event.key;
    if (key === ' ') event.preventDefault();
    api.onGesture();

    if (key === 'm' || key === 'M') {
      api.toggleMute();
      return;
    }
    if (state.mode === 'title' && (key === 'Enter' || key === ' ')) {
      api.start();
      return;
    }
    if (state.mode === 'gameover' && (key === 'r' || key === 'R' || key === 'Enter' || key === ' ')) {
      api.restart();
      return;
    }
    if (state.mode !== 'playing') return;

    const ingredient = INGREDIENT_BY_KEY[key];
    if (ingredient) {
      api.addIngredient(ingredient.id);
      return;
    }
    if (key === ' ') api.serve();
    else if (key === 'x' || key === 'X') api.clearPlate();
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('keydown', onKeyDown);
  return () => {
    canvas.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('keydown', onKeyDown);
  };
}
