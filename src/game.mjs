import contract from '../game.contract.json' with { type: 'json' };
import island from './island.json' with { type: 'json' };

export const tuning = contract.tuning;
export const idleInput = { move: [0, 0], cam_yaw_deg: 0, jump: false, interact: false, pulse: false };
export const tickSeconds = 1 / 60;
const distance = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);

export function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function createGame(seed = island.seed, scenario = {}) {
  const random = seeded(seed);
  const lanterns = island.lanterns.map(({ id, pos }) => {
    const override = scenario.lanterns?.find(lantern => lantern.id === id);
    return { id, lit: false, deposited: 0, ...override, pos: [...(override?.pos ?? pos)] };
  });
  const randomMotes = [];
  for (const { pos } of island.lanterns) {
    for (let i = 0; i < 13; i++) {
      const angle = i * Math.PI * 2 / 13 + random() * 0.4;
      const radius = 8 + random() * 13;
      randomMotes.push([pos[0] + Math.cos(angle) * radius, 0, pos[2] + Math.sin(angle) * radius]);
    }
  }
  randomMotes.push([0, 0, -6], [1, 0, -11], [-2, 0, -16]);
  const motes = (scenario.motes ?? (scenario.random_motes === false ? [] : randomMotes))
    .map((pos, i) => ({ id: 'M' + (i + 1), pos: [...pos] }));
  const initial = scenario.shades ?? [];
  const ids = new Set(initial.map(shade => shade.id).filter(Boolean));
  let nextShade = 1;
  function makeShade(pos, id) {
    if (!id) {
      while (ids.has('S' + nextShade)) nextShade++;
      id = 'S' + nextShade++;
      ids.add(id);
    }
    return { id, pos: [...pos], state: 'chase', stunUntil: 0 };
  }
  return {
    tick: 0, state: 'playing', score: 0, lanterns, motes, makeShade, random,
    shades: initial.map(shade => makeShade(shade.pos, shade.id)),
    spawnShades: scenario.random_shades !== false && scenario.shades === undefined,
    player: { pos: [...(scenario.player?.pos ?? [0, 0, 0])], carried: scenario.player?.carried ?? 0,
      flames: scenario.player?.flames ?? tuning.flames },
    initialTime: scenario.time_left_s ?? tuning.night1_duration_s,
    previous: { ...idleInput }, vertical: 0, invulnerableUntil: 0, pulseUntil: 0,
  };
}

export const timeLeft = game => Math.max(0, game.initialTime - game.tick / 60);

