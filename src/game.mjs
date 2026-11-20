import contract from '../game.contract.json' with { type: 'json' };
import { maps, surface } from './maps.mjs';

export const tuning=contract.tuning;
export const idleInput={move:[0,0],cam_yaw_deg:0,jump:false,interact:false,pulse:false,dash:false,pause:false};
export const tickSeconds=1/60;
const hz=60;
const tau=Math.PI*2;
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[2]-b[2]);
const inReach=(a,b,r,h=1.5)=>distance(a,b)<=r&&Math.abs(a[1]-b[1])<=h;
const length3=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
const unit=(x,z)=>{const l=Math.hypot(x,z);return l?[x/l,z/l]:[1,0];};
const byId=(a,b)=>a.id.localeCompare(b.id,'en',{numeric:true});
const randomPick=(items,rng)=>items[Math.floor(items.length*rng())];
export function seeded(seed) {
  let state=seed>>>0;
  return ()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return state/4294967296;};
}
function mint(items,prefix) {
  const used=new Set(items.map(i=>i.id).filter(Boolean));
  let n=1;
  return ()=>{while(used.has(prefix+n))n++;return prefix+n++;};
}

export function createGame(seed=maps[0].seed, scenario={}, night=1, practice=false, browser=false) {
  const map=maps[night-1], random=seeded(seed);
  const moteSpawns=[...map.moteSpawns];
  if(practice||browser){
    for(const [x,y,z] of map.moteSpawns){
      const next=[x+2.5,y,z+1.5];
      if(surface(night,next[0],next[2])===y)moteSpawns.push(next);
      if(browser){
        const extra=[x-3.1,y,z-1.4];
        if(surface(night,extra[0],extra[2])===y)moteSpawns.push(extra);
      }
    }
  }
  const initialMotes=browser?(practice?36:30):(practice?24:20);
  const moteLimit=browser?(practice?48:42):(practice?36:30);
  const moteInterval=browser?(practice?120:150):(practice?200:240);
  const placed=[...moteSpawns], locations=[];
  while(placed.length&&locations.length<initialMotes) locations.push(placed.splice(Math.floor(random()*placed.length),1)[0]);
  const p=scenario.player??{};
  const shades=scenario.shades??[], drifters=scenario.drifters??[];
  const nextShade=mint(shades,'S'),nextDrifter=mint(drifters,'D');
  const pos=[...(p.pos??map.spawn??[0,0,0])];
  return {
    night,map,random,practice,browser,moteSpawns,moteLimit,moteInterval,spotCooldowns:browser?new Map():null,tick:0,simTick:0,state:'playing',score:0,previous:{...idleInput},
    initialTime:scenario.time_left_s??tuning['night'+night+'_duration_s'],
    player:{pos,vel:[0,0,0],grounded:pos[1]===surface(night,pos[0],pos[2]),flames:p.flames??3,carried:p.carried??0,
      facing:[0,1],invuln:p.invuln_ticks??0,dashCd:p.dash_cd_ticks??0,pulseCd:p.pulse_cd_ticks??0,
      charm:p.charm_ticks??0,dash:0,launch:null,fall:0},
    lanterns:map.lanterns.map(({id,pos})=>{
      const l=scenario.lanterns?.find(v=>v.id===id);
      return {id,pos:[...(l?.pos??pos)],lit:l?.lit??false,deposited:l?.deposited??(l?.lit?10:0)};
    }),
    motes:(scenario.motes??(scenario.random_motes===false?[]:locations)).map((p,i)=>
      ({id:'M'+(i+1),pos:[...p],kind:'random',ttl:null,available:0})),
    nextMote:(scenario.motes??(scenario.random_motes===false?[]:locations)).length+1,
    shades:shades.map(s=>({id:s.id??nextShade(),pos:[...s.pos],state:s.state??'wander',
      left:s.state_ticks_left??0,push:0,direction:[1,0],ward:null})),
    drifters:drifters.map(d=>({id:d.id??nextDrifter(),pos:[...d.pos],state:d.state??'idle',
      stolen:d.stolen??0,left:d.state_ticks_left??(d.state==='flee'?240:0),direction:[1,0]})),
    charms:(scenario.charms??map.charms.map(pos=>({pos}))).map((c,i)=>({id:c.id??'C'+(i+1),
      pos:[...(c.pos??map.charms[i]??[0,0,0])],available:c.available??!(c.respawn_ticks>0),
      respawn:c.respawn_ticks??(Number.isFinite(c.respawn_s)?Math.round(c.respawn_s*hz):0)})),
    nextShade,nextDrifter,spawnMotes:scenario.random_motes!==false,
    spawnShades:scenario.random_shades!==false,spawnDrifters:night>=2&&scenario.random_drifters!==false,
    windEnabled:night===3&&scenario.wind_enabled!==false,wind:{active:false,dir_deg:0,warning:false},
  };
}

