import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGame, idleInput, step, tuning } from '../src/game.mjs';

const quiet = { random_motes: false, random_shades: false };
const input = fields => ({ ...idleInput, ...fields });

test('movement applies camera rotation, normalization and jump', () => {
  const g = createGame(9, quiet);
  step(g, input({ move: [0, 1], cam_yaw_deg: 90, jump: true }));
  assert.ok(Math.abs(g.player.pos[0] - tuning.player_speed / 60) < 1e-9);
  assert.ok(g.player.pos[1] > 0);
  for (let i = 0; i < 65; i++) step(g, input({ jump: true }));
  assert.equal(g.player.pos[1], 0);
});
test('pickup, partial deposit, held interaction and five lights', () => {
  const g = createGame(9, { ...quiet, motes: [[0,0,0]],
    lanterns: Array.from({ length: 5 }, (_, i) => ({ id: 'L'+(i+1), pos: [0,0,0] })),
  });
  assert.deepEqual(step(g, input({ interact: true })).map(x => x.name), ['mote_picked', 'deposit']);
  assert.equal(g.lanterns[0].deposited, 1);
  g.player.carried = 7;
  assert.deepEqual(step(g, input({ interact: true })), []);
  for (let i = 0; i < 5; i++) {
    step(g);
    g.player.carried = 7;
    step(g, input({ interact: true }));
  }
  assert.equal(g.state, 'won');
});
test('pulse spends light and stuns; safe lantern repels shades; dawn ends a run', () => {
  const g = createGame(9, { ...quiet, player: { carried: 2 }, shades: [{ pos: [2,0,0] }], time_left_s: 1,
    lanterns: [{ id:'L1', pos:[0,0,0], lit:true }] });
  assert.deepEqual(step(g,input({ pulse:true }))[0].data.stunned_ids, ['S1']);
  assert.equal(g.player.carried, 0);
  assert.equal(g.shades[0].state,'stunned');
  assert.equal(g.shades[0].pos[0],6);
  for(let i=1;i<60;i++) step(g);
  assert.equal(g.state,'lost');
  const safe=createGame(9,{...quiet,shades:[{pos:[1,0,0]}],lanterns:[{id:'L1',pos:[0,0,0],lit:true}]});
  step(safe);
  assert.equal(safe.shades[0].state,'repelled');
  assert.equal(safe.player.flames,tuning.flames);
});
test('shade damage respects invulnerability and ends on zero flames', () => {
  const g=createGame(9,{...quiet,shades:[{pos:[0,0,0]}]});
  const first=step(g).find(e=>e.name==='player_hit');
  assert.equal(first.data.flames,2);
  for(let i=0;i<119;i++) assert.equal(step(g).some(e=>e.name==='player_hit'),false);
  assert.equal(step(g).find(e=>e.name==='player_hit').data.flames,1);
  for(let i=0;i<120;i++) step(g);
  assert.equal(g.state,'lost');
});
