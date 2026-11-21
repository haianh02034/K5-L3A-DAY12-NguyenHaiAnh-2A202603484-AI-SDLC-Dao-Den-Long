import { parseArgs } from 'node:util';
import { writeFile } from 'node:fs/promises';
import { createGame, idleInput, seeded, step } from '../src/game.mjs';

try{
  const {values}=parseArgs({options:{seed:{type:'string'},nights:{type:'string'},out:{type:'string'}}});
  const seed=Number(values.seed),nights=Number(values.nights);
  if(!Number.isSafeInteger(seed)||!Number.isSafeInteger(nights)||nights<1||!values.out)throw Error('Expected --seed INT --nights COUNT --out FILE');
  const rss=()=>process.memoryUsage().rss/1048576;
  const start=performance.now();
  const results=[];
  let memStart,crashes=0;
  for(let i=0;i<nights;i++){
    try{
      const game=createGame(seed+i,{},i%3+1);
      if(i===0)memStart=rss();
      const rng=seeded(seed+i);
      const input={...idleInput};
      const limit=Math.ceil(game.initialTime*60);
      for(let tick=0;tick<limit&&game.state==='playing';tick++){
        if(tick%30===0){
          const a=rng()*Math.PI*2;
          input.move=[Math.cos(a),Math.sin(a)];
        }
        input.jump=rng()<.05;input.dash=rng()<.03;input.pulse=rng()<.02;input.interact=rng()<.10;
        step(game,input);
      }
      results.push(game.state);
    }catch(error){
      crashes++;results.push('crash');console.error(error.message);
    }
  }
  global.gc?.();
  const out={nights,crashes,results,mem_start_mb:Number((memStart??rss()).toFixed(2)),
    mem_end_mb:Number(rss().toFixed(2)),duration_s:Number(((performance.now()-start)/1000).toFixed(3))};
  await writeFile(values.out,JSON.stringify(out,null,2)+'\n');
  if(crashes)process.exitCode=1;
}catch(error){console.error(error.message);process.exitCode=1;}
