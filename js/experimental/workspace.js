(async function(){
    'use strict';
    const M=window.HVTExperiment,D=window.HVTDOE,$=s=>document.querySelector(s),content=$('#ws-content');
    const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const fmt=v=>v===null||v===undefined?'No estimable':typeof v==='number'?new Intl.NumberFormat('es-CO',{maximumSignificantDigits:6}).format(v):esc(v);
    const table=(headers,rows,caption='')=>'<div class="ws-table-wrap" role="region" tabindex="0" aria-label="'+esc(caption||headers.join(', '))+'"><table class="ws-table">'+(caption?'<caption>'+esc(caption)+'</caption>':'')+'<thead><tr>'+headers.map(h=>'<th scope="col">'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(v=>'<td>'+esc(v??'—')+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
    const field=(name,label,value='',type='text',wide=false)=>'<label class="ws-field '+(wide?'ws-wide':'')+'">'+esc(label)+(type==='textarea'?'<textarea name="'+name+'" maxlength="2400">'+esc(value)+'</textarea>':'<input name="'+name+'" type="'+type+'" value="'+esc(value)+'" maxlength="300">')+'</label>';
    const select=(name,label,options,value)=>'<label class="ws-field">'+esc(label)+'<select name="'+name+'">'+options.map(([v,l])=>'<option value="'+esc(v)+'"'+(String(v)===String(value)?' selected':'')+'>'+esc(l)+'</option>').join('')+'</select></label>';
    const heading=(title,text,source='investigador')=>'<span class="ws-origin">Origen: '+esc(source)+'</span><h1>'+title+'</h1><p class="ws-lead">'+text+'</p>';
    const reason=(text='')=>'<div class="ws-fields ws-reason">'+field('actor','Responsable del registro',experiment.metadata.actor)+field('reason','Razón / descripción del cambio',text)+'</div>';
    const values=form=>Object.fromEntries(new FormData(form));
    let repo,experiment=null,pendingRecovery=null,stage='define',mode='guided',dirty=false,health=null,analysisTab='summary',selectedRun=1,activeChart='observed';
    let api='/api/v1';
    try{repo=window.HVTRepository(localStorage);api=localStorage.getItem('hvt-engine-url')||api;}catch(_){message('El almacenamiento local está bloqueado. El workspace necesita habilitarlo para conservar el expediente.');}
    function message(text){$('#ws-message').hidden=!text;$('#ws-message').textContent=text;}
    function download(name,data,type='application/json'){const url=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
    function base(){return M.latestDesign(experiment);}
    function currentAnalysis(){return experiment?.analyses.at(-1);}
    function commit(fn){
        const next=M.clone(experiment);fn(next);
        try{repo.save(next,experiment.revision);}catch(err){pendingRecovery=next;throw Error(err.message+' El botón Exportar JSON conserva la copia pendiente.');}
        experiment=next;pendingRecovery=null;dirty=false;message('Cambio guardado como nueva revisión local.');render();
    }
    async function call(endpoint,payload){
        const response=await fetch(api+endpoint,{method:payload?'POST':'GET',headers:payload?{'Content-Type':'application/json'}:{},body:payload?JSON.stringify(payload):undefined,signal:AbortSignal.timeout(60000)});
        if(!response.ok){let error;try{error=await response.json();}catch(_){}throw Error(typeof error?.detail==='string'?error.detail:'El motor no pudo procesar la solicitud ('+response.status+').');}
        return response.json();
    }
    async function connect(){try{health=await call('/health');if(!health.engine||!Array.isArray(health.capabilities))throw Error('Respuesta de motor incompatible.');}catch(_){health=null;}status();}
    function status(){
        $('#ws-engine').textContent=health?'Motor: '+health.engine:'Motor Python: sin conexión · análisis no disponible';
        if(!experiment)return;
        $('#ws-name').textContent=experiment.metadata.name;$('#ws-identity').textContent=experiment.id+' / Diseño v'+base().version+' / Revisión '+experiment.revision;
        $('#ws-state').textContent=experiment.status;$('#ws-export').disabled=false;
        $('#ws-dataset').textContent='Dataset v'+(experiment.raw.length+experiment.decisions.length)+' · n plan='+base().plan.rows.length+' · seed='+base().plan.data.seed;
        $('#ws-calculation').textContent='Último cálculo: '+(currentAnalysis()?.result.calculated_at||'—');
        $('#ws-save-state').textContent='Guardado local · '+new Date(experiment.updatedAt).toLocaleString('es-CO');
    }
    function mentor(){const notes=window.HVTMentor.review(experiment,stage);$('#ws-mentor-notes').innerHTML=notes.map(n=>'<article><small>'+esc(n.source)+'</small><h3>'+esc(n.title)+'</h3><p>'+esc(n.text)+'</p></article>').join('');}
    function list(){
        stage='list';const entries=repo?repo.list():[];
        content.innerHTML=heading('Expedientes experimentales','Diseña en la página pública y continúa aquí con ejecución, datos, análisis e historial. El almacenamiento es local a este navegador.')+
            '<div class="ws-actions"><a href="/laboratorio/diseno-experimentos/">Crear un experimento</a><button data-action="import">Importar expediente JSON</button><button data-action="connection">Configurar motor Python</button></div>'+
            (entries.length?'<div class="ws-table-wrap"><table class="ws-table"><thead><tr><th>Experimento</th><th>Estado</th><th>Última revisión</th><th>Abrir</th></tr></thead><tbody>'+entries.map(e=>'<tr><td>'+esc(e.name)+'<br><small>'+esc(e.id)+'</small></td><td>'+esc(e.status)+'</td><td>'+esc(e.updatedAt)+'</td><td><button data-open="'+esc(e.id)+'">Abrir</button></td></tr>').join('')+'</tbody></table></div>':'<p class="ws-warning">No hay expedientes locales. Genera un plan en el diseñador y pulsa «Crear expediente y continuar en el workspace».</p>');
        mentor();
    }
    function open(id){experiment=repo.get(id);D.validate(base().plan.data).length&&message('El expediente contiene decisiones que requieren revisión.');stage='define';dirty=false;history.replaceState({},'',location.pathname+'?experiment='+encodeURIComponent(id));render();}
    function definition(){const d=base().plan.data;
        return heading('01 · Definir','Identificación, pregunta e hipótesis. Cada modificación se registra con responsable, fecha y razón.')+
            '<form data-form="define"><div class="ws-fields">'+field('name','Nombre del experimento',experiment.metadata.name)+field('project','Proyecto',experiment.metadata.project)+field('organization','Organización',experiment.metadata.organization)+select('status','Estado declarado',M.stages.map(s=>[s,s]),experiment.status)+
            field('question','Pregunta experimental',d.question,'textarea',true)+field('hypothesis','Hipótesis',d.hypothesis,'textarea',true)+field('response','Respuesta',d.response)+field('responseUnit','Unidad de respuesta',d.responseUnit)+field('experimentalUnit','Unidad experimental',d.experimentalUnit,'textarea',true)+'</div>'+reason()+'<button class="ws-primary">Guardar revisión</button></form>'+
            '<p class="ws-warning">El estado y el responsable son declaraciones del investigador. Este MVP no autentica usuarios ni certifica aprobaciones.</p>';
    }
    function modeling(){const d=base().plan.data;
        return heading('02 · Modelar','Factores controlables y dos niveles por factor. Se conserva el modelo factorial completo, con todas las interacciones.')+
            '<form data-form="model"><div class="ws-fields">'+select('factorCount','Número de factores k',[1,2,3,4].map(k=>[k,k+' factores']),d.factorCount)+'</div>'+[1,2,3,4].map(i=>'<fieldset class="ws-box" data-factor-group="'+i+'"'+(i>Number(d.factorCount)?' hidden':'')+'><legend>Factor '+String.fromCharCode(64+i)+'</legend><div class="ws-fields">'+field('factorName'+i,'Nombre',d['factorName'+i]||'')+select('factorType'+i,'Tipo',[['numeric','Numérico'],['category','Categórico']],d['factorType'+i]||'numeric')+field('factorLow'+i,'Nivel −1 / opción 1',d['factorLow'+i]||'')+field('factorHigh'+i,'Nivel +1 / opción 2',d['factorHigh'+i]||'')+field('factorUnit'+i,'Unidad (numéricos)',d['factorUnit'+i]||'')+'</div></fieldset>').join('')+reason()+'<button class="ws-primary">Guardar nueva versión del diseño</button></form>'+
            '<p class="ws-warning">Todas las combinaciones deben ser realizables. Restricciones, factores difíciles de cambiar y diseños split-plot requieren otra familia de diseño; no están implementados.</p>';
    }
    function designing(){const d=base().plan.data,p=base().plan;
        const factorHeaders=p.factors.map(f=>f.name+(f.unit?' ('+f.unit+')':''));
        return heading('03 · Diseñar','Factorial completo 2ᵏ. El 2 indica dos niveles; k es el número de factores. N = 2ᵏ × réplicas.')+
            '<form data-form="design"><div class="ws-fields">'+field('repetitions','Réplicas independientes por combinación',d.repetitions,'number')+field('seed','Semilla reproducible',d.seed,'number')+select('blocking','Aleatorización',[['none','Completa'],['replicate','Dentro de bloques completos']],d.blocking)+field('blockName','Nombre del bloque',d.blockName||'')+'</div>'+reason()+'<button class="ws-primary">Guardar nueva versión del diseño</button></form>'+
            '<div class="ws-actions"><button data-action="verify"'+(!health?' disabled':'')+'>Verificar diseño con Python</button><button data-action="matrix-csv">Exportar matriz CSV</button></div><p class="ws-origin">'+esc(base().verification?'Verificado por '+base().verification.engine:'Origen actual: diseñador local JavaScript · pendiente de verificación Python')+'</p>'+
            table(['Combinación',...factorHeaders],D.matrix(p).map(r=>[r.condition,...r.values]),'Matriz estándar · '+p.rows.length+' corridas con réplicas')+
            (mode==='advanced'?table(['Combinación',...p.factors.map((_,i)=>String.fromCharCode(65+i))],D.matrix(p).map(r=>[r.condition,...r.codes]),'Variables codificadas')+advancedModel():'')+
            '<p class="ws-warning">Puntos centrales y RSM: aún no implementados. No se estima curvatura con solo dos niveles.</p>';
    }
    function advancedModel(){const v=base().verification;if(!v)return '<p>Conecta Python y verifica el diseño para ver términos y parámetros calculados por el motor.</p>';
        return table(['Motor','Términos','Parámetros previstos','Semilla','Algoritmo'],[[v.engine,v.terms.join(' + '),v.parameters,v.seed,v.algorithm]],'Configuración científica')+'<p>Factorial completo sin alias estructural entre términos en el diseño planificado. El rango y los grados de libertad efectivos se comprueban con los datos del análisis.</p>';
    }
    function execution(){const d=base().plan.data,rows=M.dataset(experiment);
        return heading('04 · Ejecutar','Protocolo, equipos, condiciones y bitácora. El orden planificado se conserva junto al orden real registrado.')+
            '<details><summary>Editar protocolo (crea una nueva versión del diseño)</summary><form data-form="protocol"><div class="ws-fields">'+['measurement','meaningfulDifference','materials','constants','procedure','stopRules','reference'].map((key,i)=>field(key,['Cómo y cuándo medir','Diferencia de interés','Materiales','Constantes','Procedimiento','Criterios de parada','Referencia'][i],d[key],'textarea',true)).join('')+'</div>'+reason()+'<button>Guardar versión de protocolo</button></form></details><details open><summary>Protocolo vigente · diseño v'+base().version+'</summary><pre class="ws-pre">'+esc(d.procedure)+'\n\nMateriales: '+esc(d.materials)+'\n\nConstantes: '+esc(d.constants)+'\n\nParada: '+esc(d.stopRules)+'</pre></details>'+
            table(['Orden previsto','Combinación','Réplica','Bloque','Orden real','Estado'],rows.map(r=>[r.run,r.condition,r.replica,r.block,r.executionOrder||'—',r.status]),'Secuencia de ejecución')+
            '<form data-form="log"><h2>Nueva entrada de bitácora</h2><div class="ws-fields">'+field('equipment','Equipo / identificación / calibración','', 'textarea')+field('conditions','Condiciones, ubicación o incidencia','', 'textarea')+'</div>'+reason()+'<button class="ws-primary">Añadir al historial</button></form>'+
            table(['Fecha','Responsable','Equipo','Condiciones','Razón'],experiment.logbook.map(e=>[e.at,e.actor,e.equipment,e.conditions,e.reason]),'Bitácora conservada');
    }
    function dataPanel(){const d=base().plan.data,rows=M.dataset(experiment),r=rows.find(row=>row.run===selectedRun)||rows[0];selectedRun=r.run;
        const record=(name,label,value,type='text')=>field(name,label,value??'',type);
        return heading('05 · Datos','Cada guardado añade una revisión. Las lecturas anteriores permanecen en datos brutos; las exclusiones se registran por separado.')+
            '<div class="ws-actions">'+select('chooseRun','Corrida',rows.map(row=>[row.run,'Corrida '+row.run+' · combinación '+row.condition]),r.run)+'<button data-action="records-csv">Exportar dataset CSV</button></div>'+
            '<p class="ws-warning">Condiciones planificadas: '+base().plan.factors.map((f,i)=>esc(f.name)+' = '+esc(r.values[i])+' '+esc(f.unit)).join(' · ')+'</p>'+
            '<form data-form="record"><div class="ws-fields">'+record('unitId','ID de unidad',r.unitId)+record('date','Fecha/hora local',r.date,'datetime-local')+record('executionOrder','Orden real de ejecución',r.executionOrder,'number')+select('status','Estado',[['pending','Pendiente'],['done','Realizada']],r.status==='done'?'done':'pending')+
            base().plan.factors.map((f,i)=>record('actual'+i,f.name+' real '+f.unit,r.actual?.[i])).join('')+
            Array.from({length:Number(d.rawCount||0)},(_,i)=>record('raw'+i,d['rawName'+(i+1)]+' ('+d['rawUnit'+(i+1)]+')',r.raw?.[i])).join('')+
            (d.calculation==='difference'?'<p class="ws-wide">Respuesta derivada: '+esc(d.rawName1)+' − '+esc(d.rawName2)+'. Python la calcula durante el análisis; las lecturas se conservan sin reemplazarse.</p>':record('result',d.response+' ('+d.responseUnit+')',r.result))+
            field('note','Observaciones',r.note,'textarea',true)+'</div>'+reason(experiment.raw.some(o=>o.run===r.run&&o.designVersion===base().version)?'':'Primera medición de la corrida')+'<button class="ws-primary">Guardar nueva revisión de datos</button></form>'+
            '<form data-form="exclude"><h2>Selección para el análisis</h2>'+select('excluded','Incluir esta corrida',[['false','Incluida (si está realizada y tiene respuesta)'],['true','Excluir del análisis conservando datos brutos']],String(Boolean(r.exclusion?.excluded)))+reason()+'<button>Registrar decisión de inclusión / exclusión</button></form>'+
            table(['Orden','Unidad','Estado','Lecturas originales','Respuesta directa','Excluida'],rows.map(row=>[row.run,row.unitId,row.status,row.raw?.join(' / '),d.calculation==='difference'?'Derivada en Python':row.result,row.exclusion?.excluded?'Sí: '+row.exclusion.reason:'No']),'Dataset vigente')+
            table(['Revisión','Diseño','Corrida','Responsable','Fecha','Razón','Valores originales'],experiment.raw.map(o=>[o.id,o.designVersion,o.run,o.actor,o.at,o.reason,JSON.stringify(o.value)]),'Historial íntegro de datos brutos');
    }
    function analysisPanel(){const a=currentAnalysis();
        let html=heading('06 · Analizar','OLS y ANOVA de sumas de cuadrados parciales (tipo III). Todas las interacciones factoriales y, cuando corresponde, bloques fijos aditivos.','motor Python');
        html+='<div class="ws-actions"><button class="ws-primary" data-action="analyze"'+(!health?' disabled':'')+'>Calcular con Python</button><button data-action="connection">Conexión del motor</button></div>';
        if(!health)html+='<p class="ws-warning">El motor Python no está conectado. Guardado, ejecución y documentación siguen disponibles; no se calculan estadísticas en JavaScript.</p>';
        if(!a)return html+'<p>No hay análisis guardados para este experimento. Completa las corridas y ejecuta el cálculo.</p>';
        if(a.fingerprint!==M.fingerprint(experiment))html+='<p class="ws-warning">Análisis histórico: pertenece a otra versión del diseño o de los datos. Recalcula para utilizar el dataset actual.</p>';
        const result=a.result,s=result.summary;
        html+='<p class="ws-origin">Motor '+esc(result.engine)+' · análisis v'+a.version+' · diseño v'+result.design_version+' · dataset v'+result.dataset_version+'</p>'+
            '<div class="ws-metrics">'+[['n',s.n],['R²',s.r2],['R² ajustado',s.r2_adjusted],['RMSE ('+a.input.design.responseUnit+')',s.rmse],['p modelo',s.p],['GL error',s.df_error]].map(([label,v])=>'<div><span>'+esc(label)+'</span><strong>'+fmt(v)+'</strong></div>').join('')+'</div>'+
            '<div class="ws-subnav">'+[['summary','Resumen'],['anova','ANOVA'],['coefficients','Coeficientes'],['effects','Efectos'],['diagnostics','Diagnóstico']].map(([v,l])=>'<button data-analysis-tab="'+v+'" aria-pressed="'+(analysisTab===v)+'">'+l+'</button>').join('')+'</div>';
        if(analysisTab==='summary')html+='<div class="ws-equation">'+esc(result.equation_coded)+'</div>'+(result.equation_real?'<h2>Ecuación en unidades reales</h2><div class="ws-equation">'+esc(result.equation_real)+'</div>'+table(['Variable','Factor','Unidad'],result.real_variables.map(v=>[v.variable,v.name,v.unit])):'')+table(['Código','Factor','−1','+1','Unidad'],result.factors.map(f=>[f.code,f.name,...f.levels,f.unit]));
        if(analysisTab==='anova')html+='<p>'+esc(result.anova_type)+'</p>'+table(['Término','SC','GL','CM','F','p'],result.anova.map(r=>[r.term,fmt(r.ss),r.df,fmt(r.ms),fmt(r.f),fmt(r.p)]),'ANOVA parcial; las SC pueden no sumar en datos desbalanceados');
        if(analysisTab==='coefficients'||analysisTab==='effects')html+=table(['Término','β','Error estándar','IC 95 % inferior','IC 95 % superior','t','p','Efecto = 2β'],result.coefficients.map(c=>[c.term,fmt(c.estimate),fmt(c.se),fmt(c.ci_low),fmt(c.ci_high),fmt(c.t),fmt(c.p),c.effect===null?'—':fmt(c.effect)]),'Coeficientes codificados; efectos en unidades de la respuesta');
        if(analysisTab==='diagnostics')html+=table(['Corrida','Observado','Ajustado','Residuo','Leverage','Cook','Revisar'],result.diagnostics.map(d=>[d.run,fmt(d.observed),fmt(d.fitted),fmt(d.residual),fmt(d.leverage),fmt(d.cooks),d.influential?'Cook > 4/n':'—']),'No se elimina ninguna observación automáticamente');
        if(mode==='advanced')html+=table(result.model_matrix.columns,result.model_matrix.rows,'Matriz del modelo efectivamente ajustado · origen Python');
        const keys=Object.keys(result.charts||{});if(!keys.includes(activeChart))activeChart=keys[0];
        html+='<h2>Figura vinculada a este análisis</h2><div class="ws-fields">'+select('chart','Gráfica',keys.map(key=>[key,result.charts[key].layout.title.text]),activeChart)+'</div><div id="ws-chart" class="ws-chart"></div><div class="ws-actions">'+['png','svg','pdf'].map(format=>'<button data-figure="'+format+'">Exportar '+format.toUpperCase()+'</button>').join('')+select('dpi','Resolución',[[300,'300 dpi'],[600,'600 dpi']],300)+'</div>'+
            result.warnings.map(w=>'<p class="ws-warning">'+esc(w)+'</p>').join('')+
            table(['Corrida omitida','Motivo'],result.skipped.map(r=>[r.run,r.reason]),'Selección de datos del cálculo')+
            '<details><summary>Procedencia verificable</summary><pre class="ws-pre">'+esc(JSON.stringify({engine:result.engine,versions:result.versions,input_sha256:result.input_sha256,at:result.calculated_at},null,2))+'</pre></details>';
        return html;
    }
    function predictionPanel(){const a=currentAnalysis();let html=heading('07 · Predecir','Predicción dentro del dominio, con intervalo de confianza de la media e intervalo de predicción individual al 95 %.','motor Python');
        if(!a||a.fingerprint!==M.fingerprint(experiment))return html+'<p class="ws-warning">Primero calcula un modelo con la versión actual de los datos.</p>';
        return html+'<form data-form="predict"><div class="ws-fields">'+a.result.factors.map((f,i)=>f.type==='category'?select('value'+i,f.name,f.levels.map(v=>[v,v]),f.levels[0]):field('value'+i,f.name+' ('+f.unit+') · dominio '+f.levels.join(' a '),f.levels[0])).join('')+
            (base().plan.data.blocking==='replicate'?field('block','Bloque observado',1,'number'):'')+'</div><button class="ws-primary"'+(!health?' disabled':'')+'>Calcular predicción</button></form><div id="ws-prediction">'+predictionHistory()+'</div><p class="ws-warning">La predicción no sustituye una corrida de confirmación. No se permite extrapolar fuera de los niveles estudiados.</p>';
    }
    function predictionHistory(){return table(['Versión','Análisis','Valores de factores','Media','IC 95 % media','IP 95 % observación'],experiment.predictions.map(p=>[p.version,p.analysisVersion,p.result.values.join(' / '),fmt(p.result.mean),p.result.mean_ci.map(fmt).join(' a '),p.result.prediction_interval.map(fmt).join(' a ')]),'Predicciones conservadas · origen Python');}
    function reportPanel(){return heading('10 · Informar','Documenta conclusiones y exporta el expediente con datos originales, decisiones, versiones y resultados calculados.')+
        '<form data-form="report"><div class="ws-fields">'+field('conclusion','Conclusiones del investigador','','textarea',true)+field('limits','Límites, incidencias y próximos ensayos','','textarea',true)+'</div>'+reason()+'<button class="ws-primary">Guardar versión de informe</button></form><div class="ws-actions"><button data-action="report-html">Descargar informe HTML</button><button data-action="export">Exportar expediente JSON</button></div>'+
        table(['Versión','Fecha','Responsable','Conclusiones'],experiment.reports.map(r=>[r.version,r.at,r.actor,r.conclusion]),'Informes conservados')+
        table(['Evento','Origen','Fecha','Responsable','Razón'],experiment.history.map(h=>[h.type,h.source,h.at,h.actor,h.reason]),'Historial de decisiones')+
        '<p class="ws-warning">El historial local es trazabilidad de trabajo, no una auditoría inviolable. Persistencia de servidor, autenticación, firmas y control de acceso requieren una fase posterior.</p>';
    }
    function render(){if(stage==='list'||!experiment){list();return;}status();mentor();
        document.querySelectorAll('[data-stage]').forEach(b=>{if(b.dataset.stage===stage)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
        content.innerHTML=({define:definition,model:modeling,design:designing,execute:execution,data:dataPanel,analyze:analysisPanel,predict:predictionPanel,report:reportPanel}[stage]||definition)();
        if(stage==='analyze'&&currentAnalysis())draw();
    }
    async function draw(){const a=currentAnalysis(),target=$('#ws-chart');if(!a||!target)return;
        try{
            if(!window.Plotly){if(!health)throw Error('Conecta Python para cargar la visualización interactiva de este resultado guardado.');await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=api+'/plotly.js';script.onload=resolve;script.onerror=()=>reject(Error('No se pudo cargar Plotly desde el motor.'));document.head.appendChild(script);});}
            if(target!==$('#ws-chart'))return;const chart=a.result.charts[activeChart];if(chart)await Plotly.newPlot(target,chart.data,chart.layout,{responsive:true,displaylogo:false,modeBarButtonsToRemove:['toImage']});
        }catch(err){target.textContent=err.message;}
    }
    function connectionPanel(){content.innerHTML=heading('Conexión del motor','En uso local, abre este workspace desde el servicio FastAPI. En el alojamiento estático, el análisis permanecerá inactivo hasta configurar un servicio compatible.')+
        '<form data-form="connection"><div class="ws-fields">'+field('url','URL base de API',api)+'</div><p>Al pulsar Calcular se enviarán el diseño y las mediciones al servicio configurado. Usa un servidor de confianza.</p><button>Guardar y comprobar conexión</button></form>';
    }
    function reportHTML(){const r=experiment.reports.at(-1),snapshot=r?.snapshot,a=snapshot?snapshot.analysis:currentAnalysis(),reportPlan=snapshot?snapshot.plan:base().plan,reportMeta=snapshot?snapshot.metadata:experiment.metadata,reportKey=snapshot?snapshot.fingerprint:M.fingerprint(experiment);return '<!doctype html><html lang="es"><meta charset="utf-8"><title>'+esc(experiment.id)+'</title><style>body{font:14px Arial;max-width:1100px;margin:35px auto;color:#202728}table{border-collapse:collapse;width:100%;font-size:12px}td,th{padding:8px;border:1px solid #ccc;text-align:left}pre{white-space:pre-wrap}h1{color:#007e74}</style><h1>'+esc(reportMeta.name)+'</h1><p>'+esc(experiment.id)+' · '+esc(reportMeta.organization)+'</p><pre>'+esc(JSON.stringify(reportMeta,null,2))+'</pre><h2>Protocolo y diseño</h2><pre>'+esc(D.protocol(reportPlan).replace('Este asistente no calcula significancia, ANOVA ni potencia;','El diseñador público no calcula inferencia; el workspace incorpora OLS y ANOVA mediante Python. No se calcula potencia;'))+'</pre><h2>Conclusiones del investigador</h2><p>'+esc(r?.conclusion||'Pendientes')+'</p><p>'+esc(r?.limits||'')+'</p>'+(a?'<h2>Análisis v'+a.version+'</h2><p>'+esc(a.fingerprint===reportKey?'Modelo del dataset actual':'Modelo histórico; no corresponde al dataset actual')+'</p><pre>'+esc(a.result.equation_coded)+'</pre>'+table(['Término','β','EE','p'],a.result.coefficients.map(c=>[c.term,c.estimate,c.se,c.p]))+table(['Término','SC','GL','CM','F','p'],a.result.anova.map(c=>[c.term,c.ss,c.df,c.ms,c.f,c.p]))+'<pre>'+esc(JSON.stringify({summary:a.result.summary,engine:a.result.engine,input_sha256:a.result.input_sha256,warnings:a.result.warnings},null,2))+'</pre>':'<p>No existe análisis estadístico calculado.</p>')+'<h2>Datos incluidos en el informe</h2>'+table(['Corrida','Estado','Respuesta directa','Lecturas','Exclusión'],(snapshot?snapshot.dataset:M.dataset(experiment)).map(d=>[d.run,d.status,d.result,d.raw?.join(' / '),d.exclusion?.excluded?d.exclusion.reason:'No']))+'<h2>Trazabilidad</h2>'+table(['Fecha','Origen','Responsable','Acción','Razón'],(snapshot?snapshot.history:experiment.history).map(h=>[h.at,h.source,h.actor,h.type,h.reason]))+'<p>Exporta también el expediente JSON: conserva las revisiones de datos y los resultados completos. Historial local sin certificación de identidad.</p></html>';}
    document.addEventListener('click',async event=>{
        const button=event.target.closest('button');if(!button)return;
        try{
            if(button.dataset.stage){if(dirty&&!confirm('Hay cambios sin guardar. ¿Descartarlos y cambiar de etapa?'))return;dirty=false;stage=button.dataset.stage;render();content.focus();}
            if(button.dataset.open){open(button.dataset.open);}
            if(button.dataset.analysisTab){analysisTab=button.dataset.analysisTab;render();}
            const action=button.dataset.action;
            if(action==='connection'){if(dirty&&!confirm('¿Descartar cambios sin guardar y configurar la conexión?'))return;dirty=false;connectionPanel();}
            if(action==='import')$('#ws-import').click();
            if(action==='export')$('#ws-export').click();
            if(action==='matrix-csv')download('matriz-'+experiment.id+'.csv',D.designCsv(base().plan),'text/csv');
            if(action==='records-csv')download('datos-'+experiment.id+'.csv',M.csv(experiment),'text/csv');
            if(action==='report-html')download('informe-'+experiment.id+'.html',reportHTML(),'text/html');
            if(action==='verify'){
                const experimentId=experiment.id,version=base().version;button.disabled=true;const result=await call('/design',base().plan.data);
                if(experiment.id!==experimentId||base().version!==version)throw Error('El diseño cambió durante la verificación.');
                if(result.runs.length!==base().plan.rows.length||result.runs.some((r,i)=>JSON.stringify(r.values)!==JSON.stringify(base().plan.rows[i]?.values)||r.condition!==base().plan.rows[i]?.condition||r.replica!==base().plan.rows[i]?.replica||r.block!==base().plan.rows[i]?.block))throw Error('El motor y la matriz local no coinciden. Conserva el diseño y revisa las versiones.');
                commit(e=>{M.event(e,'verificar diseño',e.metadata.actor,'Coincidencia con el motor Python','motor');M.latestDesign(e).verification=result;});
            }
            if(action==='analyze'){
                button.disabled=true;message('Calculando con Python…');const experimentId=experiment.id,key=M.fingerprint(experiment),input=M.request(experiment),result=await call('/analyze',input);if(experiment.id!==experimentId)throw Error('Cambió el expediente abierto durante el cálculo.');
                commit(e=>M.addAnalysis(e,result,input,e.metadata.actor,'OLS factorial completo; ANOVA parcial tipo III',key));
            }
            if(button.dataset.figure){button.disabled=true;const a=currentAnalysis(),dpi=$('[name="dpi"]').value;const response=await fetch(api+'/figure/'+encodeURIComponent(activeChart)+'?format='+button.dataset.figure+'&dpi='+dpi,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(a.input),signal:AbortSignal.timeout(60000)});if(!response.ok)throw Error('No se pudo exportar la figura con Python.');download('hvt-'+activeChart+'.'+button.dataset.figure,await response.blob(),response.headers.get('Content-Type'));}
        }catch(err){message(err.message);}finally{if(button.dataset.action==='analyze'||button.dataset.action==='verify'||button.dataset.figure)button.disabled=!health;}
    });
    content.addEventListener('input',event=>{if(event.target.closest('form'))dirty=true;});
    content.addEventListener('change',event=>{
        const el=event.target;if(el.closest('form'))dirty=true;
        if(el.name==='factorCount')content.querySelectorAll('[data-factor-group]').forEach(g=>{g.hidden=Number(g.dataset.factorGroup)>Number(el.value);});
        if(el.name==='chooseRun'){if(dirty&&!confirm('¿Descartar cambios sin guardar de esta corrida?')){el.value=selectedRun;return;}selectedRun=Number(el.value);dirty=false;render();}
        if(el.name==='chart'){activeChart=el.value;draw();}
    });
    content.addEventListener('submit',async event=>{
        const form=event.target;if(!form.dataset.form)return;event.preventDefault();const v=values(form);try{
            switch(form.dataset.form){
                case 'define':commit(e=>{const data={...M.latestDesign(e).plan.data,experiment:v.name,question:v.question,hypothesis:v.hypothesis,response:v.response,responseUnit:v.responseUnit,experimentalUnit:v.experimentalUnit};const errors=D.validate(data);if(errors.length)throw Error(errors[0].message);if(JSON.stringify(data)!==JSON.stringify(M.latestDesign(e).plan.data))M.reviseDesign(e,D.generate(data),v.actor,v.reason);M.metadata(e,{name:v.name,project:v.project,organization:v.organization,actor:v.actor,status:v.status},v.actor,v.reason);});break;
                case 'protocol':case 'model':case 'design':commit(e=>{const {actor,reason,...changes}=v;const data={...M.latestDesign(e).plan.data,...changes};const errors=D.validate(data);if(errors.length)throw Error(errors[0].message);M.reviseDesign(e,D.generate(data),actor,reason);});break;
                case 'record':commit(e=>{const old=M.dataset(e).find(r=>r.run===selectedRun),d=M.latestDesign(e).plan.data;const row={...old,unitId:v.unitId,date:v.date,status:v.status,executionOrder:v.executionOrder,note:v.note,actual:old.values.map((_,i)=>v['actual'+i]||''),raw:Array.from({length:Number(d.rawCount||0)},(_,i)=>v['raw'+i]||''),result:v.result??old.result};for(const x of [...row.raw,...(d.calculation!=='difference'?[row.result]:[])])if(x!==''&&!Number.isFinite(D.numeric(x)))throw Error('Las mediciones deben ser números válidos.');row.actual.forEach((x,i)=>{if(x!==''&&M.latestDesign(e).plan.factors[i].type==='numeric'&&!Number.isFinite(D.numeric(x)))throw Error('Condición real numérica inválida.');});M.record(e,row,v.actor,v.reason);});break;
                case 'exclude':commit(e=>M.exclude(e,selectedRun,v.excluded==='true',v.actor,v.reason));break;
                case 'log':commit(e=>{M.event(e,'bitácora',v.actor,v.reason);const entry={...v,at:new Date().toISOString(),source:'investigador',designVersion:M.latestDesign(e).version};e.logbook.push(entry);if(v.equipment)e.equipment.push(entry);});break;
                case 'report':commit(e=>{if(!v.conclusion.trim())throw Error('Escribe las conclusiones del investigador.');M.event(e,'informe',v.actor,v.reason);e.reports.push({...v,version:e.reports.length+1,at:new Date().toISOString(),source:'investigador',designVersion:M.latestDesign(e).version,datasetVersion:e.raw.length+e.decisions.length,analysisVersion:e.analyses.at(-1)?.version??null,snapshot:{metadata:M.clone(e.metadata),plan:M.clone(M.latestDesign(e).plan),dataset:M.dataset(e),analysis:M.clone(e.analyses.at(-1)||null),fingerprint:M.fingerprint(e),history:M.clone(e.history)}});});break;
                case 'predict':{const experimentId=experiment.id,key=M.fingerprint(experiment),input=M.request(experiment),analysisVersion=currentAnalysis().version;const result=await call('/predict',{analysis:input,values:base().plan.factors.map((_,i)=>v['value'+i]),block:v.block?Number(v.block):null});if(experiment.id!==experimentId||key!==M.fingerprint(experiment))throw Error('Los datos cambiaron durante la predicción.');commit(e=>{M.event(e,'predicción',e.metadata.actor,'Predicción dentro del dominio','motor');e.predictions.push({version:e.predictions.length+1,analysisVersion,at:new Date().toISOString(),input,result,source:'motor'});});break;}
                case 'connection':{const url=v.url.replace(/\/$/,'');if(!/^\/api\/v1$/.test(url)&&!/^https:\/\/[^\s]+\/api\/v1$/.test(url)&&!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/api\/v1$/.test(url))throw Error('Usa /api/v1, HTTPS o una dirección local de API.');api=url;localStorage.setItem('hvt-engine-url',api);await connect();dirty=false;message(health?'Motor conectado.':'Motor sin conexión; comprueba que FastAPI está iniciado.');render();break;}
            }
        }catch(err){message(err.message);}
    });
    $('#ws-open').addEventListener('click',()=>{if(dirty&&!confirm('¿Descartar cambios sin guardar y abrir los expedientes?'))return;dirty=false;list();});
    $('#ws-export').addEventListener('click',()=>{if(experiment)download(experiment.id+'.json',JSON.stringify(pendingRecovery||experiment,null,2));});
    $('#ws-import').addEventListener('change',async event=>{try{const file=event.target.files[0];if(!file)return;if(file.size>20_000_000)throw Error('El archivo supera 20 MB.');const parsed=JSON.parse(await file.text());M.valid(parsed);for(const d of parsed.designs){const errors=D.validate(d.plan.data);if(errors.length)throw Error('Diseño importado inválido: '+errors[0].message);}const e=repo.import(JSON.stringify(parsed));open(e.id);}catch(err){message(err.message);}finally{event.target.value='';}});
    $('#ws-mode').addEventListener('change',event=>{if(dirty&&!confirm('¿Descartar cambios sin guardar y cambiar de modo?')){event.target.value=mode;return;}mode=event.target.value;dirty=false;document.body.classList.toggle('ws-hide-mentor',mode==='advanced');$('#ws-mentor-toggle').setAttribute('aria-expanded',String(mode!=='advanced'));render();});
    $('#ws-nav-toggle').addEventListener('click',()=>{const small=matchMedia('(max-width:700px)').matches;document.body.classList.toggle(small?'ws-show-nav':'ws-hide-nav');$('#ws-nav-toggle').setAttribute('aria-expanded',String(small?document.body.classList.contains('ws-show-nav'):!document.body.classList.contains('ws-hide-nav')));});
    $('#ws-mentor-toggle').addEventListener('click',()=>{const small=matchMedia('(max-width:1050px)').matches;document.body.classList.toggle(small?'ws-show-mentor':'ws-hide-mentor');if(small)document.body.classList.remove('ws-hide-mentor');$('#ws-mentor-toggle').setAttribute('aria-expanded',String(small?document.body.classList.contains('ws-show-mentor'):!document.body.classList.contains('ws-hide-mentor')));});
    window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
    window.addEventListener('storage',event=>{if(experiment&&event.key==='hvt-experiment-v1:'+experiment.id)message('Este expediente cambió en otra pestaña. Exporta los cambios pendientes y vuelve a abrirlo antes de guardar.');});
    $('#ws-nav-toggle').setAttribute('aria-expanded',String(!matchMedia('(max-width:700px)').matches));$('#ws-mentor-toggle').setAttribute('aria-expanded',String(!matchMedia('(max-width:1050px)').matches));
    try{const id=new URLSearchParams(location.search).get('experiment');if(id&&repo)open(id);else list();}catch(err){message(err.message);list();}
    await connect();if(experiment&&!dirty)render();
})();
