import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { createGame, step } from '../src/game.mjs';

const level = JSON.parse(await readFile(new URL('../src/island.json', import.meta.url)));
test('movement stays within the island and preserves diagonal speed', () => {
  const player = createGame(level);
  const start = { ...player };
  step(player, level, 1, -1, 0.1);
  assert.ok(Math.abs(Math.hypot(player.x - start.x, player.z - start.z) - level.speed * 0.1) < 1e-9);
  for (let i = 0; i < 400; i++) step(player, level, 1, 1, 1 / 60);
  assert.ok(Math.hypot(player.x / (level.radiusX - 2), player.z / (level.radiusZ - 2)) <= 1 + 1e-9);
});
test('the large lantern requires distinct fireflies and a visit', () => {
  const player = createGame(level);
  function visit([x, z]) {
    for (let i = 0; i < 500; i++) {
      if (Math.hypot(x - player.x, z - player.z) < 0.15) return;
      step(player, level, x - player.x, z - player.z, 1 / 60);
    }
    assert.fail('Destination is unreachable');
  }
  visit(level.lantern.position);
  assert.equal(player.lit, false);
  visit(level.fireflies[0]);
  visit(level.fireflies[0]);
  assert.equal(player.collected.size, 1);
  for (const position of level.fireflies.slice(1, level.lantern.required)) visit(position);
  visit(level.lantern.position);
  assert.equal(player.lit, true);
});
