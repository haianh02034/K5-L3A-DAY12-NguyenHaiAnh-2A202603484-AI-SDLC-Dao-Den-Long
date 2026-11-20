import * as T from 'three';
import island from './island.json';
import { createGame, idleInput, seeded, step, timeLeft, tuning } from './game.mjs';

const scene = new T.Scene();
scene.background = new T.Color('#242746');
scene.fog = new T.FogExp2('#30324b', 0.008);
const camera = new T.PerspectiveCamera(42, 1, 0.1, 550);
const ui = Object.fromEntries([...document.querySelectorAll('[id]')].map(e => [e.id, e]));
let renderer;
try {
  renderer = new T.WebGLRenderer({ antialias: true });
} catch (error) {
  ui.objective.textContent = 'Trình duyệt cần WebGL 2 để mở game.';
  throw error;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.65));
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.22;
document.body.prepend(renderer.domElement);
const random = seeded(island.seed);
const material = (color, extra = {}) => new T.MeshStandardMaterial({ color, roughness: 0.77, ...extra });
const flat = (color, extra = {}) => new T.MeshBasicMaterial({ color, ...extra });
const cube = new T.BoxGeometry();
const orb = new T.SphereGeometry(1, 24, 14);
const stone = new T.DodecahedronGeometry(1, 0);
const needle = new T.ConeGeometry(1, 1, 8);
const timber = material('#442c3e');
const tile = material('#295064', {metalness: 0.23});
const trim = material('#a15a49', {metalness: 0.25});
const graphite = material('#53617a', {flatShading: true});
const amber = flat('#ffd386', {toneMapped:false});
const blue = material('#287a89');
const crimson = material('#a84145');
const ink = material('#27233a');
const skin = material('#dca282');
const gold = material('#dcab66', {metalness: 0.35});
const lampDark = material('#603b65', {emissive:'#6b3666', emissiveIntensity:0.48});
const ambient = new T.HemisphereLight('#b5bcff','#534051', 2.0);
scene.add(ambient);
const moon = new T.DirectionalLight('#a7d2ff', 2.2);
moon.position.set(-30, 42, 17);
scene.add(moon);

function model(parent, shape, surface, x, y, z, sx = 1, sy = sx, sz = sx) {
  const mesh = new T.Mesh(shape, surface);
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  parent.add(mesh);
  return mesh;
}