export const timeLeft=g=>Math.max(0,g.initialTime-g.simTick/hz);

function movePlayer(g,input,pressed,emit,resolve) {
  const {player:p,night}=g;
  if(p.fall){
    if(--p.fall===0){
      p.pos=[...(g.map.spawn??[0,0,0])];p.vel=[0,0,0];p.grounded=true;p.invuln=90;p.facing=[0,1];
    }
    return;
  }
  const [x,y,z]=p.pos;
  const [mx,mz]=input.move;
  const yaw=input.cam_yaw_deg*Math.PI/180;
  const world=[mx*Math.cos(yaw)+mz*Math.sin(yaw),-mx*Math.sin(yaw)+mz*Math.cos(yaw)];
  const magnitude=Math.hypot(...world);
  if(magnitude>0&&!p.dash) p.facing=unit(...world);
  if(pressed('dash')&&!p.dash&&(!p.dashCd||p.charm)){
    p.dash=12;p.dashCd=p.charm?0:90;emit('dash',{});
  }
  const walking=(p.charm?7.2:6)*(g.practice?1.2:1);
  let vx=world[0]*walking/Math.max(1,magnitude),vz=world[1]*walking/Math.max(1,magnitude);
  if(p.launch) [vx,vz]=p.launch;
  if(p.dash){vx=p.facing[0]*14;vz=p.facing[1]*14;}
  if(g.wind.active){
    const a=g.wind.dir_deg*Math.PI/180;
    vx+=Math.cos(a)*2;vz+=Math.sin(a)*2;
  }
  const ground=surface(night,x,z);
  const pad=p.grounded&&g.map.pads.find(v=>inReach(v.pos,p.pos,1,.01));
  if(pad){
    const direction=unit(pad.target[0]-pad.pos[0],pad.target[1]-pad.pos[2]);
    p.launch=direction.map(d=>d*pad.speed);
    if(!p.dash){
      [vx,vz]=p.launch;
      if(g.wind.active){
        const a=g.wind.dir_deg*Math.PI/180;
        vx+=Math.cos(a)*2;vz+=Math.sin(a)*2;
      }
    }
    p.vel[1]=pad.up;p.grounded=false;
  }else if(pressed('jump')&&p.grounded){p.vel[1]=7;p.grounded=false;}

  let nx=x+vx/hz,nz=z+vz/hz;
  if(resolve) [nx,nz]=resolve(x,z,nx,nz,y-(Number.isFinite(ground)?ground:0));
  let nextSurface=surface(night,nx,nz);
  const blocked=(tx,tz,level)=>level>y+.55||
    (night===3&&Math.hypot(tx,tz)<2&&y>=5.8&&y<14);
  if(blocked(nx,nz,nextSurface)){
    const dx=nx-x,dz=nz-z;
    nx=x;nz=z;nextSurface=ground;
    if(resolve){
      // Try oblique directions along ramp and terrace edges, preserving forward input.
      for(const turn of [.55,-.55,1,-1,1.34,-1.34,1.64,-1.64]){
        const tx=x+(dx*Math.cos(turn)-dz*Math.sin(turn))*.88;
        const tz=z+(dx*Math.sin(turn)+dz*Math.cos(turn))*.88;
        const [sx,sz]=resolve(x,z,tx,tz,Number.isFinite(ground)?y-ground:y);
        const level=surface(night,sx,sz);
        if(Number.isFinite(level)&&!blocked(sx,sz,level)){
          nx=sx;nz=sz;nextSurface=level;break;
        }
      }
    }
  }
  let ny=y;
  if(p.grounded&&Number.isFinite(nextSurface)&&Math.abs(nextSurface-y)<=.55){ny=nextSurface;}
  else{
    p.grounded=false;
    if(!p.dash){ny+=p.vel[1]/hz-10/hz/hz;p.vel[1]-=20/hz;}
    if(p.vel[1]<=0&&ny<=nextSurface&&y>=nextSurface-.001){
      ny=nextSurface;p.grounded=true;p.launch=null;p.vel[1]=0;
    }
  }
  p.pos=[nx,ny,nz];p.vel[0]=(nx-x)*hz;p.vel[2]=(nz-z)*hz;
  if(p.dash) p.dash--;
  if(ny< -10){
    const lost=p.carried;
    p.flames=Math.max(0,p.flames-1);p.carried=0;p.fall=60;p.dash=0;p.launch=null;
    p.vel=[0,0,0];
    emit('player_hit',{by:'fall',flames:p.flames,dropped:0,lost});
  }
}

