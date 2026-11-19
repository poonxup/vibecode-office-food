import { chromium } from 'playwright-core';
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
const p=await (await b.newContext({viewport:{width:360,height:740}})).newPage();const errs=[];p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto('https://vibecode-office-food.vercel.app',{waitUntil:'networkidle'});await p.waitForSelector('.menu-card');
await p.click('.menu-card[data-id="1"]');await p.click('.menu-card[data-id="5"]');
const vis=()=>p.evaluate(()=>{const cs=getComputedStyle(document.querySelector('.cart-pill'));return cs.visibility!=='hidden'&&+cs.opacity>0.05&&cs.display!=='none'});
const log=[];let ok=true;
for(let i=1;i<=10;i++){
 await p.evaluate(()=>document.getElementById('sum-total').scrollIntoView({block:'end'}));await p.waitForTimeout(500);const down=await vis();
 await p.evaluate(()=>window.scrollTo(0,0));await p.waitForTimeout(500);const up=await vis();
 // fast wheel scrolling too
 await p.mouse.wheel(0,4000);await p.waitForTimeout(80);await p.mouse.wheel(0,-4000);await p.waitForTimeout(500);const fast=await vis();
 log.push(`r${i}:down=${down},up=${up},fast=${fast}`);if(down||!up||!fast)ok=false;}
await p.screenshot({path:'evidence3/TC-16b_after10rounds_top.png'});
await p.click('.cart-pill');await p.waitForTimeout(800);const jumped=await p.evaluate(()=>{const r=document.getElementById('summary').getBoundingClientRect();return r.top<innerHeight&&r.bottom>0});
console.log(JSON.stringify({ok:ok&&jumped&&!errs.length,jumped,errs,log}));await b.close();
