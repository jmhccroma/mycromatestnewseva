(async()=>{
/* ================= 1. CONFIG ================= */
const sevaName="Srivari Seva, Sri KRT-Vontimitta-Kadapa-Batch-A";
const tdId='24/10'; /* month is 0-based: 26/9 = 26 Oct, 26/10 = 26 Nov */

/* ================= 2. BASIC HELPERS ================= */
window.alert=function(){};
window.confirm=function(){return true;};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const nextFrame=()=>new Promise(r=>requestAnimationFrame(r));
const until=(fn,ms,step=25)=>new Promise(res=>{const s=Date.now();const t=setInterval(()=>{let v=null;try{v=fn();}catch(e){}if(v||Date.now()-s>ms){clearInterval(t);res(v||null);}},step);});
const isVis=b=>b.offsetParent!==null&&!b.disabled&&b.offsetHeight>0;

const simClick=el=>{
  if(!el)return;
  el.scrollIntoView({behavior:'smooth',block:'center'});
  ['mousedown','mouseup','click'].forEach(type=>el.dispatchEvent(new MouseEvent(type,{bubbles:true,cancelable:true,view:window})));
};

const waitFor=fn=>new Promise(resolve=>{
  let el=fn(); if(el)return resolve(el);
  const obs=new MutationObserver(()=>{let el=fn();if(el){obs.disconnect();resolve(el);}});
  obs.observe(document.body,{childList:true,subtree:true,attributes:true});
});

const waitGone=(fn,timeout=10000)=>new Promise(resolve=>{
  if(!fn())return resolve();
  const obs=new MutationObserver(()=>{if(!fn()){obs.disconnect();resolve();}});
  obs.observe(document.body,{childList:true,subtree:true,attributes:true});
  setTimeout(()=>{obs.disconnect();resolve();},timeout);
});

/* fallback: wait until the page stops changing */
const settle=(quietMs=600,maxMs=3000)=>new Promise(resolve=>{
  let last=Date.now();const start=Date.now();
  const obs=new MutationObserver(()=>{last=Date.now();});
  obs.observe(document.body,{childList:true,subtree:true,attributes:true,characterData:true});
  const t=setInterval(()=>{if(Date.now()-last>=quietMs||Date.now()-start>=maxMs){clearInterval(t);obs.disconnect();resolve();}},50);
});

/* ---- React helpers ---- */
const pk=el=>{const k=Object.keys(el).find(k=>k.startsWith('__reactProps'));return k?el[k]:null;};
const fakeEv=el=>({preventDefault(){},stopPropagation(){},persist(){},target:el,currentTarget:el,nativeEvent:{isTrusted:true}});
const pressReal=el=>{
  const r=el.getBoundingClientRect();
  const o={bubbles:true,cancelable:true,view:window,clientX:r.left+r.width/2,clientY:r.top+r.height/2,button:0};
  ['pointerdown','mousedown','pointerup','mouseup','click'].forEach(t=>{
    const E=t.startsWith('pointer')?PointerEvent:MouseEvent;
    el.dispatchEvent(new E(t,o));
  });
  let n=el,d=0;
  while(n&&d<4){const p=pk(n);if(p&&p.onClick){try{p.onClick(fakeEv(n));}catch(e){}break;}n=n.parentElement;d++;}
};

/* ================= 3. GENERIC POPUP HANDLERS (original) ================= */
const dialogSelector='[role="dialog"],[role="alertdialog"],.modal,.popup';

const dismissPopup=()=>new Promise(resolve=>{
  let waited=0;
  let t=setInterval(()=>{
    waited+=50;
    let dlg=document.querySelector(dialogSelector);
    if(dlg){
      let btn=[...dlg.querySelectorAll('button')].find(b=>/Yes|Ok|Confirm|Proceed|Continue/i.test(b.innerText.trim()))
        ||[...dlg.querySelectorAll('button')].find(b=>!/cancel|close|no/i.test(b.innerText.trim()));
      if(btn)simClick(btn);
      let t2=setInterval(()=>{ if(!document.querySelector(dialogSelector)){clearInterval(t2);resolve();} },50);
      clearInterval(t); return;
    }
    if(waited>=300){clearInterval(t);resolve();}
  },50);
});

const drainPopups=async(maxWaitMs=6000)=>{
  const start=Date.now(); let clearTicks=0;
  while(Date.now()-start<maxWaitMs){
    const dlg=document.querySelector(dialogSelector);
    if(!dlg){ clearTicks++; if(clearTicks>=2)break; await wait(50); continue; }
    clearTicks=0;
    let btn=[...dlg.querySelectorAll('button')].find(b=>/yes|ok|confirm|proceed|continue/i.test(b.innerText.trim()))
      ||[...dlg.querySelectorAll('button')].find(b=>!/cancel|close|no/i.test(b.innerText.trim()));
    if(btn){ simClick(btn); }
    else{ document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})); document.body.click(); }
    await wait(50);
  }
};

