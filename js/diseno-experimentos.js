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
        if (!Number.isInteger(count) || count < 1 || count > 4) add('factorCount',2,'Elige entre uno y cuatro factores.');
        const names = new Set();
        for (let i=1; i<=Math.min(count,4); i++) {
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
        const rawCount=Number(data.rawCount||0);
        if(!Number.isInteger(rawCount)||rawCount<0||rawCount>3)add('rawCount',1,'Elige de cero a tres mediciones auxiliares.');
        const rawNames=new Set();
        for(let i=1;i<=Math.min(rawCount,3);i++) {
            const name=clean(data['rawName'+i]),unit=clean(data['rawUnit'+i]);
            if(!name||name.length>80)add('rawName'+i,1,'Nombra la medición auxiliar '+i+' (máximo 80 caracteres).');
            if(rawNames.has(identity(name)))add('rawName'+i,1,'Usa un nombre diferente para cada medición auxiliar.');
            rawNames.add(identity(name));
            if(!unit||unit.length>30)add('rawUnit'+i,1,'Indica la unidad de la medición auxiliar '+i+'.');
        }
        const calculation=data.calculation||'manual';
        if(!['manual','difference'].includes(calculation))add('calculation',1,'Elige cómo obtendrás el resultado.');
        if(calculation==='difference') {
            if(rawCount<2)add('rawCount',1,'La resta necesita al menos dos mediciones auxiliares.');
            if(clean(data.rawUnit1).normalize('NFKC')!==clean(data.rawUnit2).normalize('NFKC')||clean(data.rawUnit1).normalize('NFKC')!==clean(data.responseUnit).normalize('NFKC'))add('rawUnit1',1,'Para restar, las dos mediciones y la respuesta deben usar la misma unidad, incluidas sus mayúsculas. No se convierten unidades automáticamente.');
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
                values:factors.map((f,i)=>f.levels[(mask>>i)&1]),result:'',note:'',unitId:'',date:'',status:'pending',actual:factors.map(()=>''),raw:Array(Number(data.rawCount||0)).fill('')
            }));
            rows.push(...(data.blocking==='replicate'?shuffle(group,rng):group));
        }
        if (data.blocking==='none') rows=shuffle(rows,rng);
        rows.forEach((r,i)=>{ r.run=i+1; });
        return {version:'HVT-DOE-GUIDED-2',data:JSON.parse(JSON.stringify(data)),factors,rows};
    }
    function matrix(plan) {
        return Array.from({length:2**plan.factors.length},(_,mask)=>({condition:mask+1,codes:plan.factors.map((_,i)=>((mask>>i)&1)?1:-1),values:plan.factors.map((f,i)=>f.levels[(mask>>i)&1])}));
    }
    function resultValue(plan,row) {
        if(plan.data.calculation!=='difference')return row.result;
        if(!clean(row.raw[0])||!clean(row.raw[1]))return '';
        const a=numeric(row.raw[0]),b=numeric(row.raw[1]);
        return Number.isFinite(a)&&Number.isFinite(b)?String(Number((a-b).toPrecision(12))):'';
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
        head.push('ID de unidad (usuario)','Fecha/hora local','Estado',...plan.factors.map(f=>'Plan: '+f.name+(f.unit?' ('+f.unit+')':'')),...plan.factors.map(f=>'Real: '+f.name+(f.unit?' ('+f.unit+')':'')),...Array.from({length:Number(d.rawCount||0)},(_,i)=>clean(d['rawName'+(i+1)])+' ('+clean(d['rawUnit'+(i+1)])+')'),clean(d.response)+' ('+clean(d.responseUnit)+')','Observaciones');
        const rows=plan.rows.map(r=>{
            const line=[r.run,r.condition,r.replica];
            if (d.blocking==='replicate') line.push(r.block);
            const result=resultValue(plan,r);
            if (result!=='' && !Number.isFinite(numeric(result))) throw new Error('Revisa el resultado de la corrida '+r.run+'.');
            const measurement=value=>{if(!clean(value))return '';if(!Number.isFinite(numeric(value)))throw new Error('Revisa las mediciones de la corrida '+r.run+'.');return numeric(value);};
            return [...line,r.unitId,r.date,{pending:'Pendiente',done:'Realizada',excluded:'No válida'}[r.status],...r.values,...r.actual.map((v,i)=>plan.factors[i].type==='numeric'?measurement(v):v),...r.raw.map(measurement),result===''?'':numeric(result),r.note];
        });
        return '\ufeff'+[head,...rows].map(row=>row.map(csvCell).join(',')).join('\r\n');
    }
    function designCsv(plan) {
        const head=['Combinación',...plan.factors.flatMap((f,i)=>[String.fromCharCode(65+i)+' (código)',f.name+(f.unit?' ('+f.unit+')':'')])];
        return '\ufeff'+[head,...matrix(plan).map(r=>[r.condition,...r.values.flatMap((v,i)=>[r.codes[i],v])])].map(row=>row.map(csvCell).join(',')).join('\r\n');
    }
    const goals={compare:'Comparar las condiciones',increase:'Aumentar el resultado',decrease:'Reducir el resultado'};
    function protocol(plan) {
        const d=plan.data;
        return [
            'HVT · PLAN EXPERIMENTAL',clean(d.experiment),'',
            'PREGUNTA',clean(d.question),'HIPÓTESIS',clean(d.hypothesis),'',
            'MEDICIÓN','Respuesta: '+clean(d.response)+' ('+clean(d.responseUnit)+')',
            'Objetivo: '+goals[d.goal], 'Unidad experimental: '+clean(d.experimentalUnit),
            ...Array.from({length:Number(d.rawCount||0)},(_,i)=>'Medición auxiliar '+(i+1)+': '+clean(d['rawName'+(i+1)])+' ('+clean(d['rawUnit'+(i+1)])+')'),
            d.calculation==='difference'?'Cálculo de respuesta: '+clean(d.rawName1)+' - '+clean(d.rawName2)+'. Ambas lecturas son necesarias.':'Respuesta ingresada por el usuario.',
            'Método e instrumento: '+clean(d.measurement),'Diferencia útil: '+clean(d.meaningfulDifference),'',
            'FACTORES Y NIVELES',...plan.factors.map(f=>f.name+': '+f.levels.join(' / ')+(f.unit?' '+f.unit:'')),
            'Referencia: '+(clean(d.reference)||'No se definió una referencia adicional.'),
            'La referencia escrita no añade corridas al diseño.','',
            'PREPARACIÓN','Condiciones constantes: '+clean(d.constants),'Materiales: '+clean(d.materials),'',
            'PROCEDIMIENTO DE CADA PRUEBA',clean(d.procedure),'',
            'CRITERIOS DE PARADA Y PRUEBAS NO VÁLIDAS',clean(d.stopRules),'',
            'ORGANIZACIÓN','Diseño factorial 2^k: 2 niveles por factor; k = '+plan.factors.length+' factores.',
            '2^'+plan.factors.length+' = '+2**plan.factors.length+' combinaciones; N = 2^k × r = '+plan.rows.length+' pruebas con r = '+d.repetitions+' réplicas.',
            'Trabajo activo estimado: '+(plan.rows.length*Number(d.minutes)).toLocaleString('es-CO')+' minutos. No incluye esperas de seguimiento, pausas ni traslados; consulta los plazos en el procedimiento.',
            d.blocking==='replicate'?'Grupos completos por '+clean(d.blockName)+'. Cada grupo incluye todas las combinaciones una vez. Orden aleatorio dentro de cada grupo.':'Orden aleatorio en un solo conjunto.',
            'Código de aleatorización: '+d.seed,'',
            'MATRIZ ESTÁNDAR (NO ES EL ORDEN DE EJECUCIÓN)',
            'Código -1: nivel bajo u opción 1; código +1: nivel alto u opción 2.',
            ...matrix(plan).map(r=>'Combinación '+r.condition+': '+plan.factors.map((f,i)=>String.fromCharCode(65+i)+' = '+r.codes[i]+' ('+r.values[i]+(f.unit?' '+f.unit:'')+')').join(' | ')),'',
            'ORDEN DE EJECUCIÓN',...plan.rows.map(r=>r.run+'. '+(r.block?'Grupo '+r.block+' · ':'')+'Combinación '+r.condition+' · Réplica '+r.replica+' · '+plan.factors.map((f,i)=>f.name+' = '+r.values[i]+(f.unit?' '+f.unit:'')).join(' | ')),'',
            'REGISTRO Y ANÁLISIS PREVISTO',
            'Usa la tabla CSV para registrar ID de unidad, fecha/hora local, estado, condiciones reales, mediciones auxiliares, respuesta e incidencias. Los valores planificados se conservan separados.',
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
        "experiment": "Fibras y pérdida de agua en el suelo · Ejemplo HVT",
        "question": "¿Cómo influyen la cantidad de cobertura de fibras y el riego inicial en la pérdida de masa del conjunto maceta-suelo durante 24 horas?",
        "hypothesis": "Creo que la cobertura con fibras disminuirá la pérdida de masa durante 24 horas y que su efecto dependerá del riego inicial.",
        "response": "Pérdida de masa a las 24 h",
        "responseUnit": "g",
        "goal": "decrease",
        "experimentalUnit": "Una maceta sin planta, con 500 g de suelo seco del mismo lote y un plato individual; cada maceta recibe una combinación y se sigue durante 24 horas.",
        "measurement": "Pesar el conjunto completo (maceta, suelo, cobertura y plato) con una balanza de resolución de 1 g, comprobada con una masa de referencia. Registrar masa inicial tras el riego y masa final a las 24 h. Mantener toda el agua drenada en el plato que se pesa. Restar masa inicial menos masa final. La pérdida de masa aproxima la pérdida de agua si no hay pérdidas de sólidos, aportes externos ni agua fuera del conjunto; no equivale a medir directamente el porcentaje de humedad del suelo.",
        "meaningfulDifference": "Una diferencia de 5 g de pérdida de masa a las 24 h, propuesta para practicar y pendiente de justificar con un piloto.",
        "factorCount": "2",
        "factorName1": "Masa de cobertura de fibras",
        "factorType1": "numeric",
        "factorLow1": "0",
        "factorHigh1": "10",
        "factorUnit1": "g",
        "factorName2": "Riego inicial",
        "factorType2": "numeric",
        "factorLow2": "100",
        "factorHigh2": "200",
        "factorUnit2": "mL",
        "rawCount": "2",
        "rawName1": "Masa inicial del conjunto",
        "rawUnit1": "g",
        "rawName2": "Masa del conjunto a las 24 h",
        "rawUnit2": "g",
        "calculation": "difference",
        "constants": "Mismo modelo de maceta y plato, 500 g de suelo seco del mismo lote, superficie expuesta y periodo de seguimiento de 24 h. Sin plantas ni nuevos riegos. Misma zona protegida de lluvia. Registrar cambios ambientales relevantes.",
        "materials": "12 macetas iguales con platos individuales; 6 kg de suelo seco de un mismo lote; fibras acondicionadas según el protocolo del proyecto; balanza con resolución de 1 g; masa de referencia; recipiente graduado; etiquetas y registro de hora.",
        "procedure": "Ejemplo didáctico inspirado en DOE-001; estos niveles no son el protocolo validado ni resultados de HVT.\n1. Etiquetar una maceta nueva por fila; pesar 500 g de suelo seco y colocar su plato.\n2. Aplicar la masa de fibras y el volumen de riego asignados; registrar los valores realmente aplicados.\n3. Distribuir las macetas al azar en posiciones comparables y anotar su ubicación.\n4. Pesar el conjunto completo tras el riego, incluyendo el plato; registrar la masa inicial y la hora.\n5. A las 24 h de cada pesada inicial, pesar de nuevo el mismo conjunto sin retirar sólidos ni agua del plato.\n6. Registrar la masa final. La calculadora restará ambas masas; documentar las incidencias. Las dos pesadas de una maceta forman una respuesta, no dos réplicas.\nTrabajo activo estimado: 10 minutos por unidad, además de la espera de 24 horas.",
        "reference": "Sin fibras (0 g) en ambos niveles de riego. Estas dos condiciones están incluidas en la matriz.",
        "stopRules": "Marcar como no válida una maceta si se derrama agua fuera del conjunto, se pierde suelo o entra lluvia. Detener las pesadas si falla la comprobación de la balanza. Conservar la fila y explicar la incidencia; documentar por separado cualquier unidad adicional.",
        "repetitions": "3",
        "minutes": "10",
        "blocking": "none",
        "blockName": "",
        "seed": "2026",
        "feasible": false
};
    if (typeof module !== 'undefined' && module.exports) module.exports={validate,generate,csv,designCsv,matrix,resultValue,protocol,numeric,example};
    if (typeof document === 'undefined') return;
    const form=document.getElementById('doe-wizard');
    if (!form) return;
    const $=selector=>document.querySelector(selector);
    const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const factorsContainer=$('[data-factors]');
    $('[data-raw-fields]').innerHTML=Array.from({length:3},(_,index)=>{
        const i=index+1;
        return '<div class="doe-grid" data-raw-group="'+i+'"><label class="doe-field">Medición '+i+'<input name="rawName'+i+'" maxlength="80" placeholder="Ej.: masa inicial"></label><label class="doe-field">Unidad de medición '+i+'<input name="rawUnit'+i+'" maxlength="30" placeholder="Ej.: g"></label></div>';
    }).join('');
    factorsContainer.innerHTML=[1,2,3,4].map(i=>'<fieldset class="doe-factor" data-factor="'+i+'"><legend>Factor '+String.fromCharCode(64+i)+' ? '+i+'</legend>'+
        '<label class="doe-field">¿Qué vas a cambiar?<input name="factorName'+i+'" maxlength="80" placeholder="Ej.: masa de cobertura de fibras"></label>'+
        '<label class="doe-field">¿Cómo se expresa?<select name="factorType'+i+'"><option value="numeric">Con números (ej.: 4 y 6 cm)</option><option value="category">Con opciones (ej.: suelo arenoso y arcilloso)</option></select></label>'+
        '<div class="doe-grid"><label class="doe-field"><span data-low-label>Nivel bajo</span><input name="factorLow'+i+'" maxlength="80" placeholder="Ej.: 0"></label>'+
        '<label class="doe-field"><span data-high-label>Nivel alto</span><input name="factorHigh'+i+'" maxlength="80" placeholder="Ej.: 10"></label></div>'+
        '<label class="doe-field" data-unit-field>Unidad<input name="factorUnit'+i+'" maxlength="30" placeholder="Ej.: g"><small>Escribe los números sin unidad arriba. Se aceptan decimales con punto o coma, sin separadores de miles.</small></label></fieldset>').join('');
    const steps=[...document.querySelectorAll('[data-step]')];
    const links=[...document.querySelectorAll('[data-step-link]')];
    const help=[
        [
                "Una pregunta que puedas responder",
                "Relaciona lo que cambias con lo que medirás. La hipótesis debe poder contrastarse.",
                "¿La cobertura de fibras y el riego modifican la pérdida de agua del suelo?"
        ],
        [
                "Mide siempre de la misma forma",
                "Define una unidad independiente y un método común antes de obtener resultados.",
                "Cada maceta es una unidad independiente. Sus pesadas inicial y final permiten calcular una sola respuesta a las 24 horas."
        ],
        [
                "Dos niveles, k factores",
                "El 2 indica dos niveles por factor. k es la cantidad de factores: esta calculadora admite de uno a cuatro.",
                "Fibras: 0 o 10 g. Riego: 100 o 200 mL. Son 2² = 4 combinaciones, visibles en la matriz."
        ],
        [
                "Que alguien más pueda repetirlo",
                "Escribe acciones concretas, materiales y condiciones constantes. Las incidencias también son información.",
                "Usa el mismo suelo y tipo de maceta. Conserva el agua del plato al pesar. Anota cualquier derrame."
        ],
        [
                "Cuenta las unidades independientes",
                "N = 2ᵏ × r. Las mediciones repetidas sobre la misma unidad no aumentan el número de réplicas.",
                "2² × 3 = 12 macetas. A 10 minutos activos por unidad: 120 minutos de trabajo, además del seguimiento de 24 horas."
        ],
        [
                "Del diseño a los datos reales",
                "Consulta las tablas generadas y completa el registro de mediciones. Los campos vacíos son datos pendientes.",
                "Ingresa las masas inicial y final de cada maceta. Con ambas lecturas, la calculadora obtiene su diferencia."
        ]
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
        return combinations+' combinaciones × '+data.repetitions+' réplicas = '+runs+' pruebas · '+mins.toLocaleString('es-CO',{maximumFractionDigits:1})+' min de trabajo activo (sin esperas de seguimiento)';
    }
    function sync() {
        const d=read();
        [1,2,3,4].forEach(i=>{
            const fieldset=$('[data-factor="'+i+'"]'),active=i<=Number(d.factorCount),category=d['factorType'+i]==='category';
            fieldset.hidden=!active; fieldset.disabled=!active;
            fieldset.querySelector('[data-low-label]').textContent=category?'Opción 1':'Nivel bajo';
            fieldset.querySelector('[data-high-label]').textContent=category?'Opción 2':'Nivel alto';
            fieldset.querySelector('[data-unit-field]').hidden=category;
            form.elements['factorUnit'+i].disabled=category||!active;
            form.elements['factorLow'+i].placeholder=category?'Ej.: arenoso':'Ej.: 0';
            form.elements['factorHigh'+i].placeholder=category?'Ej.: arcilloso':'Ej.: 10';
        });
        $('[data-block-field]').hidden=d.blocking!=='replicate';
        $('[data-run-count]').textContent=totals(d);
        document.querySelectorAll('[data-raw-group]').forEach(group=>{
            const active=Number(group.dataset.rawGroup)<=Number(d.rawCount);
            group.hidden=!active;group.querySelectorAll('input').forEach(input=>{input.disabled=!active;});
        });
        const k=Number(d.factorCount),r=Number(d.repetitions);
        $('[data-factor-formula]').innerHTML='k = '+k+' → <strong>2<sup>'+k+'</sup> = '+2**k+' combinaciones</strong>';
        $('[data-run-formula]').innerHTML=Number.isInteger(r)&&r>=2&&r<=10?'2<sup>'+k+'</sup> × '+r+' = <strong>'+2**k*r+' pruebas independientes</strong>':'Completa el número de réplicas para calcular N.';
        renderDesignTables($('[data-design-preview]'),{
            factors:Array.from({length:k},(_,i)=>{const n=i+1;return {name:clean(d['factorName'+n])||'Factor '+String.fromCharCode(65+i),type:d['factorType'+n],unit:d['factorType'+n]==='numeric'?clean(d['factorUnit'+n]):'',levels:[clean(d['factorLow'+n])||'Por definir',clean(d['factorHigh'+n])||'Por definir']};})
        },true);
    }
    function renderDesignTables(container,design,preview=false) {
        const table=(title,caption,headers,rows)=>'<section class="doe-table-section"><h3>'+title+' <span class="doe-table-tag">'+(preview?'Vista previa':'Generada')+'</span></h3><div class="doe-table-wrap" tabindex="0" role="region" aria-label="'+esc(caption)+'"><table class="doe-table"><caption>'+esc(caption)+'</caption><thead><tr>'+headers.map(h=>'<th scope="col">'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(value=>'<td>'+esc(value)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div></section>';
        container.innerHTML=table('1. Factores y niveles','Qué significa cada letra y cada nivel',['Código','Factor','−1: bajo / opción 1','+1: alto / opción 2','Unidad'],design.factors.map((f,i)=>[String.fromCharCode(65+i),f.name,...f.levels,f.unit||'—']))+
            table('2. Matriz de combinaciones','Orden estándar para revisar el diseño; todavía no es el orden de ejecución',['Combinación',...design.factors.map((_,i)=>String.fromCharCode(65+i)+' · valor y código')],matrix(design).map(row=>[row.condition,...row.values.map((v,i)=>v+(design.factors[i].unit?' '+design.factors[i].unit:'')+' ['+(row.codes[i]>0?'+1':'−1')+']')]))+
            '<p class="doe-save">−1 y +1 son códigos de nivel, no mediciones. Cada combinación se repetirá tantas veces como réplicas elijas.'+(preview?' Completa y valida los factores antes de generar el plan.':'')+'</p>';
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
            section('Lecturas y cálculo',[...Array.from({length:Number(d.rawCount||0)},(_,i)=>['Medición '+(i+1),d['rawName'+(i+1)]+' ('+d['rawUnit'+(i+1)]+')']),['Resultado',d.calculation==='difference'?d.rawName1+' − '+d.rawName2:'Ingresado por el usuario']])+
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
        renderDesignTables($('[data-design-output]'),plan);
        const orderHeaders=['Orden','Combinación','Réplica',...(blocked?['Grupo ('+d.blockName+')']:[]),...plan.factors.map(f=>f.name+(f.unit?' ('+f.unit+')':''))];
        $('[data-order-head]').innerHTML='<tr>'+orderHeaders.map(h=>'<th scope="col">'+esc(h)+'</th>').join('')+'</tr>';
        $('[data-order-body]').innerHTML=plan.rows.map(r=>'<tr>'+[r.run,r.condition,r.replica,...(blocked?[r.block]:[]),...r.values].map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>').join('');
        const computed=d.calculation==='difference';
        $('[data-calculation-note]').textContent=computed?'Resultado calculado: '+d.response+' = '+d.rawName1+' − '+d.rawName2+' ('+d.responseUnit+'). Se completa únicamente cuando ambas lecturas son válidas.':'Ingresa tu resultado en '+d.responseUnit+'. Las mediciones auxiliares, si las definiste, se conservan junto a la respuesta.';
        const headers=['Orden','Combinación','Réplica',...(blocked?['Grupo ('+d.blockName+')']:[]),'ID de unidad','Fecha/hora local','Estado',...plan.factors.map(f=>'Real: '+f.name+(f.unit?' ('+f.unit+')':'')),...Array.from({length:Number(d.rawCount||0)},(_,i)=>d['rawName'+(i+1)]+' ('+d['rawUnit'+(i+1)]+')'),d.response+' ('+d.responseUnit+')'+(computed?' · calculado':''),'Observaciones'];
        $('[data-table-head]').innerHTML='<tr>'+headers.map(h=>'<th scope="col">'+esc(h)+'</th>').join('')+'</tr>';
        const field=(row,name,attribute,options='')=>'<td><input type="text" '+attribute+'="'+row+'" '+options+' aria-label="'+esc(name)+', corrida '+(row+1)+'"></td>';
        $('[data-table-body]').innerHTML=plan.rows.map((r,i)=>'<tr>'+[r.run,r.condition,r.replica,...(blocked?[r.block]:[])].map(v=>'<td>'+esc(v)+'</td>').join('')+
            field(i,'ID de unidad','data-unit-id','maxlength="80" placeholder="Ej.: M-001"')+
            '<td><input type="datetime-local" data-date="'+i+'" aria-label="Fecha/hora local, corrida '+r.run+'"></td>'+
            '<td><select data-status="'+i+'" aria-label="Estado, corrida '+r.run+'"><option value="pending">Pendiente</option><option value="done">Realizada</option><option value="excluded">No válida</option></select></td>'+
            plan.factors.map((f,j)=>field(i,'Real: '+f.name+(f.unit?' ('+f.unit+')':''),'data-actual','data-factor-index="'+j+'" maxlength="80" '+(f.type==='numeric'?'inputmode="decimal" ':'')+'placeholder="Por medir"')).join('')+
            Array.from({length:Number(d.rawCount||0)},(_,j)=>field(i,d['rawName'+(j+1)]+' ('+d['rawUnit'+(j+1)]+')','data-raw','data-raw-index="'+j+'" maxlength="40" inputmode="decimal" placeholder="Sin medir"')).join('')+
            '<td><input type="text" inputmode="decimal" maxlength="40" data-result="'+i+'" '+(computed?'readonly ':'')+'aria-label="'+esc(d.response)+' ('+esc(d.responseUnit)+'), corrida '+r.run+'" placeholder="'+(computed?'Faltan lecturas':'Sin medir')+'"></td>'+
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
        const checkNumeric=(value)=>el.setCustomValidity(clean(value)!==''&&!Number.isFinite(numeric(value))?'Escribe un número válido con punto o coma decimal, sin unidad.':'');
        if(el.hasAttribute('data-raw')) {
            const row=Number(el.dataset.raw),value=clean(el.value);plan.rows[row].raw[Number(el.dataset.rawIndex)]=value;checkNumeric(value);
            if(plan.data.calculation==='difference') {
                const output=$('[data-result="'+row+'"]');output.value=resultValue(plan,plan.rows[row]);
                output.setCustomValidity(output.value!==''&&!Number.isFinite(numeric(output.value))?'La diferencia excede el rango numérico. Revisa las dos lecturas.':'');
            }
        }
        if(el.hasAttribute('data-actual')) {const index=Number(el.dataset.factorIndex);plan.rows[Number(el.dataset.actual)].actual[index]=clean(el.value);if(plan.factors[index].type==='numeric')checkNumeric(el.value);}
        if(el.hasAttribute('data-unit-id'))plan.rows[Number(el.dataset.unitId)].unitId=el.value;
        if(el.hasAttribute('data-date'))plan.rows[Number(el.dataset.date)].date=el.value;
        if(el.hasAttribute('data-status'))plan.rows[Number(el.dataset.status)].status=el.value;
        if(el.hasAttribute('data-result')) {
            const value=clean(el.value);plan.rows[Number(el.dataset.result)].result=value;
            el.setCustomValidity(value!==''&&!Number.isFinite(numeric(value))?'Escribe un número con punto o coma decimal, sin unidad.':'');
        }
        if(el.hasAttribute('data-note'))plan.rows[Number(el.dataset.note)].note=el.value;
    });
    $('[data-table-body]').addEventListener('change',event=>{if(event.target.tagName==='SELECT'||event.target.type==='datetime-local')event.target.dispatchEvent(new Event('input',{bubbles:true}));});
    $('[data-csv]').addEventListener('click',()=>{
        if(!plan)return;
        const invalid=$('[data-table-body] input:invalid');if(invalid){invalid.reportValidity();return;}
        download('resultados-experimento-hvt.csv',csv(plan),'text/csv;charset=utf-8');
    });
    $('[data-protocol]').addEventListener('click',()=>{if(plan)download('protocolo-experimento-hvt.txt','\ufeff'+protocol(plan),'text/plain;charset=utf-8');});
    $('[data-design-csv]').addEventListener('click',()=>{if(plan)download('matriz-factorial-hvt.csv',designCsv(plan),'text/csv;charset=utf-8');});
    // Preserve the existing links into the planner without inventing missing decisions.
    const params=new URLSearchParams(window.location.search);
    if(params.has('experiment')) {
        const d=read();
        ['experiment','response','responseUnit','repetitions','seed',...[1,2,3,4].flatMap(i=>['factorName'+i,'factorLow'+i,'factorHigh'+i,'factorUnit'+i])].forEach(name=>{if(params.has(name))d[name]=params.get(name);});
        d.factorCount=String(Math.max(1,...[1,2,3,4].filter(i=>['factorName','factorLow','factorHigh','factorUnit'].some(k=>clean(d[k+i])))));
        [1,2,3,4].forEach(i=>{if(clean(d['factorLow'+i])&&clean(d['factorHigh'+i]))d['factorType'+i]=Number.isFinite(numeric(d['factorLow'+i]))&&Number.isFinite(numeric(d['factorHigh'+i]))?'numeric':'category';});
        fill(d);dirty=true;
    }
    sync();show(0,false);
})();
