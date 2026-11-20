const rings = (radius, count, offset = 0, x = 0, y = 0, z = 0) =>
  Array.from({length:count}, (_,i) => {
    const a = (offset + i * 360 / count) * Math.PI / 180;
    return [x + Math.cos(a)*radius, y, z + Math.sin(a)*radius];
  });
const zone = (x,radius) => ({x,radius});
const lamps = positions => positions.map(([x,y,z],i)=>({id:'L'+(i+1),name:'Đèn Lồng '+(i+1),pos:[x,y,z]}));

export const maps = [
  {name:'Đảo Bến', words:'Ánh đèn đầu tiên sẽ dẫn con qua biển mây.', seed:18271, radius:40,
    zones:[zone(0,40)], lanterns:lamps([[0,0,25],[23.8,0,7.7],[14.7,0,-20.2],[-14.7,0,-20.2],[-23.8,0,7.7]]),
    moteSpawns:[...rings(12,8),...rings(33,16)], shadeSpawns:rings(37,12,15), shadeInterval:480, shadeCap:6,
    pads:[], charms:[]},
  {name:'Đảo Cau', words:'Cầu tre không lan can. Bục gió sẽ đưa con qua khoảng trống.', seed:31683, radius:101,
    zones:[zone(0,28),zone(70,28)], lanterns:lamps([[0,0,20],[17,0,-10],[-17,0,-10],[70,0,20],[87,0,-10],[53,0,-10]]),
    moteSpawns:[0,70].flatMap(x=>[...rings(10,4,0,x),...rings(22,8,0,x)]),
    shadeSpawns:[0,70].flatMap(x=>rings(26,8,22.5,x)), shadeInterval:420, shadeCap:8,
    pads:[{pos:[20,0,18],target:[70,0],speed:24,up:14},{pos:[50,0,-18],target:[0,0],speed:24,up:14}],
    charms:[[35,0,0]]},
  {name:'Đảo Chuông', words:'Theo sườn dốc lên vành đá. Khi gió lặng, hãy nhảy tới tháp chuông.', seed:71271, radius:45, spawn:[0,0,29],
    zones:[zone(0,45)], lanterns:lamps([[0,6,6],[18,3,10],[-18,3,10],[35,0,-10],[-35,0,-10],[20,0,-35],[-20,0,-35]]),
    moteSpawns:[...rings(34,18),...Array.from({length:8},(_,i)=>{
      const a=(i+1)*Math.PI/9;return [18*Math.cos(a),3,18*Math.sin(a)];
    }),...rings(5,4,45,0,6)], shadeSpawns:rings(43,16), shadeInterval:360, shadeCap:10,
    pads:[{pos:[0,3,13],target:[0,0],speed:8,up:12}], charms:[[30,0,25],[-30,0,25]]},
];

export function surface(night,x,z) {
  const r=Math.hypot(x,z);
  if(night===1) return r<=40?0:-Infinity;
  if(night===2) return r<=28||Math.hypot(x-70,z)<=28||(x>=26&&x<=44&&Math.abs(z)<=2)?0:-Infinity;
  if(r>45) return -Infinity;
  if(r<=8) return 6;
  if(z>0&&r>=12&&r<=24) return 3;
  for(const angle of [Math.PI/6,5*Math.PI/6]){
    const u=x*Math.cos(angle)+z*Math.sin(angle), v=z*Math.cos(angle)-x*Math.sin(angle);
    if(u>=23.9&&u<=30&&Math.abs(v)<=1.5)return Math.min(3,(30-u)*.5);
  }
  return 0;
}
