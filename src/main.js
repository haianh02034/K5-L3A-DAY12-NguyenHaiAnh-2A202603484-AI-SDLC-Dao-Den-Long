import * as T from 'three';
import level from './island.json';
import { createGame, step } from './game.mjs';

const scene = new T.Scene();
scene.background = new T.Color(0x101e30);
scene.fog = new T.FogExp2(0x102332, 0.018);
const camera = new T.PerspectiveCamera(43, 1, 0.1, 180);
let renderer;
try {
  renderer = new T.WebGLRenderer({ antialias: true });
} catch (error) {
  document.querySelector('#objective').textContent = 'Trình duyệt cần hỗ trợ WebGL 2 để mở game.';
  throw error;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.45;
document.body.prepend(renderer.domElement);

let seed = level.seed;
function random() {
  seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
  return seed / 4294967296;
}

const ground = new T.MeshStandardMaterial({color: 0x254b42, flatShading: true, vertexColors: true});
const shore = new T.MeshStandardMaterial({color: 0x80705c, flatShading: true});
const bark = new T.MeshStandardMaterial({color: 0x4d3734, flatShading: true});
const rock = new T.MeshStandardMaterial({color: 0x657378, flatShading: true});
const foliage = [0x21433f, 0x305a49, 0x3b6755].map(color =>
  new T.MeshStandardMaterial({color, flatShading: true}));
const gold = new T.MeshBasicMaterial({color: 0xffb946});
const wood = new T.MeshStandardMaterial({color: 0x633b30});
const lampOff = new T.MeshStandardMaterial({color: 0x8f4a32, emissive: 0xab4218, emissiveIntensity: 0.9});
const lampOn = new T.MeshBasicMaterial({color: 0xffc367});
const sphere = new T.SphereGeometry(1, 12, 8);
const stoneGeo = new T.DodecahedronGeometry(1, 0);
const crownGeo = new T.ConeGeometry(1, 1, 6);
const trunkGeo = new T.CylinderGeometry(0.12, 0.21, 1, 6);
const box = new T.BoxGeometry(1, 1, 1);

function mesh(geometry, material, x, y, z, sx = 1, sy = sx, sz = sx, parent = scene) {
  const object = new T.Mesh(geometry, material);
  object.position.set(x, y, z);
  object.scale.set(sx, sy, sz);
  parent.add(object);
  return object;
}

function height(x, z) {
  const r = Math.hypot(x / level.radiusX, z / level.radiusZ);
  return (Math.sin(x * 0.53) * Math.cos(z * 0.37) * 0.28 +
    Math.sin(z * 0.75 + x * 0.3) * 0.13) * (1 - Math.min(1, r)) -
    Math.max(0, (r - 0.87) / 0.13) * 1.05;
}

function island() {
  const vertices = [0, height(0, 0), 0];
  const colors = [0.87, 0.98, 0.88];
  const indices = [];
  const slices = 80, rings = 24;
  for (let i = 1; i <= rings; i++) {
    for (let j = 0; j < slices; j++) {
      const angle = j * Math.PI * 2 / slices;
      const r = i / rings * (1 + 0.025 * Math.cos(angle * 7) + 0.025 * Math.sin(angle * 11));
      const x = level.radiusX * r * Math.cos(angle), z = level.radiusZ * r * Math.sin(angle);
      vertices.push(x, height(x, z), z);
      const tone = 0.66 + random() * 0.33;
      colors.push(tone, tone, tone);
      const index = 1 + (i - 1) * slices + j;
      const next = 1 + (i - 1) * slices + (j + 1) % slices;
      if (i === 1) indices.push(0, next, index);
      else indices.push(index - slices, next - slices, index, index, next - slices, next);
    }
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  mesh(geo, ground, 0, 0, 0);
}
island();

const water = mesh(new T.PlaneGeometry(190, 190), new T.MeshStandardMaterial({
  color: 0x193b50, roughness: 0.47, metalness: 0.25
}), 0, -0.67, 0);
water.rotation.x = -Math.PI / 2;
const rippleMaterial = new T.MeshBasicMaterial({color: 0x6fabb1, transparent: true, opacity: 0.31});
const waves = [];
for (let i = 0; i < 130; i++) {
  const x = (random() - 0.5) * 108, z = (random() - 0.5) * 95;
  if (Math.hypot(x / level.radiusX, z / level.radiusZ) < 0.97) continue;
  waves.push(mesh(box, rippleMaterial, x, -0.64, z, 0.3 + random() * 2.6, 0.012, 0.035));
}
scene.add(new T.HemisphereLight(0xa9caff, 0x8f6b4f, 2.5));
const moon = new T.DirectionalLight(0x9cceff, 2.1);
moon.position.set(-10, 20, -11);
scene.add(moon);

const glowCanvas = document.createElement('canvas');
glowCanvas.width = glowCanvas.height = 128;
const context = glowCanvas.getContext('2d');
const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
gradient.addColorStop(0, 'rgba(255,255,255,.95)');
gradient.addColorStop(0.16, 'rgba(255,255,255,.56)');
gradient.addColorStop(1, 'rgba(255,255,255,0)');
context.fillStyle = gradient;
context.fillRect(0, 0, 128, 128);
const glowTexture = new T.CanvasTexture(glowCanvas);
function glow(parent, x, y, z, size, color, opacity) {
  const sprite = new T.Sprite(new T.SpriteMaterial({
    map: glowTexture, color, opacity, blending: T.AdditiveBlending, depthWrite: false,
  }));
  sprite.position.set(x, y, z);
  sprite.scale.set(size, size, 1);
  parent.add(sprite);
  return sprite;
}

const path = new T.CatmullRomCurve3(level.path.map(([x, z]) => new T.Vector3(x, 0, z)));
const trail = path.getPoints(60);
for (const point of trail) {
  for (let i = 0; i < 2; i++) {
    const x = point.x + (random() - 0.5) * 1.65, z = point.z + (random() - 0.5) * 1.4;
    const pebble = mesh(stoneGeo, shore, x, height(x, z) + 0.01, z, 0.16 + random() * 0.3, 0.035, 0.20);
    pebble.rotation.y = random() * 6;
  }
}

const landmarks = [level.spawn, level.lantern.position, ...level.fireflies, ...trail.map(p => [p.x, p.z])];
for (let i = 0; i < 165; i++) {
  const angle = random() * Math.PI * 2, r = Math.sqrt(random()) * 0.94;
  const x = Math.cos(angle) * level.radiusX * r, z = Math.sin(angle) * level.radiusZ * r;
  if (landmarks.some(([px, pz]) => Math.hypot(x - px, z - pz) < 2.2)) continue;
  const y = height(x, z), size = 0.65 + random() * 0.85;
  if (random() > 0.69) {
    const boulder = mesh(stoneGeo, rock, x, y + size * 0.26, z, size, size * 0.68, size * 0.78);
    boulder.rotation.y = random() * 6;
    continue;
  }
  mesh(trunkGeo, bark, x, y + size * 0.72, z, size, size * 1.46, size);
  for (let j = 0; j < 3; j++) {
    const crown = mesh(crownGeo, foliage[j], x, y + size * (1.48 + j * 0.64), z,
      size * (1.03 - j * 0.2), size * 1.54, size * (1.03 - j * 0.2));
    crown.rotation.y = random() * 6;
  }
}

function lantern(x, z, large) {
  const y = height(x, z);
  const group = new T.Group();
  group.position.set(x, y, z);
  scene.add(group);
  const scale = large ? 1 : 0.32;
  group.scale.setScalar(scale);
  const base = mesh(new T.CylinderGeometry(1.35, 1.6, 0.35, 8), rock, 0, 0.16, 0, 1, 1, 1, group);
  base.rotation.y = Math.PI / 8;
  mesh(box, wood, 0, 0.57, 0, 0.41, 1, 0.41, group);
  mesh(box, wood, 0, 1.14, 0, 1.25, 0.15, 1.25, group);
  const body = mesh(box, large ? lampOff : lampOn, 0, 1.75, 0, 1.04, 1.10, 1.04, group);
  for (const a of [-0.55, 0.55]) {
    for (const b of [-0.55, 0.55]) mesh(box, wood, a, 1.75, b, 0.10, 1.28, 0.10, group);
  }
  const roof = mesh(new T.ConeGeometry(1.14, 0.66, 4), wood, 0, 2.57, 0, 1, 1, 1, group);
  roof.rotation.y = Math.PI / 4;
  const halo = glow(group, 0, 1.8, 0, large ? 5 : 5.5, 0xffa044, large ? 0.3 : 0.8);
  if (large) {
    const light = new T.PointLight(0xffa14f, 14, 17);
    light.position.set(x, y + 2, z);
    scene.add(light);
    return { body, halo, light };
  }
}
for (const [x, z] of [[-1,10],[2.5,7],[-3.4,4],[1.5,0],[3.1,-4],[-2.1,-7]]) lantern(x, z, false);
const beacon = lantern(...level.lantern.position, true);

const fireflies = level.fireflies.map(([x, z]) => {
  const group = new T.Group();
  group.position.set(x, height(x, z) + 0.85, z);
  mesh(sphere, gold, 0, 0, 0, 0.18, 0.24, 0.18, group);
  glow(group, 0, 0, 0, 2.7, 0xffbf55, 0.9);
  const ring = mesh(new T.RingGeometry(0.39, 0.42, 26), new T.MeshBasicMaterial({
    color: 0xf9c86a, transparent: true, opacity: 0.57, side: T.DoubleSide
  }), 0, -0.59, 0, 1, 1, 1, group);
  ring.rotation.x = -Math.PI / 2;
  scene.add(group);
  return group;
});

const dust = new T.BufferGeometry();
const positions = [];
for (let i = 0; i < 210; i++) positions.push((random() - 0.5) * 61, random() * 5, (random() - 0.5) * 53);
dust.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
const motes = new T.Points(dust, new T.PointsMaterial({
  color: 0xdbc694, map: glowTexture, size: 0.34, transparent: true, opacity: 0.64, depthWrite: false
}));
scene.add(motes);

const game = createGame(level);
const avatar = new T.Group();
scene.add(avatar);
const coat = new T.MeshStandardMaterial({color: 0x289a9a, roughness: 0.8});
const hair = new T.MeshStandardMaterial({color: 0x211b29, roughness: 0.8});
const skin = new T.MeshStandardMaterial({color: 0xe9b079, roughness: 0.8});
const shadow = mesh(new T.CircleGeometry(0.66, 25), new T.MeshBasicMaterial({
  color: 0x081319, transparent: true, opacity: 0.56
}), 0, 0.025, 0, 1, 1, 1, avatar);
shadow.rotation.x = -Math.PI / 2;
const figure = new T.Group();
avatar.add(figure);
mesh(new T.CylinderGeometry(0.28, 0.53, 0.78, 9), coat, 0, 0.72, 0, 1, 1, 1, figure);
mesh(sphere, skin, 0, 1.29, -0.04, 0.31, 0.35, 0.32, figure);
mesh(sphere, hair, 0, 1.45, 0.08, 0.34, 0.23, 0.31, figure);
mesh(sphere, hair, 0, 1.67, 0.21, 0.17, 0.15, 0.16, figure);
const boots = [-0.20, 0.20].map(x => mesh(sphere, hair, x, 0.19, -0.06, 0.14, 0.18, 0.22, figure));
mesh(box, lampOn, 0.45, 0.78, -0.21, 0.20, 0.25, 0.21, figure);
glow(figure, 0.45, 0.78, -0.21, 2, 0xffa147, 0.83);
const carried = new T.PointLight(0xffb96c, 13, 7);
scene.add(carried);

function resize() {
  camera.aspect = innerWidth / innerHeight;
  renderer.setSize(innerWidth, innerHeight);
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();
const keys = new Set();
const bindings = new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight']);
let target = null;
addEventListener('keydown', e => {
  if (!bindings.has(e.code)) return;
  e.preventDefault();
  keys.add(e.code);
  target = null;
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => keys.clear());
const plane = new T.Plane(new T.Vector3(0, 1, 0), 0);
const ray = new T.Raycaster();
renderer.domElement.addEventListener('pointerdown', e => {
  if (e.button !== 0) return;
  ray.setFromCamera(new T.Vector2(e.clientX / innerWidth * 2 - 1, 1 - e.clientY / innerHeight * 2), camera);
  target = ray.ray.intersectPlane(plane, new T.Vector3());
  if (target) {
    const edge = Math.max(1, Math.hypot(target.x / (level.radiusX - 2), target.z / (level.radiusZ - 2)));
    target.divideScalar(edge);
  }
});
const aim = new T.Vector3(game.x, 0, game.z - 2);
const offset = new T.Vector3(0, 21, 19);
const count = document.querySelector('#count');
const objective = document.querySelector('#objective');
const down = (a, b) => Number(keys.has(a) || keys.has(b));
let previous = performance.now();
let lastCount = -1;
let wasLit = false;
renderer.setAnimationLoop(now => {
  const dt = Math.min((now - previous) / 1000, 0.05);
  previous = now;
  const time = now / 1000;
  let x = down('KeyD', 'ArrowRight') - down('KeyA', 'ArrowLeft');
  let z = down('KeyS', 'ArrowDown') - down('KeyW', 'ArrowUp');
  if (target && x === 0 && z === 0) {
    x = target.x - game.x;
    z = target.z - game.z;
    if (Math.hypot(x, z) < 0.33) {
      target = null;
      x = z = 0;
    }
  }
  step(game, level, x, z, dt);
  avatar.position.set(game.x, height(game.x, game.z), game.z);
  if (x || z) {
    const angle = Math.atan2(-x, -z);
    const difference = angle - figure.rotation.y;
    figure.rotation.y += Math.atan2(Math.sin(difference), Math.cos(difference)) * (1 - Math.exp(-dt * 16));
  }
  for (let i = 0; i < boots.length; i++) boots[i].position.z = (x || z) ? Math.sin(time * 16 + i * Math.PI) * 0.15 : -0.06;
  carried.position.set(game.x, avatar.position.y + 1.42, game.z);
  aim.x += (game.x - aim.x) * (1 - Math.exp(-dt * 4));
  aim.z += (game.z - 2 - aim.z) * (1 - Math.exp(-dt * 4));
  camera.position.copy(aim).addScaledVector(offset, camera.aspect < 0.75 ? 1.23 : 1);
  camera.lookAt(aim);
  for (const [index, fly] of fireflies.entries()) {
    fly.visible = !game.collected.has(index);
    fly.position.y = height(fly.position.x, fly.position.z) + 0.85 + Math.sin(time * 2.7 + index) * 0.19;
  }
  motes.position.x = Math.sin(time * 0.22) * 1.6;
  for (const [i, wave] of waves.entries()) wave.scale.z = 0.027 + 0.012 * Math.cos(i + time * 1.5);
  if (lastCount !== game.collected.size) {
    lastCount = game.collected.size;
    count.textContent = Math.min(lastCount, level.lantern.required) + ' / ' + level.lantern.required + ' đom đóm';
    if (!game.lit && lastCount >= level.lantern.required) objective.textContent = 'Đủ đom đóm rồi. Hãy đến Đèn Lồng Lớn ở phía bắc.';
  }
  if (game.lit && !wasLit) {
    wasLit = true;
    beacon.body.material = lampOn;
    beacon.halo.scale.set(12, 12, 1);
    beacon.halo.material.opacity = 0.95;
    beacon.light.intensity = 96;
    objective.textContent = 'Đèn Lồng Lớn đã sáng. Bạn có thể tiếp tục khám phá đảo.';
  }
  renderer.render(scene, camera);
});