function drop(g,count,pos,ring) {
  for(let i=0;i<count;i++){
    const a=ring?g.random()*tau:0,r=ring?1.5+g.random():0;
    const x=pos[0]+Math.cos(a)*r,z=pos[2]+Math.sin(a)*r;
    g.motes.push({id:'M'+g.nextMote++,pos:[x,pos[1],z],kind:'dropped',ttl:g.simTick+480,available:g.simTick+1});
  }
}

function driveShade(g,s,lit,resolve) {
  const p=g.player.pos;
  const ward=lit.find(l=>distance(l.pos,s.pos)<6-1e-9&&Math.abs(l.pos[1]-s.pos[1])<=1.5);
  if(ward&&!s.ward)s.ward={lantern:ward,ticks:30};
  if(s.ward){
    const {lantern:l}=s.ward;
    const [x,z]=unit(s.pos[0]-l.pos[0],s.pos[2]-l.pos[2]);
    const r=distance(l.pos,s.pos);
    const next=r+(6-r)/s.ward.ticks--;
    s.pos[0]=l.pos[0]+x*next;s.pos[2]=l.pos[2]+z*next;
    if(!s.ward.ticks)s.ward=null;
    return false;
  }
  let dx=0,dz=0;
  if(s.state==='spawning'&&s.left>0)return false;
  if(s.state==='stunned'&&s.left>0){
    if(s.push<=0)return false;
    s.push--;
    [dx,dz]=s.direction.map(v=>v*4/15);
  }else if(s.state==='recoil'&&s.left>0){
    [dx,dz]=s.direction.map(v=>v*2/60);
  }else{
    const d=distance(p,s.pos);
    const speed=(g.night===3?4.5:4)*(g.browser?.86:1)/hz;
    const notice=g.browser?(g.practice?48:40):(g.practice?21:12);
    const leash=g.browser?(g.practice?65:56):(g.practice?29:18);
    if(d<=notice||(s.state==='chase'&&d<=leash)){
      s.state='chase';
      [dx,dz]=d?unit(p[0]-s.pos[0],p[2]-s.pos[2]).map(v=>v*Math.min(speed,d)):[0,0];
    }else{
      s.state='wander';
      const a=Number(s.id.replace(/^\D+/,''))||1;
      if(g.browser&&d>notice){
        const home=g.map.zones.reduce((closest,zone)=>
          Math.abs(zone.x-s.pos[0])<Math.abs(closest.x-s.pos[0])?zone:closest);
        const headings=unit(home.x-s.pos[0],-s.pos[2]);
        [dx,dz]=headings.map(v=>v*speed*.65);
      }else{
        dx=Math.cos(g.simTick/139+a)*speed*.40;dz=Math.sin(g.simTick/139+a)*speed*.40;
      }
    }
  }
  const currentFloor=surface(g.night,s.pos[0],s.pos[2]);
  const groundBlocks=(x,z,floor)=>!Number.isFinite(floor)||
    (Number.isFinite(currentFloor)&&Math.abs(floor-currentFloor)>.65)||
    (g.night===3&&floor===6&&Math.hypot(x,z)<2);
  const wardAt=(x,z)=>lit.find(l=>Math.abs(l.pos[1]-s.pos[1])<=1.5&&Math.hypot(l.pos[0]-x,l.pos[2]-z)<6-1e-9);
  const walking=s.state==='chase'||s.state==='wander';
  let nx=s.pos[0]+dx,nz=s.pos[2]+dz;
  if(walking&&resolve)[nx,nz]=resolve(s.pos[0],s.pos[2],nx,nz,0);
  let floor=surface(g.night,nx,nz);
  let terrainBlocks=groundBlocks(nx,nz,floor);
  if(walking&&(terrainBlocks||(nx===s.pos[0]&&nz===s.pos[2]))&&(dx||dz)){
    const sign=s.steerSide??1;
    for(const turn of [.55,1.05,1.58,2.08,-.55,-1.05,-1.58,-2.08]){
      const bend=turn*sign;
      const x=s.pos[0]+dx*Math.cos(bend)-dz*Math.sin(bend);
      const z=s.pos[2]+dx*Math.sin(bend)+dz*Math.cos(bend);
      const [tx,tz]=resolve?resolve(s.pos[0],s.pos[2],x,z,0):[x,z];
      const level=surface(g.night,tx,tz);
      if((tx!==s.pos[0]||tz!==s.pos[2])&&!groundBlocks(tx,tz,level)&&!wardAt(tx,tz)){
        nx=tx;nz=tz;floor=level;terrainBlocks=false;s.steerSide=Math.sign(bend);break;
      }
    }
  }
  const angleWard=wardAt(nx,nz);
  if(!terrainBlocks&&!angleWard){
    s.pos[0]=nx;s.pos[2]=nz;
    if(Number.isFinite(currentFloor)&&Math.abs(s.pos[1]-currentFloor)<.66)s.pos[1]+=floor-currentFloor;
  }else if(s.state==='stunned'){
    s.push=0;
  }else if(!terrainBlocks&&angleWard){
    const x=s.pos[0]-angleWard.pos[0],z=s.pos[2]-angleWard.pos[2];
    const a=dx*dx+dz*dz,b=x*dx+z*dz,c=x*x+z*z-36;
    const t=Math.max(0,(-b-Math.sqrt(Math.max(0,b*b-a*c)))/a);
    if(Number.isFinite(t)){s.pos[0]+=dx*t;s.pos[2]+=dz*t;}
  }
  return s.state==='chase'||s.state==='wander';
}