/* ================= 4. BUTTON FINDERS (original) ================= */
const getSubBtn=()=>[...document.querySelectorAll('button')].find(b=>isVis(b)&&/continue|proceed|next/i.test(b.innerText.trim())&&!/back|cancel|close|no/i.test(b.innerText.trim()));
const getConfBtn=()=>{
  let byType=document.querySelector('button[type="submit"]');
  if(byType&&isVis(byType))return byType;
  return[...document.querySelectorAll('button')].find(b=>isVis(b)&&/submit|confirm|book|pay/i.test(b.innerText.trim())&&!/back|cancel|close|no/i.test(b.innerText.trim()))
    ||[...document.querySelectorAll('button')].filter(b=>isVis(b)&&!/back|cancel|close|no/i.test(b.innerText.trim())).pop();
};

/* ================= 5. "ARE YOU SURE YOU WANT TO CANCEL?" -> CLICK YES ================= */
let lastYes=0;
const cancelPopupVisible=()=>[...document.querySelectorAll('div,p,span,h1,h2,h3,h4')].find(e=>e.offsetHeight>0&&e.children.length===0&&/are you sure you want to cancel/i.test(e.innerText||''));
const clickYesOnPopup=()=>{
  if(Date.now()-lastYes<250)return false;
  const t=cancelPopupVisible();
  if(!t)return false;
  let box=t;
  for(let i=0;i<6&&box;i++){
    const yes=[...box.querySelectorAll('*')].find(b=>b.offsetHeight>0&&b.children.length===0&&b.innerText&&b.innerText.trim().toLowerCase()==='yes');
    if(yes){lastYes=Date.now();pressReal(yes.closest('button')||yes);return true;}
    box=box.parentElement;
  }
  return false;
};
const cancelObs=new MutationObserver(clickYesOnPopup);
cancelObs.observe(document.body,{childList:true,subtree:true,attributes:true});
const cancelTimer=setInterval(clickYesOnPopup,30);
const stopCancelWatch=()=>{clearInterval(cancelTimer);cancelObs.disconnect();};

