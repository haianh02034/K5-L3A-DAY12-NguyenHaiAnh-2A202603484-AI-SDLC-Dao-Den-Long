import { createServer } from 'node:http';
import { readFile,writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { release,platform } from 'node:os';
import { launchBrowser } from './browser.mjs';

const started=Date.now();
let server,browser;
try{
  const {values}=parseArgs({options:{seed:{type:'string'},duration:{type:'string'},out:{type:'string'}}});
  const seed=Number(values.seed),duration=Number(values.duration);
  if(!Number.isSafeInteger(seed)||!Number.isFinite(duration)||duration<=0||!values.out)throw Error('Expected --seed INT --duration SECONDS --out FILE');
  const html=await readFile(new URL('../dist/index.html',import.meta.url));
  server=createServer((_req,res)=>res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end(html));
  await new Promise((resolve,reject)=>server.listen(0,'127.0.0.1',resolve).once('error',reject));
  browser=await launchBrowser({args:['--window-size=1280,820','--disable-gpu-vsync','--disable-frame-rate-limit',
    '--disable-background-timer-throttling','--disable-renderer-backgrounding','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
  page.on('pageerror',error=>console.error(error.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/?bench=1&seed='+seed+'&duration='+duration);
  await page.bringToFront();
  await page.waitForFunction(()=>Boolean(window.benchmarkResult),null,{timeout:(duration+90)*1000});
  const {times,renderer,firstFrame}=await page.evaluate(()=>window.benchmarkResult);
  if(!times.length)throw Error('No frames completed during measurement.');
  const n=times.length,k=Math.max(1,Math.ceil(.01*n));
  const sorted=times.toSorted((a,b)=>a-b);
  const sum=list=>list.reduce((a,b)=>a+b,0);
  const round=n=>Number(n.toFixed(2));
  const result={contract_version:'1.3',avg_fps:round(1000*n/sum(times)),
    p1_low_fps:round(1000*k/sum(sorted.slice(-k))),frame_ms_p95:round(sorted[Math.ceil(.95*n)-1]),
    frames:n,load_ms:firstFrame-started,peak_mem_mb:null,vsync_off:false,renderer,os:platform()+' '+release()};
  await writeFile(values.out,JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result));
}catch(error){console.error(error.message);process.exitCode=1;}
finally{await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));}