function moveDrifter(g,d) {
  const p=g.player;
  if(d.state==='removed')return;
  let direction,speed;
  if(d.state==='flee'){
    if(d.left<=0){d.state='removed';return;}
    d.left--;
    direction=unit(d.pos[0]-p.pos[0],d.pos[2]-p.pos[2]);speed=7;
  }else if(!p.fall&&p.carried>=5&&distance(d.pos,p.pos)<=15){
    d.state='chase';direction=unit(p.pos[0]-d.pos[0],p.pos[2]-d.pos[2]);speed=Math.min(7,distance(p.pos,d.pos)*hz);
    d.pos[1]+=Math.max(-.08,Math.min(.08,p.pos[1]+.8-d.pos[1]));
  }else{
    d.state='idle';
    const a=g.simTick/94+(Number(d.id.slice(1))||0);
    direction=[Math.cos(a),Math.sin(a)];speed=2;
  }
  d.pos[0]+=direction[0]*speed/hz;d.pos[2]+=direction[1]*speed/hz;
}

function spawn(g,emit) {
  const t=g.simTick;
  if(g.spawnMotes&&t%g.moteInterval===0&&g.motes.length<g.moteLimit){
    const empty=g.moteSpawns.filter(pos=>(g.spotCooldowns?.get(pos.join(','))??0)<=t&&
      !g.motes.some(m=>length3(m.pos,pos)<.01));
    if(empty.length)g.motes.push({id:'M'+g.nextMote++,pos:[...randomPick(empty,g.random)],
      kind:'random',ttl:null,available:t+1});
  }
  if(g.spawnShades&&t>=300&&(t-300)%g.map.shadeInterval===0){
    const count=t===300?2:1;
    for(let i=0;i<count&&g.shades.length<g.map.shadeCap;i++){
      const points=g.map.shadeSpawns.filter(pos=>distance(pos,g.player.pos)>=15&&!g.shades.some(s=>distance(s.pos,pos)<1));
      if(!points.length)break;
      const id=g.nextShade();
      g.shades.push({id,pos:[...randomPick(points,g.random)],state:'spawning',left:1,push:0,direction:[1,0],ward:null});
      emit('shade_spawned',{id});
    }
  }
  if(g.spawnDrifters&&t%1200===0&&g.drifters.filter(d=>d.state!=='removed').length<2){
    const [x,y,z]=randomPick(g.map.shadeSpawns,g.random);
    g.drifters.push({id:g.nextDrifter(),pos:[x,y+.8,z],state:'idle',stolen:0,left:0});
  }
}