const haloCanvas = document.createElement('canvas');
haloCanvas.width = haloCanvas.height = 128;
const ctx = haloCanvas.getContext('2d');
const gradient = ctx.createRadialGradient(64,64,0,64,64,64);
gradient.addColorStop(0,'rgba(255,255,255,1)');
gradient.addColorStop(0.17,'rgba(255,255,255,.70)');
gradient.addColorStop(0.5,'rgba(255,255,255,.16)');
gradient.addColorStop(1,'rgba(255,255,255,0)');
ctx.fillStyle = gradient;
ctx.fillRect(0,0,128,128);
const haloTexture = new T.CanvasTexture(haloCanvas);
function sprite(parent, x, y, z, width, height, color, opacity, additive = true) {
  const s = new T.Sprite(new T.SpriteMaterial({map:haloTexture,color,opacity,depthWrite:false,
    blending:additive ? T.AdditiveBlending : T.NormalBlending}));
  s.position.set(x,y,z);
  s.scale.set(width,height,1);
  parent.add(s);
  return s;
}
function height(x,z) {
  const r = Math.hypot(x,z) / island.radius;
  return Math.sin(x * .12) * Math.cos(z * .11) * .37 +
    Math.sin((x + z) * .33) * .15 - Math.max(0,(r-.92)/.08) ** 2 * 1.6;
}
function ground() {
  const vertices = [], colors = [], triangles = [];
  const size = 150, stride = size + 1;
  const extent = island.radius + 5;
  const inner = new T.Color('#4e7970'), outer = new T.Color('#4d5674');
  const stoneColor = new T.Color('#78738b');
  for (let row = 0; row <= size; row++) {
    for (let col = 0; col <= size; col++) {
      const x = (col / size * 2 - 1) * extent, z = (row / size * 2 - 1) * extent;
      const radius = Math.hypot(x,z), a = Math.atan2(z,x);
      const edge = island.radius + 1.6 + 1.3 * Math.cos(a * 9);
      const r = radius / edge;
      vertices.push(x,height(x,z),z);
      const color = inner.clone().lerp(outer, .18 + .65 * (.5 + .5 * Math.sin(x*.081+z*.12)))
        .lerp(stoneColor, Math.min(1,Math.max(0,(r-.84)/.16))).multiplyScalar(.85 + .14 * random());
      colors.push(color.r,color.g,color.b);
      const here = row * stride + col;
      if (row && col && r < 1.014) {
        triangles.push(here-stride-1,here-1,here-stride,here-stride,here-1,here);
      }
    }
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
  geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  geo.setIndex(triangles);
  const normals = [];
  for (let i = 0; i < vertices.length; i += 3) {
    const x = vertices[i], z = vertices[i + 2];
    const normal = new T.Vector3(height(x - .25,z) - height(x + .25,z), .5,
      height(x,z - .25) - height(x,z + .25)).normalize();
    normals.push(normal.x, normal.y, normal.z);
  }
  geo.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
  model(scene,geo,material('#ffffff',{vertexColors:true}),0,0,0);
}
ground();

const clouds = new T.ShaderMaterial({
  uniforms:{time:{value:0}},
  vertexShader:'varying vec2 world; void main(){world=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`uniform float time; varying vec2 world;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float noise(vec2 p){vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
  void main(){vec2 p=world*.038+vec2(time*.055,time*.025);
  float n=noise(p)*.56+noise(p*2.1)*.29+noise(p*4.)*.15;
  float rim=clamp(length(world)/220.,0.,1.);
  gl_FragColor=vec4(mix(vec3(.105,.133,.235),vec3(.47,.47,.63),smoothstep(.31,.77,n)*(.81-rim*.36)),1.);
  }`
});
model(scene,new T.PlaneGeometry(650,650),clouds,0,-5,0).rotation.x = -Math.PI / 2;
for (let i=0;i<34;i++) {
  const a=random()*Math.PI*2, r=106+random()*72;
  sprite(scene,Math.cos(a)*r,1+random()*7,Math.sin(a)*r,29+random()*38,8+random()*13,'#a2aacd',.24,false);
}

const batches = new Map();
function prop(name, geometry, surface, x, y, z, sx, sy, sz, angle) {
  if (!batches.has(name)) batches.set(name,{geometry,surface,matrices:[]});
  const rotation = new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),angle);
  batches.get(name).matrices.push(new T.Matrix4().compose(new T.Vector3(x,y,z),rotation,new T.Vector3(sx,sy,sz)));
}
const paths = island.lanterns.map(({pos:[x,,z]},i) => new T.CatmullRomCurve3([
  new T.Vector3(0,0,0),new T.Vector3(.37*x+7*Math.cos(i),0,.38*z+7*Math.sin(i)),
  new T.Vector3(.70*x-5*Math.sin(i),0,.72*z),new T.Vector3(x,0,z)
]));
const trail = paths.flatMap(path => path.getPoints(35));
const materialPath=material('#a49391',{flatShading:true});
for (const p of trail) {
  for (let j=0;j<3;j++) {
    const x=p.x+(random()-.5)*3.6,z=p.z+(random()-.5)*3.6;
    prop('path',stone,materialPath,x,height(x,z)+.035,z,.31+random()*.52,.10,.32+random()*.37,random()*6.28);
  }
}
function scatter() {
  const trunk = new T.CylinderGeometry(.14,.3,1,7);
  const pine = [material('#255551'),material('#33726c'),material('#427b71')];
  const blossom = material('#a56692',{roughness:1,flatShading:true});
  const grass = material('#54866a',{side:T.DoubleSide});
  for(let i=0;i<1200;i++){
    const a=random()*6.283,r=Math.sqrt(random())*(island.radius-2);
    const x=Math.cos(a)*r,z=Math.sin(a)*r;
    if (trail.some(p=>Math.hypot(x-p.x,z-p.z)<3.5) ||
        island.lanterns.some(l=>Math.hypot(x-l.pos[0],z-l.pos[2])<10)) continue;
    const y=height(x,z), size=.6+random()*1.65, v=random();
    if(v<.19) {
      prop('rocks',stone,graphite,x,y+size*.25,z,size,size*.74,size*.81,random()*6);
    } else if(v<.59) {
      prop('trunks',trunk,timber,x,y+size*1.25,z,size,size*2.5,size,0);
      for(let j=0;j<3;j++){
        const width=size*(1.36-j*.25);
        prop('pine'+j,needle,pine[j],x,y+size*(1.85+j*.75),z,width,size*1.85,width,random()*6);
      }
    } else if(v<.68 && x>28){
      prop('trunks',trunk,timber,x,y+size*1.02,z,size,size*2.04,size,0);
      for(let j=0;j<4;j++){
        const a=j*Math.PI/2;
        prop('blossoms',stone,blossom,x+Math.cos(a)*size*.68,y+size*(2.12+j*.13),z+Math.sin(a)*size*.68,size*.95,size*.72,size*.95,a);
      }
    } else {
      prop('grass',needle,grass,x,y+.37,z,.17,.81,.17,random()*6);
    }
  }
  for(const {geometry,surface,matrices} of batches.values()){
    const mesh=new T.InstancedMesh(geometry,surface,matrices.length);
    matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));
    scene.add(mesh);
  }
}
scatter();

const cliff = material('#3e3c56',{flatShading:true});
const needleRidge = new T.CylinderGeometry(.36,1,1,7);
for (let i=0;i<82;i++) {
  const a=i/82*Math.PI*2;
  const r=island.radius+1.5+random()*2.8;
  const x=Math.cos(a)*r,z=Math.sin(a)*r;
  const ledge=model(scene,needleRidge,cliff,x,-3.4-random()*1.5,z,2.2+random()*1.2,5+random()*4,2.1+random()*1.3);
  ledge.rotation.z=(random()-.5)*.55;
}
for (const [x,z] of [[-69,-48],[-57,53],[47,-62],[73,33],[-5,85]]) {
  for (let i=0;i<5;i++) {
    const a=i/5*Math.PI*2;
    const px=x+Math.cos(a)*4.9,pz=z+Math.sin(a)*4.5;
    const span=5.1+random()*5.2;
    const monolith=model(scene,needleRidge,cliff,px,height(px,pz)+span*.42,pz,1.6+random(),span,1.5+random());
    monolith.rotation.z=(random()-.5)*.32;
  }
}

function pagoda(x,z,index) {
  const group=new T.Group();
  scene.add(group);
  group.position.set(x,height(x,z),z);
  group.rotation.y=index*.39;
  const cylinder=new T.CylinderGeometry(1,1,1,12);
  for(let j=0;j<3;j++) model(group,cylinder,graphite,0,.17+j*.3,0,4.2-j*.69,.31,4.2-j*.69);
  for(const a of [-1,1]) for(const b of [-1,1]) {
    model(group,cube,timber,2*a,2.3,2*b,.36,3.7,.36);
    model(group,cube,trim,2*a,3.85,2*b,.49,.40,.49);
  }
  model(group,cube,trim,0,4.16,0,5.5,.28,5.5);
  for(let j=0;j<3;j++) {
    const roof=model(group,new T.CylinderGeometry(1.0-j*.23,3.85-j*.87,1.05,4),tile,0,4.78+j*.83,0);
    roof.rotation.y=Math.PI/4;
  }
  model(group,orb,gold,0,7,0,.24,.48,.24);
  for (const a of [-1,1]) for (const b of [-1,1]) {
    const flourish=model(group,stone,trim,a*2.53,4.62,b*2.53,.62,.25,.21);
    flourish.rotation.z=a*.36;
    flourish.rotation.y=-a*b*Math.PI/4;
    model(group,cube,gold,a*2.62,3.98,b*2.62,.033,.67,.033);
    model(group,orb,amber,a*2.62,3.62,b*2.62,.18,.23,.18);
    sprite(group,a*2.62,3.62,b*2.62,2.1,2.1,'#ffc07d',.53);
  }
  const heart=model(group,new T.CylinderGeometry(.91,.73,1.55,10),lampDark,0,2.67,0);
  for(let j=0;j<10;j++){
    const a=j*Math.PI/5;
    model(group,cube,gold,Math.cos(a)*.81,2.66,Math.sin(a)*.81,.055,1.55,.055);
  }
  const halo=sprite(group,0,2.61,0,8,8,'#bd77e7',.23);
  const disk=model(group,new T.RingGeometry(8.9,9.04,72),flat('#ffc47d',{transparent:true,opacity:.55,side:T.DoubleSide}),0,.08,0);
  disk.rotation.x=-Math.PI/2;
  disk.visible=false;
  return {group,heart,halo,disk};
}
const shrines=island.lanterns.map((l,i)=>pagoda(l.pos[0],l.pos[2],i));
for(const path of paths) {
  for(const n of [.25,.55,.77]){
    const p=path.getPoint(n);
    const x=p.x+2.4,z=p.z-1.1,y=height(x,z);
    model(scene,cube,timber,x,y+.67,z,.19,1.34,.19);
    model(scene,cube,amber,x,y+1.38,z,.38,.35,.38);
    sprite(scene,x,y+1.38,z,3.5,3.5,'#ffb76b',.75);
  }
}

const avatar=new T.Group();
scene.add(avatar);
const actor=new T.Group();
avatar.add(actor);
actor.scale.setScalar(1.12);
const hatMaterial=material('#c79654',{side:T.DoubleSide});
const shadow=model(avatar,new T.CircleGeometry(1.18,32),flat('#20182d',{transparent:true,opacity:.47}),0,.06,0,1,.65,1);
shadow.rotation.x=-Math.PI/2;
model(actor,new T.CylinderGeometry(.36,.82,1.12,12),blue,0,1.34,0,.95,1,.64);
model(actor,new T.CylinderGeometry(.51,.67,.15,12),crimson,0,1.09,0,1,1,.66);
model(actor,new T.CylinderGeometry(.49,.66,.065,12),gold,0,1.02,0,1,1,.67);
model(actor,orb,ink,0,2.22,.12,.48,.54,.48);
model(actor,orb,skin,0,2.20,-.16,.39,.39,.35);
for(const x of [-.13,.13]) model(actor,orb,ink,x,2.24,-.486,.035,.050,.022);
model(actor,orb,crimson,0,1.93,0,.50,.15,.40);
const hat=model(actor,new T.ConeGeometry(.98,.52,36,1,true),hatMaterial,0,2.76,0);
hat.rotation.z=-.13;
const brim=model(actor,new T.TorusGeometry(.96,.035,8,36),gold,.035,2.50,0);
brim.rotation.x=Math.PI/2;
brim.rotation.y=-.13;
model(actor,orb,crimson,.10,2.99,0,.095,.09,.09);
const sash=model(actor,cube,crimson,.16,1.50,.44,.19,.86,.055);
sash.rotation.z=.32;
const tails=[-.15,.13].map((x,i)=>model(actor,cube,crimson,x,1.78,.60+i*.07,.16,.055,.56+i*.14));
const legs=[-.25,.25].map(x=>{
  const limb=new T.Group();
  limb.position.set(x,.95,0);
  actor.add(limb);
  model(limb,cube,ink,0,-.32,0,.27,.62,.26);
  model(limb,orb,timber,0,-.78,-.10,.19,.15,.29);
  return limb;
});
for(const side of [-1,1]){
  const sleeve=model(actor,orb,blue,side*.53,1.57,-.04,.24,.36,.26);
  sleeve.rotation.z=side*.36;
  model(actor,orb,skin,side*.64,1.28,-.09,.13,.16,.13);
}
const hanging=new T.Group();
hanging.position.set(.83,2.54,0);
actor.add(hanging);
model(hanging,cube,timber,0,-.29,0,.033,.59,.033);
model(hanging,new T.CylinderGeometry(.16,.125,.36,9),amber,0,-.66,0);
model(hanging,new T.CylinderGeometry(.13,.20,.10,9),timber,0,-.44,0);
model(hanging,new T.CylinderGeometry(.13,.13,.075,9),gold,0,-.87,0);
sprite(hanging,0,-.64,0,4,4,'#ffab63',.87);
const carriedLight=new T.PointLight('#ffb170',47,13,2);
scene.add(carriedLight);
const pulseRing=model(scene,new T.RingGeometry(.90,1,64),flat('#ffc879',{transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false}),0,.35,0);
pulseRing.rotation.x=-Math.PI/2;
let pulseAge=1;

function mote() {
  const g=new T.Group();
  scene.add(g);
  model(g,orb,amber,0,0,0,.16,.24,.16);
  sprite(g,0,0,0,2.8,2.8,'#ffd66a',.88);
  return g;
}
function shade() {
  const g=new T.Group();
  scene.add(g);
  model(g,orb,material('#191225'),0,.28,0,.77,.95,.66);
  for(const side of [-1,1]){
    model(g,orb,flat('#f994fb'),side*.26,.49,.55,.09,.15,.09);
    model(g,orb,material('#312044'),side*.65,-.16,0,.37,.55,.37);
  }
  const halo=sprite(g,0,.28,-.45,5.2,5.2,'#a058f0',.67);
  return {g,halo};
}

let game=createGame();
let moteScenes=new Map(), shadeScenes=new Map();
const aim=new T.Vector3(0,0,-6);
const offset=new T.Vector3(0,37,38);
const keys=new Set();
const bindings=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyE','KeyQ','KeyR']);
const actions={jump:false,interact:false,pulse:false};
const keyActions={Space:'jump',KeyE:'interact',KeyQ:'pulse'};
const pointer=new T.Raycaster();
const plane=new T.Plane(new T.Vector3(0,1,0),0);
let target=null;

function reset(){
  for(const m of moteScenes.values()) scene.remove(m);
  for(const s of shadeScenes.values()) scene.remove(s.g);
  moteScenes=new Map();
  shadeScenes=new Map();
  game=createGame();
  keys.clear();
  for(const key of Object.keys(actions)) actions[key]=false;
  aim.set(0,0,-6);
  pulseAge=1;
  target=null;
  ui.ending.hidden=true;
}
ui.restart.addEventListener('click',reset);
addEventListener('keydown',e=>{
  if(!bindings.has(e.code))return;
  e.preventDefault();
  if(e.code==='KeyR'&&game.state!=='playing'){reset();return;}
  keys.add(e.code);
  if(keyActions[e.code]&&!e.repeat)actions[keyActions[e.code]]=true;
  if(!keyActions[e.code])target=null;
});
addEventListener('keyup',e=>keys.delete(e.code));
addEventListener('blur',()=>keys.clear());
renderer.domElement.addEventListener('pointerdown',e=>{
  if(e.button!==0||game.state!=='playing')return;
  pointer.setFromCamera(new T.Vector2(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2),camera);
  target=pointer.ray.intersectPlane(plane,new T.Vector3());
  if(target&&target.length()>island.radius)target.setLength(island.radius);
});
const mobile=matchMedia('(pointer: coarse)');
for(const [id,key] of [['jump','jump'],['interact','interact'],['pulse','pulse']]){
  ui[id].addEventListener('click',()=>{actions[key]=true;});
}

function resize(){
  camera.aspect=innerWidth/innerHeight;
  renderer.setSize(innerWidth,innerHeight);
  camera.updateProjectionMatrix();
}
addEventListener('resize',resize);
resize();
const key=(a,b)=>Number(keys.has(a)||keys.has(b));
const cameraYaw=Math.atan2(offset.x,offset.z)*180/Math.PI;
const radians=cameraYaw*Math.PI/180;
let previous=performance.now(),accumulator=0;
let walking=false;
const nav=ui.map.getContext('2d');
function map(){
  const size=ui.map.width, mid=size/2, scale=(mid-14)/island.radius;
  nav.clearRect(0,0,size,size);
  nav.beginPath();nav.arc(mid,mid,mid-7,0,Math.PI*2);
  nav.fillStyle='#17192ce8';nav.fill();nav.strokeStyle='#c9abd356';nav.stroke();
  for(const path of paths){
    nav.beginPath();
    path.getPoints(16).forEach(p=>nav.lineTo(mid+p.x*scale,mid+p.z*scale));
    nav.strokeStyle='#dfc2bd40';nav.stroke();
  }
  game.lanterns.forEach(l=>{
    nav.beginPath();nav.arc(mid+l.pos[0]*scale,mid+l.pos[2]*scale,4.5,0,Math.PI*2);
    nav.fillStyle=l.lit?'#ffc671':'#bf91ee';nav.fill();
  });
  nav.beginPath();nav.arc(mid+game.player.pos[0]*scale,mid+game.player.pos[2]*scale,4,0,Math.PI*2);
  nav.fillStyle='#dcfff7';nav.fill();
}

function populate(time){
  for(const m of game.motes){
    if(!moteScenes.has(m.id))moteScenes.set(m.id,mote());
    const g=moteScenes.get(m.id);
    g.position.set(m.pos[0],height(m.pos[0],m.pos[2])+.93+Math.sin(time*3+m.pos[0])*.22,m.pos[2]);
  }
  const active=new Set(game.motes.map(m=>m.id));
  for(const [id,g] of moteScenes) if(!active.has(id)){scene.remove(g);moteScenes.delete(id);}
  for(const s of game.shades){
    if(!shadeScenes.has(s.id))shadeScenes.set(s.id,shade());
    const {g,halo}=shadeScenes.get(s.id);
    g.position.set(s.pos[0],height(s.pos[0],s.pos[2])+1.27+Math.cos(time*3+s.pos[0])*.26,s.pos[2]);
    g.lookAt(camera.position.x,g.position.y,camera.position.z);
    halo.material.opacity=s.state==='stunned'?.23:.67;
  }
}

const shrineLight=new T.PointLight('#ffad68',115,26,2);
scene.add(shrineLight);
renderer.setAnimationLoop(now=>{
  const dt=Math.min(Math.max(0,(now-previous)/1000),.067);
  previous=now;
  const time=now/1000;
  accumulator+=dt;
  let x=key('KeyD','ArrowRight')-key('KeyA','ArrowLeft');
  let z=key('KeyS','ArrowDown')-key('KeyW','ArrowUp');
  let yaw=cameraYaw;
  if(target&&!x&&!z){
    x=target.x-game.player.pos[0];z=target.z-game.player.pos[2];
    const length=Math.hypot(x,z);
    if(length<.4){target=null;x=z=0;}else{x/=length;z/=length;yaw=0;}
  }
  walking=Boolean((x||z)&&game.state==='playing');
  while(accumulator>=1/60){
    const input={...idleInput,move:[x,z],cam_yaw_deg:yaw};
    for(const action of Object.keys(actions)){
      input[action]=actions[action]&&!game.previous[action];
      if(input[action])actions[action]=false;
    }
    for(const e of step(game,input)){
      if(e.name==='pulse')pulseAge=0;
    }
    accumulator-=1/60;
  }
  const [px,py,pz]=game.player.pos, groundY=height(px,pz);
  avatar.position.set(px,groundY,pz);
  actor.position.y=py+(walking?Math.sin(time*17)**2*.05:0);
  if(walking){
    const theta=yaw===0?0:radians;
    const angle=Math.atan2(-(x*Math.cos(theta)+z*Math.sin(theta)),-(-x*Math.sin(theta)+z*Math.cos(theta)));
    const d=angle-actor.rotation.y;
    actor.rotation.y+=Math.atan2(Math.sin(d),Math.cos(d))*(1-Math.exp(-dt*16));
  }
  legs.forEach((leg,i)=>{leg.rotation.x=walking?Math.sin(time*15+i*Math.PI)*.58:0;});
  tails.forEach((tail,i)=>{tail.rotation.x=Math.sin(time*5+i)*.17+.11;});
  hanging.rotation.x=Math.sin(time*7)*(walking?.23:.07);
  hanging.rotation.z=Math.cos(time*6)*(walking?.21:.06);
  actor.visible=game.tick>=game.invulnerableUntil||Math.floor(game.tick/5)%2===0;
  carriedLight.position.set(px,groundY+py+2.4,pz);
  aim.lerp(new T.Vector3(px,0,pz-5),1-Math.exp(-dt*5));
  camera.position.copy(aim).addScaledVector(offset,camera.aspect<.74?1.21:1);
  camera.lookAt(aim);
  const lit=game.lanterns.filter(l=>l.lit);
  ambient.intensity=2+lit.length*.22;
  for(const [i,l] of game.lanterns.entries()){
    const s=shrines[i];
    s.heart.material=l.lit?amber:lampDark;
    s.halo.material.color.set(l.lit?'#ffb069':'#bd77e7');
    s.halo.material.opacity=l.lit?.94:.25;
    s.halo.scale.setScalar(l.lit?15:8);
    s.disk.visible=l.lit;
  }
  const closest=lit.toSorted((a,b)=>Math.hypot(a.pos[0]-px,a.pos[2]-pz)-Math.hypot(b.pos[0]-px,b.pos[2]-pz))[0];
  shrineLight.visible=Boolean(closest);
  if(closest)shrineLight.position.set(closest.pos[0],4,closest.pos[2]);
  populate(time);
  pulseAge+=dt;
  pulseRing.visible=pulseAge<.65;
  pulseRing.position.set(px,groundY+.42,pz);
  pulseRing.scale.setScalar(Math.max(.2,pulseAge/.65*tuning.pulse_radius));
  pulseRing.material.opacity=Math.max(0,1-pulseAge/.65);
  clouds.uniforms.time.value=time;
  const near=game.lanterns.find(l=>!l.lit&&Math.hypot(l.pos[0]-px,l.pos[2]-pz)<=tuning.interact_radius);
  ui.objective.textContent=near
    ? island.lanterns.find(l=>l.id===near.id).name+' · '+near.deposited+'/'+tuning.lantern_cost+
      (game.player.carried?' · '+(mobile.matches?'Bấm Nạp đèn':'E để nạp'):' · Cần đom đóm')
    : 'Gom đom đóm và thắp sáng năm ngôi đền.';
  ui.lights.textContent=lit.length+' / 5';
  ui.motes.textContent=game.player.carried+' / '+tuning.carry_capacity;
  ui.flames.textContent=game.player.flames+' / '+tuning.flames;
  ui.score.textContent=game.score;
  const seconds=Math.ceil(timeLeft(game));
  ui.time.textContent=Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');
  if(game.state!=='playing'&&ui.ending.hidden){
    ui.result.textContent=game.state==='won'?'Đảo Bến đã sáng':'Đêm đã khép lại';
    ui.summary.textContent='Điểm của bạn · '+game.score;
    ui.ending.hidden=false;
  }
  map();
  renderer.render(scene,camera);
});
