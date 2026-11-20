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
    for (const key of ['pulse', 'interact', 'jump', 'dash', 'pause']) {
      if (key in f) check(typeof f[key] === 'boolean', key);
    }
  }
  return data.frames;
}

function validateScenario(s, night) {
  check(object(s), 'scenario');
  if ('player' in s) {
    check(object(s.player), 'player');
    if ('pos' in s.player) check(vector(s.player.pos, 3), 'player.pos');
    for (const key of ['carried', 'flames', 'invuln_ticks', 'dash_cd_ticks', 'pulse_cd_ticks', 'charm_ticks']) if (key in s.player) check(integer(s.player[key]), key);
  }
  if ('time_left_s' in s) check(Number.isFinite(s.time_left_s) && s.time_left_s >= 0, 'time_left_s');
  for (const key of ['random_motes', 'random_shades', 'random_drifters', 'wind_enabled']) if (key in s) check(typeof s[key] === 'boolean', key);
  if ('motes' in s) check(Array.isArray(s.motes) && s.motes.every(p => vector(p, 3)), 'motes');
  if ('shades' in s) check(Array.isArray(s.shades) &&
    s.shades.every(v => object(v) && vector(v.pos, 3) && (!('id' in v) || typeof v.id === 'string') &&
      (!('state' in v) || ['spawning','wander','chase','recoil','stunned'].includes(v.state)) &&
      (!('state_ticks_left' in v) || integer(v.state_ticks_left))), 'shades');
  if ('drifters' in s) check(Array.isArray(s.drifters) && s.drifters.every(v=>object(v)&&vector(v.pos,3)&&
    (!('id' in v)||typeof v.id==='string')&&(!('state' in v)||['idle','chase','flee','removed'].includes(v.state))&&
    (!('state_ticks_left' in v)||integer(v.state_ticks_left))&&(!('stolen' in v)||integer(v.stolen))), 'drifters');
  if ('charms' in s) check(Array.isArray(s.charms) && s.charms.every(v=>object(v)&&
    (!('pos' in v)||vector(v.pos,3))&&(!('id' in v)||typeof v.id==='string')&&
    (!('available' in v)||typeof v.available==='boolean')&&(!('respawn_ticks' in v)||integer(v.respawn_ticks))&&
    (!('respawn_s' in v)||(Number.isFinite(v.respawn_s)&&v.respawn_s>=0))), 'charms');
  if ('lanterns' in s) check(Array.isArray(s.lanterns) && s.lanterns.every(v => object(v) &&
    /^L[1-7]$/.test(v.id) && Number(v.id.slice(1)) <= night + 4 && (!('pos' in v) || vector(v.pos, 3)) &&
    (!('lit' in v) || typeof v.lit === 'boolean') && (!('deposited' in v) || integer(v.deposited))), 'lanterns');
  return s;
}

function snapshot(g) {
  const coords = pos => pos.map(round);
  const timed = n => round(n / 60);
  const p=g.player;
  return {type:'snapshot',tick:g.tick,sim_tick:g.simTick,state:g.state,night:g.night,
    time_left_s:timeLeft(g),wind:{active:g.wind.active,dir_deg:g.wind.dir_deg},
    player:{pos:coords(p.pos),vel:coords(p.vel),grounded:p.grounded,flames:p.flames,carried:p.carried,
      invuln:p.invuln>0,dash_cd_s:timed(p.dashCd),pulse_cd_s:timed(p.pulseCd),charm_s:timed(p.charm)},
    lanterns:g.lanterns.map(l=>({...l,pos:coords(l.pos)})),
    shades:g.shades.map(({id,pos,state})=>({id,pos:coords(pos),state})),
    drifters:g.drifters.map(({id,pos,state,stolen})=>({id,pos:coords(pos),state,stolen})),
    charms:g.charms.map(({id,available,respawn})=>({id,available,respawn_s:timed(respawn)})),
    motes_active:g.motes.length,
    motes:g.motes.map(({id,pos,kind,ttl})=>({id,pos:coords(pos),kind,ttl_s:ttl===null?null:timed(ttl-g.simTick)})),
    score:g.score};
}

async function main() {
  const keys = ['seed', 'night', 'ticks', 'out', 'snapshot-every', 'inputs', 'scenario'];
  const args = process.argv.slice(2);
  const seedIndex = args.indexOf('--seed');
  if (seedIndex >= 0 && /^-\d+$/.test(args[seedIndex + 1])) {
    args.splice(seedIndex, 2, '--seed=' + args[seedIndex + 1]);
  }
  const { values } = parseArgs({ args, options: Object.fromEntries(keys.map(key => [key, { type: 'string' }])) });
  const night = Number(values.night), seed = Number(values.seed), ticks = Number(values.ticks), every = Number(values['snapshot-every'] ?? 60);
  check(Number.isSafeInteger(seed) && [1,2,3].includes(night) && values.out && integer(ticks) && integer(every, 1), 'arguments');
  let scenario, frames;
  try {
    const load = async name => JSON.parse((await readFile(name, 'utf8')).replace(/^\uFEFF/, ''));
    scenario = values.scenario ? validateScenario(await load(values.scenario), night) : {};
    frames = values.inputs ? validateFrames(await load(values.inputs)) : [];
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
    return;
  }
  const game = createGame(seed, scenario, night);
  const lines = [JSON.stringify(snapshot(game)), JSON.stringify({type:'event',tick:0,name:'night_start',data:{night}})];
  const input = { ...idleInput };
  let cursor = 0;
  while (game.tick < ticks && ['playing','paused'].includes(game.state)) {
    if (frames[cursor]?.tick === game.tick) Object.assign(input, frames[cursor++]);
    for (const event of step(game, input)) lines.push(JSON.stringify(event));
    if (game.tick % every === 0) lines.push(JSON.stringify(snapshot(game)));
  }
  lines.push(JSON.stringify({ type: 'end', ticks: game.tick, state: game.state, score: game.score }));
  await writeFile(values.out, lines.join('\n') + '\n');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
