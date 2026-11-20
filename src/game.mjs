export function createGame(level) {
  const [x, z] = level.spawn;
  return { x, z, collected: new Set(), lit: false };
}

export function step(game, level, dx, dz, seconds) {
  const magnitude = Math.hypot(dx, dz);
  if (magnitude > 0) {
    const distance = level.speed * seconds / magnitude;
    const x = game.x + dx * distance;
    const z = game.z + dz * distance;
    const edge = Math.max(1, Math.hypot(x / (level.radiusX - 2), z / (level.radiusZ - 2)));
    game.x = x / edge;
    game.z = z / edge;
  }
  level.fireflies.forEach(([x, z], index) => {
    if (Math.hypot(x - game.x, z - game.z) <= level.collectRadius) game.collected.add(index);
  });
  const [x, z] = level.lantern.position;
  if (game.collected.size >= level.lantern.required &&
      Math.hypot(x - game.x, z - game.z) <= level.lanternRadius) game.lit = true;
}
