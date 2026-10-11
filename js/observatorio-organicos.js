(function (root) {
  'use strict';
  const labels = {characterization:'Caracterización de orgánicos',activity:'Actividad documentada',context:'Solo contexto PGIRS',missing:'Sin dato integrado'};
  const colors = {characterization:'#17543a',activity:'#279c9a',context:'#c69739',missing:'#abb5b7'};
  const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const filterRecords = (records, text, status) => records.filter(r => (status === 'all' || r.status === status) && normalize(r.name + ' ' + r.code).includes(normalize(text)));
  function validate(data, geography, catalog) {
    if (data.schemaVersion !== 1 || data.municipalities?.length !== 123 || geography.features?.length !== 123) throw new Error('Cobertura incompleta');
    const ids = new Set(data.municipalities.map(r=>r.code));
    const geoIds = new Set(geography.features.map(f=>f.properties.code));
    if (ids.size !== 123 || geoIds.size !== 123 || [...ids].some(id=>!geoIds.has(id))) throw new Error('Códigos municipales inconsistentes');
    for (const feature of geography.features) if (!['Polygon','MultiPolygon'].includes(feature.geometry?.type) || !feature.geometry.coordinates.length) throw new Error('Geometría inválida');
    for (const r of data.municipalities) {
      if (!labels[r.status] || !r.name || !Number.isFinite(r.latitude) || !Number.isFinite(r.longitude) || !Array.isArray(r.activities)) throw new Error('Registro inválido');
      if (r.organic && (r.organic.unit !== '%' || !Number.isFinite(r.organic.value) || r.organic.value < 0 || r.organic.value > 100 || !r.organic.scope)) throw new Error('Caracterización inválida');
      for (const ref of [r.organic,r.context,...r.activities].filter(Boolean)) {
        if (!catalog.sources[ref.source]?.url?.startsWith('https://')) throw new Error('Fuente ausente');
      }
    }
    return data.municipalities;
  }
  function toCSV(records, sources) {
    const cell = value => '"' + String(value ?? '').replace(/^[=+@\-]/,"'$&").replace(/"/g,'""') + '"';
    const rows = [['codigo_dane','municipio','evidencia','organicos_porcentaje','ano_documento_o_registro','alcance_organicos','fuente_organicos','pagina','actividad','fuente_actividad','residuos_TOTALES_t_ano_NO_organicos','periodo_total','fuente_total','celda_total','observaciones']];
    for (const r of records) rows.push([r.code,r.name,labels[r.status],r.organic?.value,r.organic?.year,r.organic?.scope,r.organic ? sources[r.organic.source].url : '',r.organic?.page,r.activities.map(a=>a.label+' · '+a.dateLabel).join(' | '),r.activities.map(a=>sources[a.source].url+'#page='+a.page).join(' | '),r.context?.totalGenerationTonYear,r.context ? 'No precisado en la matriz' : '',r.context ? sources[r.context.source].url : '',r.context?.cell,[r.organic?.qualityNote,r.context?.note,'Sin dato no significa cero. No se estiman toneladas orgánicas ni energía.'].filter(Boolean).join(' ')]);
    return '\uFEFF' + rows.map(row=>row.map(cell).join(',')).join('\r\n');
  }
  const core = {labels,colors,normalize,filterRecords,validate,toCSV};
  if (typeof module !== 'undefined' && module.exports) module.exports = core;
  if (!root.document) return;
  const d = root.document, $ = id => d.getElementById(id);
  if (!$('organic-panel')) return;
  const el = (tag,text,className) => {const n=d.createElement(tag);if(text !== undefined)n.textContent=text;if(className)n.className=className;return n;};
  const fmt = value => value.toLocaleString('es-CO',{maximumFractionDigits:2});
  let records=[], geography, sources, selected=null, polygons=null, organicMode=true, selecting=false;
  const api = () => root.HVTObservatory;
  const sourceLink = (key,page) => {const link=el('a',sources[key].title+' ↗');link.href=sources[key].url+(page?'#page='+page:'');link.target='_blank';link.rel='noopener noreferrer';return link;};
  function clearSelection() {
    selected=null; $('municipality-select').value='';
    $('municipality-detail').replaceChildren(el('p','Tu siguiente exploración','eyebrow'),el('h3','Selecciona un municipio'),el('p','Haz clic en una zona del mapa o busca su nombre. Verás qué información existe, de qué año es y qué falta por conocer.'));
    if(polygons) polygons.eachLayer(layer=>layer.setStyle(style(layer.feature)));
  }
  function style(feature) {
    const r=records.find(row=>row.code===feature.properties.code);
    return {color:selected===r.code?'#102e29':'#fff',weight:selected===r.code?3:1,fillColor:colors[r.status],fillOpacity:selected===r.code ? .8 : .56};
  }
  function selectMunicipality(code, fit=true) {
    const r=records.find(row=>row.code===code); if(!r)return;
    selected=code;$('municipality-select').value=code;
    const panel=$('municipality-detail'); panel.replaceChildren(el('p','BOYACÁ / DANE '+r.code,'eyebrow'),el('h3',r.name),el('span',labels[r.status],'evidence-badge badge-'+r.status));
    if(r.organic) {
      const o=r.organic;
      panel.append(el('p',fmt(o.value)+' %','organic-value'),el('p','Fracción orgánica reportada · '+o.year,'organic-unit'),el('p',o.scope),sourceLink(o.source,o.page));
      if(o.series?.length>1){const p=el('p',o.series.map(v=>v.year+': '+fmt(v.value)+' %').join(' · '),'hint');panel.append(p);}
      panel.append(el('p',o.qualityNote,'data-caution'));
    } else panel.append(el('p','No hay una caracterización orgánica cuantitativa integrada para este municipio. Esto no significa que no genere residuos.','data-caution'));
    if(r.activities.length) {
      panel.append(el('h4','Aprovechamiento documentado'));
      for(const a of r.activities)panel.append(el('p',a.label+' · '+a.dateLabel),sourceLink(a.source,a.page));
      panel.append(el('p','El informe acredita actividades; no informa toneladas generadas o tratadas.','hint'));
    }
    if(r.context) {
      const c=r.context, details=el('details'); details.append(el('summary','Contexto PGIRS · residuos totales'));
      details.append(el('p',c.totalGenerationTonYear === null ? 'Sin cantidad legible de generación total en esta matriz.' : fmt(c.totalGenerationTonYear)+' t/año de residuos sólidos totales. No corresponde a toneladas de orgánicos.'),el('p','Período del promedio: no precisado. '+c.cell),sourceLink(c.source),el('p','No se combina este total con porcentajes de otros años o alcances.','hint'));panel.append(details);
    }
    panel.append(el('p','Punto de referencia municipal; no representa una planta de tratamiento.','hint'));
    const climate=el('button','Consultar clima de este municipio ↗','primary');climate.type='button';
    climate.addEventListener('click',()=>{syncPoint(r);api()?.queryPower();if($('expand-map').getAttribute('aria-pressed')==='true')expand(false);d.querySelector('.analysis').scrollIntoView?.({behavior:'smooth'});});panel.append(climate);
    syncPoint(r);
    if(polygons)polygons.eachLayer(layer=>{layer.setStyle(style(layer.feature));if(layer.feature.properties.code===code){layer.bringToFront();if(fit)api().map.fitBounds(layer.getBounds(),{padding:[25,25],maxZoom:11});}});
  }
  function syncPoint(r) {
    selecting=true;
    try {api()?.selectPoint(r.latitude,r.longitude,r.name+', Boyacá');$('region').value='custom';} finally {selecting=false;}
  }
  function renderMap(filtered) {
    const map=api()?.map;if(!map||!root.L?.geoJSON)return;
    if(polygons)map.removeLayer(polygons);
    const ids=new Set(filtered.map(r=>r.code));
    polygons=root.L.geoJSON({type:'FeatureCollection',features:geography.features.filter(f=>ids.has(f.properties.code))},{style,bubblingMouseEvents:false,onEachFeature(feature,layer){
      const r=records.find(row=>row.code===feature.properties.code);
      const tip=el('span',r.name+' · '+labels[r.status]);layer.bindTooltip(tip,{sticky:true});
      layer.on('click',()=>selectMunicipality(r.code));
    }});
    if(organicMode)polygons.addTo(map);
  }
  function renderTable(filtered) {
    const body=$('organic-table');body.replaceChildren();
    for(const r of filtered) {
      const row=el('tr'), name=el('td'), button=el('button',r.name,'municipality-row');button.type='button';button.addEventListener('click',()=>{setMode(true);selectMunicipality(r.code);$('explorador').scrollIntoView?.({behavior:'smooth'});});name.append(button,el('small',r.code));
      row.append(name,el('td',labels[r.status]),el('td',r.organic?fmt(r.organic.value)+' %':'Sin dato cuantitativo'),el('td',r.organic?r.organic.year+' · '+r.organic.scope:r.activities.length?'2025 · talleres y pacas':r.context?'Período no precisado · residuos totales':'Sin registro integrado'));
      const source=el('td'), ref=r.organic||r.activities[0]||r.context;if(ref)source.append(sourceLink(ref.source,ref.page));else source.textContent='—';row.append(source);body.append(row);
    }
    if(!filtered.length){const cell=el('td','No hay municipios que coincidan con esta búsqueda.');cell.colSpan=5;const row=el('tr');row.append(cell);body.append(row);}
  }
  function filter() {
    const filtered=filterRecords(records,$('municipality-search').value,$('evidence-filter').value);
    if(selected&&!filtered.some(r=>r.code===selected))clearSelection();
    const select=$('municipality-select');select.replaceChildren();const first=el('option',filtered.length?'Selecciona un municipio':'Sin coincidencias');first.value='';select.append(first);
    for(const r of filtered){const option=el('option',r.name+' · '+r.code);option.value=r.code;select.append(option);}select.value=selected||'';
    $('organic-status').textContent=filtered.length+' de '+records.length+' municipios · revisión documental: 28 sep 2026';
    renderMap(filtered);renderTable(filtered);
  }
  function setMode(organic) {
    organicMode=organic;$('organic-panel').hidden=!organic;$('satellite-panel').hidden=organic;$('organic-legend').hidden=!organic;
    $('mode-organics').setAttribute('aria-pressed',String(organic));$('mode-satellite').setAttribute('aria-pressed',String(!organic));
    $('organic-background-control').hidden=!organic;
    api()?.setSatellite(!organic || $('organic-satellite-background').checked);
    if(polygons&&api()?.map){if(organic)polygons.addTo(api().map);else api().map.removeLayer(polygons);}
    $('map-reading').replaceChildren(el('strong',organic?'Cómo leer esta capa':'Imágenes de color natural'),el('span',organic?'Los residuos proceden de documentos municipales. Sin dato no significa cero; las imágenes satelitales no miden directamente estas cantidades.':'La fecha corresponde a la imagen. Las nubes y las pasadas del satélite pueden dejar vacíos. Los indicadores climáticos se consultan por separado.'));
    api()?.map?.invalidateSize();
  }
  async function load() {
    $('retry-organics').hidden=true;$('organic-status').textContent='Cargando fuentes municipales…';
    const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),20000);
    try {
      const [data,geo,catalog]=await Promise.all(['boyaca-organicos.json','boyaca-municipios.geojson','fuentes.json'].map(async file=>{const response=await root.fetch('/data/observatorio/'+file+'?v=20261010a',{signal:controller.signal});if(!response.ok)throw new Error('Datos no disponibles');return response.json();}));
      records=validate(data,geo,catalog).slice().sort((a,b)=>a.name.localeCompare(b.name,'es'));geography=geo;sources=catalog.sources;
      for(const id of ['municipality-search','evidence-filter','municipality-select','download-organics'])$(id).disabled=false;
      $('organic-status').classList.remove('error');
      const counts=[[records.length,'municipios en el mapa'],[records.filter(r=>r.organic).length,'con caracterización orgánica'],[records.filter(r=>r.activities.length).length,'con actividades documentadas'],[records.filter(r=>r.context).length,'con contexto PGIRS']];
      $('coverage-strip').replaceChildren(...counts.map(([count,label])=>{const div=el('div');div.append(el('strong',count),el('span',label));return div;}));
      filter();if(polygons&&organicMode)api().map.fitBounds(polygons.getBounds(),{padding:[18,18]});
    } catch(error) {
      controller.abort();$('organic-status').textContent='No se pudieron cargar los datos municipales. Reintenta la carga; puedes seguir usando la vista de satélites.';$('organic-status').classList.add('error');$('retry-organics').hidden=false;
      $('coverage-strip').textContent='Cobertura no disponible: pendiente de cargar la base documental.';
    } finally {clearTimeout(timer);}
  }
  $('municipality-search').addEventListener('input',filter);$('evidence-filter').addEventListener('change',filter);
  $('municipality-select').addEventListener('change',()=>{$('municipality-select').value?selectMunicipality($('municipality-select').value):clearSelection();});
  $('mode-organics').addEventListener('click',()=>setMode(true));$('mode-satellite').addEventListener('click',()=>setMode(false));$('retry-organics').addEventListener('click',load);
  $('organic-satellite-background').addEventListener('change',()=>api()?.setSatellite($('organic-satellite-background').checked));
  d.addEventListener('hvt:point-selected',()=>{if(!selecting)clearSelection();});
  $('reset-view').addEventListener('click',()=>{if(organicMode&&geography){$('municipality-search').value='';$('evidence-filter').value='all';clearSelection();filter();if(polygons)api().map.fitBounds(polygons.getBounds(),{padding:[18,18]});}});
  function expand(value) {
    $('explorador').classList.toggle('is-expanded',value);d.body.classList.toggle('map-expanded',value);$('expand-map').setAttribute('aria-pressed',String(value));$('expand-map').textContent=value?'Reducir mapa':'Ampliar mapa';
    if(value){$('explorador').setAttribute('role','dialog');$('explorador').setAttribute('aria-modal','true');for(const node of [...d.body.children,...d.querySelector('main').children])if(node!==$('explorador')&&!node.contains($('explorador'))){node.dataset.mapInert=String(node.inert);node.inert=true;}}
    else{$('explorador').removeAttribute('role');$('explorador').removeAttribute('aria-modal');d.querySelectorAll('[data-map-inert]').forEach(node=>{node.inert=node.dataset.mapInert==='true';delete node.dataset.mapInert;});$('expand-map').focus();}
    api()?.map?.invalidateSize();
  }
  $('expand-map').addEventListener('click',()=>expand($('expand-map').getAttribute('aria-pressed')!=='true'));
  d.addEventListener('keydown',event=>{if(event.key==='Escape'&&$('expand-map').getAttribute('aria-pressed')==='true')expand(false);});
  $('download-organics').addEventListener('click',()=>{if(!records.length)return;const url=URL.createObjectURL(new Blob([toCSV(records,sources)],{type:'text/csv;charset=utf-8'}));const a=el('a');a.href=url;a.download='HVT-Boyaca-residuos-evidencia-20260928.csv';d.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  load();
})(typeof window !== 'undefined' ? window : globalThis);
