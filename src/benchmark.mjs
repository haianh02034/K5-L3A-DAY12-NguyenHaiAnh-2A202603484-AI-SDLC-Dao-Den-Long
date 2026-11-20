import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createGame, seeded, benchmarkStep } from './game.mjs';

function batchOpaqueScenery(scene,excluded){
  const meshes=[];
  scene.updateMatrixWorld(true);
  scene.traverseVisible(mesh=>{
    if(mesh.isMesh&&!mesh.isInstancedMesh&&!mesh.material.transparent&&
       !mesh.material.isShaderMaterial&&!excluded.has(mesh))meshes.push(mesh);
  });
  const groups=new Map();
  for(const mesh of meshes){
    const shape=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();
    shape.applyMatrix4(mesh.matrixWorld);
    for(const attr of Object.keys(shape.attributes)){
      if(!['position','normal','uv'].includes(attr))shape.deleteAttribute(attr);
    }
    if(!groups.has(mesh.material))groups.set(mesh.material,[]);
    groups.get(mesh.material).push({mesh,shape});
  }
  for(const [material,parts] of groups){
    if(parts.length<2){parts[0].shape.dispose();continue;}
    const geo=mergeGeometries(parts.map(v=>v.shape));
    for(const {shape,mesh} of parts){
      shape.dispose();
      if(geo)mesh.removeFromParent();
    }
    if(geo)scene.add(new T.Mesh(geo,material));
  }
}

export function runBenchmark({renderer,scene,camera,seed,duration,beforeDraw,moteTexture,dynamic}){
  batchOpaqueScenery(scene,dynamic);
  const rng=seeded(seed);
  const distribution=(count,radius,y)=>Array.from({length:count},(_,i)=>{
    const a=(i+rng())*2*Math.PI/count, r=Math.sqrt(rng())*radius;
    return [Math.cos(a)*r,y,Math.sin(a)*r];
  });
  const g=createGame(seed,{random_motes:false,random_shades:false,
    shades:distribution(200,38,0).map(pos=>({pos,state:'wander'})),motes:distribution(100,37,0),
    lanterns:[1,2,3].map(i=>({id:'L'+i,lit:true,fuel:100}))});
  const black=new T.MeshStandardMaterial({color:'#120A1A',roughness:.76});
  const violet=new T.MeshBasicMaterial({color:'#7A3CFF'});
  const shades=new T.InstancedMesh(new T.CapsuleGeometry(.36,.67,4,8),black,200);
  const faces=new T.InstancedMesh(new T.SphereGeometry(.14,7,5),violet,200);
  shades.frustumCulled=faces.frustumCulled=false;
  scene.add(shades,faces);
  const glows=new Float32Array(g.motes.length*3);
  const motes=new T.InstancedMesh(new T.IcosahedronGeometry(.12,1),new T.MeshBasicMaterial({color:'#FFF6C2'}),100);
  const dummy=new T.Object3D();
  g.motes.forEach(({pos:[x,,z]},i)=>{
    dummy.position.set(x,.80,z);dummy.updateMatrix();motes.setMatrixAt(i,dummy.matrix);
    glows.set([x,.8,z],i*3);
  });
  scene.add(motes);
  const glowGeometry=new T.BufferGeometry();
  glowGeometry.setAttribute('position',new T.BufferAttribute(glows,3));
  scene.add(new T.Points(glowGeometry,new T.PointsMaterial({
    color:'#FFE58A',map:moteTexture,size:.77,transparent:true,opacity:.7,depthWrite:false,blending:T.AdditiveBlending,
  })));
  let start,last,steps=0;
  const times=[];
  renderer.setPixelRatio(1);
  renderer.setSize(1280,720);
  const gl=renderer.getContext();
  const info=gl.getExtension('WEBGL_debug_renderer_info');
  const device=info?gl.getParameter(info.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
  renderer.setAnimationLoop(now=>{
    if(start===undefined){start=now;last=now;}
    const elapsed=now-start;
    // A measurement samples the interval ending at this rendered frame.
    if(last>=start+3000&&elapsed<=3000+duration*1000&&now>last)times.push(now-last);
    if(elapsed>3000+duration*1000){
      renderer.setAnimationLoop(null);
      window.benchmarkResult={times,renderer:'Three.js r'+T.REVISION+' / '+device,firstFrame:window.benchmarkFirstFrame};
      return;
    }
    const expected=Math.floor(elapsed*60/1000);
    while(steps<expected){benchmarkStep(g);steps++;}
    const angle=2*Math.PI*elapsed/15000;
    camera.position.set(Math.cos(angle)*30,15,-Math.sin(angle)*30);
    camera.lookAt(0,0,0);
    g.shades.forEach(({pos:[x,y,z]},i)=>{
      dummy.position.set(x,y+.67,z);dummy.updateMatrix();shades.setMatrixAt(i,dummy.matrix);
      dummy.position.set(x,y+.9,z+.32);dummy.updateMatrix();faces.setMatrixAt(i,dummy.matrix);
    });
    shades.instanceMatrix.needsUpdate=true;faces.instanceMatrix.needsUpdate=true;
    beforeDraw(g,elapsed/1000);
    renderer.render(scene,camera);
    window.benchmarkFirstFrame??=Date.now();
    last=now;
  });
}
