const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require(process.env.HVT_JSDOM||'jsdom');
const root=path.resolve(__dirname,'..');
const D=require('../js/diseno-experimentos.js');global.HVTDOE=D;
const M=require('../js/experimental/experiment.js');
const Repository=require('../js/experimental/storage.js');
const plan=()=>D.generate({...D.example,calculation:'manual',feasible:true});
const memory=()=>{const map=new Map();return{get length(){return map.size;},key:i=>[...map.keys()][i],getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};};
const fixture=()=>JSON.parse(fs.readFileSync(path.join(root,'experimental_engine/tests/calculated-fixture.json'),'utf8'));
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function setup({online=true,empty=false,stored=null}={}){
    const dom=new JSDOM(fs.readFileSync(path.join(root,'laboratorio/workspace/index.html'),'utf8'),{url:'http://localhost:8767/laboratorio/workspace/',runScripts:'outside-only',pretendToBeVisual:true});
    const w=dom.window,errors=[];w.addEventListener('error',e=>errors.push(e.error));
    w.matchMedia=()=>({matches:false});w.confirm=()=>true;w.AbortSignal.timeout=()=>undefined;
    const downloads=[];w.URL.createObjectURL=blob=>{downloads.push(blob);return'blob:test';};w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){};
    w.Plotly={newPlot:async()=>{}};
    w.fetch=async(url,options)=>{if(!online)throw Error('offline');return{ok:true,json:async()=>url.endsWith('/health')?{engine:'test engine',capabilities:['ols']}:url.endsWith('/analyze')?fixture():url.endsWith('/predict')?{engine:'test engine',mean:10,mean_ci:[9,11],prediction_interval:[8,12],values:[20,20],note:'Predicción de prueba'}:{}};};
    for(const file of ['diseno-experimentos.js','experimental/experiment.js','experimental/storage.js','experimental/mentor.js'])w.eval(fs.readFileSync(path.join(root,'js',file),'utf8'));
    let e=stored||w.HVTExperiment.create(w.HVTDOE.generate({...w.HVTDOE.example,calculation:'manual',feasible:true}),{project:'I+D HVT',actor:'Ana'});
    if(!empty){w.HVTRepository(w.localStorage).save(e);w.history.replaceState({},'', '?experiment='+e.id);}
    const started=w.eval(fs.readFileSync(path.join(root,'js/experimental/workspace.js'),'utf8'));await started;
    const q=s=>w.document.querySelector(s),click=async s=>{assert.ok(q(s),s);q(s).click();await tick();};
    const input=(name,value,form='')=>{const el=q(form+' [name="'+name+'"]');assert.ok(el,name);el.value=value;el.dispatchEvent(new w.Event('input',{bubbles:true}));};
    const submit=async type=>{q('[data-form="'+type+'"]').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await tick();};
    const read=()=>w.HVTRepository(w.localStorage).get(e.id);
    return{w,dom,q,click,input,submit,read,errors,downloads};
}