try{
/* ================= 6. STEP 1: CONTINUE -> SEVA PAGE ================= */
simClick(await waitFor(getSubBtn));
await dismissPopup();
await waitFor(()=>document.querySelector('input[name="sevaName"]'));
console.log('[1/6] seva page reached');

/* ================= 7. STEP 2: SELECT SEVA (3 attempts) ================= */
const sevaInput=document.querySelector('input[name="sevaName"]');
const getItem=()=>[...sevaInput.parentElement.querySelectorAll('li')].find(li=>li.offsetHeight>0&&li.innerText.trim()===sevaName)
  ||[...document.querySelectorAll('li')].find(li=>li.offsetHeight>0&&li.innerText.trim()===sevaName);
const selected=()=>sevaInput.value===sevaName;
const hadPrev=!!sevaInput.value&&sevaInput.value!==sevaName;
const openViaState=async()=>{
  let f=sevaInput[Object.keys(sevaInput).find(k=>k.startsWith('__reactFiber'))];
  let d=0;
  while(f&&d<15){
    if(typeof f.type==='function'){
      let h=f.memoizedState;
      while(h&&typeof h==='object'){
        if(h.queue&&h.queue.dispatch&&typeof h.memoizedState==='boolean'){
          const s=h.memoizedState;
          h.queue.dispatch(!s);
          if(await until(getItem,300))return true;
          h.queue.dispatch(s);
        }
        h=h.next;
      }
    }
    f=f.return; d++;
  }
  return false;
};
const selectSeva=async()=>{
  for(let attempt=1;attempt<=3&&!selected();attempt++){
    let item=getItem();
    if(!item){
      const ip=pk(sevaInput);
      if(ip&&ip.onClick){try{ip.onClick(fakeEv(sevaInput));}catch(e){}}
      item=await until(getItem,600);
    }
    if(!item){await openViaState();item=await until(getItem,1000);}
    if(!item){console.warn('seva list not opened, attempt',attempt);continue;}
    try{pk(item).onClick(fakeEv(item));}catch(e){console.warn('li onClick err',e);}
    if(await until(selected,1500))break;
    console.warn('seva not selected, attempt',attempt);
  }
  return selected();
};
if(!selected()){
  if(!(await selectSeva())){console.error('Seva could not be selected after 3 attempts!');return;}
}
console.log('[2/6] seva selected');

/* popup after seva change: wait only when expected; watcher clicks Yes */
if(hadPrev){
  await until(cancelPopupVisible,500);
  await until(()=>!cancelPopupVisible(),2000);
}
const yesBtn=await until(()=>[...document.querySelectorAll('button')].find(b=>isVis(b)&&/^(yes|ok|confirm)$/i.test(b.innerText.trim())),hadPrev?400:100);
if(yesBtn){yesBtn.click();}

/* ================= 8. STEP 3: SMART DATE PICK ================= */
const panelShown=()=>document.querySelector('button[style*="RadioButton.svg"]')||document.querySelector('.checkmark.smallCheckbox');
const cellInfo=td=>{
  const fk=Object.keys(td).find(k=>k.startsWith('__reactFiber'));
  const fp=fk&&td[fk]&&td[fk].memoizedProps;
  const cs=getComputedStyle(td);
  const kid=td.firstElementChild?getComputedStyle(td.firstElementChild).backgroundColor:'';
  return {fn:fp&&fp.onClick,sig:td.className+'|'+cs.backgroundColor+'|'+cs.color+'|'+cs.opacity+'|'+kid};
};
const tryClick=async td=>{
  td.style.pointerEvents='auto';
  const {fn}=cellInfo(td);
  if(typeof fn==='function'){try{fn();}catch(e){}}
  if(await until(panelShown,350,20))return true;
  pressReal(td);
  return !!(await until(panelShown,350,20));
};
const pickDate=async(maxMs=20000)=>{
  const start=Date.now(); let lastFn=null,lastSig='',lastTry=0,lastTd=null,settledOnce=false;
  while(Date.now()-start<maxMs){
    if(panelShown())return true;
    if(cancelPopupVisible()){await wait(30);continue;} /* never click under the cancel popup */
    const tds=[...document.querySelectorAll('[id="'+tdId+'"]')];
    const td=tds[tds.length-1];
    if(td){
      const info=cellInfo(td);
      const changed=td!==lastTd||info.fn!==lastFn||info.sig!==lastSig;
      if(changed||Date.now()-lastTry>600){ /* 600 ms between blind retries: avoids toggling the date off */
        lastTd=td;lastFn=info.fn;lastSig=info.sig;lastTry=Date.now();
        if(await tryClick(td))return true;
        for(const other of tds.slice(0,-1).reverse()){ if(await tryClick(other))return true; }
        const nt=[...document.querySelectorAll('[id="'+tdId+'"]')].pop();
        if(nt){const ni=cellInfo(nt);lastTd=nt;lastFn=ni.fn;lastSig=ni.sig;}
      }
    }
    if(!settledOnce&&Date.now()-start>4000){settledOnce=true;await settle(600,3000);} /* safety net from the slower script */
    await wait(30);
  }
  return false;
};
if(!(await pickDate())){console.error('Date '+tdId+' not selected (slot panel never appeared)!');return;}
stopCancelWatch();
console.log('[3/6] date selected');

/* ================= 9. STEP 4: SLOT + TERMS + CONTINUE (with one redo) ================= */
const getContinue=()=>[...document.querySelectorAll('button')].find(b=>b.innerText.trim()==='Continue'&&!b.disabled);
const slotAndTerms=async()=>{
  const slotButton=await until(()=>document.querySelector('button[style*="RadioButton.svg"]'),1500);
  if(slotButton){slotButton.click();}
  const checkbox=await until(()=>document.querySelector('.checkmark.smallCheckbox'),800);
  if(checkbox){checkbox.click();}
  return await until(getContinue,2500);
};
let continueBtn=await slotAndTerms();
if(!continueBtn){
  console.warn('Continue not ready, redoing date + slot once');
  if(!panelShown()) await pickDate(8000);
  continueBtn=await slotAndTerms();
}
if(continueBtn){continueBtn.click();}else{console.error('Continue not ready!');return;}
await waitGone(()=>document.getElementById(tdId),10000);
console.log('[4/6] on sevak checkbox page');

/* ================= 10. STEP 5: SEVAK CHECKBOXES (original logic) ================= */
await waitFor(()=>document.querySelector('input[type="checkbox"]'));
let lastCount=-1,stableTicks=0;
while(stableTicks<3){
  const count=document.querySelectorAll('input[type="checkbox"]').length;
  if(count===lastCount)stableTicks++; else{stableTicks=0;lastCount=count;}
  await wait(100);
}

const isDialogVisible=dlg=>dlg&&dlg.offsetParent!==null&&getComputedStyle(dlg).display!=='none'&&getComputedStyle(dlg).visibility!=='hidden';
const findVisibleDialog=()=>[...document.querySelectorAll(dialogSelector)].find(isDialogVisible);
const closeDialogNow=dlg=>{
  let btn=[...dlg.querySelectorAll('button')].find(b=>/yes|ok|confirm|proceed|continue/i.test(b.innerText.trim()))
    ||[...dlg.querySelectorAll('button')].find(b=>!/cancel|close|no/i.test(b.innerText.trim()));
  if(btn)simClick(btn);
  else{document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));document.body.click();}
};

