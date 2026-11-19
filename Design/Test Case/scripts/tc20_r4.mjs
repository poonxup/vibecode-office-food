import { chromium } from 'playwright-core';
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
const p=await (await b.newContext({viewport:{width:1280,height:800}})).newPage();
await p.goto('https://vibecode-office-food.vercel.app',{waitUntil:'networkidle'});await p.waitForSelector('.menu-card');
const ids=await p.$$eval('.menu-card',c=>c.map(x=>x.dataset.id));console.log(process.argv[2],ids.join(','));
await p.screenshot({path:`evidence4/TC-20_${process.argv[2]}.png`});await b.close();
