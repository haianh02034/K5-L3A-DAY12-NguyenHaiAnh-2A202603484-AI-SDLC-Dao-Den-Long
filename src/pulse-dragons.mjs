import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const vector=(x,y,z)=>new T.Vector3(x,y,z);

export function createPulseDragons(scene) {
  const root=new T.Group();
  root.name='Pulse Dragons';
  root.visible=false;
  scene.add(root);
  const aura=new T.Group();
  aura.visible=false;
  scene.add(aura);
  const ringsFX=[0,1,2].map(index=>{
    const ring=new T.Mesh(new T.TorusGeometry(1,.015,6,64),new T.MeshBasicMaterial({
      color:index===1?'#ff9550':'#fff1b0',transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending,
    }));
    ring.rotation.x=-Math.PI/2;
    aura.add(ring);
    return ring;
  });
  const sparkGeometry=new T.BufferGeometry();
  const sparkPositions=new Float32Array(72*3);
  sparkGeometry.setAttribute('position',new T.BufferAttribute(sparkPositions,3).setUsage(T.DynamicDrawUsage));
  const sparkMaterial=new T.PointsMaterial({color:'#ffd889',size:.17,transparent:true,depthWrite:false,
    blending:T.AdditiveBlending,toneMapped:false});
  const sparks=new T.Points(sparkGeometry,sparkMaterial);
  sparks.frustumCulled=false;
  aura.add(sparks);
  const metal=(color,emissive)=>new T.MeshStandardMaterial({
    color,emissive,emissiveIntensity:.48,roughness:.38,metalness:.28,
  });
  const gold=metal('#e5a029','#7a3809');
  const bright=metal('#ffc763','#a95a10');
  const mane=metal('#ffaf26','#bb5c09');
  const ivory=new T.MeshBasicMaterial({color:'#ffe7a5',toneMapped:false});
  const red=new T.MeshBasicMaterial({color:'#f66e26',toneMapped:false});
  const mouth=new T.MeshBasicMaterial({color:'#451b20'});
  const sphere=new T.SphereGeometry(1,12,8);
  const poly=new T.IcosahedronGeometry(1,0);
  const spike=new T.ConeGeometry(1,1,5);
  const dragon=new T.Group();
  function mesh(group,shape,material,x,y,z,sx,sy,sz){
    const item=new T.Mesh(shape,material);
    item.position.set(x,y,z);item.scale.set(sx,sy,sz);group.add(item);
    return item;
  }
  function curve(group,points,radius,material){
    const spline=new T.CatmullRomCurve3(points.map(p=>vector(...p)));
    mesh(group,new T.TubeGeometry(spline,12,radius,5,false),material,0,0,0,1,1,1);
  }
  const spine=new T.CatmullRomCurve3([
    vector(0,.45,.08),vector(-.12,.34,-.37),vector(.22,.08,-.86),vector(.56,.21,-1.4),
    vector(.28,.66,-1.88),vector(-.40,.81,-2.36),vector(-.72,.43,-2.89),
    vector(-.42,.16,-3.38),vector(.15,.36,-3.84),vector(.38,.63,-4.20),
  ]);
  const rings=36,sides=9,vertices=[],indices=[];
  for(let i=0;i<=rings;i++){
    const t=i/rings, center=spine.getPointAt(t), tangent=spine.getTangentAt(t);
    const side=vector(0,1,0).cross(tangent).normalize(), up=tangent.clone().cross(side).normalize();
    const radius=.23*(1-t)**.62+.025;
    for(let j=0;j<sides;j++){
      const a=j/sides*2*Math.PI;
      const p=center.clone().addScaledVector(side,Math.cos(a)*radius).addScaledVector(up,Math.sin(a)*radius);
      vertices.push(p.x,p.y,p.z);
      if(i<rings){
        const v=i*sides+j,n=i*sides+(j+1)%sides;
        indices.push(v,n,v+sides,n,n+sides,v+sides);
      }
    }
  }
  const tube=new T.BufferGeometry();
  tube.setAttribute('position',new T.Float32BufferAttribute(vertices,3));tube.setIndex(indices);tube.computeVertexNormals();
  gold.side=T.DoubleSide;
  mesh(dragon,tube,gold,0,0,0,1,1,1);
  for(let i=2;i<19;i++){
    const t=i/20,p=spine.getPointAt(t);
    const scale=.122*(1-t)+.035;
    for(let j=0;j<4;j++){
      const a=j*1.42+i*.47;
      mesh(dragon,poly,j===0?bright:gold,p.x+Math.cos(a)*scale*1.25,p.y+Math.sin(a)*scale*1.3,p.z,
        scale*.77,scale*.48,scale*1.16);
    }
    if(i<17){
      const crest=mesh(dragon,spike,mane,p.x,p.y+scale*1.8,p.z,scale*.78,scale*2.0,scale*.75);
      crest.rotation.x=-.50;
    }
  }
  const head=new T.Group();head.position.set(0,.51,.12);dragon.add(head);
  mesh(head,sphere,gold,0,0,0,.33,.30,.42);
  mesh(head,sphere,bright,0,-.055,.35,.29,.145,.34);
  mesh(head,sphere,mouth,0,-.18,.26,.25,.15,.29);
  mesh(head,sphere,gold,0,-.30,.30,.25,.095,.33);
  for(const side of [-1,1]){
    mesh(head,poly,red,side*.238,.084,.265,.086,.059,.085);
    mesh(head,poly,ivory,side*.245,.092,.319,.029,.025,.024);
    mesh(head,poly,mouth,side*.145,-.01,.61,.051,.033,.037);
    for(let j=0;j<3;j++){
      const tooth=mesh(head,spike,ivory,side*(.12+j*.038),-.16,.44-j*.078,.032,.12,.035);
      tooth.rotation.z=Math.PI;
    }
    curve(head,[[.23*side,.15,-.14],[.48*side,.39,-.37],[.58*side,.62,-.61],[.77*side,.75,-.73]],.053,ivory);
    curve(head,[[.44*side,.38,-.34],[.43*side,.61,-.42],[.59*side,.7,-.52]],.033,ivory);
    curve(head,[[.23*side,-.04,.52],[.54*side,-.10,.63],[.81*side,.07,.45],[1.01*side,.19,.28]],.022,bright);
    for(let i=0;i<4;i++){
      const tuft=mesh(head,spike,mane,side*(.28+i*.072),.12+i*.065,-.20-i*.061,.14,.73-i*.04,.12);
      tuft.rotation.set(-.83,0,-side*(.70+i*.1));
    }
    for(const t of [.28,.58]){
      const p=spine.getPointAt(t);
      const hand=[p.x+side*.52,p.y-.28,p.z+.13];
      curve(dragon,[[p.x+side*.10,p.y,p.z],[p.x+side*.34,p.y-.16,p.z-.05],hand],.075,gold);
      mesh(dragon,poly,bright,...hand,.13,.09,.12);
      for(let j=0;j<3;j++){
        const claw=mesh(dragon,spike,ivory,hand[0]+(j-1)*.075,hand[1]-.035,hand[2]+.13,.036,.19,.04);
        claw.rotation.x=1.29;
      }
    }
  }
  const tail=spine.getPointAt(1);
  for(let i=-1;i<=1;i++){
    const fan=mesh(dragon,spike,mane,tail.x+i*.095,tail.y+.17,tail.z-.04,.105,.57,.074);
    fan.rotation.set(-.89,0,i*.48);
  }
  dragon.updateMatrixWorld(true);
  const pieces=new Map();
  dragon.traverse(part=>{
    if(!part.isMesh)return;
    const geo=(part.geometry.index?part.geometry.toNonIndexed():part.geometry.clone()).applyMatrix4(part.matrixWorld);
    for(const attr of Object.keys(geo.attributes))if(attr!=='position'&&attr!=='normal')geo.deleteAttribute(attr);
    if(!pieces.has(part.material))pieces.set(part.material,[]);
    pieces.get(part.material).push(geo);
  });
  const model=new T.Group();
  for(const [material,geometries] of pieces){
    model.add(new T.Mesh(mergeGeometries(geometries),material));
    for(const geo of geometries)geo.dispose();
  }
  const dragons=Array.from({length:6},()=>{
    const instance=model.clone();root.add(instance);return instance;
  });
  return {
    start(x,y,z){root.position.set(x,y+.83,z);aura.position.set(x,y+.12,z);},
    update(age){
      const t=age/1.45;
      root.visible=t>=0&&t<1;
      aura.visible=root.visible;
      if(!root.visible)return;
      ringsFX.forEach((ring,i)=>{
        const travel=Math.max(0,t-i*.105);
        ring.visible=travel>0;
        ring.position.y=.08+i*.15;
        ring.scale.setScalar(.38+travel*8.3);
        ring.material.opacity=Math.max(0,.47-travel*.55);
      });
      for(let i=0;i<72;i++){
        const angle=i*Math.PI/36+t*(1.5+i%3*.30);
        const radius=t*(3.1+(i%12)*.42);
        sparkPositions[i*3]=Math.cos(angle)*radius;
        sparkPositions[i*3+1]=.18+Math.sin(t*Math.PI)*(i%7)*.22;
        sparkPositions[i*3+2]=Math.sin(angle)*radius;
      }
      sparkGeometry.attributes.position.needsUpdate=true;
      sparkMaterial.opacity=(1-t)*.84;
      for(const [i,rig] of dragons.entries()){
        const angle=i*Math.PI/3+t*.66;
        const span=1.3+6.4*(1-(1-t)**2);
        rig.position.set(Math.cos(angle)*span,.18+Math.sin(t*Math.PI)*1.52,Math.sin(angle)*span);
        rig.rotation.set(.09+Math.sin(t*8+i)*.20,Math.PI/2-angle,-.13+Math.sin(t*7+i)*.27,'YXZ');
        rig.scale.setScalar(Math.min(1.12,.55+t*4,(1-t)*8));
      }
    }
  };
}
