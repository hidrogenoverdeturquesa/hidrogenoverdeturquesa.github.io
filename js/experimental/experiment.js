(function(root){
    'use strict';
    const clone=value=>JSON.parse(JSON.stringify(value));
    const now=()=>new Date().toISOString();
    function cleanPlan(plan){const p=clone(plan);p.rows.forEach(r=>Object.assign(r,{result:'',note:'',unitId:'',date:'',status:'pending',executionOrder:'',actual:p.factors.map(()=>''),raw:Array(Number(p.data.rawCount||0)).fill('')}));return p;}
    const stages=['borrador','en diseño','aprobado','en ejecución','datos completos','en análisis','validación','cerrado','archivado'];
    const id=()=> 'EXP-HVT-'+new Date().toISOString().slice(0,10).replace(/-/g,'')+'-'+root.crypto.randomUUID().slice(0,8).toUpperCase();
    function event(e,type,actor,reason,source='investigador',details={}) {
        if(!String(actor||'').trim()||!String(reason||'').trim())throw Error('Indica responsable y razón del cambio.');
        e.history.push({sequence:e.history.length+1,type,actor,reason,source,at:now(),...clone(details)});
        e.revision++;e.updatedAt=now();
    }
    function create(plan,meta={}) {
        if(!plan||!plan.data||!Array.isArray(plan.rows))throw Error('Primero genera un diseño válido.');
        const e={schemaVersion:1,id:id(),revision:0,createdAt:now(),updatedAt:now(),status:'en diseño',
            metadata:{name:plan.data.experiment,project:'',actor:'Investigador local',organization:'HVT',...meta},metadataHistory:[],
            designs:[],raw:[],decisions:[],analyses:[],predictions:[],reports:[],logbook:[],equipment:[],evidence:[],references:[],history:[]};
        e.designs.push({version:1,at:now(),actor:e.metadata.actor,reason:'Importación del diseñador existente',source:'diseñador local JavaScript',plan:cleanPlan(plan)});
        e.metadataHistory.push({version:1,at:now(),value:clone(e.metadata)});
        event(e,'crear',e.metadata.actor,'Experimento creado desde el diseñador HVT');
        for(const row of plan.rows)if(row.result!==''||row.raw?.some(v=>v!=='')||row.actual?.some(v=>v!=='')||row.note||row.unitId||row.date||row.executionOrder||row.status!=='pending') {
            e.raw.push({id:e.raw.length+1,designVersion:1,run:row.run,at:now(),actor:e.metadata.actor,reason:'Registro importado del diseñador',source:'investigador',value:clone(row)});
        }
        return e;
    }
    function latestDesign(e){return e.designs[e.designs.length-1];}
    function dataset(e,version=latestDesign(e).version) {
        const design=e.designs.find(d=>d.version===version);if(!design)throw Error('Versión de diseño inexistente.');
        return design.plan.rows.map(original=>{
            const revision=e.raw.filter(r=>r.designVersion===version&&r.run===original.run).at(-1);
            const decision=e.decisions.filter(r=>r.designVersion===version&&r.run===original.run).at(-1);
            return {...clone(original),...(revision?clone(revision.value):{}),exclusion:decision?clone(decision):null};
        });
    }
    function reviseDesign(e,plan,actor,reason) {
        event(e,'diseño',actor,reason,'investigador',{previousVersion:latestDesign(e).version});
        e.designs.push({version:e.designs.length+1,at:now(),actor,reason,source:'diseñador local JavaScript',plan:cleanPlan(plan)});
        e.status='en diseño';
    }
    function record(e,row,actor,reason) {
        const d=latestDesign(e);
        if(!d.plan.rows.some(r=>r.run===row.run))throw Error('Corrida desconocida.');
        const value=clone(row);delete value.exclusion;
        if(value.status==='excluded')throw Error('Para excluir un dato utiliza la decisión de exclusión documentada.');
        if(value.executionOrder!==''&&value.executionOrder!==undefined&&(!Number.isInteger(Number(value.executionOrder))||Number(value.executionOrder)<1))throw Error('El orden real debe ser un entero positivo.');
        if(value.executionOrder) {
            value.executionOrder=Number(value.executionOrder);
            if(dataset(e).some(r=>r.run!==value.run&&r.executionOrder===value.executionOrder))throw Error('Ese orden real ya corresponde a otra corrida.');
        }
        event(e,'datos',actor,reason,'investigador',{run:row.run,designVersion:d.version});
        e.raw.push({id:e.raw.length+1,designVersion:d.version,run:row.run,at:now(),actor,reason,source:'investigador',value});
    }
    function exclude(e,run,excluded,actor,reason) {
        if(!latestDesign(e).plan.rows.some(r=>r.run===run))throw Error('Corrida desconocida.');
        event(e,'exclusión',actor,reason,'investigador',{run,excluded});
        e.decisions.push({designVersion:latestDesign(e).version,run,excluded,actor,reason,at:now(),source:'investigador'});
    }
    function metadata(e,value,actor,reason) {
        if(!stages.includes(value.status))throw Error('Estado desconocido.');
        event(e,'metadatos',actor,reason);
        const {status,...meta}=value;e.status=status;e.metadata={...e.metadata,...meta};
        e.metadataHistory.push({version:e.metadataHistory.length+1,at:now(),actor,reason,value:clone(e.metadata),status});
    }
    function fingerprint(e){return JSON.stringify({design:latestDesign(e).version,raw:e.raw.length,decisions:e.decisions.length});}
    function request(e) {return {design:clone(latestDesign(e).plan.data),observations:dataset(e),design_version:latestDesign(e).version,dataset_version:e.raw.length+e.decisions.length};}
    function addAnalysis(e,result,input,actor,reason,expected) {
        if(fingerprint(e)!==expected)throw Error('Los datos cambiaron durante el cálculo. Repite el análisis con la versión actual.');
        event(e,'análisis',actor,reason,'motor',{engine:result.engine,input_sha256:result.input_sha256});
        e.analyses.push({version:e.analyses.length+1,at:now(),actor,source:'motor',fingerprint:expected,input:clone(input),result:clone(result)});
        e.status='en análisis';
    }
    function csv(e){
        const d=latestDesign(e),data=d.plan.data,analysis=e.analyses.at(-1);
        const calculated=analysis?.fingerprint===fingerprint(e)?analysis.result.diagnostics:[];
        const head=['Experimento','Diseño','Dataset','Orden planificado','Orden real','Combinación','Réplica','Bloque','Unidad experimental','Fecha/hora local','Estado',...d.plan.factors.map(f=>'Plan: '+f.name+' ('+f.unit+')'),...d.plan.factors.map(f=>'Real: '+f.name+' ('+f.unit+')'),...Array.from({length:Number(data.rawCount||0)},(_,i)=>data['rawName'+(i+1)]+' ('+data['rawUnit'+(i+1)]+')'),data.response+' ('+data.responseUnit+')','Origen de respuesta','Excluida','Razón exclusión','Responsable exclusión','Fecha exclusión','Revisión de medición','Responsable medición','Razón medición','Observaciones'];
        const rows=dataset(e).map(r=>{const raw=e.raw.filter(v=>v.designVersion===d.version&&v.run===r.run).at(-1);const response=data.calculation==='difference'?calculated.find(v=>v.run===r.run)?.observed??'':r.result;return[e.id,d.version,e.raw.length+e.decisions.length,r.run,r.executionOrder??'',r.condition,r.replica,r.block,r.unitId,r.date,r.status,...r.values,...r.actual,...r.raw,response,data.calculation==='difference'?(response===''?'Pendiente de cálculo Python':'motor Python'):'investigador',r.exclusion?.excluded?'Sí':'No',r.exclusion?.reason??'',r.exclusion?.actor??'',r.exclusion?.at??'',raw?.id??'',raw?.actor??'',raw?.reason??'',r.note];});
        const cell=value=>{let s=String(value??'');if(/^[\s]*[=+@-]/.test(s)&&!/^\s*[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:e[+-]?\d+)?\s*$/i.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
        return '\ufeff'+[head,...rows].map(row=>row.map(cell).join(',')).join('\r\n');
    }
    function valid(e) {
        if(!e||e.schemaVersion!==1||!/^EXP-HVT-[A-Z0-9-]+$/.test(e.id)||!Number.isInteger(e.revision)||e.revision<1||!e.metadata||typeof e.metadata.name!=='string'||!Number.isFinite(Date.parse(e.updatedAt))||!stages.includes(e.status))throw Error('Archivo de experimento incompatible.');
        for(const key of ['designs','raw','decisions','analyses','predictions','reports','history','logbook','equipment','metadataHistory'])if(!Array.isArray(e[key]))throw Error('Falta la colección '+key+'.');
        if(!e.designs.length||e.designs.length>100||e.raw.length>20000)throw Error('Tamaño de experimento no admitido.');
        e.designs.forEach((d,i)=>{
            if(d.version!==i+1||!d.plan?.data||!Array.isArray(d.plan.rows)||d.plan.rows.length>160)throw Error('Versión de diseño inválida.');
            if(root.HVTDOE){const expected=root.HVTDOE.generate(d.plan.data);const signature=p=>JSON.stringify({factors:p.factors,rows:p.rows.map(r=>[r.run,r.condition,r.replica,r.block,r.values])});if(signature(expected)!==signature(d.plan))throw Error('La matriz importada no coincide con sus factores, réplicas y semilla.');}
        });
        for(const r of e.raw)if(!e.designs[r.designVersion-1]?.plan.rows.some(row=>row.run===r.run)||!r.value||r.value.run!==r.run||!Array.isArray(r.value.raw)||!Array.isArray(r.value.actual)||!['pending','done','excluded'].includes(r.value.status))throw Error('Un registro no corresponde a su diseño.');
        for(const r of e.decisions)if(!e.designs[r.designVersion-1]?.plan.rows.some(row=>row.run===r.run)||typeof r.excluded!=='boolean'||!r.actor||!r.reason||!Number.isFinite(Date.parse(r.at)))throw Error('Decisión de exclusión incompleta.');
        return e;
    }
    const api={clone,create,latestDesign,dataset,reviseDesign,record,exclude,metadata,fingerprint,request,addAnalysis,event,valid,stages,csv};
    root.HVTExperiment=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
