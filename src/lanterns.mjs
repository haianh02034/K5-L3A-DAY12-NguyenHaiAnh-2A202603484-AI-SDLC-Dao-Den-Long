export const fullFuel=6000;
export const safeFuel=1800;
const fuelPerMote=600;
export const capacity=p=>Math.min(20,10+2*p.successfulLights);
export const fuelValue=l=>Number((l.fuelUnits/60).toFixed(1));
export const lightCost=l=>l.ever_lit?5:10;
export const canReceive=l=>!l.lit||l.fuelUnits<fullFuel;
export const isSafe=l=>l.lit&&l.fuelUnits>=safeFuel;
export const isWeak=l=>l.lit&&l.fuelUnits<safeFuel;

export function createLantern(id,pos,override){
  const lit=override?.lit??false;
  return {id,pos:[...(override?.pos??pos)],lit,deposited:override?.deposited??(lit?10:0),
    fuelUnits:lit?Math.round((override?.fuel??100)*60):0,
    ever_lit:override?.ever_lit??lit,relit_count:0};
}

export function burnFuel(game,emit) {
  const drains=new Map();
  for(const shade of game.shades){
    if(shade.state!=='drain')continue;
    const l=game.lanterns.find(l=>l.id===shade.targetLanternId);
    if(!l||!isWeak(l)||Math.hypot(shade.pos[0]-l.pos[0],shade.pos[2]-l.pos[2])>2)continue;
    if(!drains.has(l.id))drains.set(l.id,[]);
    drains.get(l.id).push(shade);
  }
  for(const l of game.lanterns){
    if(!l.lit)continue;
    const shades=drains.get(l.id)??[];
    l.fuelUnits=Math.max(0,l.fuelUnits-1-5*shades.length);
    if(game.simTick%60===0)for(const s of shades){
      emit('fuel_drain',{lantern_id:l.id,shade_id:s.id,fuel:fuelValue(l)});
    }
    if(l.fuelUnits===0){
      l.lit=false;l.ever_lit=true;l.deposited=0;
      emit('lantern_out',{lantern_id:l.id});
    }
  }
}

export function deposit(game,l,emit) {
  const p=game.player;
  if(l.lit){
    const amount=Math.min(p.carried,Math.ceil((fullFuel-l.fuelUnits)/fuelPerMote));
    if(!amount)return;
    l.fuelUnits=Math.min(fullFuel,l.fuelUnits+amount*fuelPerMote);
    p.carried-=amount;game.score+=amount*5;
    emit('refuel',{lantern_id:l.id,amount,fuel:fuelValue(l)});
    return;
  }
  const cost=lightCost(l);
  const amount=Math.min(p.carried,Math.max(0,cost-l.deposited));
  if(!amount)return;
  l.deposited+=amount;p.carried-=amount;game.score+=amount*5;
  emit('deposit',{lantern_id:l.id,amount,deposited:l.deposited});
  if(l.deposited<cost)return;
  const relight=l.ever_lit;
  l.lit=true;l.ever_lit=true;l.fuelUnits=fullFuel;
  if(relight)l.relit_count++;
  p.successfulLights++;
  game.score+=relight?40:100;
  emit('lantern_lit',{lantern_id:l.id,relight});
}
