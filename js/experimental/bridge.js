(function(){
    'use strict';
    const button=document.querySelector('[data-workspace-open]');if(!button)return;
    button.addEventListener('click',()=>{
        const status=document.querySelector('[data-workspace-status]');
        try{
            const plan=window.HVTDOE.currentPlan();if(!plan)throw Error('Genera primero el plan experimental.');
            if(window.HVTDOE.isStale())throw Error('Actualiza el plan antes de abrirlo en el workspace.');
            const e=window.HVTExperiment.create(plan);
            window.HVTRepository(localStorage).save(e);
            location.assign('/laboratorio/workspace/?experiment='+encodeURIComponent(e.id));
        }catch(error){status.textContent=error.message;}
    });
})();
