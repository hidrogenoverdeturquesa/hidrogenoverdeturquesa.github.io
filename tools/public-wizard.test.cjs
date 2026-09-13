const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require(process.env.HVT_JSDOM||'jsdom');
const {example}=require('../js/diseno-experimentos.js');
const base=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(base,'laboratorio/diseno-experimentos/index.html'),'utf8');
const script=fs.readFileSync(path.join(base,'js/diseno-experimentos.js'),'utf8');
function setup({search='',stored=null,blockedStorage=false}={}) {
    const dom=new JSDOM(html,{url:'https://hidrogenoverdeturquesa.com/laboratorio/diseno-experimentos/'+search,runScripts:'outside-only'});
    const w=dom.window;
    const blobs=[],downloads=[];
    w.URL.createObjectURL=blob=>{blobs.push(blob);return 'blob:test-'+blobs.length;};
    w.URL.revokeObjectURL=()=>{};
    w.HTMLAnchorElement.prototype.click=function(){downloads.push(this.download);};
    if(stored)w.localStorage.setItem('hvt-doe-guided-v1',JSON.stringify({version:1,data:stored}));
    if(blockedStorage)Object.defineProperty(w,'localStorage',{get(){throw new Error('disabled');}});
    w.eval(script);
    const q=s=>w.document.querySelector(s);
    const click=s=>q(s).click();
    const input=(name,value)=>{const el=w.document.getElementById('doe-wizard').elements[name];if(el.type==='checkbox')el.checked=value;else el.value=value;el.dispatchEvent(new w.Event('input',{bubbles:true}));};
    const step=()=>Number(q('[data-step]:not([hidden])').dataset.step);
    return {dom,w,q,click,input,step,blobs,downloads};
}
function complete(ui) {
    ui.click('[data-example]');
    ui.input('calculation','manual');
    for(let i=0;i<4;i++)ui.click('[data-next]');
    assert.equal(ui.step(),4);
    ui.input('feasible',true);ui.click('[data-next]');assert.equal(ui.step(),5);
    ui.click('[data-generate]');
}
test('empty forward navigation stops at the first missing decision and focuses it',()=>{
    const ui=setup();ui.click('[data-step-link="5"]');assert.equal(ui.step(),0);
    assert.equal(ui.w.document.activeElement.name,'experiment');
    assert.equal(ui.q('[data-error]').hidden,false);ui.dom.window.close();
});
test('full example produces 12 editable rows and both downloads',()=>{
    const ui=setup();complete(ui);
    assert.equal(ui.q('[data-output]').hidden,false);
    assert.equal(ui.q('[data-table-body]').rows.length,12);
    assert.equal(ui.q('[data-generate]').disabled,true);
    const result=ui.q('[data-result="0"]');result.value='0';result.dispatchEvent(new ui.w.Event('input',{bubbles:true}));
    ui.click('[data-protocol]');ui.click('[data-csv]');
    assert.deepEqual(ui.downloads,['protocolo-experimento-hvt.txt','resultados-experimento-hvt.csv']);
    assert.equal(ui.blobs.length,2);ui.dom.window.close();
});
test('edits retain old measurements and require explicit replacement',()=>{
    const ui=setup();complete(ui);
    const r=ui.q('[data-result="0"]');r.value='2,5';r.dispatchEvent(new ui.w.Event('input',{bubbles:true}));
    ui.click('[data-step-link="0"]');ui.input('experiment','Mi diseño editado');
    assert.equal(ui.q('[data-result="0"]').value,'2,5');assert.equal(ui.q('[data-outdated]').hidden,false);
    ui.click('[data-step-link="5"]');ui.click('[data-generate]');
    assert.equal(ui.q('[data-replace-confirm]').hidden,false);assert.equal(ui.q('[data-result="0"]').value,'2,5');
    ui.click('[data-replace-plan]');assert.equal(ui.q('[data-result="0"]').value,'');assert.equal(ui.q('[data-outdated]').hidden,true);
    assert.ok(ui.q('[data-caption]').textContent.includes('Mi diseño editado'));ui.dom.window.close();
});
test('invalid measurements block CSV; blank and decimal commas are accepted',()=>{
    const ui=setup();complete(ui);const r=ui.q('[data-result="0"]');
    r.value='incorrecto';r.dispatchEvent(new ui.w.Event('input',{bubbles:true}));ui.click('[data-csv]');assert.equal(ui.downloads.length,0);
    r.value='-2,5';r.dispatchEvent(new ui.w.Event('input',{bubbles:true}));ui.click('[data-csv]');assert.equal(ui.downloads.length,1);
    ui.dom.window.close();
});
test('draft resumes only when requested and survives backwards navigation',()=>{
    const ui=setup({stored:example});assert.equal(ui.q('[name="experiment"]').value,'');
    assert.equal(ui.q('[data-draft-banner]').hidden,false);ui.click('[data-restore]');assert.equal(ui.q('[name="experiment"]').value,example.experiment);
    ui.click('[data-next]');ui.click('[data-back]');assert.equal(ui.q('[name="question"]').value,example.question);ui.dom.window.close();
});
test('calculator remains usable with browser storage blocked',()=>{
    const ui=setup({blockedStorage:true});complete(ui);assert.equal(ui.q('[data-output]').hidden,false);
    assert.match(ui.q('[data-save-status]').textContent,/no permite guardar/);ui.dom.window.close();
});
test('old planner URLs prefill their factors without bypassing missing steps',()=>{
    const ui=setup({search:'?experiment=Prueba&response=Distancia&responseUnit=m&factorName1=Papel&factorLow1=Blanco&factorHigh1=Reciclado&factorName2=Ancho&factorLow2=4&factorHigh2=6&factorUnit2=cm&repetitions=3&seed=2026'});
    assert.equal(ui.q('[name="factorCount"]').value,'2');assert.equal(ui.q('[name="factorType1"]').value,'category');
    ui.click('[data-next]');assert.equal(ui.step(),0);assert.equal(ui.w.document.activeElement.name,'question');ui.dom.window.close();
});
test('partial second factor blocks generation and duplicate numeric levels are rejected',()=>{
    const ui=setup();ui.click('[data-example]');ui.click('[data-next]');ui.click('[data-next]');
    ui.input('factorHigh2','');ui.click('[data-next]');assert.equal(ui.step(),2);assert.equal(ui.w.document.activeElement.name,'factorHigh2');
    ui.input('factorHigh2','100,0');ui.click('[data-next]');assert.equal(ui.step(),2);assert.match(ui.q('[data-error]').textContent,/mayor/);ui.dom.window.close();
});
test('four visible tables, automatic difference, actual conditions and matrix download',()=>{
    const ui=setup();ui.click('[data-example]');
    ui.click('[data-next]');assert.equal(ui.q('[name="rawCount"]').value,'2');assert.equal(ui.q('[data-raw-group="2"]').hidden,false);
    ui.click('[data-next]');
    assert.equal(ui.q('[data-design-preview]').querySelectorAll('table').length,2);
    assert.equal(ui.q('[data-design-preview]').querySelectorAll('table')[1].tBodies[0].rows.length,4);
    assert.match(ui.q('[data-factor-formula]').innerHTML,/2<sup>2<\/sup> = 4/);
    ui.click('[data-next]');ui.click('[data-next]');ui.input('feasible',true);ui.click('[data-next]');ui.click('[data-generate]');
    assert.equal(ui.q('[data-output]').querySelectorAll('table').length,4);
    assert.equal(ui.q('[data-order-body]').rows.length,12);
    const r=ui.q('[data-result="0"]');assert.equal(r.readOnly,true);assert.equal(r.value,'');
    const set=(selector,value)=>{const el=ui.q(selector);el.value=value;el.dispatchEvent(new ui.w.Event('input',{bubbles:true}));};
    set('[data-raw="0"][data-raw-index="0"]','650');assert.equal(r.value,'');
    set('[data-raw="0"][data-raw-index="1"]','625,5');assert.equal(r.value,'24.5');
    const original=ui.q('[data-order-body]').innerHTML;
    set('[data-actual="0"][data-factor-index="0"]','9,8');assert.equal(ui.q('[data-order-body]').innerHTML,original);
    set('[data-unit-id="0"]','M-01');set('[data-date="0"]','2026-09-06T10:00');set('[data-status="0"]','done');
    ui.click('[data-design-csv]');ui.click('[data-csv]');assert.deepEqual(ui.downloads,['matriz-factorial-hvt.csv','resultados-experimento-hvt.csv']);
    set('[data-raw="0"][data-raw-index="1"]','');assert.equal(r.value,'');
    ui.dom.window.close();
});
test('four factors produce 16 combinations and 48 runs with the displayed exponent',()=>{
    const ui=setup();ui.click('[data-example]');ui.click('[data-next]');ui.click('[data-next]');ui.input('factorCount','4');
    for(const i of [3,4]) {ui.input('factorName'+i,'Factor '+i);ui.input('factorType'+i,'category');ui.input('factorLow'+i,'A');ui.input('factorHigh'+i,'B');}
    assert.equal(ui.q('[data-factor="4"]').hidden,false);
    assert.match(ui.q('[data-factor-formula]').innerHTML,/2<sup>4<\/sup> = 16/);
    assert.equal(ui.q('[data-design-preview]').querySelectorAll('table')[1].tBodies[0].rows.length,16);
    ui.click('[data-next]');ui.click('[data-next]');assert.match(ui.q('[data-run-formula]').innerHTML,/48 pruebas/);
    ui.input('feasible',true);ui.click('[data-next]');ui.click('[data-generate]');assert.equal(ui.q('[data-table-body]').rows.length,48);assert.equal(ui.q('[data-order-body]').rows.length,48);
    ui.dom.window.close();
});
test('difference mode rejects mismatched units and missing observations do not become zero',()=>{
    const ui=setup();ui.click('[data-example]');ui.click('[data-next]');ui.input('rawUnit2','kg');ui.click('[data-next]');assert.equal(ui.step(),1);assert.match(ui.q('[data-error]').textContent,/misma unidad/);ui.dom.window.close();
});
test('user markup stays literal in review and table',()=>{
    const ui=setup();ui.click('[data-example]');ui.input('experiment','<img src=x onerror=alert(1)>');
    for(let i=0;i<4;i++)ui.click('[data-next]');ui.input('feasible',true);ui.click('[data-next]');
    assert.equal(ui.q('[data-review] img'),null);ui.click('[data-generate]');assert.equal(ui.q('[data-output] img'),null);
    assert.match(ui.q('[data-caption]').textContent,/<img/);ui.dom.window.close();
});
test('block controls reveal required group name and generated rows stay grouped',()=>{
    const ui=setup();ui.click('[data-example]');for(let i=0;i<4;i++)ui.click('[data-next]');
    ui.input('blocking','replicate');assert.equal(ui.q('[data-block-field]').hidden,false);
    ui.input('feasible',true);ui.click('[data-next]');assert.equal(ui.step(),4);assert.equal(ui.w.document.activeElement.name,'blockName');
    ui.input('blockName','Día');ui.click('[data-next]');ui.click('[data-generate]');
    assert.match(ui.q('[data-table-head]').textContent,/Grupo \(Día\)/);assert.equal(ui.q('[data-table-body]').rows.length,12);ui.dom.window.close();
});
