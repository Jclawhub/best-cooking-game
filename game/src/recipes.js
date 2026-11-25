// The pantry of Dapur Kilat: six ingredients and five dishes.
// Every dish is a multiset of ingredient ids; the order you add them in
// never matters, only the exact set on the plate.

// Six clickable ingredient bins, keys 1-6.
export const INGREDIENTS = [
  { id: 'nasi', name: 'Nasi', emoji: '🍚', key: '1', color: '#f5f0dc', dark: '#c9bd8f' },
  { id: 'telur', name: 'Telur', emoji: '🥚', key: '2', color: '#fff3c4', dark: '#d9b96a' },
  { id: 'ayam', name: 'Ayam', emoji: '🍗', key: '3', color: '#f2b880', dark: '#b4713a' },
  { id: 'cabai', name: 'Cabai', emoji: '🌶️', key: '4', color: '#ff6b5e', dark: '#c22e22' },
  { id: 'sayur', name: 'Sayur', emoji: '🥬', key: '5', color: '#8ed081', dark: '#4d8f3f' },
  { id: 'kecap', name: 'Kecap', emoji: '🍶', key: '6', color: '#7a4a2b', dark: '#4a2c17' },
];

export const INGREDIENT_BY_ID = Object.fromEntries(
  INGREDIENTS.map((ing) => [ing.id, ing]),
);

export const INGREDIENT_BY_KEY = Object.fromEntries(
  INGREDIENTS.map((ing) => [ing.key, ing]),
);

// Five dishes. `needs` is the exact multiset the plate must hold.
// `price` is the coin reward; `points` is the base score.
export const DISHES = [
  {
    id: 'nasi-goreng',
    name: 'Nasi Goreng',
    emoji: '🍳',
    needs: ['nasi', 'telur', 'cabai', 'kecap'],
    points: 100,
    coins: 8,
    blurb: 'Nasi digoreng cepat dengan telur dan cabai.',
  },
  {
    id: 'ayam-goreng',
    name: 'Ayam Goreng',
    emoji: '🍗',
    needs: ['ayam', 'kecap', 'cabai'],
    points: 90,
    coins: 7,
    blurb: 'Ayam gurih berlapis kecap manis.',
  },
  {
    id: 'sayur-tumis',
    name: 'Sayur Tumis',
    emoji: '🥗',
    needs: ['sayur', 'cabai', 'kecap'],
    points: 80,
    coins: 6,
    blurb: 'Sayur segar ditumis pedas manis.',
  },
  {
    id: 'telur-dadar',
    name: 'Telur Dadar',
    emoji: '🍳',
    needs: ['telur', 'sayur'],
    points: 70,
    coins: 5,
    blurb: 'Dadar telur lembut isi sayur.',
  },
  {
    id: 'nasi-ayam',
    name: 'Nasi Ayam',
    emoji: '🍛',
    needs: ['nasi', 'ayam', 'kecap'],
    points: 95,
    coins: 7,
    blurb: 'Nasi hangat dengan ayam kecap.',
  },
];

export const DISH_BY_ID = Object.fromEntries(
  DISHES.map((dish) => [dish.id, dish]),
);

// Compare two multisets of ingredient ids (order-independent).
export function sameMultiset(a, b) {
  if (a.length !== b.length) return false;
  const counts = new Map();
  for (const x of a) counts.set(x, (counts.get(x) ?? 0) + 1);
  for (const x of b) {
    const n = counts.get(x) ?? 0;
    if (n === 0) return false;
    counts.set(x, n - 1);
  }
  return true;
}

// The dish whose `needs` exactly match the plate, or null.
export function dishForPlate(plate) {
  for (const dish of DISHES) {
    if (sameMultiset(plate, dish.needs)) return dish;
  }
  return null;
}

// What the plate still needs to complete a dish, or null when the plate
// matches nothing at all (wrong combination).
export function missingFor(plate, dish) {
  const counts = new Map();
  for (const x of dish.needs) counts.set(x, (counts.get(x) ?? 0) + 1);
  for (const x of plate) counts.set(x, (counts.get(x) ?? 0) - 1);
  const missing = [];
  for (const [id, n] of counts) {
    for (let i = 0; i < n; i++) missing.push(id);
  }
  return missing;
}

// The dishes a plate could still become (every needed ingredient is still
// addable and nothing on the plate is wrong for that dish). Used for the
// hint line: when the plate is empty this is every dish.
export function possibleDishes(plate) {
  return DISHES.filter((dish) => {
    const counts = new Map();
    for (const x of dish.needs) counts.set(x, (counts.get(x) ?? 0) + 1);
    for (const x of plate) {
      const n = counts.get(x) ?? 0;
      if (n === 0) return false;
      counts.set(x, n - 1);
    }
    return true;
  });
}

// Is this plate a prefix of any dish at all? False means a wrong combo.
export function plateIsPossible(plate) {
  return possibleDishes(plate).length > 0;
}