let dialogWatcherOn=true;
const dialogObserver=new MutationObserver(()=>{
  if(!dialogWatcherOn)return;
  const dlg=findVisibleDialog();
  if(dlg)closeDialogNow(dlg);
});
dialogObserver.observe(document.body,{childList:true,subtree:true,attributes:true});
if(findVisibleDialog())closeDialogNow(findVisibleDialog());

const clickAndConfirm=async(cb,maxWaitMs=5000)=>{
  if(cb.checked)return true;
  cb.click();
  cb.dispatchEvent(new Event('change',{bubbles:true}));
  const start=Date.now();
  while(!cb.checked&&Date.now()-start<maxWaitMs){
    const dlg=findVisibleDialog();
    if(dlg)closeDialogNow(dlg);
    await nextFrame();
  }
  return cb.checked;
};

const selectAllCheckboxesNoSkip=async()=>{
  let pass=0;
  while(pass<20){
    const unchecked=[...document.querySelectorAll('input[type="checkbox"]')].filter(c=>!c.checked);
    if(unchecked.length===0)return true;
    for(const cb of unchecked){ await clickAndConfirm(cb); }
    pass++;
  }
  return [...document.querySelectorAll('input[type="checkbox"]')].every(c=>c.checked);
};

const allChecked=await selectAllCheckboxesNoSkip();
dialogWatcherOn=false;
dialogObserver.disconnect();
await drainPopups(1500);

const finalAllChecked=[...document.querySelectorAll('input[type="checkbox"]')].every(c=>c.checked);
if(!allChecked||!finalAllChecked){
  console.error('WARNING: not all sevak checkboxes are checked — stopping before Continue to avoid TTD popup loop. Check manually.');
  return;
}
console.log('[5/6] all checkboxes selected');
}finally{
  stopCancelWatch();
}
})();
