(function(root){
    'use strict';
    function review(e,stage){
        if(!e)return [{title:'Empieza por el experimento',text:'Crea un diseño en la página pública o abre un expediente local.',source:'Mentor · regla contextual'}];
        const M=root.HVTExperiment,d=M.latestDesign(e),rows=M.dataset(e),notes=[];
        const add=(title,text)=>notes.push({title,text,source:'Mentor · regla contextual'});
        if(!e.metadata.project||!e.metadata.actor||e.metadata.actor==='Investigador local')add('Completa la identificación','Indica proyecto y responsable antes de ejecutar; el nombre escrito no equivale a una identidad autenticada.');
        if(stage==='model'||stage==='define') {
            add('Asignación de factores','Comprueba que puedes asignar cada nivel a unidades independientes. Si el factor describe un lote preexistente, revisa si corresponde tratarlo como bloque.');
            add('Unidad experimental',d.plan.data.experimentalUnit);
        }
        if(stage==='execute'||stage==='data') {
            const changed=rows.filter(r=>r.executionOrder&&Number(r.executionOrder)!==r.run);
            if(changed.length)add('Cambios en el orden',changed.length+' corridas tienen un orden real distinto del plan. Documenta la causa en la bitácora; conserva ambas secuencias.');
            if(rows.some(r=>r.status==='done'&&!r.date))add('Fecha de ejecución pendiente','Hay corridas realizadas sin fecha/hora registrada. Completa su trazabilidad.');
            if(rows.some(r=>r.exclusion?.excluded))add('Exclusiones documentadas','Los datos originales permanecen en el expediente. La exclusión solo afecta a la selección del análisis.');
        }
        const a=e.analyses.at(-1);
        if(a&&(stage==='analyze'||stage==='predict')) {
            if(a.fingerprint!==M.fingerprint(e))add('Modelo de una versión anterior','El diseño o los datos cambiaron. Recalcula antes de utilizar este modelo para nuevas decisiones.');
            const interactions=a.result.coefficients.filter(c=>/^[A-D]{2,4}$/.test(c.term)&&c.p!==null&&c.p<.05);
            if(interactions.length)add('Interacciones que requieren atención',interactions.map(c=>c.term).join(', ')+': p < 0,05 según Python, sin ajuste múltiple. Interpreta sus efectos principales junto a estas interacciones.');
            const influential=a.result.diagnostics.filter(d=>d.influential);
            if(influential.length)add('Observaciones para revisar','Corridas '+influential.map(d=>d.run).join(', ')+': Cook > 4/n según el motor. Revisa causas e instrumentos; este criterio no ordena excluir datos.');
        }
        if(!notes.length)add('Reproducibilidad','Conserva la semilla, las versiones y el protocolo. Exporta el expediente: el almacenamiento de este MVP pertenece a este navegador.');
        return notes;
    }
    root.HVTMentor={review};if(typeof module!=='undefined')module.exports={review};
})(typeof window!=='undefined'?window:globalThis);
