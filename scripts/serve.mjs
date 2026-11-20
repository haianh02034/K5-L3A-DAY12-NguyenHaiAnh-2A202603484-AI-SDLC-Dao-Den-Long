import { createServer } from 'node:http';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { resolve, dirname } from 'node:path';
import { homedir } from 'node:os';
import { rank,validScore } from '../src/leaderboard.mjs';

const file=resolve(process.env.DAO_DEN_LONG_LEADERBOARD??resolve(homedir(),'.dao-den-long','leaderboard.json'));
async function entries(){
  try{return rank(JSON.parse(await readFile(file,'utf8')).entries);}
  catch(error){if(error.code==='ENOENT')return [];throw error;}
}
const {values}=parseArgs({options:{'export-leaderboard':{type:'string'}}});
if(values['export-leaderboard']){
  await writeFile(values['export-leaderboard'],JSON.stringify({entries:await entries()},null,2)+'\n');
}else{
  const html=await readFile(new URL('../dist/index.html',import.meta.url));
  let pending=Promise.resolve();
  const send=(res,value,status=200)=>res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify(value));
  createServer(async (request,response)=>{
    const path=new URL(request.url,'http://127.0.0.1').pathname;
    try{
      if(path==='/leaderboard'&&request.method==='GET'){
        send(response,{entries:await entries()});return;
      }
      if(path==='/leaderboard'&&request.method==='POST'){
        if(request.headers['content-type']!=='application/json'){send(response,{error:'Expected JSON'},415);return;}
        let body='';
        for await(const chunk of request){
          body+=chunk;
          if(body.length>4096){send(response,{error:'Entry too large'},413);return;}
        }
        let entry;
        try{entry=JSON.parse(body);}catch{send(response,{error:'Invalid JSON'},400);return;}
        if(!validScore(entry)){send(response,{error:'Invalid score entry'},400);return;}
        const save=pending.then(async ()=>{
          const list=rank([...(await entries()),entry]);
          await mkdir(dirname(file),{recursive:true});
          const temp=file+'.tmp';
          await writeFile(temp,JSON.stringify({entries:list},null,2)+'\n');
          await rename(temp,file);
          return list;
        });
        pending=save.catch(()=>{});
        send(response,{entries:await save},201);return;
      }
      if(request.method==='GET'&&(path==='/'||path==='/index.html')){
        response.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end(html);return;
      }
      response.writeHead(404).end();
    }catch(error){console.error(error.message);send(response,{error:'Could not access leaderboard'},500);}
  }).listen(4173,'127.0.0.1',()=>console.log('http://127.0.0.1:4173'));
}
