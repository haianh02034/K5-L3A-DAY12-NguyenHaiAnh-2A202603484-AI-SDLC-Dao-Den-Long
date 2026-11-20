import assert from 'node:assert/strict';
import { test } from 'node:test';
import { slideMovement } from '../src/collision.mjs';
import { capacity } from '../src/lanterns.mjs';
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
test('pickup, partial deposit, held interaction and lighting without an early win', () => {
  const g = createGame(9, { ...quiet, motes: [[0,0,0]],
    lanterns: Array.from({ length: 5 }, (_, i) => ({ id: 'L'+(i+1), pos: [i*4,0,0] })),
  });
  assert.deepEqual(step(g, input({ interact: true })).map(x => x.name), ['mote_picked', 'deposit']);
  assert.equal(g.lanterns[0].deposited, 1);
  g.player.carried = 10;
  assert.deepEqual(step(g, input({ interact: true })), []);
  for (let i = 0; i < 5; i++) {
    g.player.pos=[i*4,0,0];
    step(g);
    g.player.carried = 10;
    step(g, input({ interact: true }));
  }
  assert.equal(g.state,'playing');
  assert.equal(g.lanterns.filter(l=>l.lit).length,5);
  assert.equal(capacity(g.player),20);
});
test('pulse spends light and stuns; safe lantern repels shades; dawn ends a run', () => {
  const g = createGame(9, { ...quiet, player: { carried: 3 }, shades: [{ pos: [2,0,0] }], time_left_s: 1,
    lanterns: [{ id:'L1', pos:[0,0,0], lit:true }] });
  assert.deepEqual(step(g,input({ pulse:true }))[0].data.stunned_ids, ['S1']);
  assert.equal(g.player.carried, 0);
  assert.equal(g.shades[0].state,'stunned');
  assert.ok(g.shades[0].pos[0]>2);
  for(let i=1;i<60;i++) step(g);
  assert.equal(g.state,'lost');
  const safe=createGame(9,{...quiet,shades:[{pos:[1,0,0]}],lanterns:[{id:'L1',pos:[0,0,0],lit:true}]});
  step(safe);
  assert.ok(safe.shades[0].pos[0]>1);
  assert.equal(safe.player.flames,tuning.flames);
});
test('shade damage respects invulnerability and ends on zero flames', () => {
  const g=createGame(9,{...quiet,shades:[{pos:[0,0,0]}]});
  const first=step(g).find(e=>e.name==='player_hit');
  assert.equal(first.data.flames,2);
  for(let i=0;i<tuning.invuln_s*60-1;i++) assert.equal(step(g).some(e=>e.name==='player_hit'),false);
  assert.equal(step(g).find(e=>e.name==='player_hit').data.flames,1);
  for(let i=0;i<tuning.invuln_s*60;i++) step(g);
  assert.equal(g.state,'lost');
});

test('3D movement slides around a head-on trunk and clears a low rock in a jump', () => {
  const g = createGame(9, quiet);
  const trunk = { x: 1, z: 0, radius: .52, clearance: Infinity };
  const around = (...movement) => slideMovement([trunk], ...movement);
  const right = input({ move: [1, 0] });
  let furthestSide = 0;
  for (let i = 0; i < 48; i++) {
    step(g, right, around);
    const [x, , z] = g.player.pos;
    assert.ok(Math.hypot(x - trunk.x, z - trunk.z) >= trunk.radius - 1e-8);
    furthestSide = Math.max(furthestSide, Math.abs(z));
  }
  assert.ok(furthestSide > .48 && g.player.pos[0] > 2);
  const rock = { x: .5, z: 0, radius: .3, clearance: .6 };
  const grounded = slideMovement([rock], 0, 0, .4, 0, 0);
  assert.notDeepEqual(grounded, [.4, 0]);
  assert.deepEqual(slideMovement([rock], 0, 0, .4, 0, .7), [.4, 0]);
});

test('three maps, pause, dash and falling use the standardized v1.1 clock', () => {
  for(const night of [1,2,3]){
    const g=createGame(42,{},night);
    assert.equal(g.motes.length,20);
    assert.equal(g.lanterns.length,4+night);
    for(let i=0;i<300;i++)step(g);
    assert.equal(g.shades.length,2);
    assert.equal(g.player.flames,3);
  }
  const g=createGame(9,quiet);
  assert.equal(step(g,input({dash:true}))[0].name,'dash');
  for(let i=1;i<12;i++)step(g);
  assert.ok(Math.abs(g.player.pos[2]-2.8)<1e-9);
  const time=g.simTick, cd=g.player.dashCd;
  assert.equal(step(g,input({pause:true}))[0].name,'paused');
  for(let i=0;i<90;i++)step(g);
  assert.equal(g.simTick,time);
  assert.equal(g.player.dashCd,cd);
  assert.equal(step(g,input({pause:true}))[0].name,'resumed');
  const fall=createGame(1,{...quiet,player:{pos:[41,-11,0],carried:8,invuln_ticks:200}});
  assert.deepEqual(step(fall)[0].data,{by:'fall',flames:2,dropped:0,lost:8});
  for(let i=0;i<60;i++)step(fall);
  assert.deepEqual(fall.player.pos,[0,0,0]);
  assert.equal(fall.player.invuln,90);
});

