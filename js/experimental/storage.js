(function(root){
    'use strict';
    const prefix='hvt-experiment-v1:';
    function repository(storage) {
        return {
            list(){const list=[];for(let i=0;i<storage.length;i++){const key=storage.key(i);if(key.startsWith(prefix)){try{const e=JSON.parse(storage.getItem(key));list.push({id:e.id,name:e.metadata.name,status:e.status,updatedAt:e.updatedAt});}catch(_){/* Corrupt entries are retained for recovery. */}}}return list.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));},
            get(id){const raw=storage.getItem(prefix+id);if(!raw)throw Error('Experimento no encontrado en este navegador.');return root.HVTExperiment.valid(JSON.parse(raw));},
            save(experiment,expectedRevision=null){
                root.HVTExperiment.valid(experiment);
                const key=prefix+experiment.id,existing=storage.getItem(key);
                if(existing){if(expectedRevision===null||JSON.parse(existing).revision!==expectedRevision)throw Error('El experimento cambió en otra pestaña o ya existe. Exporta tu trabajo y vuelve a abrirlo antes de guardar.');}
                else if(expectedRevision!==null)throw Error('El experimento ya no está almacenado. Exporta una copia antes de continuar.');
                const json=JSON.stringify(experiment);if(json.length>20_000_000)throw Error('El expediente supera el límite local de 20 MB.');
                try{storage.setItem(key,json);}catch(_){throw Error('No se pudo guardar: almacenamiento bloqueado o sin espacio. Exporta el expediente JSON.');}
            },
            import(text){if(text.length>20_000_000)throw Error('El archivo supera 20 MB.');const e=root.HVTExperiment.valid(JSON.parse(text));this.save(e);return e;}
        };
    }
    root.HVTRepository=repository;if(typeof module!=='undefined')module.exports=repository;
})(typeof window!=='undefined'?window:globalThis);
