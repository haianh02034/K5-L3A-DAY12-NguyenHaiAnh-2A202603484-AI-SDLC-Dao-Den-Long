import * as T from 'three';
import { maps, surface } from './maps.mjs';
import { createAudio } from './audio.mjs';
import { createPulseDragons } from './pulse-dragons.mjs';
import { canReceive, capacity, isSafe, isWeak, lightCost, fullFuel } from './lanterns.mjs';

const route=location.hash.slice(1);
const practice=route.startsWith('test-');
const night=Number(route.replace('test-',''))||1;
const island = maps[night-1] ?? maps[0];
const nightNumber = maps.indexOf(island)+1;
const floor = (x,z) => surface(nightNumber,x,z);
import { slideMovement } from './collision.mjs';
import { createGame, idleInput, seeded, step, timeLeft, tuning } from './game.mjs';

const scene = new T.Scene();
scene.background = new T.Color('#0E1430');
scene.fog = new T.FogExp2('#1B2350', 0.008);
const camera = new T.PerspectiveCamera(42, 1, 0.1, 550);
const ui = Object.fromEntries([...document.querySelectorAll('[id]')].map(e => [e.id, e]));
let renderer;
try {
  renderer = new T.WebGLRenderer({ powerPreference:'high-performance', antialias:false });
} catch (error) {
  ui.objective.textContent = 'Trình duyệt cần WebGL 2 để mở game.';
  throw error;
}
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.39;
document.body.prepend(renderer.domElement);
const random = seeded(island.seed);
const material = (color, extra = {}) => new T.MeshStandardMaterial({ color, roughness: 0.77, ...extra });
const flat = (color, extra = {}) => new T.MeshBasicMaterial({ color, ...extra });
const cube = new T.BoxGeometry();
const orb = new T.SphereGeometry(1, 24, 14);
const stone = new T.DodecahedronGeometry(1, 0);
const needle = new T.ConeGeometry(1, 1, 8);
const timber = material('#6B4A2F');
const tile = material('#295064', {metalness: 0.23});
const trim = material('#a15a49', {metalness: 0.25});
const graphite = material('#53617a', {flatShading: true});
const amber = flat('#FFE9B0', {toneMapped:false});
const blue = material('#E8E2D0');
const crimson = material('#C8102E');
const ink = material('#27233a');
const skin = material('#dca282');
const gold = material('#F2C14E', {metalness: 0.35});
const lampDark = material('#5B5F6E', {emissive:'#333644', emissiveIntensity:0.48});
const ambient = new T.HemisphereLight('#b5bcff','#534051', 0.15);
scene.add(ambient);
const moon = new T.DirectionalLight('#b7c9ff', 1.45);
moon.position.set(-30, 42, 17);
scene.add(moon);
const fill=new T.DirectionalLight('#dbdefe',.52);
fill.position.set(9,24,-30);
scene.add(fill);
const reflectedLight=new T.DirectionalLight('#b9b5ea',.67);
reflectedLight.position.set(13,8,26);
scene.add(reflectedLight);

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
  const y=floor(x,z);
  return Number.isFinite(y)?y:0;
}
const turfCanvas=document.createElement('canvas');
turfCanvas.width=turfCanvas.height=192;
const turfContext=turfCanvas.getContext('2d');
const turfRandom=seeded(island.seed+71);
turfContext.fillStyle='#d8d8d8';
turfContext.fillRect(0,0,192,192);
for(let i=0;i<115;i++){
  const x=turfRandom()*192,y=turfRandom()*192,r=5+turfRandom()*26;
  const shade=Math.floor(122+turfRandom()*115);
  for(const dx of [-192,0,192])for(const dy of [-192,0,192]){
    const gradient=turfContext.createRadialGradient(x+dx,y+dy,0,x+dx,y+dy,r);
    gradient.addColorStop(0,'rgba('+shade+','+shade+','+shade+',.32)');
    gradient.addColorStop(1,'rgba('+shade+','+shade+','+shade+',0)');
    turfContext.fillStyle=gradient;
    turfContext.fillRect(x+dx-r,y+dy-r,r*2,r*2);
  }
}
const turfTexture=new T.CanvasTexture(turfCanvas);
turfTexture.colorSpace=T.SRGBColorSpace;
turfTexture.wrapS=turfTexture.wrapT=T.RepeatWrapping;
turfTexture.repeat.set(3,3);
const turf=material('#2F5D50',{map:turfTexture});
const sand=material('#C9B48A');
const rockWall=material('#47485e',{flatShading:true});
for(const {x,radius} of island.zones){
  model(scene,new T.CylinderGeometry(radius,radius*.94,7,96),rockWall,x,-3.5,0);
  const top=model(scene,new T.CircleGeometry(radius,96),turf,x,.006,0);
  top.rotation.x=-Math.PI/2;
  const rim=model(scene,new T.RingGeometry(radius-.46,radius,96),sand,x,.012,0);
  rim.rotation.x=-Math.PI/2;
}
if(nightNumber===2){
  const bamboo=new T.CylinderGeometry(.18,.18,1,8);
  for(let x=26;x<=44;x+=.38){
    model(scene,bamboo,timber,x,-.18,0,1,4,1).rotation.x=Math.PI/2;
  }
}
if(nightNumber===3){
  model(scene,new T.CylinderGeometry(8,8,6,64),rockWall,0,3,0);
  model(scene,new T.CircleGeometry(8,64),material('#7a6952'),0,6.013,0).rotation.x=-Math.PI/2;
  model(scene,new T.RingGeometry(12,24,64,1,Math.PI,Math.PI),material('#4c7472',{map:turfTexture}),0,3.012,0).rotation.x=-Math.PI/2;
  for(const [radius,y,half,color] of [[8,6,false,'#f6cf76'],[12,3,true,'#73cfde'],[24,3,true,'#73cfde']]){
    model(scene,new T.RingGeometry(radius-.12,radius+.045,72,1,half?Math.PI:0,half?Math.PI:Math.PI*2),
      flat(color,{toneMapped:false}),0,y+.045,0).rotation.x=-Math.PI/2;
  }
  for(const r of [12,24]){
    model(scene,new T.CylinderGeometry(r,r,3,64,1,true,0,Math.PI),new T.MeshStandardMaterial({
      color:'#47485e',side:T.DoubleSide
    }),0,1.50,0);
  }
  for(const degrees of [30,150]){
    const theta=degrees*Math.PI/180;
    const coords=[];
    for(const [r,v,y] of [[24,-1.5,3.01],[24,1.5,3.01],[30,-1.5,.01],[30,1.5,.01]]){
      coords.push(r*Math.cos(theta)-v*Math.sin(theta),y,r*Math.sin(theta)+v*Math.cos(theta));
    }
    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.Float32BufferAttribute(coords,3));
    geo.setIndex([0,1,2,1,3,2]);geo.computeVertexNormals();
    model(scene,geo,new T.MeshStandardMaterial({color:'#C9B48A',side:T.DoubleSide}),0,0,0);
    for(const side of [-1,1]){
      const start=new T.Vector3(30*Math.cos(theta)-side*1.45*Math.sin(theta),.09,30*Math.sin(theta)+side*1.45*Math.cos(theta));
      const end=new T.Vector3(24*Math.cos(theta)-side*1.45*Math.sin(theta),3.09,24*Math.sin(theta)+side*1.45*Math.cos(theta));
      const mid=start.clone().lerp(end,.5);
      const trim=model(scene,cube,flat('#ffe2a0',{toneMapped:false}),mid.x,mid.y,mid.z,.10,.10,start.distanceTo(end));
      trim.lookAt(end);
    }
  }
  model(scene,new T.CylinderGeometry(1.6,2,8,12),rockWall,0,10,0);
  model(scene,new T.ConeGeometry(2.7,1.6,8),tile,0,14.8,0);
  model(scene,new T.CylinderGeometry(.75,1.03,1.2,12),gold,0,13.5,0);
}
const padMarkers=[];
for(const {pos:[x,y,z]} of island.pads){
  const pad=model(scene,new T.CylinderGeometry(1,.88,.14,24),tile,x,y+.07,z);
  const mark=model(scene,new T.RingGeometry(.76,.94,36),flat('#F2C14E'),0,.081,0,1,1,1,pad);
  mark.rotation.x=-Math.PI/2;
  sprite(scene,x,y+.5,z,5,4,'#58eaff',.73);
  const signal=new T.Group();
  scene.add(signal);signal.position.set(x,y+.52,z);
  const tube=new T.TorusGeometry(.65,.050,6,24);
  for(let j=0;j<3;j++)model(signal,tube,flat('#98ffff',{toneMapped:false}),0,j*.34,0).rotation.x=-Math.PI/2;
  const arrow=model(signal,new T.ConeGeometry(.31,.53,4),flat('#e1ffff',{toneMapped:false}),0,1.25,0);
  arrow.rotation.y=Math.PI/4;
  padMarkers.push({signal,y});

}

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
  gl_FragColor=vec4(mix(vec3(.071,.220,.290),vec3(.22,.35,.48),smoothstep(.31,.77,n)*(.81-rim*.36)),1.);
  }`
});
const cloudPlane=model(scene,new T.PlaneGeometry(650,650),clouds,0,-12,0);
cloudPlane.rotation.x=-Math.PI/2;
const flatClouds=flat('#12384A');
for (let i=0;i<34;i++) {
  const a=random()*Math.PI*2, r=106+random()*72;
  sprite(scene,Math.cos(a)*r,1+random()*7,Math.sin(a)*r,29+random()*38,8+random()*13,'#a2aacd',.24,false);
}

const obstacles = [];
function addObstacle(x,z,radius,clearance) {
  obstacles.push({x,z,radius:radius+.32,clearance});
}
const canMove = (...movement) => slideMovement(obstacles, ...movement);
const batches = new Map();
const treeBatches=[];
const hiddenTreeMatrix=new T.Matrix4().makeScale(0,0,0);
function prop(name, geometry, surface, x, y, z, sx, sy, sz, angle, tree=null) {
  if (!batches.has(name)) batches.set(name,{geometry,surface,matrices:[],trees:[]});
  batches.get(name).trees.push(tree);
  const rotation = new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),angle);
  batches.get(name).matrices.push(new T.Matrix4().compose(new T.Vector3(x,y,z),rotation,new T.Vector3(sx,sy,sz)));
}
const paths = island.lanterns.map(({pos:[x,,z]},i) => new T.CatmullRomCurve3([
  new T.Vector3(0,0,0),new T.Vector3(.37*x+(i ? 7*Math.cos(i) : 0),0,.38*z+7*Math.sin(i)),
  new T.Vector3(.70*x-5*Math.sin(i),0,.72*z),new T.Vector3(x,0,z)
]));
const trail = paths.flatMap(path => path.getPoints(35));
const materialPath=material('#C9B48A',{flatShading:true});
for (const p of trail) {
  for (let j=0;j<3;j++) {
    const x=p.x+(random()-.5)*3.6,z=p.z+(random()-.5)*3.6;
    if(!Number.isFinite(floor(x,z)))continue;
    prop('path',stone,materialPath,x,height(x,z)+.035,z,.31+random()*.52,.10,.32+random()*.37,random()*6.28);
  }
}
function scatter() {
  const trunk = new T.CylinderGeometry(.12,.27,1,7);
  const leaf = new T.IcosahedronGeometry(1,0);
  const palettes = [
    ['#28564b','#4b8b66','#7cab78'], ['#60334c','#b36281','#e498a5'],
    ['#77523d','#ca934f','#ecc37d']
  ].map(colors=>colors.map(color=>material(color,{flatShading:true})));
  const herbs = ['#487761','#686b84','#8c9c55'].map(color=>material(color,{flatShading:true}));
  const flowers = ['#f1abb7','#e7be76','#bd9de5','#f8d7ae'].map(color=>material(color,{emissive:color,emissiveIntensity:.18}));
  for(let i=0;i<(nightNumber===2?1440:920);i++){
    const zone=island.zones[i%island.zones.length];
    const a=random()*6.283,r=Math.sqrt(random())*(zone.radius-2);
    const x=zone.x+Math.cos(a)*r,z=Math.sin(a)*r;
    const byTrail=trail.some(p=>Math.hypot(x-p.x,z-p.z)<2.7);
    const byShrine=island.lanterns.some(l=>Math.hypot(x-l.pos[0],z-l.pos[2])<6.4);
    const byLandmark=[...island.pads.map(p=>p.pos),...island.charms].some(p=>Math.hypot(x-p[0],z-p[2])<3.5);
    if(byShrine||byLandmark||Math.hypot(x-(island.spawn?.[0]??0),z-(island.spawn?.[2]??0))<3.5||(nightNumber===3&&height(x,z)>0)) continue;
    const y=height(x,z), size=.64+random()*1.40, v=random();
    if(!byTrail && v<.15) {
      const lift=.35+size*.15;
      prop('rocks',stone,graphite,x,y+lift*.28,z,size*.75,lift,size*.62,random()*6);
      if(size>1.53)addObstacle(x,z,size*.50,lift*1.22);
    } else if(!byTrail && v<.57){
      const theme=(x>18&&z>-15)||Math.sin(x*.18+z*.08)>.6 ? 1 : (z>12&&Math.cos(z*.17)>.02 ? 2 : 0);
      const palette=palettes[theme];
      const tree={x,y,z,trunkRadius:size*.23,height:size*2.5};
      prop('trunks',trunk,timber,x,y+size*1.25,z,size,size*2.5,size,0,tree);
      if(size>1.35&&i%3!==0)addObstacle(x,z,size*.23,Infinity);
      for(let j=0;j<3;j++){
        const width=size*(1.34-j*.25);
        if(theme===0){
          prop('pine'+j,needle,palette[j],x,y+size*(1.93+j*.78),z,width,size*1.70,width,random()*6,tree);
        }else{
          for(let branch=0;branch<3;branch++){
            const angle=branch*2.094+j*.77;
            prop('canopy'+theme+j,leaf,palette[j],x+Math.cos(angle)*width*.55,
              y+size*(1.93+j*.61),z+Math.sin(angle)*width*.55,width*.88,width*.75,width*.83,angle,tree);
          }
        }
      }
    } else {
      const tint=i%herbs.length;
      for(let j=0;j<3;j++){
        const px=x+(random()-.5)*1.4,pz=z+(random()-.5)*1.4;
        const dy=height(px,pz);
        prop('herb'+tint,leaf,herbs[tint],px,dy+.17,pz,.26+random()*.28,.24+random()*.24,.24+random()*.25,random()*6);
        if((i+j)%3===0){
          const hue=(i+j)%flowers.length;
          prop('bloom'+hue,leaf,flowers[hue],px,dy+.46,pz,.13,.12,.15,random()*6);
        }
      }
    }
  }
  for(const {geometry,surface,matrices,trees} of batches.values()){
    const mesh=new T.InstancedMesh(geometry,surface,matrices.length);
    matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));
    scene.add(mesh);
    if(trees.some(Boolean)){
      mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
      treeBatches.push({mesh,matrices,trees,hidden:new Uint8Array(trees.length)});
    }
  }
}
scatter();

let nextTreeUpdate=0;
function revealPlayer(now,x,y,z){
  if(now<nextTreeUpdate)return;
  nextTreeUpdate=now+70;
  for(const {mesh,matrices,trees,hidden} of treeBatches){
    let dirty=false;
    for(let i=0;i<trees.length;i++){
      const tree=trees[i],dx=tree.x-x,dz=tree.z-z;
      const contact=tree.trunkRadius+(hidden[i]?.50:.40);
      const withinTrunkHeight=y>=tree.y-.3&&y<=tree.y+tree.height;
      const mustHide=withinTrunkHeight&&dx*dx+dz*dz<=contact*contact?1:0;
      if(mustHide===hidden[i])continue;
      hidden[i]=mustHide;
      mesh.setMatrixAt(i,mustHide?hiddenTreeMatrix:matrices[i]);
      dirty=true;
    }
    if(dirty)mesh.instanceMatrix.needsUpdate=true;
  }
}

const cliff = material('#3e3c56',{flatShading:true});
const needleRidge = new T.CylinderGeometry(.36,1,1,7);
for(const zone of island.zones)for(let i=0;i<44;i++){
  const a=i/44*Math.PI*2, r=zone.radius+.64+random()*1.1;
  const x=zone.x+Math.cos(a)*r,z=Math.sin(a)*r;
  const ledge=model(scene,needleRidge,cliff,x,-4.5-random()*1.5,z,1.8+random(),5+random()*4,1.8+random());
  ledge.rotation.z=(random()-.5)*.46;
}

function pagoda(x,z,index) {
  const group=new T.Group();
  scene.add(group);
  group.position.set(x,height(x,z),z);
  group.rotation.y=index*.39;
  group.scale.setScalar(.68);
  const cylinder=new T.CylinderGeometry(1,1,1,12);
  for(let j=0;j<3;j++) model(group,cylinder,graphite,0,.17+j*.3,0,4.2-j*.69,.31,4.2-j*.69);
  for(const a of [-1,1]) for(const b of [-1,1]) {
    const local = new T.Vector3(a*2,0,b*2).applyAxisAngle(new T.Vector3(0,1,0),group.rotation.y);
    addObstacle(x+local.x,z+local.z,.28,Infinity);
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
  const paper=new T.Group();
  group.add(paper);paper.position.set(0,2.67,0);
  const heart=model(paper,new T.CylinderGeometry(.91,.73,1.55,10),lampDark,0,0,0);
  const tear=new T.Group();paper.add(tear);
  const tearMat=flat('#1d1722');
  for(const side of [-1,1])for(let i=0;i<3;i++){
    const cut=model(tear,cube,tearMat,.14-i*.105,.34-i*.21,side*(.819-i*.022),.072,.36,.055);
    cut.rotation.z=(i%2?.30:-.48)*side;
  }
  const meter=new T.Group();
  scene.add(meter);meter.position.set(x,height(x,z)+5.25,z);
  model(meter,cube,flat('#141421'),0,0,0,2.60,.31,.10);
  const fuelBar=model(meter,cube,flat('#ffe0a0',{toneMapped:false}),0,0,.065,2.48,.19,.04);
  meter.visible=false;
  for(let j=0;j<10;j++){
    const a=j*Math.PI/5;
    model(group,cube,gold,Math.cos(a)*.81,2.66,Math.sin(a)*.81,.055,1.55,.055);
  }
  const halo=sprite(group,0,2.61,0,8,8,'#bd77e7',.23);
  const disk=model(group,new T.RingGeometry(8.72,8.91,72),flat('#ffc47d',{transparent:true,opacity:.55,side:T.DoubleSide}),0,.08,0);
  disk.rotation.x=-Math.PI/2;
  disk.visible=false;
  const pool = model(group,new T.PlaneGeometry(27,27,16,16),flat('#ffb35a',{
    map:haloTexture, transparent:true, opacity:.62, depthWrite:false, blending:T.AdditiveBlending,
    polygonOffset:true, polygonOffsetFactor:-2, toneMapped:false
  }),0,.17,0);
  pool.rotation.x=-Math.PI/2;
  const terrain=pool.geometry.attributes.position;
  const angle=group.rotation.y;
  for(let i=0;i<terrain.count;i++){
    const lx=terrain.getX(i),lz=-terrain.getY(i);
    terrain.setZ(i,height(x+lx*Math.cos(angle)+lz*Math.sin(angle),z-lx*Math.sin(angle)+lz*Math.cos(angle))
      -group.position.y);
  }
  pool.visible=false;
  return {group,heart,paper,tear,meter,fuelBar,halo,disk,pool,lit:null};
}
const shrines=island.lanterns.map((l,i)=>pagoda(l.pos[0],l.pos[2],i));
for(const path of paths) {
  for(const n of [.25,.55,.77]){
    const p=path.getPoint(n);
    if(!Number.isFinite(floor(p.x,p.z))) continue;
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
const shoulders=[];
for(const side of [-1,1]){
  const plate=model(actor,stone,gold,side*.54,1.71,-.02,.29,.16,.28);
  plate.rotation.z=side*.24;
  shoulders.push(plate);
  model(actor,cube,ink,side*.29,1.38,-.37,.11,.53,.045).rotation.z=side*.3;
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
let pulseAge=2,pulseHits=[];
const dragons=createPulseDragons(scene);
const guardianAura=new T.Group();
scene.add(guardianAura);
const aureole=model(guardianAura,new T.TorusGeometry(1.02,.024,6,64),flat('#ffe1a5',{transparent:true,opacity:.65,
  blending:T.AdditiveBlending,depthWrite:false,toneMapped:false}),0,0,0);
aureole.rotation.x=-Math.PI/2;
const auraGlyphs=[];
const glyphShape=new T.OctahedronGeometry(.10);
const glyphInk=flat('#ffca78',{transparent:true,opacity:.8,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false});
for(let i=0;i<8;i++)auraGlyphs.push(model(guardianAura,glyphShape,glyphInk,0,0,0,.78,1.6,.78));
const seal=model(guardianAura,new T.RingGeometry(.73,.76,32),flat('#f4bd6f',{
  side:T.DoubleSide,transparent:true,opacity:.44,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false
}),0,.025,0);
seal.rotation.x=-Math.PI/2;
let viewDistance=32;

function mote() {
  const g=new T.Group();
  scene.add(g);
  model(g,orb,flat('#FFF6C2',{toneMapped:false}),0,0,0,.16,.24,.16);
  const wing=flat('#fff1c4',{transparent:true,opacity:.65});
  g.userData.wings=[-1,1].map(side=>model(g,orb,wing,side*.19,.03,0,.19,.034,.09));
  sprite(g,0,0,0,2.8,2.8,'#FFE58A',.88);
  return g;
}
const ninjaBlack=material('#120A1A');
const ninjaWrap=material('#292139',{flatShading:true});
const ninjaSteel=material('#aa8fb3',{metalness:.38,roughness:.31});
const ninjaEyes=flat('#7A3CFF',{toneMapped:false});
function shade() {
  const g=new T.Group();
  scene.add(g);
  const body=new T.Group();
  g.add(body);
  model(body,new T.CylinderGeometry(.46,.61,.95,8),ninjaBlack,0,1.22,0,.98,1,.67);
  model(body,new T.CylinderGeometry(.50,.55,.16,8),ninjaWrap,0,.94,0,1,1,.75);
  model(body,orb,ninjaBlack,0,2.09,.03,.51,.58,.45);
  model(body,orb,ninjaWrap,0,2.13,.36,.38,.17,.16);
  for(const side of [-1,1]){
    const eye=model(body,cube,ninjaEyes,.137*side,2.18,.505,.17,.035,.023);
    eye.rotation.z=.28*side;
    model(body,orb,ninjaBlack,.46*side,1.48,0,.23,.21,.26);
  }
  model(body,orb,ninjaBlack,0,2.03,.431,.42,.15,.115);
  const bladeArm=new T.Group();
  body.add(bladeArm);
  bladeArm.position.set(.49,1.38,.04);
  model(bladeArm,cube,ninjaWrap,.16,-.22,.19,.21,.53,.22).rotation.x=.68;
  const sword=new T.Group();
  bladeArm.add(sword);
  sword.position.set(.30,-.30,.42);
  sword.rotation.z=-.62;
  sword.rotation.x=-.34;
  model(sword,cube,ninjaBlack,0,-.08,0,.105,.33,.11);
  model(sword,cube,ninjaWrap,0,.11,0,.35,.08,.15);
  model(sword,cube,ninjaSteel,0,.70,0,.093,1.07,.041);
  model(sword,new T.ConeGeometry(.065,.22,4),ninjaSteel,0,1.34,0,1,1,.48);
  model(body,orb,ninjaBlack,-.59,1.19,.13,.16,.37,.18).rotation.z=-.55;
  const feet=[-.22,.22].map(x=>{
    const foot=new T.Group();
    foot.position.set(x,.84,0);
    body.add(foot);
    model(foot,cube,ninjaBlack,0,-.33,0,.24,.66,.25);
    model(foot,orb,ninjaWrap,0,-.65,.08,.15,.12,.24);
    return foot;
  });
  const scarf=model(body,cube,ninjaWrap,-.17,1.76,-.64,.18,.065,.90);
  const halo=sprite(g,0,1.17,-.48,5.4,5.4,'#7A3CFF',.37);
  return {g,halo,body,feet,scarf,bladeArm};
}

const read=(storage,key,fallback)=>{
  try{return window[storage].getItem(key)??fallback;}catch{return fallback;}
};
const write=(storage,key,value)=>{try{window[storage].setItem(key,String(value));}catch{}};
const settings={
  volume:Number(read('localStorage','island-volume',.45)),
  sensitivity:Number(read('localStorage','island-sensitivity',1)),
  accessible:read('localStorage','island-accessible','false')==='true',
};
const qualities={light:.65,balanced:.85,sharp:1.12};
const savedQuality=read('localStorage','island-quality','balanced');
settings.quality=Object.hasOwn(qualities,savedQuality)?savedQuality:'balanced';
const savedLimit=Number(read('localStorage','island-frame-limit',60));
settings.frameLimit=[0,30,60,120].includes(savedLimit)?savedLimit:60;
ui.quality.value=settings.quality;
ui['frame-limit'].value=settings.frameLimit;
ui.quality.addEventListener('change',()=>{
  settings.quality=ui.quality.value;
  write('localStorage','island-quality',settings.quality);
  resize();
});
ui['frame-limit'].addEventListener('change',()=>{
  settings.frameLimit=Number(ui['frame-limit'].value);
  write('localStorage','island-frame-limit',settings.frameLimit);
  nextFrameAt=0;
});
function applyColorMode(){
  document.documentElement.classList.toggle('accessible',settings.accessible);
  ninjaEyes.color.set(settings.accessible?'#00B3FF':'#7A3CFF');
}
ui['color-mode'].checked=settings.accessible;
ui['color-mode'].addEventListener('change',()=>{
  settings.accessible=ui['color-mode'].checked;
  write('localStorage','island-accessible',settings.accessible);
  applyColorMode();
});
applyColorMode();
const audio=createAudio(()=>settings.volume);
for(const id of ['volume','sensitivity']){
  ui[id].value=settings[id];
  ui[id].addEventListener('input',()=>{
    settings[id]=Number(ui[id].value);write('localStorage','island-'+id,settings[id]);
  });
}
let game=createGame(island.seed,{},nightNumber,true);
const campaignTotal=nightNumber===1||practice?0:Number(read('sessionStorage','island-score',0));
let moteScenes=new Map(), shadeScenes=new Map();
const drifterScenes=new Map();
const charmScenes=island.charms.map(([x,y,z])=>{
  const group=new T.Group();
  scene.add(group);group.position.set(x,y+.9,z);
  model(group,cube,flat('#F2C14E'),0,0,0,.6,.82,.07);
  model(group,cube,flat('#C8102E'),0,0,.045,.49,.71,.03);
  sprite(group,0,0,-.06,2.6,2.6,'#F2C14E',.53);
  return group;
});
const leaves=Array.from({length:24},()=>model(scene,stone,flat('#b9ac65'),0,0,0,.19,.05,.10));
const aim=new T.Vector3(game.player.pos[0],1,game.player.pos[2]-3);
const offset=new T.Vector3(0,26,30);
const keys=new Set();
const bindings=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight',
  'Space','KeyE','KeyQ','Escape','KeyP','ShiftLeft','ShiftRight']);
const actions={jump:false,interact:false,pulse:false,dash:false};
const keyActions={Space:'jump',KeyE:'interact',KeyQ:'pulse',ShiftLeft:'dash',ShiftRight:'dash'};
const pointer=new T.Raycaster();
const plane=new T.Plane(new T.Vector3(0,1,0),0);
let target=null;
let view=location.hash?'intro':'menu';
let settingsFrom='menu';
let yawDeg=0;
let lastCountdown=11;
let lastWind=false;
function show(name) {
  view=name;
  ui.signature.hidden=name!=='menu';
  for(const panel of ['menu','intro','breakscreen','settings','ending'])ui[panel].hidden=panel!==name;
  ui.hud.hidden=!['playing','breakscreen','ending'].includes(name);
  keys.clear();
  for(const key of Object.keys(actions))actions[key]=false;
}
function go(number,testMode=false){
  const url=new URL(location.href);
  url.hash=number?'#'+(testMode?'test-':'')+number:'';
  location.replace(url.href);
  location.reload();
}
function togglePause(){
  if(game.state!=='playing')return;
  if(view==='playing')show('breakscreen');
  else if(view==='breakscreen'){audio.start();show('playing');}
}
function reset(){
  for(const m of moteScenes.values())scene.remove(m);
  for(const s of shadeScenes.values())scene.remove(s.g);
  for(const d of drifterScenes.values())scene.remove(d);
  drifterScenes.clear();moteScenes=new Map();shadeScenes=new Map();
  game=createGame(island.seed,{},nightNumber,true);
  priorPosition=[...game.player.pos];nextHud=0;accumulator=0;
  aim.set(game.player.pos[0],1,game.player.pos[2]-3);target=null;pulseAge=2;lastCountdown=11;lastWind=false;
  ui.pause.hidden=false;
  show('playing');audio.start();
}
ui['intro-night'].textContent='Đêm '+nightNumber+' / 3';
ui['intro-title'].textContent=island.name;
ui['night-label'].textContent=(practice?'Thử đảo · ':'Đêm '+nightNumber+' · ')+island.name;
ui.quick.textContent=nightNumber===3?'Thử lại từ Đảo Bến':'Qua Đêm nhanh';
for(const number of [1,2,3])ui['practice-'+number].addEventListener('click',()=>go(number,true));
ui.quick.addEventListener('click',()=>go(nightNumber%3+1,true));
for(let i=0;i<20;i++){
  const slot=document.createElement('span');slot.className='slot';ui.slots.append(slot);
}
ui['new-game'].addEventListener('click',()=>{
  write('sessionStorage','island-score',0);audio.start();show('intro');
});
for(const from of ['menu','pause']){
  ui[from+'-settings'].addEventListener('click',()=>{settingsFrom=from==='pause'?'breakscreen':'menu';show('settings');});
}
ui.back.addEventListener('click',()=>show(settingsFrom));
ui.play.addEventListener('click',reset);
ui.pause.addEventListener('click',togglePause);
ui.resume.addEventListener('click',togglePause);
ui.restart.addEventListener('click',reset);
ui.replay.addEventListener('click',reset);
for(const id of ['pause-menu','end-menu'])ui[id].addEventListener('click',()=>go(0));
ui.next.addEventListener('click',()=>{
  if(game.state==='won'&&nightNumber<3){
    if(!practice)write('sessionStorage','island-score',campaignTotal+game.score);
    go(nightNumber+1,practice);
  }
});
show(view);
addEventListener('keydown',e=>{
  if(!bindings.has(e.code))return;
  e.preventDefault();
  if(e.code==='Escape'||e.code==='KeyP') {
    if(!e.repeat) togglePause();
    return;
  }
  if(view!=='playing') return;
  keys.add(e.code);
  if(keyActions[e.code]&&!e.repeat)actions[keyActions[e.code]]=true;
  if(!keyActions[e.code])target=null;
});
addEventListener('keyup',e=>keys.delete(e.code));
addEventListener('blur',()=>keys.clear());
renderer.domElement.addEventListener('pointerdown',e=>{
  if(e.button!==0||view!=='playing'||game.state!=='playing')return;
  pointer.setFromCamera(new T.Vector2(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2),camera);
  plane.constant=-Math.max(0,game.player.pos[1]);
  target=pointer.ray.intersectPlane(plane,new T.Vector3());
});
renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());
renderer.domElement.addEventListener('wheel',e=>{
  if(view!=='playing')return;
  e.preventDefault();
  viewDistance=Math.max(24,Math.min(41,viewDistance+Math.sign(e.deltaY)*2));
},{passive:false});
renderer.domElement.addEventListener('pointermove',e=>{
  if(view==='playing'&&(e.buttons&2))yawDeg-=e.movementX*.28*settings.sensitivity;
});
const mobile=matchMedia('(pointer: coarse)');
for(const [id,key] of [['jump','jump'],['interact','interact'],['pulse','pulse'],['dash','dash']]){
  ui[id].addEventListener('click',()=>{if(view==='playing')actions[key]=true;});
}

function resize(){
  camera.aspect=innerWidth/innerHeight;
  cloudPlane.material=settings.quality==='light'?flatClouds:clouds;
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.3)*qualities[settings.quality]);
  renderer.setSize(innerWidth,innerHeight);
  camera.updateProjectionMatrix();
}
addEventListener('resize',resize);
resize();
const key=(a,b)=>Number(keys.has(a)||keys.has(b));
let previous=performance.now(),accumulator=0,nextFrameAt=0;
let fpsStart=previous,fpsFrames=0;
let walking=false;
const nav=ui.map.getContext('2d');
const mapPaths=paths.map(path=>path.getPoints(16));
let nextHud=0;
const displayed=new T.Vector3();
const cameraTarget=new T.Vector3();
let priorPosition=[...game.player.pos];
function map(){
  const size=ui.map.width, mid=size/2, scale=(mid-16)/(nightNumber===2?66:island.radius);
  const center=nightNumber===2?35:0;
  const mx=x=>mid+(x-center)*scale;
  nav.clearRect(0,0,size,size);
  nav.beginPath();nav.arc(mid,mid,mid-7,0,Math.PI*2);
  nav.fillStyle='#17192ce8';nav.fill();nav.strokeStyle='#c9abd356';nav.stroke();
  for(const zone of island.zones){
    nav.beginPath();nav.arc(mx(zone.x),mid,zone.radius*scale,0,Math.PI*2);
    nav.fillStyle='#2f5d5070';nav.fill();nav.strokeStyle='#c9b48a64';nav.stroke();
  }
  if(nightNumber===3){
    nav.lineWidth=1.5;
    nav.beginPath();nav.arc(mx(0),mid,8*scale,0,Math.PI*2);
    nav.strokeStyle='#f6cf76';nav.stroke();
    nav.beginPath();nav.arc(mx(0),mid,24*scale,0,Math.PI);
    nav.strokeStyle='#73cfde';nav.stroke();
    for(const a of [Math.PI/6,5*Math.PI/6]){
      nav.beginPath();nav.moveTo(mx(30*Math.cos(a)),mid+30*Math.sin(a)*scale);
      nav.lineTo(mx(24*Math.cos(a)),mid+24*Math.sin(a)*scale);
      nav.strokeStyle='#ffe2a0';nav.stroke();
    }
    nav.lineWidth=1;
  }
  for(const points of mapPaths){
    nav.beginPath();
    points.forEach(p=>nav.lineTo(mx(p.x),mid+p.z*scale));
    nav.strokeStyle='#dfc2bd40';nav.stroke();
  }
  game.lanterns.forEach(l=>{
    nav.beginPath();nav.arc(mx(l.pos[0]),mid+l.pos[2]*scale,4.5,0,Math.PI*2);
    nav.fillStyle=l.lit?(isWeak(l)?(settings.accessible?'#fff':'#FF5A5F'):'#ffc671'):'#87858e';nav.fill();
  });
  for(const pad of island.pads){
    const x=mx(pad.pos[0]),y=mid+pad.pos[2]*scale;
    nav.beginPath();nav.moveTo(x,y-5);nav.lineTo(x+4,y+3);nav.lineTo(x-4,y+3);nav.closePath();
    nav.fillStyle='#89f8ff';nav.fill();
  }
  for(const enemy of game.shades){
    nav.beginPath();nav.arc(mx(enemy.pos[0]),mid+enemy.pos[2]*scale,2.9,0,Math.PI*2);
    nav.fillStyle=enemy.state==='stunned'?'#a591cc':settings.accessible?'#00B3FF':'#ff627b';nav.fill();
  }
  for(const enemy of game.drifters){
    if(enemy.state==='removed')continue;
    nav.fillStyle='#acbbff';nav.fillRect(mx(enemy.pos[0])-2,mid+enemy.pos[2]*scale-2,4,4);
  }
  nav.beginPath();nav.arc(mx(game.player.pos[0]),mid+game.player.pos[2]*scale,4,0,Math.PI*2);
  nav.fillStyle='#dcfff7';nav.fill();
}

let visualTick=-1;
function populate(time){
  padMarkers.forEach(({signal,y},i)=>{signal.position.y=y+.47+Math.sin(time*3+i)*.20;signal.rotation.y=time*.8;});
  if(visualTick!==game.simTick){
    visualTick=game.simTick;
    const active=new Set(game.motes.map(m=>m.id));
    for(const [id,g] of moteScenes)if(!active.has(id)){scene.remove(g);moteScenes.delete(id);}
  }
  for(const [i,model] of charmScenes.entries()){
    model.visible=game.charms[i]?.available??false;
    model.rotation.y=time*1.8;
  }
  for(const d of game.drifters){
    const existing=drifterScenes.get(d.id);
    if(d.state==='removed'){if(existing){scene.remove(existing);drifterScenes.delete(d.id);}continue;}
    if(!existing){
      const ribbon=new T.Group();scene.add(ribbon);
      for(let i=0;i<9;i++)model(ribbon,stone,drifterMaterial,0,0,i*.29,.42-i*.036,.09,.27);
      drifterScenes.set(d.id,ribbon);
    }
    const ribbon=drifterScenes.get(d.id);
    ribbon.position.set(...d.pos);
    ribbon.lookAt(game.player.pos[0],d.pos[1],game.player.pos[2]);
    ribbon.children.forEach((part,i)=>{part.position.x=Math.sin(time*7-i*.57)*i*.072;
      part.position.y=Math.cos(time*7-i*.57)*i*.055;part.rotation.z=Math.sin(time*5+i*.31)*.63;});
  }
  const bearing=game.wind.dir_deg*Math.PI/180;
  for(const [i,leaf] of leaves.entries()){
    leaf.visible=game.wind.active||game.wind.warning;
    if(!leaf.visible) continue;
    const travel=(time*7+i*5)%70-35, side=(i*13)%43-21;
    leaf.position.set(game.player.pos[0]+Math.cos(bearing)*travel-Math.sin(bearing)*side,
      2+i%6,game.player.pos[2]+Math.sin(bearing)*travel+Math.cos(bearing)*side);
    leaf.rotation.set(time+i,0,time*2+i);
  }
  for(const m of game.motes){
    const close=Math.abs(m.pos[0]-game.player.pos[0])<61&&Math.abs(m.pos[2]-game.player.pos[2])<61;
    if(!moteScenes.has(m.id)&&close)moteScenes.set(m.id,mote());
    const g=moteScenes.get(m.id);
    if(!g)continue;
    g.visible=close;
    if(!close)continue;
    const phase=Number(m.id.slice(1))*.77;
    const driftX=Math.sin(time*.79+phase)*.34;
    const driftZ=Math.cos(time*.62+phase)*.32;
    g.position.set(m.pos[0]+driftX,m.pos[1]+.85+Math.sin(time*1.31+phase)*.43,m.pos[2]+driftZ);
    const [px,py,pz]=game.player.pos;
    const distance=Math.hypot(px-m.pos[0],pz-m.pos[2]);
    if(distance<3.4&&Math.abs(py-m.pos[1])<=1.5&&game.player.carried<capacity(game.player)){
      const pull=(3.4-distance)/2.4*.83;
      g.position.x+=(px-g.position.x)*pull;
      g.position.z+=(pz-g.position.z)*pull;
    }
    g.rotation.y=time*1.03+phase;
    g.userData.wings.forEach((wing,i)=>{wing.rotation.z=Math.sin(time*14+phase)*.55*(i ? 1 : -1);});
  }
  for(const s of game.shades){
    if(!shadeScenes.has(s.id))shadeScenes.set(s.id,shade());
    const {g,halo,body,feet,scarf,bladeArm}=shadeScenes.get(s.id);
    g.position.set(s.pos[0],s.pos[1]+.12,s.pos[2]);
    const moving=s.state==='chase';
    g.lookAt(game.player.pos[0],g.position.y,game.player.pos[2]);
    body.rotation.x=moving?.24:-.12;
    body.position.y=moving?Math.abs(Math.sin(time*9))*.16:.06;
    feet.forEach((foot,i)=>{foot.rotation.x=moving?Math.sin(time*13+i*Math.PI)*.81:0;});
    scarf.rotation.x=.15+Math.sin(time*7)*.25;
    bladeArm.rotation.x=moving?-.42+Math.sin(time*13)*.21:.36;
    halo.material.color.set(s.state==='stunned'?'#3A3450':settings.accessible?'#00B3FF':'#7A3CFF');
    if(s.state==='drain')body.rotation.x=.43;
    if(s.state==='stunned'){
      body.rotation.x=.22+Math.max(0,s.left-105)*.035;
      body.rotation.z=Math.sin(time*21)*Math.max(0,s.left-104)*.012;
      if(s.left>105)halo.material.color.set('#ffd381');
    }else body.rotation.z=0;
    halo.material.opacity=s.state==='drain'?.83:s.state==='stunned'?.66:.34;
  }
}

const drifterMaterial=material('#8FA3B8',{side:T.DoubleSide});
const shrineLight=new T.PointLight('#ffad68',115,26,2);
scene.add(shrineLight);
renderer.setAnimationLoop(now=>{
  const rate=view==='playing'?settings.frameLimit:30;
  if(rate){
    const interval=1000/rate;
    if(now+1.2<nextFrameAt)return;
    nextFrameAt=Math.max(now-interval,nextFrameAt)+interval;
  }else nextFrameAt=0;
  fpsFrames++;
  if(now-fpsStart>=750){
    ui.fps.textContent=Math.round(fpsFrames*1000/(now-fpsStart))+' FPS';
    fpsFrames=0;fpsStart=now;
  }
  const dt=Math.min(Math.max(0,(now-previous)/1000),.15);
  previous=now;
  const running=view==='playing'&&game.state==='playing';
  let time=game.simTick/60;
  accumulator=running?accumulator+dt:0;
  let x=key('KeyD','ArrowRight')-key('KeyA','ArrowLeft');
  let z=key('KeyS','ArrowDown')-key('KeyW','ArrowUp');
  let yaw=yawDeg;
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
    if(game.state!=='playing'){accumulator=0;break;}
    const position=game.player.pos;
    priorPosition[0]=position[0];
    priorPosition[1]=position[1];
    priorPosition[2]=position[2];
    const wasGrounded=game.player.grounded;
    const events=step(game,input,canMove);
    if(wasGrounded&&!game.player.grounded&&game.player.vel[1]>0)audio.play('jump');
    for(const e of events){
      if(e.name==='pulse'){
        pulseAge=0;
        pulseHits=e.data.stunned_ids;
        dragons.start(...game.player.pos);
        pulseRing.position.set(game.player.pos[0],game.player.pos[1]+.22,game.player.pos[2]);
      }
      audio.play(e.name==='game_over'?e.data.result:e.name);
    }
    accumulator-=1/60;
  }
  if(running)time+=accumulator;
  displayed.fromArray(priorPosition);
  const blend=running?Math.min(1,accumulator*60):1;
  displayed.x+=(game.player.pos[0]-displayed.x)*blend;
  displayed.y+=(game.player.pos[1]-displayed.y)*blend;
  displayed.z+=(game.player.pos[2]-displayed.z)*blend;
  const {x:px,y:py,z:pz}=displayed, groundY=height(px,pz);
  avatar.position.set(px,0,pz);
  actor.position.y=py+(walking?Math.sin(time*17)**2*.077:0);
  actor.rotation.x=walking?-.18:.04+Math.sin(time*2)*.022;
  shoulders.forEach((plate,i)=>{plate.rotation.x=walking?Math.sin(time*15+i*Math.PI)*.18:0;});
  if(running){
    const angle=Math.atan2(-game.player.facing[0],-game.player.facing[1]);
    const d=angle-actor.rotation.y;
    actor.rotation.y+=Math.atan2(Math.sin(d),Math.cos(d))*(1-Math.exp(-dt*16));
  }
  legs.forEach((leg,i)=>{leg.rotation.x=walking?Math.sin(time*15+i*Math.PI)*.58:0;});
  tails.forEach((tail,i)=>{tail.rotation.x=Math.sin(time*5+i)*.17+.11;});
  hanging.rotation.x=Math.sin(time*7)*(walking?.23:.07);
  hanging.rotation.z=Math.cos(time*6)*(walking?.21:.06);
  avatar.visible=!game.player.fall;
  shadow.position.y=groundY+.06;
  actor.visible=!game.player.invuln||Math.floor(game.tick/5)%2===0;
  carriedLight.position.set(px,Math.max(0,py)+2.4,pz);
  guardianAura.visible=view==='playing'&&!game.player.fall;
  guardianAura.position.set(px,py+.12,pz);
  const auraPower=Math.max(0,1-pulseAge/.85);
  aureole.scale.setScalar(1+Math.sin(time*2.2)*.08+auraPower*.45);
  aureole.material.opacity=.48+auraPower*.48;
  seal.rotation.z=time*.4;
  auraGlyphs.forEach((spark,i)=>{
    const angle=i*Math.PI/4+time*1.6;
    const span=1.10+auraPower*.44;
    spark.position.set(Math.cos(angle)*span,.13+(i%3)*.24+Math.sin(time*3+i)*.11,Math.sin(angle)*span);
    spark.rotation.set(time*.9,angle,time*1.4);
  });
  const theta=yawDeg*Math.PI/180;
  const sin=Math.sin(theta),cos=Math.cos(theta);
  aim.lerp(cameraTarget.set(px-3*sin,Math.max(0,py)+1,pz-3*cos),1-Math.exp(-dt*5));
  offset.set(viewDistance*sin,viewDistance*.62,viewDistance*cos);
  camera.position.copy(aim).addScaledVector(offset,camera.aspect<.74?1.21:1);
  camera.lookAt(aim);
  revealPlayer(now,px,py,pz);
  const lit=game.lanterns.filter(l=>l.lit);
  ambient.intensity=.15+.55*lit.length/game.lanterns.length;
  for(const [i,l] of game.lanterns.entries()){
    const s=shrines[i];
    if(s.lit!==l.lit){
      s.lit=l.lit;
      s.pool.visible=l.lit;
      s.meter.visible=l.lit;
      s.paper.scale.y=l.lit?1:.8;
      s.tear.visible=!l.lit;
      s.heart.material=l.lit?amber:lampDark;
      s.halo.material.color.set(l.lit?'#FFB347':'#bd77e7');
      const diameter=l.lit?17:7;
      s.halo.scale.set(diameter,diameter,1);
    }
    s.disk.visible=isSafe(l);
    const blink=isWeak(l)?(.29+.71*(.5+.5*Math.cos(time*Math.PI*2))):1;
    s.halo.material.opacity=l.lit?.94*blink:.14;
    s.pool.material.opacity=.62*blink;
    s.heart.scale.x=s.heart.scale.z=l.lit?.80+.20*blink:1;
    if(l.lit){
      const ratio=l.fuelUnits/fullFuel;
      s.meter.quaternion.copy(camera.quaternion);
      s.fuelBar.scale.x=2.48*ratio;
      s.fuelBar.position.x=-1.24*(1-ratio);
      s.fuelBar.material.color.set(isWeak(l)?(settings.accessible?'#FFFFFF':'#FF5A5F'):'#ffe0a0');
      s.fuelBar.visible=blink>.45;
    }
  }
  let closest=null, closestDistance=Infinity;
  for(const lantern of lit){
    const dx=lantern.pos[0]-px,dz=lantern.pos[2]-pz;
    const distance=dx*dx+dz*dz;
    if(distance<closestDistance){closest=lantern;closestDistance=distance;}
  }
  shrineLight.intensity=closest?115:0;
  if(closest)shrineLight.position.set(closest.pos[0],closest.pos[1]+3,closest.pos[2]);
  populate(time);
  if(running)pulseAge+=dt;
  dragons.update(pulseAge);
  pulseRing.visible=pulseAge<.80;
  pulseRing.scale.setScalar(Math.max(.2,Math.min(1,pulseAge/.26)*tuning.pulse_radius));
  pulseRing.material.opacity=Math.max(0,1-pulseAge/.80)*.88;
  if(settings.quality!=='light')clouds.uniforms.time.value=time;
  if(view==='playing'&&(now>=nextHud || game.state!=='playing')){
    nextHud=now+100;
    updateHud(px,py,pz,lit.length);
    map();
  }
  renderer.render(scene,camera);
});
const projected=new T.Vector3();
function updateHud(px,py,pz,litCount){
  const candidates=game.lanterns.filter(canReceive).sort((a,b)=>
    Math.hypot(a.pos[0]-px,a.pos[2]-pz)-Math.hypot(b.pos[0]-px,b.pos[2]-pz)||a.id.localeCompare(b.id));
  const near=candidates.find(l=>Math.hypot(l.pos[0]-px,l.pos[2]-pz)<=2&&Math.abs(l.pos[1]-py)<=1.5);
  ui.objective.hidden=!near;
  if(near){
    const prefix=isWeak(near)&&settings.accessible?'⚠ ':'';
    ui.objective.textContent=prefix+(near.lit?(mobile.matches?'Châm dầu':'E — Châm dầu')+' · '+Math.floor(near.fuelUnits/60)+'%'
      :(mobile.matches?'Nạp':'E — Nạp ánh sáng')+' ('+near.deposited+'/'+lightCost(near)+')');
  }
  ui.direction.hidden=true;
  if(candidates[0]){
    projected.set(candidates[0].pos[0],candidates[0].pos[1]+2,candidates[0].pos[2]).project(camera);
    if(Math.abs(projected.x)>.93||Math.abs(projected.y)>.91||projected.z>1){
      ui.direction.hidden=false;
      ui.direction.style.setProperty('--bearing',Math.atan2(projected.x,projected.y)*180/Math.PI+'deg');
    }
  }
  ui.lights.textContent=litCount+' / '+game.lanterns.length;
  ui['dawn-goal'].textContent='Bình minh cần '+Math.ceil(.6*game.lanterns.length);
  const p=game.player;
  const limit=capacity(p);
  ui.motes.textContent=p.carried+' / '+limit+' đom đóm';
  Array.from(ui.slots.children).forEach((slot,i)=>{
    slot.hidden=i>=limit;
    slot.classList.toggle('on',i<p.carried);
  });
  ui.flames.textContent='◆'.repeat(p.flames)+'◇'.repeat(3-p.flames);
  ui.score.textContent=campaignTotal+game.score;
  ui['dash-cd'].textContent='➤ Lướt '+(p.dashCd?(p.dashCd/60).toFixed(1)+' s':p.charm?'· Bùa Gió':'· Sẵn sàng');
  if(pulseAge<1.7){
    const effects=[];
    if(pulseHits.length){
      const blocked=game.shades.filter(s=>pulseHits.includes(s.id)&&s.pulseBlocked).length;
      effects.push('Choáng '+pulseHits.length+' Bóng Mực'+(blocked?' · '+blocked+' bị chặn lực đẩy':''));
    }
    if(game.pulseDrifters)effects.push('Xua '+game.pulseDrifters+' Gió Lạc');
    ui['pulse-cd'].textContent='✦ '+(effects.join(' · ')||'Không trúng mục tiêu');
  }else{
    ui['pulse-cd'].textContent='✦ Tỏa sáng '+(p.pulseCd?(p.pulseCd/60).toFixed(1)+' s':'· '+p.carried+'/3');
  }
  const seconds=Math.ceil(timeLeft(game));
  ui.time.textContent=(seconds<=30&&settings.accessible?'⚠ ':'')+Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');
  ui.time.classList.toggle('danger',seconds<=30);
  if(seconds<=10&&seconds>0&&seconds!==lastCountdown){
    audio.play('countdown');lastCountdown=seconds;
  }
  if(game.wind.warning&&!lastWind)audio.play('wind');
  lastWind=game.wind.warning;
  audio.update(game.simTick);
  ui.wind.hidden=!game.wind.warning&&!game.wind.active;
  ui.wind.textContent=game.wind.warning?'Gió mạnh sắp tới':'Gió mạnh';
  if(game.state!=='playing'){
    const won=game.state==='won';
    const finale=won&&nightNumber===3;
    ui['result-label'].textContent='Đêm '+nightNumber+' · '+island.name;
    ui.result.textContent=finale?'Bình Minh':won?island.name+' đã sáng':'Đêm đã khép lại';
    ui.summary.textContent=practice?'Điểm lượt thử · '+game.score:finale?'Tổng điểm · '+(campaignTotal+game.score):'Điểm đêm này · '+game.score;
    ui.restart.hidden=won;ui.next.hidden=!won||finale;
    ui.pause.hidden=true;
    show('ending');
  }
}