test('original readings survive correction, exclusion, design revision and export/import',()=>{
    const p=plan();p.rows[0].result='5';p.rows[0].status='done';const e=M.create(p);
    assert.equal(e.designs[0].plan.rows[0].result,'');assert.equal(e.raw[0].value.result,'5');
    M.record(e,{...M.dataset(e)[0],result:'7'},'Ana','Corrección de transcripción');
    M.exclude(e,1,true,'Ana','Vaso con fuga');assert.equal(e.raw[0].value.result,'5');assert.equal(M.dataset(e)[0].result,'7');
    assert.equal(M.dataset(e)[0].exclusion.reason,'Vaso con fuga');
    const original=M.clone(e.raw);M.reviseDesign(e,plan(),'Ana','Nueva campaña');
    assert.deepEqual(e.raw,original);assert.equal(M.dataset(e)[0].result,'');assert.equal(M.dataset(e,1)[0].result,'7');
    const repo=Repository(memory());repo.import(JSON.stringify(e));assert.deepEqual(repo.get(e.id),e);
});
test('storage rejects lost updates and refuses overwrite on import',()=>{
    const repo=Repository(memory()),e=M.create(plan());repo.save(e);const a=repo.get(e.id),b=repo.get(e.id);
    M.event(a,'bitácora','Ana','Ensayo');repo.save(a,e.revision);M.event(b,'bitácora','Luis','Ensayo');
    assert.throws(()=>repo.save(b,e.revision),/otra pestaña/);assert.throws(()=>repo.import(JSON.stringify(e)),/ya existe/);
});
test('invalid imported matrix and undocumented exclusions are rejected',()=>{
    const e=M.create(plan());e.designs[0].plan.rows[0].values[0]=999;
    assert.throws(()=>M.valid(e),/matriz/);
    const other=M.create(plan());other.decisions.push({designVersion:1,run:1,excluded:true});assert.throws(()=>M.valid(other),/incompleta/);
});
test('stale calculations and duplicate actual orders are rejected',()=>{
    const e=M.create(plan()),key=M.fingerprint(e);M.record(e,{...M.dataset(e)[0],executionOrder:2,result:'8'},'Ana','Medición');
    assert.throws(()=>M.record(e,{...M.dataset(e)[1],executionOrder:2},'Ana','Medición'),/ya corresponde/);
    assert.throws(()=>M.addAnalysis(e,fixture(),M.request(e),'Ana','Análisis',key),/cambiaron/);
});
test('workspace CSV preserves exclusions, real order, zero, multiline notes and literal formulas',()=>{
    const e=M.create(plan());M.record(e,{...M.dataset(e)[0],result:'0',executionOrder:2,note:'=SUM(A1:A2)\nsegunda línea'},'Ana','Primera lectura');M.exclude(e,1,true,'Ana','Fuga documentada');
    const text=M.csv(e);assert.match(text,/Orden real/);assert.match(text,/Razón exclusión/);assert.match(text,/Fuga documentada/);assert.match(text,/"0","investigador","Sí"/);assert.match(text,/"'=SUM/);assert.match(text,/segunda línea/);
});
test('all implemented stages render labelled forms, semantic tables and actual future controls',async()=>{
    const u=await setup();
    for(const stage of ['define','model','design','execute','data','analyze','predict','report']){
        await u.click('[data-stage="'+stage+'"]');assert.match(u.q('h1').textContent,/0[1-7]|10/);
        for(const el of u.w.document.querySelectorAll('#ws-content input,#ws-content select,#ws-content textarea'))assert.ok(el.closest('label'),el.outerHTML);
        assert.equal(u.q('[aria-current="step"]').dataset.stage,stage);
    }
    assert.equal(u.w.document.querySelectorAll('.ws-nav button[disabled]').length,2);assert.deepEqual(u.errors,[]);u.dom.window.close();
});
test('record, correct, exclude and reload keep raw history and selected data',async()=>{
    const u=await setup();await u.click('[data-stage="data"]');u.input('result','0','[data-form="record"]');u.input('status','done','[data-form="record"]');await u.submit('record');
    assert.equal(u.read().raw[0].value.result,'0');u.input('result','2,5','[data-form="record"]');u.input('reason','Corrección','[data-form="record"]');await u.submit('record');
    u.input('excluded','true','[data-form="exclude"]');u.input('reason','Fuga registrada','[data-form="exclude"]');await u.submit('exclude');
    const e=u.read();assert.equal(e.raw.length,2);assert.equal(e.raw[0].value.result,'0');assert.equal(e.decisions[0].reason,'Fuga registrada');
    const v=await setup({stored:e});await v.click('[data-stage="data"]');assert.equal(v.q('[name="result"]').value,'2,5');assert.equal(v.q('[name="excluded"]').value,'true');assert.deepEqual(u.errors.concat(v.errors),[]);u.dom.window.close();v.dom.window.close();
});
test('real Python fixture renders ANOVA, diagnostics, Mentor and saved prediction/report',async()=>{
    const u=await setup();await u.click('[data-stage="analyze"]');await u.click('[data-action="analyze"]');assert.equal(u.read().analyses.length,1);
    assert.match(u.q('.ws-metrics').textContent,/R²/);assert.match(u.q('#ws-mentor-notes').textContent,/Interacciones/);
    for(const tab of ['anova','coefficients','effects','diagnostics']){await u.click('[data-analysis-tab="'+tab+'"]');assert.ok(u.q('.ws-table tbody tr'));}
    await u.click('[data-stage="predict"]');await u.submit('predict');assert.equal(u.read().predictions.length,1);
    await u.click('[data-stage="report"]');u.input('conclusion','Conclusión del investigador');u.input('reason','Informe inicial');await u.submit('report');
    const before=u.read().reports[0].snapshot;assert.equal(before.analysis.version,1);assert.equal(before.dataset.length,12);
    await u.click('[data-stage="data"]');u.input('result','4','[data-form="record"]');await u.submit('record');await u.click('[data-stage="analyze"]');assert.match(u.q('#ws-content').textContent,/Análisis histórico/);
    assert.deepEqual(u.read().reports[0].snapshot,before);await u.click('[data-stage="predict"]');assert.equal(u.q('[data-form="predict"]'),null);
    assert.deepEqual(u.errors,[]);u.dom.window.close();
});
test('offline mode never offers fabricated statistics; empty repository has no fake experiments',async()=>{
    const u=await setup({online:false});await u.click('[data-stage="analyze"]');assert.equal(u.q('[data-action="analyze"]').disabled,true);assert.equal(u.q('.ws-metrics'),null);u.dom.window.close();
    const v=await setup({empty:true});assert.match(v.q('#ws-content').textContent,/No hay expedientes/);assert.equal(v.q('[data-open]'),null);v.dom.window.close();
});
test('model and protocol changes produce separate designs without overwriting measurements',async()=>{
    const u=await setup();await u.click('[data-stage="data"]');u.input('result','4','[data-form="record"]');await u.submit('record');
    await u.click('[data-stage="model"]');u.input('factorHigh1','20');u.input('reason','Ampliación del dominio');await u.submit('model');assert.equal(u.read().designs.length,2);assert.equal(u.read().raw[0].value.result,'4');
    await u.click('[data-stage="execute"]');u.input('procedure','Procedimiento revisado','[data-form="protocol"]');u.input('reason','Actualización del procedimiento','[data-form="protocol"]');await u.submit('protocol');assert.equal(u.read().designs.length,3);assert.deepEqual(u.errors,[]);u.dom.window.close();
});