export function step(g,input=idleInput,resolve=null){
  if(g.state==='won'||g.state==='lost')return [];
  g.tick++;
  const events=[];
  const emit=(name,data)=>events.push({type:'event',tick:g.tick,name,data});
  const pressed=key=>input[key]&&!g.previous[key];
  if(pressed('pause')){
    g.state=g.state==='paused'?'playing':'paused';
    emit(g.state==='paused'?'paused':'resumed',{});
  }
  if(g.state==='paused'){g.previous={...input};return events;}
  g.simTick++;
  const {player:p}=g;
  for(const key of ['invuln','dashCd','pulseCd','charm'])if(p[key]>0)p[key]--;
  for(const shade of g.shades){
    if(shade.left>0&&--shade.left===0&&shade.state!=='wander')shade.state='wander';
  }
  g.motes=g.motes.filter(m=>m.ttl===null||m.ttl>g.simTick);
  for(const c of g.charms)if(c.respawn>0&&--c.respawn===0)c.available=true;
  if(g.windEnabled){
    if(g.simTick%1800===1680)g.wind.dir_deg=Math.floor(g.random()*360);
    g.wind.active=g.simTick>=1800&&g.simTick%1800<300;
    g.wind.warning=g.simTick%1800>=1680;
  }
  movePlayer(g,input,pressed,emit,resolve);
  if(!p.fall&&p.flames>0){
    g.motes=g.motes.filter(m=>{
      if(p.carried>=10||m.available>g.simTick||!inReach(m.pos,p.pos,g.browser?2.05:1))return true;
      if(g.spotCooldowns&&m.kind==='random')g.spotCooldowns.set(m.pos.join(','),g.simTick+18*hz);
      emit('mote_picked',{carried:++p.carried});return false;
    });
    for(const c of g.charms){
      if(!c.available||!inReach(c.pos,p.pos,1))continue;
      c.available=false;c.respawn=2700;p.charm=600;p.dashCd=0;
      emit('charm_picked',{charm_id:c.id,charm_ticks:600});
    }
    if(pressed('interact')&&p.carried){
      const l=g.lanterns.filter(l=>!l.lit&&inReach(l.pos,p.pos,2))
        .sort((a,b)=>distance(a.pos,p.pos)-distance(b.pos,p.pos)||byId(a,b))[0];
      if(l){
        const amount=Math.min(p.carried,10-l.deposited);
        p.carried-=amount;l.deposited+=amount;g.score+=10*amount;
        emit('deposit',{lantern_id:l.id,amount,deposited:l.deposited});
        if(l.deposited===10){l.lit=true;g.score+=100;emit('lantern_lit',{lantern_id:l.id});}
      }
    }
  }
  const lit=g.lanterns.filter(l=>l.lit);
  if(!p.fall&&pressed('pulse')&&p.carried>=3&&!p.pulseCd){
    p.carried-=3;p.pulseCd=180;
    const center=[p.pos[0],p.pos[1]+.8,p.pos[2]];
    const targets=g.shades.filter(s=>length3(s.pos,center)<=5).sort(byId);
    for(const s of targets){
      s.state='stunned';s.left=120;s.push=15;
      s.direction=unit(s.pos[0]-center[0],s.pos[2]-center[2]);
    }
    g.score+=5*targets.length;
    emit('pulse',{stunned_ids:targets.map(s=>s.id)});
    for(const d of g.drifters){
      if(length3(d.pos,center)>5)continue;
      if(d.state==='chase'){d.state='flee';d.left=240;}
      else if(d.state==='flee'&&d.stolen){
        drop(g,d.stolen,d.pos,false);
        emit('drifter_drop',{drifter_id:d.id,amount:d.stolen});d.stolen=0;d.left=120;
      }
    }
  }
  const dangerous=g.shades.filter(s=>driveShade(g,s,lit,resolve)).sort(byId);
  for(const d of g.drifters)moveDrifter(g,d);
  if(!p.fall&&p.flames>0){
    for(const d of g.drifters){
      if(d.state!=='chase'||distance(d.pos,p.pos)>1.2)continue;
      d.stolen=Math.min(3,p.carried);p.carried-=d.stolen;d.state='flee';d.left=240;
      emit('drifter_steal',{drifter_id:d.id,amount:d.stolen,carried:p.carried});
    }
    if(!p.invuln){
      const s=dangerous.find(s=>inReach(s.pos,p.pos,1));
      if(s){
        const dropped=Math.floor(p.carried/2);p.carried-=dropped;p.flames--;p.invuln=90;
        s.state='recoil';s.left=60;s.direction=unit(s.pos[0]-p.pos[0],s.pos[2]-p.pos[2]);
        drop(g,dropped,p.pos,true);
        emit('player_hit',{by:'shade',flames:p.flames,dropped});
      }
    }
  }
  spawn(g,emit);
  g.previous={...input};
  const reason=p.flames<=0?'no_flames':lit.length===g.lanterns.length?'all_lit':timeLeft(g)===0?'dawn':null;
  if(reason){
    g.state=reason==='all_lit'?'won':'lost';
    if(g.state==='won')g.score+=Math.floor(timeLeft(g))*2+p.flames*50;
    emit('game_over',{result:g.state,reason});
  }
  return events;
}
