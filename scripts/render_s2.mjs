// Reproducible, synthetic-only review captures. No owner/device/account session.
import {spawn} from 'node:child_process';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,relative} from 'node:path';
import {chromium} from '@playwright/test';
const root=resolve('.'),arg=process.argv.indexOf('--output-dir'),output=arg>=0?resolve(process.argv[arg+1]):null;
if(!output||!relative(root,output).startsWith('..'))throw new Error('Use --output-dir outside the checkout');
mkdirSync(output,{recursive:true});
const origin='http://127.0.0.1:4173',records=[];
const server=spawn(process.execPath,['--import','tsx','scripts/dev-synthetic.ts'],{env:{...process.env,SYNTHETIC_FIXTURES:'1'},stdio:['ignore','pipe','inherit']});
let browser;
try{
 await new Promise((yes,no)=>{let buffer='';const timeout=setTimeout(()=>no(new Error('Synthetic server startup timeout')),45000);server.stdout.on('data',data=>{buffer+=data.toString();if(buffer.includes('Synthetic-only')){clearTimeout(timeout);yes();}});server.on('exit',()=>{clearTimeout(timeout);no(new Error('Synthetic server exited'));});});
 browser=await chromium.launch();
 const context=await browser.newContext({viewport:{width:390,height:844},locale:'id-ID',timezoneId:'Asia/Makassar'});
 await context.addInitScript(()=>{localStorage.setItem('locale','id');localStorage.setItem('theme','system');});
 const request=context.request,contexts={};
 for(const type of ['academic','organization','personal']){const r=await request.post(origin+'/api/v1/contexts',{headers:{Origin:origin},data:{type,display_name:'Synthetic '+type}});if(!r.ok())throw new Error('Synthetic context failed');contexts[type]=(await r.json()).data.id;}
 const tasks=[];
 for(const f of JSON.parse(readFileSync('tests/fixtures/s2-ledger.json','utf8'))){const r=await request.post(origin+'/api/v1/tasks',{headers:{Origin:origin,'Idempotency-Key':crypto.randomUUID()},data:{title:f.title,context_id:contexts[f.context],due:f.due,status:f.status??'todo',description:'Synthetic owner-approved note'}});if(!r.ok())throw new Error('Synthetic task failed');tasks.push((await r.json()).data);}
 const settings=(await(await request.get(origin+'/api/v1/settings')).json()).data;
 const policy=await request.patch(origin+'/api/v1/settings/reminders',{headers:{Origin:origin,'If-Match':String(settings.version)},data:{enabled:true,offset_hours:[7,2],date_only_hour:11}});if(!policy.ok())throw new Error('Synthetic policy failed');
 async function page(theme){const p=await context.newPage();await p.emulateMedia({colorScheme:theme,reducedMotion:'reduce'});await p.clock.install({time:new Date('2026-11-06T03:59:00Z')});await p.clock.pauseAt(new Date('2026-11-06T04:00:00Z'));return p;}
 async function capture(p,name){await p.evaluate(()=>document.fonts.ready);await p.screenshot({path:output+'/'+name+'.png'});records.push({name,viewport:{width:390,height:844},synthetic:true});}
 for(const theme of ['light','dark']){
  const p=await page(theme);
  await p.goto(origin+'/today');await p.locator('.s2-ledger').waitFor();await capture(p,'today-'+theme);
  await p.locator('.s2-unknown').scrollIntoViewIfNeeded();await capture(p,'today-undated-'+theme);
  await p.goto(origin+'/tasks');await p.locator('.s2-ledger').waitFor();await capture(p,'tasks-'+theme);
  await p.locator('[data-group="undated"]').scrollIntoViewIfNeeded();await capture(p,'tasks-undated-'+theme);
  await p.getByRole('button',{name:'Tambah tugas',exact:true}).click();await p.locator('.s2-sheet').waitFor();await capture(p,'quick-sheet-'+theme);await p.keyboard.press('Escape');
  for(const precision of ['datetime','date_only','approximate','unknown']){
   const task=tasks.find(t=>t.due.precision===precision);
   await p.goto(origin+'/tasks/'+task.id);await p.locator('.s2-detail-title').waitFor();await capture(p,'detail-'+precision+'-'+theme);
   if(precision==='datetime'){
    await p.getByRole('button',{name:'Pratinjau tanggal',exact:true}).click();await p.locator('.s2-sheet').waitFor();await capture(p,'date-sheet-'+theme);await p.keyboard.press('Escape');
    await p.locator('.s2-detail').evaluate(el=>el.scrollTop=el.scrollHeight);await capture(p,'history-'+theme);
   }
  }
  await p.close();
  const ref=await page(theme);await ref.goto(origin+'/__kit');
  let html=readFileSync('docs/design/reference/app.html','utf8').replace(/<link[^>]*(?:fonts\.googleapis\.com|fonts\.gstatic\.com)[^>]*>/g,'');
  html=html.replace('</head>',`<style>@font-face{font-family:'Pixelify Sans';src:url('${origin}/fonts/pixelifysans.woff');font-weight:500 700;font-display:swap}@font-face{font-family:Inter;src:url('${origin}/fonts/inter.woff');font-weight:400 600;font-display:swap}</style></head>`);
  await ref.setContent(html);await capture(ref,'reference-today-'+theme);
  await ref.locator('.nav button[data-v="tasks"]').click();await capture(ref,'reference-tasks-'+theme);
  await ref.locator('[data-act="open"]').first().click();await capture(ref,'reference-detail-'+theme);
  await ref.close();
 }
 writeFileSync(output+'/RENDERS.json',JSON.stringify({browser:browser.version(),device:'unverified; desktop Chromium viewport only',motion:'reduced',clock:'2026-11-06T04:00:00Z (synthetic)',reference:'unchanged file; external fonts replaced in memory by identical local fonts',renders:records},null,2));
 console.log(`Captured ${records.length} synthetic review renders; browser ${browser.version()}. No device verdict or pixel-equality claim.`);
 await context.close();
}finally{if(browser)await browser.close();server.kill('SIGTERM');}
