import { access } from 'node:fs/promises';
import { chromium } from 'playwright-core';

export async function launchBrowser({headless=false,args=[]}={}){
  const roots=process.env;
  const win=[roots['PROGRAMFILES(X86)'],roots.ProgramFiles,roots.LOCALAPPDATA].filter(Boolean);
  const candidates=[
    roots.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
    ...win.flatMap(p=>[p+'/Microsoft/Edge/Application/msedge.exe',p+'/Google/Chrome/Application/chrome.exe']),
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser','/usr/bin/microsoft-edge',
    chromium.executablePath(),
  ].filter(Boolean);
  for(const executablePath of candidates){
    try{await access(executablePath);}catch{continue;}
    return chromium.launch({executablePath,headless,args});
  }
  throw new Error('Install Chrome, Edge or Chromium, or set PLAYWRIGHT_CHROMIUM_EXECUTABLE.');
}
