export const PLAYER_LEVELS = Object.freeze([
  { name: 'Resident', minScore: 0 },
  { name: 'Surgeon', minScore: 2000 },
  { name: 'Senior Surgeon', minScore: 5000 },
  { name: 'Expert', minScore: 10000 },
  { name: 'Master Surgeon', minScore: 20000 },
  { name: 'Ophtha Legend', minScore: 50000 }
]);

export function levelForScore(score) {
  const value = Number.isFinite(Number(score)) ? Math.max(0, Number(score)) : 0;
  let current = PLAYER_LEVELS[0];
  for (const level of PLAYER_LEVELS) {
    if (value < level.minScore) break;
    current = level;
  }
  return current;
}