export function step(game, input = idleInput, canMove = null) {
  if (game.state !== 'playing') return [];
  game.tick++;
  const { player, lanterns } = game;
  const events = [];
  const emit = (name, data) => events.push({ type: 'event', tick: game.tick, name, data });
  const pressed = key => input[key] && !game.previous[key];
  const [x, z] = input.move;
  const yaw = input.cam_yaw_deg * Math.PI / 180;
  const speed = tuning.player_speed * tickSeconds / Math.max(1, Math.hypot(x, z));
  const [beforeX, , beforeZ] = player.pos;
  player.pos[0] += (x * Math.cos(yaw) + z * Math.sin(yaw)) * speed;
  player.pos[2] += (-x * Math.sin(yaw) + z * Math.cos(yaw)) * speed;
  const edge = Math.max(1, Math.hypot(player.pos[0], player.pos[2]) / island.radius);
  player.pos[0] /= edge;
  player.pos[2] /= edge;
  if (pressed('jump') && player.pos[1] === 0) game.vertical = 8;
  if (player.pos[1] > 0 || game.vertical > 0) {
    player.pos[1] = Math.max(0, player.pos[1] + game.vertical * tickSeconds);
    game.vertical = player.pos[1] === 0 ? 0 : game.vertical - 23 * tickSeconds;
  }
  if (canMove && !canMove(beforeX, beforeZ, player.pos[0], player.pos[2], player.pos[1])) {
    const slideX = canMove(beforeX, beforeZ, player.pos[0], beforeZ, player.pos[1]);
    if (slideX) player.pos[2] = beforeZ;
    else if (canMove(beforeX, beforeZ, beforeX, player.pos[2], player.pos[1])) player.pos[0] = beforeX;
    else {
      player.pos[0] = beforeX;
      player.pos[2] = beforeZ;
    }
  }
  for (let i = 0; i < game.motes.length && player.carried < tuning.carry_capacity;) {
    if (distance(player.pos, game.motes[i].pos) > tuning.pickup_radius) {
      i++;
      continue;
    }
    game.motes.splice(i, 1);
    player.carried++;
    game.score += tuning.score.per_mote;
    emit('mote_picked', { carried: player.carried });
  }
  if (pressed('interact') && player.carried > 0) {
    const nearest = lanterns.filter(l => !l.lit && distance(l.pos, player.pos) <= tuning.interact_radius)
      .sort((a, b) => distance(a.pos, player.pos) - distance(b.pos, player.pos))[0];
    if (nearest) {
      const amount = Math.min(player.carried, tuning.lantern_cost - nearest.deposited);
      player.carried -= amount;
      nearest.deposited += amount;
      emit('deposit', { lantern_id: nearest.id, amount, deposited: nearest.deposited });
      if (nearest.deposited >= tuning.lantern_cost) {
        nearest.lit = true;
        game.score += tuning.score.per_lantern;
        emit('lantern_lit', { lantern_id: nearest.id });
      }
    }
  }
  if (pressed('pulse') && player.carried >= tuning.pulse_cost && game.tick >= game.pulseUntil) {
    player.carried -= tuning.pulse_cost;
    game.pulseUntil = game.tick + tuning.pulse_cooldown_s * 60;
    const stunned = game.shades.filter(s => distance(s.pos, player.pos) <= tuning.pulse_radius);
    for (const shade of stunned) {
      const dx = shade.pos[0] - player.pos[0], dz = shade.pos[2] - player.pos[2];
      const length = Math.hypot(dx, dz);
      shade.pos[0] += (length ? dx / length : 1) * tuning.pulse_push_m;
      shade.pos[2] += (length ? dz / length : 0) * tuning.pulse_push_m;
      shade.state = 'stunned';
      shade.stunUntil = game.tick + tuning.pulse_stun_s * 60;
    }
    game.score += stunned.length * tuning.score.per_stun;
    emit('pulse', { stunned_ids: stunned.map(s => s.id) });
  }
  if (game.spawnShades && game.tick % 720 === 0 && game.shades.length < 7) {
    const angle = game.random() * Math.PI * 2;
    const shade = game.makeShade([Math.cos(angle) * 75, 0, Math.sin(angle) * 75]);
    game.shades.push(shade);
    emit('shade_spawned', { id: shade.id });
  }
  const safeZones = lanterns.filter(l => l.lit);
  for (const shade of game.shades) {
    if (shade.stunUntil > game.tick) continue;
    const dx = player.pos[0] - shade.pos[0], dz = player.pos[2] - shade.pos[2];
    const length = Math.hypot(dx, dz);
    const move = length ? Math.min(length, tuning.shade_speed * tickSeconds) / length : 0;
    const candidate = [shade.pos[0] + dx * move, shade.pos[1], shade.pos[2] + dz * move];
    const ward = safeZones.find(l => distance(l.pos, candidate) < tuning.safe_radius);
    shade.state = ward ? 'repelled' : 'chase';
    if (ward) {
      const wx = candidate[0] - ward.pos[0], wz = candidate[2] - ward.pos[2];
      const span = Math.hypot(wx, wz);
      shade.pos[0] = ward.pos[0] + (span ? wx / span : 1) * tuning.safe_radius;
      shade.pos[2] = ward.pos[2] + (span ? wz / span : 0) * tuning.safe_radius;
    } else shade.pos = candidate;
    if (distance(shade.pos, player.pos) <= tuning.shade_hit_radius && game.tick >= game.invulnerableUntil && player.flames > 0) {
      player.flames--;
      const dropped = Math.floor(player.carried * tuning.hit_drop_ratio);
      player.carried -= dropped;
      game.invulnerableUntil = game.tick + tuning.invuln_s * 60;
      emit('player_hit', { by: 'shade', flames: player.flames, dropped });
    }
  }
  game.previous = { ...input };
  let reason;
  if (lanterns.every(l => l.lit)) {
    game.state = 'won';
    game.score += Math.floor(timeLeft(game)) * tuning.score.per_second_left + player.flames * tuning.score.per_flame_left;
    reason = 'all_lit';
  } else if (player.flames <= 0 || timeLeft(game) === 0) {
    game.state = 'lost';
    reason = player.flames <= 0 ? 'no_flames' : 'dawn';
  }
  if (reason) emit('game_over', { result: game.state, reason });
  return events;
}
