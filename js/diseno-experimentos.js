(function () {
    'use strict';

    const textFields = {
        experiment:[0,120,'Ponle un nombre a tu experimento.'],
        question:[0,700,'Escribe la pregunta que quieres comprobar.'],
        hypothesis:[0,700,'Describe qué crees que va a pasar.'],
        response:[1,80,'Indica el resultado que medirás.'],
        responseUnit:[1,30,'Indica la unidad de medida.'],
        experimentalUnit:[1,300,'Describe qué será una prueba independiente.'],
        measurement:[1,1200,'Explica con qué, cómo y cuándo medirás.'],
        meaningfulDifference:[1,300,'Define qué diferencia sería útil para ti.'],
        constants:[3,1200,'Describe las condiciones que mantendrás iguales.'],
        materials:[3,1200,'Anota los materiales y equipos necesarios.'],
        procedure:[3,2400,'Escribe las instrucciones de una prueba.'],
        stopRules:[3,1200,'Define cuándo parar o marcar una prueba como no válida.']
    };
    const clean = value => String(value == null ? '' : value).trim();
    const numeric = value => {
        const normalized = clean(value).replace(',', '.');
        return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(normalized) ? Number(normalized) : NaN;
    };
    const identity = value => clean(value).normalize('NFKC').toLocaleLowerCase('es');
    function validate(data, step) {
        const errors = [];
        const add = (field, at, message) => { if (step === undefined || step === at) errors.push({field,step:at,message}); };
        Object.entries(textFields).forEach(([field,[at,max,message]]) => {
            if (!clean(data[field])) add(field,at,message);
            else if (clean(data[field]).length > max) add(field,at,'Acorta este texto a ' + max + ' caracteres.');
        });
        if (!['compare','increase','decrease'].includes(data.goal)) add('goal',1,'Selecciona qué resultado buscas.');
        const count = Number(data.factorCount);
        if (!Number.isInteger(count) || count < 1 || count > 3) add('factorCount',2,'Elige entre uno y tres factores.');
        const names = new Set();
        for (let i=1; i<=Math.min(count,3); i++) {
            const name = clean(data['factorName'+i]);
            const low = clean(data['factorLow'+i]);
            const high = clean(data['factorHigh'+i]);
            const type = data['factorType'+i];
            if (!name || name.length>80) add('factorName'+i,2,'Escribe un nombre de hasta 80 caracteres para el factor '+i+'.');
            else if (names.has(identity(name))) add('factorName'+i,2,'Cada factor debe tener un nombre diferente.');
            names.add(identity(name));
            if (!['numeric','category'].includes(type)) add('factorType'+i,2,'Elige si el factor usa números u opciones.');
            if (!low || low.length>80) add('factorLow'+i,2,'Completa el primer nivel del factor '+i+' (máximo 80 caracteres).');
            if (!high || high.length>80) add('factorHigh'+i,2,'Completa el segundo nivel del factor '+i+' (máximo 80 caracteres).');
            if (low && high && type === 'numeric') {
                if (!Number.isFinite(numeric(low))) add('factorLow'+i,2,'Escribe un número válido, sin unidad, en el nivel bajo.');
                if (!Number.isFinite(numeric(high))) add('factorHigh'+i,2,'Escribe un número válido, sin unidad, en el nivel alto.');
                if (numeric(low) >= numeric(high)) add('factorHigh'+i,2,'El nivel alto debe ser mayor que el bajo. No pueden ser iguales.');
                if (!clean(data['factorUnit'+i])) add('factorUnit'+i,2,'Indica la unidad de este factor; usa «sin unidad» si corresponde.');
            } else if (low && high && identity(low) === identity(high)) add('factorHigh'+i,2,'Escribe dos opciones diferentes para este factor.');
            if (clean(data['factorUnit'+i]).length>30) add('factorUnit'+i,2,'Acorta la unidad a 30 caracteres.');
        }
        if (clean(data.reference).length>400) add('reference',3,'Acorta la referencia a 400 caracteres.');
        const reps = Number(data.repetitions), seed = Number(data.seed), minutes = Number(data.minutes);
        if (!Number.isInteger(reps) || reps<2 || reps>10) add('repetitions',4,'Elige de 2 a 10 pruebas independientes por combinación.');
        if (!Number.isInteger(seed) || seed<1 || seed>999999) add('seed',4,'Usa un código entero entre 1 y 999999.');
        if (!Number.isFinite(minutes) || minutes<0.1 || minutes>100000) add('minutes',4,'Indica un tiempo por prueba entre 0,1 y 100.000 minutos.');
        if (!['none','replicate'].includes(data.blocking)) add('blocking',4,'Selecciona cómo organizarás las pruebas.');
        if (data.blocking==='replicate' && (!clean(data.blockName) || clean(data.blockName).length>80)) add('blockName',4,'Nombra el grupo, por ejemplo «Día», con hasta 80 caracteres.');
        if (data.feasible !== true) add('feasible',4,'Revisa las combinaciones y confirma que puedes realizar el plan.');
        return errors;
    }
    function random(seed) {
        let value = seed >>> 0;
        return function () {
            value += 0x6D2B79F5;
            let result = value;
            result = Math.imul(result ^ result >>> 15, result | 1);
            result ^= result + Math.imul(result ^ result >>> 7, result | 61);
            return ((result ^ result >>> 14) >>> 0) / 4294967296;
        };
    }
    function shuffle(rows, rng) {
        for (let i=rows.length-1;i>0;i--) { const j=Math.floor(rng()*(i+1)); [rows[i],rows[j]]=[rows[j],rows[i]]; }
        return rows;
    }
    function generate(data) {
        const errors = validate(data);
        if (errors.length) throw new Error(errors[0].message);
        const factors = Array.from({length:Number(data.factorCount)},(_,i) => {
            const n=i+1, type=data['factorType'+n];
            return {name:clean(data['factorName'+n]),type,unit:type==='numeric'?clean(data['factorUnit'+n]):'',
                levels:[data['factorLow'+n],data['factorHigh'+n]].map(v=>type==='numeric'?numeric(v):clean(v))};
        });
        const rng=random(Number(data.seed));
        let rows=[];
        for (let rep=1;rep<=Number(data.repetitions);rep++) {
            const group=Array.from({length:2**factors.length},(_,mask)=>({
                condition:mask+1,replica:rep,block:data.blocking==='replicate'?rep:null,
                values:factors.map((f,i)=>f.levels[(mask>>i)&1]),result:'',note:''
            }));
            rows.push(...(data.blocking==='replicate'?shuffle(group,rng):group));
        }
        if (data.blocking==='none') rows=shuffle(rows,rng);
        rows.forEach((r,i)=>{ r.run=i+1; });
        return {version:'HVT-DOE-GUIDED-1',data:JSON.parse(JSON.stringify(data)),factors,rows};
    }
    // Keep user text literal when a CSV is opened in a spreadsheet.
    function csvCell(value) {
        let text=String(value == null ? '' : value);
        if (typeof value !== 'number' && /^[\s\u0000-\u001f]*[=+@-]/.test(text)) text="'"+text;
        return '"'+text.replace(/"/g,'""')+'"';
    }
    function csv(plan) {
        const d=plan.data;
        const head=['Orden','Combinación','Réplica independiente'];
        if (d.blocking==='replicate') head.push('Grupo ('+clean(d.blockName)+')');
        head.push(...plan.factors.map(f=>f.name+(f.unit?' ('+f.unit+')':'')),clean(d.response)+' ('+clean(d.responseUnit)+')','Observaciones');
        const rows=plan.rows.map(r=>{
            const line=[r.run,r.condition,r.replica];
            if (d.blocking==='replicate') line.push(r.block);
            if (r.result!=='' && !Number.isFinite(numeric(r.result))) throw new Error('Revisa el resultado de la corrida '+r.run+'.');
            return [...line,...r.values,r.result===''?'':numeric(r.result),r.note];
        });
        return '\ufeff'+[head,...rows].map(row=>row.map(csvCell).join(',')).join('\r\n');
    }
    const goals={compare:'Comparar las condiciones',increase:'Aumentar el resultado',decrease:'Reducir el resultado'};
    function protocol(plan) {
        const d=plan.data;
        return [
            'HVT · PLAN EXPERIMENTAL',clean(d.experiment),'',
            'PREGUNTA',clean(d.question),'HIPÓTESIS',clean(d.hypothesis),'',
            'MEDICIÓN','Respuesta: '+clean(d.response)+' ('+clean(d.responseUnit)+')',
            'Objetivo: '+goals[d.goal], 'Unidad experimental: '+clean(d.experimentalUnit),
            'Método e instrumento: '+clean(d.measurement),'Diferencia útil: '+clean(d.meaningfulDifference),'',
            'FACTORES Y NIVELES',...plan.factors.map(f=>f.name+': '+f.levels.join(' / ')+(f.unit?' '+f.unit:'')),
            'Referencia: '+(clean(d.reference)||'No se definió una referencia adicional.'),
            'La referencia escrita no añade corridas al diseño.','',
            'PREPARACIÓN','Condiciones constantes: '+clean(d.constants),'Materiales: '+clean(d.materials),'',
            'PROCEDIMIENTO DE CADA PRUEBA',clean(d.procedure),'',
            'CRITERIOS DE PARADA Y PRUEBAS NO VÁLIDAS',clean(d.stopRules),'',
            'ORGANIZACIÓN',2**plan.factors.length+' combinaciones × '+d.repetitions+' réplicas = '+plan.rows.length+' pruebas.',
            'Tiempo secuencial estimado: '+(plan.rows.length*Number(d.minutes)).toLocaleString('es-CO')+' minutos. No incluye pausas ni traslados adicionales.',
            d.blocking==='replicate'?'Grupos completos por '+clean(d.blockName)+'. Cada grupo incluye todas las combinaciones una vez. Orden aleatorio dentro de cada grupo.':'Orden aleatorio en un solo conjunto.',
            'Código de aleatorización: '+d.seed,'',
            'ORDEN DE EJECUCIÓN',...plan.rows.map(r=>r.run+'. '+(r.block?'Grupo '+r.block+' · ':'')+'Combinación '+r.condition+' · Réplica '+r.replica+' · '+plan.factors.map((f,i)=>f.name+' = '+r.values[i]+(f.unit?' '+f.unit:'')).join(' | ')),'',
            'REGISTRO Y ANÁLISIS PREVISTO',
            'Usa la tabla CSV para registrar una respuesta por corrida en la unidad definida y las incidencias.',
            'Si una prueba falla, deja el resultado vacío y documenta el motivo. No reemplaces datos faltantes por cero.',
            'Conserva los datos originales y documenta aparte cualquier prueba adicional.',
            'Compara los resultados y su variación entre réplicas para cada combinación; considera efectos individuales e interacciones.',
            'Contrasta las diferencias observadas con la diferencia práctica definida. El análisis debe respetar los grupos si los hay.',
            'Este asistente no calcula significancia, ANOVA ni potencia; el número de réplicas elegido no garantiza detectar una diferencia.',
            'El diseño de dos niveles compara condiciones; no identifica por sí solo un punto óptimo ni caracteriza curvatura.',
            'Revisa límites y procedimiento con el responsable técnico cuando el montaje lo requiera.','',
            'Método: https://www.itl.nist.gov/div898/handbook/pri/section3/pri3.htm',plan.version
        ].join('\n');
    }
    const example={
        experiment:'Vuelo de aviones de papel',question:'¿Cómo cambian la distancia de vuelo el gramaje del papel y el ancho de las alas?',
        hypothesis:'Creo que las alas anchas aumentarán la distancia de vuelo y que el efecto dependerá del gramaje del papel.',
        response:'Distancia de vuelo',responseUnit:'m',goal:'increase',experimentalUnit:'Un avión nuevo construido para una sola prueba de vuelo.',
        measurement:'Medir desde la línea de lanzamiento hasta el primer contacto con el suelo con una cinta métrica graduada en centímetros. Verificar el cero y que la cinta esté recta. Registrar en metros al terminar cada vuelo.',
        meaningfulDifference:'Una diferencia de 0,5 m entre condiciones.',factorCount:'2',
        factorName1:'Gramaje del papel',factorType1:'numeric',factorLow1:'80',factorHigh1:'120',factorUnit1:'g/m²',
        factorName2:'Ancho de cada ala',factorType2:'numeric',factorLow2:'4',factorHigh2:'6',factorUnit2:'cm',
        constants:'Mismo modelo y tamaño inicial de hoja, misma persona y altura de lanzamiento de 1,5 m. Usar el mismo lugar interior sin viento.',
        materials:'Papel de 80 y 120 g/m², regla, cinta métrica, plantilla del avión y cinta para marcar la línea de lanzamiento.',
        procedure:'1. Revisar la fila que corresponde y construir un avión nuevo con esos niveles.\n2. Comprobar las dimensiones y que la zona esté despejada.\n3. Lanzar desde la marca con la misma técnica y altura.\n4. Medir hasta el primer contacto con el suelo.\n5. Registrar distancia e incidencias; retirar el avión antes de la siguiente prueba.',
        reference:'Papel de 80 g/m² y alas de 4 cm (incluida en las combinaciones).',
        stopRules:'Detener la prueba si alguien entra en la zona de vuelo. Marcar un choque con un obstáculo como no válido y registrar el motivo, sin borrar la fila. Documentar cualquier prueba adicional aparte.',
        repetitions:'3',minutes:'5',blocking:'none',blockName:'',seed:'2026',feasible:false
    };
    if (typeof module !== 'undefined' && module.exports) module.exports={validate,generate,csv,protocol,numeric,example};
    if (typeof document === 'undefined') return;
    const form=document.getElementById('doe-wizard');
    if (!form) return;
    const $=selector=>document.querySelector(selector);
    const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const factorsContainer=$('[data-factors]');
    factorsContainer.innerHTML=[1,2,3].map(i=>'<fieldset class="doe-factor" data-factor="'+i+'"><legend>Factor '+i+'</legend>'+
        '<label class="doe-field">¿Qué vas a cambiar?<input name="factorName'+i+'" maxlength="80" placeholder="Ej.: ancho de las alas"></label>'+
        '<label class="doe-field">¿Cómo se expresa?<select name="factorType'+i+'"><option value="numeric">Con números (ej.: 4 y 6 cm)</option><option value="category">Con opciones (ej.: papel blanco y reciclado)</option></select></label>'+
        '<div class="doe-grid"><label class="doe-field"><span data-low-label>Nivel bajo</span><input name="factorLow'+i+'" maxlength="80" placeholder="Ej.: 4"></label>'+
        '<label class="doe-field"><span data-high-label>Nivel alto</span><input name="factorHigh'+i+'" maxlength="80" placeholder="Ej.: 6"></label></div>'+
        '<label class="doe-field" data-unit-field>Unidad<input name="factorUnit'+i+'" maxlength="30" placeholder="Ej.: cm"><small>Escribe los números sin unidad arriba. Se aceptan decimales con punto o coma, sin separadores de miles.</small></label></fieldset>').join('');
    const steps=[...document.querySelectorAll('[data-step]')];
    const links=[...document.querySelectorAll('[data-step-link]')];
    const help=[
        ['Una pregunta que puedas responder','Relaciona lo que cambias con lo que medirás. No necesitas acertar la hipótesis: necesitas poder contrastarla.','¿El papel y el ancho de las alas cambian la distancia de vuelo?'],
        ['Mide siempre de la misma forma','Define una unidad independiente y un método común antes de obtener resultados. Así la comparación tendrá sentido.','Construye un avión nuevo por prueba. Mide la distancia con la misma cinta y desde la misma marca.'],
        ['Cambia lo que elegiste comparar','Con dos factores a dos niveles tendrás cuatro combinaciones. La tabla te mostrará cuáles son.','Papel de 80 o 120 g/m² × alas de 4 o 6 cm: cuatro combinaciones distintas.'],
        ['Que alguien más pueda repetirlo','Escribe acciones concretas, materiales y condiciones constantes. Las incidencias también son información.','Usa la misma altura de lanzamiento. Si el avión choca con un obstáculo, anótalo.'],
        ['Cuenta las pruebas reales','Cada réplica necesita una unidad independiente. El número elegido debe ser viable y acorde con la variabilidad que esperas.','Cuatro combinaciones × tres aviones nuevos por combinación = doce pruebas. A cinco minutos cada una: una hora.'],
        ['Un plan que puedas llevar contigo','Revisa tus decisiones, genera el orden y descarga el protocolo y la tabla. Los resultados se obtienen al ejecutar las pruebas.','En cada fila verás qué papel usar, el ancho del ala y un espacio para la distancia medida.']
    ];
    let current=0,plan=null,dirty=false,stale=false;
    const storageKey='hvt-doe-guided-v1';
    let stored=null;
    try { const raw=localStorage.getItem(storageKey); if(raw && raw.length<50000) { const parsed=JSON.parse(raw); if(parsed.version===1 && parsed.data && typeof parsed.data==='object') stored=parsed.data; } } catch (_) { /* Storage may be disabled. The calculator remains available. */ }
    $('[data-draft-banner]').hidden=!stored;
    function read() {
        const data={};
        [...form.elements].forEach(el=>{ if(el.name) data[el.name]=el.type==='checkbox'?el.checked:el.value; });
        return data;
    }
    function fill(data) {
        form.reset();
        [...form.elements].forEach(el=>{
            if(!el.name || !Object.prototype.hasOwnProperty.call(data,el.name)) return;
            if(el.type==='checkbox') el.checked=data[el.name]===true;
            else if(typeof data[el.name]==='string' || typeof data[el.name]==='number') el.value=String(data[el.name]).slice(0,el.maxLength>0?el.maxLength:3000);
        });
        sync();
    }
    function save() {
        try { localStorage.setItem(storageKey,JSON.stringify({version:1,data:read()})); $('[data-save-status]').textContent='Borrador guardado en este navegador. Las mediciones de la tabla se conservan descargando el CSV. No se envía información a HVT.'; }
        catch (_) { $('[data-save-status]').textContent='Este navegador no permite guardar el borrador. Descarga tu protocolo y tabla antes de cerrar.'; }
    }
    function totals(data) {
        const combinations=2**Number(data.factorCount),runs=combinations*Number(data.repetitions),mins=runs*Number(data.minutes);
        if(!Number.isFinite(runs)||!Number.isFinite(mins)||!Number.isInteger(Number(data.repetitions))||Number(data.repetitions)<2||Number(data.repetitions)>10||Number(data.minutes)<0.1||Number(data.minutes)>100000) return 'Completa réplicas y minutos para estimar el plan.';
        return combinations+' combinaciones × '+data.repetitions+' réplicas = '+runs+' pruebas · '+mins.toLocaleString('es-CO',{maximumFractionDigits:1})+' min de trabajo secuencial';
    }
    function sync() {
        const d=read();
        [1,2,3].forEach(i=>{
            const fieldset=$('[data-factor="'+i+'"]'),active=i<=Number(d.factorCount),category=d['factorType'+i]==='category';
            fieldset.hidden=!active; fieldset.disabled=!active;
            fieldset.querySelector('[data-low-label]').textContent=category?'Opción 1':'Nivel bajo';
            fieldset.querySelector('[data-high-label]').textContent=category?'Opción 2':'Nivel alto';
            fieldset.querySelector('[data-unit-field]').hidden=category;
            form.elements['factorUnit'+i].disabled=category||!active;
            form.elements['factorLow'+i].placeholder=category?'Ej.: blanco':'Ej.: 4';
            form.elements['factorHigh'+i].placeholder=category?'Ej.: reciclado':'Ej.: 6';
        });
        $('[data-block-field]').hidden=d.blocking!=='replicate';
        $('[data-run-count]').textContent=totals(d);
    }
    function clearError() { $('[data-error]').hidden=true; form.querySelectorAll('[aria-invalid]').forEach(el=>el.removeAttribute('aria-invalid')); }
    function showError(error) {
        $('[data-error]').textContent=error.message; $('[data-error]').hidden=false;
        const field=form.elements[error.field];
        if(field) { const details=field.closest('details'); if(details) details.open=true; field.setAttribute('aria-invalid','true'); field.focus(); }
    }
    function review() {
        const d=read();
        const section=(title,items)=>'<div class="doe-review"><h3>'+esc(title)+'</h3>'+items.map(([label,value])=>'<p><strong>'+esc(label)+':</strong> '+esc(value)+'</p>').join('')+'</div>';
        $('[data-review]').innerHTML=section('1. Tu pregunta',[['Nombre',d.experiment],['Pregunta',d.question],['Hipótesis',d.hypothesis]])+
            section('2. Qué medir',[['Respuesta',d.response+' ('+d.responseUnit+')'],['Objetivo',goals[d.goal]],['Unidad experimental',d.experimentalUnit],['Medición',d.measurement],['Diferencia útil',d.meaningfulDifference]])+
            section('3. Qué cambiar',Array.from({length:Number(d.factorCount)},(_,i)=>[d['factorName'+(i+1)],d['factorLow'+(i+1)]+' / '+d['factorHigh'+(i+1)]+(d['factorType'+(i+1)]==='numeric'?' '+d['factorUnit'+(i+1)]: '')]))+
            section('4. Cómo hacerlo',[['Constantes',d.constants],['Materiales',d.materials],['Procedimiento',d.procedure],['Referencia',d.reference||'No definida'],['Criterios de parada',d.stopRules]])+
            section('5. Organización',[['Pruebas y tiempo',totals(d)],['Grupos',d.blocking==='replicate'?d.repetitions+' grupos por '+d.blockName+', cada uno con todas las combinaciones':'Un solo conjunto aleatorio'],['Código de orden',d.seed]]);
    }
    function show(index,focus=true) {
        current=index; clearError();
        steps.forEach((s,i)=>{s.hidden=i!==index;});
        links.forEach((link,i)=>{if(i===index)link.setAttribute('aria-current','step');else link.removeAttribute('aria-current');});
        $('[data-progress]').textContent='Paso '+(index+1)+' de 6 · '+links[index].textContent.replace(/^\d/,'');
        $('[data-back]').hidden=index===0; $('[data-next]').hidden=index===5;
        $('[data-help-title]').textContent=help[index][0]; $('[data-help-text]').textContent=help[index][1]; $('[data-help-example]').textContent=help[index][2];
        if(index===5)review();
        if(focus)document.getElementById('doe-title-'+index).focus();
    }
    function navigate(target) {
        if(target>current) {
            const d=read();
            for(let i=0;i<target;i++) { const errors=validate(d,i); if(errors.length) {show(i);showError(errors[0]);return;} }
        }
        show(target);
    }
    function invalidate() {
        if(plan) { stale=true; $('[data-outdated]').hidden=false; $('[data-generate]').disabled=false; $('[data-generate]').textContent='Generar mi plan actualizado →'; }
        $('[data-replace-confirm]').hidden=true;
    }
    function edit(event) { if(/^(factor|repetitions$|blocking$)/.test(event.target.name||''))form.elements.feasible.checked=false; dirty=true; clearError();sync();invalidate();save();$('[data-draft-banner]').hidden=true; }
    form.addEventListener('input',edit);
    form.addEventListener('change',edit);
    $('[data-next]').addEventListener('click',()=>navigate(Math.min(current+1,5)));
    $('[data-back]').addEventListener('click',()=>navigate(Math.max(current-1,0)));
    links.forEach(link=>link.addEventListener('click',()=>navigate(Number(link.dataset.stepLink))));
    function loadExample() {plan=null;stale=false;$('[data-output]').hidden=true;$('[data-generate]').disabled=false;$('[data-replace-confirm]').hidden=true;fill(example);dirty=true;save();show(0);$('[data-example-confirm]').hidden=true;$('[data-draft-banner]').hidden=true;}
    $('[data-example]').addEventListener('click',()=>{if(dirty||clean(read().experiment)||plan) $('[data-example-confirm]').hidden=false;else loadExample();});
    $('[data-example-accept]').addEventListener('click',loadExample);
    $('[data-example-cancel]').addEventListener('click',()=>{$('[data-example-confirm]').hidden=true;});
    $('[data-restore]').addEventListener('click',()=>{if(stored) {invalidate();fill(stored);dirty=true;show(0);$('[data-draft-banner]').hidden=true;}});
    $('[data-dismiss]').addEventListener('click',()=>{stored=null;$('[data-draft-banner]').hidden=true;try{localStorage.removeItem(storageKey);}catch(_){};});
    function download(name,content,type) {
        const url=URL.createObjectURL(new Blob([content],{type}));
        const anchor=document.createElement('a');anchor.href=url;anchor.download=name;document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }
    function renderPlan() {
        const d=plan.data,blocked=d.blocking==='replicate';
        $('[data-output-summary]').textContent=totals(d)+'. Orden '+(blocked?'aleatorio dentro de cada grupo.':'aleatorio.');
        $('[data-caption]').textContent=d.experiment+' · Respuesta: '+d.response+' ('+d.responseUnit+'). Deja vacías las mediciones pendientes.';
        const headers=['Orden','Combinación','Réplica',...(blocked?['Grupo ('+d.blockName+')']:[]),...plan.factors.map(f=>f.name+(f.unit?' ('+f.unit+')':'')),d.response+' ('+d.responseUnit+')','Observaciones'];
        $('[data-table-head]').innerHTML='<tr>'+headers.map(h=>'<th scope="col">'+esc(h)+'</th>').join('')+'</tr>';
        $('[data-table-body]').innerHTML=plan.rows.map((r,i)=>'<tr>'+[r.run,r.condition,r.replica,...(blocked?[r.block]:[]),...r.values].map(v=>'<td>'+esc(v)+'</td>').join('')+
            '<td><input type="text" inputmode="decimal" maxlength="40" data-result="'+i+'" aria-label="'+esc(d.response)+' ('+esc(d.responseUnit)+'), corrida '+r.run+'" placeholder="Sin medir"></td>'+
            '<td><input type="text" maxlength="600" data-note="'+i+'" aria-label="Observaciones, corrida '+r.run+'" placeholder="Incidencias o notas"></td></tr>').join('');
        $('[data-output]').hidden=false;
        $('[data-outdated]').hidden=true;$('[data-replace-confirm]').hidden=true;stale=false;
        $('[data-generate]').disabled=true;$('[data-generate]').textContent='Plan generado ↓';
        document.getElementById('doe-output-title').focus();
    }
    form.addEventListener('submit',event=>{
        event.preventDefault();
        if(current<5){navigate(current+1);return;}
        const d=read(),errors=validate(d);
        if(errors.length){show(errors[0].step);showError(errors[0]);return;}
        if(plan && !stale)return;
        if(plan && stale){$('[data-replace-confirm]').hidden=false;return;}
        plan=generate(d);save();renderPlan();
    });
    $('[data-replace-plan]').addEventListener('click',()=>{
        const d=read(),errors=validate(d);
        if(errors.length){show(errors[0].step);showError(errors[0]);return;}
        plan=generate(d);save();renderPlan();
    });
    $('[data-replace-cancel]').addEventListener('click',()=>{$('[data-replace-confirm]').hidden=true;});
    $('[data-table-body]').addEventListener('input',event=>{
        if(!plan)return;
        const el=event.target;
        if(el.hasAttribute('data-result')) {
            const value=clean(el.value);plan.rows[Number(el.dataset.result)].result=value;
            el.setCustomValidity(value!==''&&!Number.isFinite(numeric(value))?'Escribe un número con punto o coma decimal, sin unidad.':'');
        }
        if(el.hasAttribute('data-note'))plan.rows[Number(el.dataset.note)].note=el.value;
    });
    $('[data-csv]').addEventListener('click',()=>{
        if(!plan)return;
        const invalid=$('[data-table-body] input:invalid');if(invalid){invalid.reportValidity();return;}
        download('resultados-experimento-hvt.csv',csv(plan),'text/csv;charset=utf-8');
    });
    $('[data-protocol]').addEventListener('click',()=>{if(plan)download('protocolo-experimento-hvt.txt','\ufeff'+protocol(plan),'text/plain;charset=utf-8');});
    // Preserve the existing links into the planner without inventing missing decisions.
    const params=new URLSearchParams(window.location.search);
    if(params.has('experiment')) {
        const d=read();
        ['experiment','response','responseUnit','repetitions','seed',...[1,2,3].flatMap(i=>['factorName'+i,'factorLow'+i,'factorHigh'+i,'factorUnit'+i])].forEach(name=>{if(params.has(name))d[name]=params.get(name);});
        d.factorCount=String(Math.max(1,...[1,2,3].filter(i=>['factorName','factorLow','factorHigh','factorUnit'].some(k=>clean(d[k+i])))));
        [1,2,3].forEach(i=>{if(clean(d['factorLow'+i])&&clean(d['factorHigh'+i]))d['factorType'+i]=Number.isFinite(numeric(d['factorLow'+i]))&&Number.isFinite(numeric(d['factorHigh'+i]))?'numeric':'category';});
        fill(d);dirty=true;
    }
    sync();show(0,false);
})();
