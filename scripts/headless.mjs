import { readFile, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { createGame, idleInput, step, timeLeft } from '../src/game.mjs';

const integer = (n, minimum = 0) => Number.isSafeInteger(n) && n >= minimum;
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const vector = (v, size) => Array.isArray(v) && v.length === size && v.every(Number.isFinite);
const round = n => Number(n.toFixed(3));
const check = (ok, label) => { if (!ok) throw new Error('Invalid ' + label); };

function validateFrames(data) {
  check(object(data) && Array.isArray(data.frames), 'inputs.frames');
  let previous = -1;
  for (const f of data.frames) {
    check(object(f) && integer(f.tick) && f.tick > previous, 'frame tick');
    previous = f.tick;
    if ('move' in f) check(vector(f.move, 2) && f.move.every(v => Math.abs(v) <= 1), 'move');
    if ('cam_yaw_deg' in f) check(Number.isFinite(f.cam_yaw_deg), 'cam_yaw_deg');
    for (const key of ['pulse', 'interact', 'jump', 'dash']) {
      if (key in f) check(typeof f[key] === 'boolean', key);
    }
  }
  return data.frames;
}

function validateScenario(s) {
  check(object(s), 'scenario');
  if ('player' in s) {
    check(object(s.player), 'player');
    if ('pos' in s.player) check(vector(s.player.pos, 3), 'player.pos');
    for (const key of ['carried', 'flames']) if (key in s.player) check(integer(s.player[key]), key);
  }
  if ('time_left_s' in s) check(Number.isFinite(s.time_left_s) && s.time_left_s >= 0, 'time_left_s');
  for (const key of ['random_motes', 'random_shades']) if (key in s) check(typeof s[key] === 'boolean', key);
  if ('motes' in s) check(Array.isArray(s.motes) && s.motes.every(p => vector(p, 3)), 'motes');
  if ('shades' in s) check(Array.isArray(s.shades) &&
    s.shades.every(v => object(v) && vector(v.pos, 3) && (!('id' in v) || typeof v.id === 'string')), 'shades');
  if ('lanterns' in s) check(Array.isArray(s.lanterns) && s.lanterns.every(v => object(v) &&
    /^L[1-5]$/.test(v.id) && (!('pos' in v) || vector(v.pos, 3)) &&
    (!('lit' in v) || typeof v.lit === 'boolean') && (!('deposited' in v) || integer(v.deposited))), 'lanterns');
  return s;
}

function snapshot(game) {
  const position = ({ pos, ...rest }) => ({ ...rest, pos: pos.map(round) });
  return { type: 'snapshot', tick: game.tick, sim_tick: game.tick, state: game.state,
    time_left_s: timeLeft(game), player: position(game.player),
    lanterns: game.lanterns.map(({ id, pos, lit, deposited }) => position({ id, pos, lit, deposited })),
    shades: game.shades.map(({ id, pos, state }) => position({ id, pos, state })),
    motes_active: game.motes.length, motes: game.motes.map(position), score: game.score };
}

async function main() {
  const keys = ['seed', 'night', 'ticks', 'out', 'snapshot-every', 'inputs', 'scenario'];
  const args = process.argv.slice(2);
  const seedIndex = args.indexOf('--seed');
  if (seedIndex >= 0 && /^-\d+$/.test(args[seedIndex + 1])) {
    args.splice(seedIndex, 2, '--seed=' + args[seedIndex + 1]);
  }
  const { values } = parseArgs({ args, options: Object.fromEntries(keys.map(key => [key, { type: 'string' }])) });
  const seed = Number(values.seed), ticks = Number(values.ticks), every = Number(values['snapshot-every'] ?? 60);
  check(Number.isSafeInteger(seed) && values.night === '1' && values.out && integer(ticks) && integer(every, 1), 'arguments');
  let scenario, frames;
  try {
    const load = async name => JSON.parse((await readFile(name, 'utf8')).replace(/^\uFEFF/, ''));
    scenario = values.scenario ? validateScenario(await load(values.scenario)) : {};
    frames = values.inputs ? validateFrames(await load(values.inputs)) : [];
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
    return;
  }
  const game = createGame(seed, scenario);
  const lines = [JSON.stringify(snapshot(game))];
  const input = { ...idleInput };
  let cursor = 0;
  while (game.tick < ticks && game.state === 'playing') {
    if (frames[cursor]?.tick === game.tick) Object.assign(input, frames[cursor++]);
    for (const event of step(game, input)) lines.push(JSON.stringify(event));
    if (game.tick % every === 0) lines.push(JSON.stringify(snapshot(game)));
  }
  lines.push(JSON.stringify({ type: 'end', ticks: game.tick, state: game.state, score: game.score }));
  await writeFile(values.out, lines.join('\n') + '\n');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
