import { chromium } from 'playwright-core';
import fs from 'fs';
const URL='https://vibecode-office-food.vercel.app';
const data=JSON.parse(fs.readFileSync('../Design/data/menu_items.json','utf8'));
const avail=data.filter(d=>d.is_available).sort((a,b)=>a.sort_order-b.sort_order);
const fmt=n=>n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const P=id=>data.find(d=>d.id===id).price;
const results=[]; const rec=(tc,status,expected,actual,ev='')=>{results.push({tc,status,expected,actual,ev});console.log(tc,status,'|',actual)};
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
async function open(w,h,tag){const ctx=await browser.newContext({viewport:{width:w,height:h}});const page=await ctx.newPage();const errs=[];const warns=[];
 page.on('console',m=>{if(m.type()==='error')errs.push(m.text());if(m.type()==='warning')warns.push(m.text())});page.on('pageerror',e=>errs.push('pageerror: '+e.message));
 await page.addInitScript(()=>document.addEventListener('securitypolicyviolation',e=>console.error('CSPVIOLATION '+e.violatedDirective+' '+e.blockedURI)));
 await page.goto(URL,{waitUntil:'networkidle'});await page.waitForSelector('.menu-card',{timeout:15000});return {page,errs,warns,ctx};}
const click=async(page,id,n=1)=>{for(let i=0;i<n;i++)await page.click(`.menu-card[data-id="${id}"]`)};
const summary=async page=>page.evaluate(()=>({lines:[...document.querySelectorAll('#sum-lines li.line')].map(l=>({id:+l.dataset.id,name:l.querySelector('.line-name').textContent.trim(),calc:l.querySelector('.line-calc').textContent.replace(/\s+/g,' ').trim(),total:l.querySelector('.line-total').textContent.trim()})),empty:document.querySelector('#sum-lines li.empty')?.textContent.trim()||null,qty:document.getElementById('sum-qty').textContent.trim(),total:document.getElementById('sum-total').textContent.trim()}));
const reset=async page=>{await page.reload({waitUntil:'networkidle'});await page.waitForSelector('.menu-card')};
function checkCart(tc,s,exp,ev){ // exp: [[id,qty]]
 let ok=s.lines.length===exp.length; let tq=0,ta=0; const want=[];
 exp.forEach(([id,q],i)=>{const p=P(id);tq+=q;ta+=p*q;const L=s.lines.find(l=>l.id===id);const w=`${fmt(p)} บาท x ${q} = ${fmt(p*q)} บาท`;want.push(`id${id}: ${w}`);
  if(!L||!L.calc.includes(fmt(p))||!L.calc.endsWith(' '+q)&&!L.calc.includes('x '+q)||!L.total.includes(fmt(p*q))||s.lines.filter(l=>l.id===id).length!==1)ok=false;});
 if(s.qty!==`${tq} ชิ้น`||!s.total.includes(fmt(ta)))ok=false;
 rec(tc,ok?'Pass':'Fail',want.join('; ')+`; รวม ${tq} ชิ้น ${fmt(ta)} บาท`,s.lines.map(l=>`id${l.id}: ${l.calc} = ${l.total}`).join('; ')+`; รวม ${s.qty} ${s.total}`,ev);}

// Desktop 1280
let {page,errs,warns,ctx}=await open(1280,800);
const ver=await page.textContent('#app-version'); console.log('VERSION',ver);
const cards=await page.$$eval('.menu-card',cs=>cs.map(c=>({id:+c.dataset.id,name:c.querySelector('.menu-name').textContent.trim(),price:c.querySelector('.menu-price').textContent.trim(),img:!!c.querySelector('img'),ph:!!c.querySelector('.img-ph'),cat:c.querySelector('.menu-cat').textContent.trim()})));
await page.screenshot({path:'evidence3/TC-01_desktop_menu.png',fullPage:true});
{const ok=cards.length===avail.length&&avail.every((a,i)=>cards[i]&&cards[i].id===a.id&&cards[i].name===a.name&&cards[i].price.includes(fmt(a.price)));
 rec('TC-01',ok?'Pass':'Fail',`${avail.length} รายการ ตามลำดับ sort_order ชื่อ/ราคาตรง CSV`,`${cards.length} รายการ: `+cards.map(c=>`${c.id}:${c.price}`).join(', '),'TC-01_desktop_menu.png');}