test('the launch pads carry Mây across the cloud gap and to the bell terrace', () => {
  const launch=(night,pos)=>{
    const g=createGame(4,{...quiet,wind_enabled:false,player:{pos}},night);
    for(let i=0;i<150;i++)step(g);
    return g.player;
  };
  const island=launch(2,[20,0,18]);
  assert.ok(island.grounded&&island.pos[0]>45);
  const bell=launch(3,[0,3,13]);
  assert.equal(bell.pos[1],6);
  assert.ok(bell.grounded);
});

test('drifters steal before shade damage and wind charms grant unrestricted dash',()=>{
  const g=createGame(1,{...quiet,random_drifters:false,player:{carried:10},
    drifters:[{pos:[0,1,0]}],shades:[{pos:[0,0,0]}],charms:[{pos:[0,0,0]}]},2);
  const events=step(g);
  assert.equal(g.player.charm,600);
  assert.deepEqual(events.map(e=>e.name),['charm_picked','drifter_steal','player_hit']);
  assert.equal(events.at(-1).data.dropped,3);
  step(g,input({dash:true}));
  assert.equal(g.player.dashCd,0);
});

test('night three wind warns before pushing, then stops after five seconds',()=>{
  const g=createGame(44,{...quiet,random_drifters:false},3);
  for(let i=0;i<1680;i++)step(g);
  assert.equal(g.wind.warning,true);
  assert.equal(g.wind.active,false);
  for(let i=0;i<120;i++)step(g);
  assert.equal(g.wind.active,true);
  assert.ok(Math.abs(Math.hypot(g.player.vel[0],g.player.vel[2])-2)<1e-7);
  for(let i=0;i<300;i++)step(g);
  assert.equal(g.wind.active,false);
});

test('practice uses 20 percent more speed and starting motes without changing Contract v1.1 defaults', () => {
  for(const night of [1,2,3]){
    const standard=createGame(5,{},night);
    const preview=createGame(5,{},night,true);
    assert.equal(standard.motes.length,20);
    assert.equal(preview.motes.length,24);
    step(standard,input({move:[1,0]}));
    step(preview,input({move:[1,0]}));
    assert.ok(Math.abs(preview.player.vel[0]-standard.player.vel[0]*1.2)<1e-8);
  }
});

test('browser movement follows a terrace when the player holds forward into its wall', () => {
  const g=createGame(5,{...quiet,player:{pos:[0,0,24.6]}},3);
  for(let i=0;i<16;i++)step(g,input({move:[0,-1]}),(_x,_z,toX,toZ)=>[toX,toZ]);
  assert.ok(Math.abs(g.player.pos[0])>.5);
  assert.equal(g.player.pos[1],0);
});

test('the browser waits 18 s before reusing a collected spot without changing headless respawns', () => {
  const scenario={random_shades:false,motes:[[0,0,0]]};
  for(const browser of [false,true]){
    const g=createGame(4,scenario,1,false,browser);
    g.moteSpawns=[[0,0,0]];
    assert.equal(step(g)[0].name,'mote_picked');
    g.player.pos=[8,0,0];
    for(let i=1;i<240;i++)step(g);
    assert.equal(g.motes.length,browser?0:1);
    if(browser){
      for(let i=240;i<1200;i++)step(g);
      assert.equal(g.motes.length,1);
    }
  }
});

test('a shade follows a terrace wall rather than stopping at the first blocked step', () => {
  const g=createGame(3,{...quiet,player:{pos:[0,3,20]},shades:[{pos:[0,0,24.4]}]},3);
  for(let i=0;i<30;i++)step(g);
  assert.ok(Math.abs(g.shades[0].pos[0])>.6);
  assert.equal(g.shades[0].pos[1],0);
});

test('browser nights start with a larger supply and replenish more often', () => {
  for(const night of [1,2,3]){
    const normal=createGame(7,{},night,false,true);
    const practice=createGame(7,{},night,true,true);
    assert.equal(normal.motes.length,30);
    assert.equal(practice.motes.length,36);
    assert.equal(normal.moteInterval,150);
    assert.equal(practice.moteInterval,120);
    assert.equal(createGame(7,{},night).motes.length,20);
  }
});

