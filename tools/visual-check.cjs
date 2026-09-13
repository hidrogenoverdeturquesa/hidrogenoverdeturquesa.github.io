/* Local-only headless QA fallback when the integrated Browser cannot bootstrap.
   Uses a fresh temporary profile and synthetic measurements; never a user profile. */
const fs=require('node:fs');const path=require('node:path');const {spawn}=require('node:child_process');const assert=require('node:assert/strict');
const WebSocket=require(process.env.HVT_WS_MODULE||'ws');
const base=path.resolve(__dirname,'..'),out=path.join(base,'experimental_engine/qa-output');fs.mkdirSync(out,{recursive:true});
const exe=process.env.HVT_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function main(){
    const profile=fs.mkdtempSync(path.join(out,'chrome-'));
    const processBrowser=spawn(exe,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=9237','--remote-debugging-address=127.0.0.1','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});
    let socket;try{
        let target;for(let n=0;n<60;n++){try{target=(await(await fetch('http://127.0.0.1:9237/json')).json()).find(t=>t.type==='page');if(target)break;}catch(_){}await delay(250);}assert.ok(target,'Browser must start');
        socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{socket.on('open',r);socket.on('error',j);});
        let id=0;const callbacks=new Map(),errors=[];
        socket.on('message',raw=>{const m=JSON.parse(raw);if(m.id){const cb=callbacks.get(m.id);callbacks.delete(m.id);m.error?cb.reject(Error(JSON.stringify(m.error))):cb.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);});
        const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;callbacks.set(n,{resolve,reject});socket.send(JSON.stringify({id:n,method,params}));});
        const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
        const until=async expression=>{for(let n=0;n<160;n++){if(await evaluate(expression))return;await delay(150);}throw Error('Timed out: '+expression);};
        const click=selector=>evaluate('document.querySelector('+JSON.stringify(selector)+').click()');
        const screenshot=async name=>{const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(r.data,'base64'));};
        const viewport=async(width,height=900)=>{await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await delay(150);};
        await send('Runtime.enable');await send('Page.enable');await viewport(1440);
        await send('Page.navigate',{url:'http://127.0.0.1:8767/laboratorio/diseno-experimentos/'});
        await until("!!window.HVTDOE&&!!document.querySelector('[data-example]')");
        await click('[data-example]');
        for(let i=0;i<4;i++)await click('[data-next]');
        await evaluate("const f=document.querySelector('[name=feasible]');f.checked=true;f.dispatchEvent(new Event('input',{bubbles:true}));");
        await click('[data-next]');await click('[data-generate]');
        assert.equal(await evaluate("document.querySelectorAll('[data-table-body] tr').length"),12);
        await click('[data-workspace-open]');
        await until("!!document.querySelector('[data-form=define]')&&document.querySelector('#ws-engine').textContent.includes('hvt-factorial-python')");
        await screenshot('workspace-desktop');
        await click('[data-stage=design]');await click('[data-action=verify]');await until("document.querySelector('#ws-content').textContent.includes('Verificado por')");
        await screenshot('design-desktop');
        // Seed ONLY the disposable QA profile using the actual experiment model.
        await evaluate(`{const repo=HVTRepository(localStorage),e=repo.get(new URLSearchParams(location.search).get('experiment')),old=e.revision;for(const row of HVTExperiment.dataset(e)){const a=row.condition&1?-1:1,b=row.condition<=2?-1:1,y=10+2*a-3*b+1.5*a*b+[-1,0,1][row.replica-1];HVTExperiment.record(e,{...row,raw:[String(100+y),'100'],status:'done',date:'2026-09-13T09:00',executionOrder:row.run},'QA: datos sintéticos','Solo prueba automatizada; no medición HVT');}repo.save(e,old);location.reload();}`);
        await until("!!document.querySelector('[data-form=define]')&&document.querySelector('#ws-engine').textContent.includes('hvt-factorial-python')");
        await click('[data-stage=analyze]');await click('[data-action=analyze]');
        await until("!!document.querySelector('.ws-metrics')&&!!document.querySelector('#ws-chart .main-svg')");
        await screenshot('analysis-desktop');await evaluate("document.querySelector('#ws-chart').scrollIntoView({block:'center',behavior:'instant'})");await delay(350);await screenshot('plotly-desktop');await evaluate("scrollTo({top:0,behavior:'instant'})");
        assert.equal(await evaluate("JSON.parse(localStorage.getItem('hvt-experiment-v1:'+new URLSearchParams(location.search).get('experiment'))).analyses[0].result.summary.n"),12);
        for(const width of [1280,1024,768,390,360]){
            await viewport(width);await click('[data-stage=data]');
            const overflow=await evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth,body:document.body.scrollWidth})');assert.ok(overflow.scroll<=width+1,JSON.stringify(overflow));
            if(width===390){await screenshot('data-mobile');assert.equal(await evaluate("getComputedStyle(document.querySelector('.ws-nav')).display"),'none');assert.equal(await evaluate("getComputedStyle(document.querySelector('.ws-mentor')).display"),'none');await click('#ws-nav-toggle');assert.notEqual(await evaluate("getComputedStyle(document.querySelector('.ws-nav')).display"),'none');await click('#ws-nav-toggle');await click('#ws-mentor-toggle');assert.notEqual(await evaluate("getComputedStyle(document.querySelector('.ws-mentor')).display"),'none');await click('#ws-mentor-toggle');}
        }
        await viewport(1440);await click('[data-stage=analyze]');await until("!!document.querySelector('#ws-chart .main-svg')");
        await click('[data-stage=predict]');await evaluate("document.querySelector('[data-form=predict]').requestSubmit()");await until("document.querySelector('#ws-prediction tbody').rows.length===1");
        assert.equal(errors.length,0,JSON.stringify(errors));
        fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({passed:true,engine:'real FastAPI on 127.0.0.1:8767',widths:[1440,1280,1024,768,390,360],consoleExceptions:errors,checked:['public designer','bridge','Python matrix parity','raw data','OLS + Plotly','prediction','controlled page width','mobile panels']},null,2));
        console.log('Headless visual and live API checks passed. Screenshots: '+out);
        await send('Browser.close');
    }finally{socket?.close();processBrowser.kill();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