rec('TC-02',cards.some(c=>[11,12].includes(c.id))?'Fail':'Pass','id 11,12 ไม่แสดง',`ids แสดง: ${cards.map(c=>c.id).join(',')}`,'TC-01_desktop_menu.png');
{const broken=await page.$$eval('.menu-card img',is=>is.filter(i=>i.complete&&i.naturalWidth===0).length);const c4=cards.find(c=>c.id===4),c9=cards.find(c=>c.id===9);
 const ok=c4&&c4.ph&&c9&&c9.price&&broken===0; rec('TC-03',ok?'Pass':'Fail','รายการไม่มีรูป/ไม่มี category แสดงได้ ไม่มีรูปแตก',`id4 placeholder=${c4?.ph}, id9 cat="${c9?.cat}" price=${c9?.price}, รูปแตก=${broken}`,'TC-01_desktop_menu.png');}
{const m=Object.fromEntries(cards.map(c=>[c.id,c.price]));const ok=m[8]?.includes('1.00')&&m[10]?.includes('1,250.00')&&m[5]?.includes('45.50')&&m[6]?.includes('89.75');
 rec('TC-04',ok?'Pass':'Fail','1.00 / 1,250.00 / 45.50 / 89.75',`${m[8]} / ${m[10]} / ${m[5]} / ${m[6]}`,'TC-01_desktop_menu.png');}
{const o=await page.$$eval('.menu-card[data-id="7"], .menu-card[data-id="6"]',cs=>cs.map(c=>{const n=c.querySelector('.menu-name');return {sw:n.scrollWidth,cw:n.clientWidth,cardOver:c.scrollWidth>c.clientWidth+1}}));
 const ok=cards.find(c=>c.id===6)?.name===data[5].name&&o.every(x=>!x.cardOver); rec('TC-05',ok?'Pass':'Fail','ชื่อยาว/อักขระพิเศษแสดงครบ ไม่ล้น',JSON.stringify(o)+` name6="${cards.find(c=>c.id===6)?.name}"`,'TC-01_desktop_menu.png');}
{const s=await summary(page);const ok=s.lines.length===0&&s.empty==='ยังไม่มีรายการ'&&s.qty==='0 ชิ้น'&&s.total.includes('0.00');rec('TC-06',ok?'Pass':'Fail','ยังไม่มีรายการ, 0 ชิ้น, 0.00 บาท',`${s.empty}, ${s.qty}, ${s.total}`);}
await click(page,1);checkCart('TC-07',await summary(page),[[1,1]]);await reset(page);
await click(page,2,3);checkCart('TC-08',await summary(page),[[2,3]]);await reset(page);
for(let i=0;i<10;i++) page.click('.menu-card[data-id="8"]'); await page.waitForTimeout(1500);checkCart('TC-09',await summary(page),[[8,10]]);await reset(page);
await click(page,1,2);await click(page,3);await click(page,5,3);await page.screenshot({path:'evidence3/TC-10_desktop.png',fullPage:true});checkCart('TC-10',await summary(page),[[1,2],[3,1],[5,3]],'TC-10_desktop.png');await reset(page);
for(const id of [1,2,1,2,1])await click(page,id);checkCart('TC-11',await summary(page),[[1,3],[2,2]]);await reset(page);
for(const a of avail)await click(page,a.id);await page.screenshot({path:'evidence3/TC-12_all.png',fullPage:true});checkCart('TC-12',await summary(page),avail.map(a=>[a.id,1]),'TC-12_all.png');await reset(page);
await click(page,5,2);await click(page,6);checkCart('TC-13',await summary(page),[[5,2],[6,1]]);await reset(page);
await click(page,10,2);await click(page,8);checkCart('TC-14',await summary(page),[[10,2],[8,1]]);
await page.reload({waitUntil:'networkidle'});await page.waitForSelector('.menu-card');{const s=await summary(page);const ok=s.lines.length===0&&s.total.includes('0.00');rec('TC-15',ok?'Pass':'Fail','รีเฟรชแล้วว่าง 0.00 บาท',`lines=${s.lines.length}, ${s.qty}, ${s.total}`);}
// TC-17 desktop
await click(page,1,2);await click(page,3);await click(page,5,3);{const s=await summary(page);const hov=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);rec('TC-17',(s.lines.length===3&&!hov)?'Pass':'Fail','1280px ทำ TC-10 ได้ ไม่ล้นแนวนอน',`lines=${s.lines.length}, ${s.total}, overflowX=${hov}`,'TC-10_desktop.png');}
const dErr=[...errs],dWarn=[...warns]; await ctx.close();
// Mobile 360
({page,errs,warns,ctx}=await open(360,740));
await click(page,1);const s7=await summary(page);await reset(page);
await click(page,1,2);await click(page,3);await click(page,5,3);const s10=await summary(page);
const hov=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);
await page.screenshot({path:'evidence3/TC-16_mobile360_full.png',fullPage:true});
await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight/2));await page.waitForTimeout(300);await page.screenshot({path:'evidence3/TC-16_mobile360_viewport.png'});
// BUG-001 retest: scroll step by step, check visible pill overlapping qty/total
const ov=await page.evaluate(async()=>{const pill=document.querySelector('.cart-pill');const tg=[document.getElementById('sum-qty'),document.getElementById('sum-total')];const H=document.documentElement.scrollHeight;let bad=[];let steps=0;
 for(let y=0;y<=H;y+=40){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,120));steps++;const cs=getComputedStyle(pill);const vis=cs.display!=='none'&&cs.visibility!=='hidden'&&+cs.opacity>0.05&&!pill.hidden;if(!vis)continue;const a=pill.getBoundingClientRect();
  for(const t of tg){const b=t.getBoundingClientRect();if(b.bottom<0||b.top>innerHeight)continue;if(!(a.right<=b.left||a.left>=b.right||a.bottom<=b.top||a.top>=b.bottom))bad.push({y,id:t.id})}}
 document.getElementById('sum-total').scrollIntoView({block:'end'});await new Promise(r=>setTimeout(r,400));const cs=getComputedStyle(pill);
 return {steps,bad,atTotal:{display:cs.display,visibility:cs.visibility,opacity:cs.opacity,hidden:pill.hidden,inert:pill.inert,tabindex:pill.getAttribute('tabindex'),ariaHidden:pill.getAttribute('aria-hidden')}}});
