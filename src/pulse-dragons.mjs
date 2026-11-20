import * as T from 'three';

export function createPulseDragons(scene) {
  const root=new T.Group();
  root.name='Pulse Dragons';
  root.visible=false;
  scene.add(root);
  const pearl=new T.IcosahedronGeometry(1,0);
  const fang=new T.ConeGeometry(1,1,5);
  const gold=new T.MeshBasicMaterial({color:'#ffc064',toneMapped:false});
  const pale=new T.MeshBasicMaterial({color:'#fff3b3',toneMapped:false});
  const ember=new T.MeshBasicMaterial({color:'#f48d48',toneMapped:false});
  const dragons=[];
  function mesh(group,geo,mat,x,y,z,sx,sy,sz) {
    const item=new T.Mesh(geo,mat);
    item.position.set(x,y,z);item.scale.set(sx,sy,sz);group.add(item);
    return item;
  }
  for(let i=0;i<6;i++){
    const rig=new T.Group(), head=new T.Group(), body=[];
    root.add(rig);rig.add(head);
    head.scale.setScalar(1.55);
    mesh(head,pearl,gold,0,0,0,.24,.24,.32);
    mesh(head,pearl,pale,0,-.06,.29,.18,.15,.27);
    for(const sign of [-1,1]){
      const horn=mesh(head,fang,pale,sign*.17,.22,-.15,.09,.42,.08);
      horn.rotation.x=-.57;horn.rotation.z=-sign*.30;
      mesh(head,pearl,ember,sign*.166,.058,.245,.046,.043,.050);
      const whisker=mesh(head,fang,gold,sign*.24,-.035,.28,.034,.39,.033);
      whisker.rotation.z=-sign*1.06;whisker.rotation.x=.38;
    }
    for(let j=1;j<=9;j++){
      const size=(10-j)*.025+.045;
      body.push(mesh(rig,pearl,j%2?gold:ember,0,0,0,size,size,size*1.55));
    }
    dragons.push({rig,head,body});
  }
  function pose(angle,r,u){
    return [Math.cos(angle)*r,.14+Math.sin(u)*.68,Math.sin(angle)*r];
  }
  return {
    start(x,y,z){root.position.set(x,y+.8,z);},
    update(age) {
      const progress=age/1.2;
      root.visible=progress>=0&&progress<1;
      if(!root.visible)return;
      for(const [i,{rig,head,body}] of dragons.entries()){
        const a=i*Math.PI/3;
        const size=Math.max(.02,Math.min(1,.55+progress*9,(1-progress)*5));
        rig.scale.setScalar(size);
        const radius=.42+5.50*(1-(1-progress)**1.6);
        const swirl=a+progress*.83;
        const [x,y,z]=pose(swirl,radius,progress*Math.PI);
        head.position.set(x/size,y/size,z/size);
        head.lookAt(root.position.x+x*1.2,root.position.y+y+.18,root.position.z+z*1.2);
        for(const [j,part] of body.entries()){
          const lag=(j+1)*.25;
          const r=Math.max(.24,radius-lag);
          const [tx,ty,tz]=pose(swirl-lag*.3,r,progress*Math.PI-lag);
          part.position.set(tx/size,ty/size,tz/size);
        }
      }
    }
  };
}