test('browser shades notice Mây earlier and patrol inward from distant shores', () => {
  const scenario={...quiet,shades:[{pos:[30,0,0]}]};
  const browser=createGame(4,scenario,1,false,true);
  const headless=createGame(4,scenario);
  step(browser);step(headless);
  assert.equal(browser.shades[0].state,'chase');
  assert.equal(headless.shades[0].state,'wander');
  const distant=createGame(4,{...quiet,player:{pos:[-30,0,0]},shades:[{pos:[37,0,0]}]},1,false,true);
  for(let i=0;i<70;i++)step(distant);
  assert.ok(distant.shades[0].pos[0]<35);
});

test('browser play pulls nearby motes and shades advance a little slower', () => {
  const scenario={...quiet,motes:[[1.8,0,0]],shades:[{pos:[8,0,0]}]};
  const browser=createGame(4,scenario,1,false,true), headless=createGame(4,scenario);
  step(browser);step(headless);
  assert.equal(browser.player.carried,1);
  assert.equal(headless.player.carried,0);
  assert.ok(browser.shades[0].pos[0]>headless.shades[0].pos[0]);
});

test('fuel drains exactly, goes out, relights for five and raises carrying capacity',()=>{
  const g=createGame(44,{...quiet,player:{carried:5},lanterns:[{id:'L1',pos:[0,0,0],lit:true,fuel:1}]});
  for(let i=0;i<59;i++)step(g);
  assert.equal(g.lanterns[0].fuelUnits,1);
  const events=step(g,input({interact:true}));
  assert.deepEqual(events.map(e=>e.name),['lantern_out','deposit','lantern_lit']);
  assert.deepEqual(events.at(-1).data,{lantern_id:'L1',relight:true});
  assert.equal(g.lanterns[0].relit_count,1);
  assert.equal(g.lanterns[0].fuelUnits,6000);
  assert.equal(capacity(g.player),12);
  assert.equal(g.score,65);
});

test('two shades drain together, and a refill restores the ward',()=>{
  const g=createGame(44,{...quiet,player:{pos:[20,0,0],carried:2},lanterns:[{id:'L1',pos:[0,0,0],lit:true,fuel:29}],
    shades:[{pos:[1,0,0],state:'drain',target_lantern_id:'L1'},{pos:[-1,0,0],state:'drain',target_lantern_id:'L1'}]});
  for(let i=0;i<59;i++)step(g);
  const events=step(g);
  assert.equal(g.lanterns[0].fuelUnits,18*60);
  assert.equal(events.filter(e=>e.name==='fuel_drain').length,2);
  g.player.pos=[0,0,0];
  assert.equal(step(g,input({interact:true}))[0].name,'refuel');
  for(let i=1;i<30;i++)step(g);
  assert.ok(g.shades.every(s=>Math.hypot(s.pos[0],s.pos[2])>=6-1e-8));
  assert.equal(g.player.flames,3);
});

test('Q marks a draining shade, pushes it for 4 m and leaves out-of-range targets alone',()=>{
  const g=createGame(44,{...quiet,player:{carried:3},lanterns:[{id:'L1',pos:[4,0,0],lit:true,fuel:25}],
    shades:[{pos:[4,0,0],state:'drain',target_lantern_id:'L1'},{pos:[0,6,0],id:'S9'}]});
  assert.deepEqual(step(g,input({pulse:true})).find(e=>e.name==='pulse').data.stunned_ids,['S1']);
  assert.equal(g.score,15);
  for(let i=1;i<15;i++)step(g);
  assert.ok(Math.abs(g.shades[0].pos[0]-8)<1e-8);
  assert.equal(g.shades[0].state,'stunned');
  assert.notEqual(g.shades[1].state,'stunned');
});

test('dawn thresholds are 3, 4, and 5; running out of flames always takes priority',()=>{
  for(const night of [1,2,3]){
    const needed=night+2;
    const lanterns=Array.from({length:needed},(_,i)=>({id:'L'+(i+1),lit:true,fuel:74}));
    const winner=createGame(1,{...quiet,player:{flames:2},lanterns,time_left_s:1/60},night);
    assert.deepEqual(step(winner).at(-1).data,{result:'won',reason:'dawn_survived'});
    assert.equal(winner.score,needed*(50+73)+100);
    const lose=createGame(1,{...quiet,lanterns:lanterns.slice(1),time_left_s:1/60},night);
    assert.equal(step(lose).at(-1).data.reason,'dawn');
    const empty=createGame(1,{...quiet,player:{flames:0},lanterns,time_left_s:1/60},night);
    assert.equal(step(empty).at(-1).data.reason,'no_flames');
  }
});