await page.waitForTimeout(300);await page.screenshot({path:'evidence3/TC-16_mobile360_total.png'});
await page.evaluate(()=>window.scrollTo(0,0));await page.waitForTimeout(400);await page.screenshot({path:'evidence3/TC-16_mobile360_top_pill.png'});
const pillTop=await page.evaluate(()=>{const cs=getComputedStyle(document.querySelector('.cart-pill'));return cs.display!=='none'&&cs.visibility!=='hidden'&&+cs.opacity>0.05});
ov.overlap=ov.bad.length>0; ov.pillVisibleAtTop=pillTop;
{const ok=s7.lines.length===1&&s10.lines.length===3&&s10.total.includes('316.50')&&!hov&&!ov.overlap&&ov.pillVisibleAtTop;rec('TC-16',ok?'Pass':'Fail','360px ทำ TC-07, TC-10 ได้ ไม่ล้นแนวนอน',`TC-07 lines=${s7.lines.length} ${s7.total}; TC-10 lines=${s10.lines.length} ${s10.total}; overflowX=${hov}; BUG-001: ตรวจ ${ov.steps} ตำแหน่งเลื่อน พบปุ่มทับ=${ov.bad.length}; ตอนเห็นยอดรวม ปุ่ม=${JSON.stringify(ov.atTotal)}; ปุ่มแสดงตอนอยู่บนสุด=${ov.pillVisibleAtTop}`,'TC-16_mobile360_full.png, TC-16_mobile360_total.png, TC-16_mobile360_top_pill.png');}
const allErr=[...dErr,...errs],allWarn=[...dWarn,...warns];
rec('TC-18',allErr.length?'Fail':'Pass','ไม่มี console error',`errors=${allErr.length} ${allErr.join(' | ')}; warnings=${allWarn.length} ${allWarn.join(' | ')}`);
await ctx.close();
{const c=await browser.newContext({viewport:{width:360,height:740}});const p=await c.newPage();const e=[];p.on('console',m=>{if(m.type()==='error')e.push(m.text())});
 await p.route('**/rest/v1/menu_items**',r=>r.abort());await p.goto(URL,{waitUntil:'networkidle'});await p.waitForTimeout(1500);const st=await p.textContent('#menu-state');await p.screenshot({path:'evidence3/OBS-01_load_error.png'});
 const ok=e.some(x=>x.includes('โหลดเมนูไม่สำเร็จ'));rec('TC-18b',ok?'Pass':'Fail','(ตรวจ OBS-01) เมื่อโหลดเมนูล้มเหลว ต้องมี console.error และข้อความแจ้งผู้ใช้',`console.error=${JSON.stringify(e)}; ข้อความ="${st.trim()}"`,'OBS-01_load_error.png');await c.close();}
{const c=await browser.newContext({viewport:{width:1280,height:800}});const p=await c.newPage();const e=[];p.on('console',m=>{if(m.type()==='error')e.push(m.text())});
 await p.addInitScript(()=>document.addEventListener('securitypolicyviolation',ev=>console.error('CSPVIOLATION '+ev.violatedDirective+' '+ev.blockedURI)));
 await p.route('**/placehold.co/**Kaprao**',r=>r.fulfill({status:404,body:'x'}));
 await p.goto(URL,{waitUntil:'networkidle'});await p.waitForSelector('.menu-card');await p.waitForTimeout(1500);
 const st=await p.evaluate(()=>{const c=document.querySelector('.menu-card[data-id="1"]');const img=c.querySelector('img');return {img:!!img,broken:img?(img.complete&&img.naturalWidth===0):false,ph:!!c.querySelector('.img-ph'),name:c.querySelector('.menu-name').textContent.trim()}});
 await p.screenshot({path:'evidence3/TC-03b_image_fallback.png',clip:{x:0,y:0,width:1280,height:600}});
 const csp=e.filter(x=>x.includes('CSPVIOLATION')||/Content Security Policy/i.test(x));
 const ok=!st.broken&&(st.ph||!st.img)&&csp.length===0;rec('TC-03b',ok?'Pass':'Fail','(201 ขอ) รูปโหลดไม่ได้ ต้องมี fallback ไม่มีรูปแตก และไม่มี CSP error',`id1 ${JSON.stringify(st)}; CSP errors=${JSON.stringify(csp)}; console errors อื่น=${JSON.stringify(e.filter(x=>!csp.includes(x)))}`,'TC-03b_image_fallback.png');await c.close();}
await browser.close();
fs.writeFileSync('results_run3.json',JSON.stringify({version:ver,ov,results},null,1));
