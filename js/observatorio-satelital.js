/* HVT Observatorio. Live public sources; no credentials or synthetic measurements. */
(function (root) {
  'use strict';
  const layers = {
    terra: {id: 'MODIS_Terra_CorrectedReflectance_TrueColor', name: 'Terra / MODIS', start: '2000-02-24'},
    aqua: {id: 'MODIS_Aqua_CorrectedReflectance_TrueColor', name: 'Aqua / MODIS', start: '2002-07-03'},
    snpp: {id: 'VIIRS_SNPP_CorrectedReflectance_TrueColor', name: 'Suomi NPP / VIIRS', start: '2015-11-24'},
    noaa20: {id: 'VIIRS_NOAA20_CorrectedReflectance_TrueColor', name: 'NOAA-20 / VIIRS', start: '2018-01-05'}
  };
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const monthNames = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const parameters = ['ALLSKY_SFC_SW_DWN','WS10M','T2M','PRECTOTCORR'];
  const units = ['kWh/m²/día','m/s','°C','mm/día'];
  const acceptedUnits = [['kW-hr/m^2/day','kWh/m^2/day'],['m/s'],['C'],['mm/day']];
  function validPoint(lat, lon) {
    return typeof lat === 'number' && typeof lon === 'number' && Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 85 && Math.abs(lon) <= 180;
  }
  function isoDate(date) { return date.toISOString().slice(0,10); }
  function validDate(value, min, max) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && isoDate(new Date(value)) === value && value >= min && value <= max;
  }
  function tileURL(key, date) {
    if (!layers[key] || !validDate(date, layers[key].start, '9999-12-31')) throw new Error('Fecha o satélite inválido');
    return 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/' + layers[key].id + '/default/' + date + '/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpeg';
  }
  function powerURL(lat, lon) {
    if (!validPoint(lat,lon)) throw new Error('Coordenadas inválidas');
    const query = new URLSearchParams({parameters: parameters.join(','), community: 'RE', longitude: String(lon), latitude: String(lat), format: 'JSON'});
    return 'https://power.larc.nasa.gov/api/temporal/climatology/point?' + query;
  }
  function parsePower(data) {
    if (!data || !data.properties || !data.properties.parameter || !data.header) throw new Error('Respuesta incompleta de NASA POWER');
    const fill = data.header.fill_value;
    const values = {};
    let count = 0;
    parameters.forEach((key, i) => {
      values[key] = {};
      const unitOK = acceptedUnits[i].includes(data.parameters?.[key]?.units);
      [...months, 'ANN'].forEach(month => {
        const value = data.properties.parameter[key]?.[month];
        const ok = unitOK && typeof value === 'number' && Number.isFinite(value) && value !== fill && value !== -999 && (key === 'T2M' || value >= 0);
        values[key][month] = ok ? value : null;
        if (ok) count++;
      });
    });
    if (!count) throw new Error('No hay valores válidos para este punto');
    return {values, period: String(data.header.range || 'Período no informado por el proveedor'), sources: (data.header.sources || []).join(', '), partial: count < 52};
  }
  function csvCell(value) {
    const str = String(value ?? '');
    // Formula-like provider strings must stay text when opened in a spreadsheet.
    const safe = typeof value === 'string' && /^[=+\-@\t\r]/.test(str) ? "'" + str : str;
    return '"' + safe.replace(/"/g, '""') + '"';
  }
  function toCSV(record) {
    const rows = [
      ['Fuente','NASA POWER'], ['URL', record.url], ['Consultado UTC',record.retrieved],
      ['Latitud solicitada', record.lat], ['Longitud solicitada',record.lon], ['Periodo', record.period],
      ['Productos',record.sources], ['Nota','Promedios históricos regionales; independientes de la imagen satelital. Vacío = dato no disponible.'],
      ['Mes',...parameters.map((p,i) => p + ' (' + units[i] + ')')],
      ...[...months, 'ANN'].map(m => [m,...parameters.map(p => record.values[p][m])])
    ];
    return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n');
  }
  const api = {layers, months, parameters, validPoint, validDate, tileURL, powerURL, parsePower, toCSV};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (!root.document) return;
  const $ = id => root.document.getElementById(id);
  const regions = {
    boyaca: [5.5353,-73.3678,8,'Boyacá, Colombia'], tunja: [5.5353,-73.3678,10,'Tunja, Boyacá'],
    sogamoso: [5.7143,-72.9339,10,'Sogamoso, Boyacá'], duitama: [5.8269,-73.0324,10,'Duitama, Boyacá'],
    tota: [5.55,-72.9167,10,'Lago de Tota, Boyacá'], guajira: [11.5444,-72.9072,8,'La Guajira, Colombia'],
    colombia: [4.5709,-74.2973,5,'Colombia']
  };
  let map, marker, imagery, currentRecord = null, controller = null, generation = 0;
  let point = {lat:5.5353,lon:-73.3678};
  const formatter = new Intl.NumberFormat('es-CO', {minimumFractionDigits:2, maximumFractionDigits:2});
  const format = value => value === null ? 'Sin dato' : formatter.format(value);
  const status = (id, text, error = false) => { $(id).textContent = text; $(id).classList.toggle('error', error); };
  const today = isoDate(new Date());
  $('imagery-date').max = today;
  $('imagery-date').value = isoDate(new Date(Date.now() - 3 * 86400000));
  function clearData() {
    generation++;
    if (controller) controller.abort();
    controller = null;
    currentRecord = null;
    $('download-csv').disabled = true;
    $('seasonality').hidden = true;
    $('metrics').removeAttribute('aria-busy');
    ['solar','wind','temperature','rain'].forEach(id => { $(id + '-value').textContent = '—'; });
    $('data-period').textContent = 'Climatología histórica independiente de la fecha y del satélite del mapa.';
    status('data-status', 'Punto seleccionado: ' + point.lat.toFixed(4) + ', ' + point.lon.toFixed(4) + '. Pulsa «Consultar este punto» para obtener sus datos.');
    $('power-link').href = powerURL(point.lat, point.lon);
  }
  function selectPoint(lat, lon, name = 'Punto personalizado', zoom) {
    if (!validPoint(lat,lon)) return;
    point = {lat,lon};
    $('latitude').value = lat.toFixed(4);
    $('longitude').value = lon.toFixed(4);
    $('point-label').textContent = lat.toFixed(4) + ', ' + lon.toFixed(4);
    $('location-name').textContent = name;
    if (marker) marker.setLatLng([lat,lon]);
    if (map && zoom !== undefined) map.setView([lat,lon],zoom);
    clearData();
  }
  function updateWorldview() {
    if (!map) return;
    const b = map.getBounds();
    const query = new URLSearchParams({v: [b.getWest(),b.getSouth(),b.getEast(),b.getNorth()].map(n=>n.toFixed(4)).join(','), l: layers[$('satellite').value].id, t: $('imagery-date').value});
    $('worldview-link').href = 'https://worldview.earthdata.nasa.gov/?' + query;
  }
  function updateImage() {
    const key = $('satellite').value;
    const config = layers[key];
    const date = $('imagery-date').value;
    $('imagery-date').min = config.start;
    $('previous-date').disabled = date <= config.start;
    $('next-date').disabled = date >= today;
    $('layer-description').textContent = config.name + ' · NASA GIBS · disponible desde ' + config.start + '. Las nubes pueden ocultar la superficie.';
    if (!validDate(date,config.start,today)) {
      if (imagery && map) { map.removeLayer(imagery); imagery = null; }
      status('image-status','Elige una fecha entre ' + config.start + ' y ' + today + '.',true);
      return;
    }
    if (!map) return;
    if (imagery) map.removeLayer(imagery);
    const next = root.L.tileLayer(tileURL(key,date), {minZoom:2,maxZoom:13,maxNativeZoom:9,opacity:Number($('opacity').value)/100,attribution:'Imágenes © <a href="https://www.earthdata.nasa.gov/">NASA GIBS</a>',keepBuffer:2});
    imagery = next;
    let failures = 0;
    next.on('loading', () => { failures = 0; if (imagery === next) status('image-status','Cargando ' + config.name + ' · ' + date + '…'); });
    next.on('tileerror', () => { failures++; if (imagery === next) status('image-status','No se pudieron cargar algunas imágenes. Prueba otra fecha o satélite.',true); });
    next.on('load', () => {
      if (imagery !== next) return;
      status('image-status', failures ? 'Carga incompleta. Prueba otra fecha o satélite.' : config.name + ' · ' + date + ' · Color natural', failures > 0);
    });
    next.addTo(map);
    updateWorldview();
  }
  function renderData(record) {
    ['solar','wind','temperature','rain'].forEach((id,i) => { $(id + '-value').textContent = format(record.values[parameters[i]].ANN); });
    $('data-period').textContent = 'Período del proveedor: ' + record.period + '. Fuentes: ' + record.sources + '. Consulta: ' + record.retrieved.slice(0,10) + '.';
    $('monthly-table').replaceChildren();
    $('solar-chart').replaceChildren();
    const solar = record.values.ALLSKY_SFC_SW_DWN;
    const max = Math.max(1,...months.map(m => solar[m] ?? 0));
    months.forEach((m,i) => {
      const tr = root.document.createElement('tr');
      [monthNames[i],...parameters.map(p => format(record.values[p][m]))].forEach((v,j) => {
        const cell = root.document.createElement(j ? 'td' : 'th');
        if (!j) cell.scope = 'row';
        cell.textContent = v;
        tr.append(cell);
      });
      $('monthly-table').append(tr);
      const col = root.document.createElement('div');
      col.className = 'chart-month';
      const value = root.document.createElement('span'); value.textContent = solar[m] === null ? '—' : format(solar[m]);
      const bar = root.document.createElement('span'); bar.className = 'chart-bar'; bar.style.height = (solar[m] === null ? 0 : solar[m] / max * 100) + 'px'; bar.setAttribute('aria-hidden','true');
      const label = root.document.createElement('span'); label.textContent = monthNames[i];
      col.append(value,bar,label); $('solar-chart').append(col);
    });
    $('seasonality').hidden = false;
    $('download-csv').disabled = false;
  }
  async function queryPower() {
    clearData();
    const request = generation;
    const selected = {...point};
    const url = powerURL(selected.lat,selected.lon);
    const aborter = new AbortController(); controller = aborter;
    const timer = setTimeout(() => aborter.abort(),25000);
    $('metrics').setAttribute('aria-busy','true');
    status('data-status','Consultando NASA POWER para ' + selected.lat.toFixed(4) + ', ' + selected.lon.toFixed(4) + '…');
    try {
      const response = await root.fetch(url,{signal:aborter.signal});
      if (!response.ok) throw new Error('Servicio no disponible (' + response.status + ')');
      const data = parsePower(await response.json());
      if (request !== generation) return;
      currentRecord = {...data,...selected,url,retrieved:new Date().toISOString()};
      renderData(currentRecord);
      status('data-status',(data.partial ? 'Datos parciales' : 'Climatología cargada') + ' para ' + selected.lat.toFixed(4) + ', ' + selected.lon.toFixed(4) + ' · Promedios históricos, no mediciones actuales.',data.partial);
    } catch (error) {
      if (request !== generation) return;
      status('data-status','No se pudieron obtener los datos de NASA POWER. Revisa tu conexión y vuelve a pulsar «Consultar este punto».',true);
    } finally {
      clearTimeout(timer);
      if (request === generation) { controller = null; $('metrics').removeAttribute('aria-busy'); }
    }
  }
  $('point-form').addEventListener('submit', event => {
    event.preventDefault();
    if (!$('point-form').reportValidity()) return;
    const lat = Number($('latitude').value), lon = Number($('longitude').value);
    if (!validPoint(lat,lon)) return;
    if (Math.abs(lat-point.lat) > 0.00005 || Math.abs(lon-point.lon) > 0.00005) {
      $('region').value = 'custom';
      selectPoint(lat,lon,'Punto personalizado',map ? Math.max(map.getZoom(),8) : undefined);
    }
    queryPower();
  });
  $('region').addEventListener('change', () => {
    const r = regions[$('region').value];
    if (r) selectPoint(r[0],r[1],r[3],r[2]);
  });
  $('reset-view').addEventListener('click', () => { $('region').value = 'boyaca'; selectPoint(...[regions.boyaca[0],regions.boyaca[1],regions.boyaca[3],regions.boyaca[2]]); });
  $('satellite').addEventListener('change',updateImage);
  $('imagery-date').addEventListener('change',updateImage);
  [['previous-date',-1],['next-date',1]].forEach(([id,offset]) => $(id).addEventListener('click', () => {
    const date = $('imagery-date').value;
    if (!validDate(date,layers[$('satellite').value].start,today)) return;
    $('imagery-date').value = isoDate(new Date(Date.parse(date) + offset*86400000));
    updateImage();
  }));
  $('opacity').addEventListener('input', () => { $('opacity-value').value = $('opacity').value + ' %'; if (imagery) imagery.setOpacity(Number($('opacity').value)/100); });
  $('download-csv').addEventListener('click', () => {
    if (!currentRecord) return;
    const url = URL.createObjectURL(new Blob([toCSV(currentRecord)],{type:'text/csv;charset=utf-8'}));
    const anchor = root.document.createElement('a'); anchor.href = url;
    anchor.download = 'HVT-NASA-POWER-' + currentRecord.lat.toFixed(4) + '_' + currentRecord.lon.toFixed(4) + '.csv';
    root.document.body.append(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url),1000);
  });
  if (root.L) {
    map = root.L.map('satellite-map',{minZoom:2,maxZoom:13,scrollWheelZoom:false,worldCopyJump:true}).setView([point.lat,point.lon],8);
    const base = root.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
    base.on('tileerror',() => { $('satellite-map').setAttribute('aria-description','El mapa base no está disponible. Puedes consultar coordenadas y las imágenes de NASA.'); });
    root.L.control.scale({imperial:false}).addTo(map);
    marker = root.L.marker([point.lat,point.lon],{icon:root.L.divIcon({className:'point-marker',iconSize:[18,18],iconAnchor:[9,9]}),alt:'Punto seleccionado para consultar datos',keyboard:false}).addTo(map);
    map.on('click', event => {
      const p = event.latlng.wrap();
      if (!validPoint(p.lat,p.lng)) return;
      $('region').value = 'custom'; selectPoint(Number(p.lat.toFixed(4)),Number(p.lng.toFixed(4)));
    });
    map.on('moveend',updateWorldview);
  } else {
    $('satellite-map').textContent = 'No se pudo cargar el mapa. Puedes consultar los indicadores por coordenadas y abrir las fuentes al final de la página.';
    status('image-status','Mapa no disponible: revisa tu conexión y recarga la página.',true);
  }
  updateImage();
  queryPower();
})(typeof window !== 'undefined' ? window : globalThis);
