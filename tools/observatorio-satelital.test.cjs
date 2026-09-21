const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require(process.env.HVT_JSDOM || 'jsdom');
const core = require('../js/observatorio-satelital.js');
const root = path.resolve(__dirname,'..');
const html = fs.readFileSync(path.join(root,'observatorio-satelital/index.html'),'utf8');
const script = fs.readFileSync(path.join(root,'js/observatorio-satelital.js'),'utf8');
const flush = () => new Promise(resolve => setImmediate(resolve));
function response(value=4.5) {
  const unit = ['kW-hr/m^2/day','m/s','C','mm/day'];
  return {header:{fill_value:-999,range:'2001–2020',sources:['SYN1DEG','MERRA2']},parameters:Object.fromEntries(core.parameters.map((p,i)=>[p,{units:unit[i]}])),properties:{parameter:Object.fromEntries(core.parameters.map(p=>[p,Object.fromEntries([...core.months,'ANN'].map(m=>[m,value]))]))}};
}
function setup(withMap=false) {
  const dom = new JSDOM(html,{url:'https://hidrogenoverdeturquesa.com/observatorio-satelital/',runScripts:'outside-only'});
  const w=dom.window, calls=[];
  w.fetch=(url,options)=>new Promise((resolve,reject)=>calls.push({url,options,resolve:data=>resolve({ok:true,json:async()=>data}),reject}));
  const state={tiles:[],handlers:{},zoom:8};
  if (withMap) {
    const map={setView(p,z){state.zoom=z;return this;},getZoom(){return state.zoom;},on(name,fn){state.handlers[name]=fn;return this;},removeLayer(layer){layer.removed=true;},getBounds(){return {getWest:()=>-74,getSouth:()=>5,getEast:()=>-72,getNorth:()=>7};}};
    w.L={map:()=>map,divIcon:()=>({}),marker:()=>({addTo(){return this;},setLatLng(p){state.point=p;}}),control:{scale:()=>({addTo(){}})},tileLayer:(url,options)=>{
      const t={url,options,events:{},on(name,fn){this.events[name]=fn;return this;},addTo(){return this;},setOpacity(value){this.opacity=value;}};state.tiles.push(t);return t;
    }};
  }
  w.eval(script);
  return {dom,w,d:w.document,calls,state,close(){dom.window.close();}};
}
test('validates coordinates and dates before requesting sources',()=>{
  assert.ok(core.validPoint(5.53,-73.36));
  for(const pair of [[NaN,0],[90,0],[0,181],[null,0],['5',0]]) assert.equal(core.validPoint(...pair),false);
  assert.throws(()=>core.powerURL(90,0));
  assert.equal(core.validDate('2026-02-30','2000-01-01','2026-09-21'),false);
  assert.equal(core.validDate('2026-09-22','2000-01-01','2026-09-21'),false);
  assert.equal(core.validDate('2026-09-18','2000-01-01','2026-09-21'),true);
  for(const key of Object.keys(core.layers)) assert.match(core.tileURL(key,'2026-09-18'),/GoogleMapsCompatible_Level9\/\{z\}\/\{y\}\/\{x\}\.jpeg$/);
  assert.throws(()=>core.tileURL('snpp','2010-01-01'));
});
test('missing and invalid values are never rendered as zero or valid measurements',()=>{
  const data=response();
  data.properties.parameter.ALLSKY_SFC_SW_DWN.JAN=-999;
  data.properties.parameter.ALLSKY_SFC_SW_DWN.FEB=null;
  data.properties.parameter.WS10M.MAR=-1;
  data.properties.parameter.T2M.JAN=-4;
  data.properties.parameter.PRECTOTCORR.APR=0;
  data.properties.parameter.WS10M.MAY='2.5';
  const result=core.parsePower(data);
  assert.equal(result.values.ALLSKY_SFC_SW_DWN.JAN,null);
  assert.equal(result.values.ALLSKY_SFC_SW_DWN.FEB,null);
  assert.equal(result.values.WS10M.MAR,null);
  assert.equal(result.values.WS10M.MAY,null);
  assert.equal(result.values.T2M.JAN,-4);
  assert.equal(result.values.PRECTOTCORR.APR,0);
  assert.ok(result.partial);
  data.parameters.ALLSKY_SFC_SW_DWN.units='W/m^2';
  assert.equal(core.parsePower(data).values.ALLSKY_SFC_SW_DWN.ANN,null);
  assert.throws(()=>core.parsePower({}));
});
test('CSV carries source, exact query, location, period and missing data',()=>{
  const data=response();data.properties.parameter.T2M.JAN=null;
  const csv=core.toCSV({...core.parsePower(data),lat:5.53,lon:-73.36,url:core.powerURL(5.53,-73.36),retrieved:'2026-09-21T00:00:00Z'});
  assert.match(csv,/NASA POWER/);assert.match(csv,/2001–2020/);assert.match(csv,/"-73.36"/);assert.match(csv,/"JAN","4.5","4.5","","4.5"/);
  const dangerous=core.toCSV({...core.parsePower(response()),sources:'=HYPERLINK("bad")'});
  assert.ok(dangerous.includes("'=HYPERLINK"));
});
test('successful query renders annual values, 12 monthly rows and enables export even without map library',async()=>{
  const app=setup();
  assert.equal(app.calls.length,1);assert.ok(app.d.getElementById('download-csv').disabled);
  app.calls[0].resolve(response());await flush();
  assert.equal(app.d.getElementById('solar-value').textContent,'4,50');
  assert.equal(app.d.querySelectorAll('#monthly-table tr').length,12);
  assert.equal(app.d.querySelectorAll('.chart-month').length,12);
  assert.equal(app.d.getElementById('download-csv').disabled,false);
  assert.match(app.d.getElementById('data-period').textContent,/2001–2020/);
  assert.match(app.d.getElementById('image-status').textContent,/Mapa no disponible/);
  app.close();
});
test('changing point aborts pending request and prevents stale location data from returning',async()=>{
  const app=setup();
  app.d.getElementById('region').value='guajira';
  app.d.getElementById('region').dispatchEvent(new app.w.Event('change'));
  assert.equal(app.calls[0].options.signal.aborted,true);
  app.calls[0].resolve(response(99));await flush();
  assert.equal(app.d.getElementById('solar-value').textContent,'—');
  assert.ok(app.d.getElementById('download-csv').disabled);
  app.d.getElementById('point-form').dispatchEvent(new app.w.Event('submit',{cancelable:true}));
  assert.match(app.calls[1].url,/latitude=11.5444/);
  app.calls[1].resolve(response(6));await flush();
  assert.equal(app.d.getElementById('solar-value').textContent,'6,00');
  app.close();
});
test('provider failure allows retry without invented measurements',async()=>{
  const app=setup();app.calls[0].reject(new Error('Offline'));await flush();
  assert.match(app.d.getElementById('data-status').textContent,/No se pudieron obtener/);
  assert.equal(app.d.getElementById('solar-value').textContent,'—');
  assert.ok(app.d.getElementById('download-csv').disabled);
  app.d.getElementById('point-form').dispatchEvent(new app.w.Event('submit',{cancelable:true}));
  app.calls[1].resolve(response());await flush();
  assert.equal(app.d.getElementById('download-csv').disabled,false);app.close();
});
test('satellite/date/opacity and map click controls update only the appropriate data',async()=>{
  const app=setup(true);app.calls[0].resolve(response());await flush();
  const d=app.d,change=id=>d.getElementById(id).dispatchEvent(new app.w.Event('change'));
  d.getElementById('satellite').value='aqua';change('satellite');
  const tile=app.state.tiles.at(-1);assert.match(tile.url,/MODIS_Aqua/);
  tile.events.tileerror();assert.match(d.getElementById('image-status').textContent,/No se pudieron cargar/);
  d.getElementById('opacity').value=20;d.getElementById('opacity').dispatchEvent(new app.w.Event('input'));assert.equal(tile.opacity,.2);
  assert.equal(app.calls.length,1,'Satellite selection must not request a new climatology');
  d.getElementById('imagery-date').value='2001-01-01';change('imagery-date');
  assert.ok(tile.removed);assert.match(d.getElementById('image-status').textContent,/Elige una fecha/);
  assert.equal(d.getElementById('solar-value').textContent,'4,50');
  app.state.handlers.click({latlng:{wrap:()=>({lat:6.2,lng:-72.1})}});
  assert.equal(d.getElementById('latitude').value,'6.2000');assert.ok(d.getElementById('download-csv').disabled);assert.equal(d.getElementById('solar-value').textContent,'—');
  app.close();
});
test('project is linked in every focus area locale and local assets resolve',()=>{
  for(const prefix of ['','en/','ru/']) {
    const source=fs.readFileSync(path.join(root,prefix+'lineas/inteligencia-territorial/index.html'),'utf8');
    assert.match(source,/href="\/observatorio-satelital\/"/);
    assert.match(source,/SISTEMA GERENCIAL/);
  }
  const dom=new JSDOM(html);const d=dom.window.document;
  assert.equal(d.querySelectorAll('h1').length,1);
  const ids=[...d.querySelectorAll('[id]')].map(n=>n.id);assert.equal(ids.length,new Set(ids).size);
  for(const node of d.querySelectorAll('[src],[href]')) {
    const attr=node.getAttribute('src')||node.getAttribute('href');
    if(attr.startsWith('/') && attr!=='/') {
      const target=path.join(root,attr.split(/[?#]/)[0]);
      assert.ok(fs.existsSync(target)||fs.existsSync(target+'.html'),attr);
    }
  }
  dom.window.close();
});
