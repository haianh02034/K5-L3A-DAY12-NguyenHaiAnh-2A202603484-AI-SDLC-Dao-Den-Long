import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

test('headless writes deterministic snapshots, events and terminal state', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'dao-den-long-'));
  try {
    const scenario = join(folder, 'scenario.json');
    const inputs = join(folder, 'inputs.json');
    const out = join(folder, 'out.jsonl');
    await writeFile(scenario, JSON.stringify({
      random_motes: false, random_shades: false, player: { carried: 10 },
      lanterns: [
        { id: 'L1', pos: [0, 0, 0] },
        ...[2, 3, 4, 5].map(i => ({ id: 'L' + i, lit: true })),
      ],
    }));
    await writeFile(inputs, JSON.stringify({ frames: [{ tick: 0, interact: true }] }));
    const run = () => spawnSync(process.execPath, ['scripts/headless.mjs',
      '--seed', '42', '--night', '1', '--ticks', '120', '--snapshot-every', '1',
      '--out', out, '--scenario', scenario, '--inputs', inputs], { encoding: 'utf8' });
    const first = run();
    assert.equal(first.status, 0, first.stderr);
    const content = await readFile(out, 'utf8');
    assert.equal(run().status, 0);
    assert.equal(await readFile(out, 'utf8'), content);
    const records = content.trimEnd().split('\n').map(line => JSON.parse(line));
    assert.equal(records[0].tick, 0);
    assert.equal(records[0].score, 0);
    assert.deepEqual(records.filter(r => r.type === 'event').map(r => [r.tick, r.name]),
      [[0, 'night_start'], [1, 'deposit'], [1, 'lantern_lit'], [1, 'game_over']]);
    assert.deepEqual(records.at(-1), { type: 'end', ticks: 1, state: 'won', score: 948 });
    await writeFile(inputs, JSON.stringify({ frames: [{ tick: 0 }, { tick: 0 }] }));
    const invalid = run();
    assert.equal(invalid.status, 2);
    assert.match(invalid.stderr, /Invalid frame tick/);
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});
