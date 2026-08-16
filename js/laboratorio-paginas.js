(function () {
    'use strict';

    const numberFormat = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });

    function escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, function (character) {
            return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[character];
        });
    }

    function downloadFile(name, content, type) {
        const url = URL.createObjectURL(new Blob([content], { type:type }));
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = name;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }

    function seededRandom(seed) {
        let value = seed >>> 0;
        return function () {
            value += 0x6D2B79F5;
            let result = value;
            result = Math.imul(result ^ result >>> 15, result | 1);
            result ^= result + Math.imul(result ^ result >>> 7, result | 61);
            return ((result ^ result >>> 14) >>> 0) / 4294967296;
        };
    }

    function shuffle(values, random) {
        for (let index = values.length - 1; index > 0; index -= 1) {
            const swapIndex = Math.floor(random() * (index + 1));
            const current = values[index];
            values[index] = values[swapIndex];
            values[swapIndex] = current;
        }
        return values;
    }

    const solarForm = document.querySelector('[data-hvt-solar-form]');
    if (solarForm) {
        let latestSolar = null;
        let automaticCalculation = false;
        const solarResults = document.querySelector('[data-hvt-solar-results]');
        const parameterNames = ['pv','hsp','pr','electrolyzer','hours','specific','water','days','price','baseline'];
        const query = new URLSearchParams(window.location.search);

        parameterNames.forEach(function (name) {
            if (query.has(name) && solarForm.elements[name]) solarForm.elements[name].value = query.get(name);
        });

        function solarScenario(input, kind) {
            const adjustment = kind === 'conservative' ? { sun:.85, pr:-.05, specific:1.05 } :
                (kind === 'favorable' ? { sun:1.15, pr:.03, specific:.95 } : { sun:1, pr:0, specific:1 });
            const performance = Math.max(.1, Math.min(1, input.pr + adjustment.pr));
            const solarEnergy = input.pv * input.hsp * adjustment.sun * performance;
            const electrolyzerLimit = input.electrolyzer * input.hours;
            const usefulEnergy = Math.min(solarEnergy, electrolyzerLimit);
            const specific = input.specific * adjustment.specific;
            const dailyHydrogen = usefulEnergy / specific;
            const annualHydrogen = dailyHydrogen * input.days;
            return {
                kind:kind,
                performance:performance,
                solarEnergy:solarEnergy,
                usefulEnergy:usefulEnergy,
                specific:specific,
                dailyHydrogen:dailyHydrogen,
                annualHydrogen:annualHydrogen,
                water:dailyHydrogen * input.water,
                utilization:electrolyzerLimit ? usefulEnergy / electrolyzerLimit * 100 : 0,
                electricityCost:input.price === null ? null : specific * input.price,
                avoided:input.baseline === null ? null : annualHydrogen * input.baseline
            };
        }

        function readNumber(name, optional) {
            const raw = solarForm.elements[name].value;
            return optional && raw === '' ? null : Number(raw);
        }

        function updateSolarUrl(input) {
            const next = new URL(window.location.href);
            parameterNames.forEach(function (name) {
                const value = input[name];
                if (value === null || value === '') next.searchParams.delete(name);
                else next.searchParams.set(name, value);
            });
            window.history.replaceState({}, '', next);
        }

        function renderSolar(input) {
            const scenarios = ['conservative','expected','favorable'].map(function (kind) { return solarScenario(input, kind); });
            const labels = { conservative:'Conservador', expected:'Esperado', favorable:'Favorable' };
            latestSolar = { model:'HVT-SOLAR-H2', version:'1.1', createdAt:new Date().toISOString(), inputs:input, scenarios:scenarios };
            solarResults.innerHTML = '<h2>Resultados del prediagnóstico</h2><div class="lab-results-grid">' + scenarios.map(function (scenario) {
                return '<article class="lab-result-card"><h3>' + labels[scenario.kind] + '</h3><dl>' +
                    '<div><dt>H₂ por día</dt><dd>' + numberFormat.format(scenario.dailyHydrogen) + ' kg</dd></div>' +
                    '<div><dt>H₂ por año</dt><dd>' + numberFormat.format(scenario.annualHydrogen) + ' kg</dd></div>' +
                    '<div><dt>Energía solar diaria</dt><dd>' + numberFormat.format(scenario.solarEnergy) + ' kWh</dd></div>' +
                    '<div><dt>Agua de proceso</dt><dd>' + numberFormat.format(scenario.water) + ' L/día</dd></div>' +
                    '<div><dt>Uso del electrolizador</dt><dd>' + numberFormat.format(scenario.utilization) + ' %</dd></div>' +
                    '<div><dt>Costo eléctrico por kg</dt><dd>' + (scenario.electricityCost === null ? 'Agrega el precio' : '$ ' + numberFormat.format(scenario.electricityCost)) + '</dd></div>' +
                    '<div><dt>Emisiones evitadas</dt><dd>' + (scenario.avoided === null ? 'Agrega una referencia' : numberFormat.format(scenario.avoided) + ' kg CO₂e/año') + '</dd></div>' +
                    '</dl></article>';
            }).join('') + '</div><div class="lab-note"><strong>Lectura correcta:</strong> son escenarios comparativos. El resultado esperado usa tus valores; los otros modifican recurso, rendimiento y consumo específico para explorar sensibilidad.</div>';
            solarResults.hidden = false;
            updateSolarUrl(input);
        }

        solarForm.addEventListener('submit', function (event) {
            event.preventDefault();
            if (!solarForm.reportValidity()) return;
            renderSolar({
                pv:readNumber('pv'), hsp:readNumber('hsp'), pr:readNumber('pr'), electrolyzer:readNumber('electrolyzer'),
                hours:readNumber('hours'), specific:readNumber('specific'), water:readNumber('water'), days:readNumber('days'),
                price:readNumber('price', true), baseline:readNumber('baseline', true)
            });
            if (!automaticCalculation) solarResults.scrollIntoView({ behavior:'smooth', block:'start' });
        });

        document.querySelector('[data-download-solar]').addEventListener('click', function () {
            if (latestSolar) downloadFile('prediagnostico-hidrogeno-hvt.json', JSON.stringify(latestSolar, null, 2), 'application/json');
        });

        document.querySelector('[data-share-solar]').addEventListener('click', async function () {
            const shareData = { title:'Prediagnóstico solar–hidrógeno HVT', text:'Escenario calculado con el Laboratorio HVT', url:window.location.href };
            try {
                if (navigator.share) await navigator.share(shareData);
                else {
                    await navigator.clipboard.writeText(window.location.href);
                    this.textContent = 'Enlace copiado';
                }
            } catch (error) {
                if (error.name !== 'AbortError') window.prompt('Copia este enlace:', window.location.href);
            }
        });

        if (parameterNames.some(function (name) { return query.has(name); }) && solarForm.reportValidity()) {
            automaticCalculation = true;
            solarForm.requestSubmit();
            automaticCalculation = false;
        }
    }

    const doeForm = document.querySelector('[data-hvt-doe-form]');
    if (doeForm) {
        let latestDoe = null;
        let automaticDoe = false;
        const doeResults = document.querySelector('[data-hvt-doe-results]');
        const doeQuery = new URLSearchParams(window.location.search);
        const doeParameterNames = ['experiment','response','responseUnit','factorName1','factorLow1','factorHigh1','factorUnit1','factorName2','factorLow2','factorHigh2','factorUnit2','factorName3','factorLow3','factorHigh3','factorUnit3','repetitions','seed'];

        doeParameterNames.forEach(function (name) {
            if (doeQuery.has(name) && doeForm.elements[name]) doeForm.elements[name].value = doeQuery.get(name);
        });

        doeForm.addEventListener('submit', function (event) {
            event.preventDefault();
            if (!doeForm.reportValidity()) return;
            const factors = [1,2,3].map(function (index) {
                return {
                    name:doeForm.elements['factorName' + index].value.trim(),
                    low:doeForm.elements['factorLow' + index].value.trim(),
                    high:doeForm.elements['factorHigh' + index].value.trim(),
                    unit:doeForm.elements['factorUnit' + index].value.trim()
                };
            }).filter(function (factor) { return factor.name && factor.low && factor.high && factor.low !== factor.high; });

            if (!factors.length) {
                doeResults.innerHTML = '<div class="lab-status lab-status--warning">Agrega al menos un factor con dos niveles diferentes.</div>';
                doeResults.hidden = false;
                return;
            }

            const repetitions = Number(doeForm.elements.repetitions.value);
            const seed = Number(doeForm.elements.seed.value);
            const conditions = [];
            const conditionCount = Math.pow(2, factors.length);
            for (let mask = 0; mask < conditionCount; mask += 1) {
                conditions.push(factors.map(function (factor, index) {
                    return { name:factor.name, value:mask & (1 << index) ? factor.high : factor.low, unit:factor.unit };
                }));
            }

            let runs = [];
            for (let repetition = 1; repetition <= repetitions; repetition += 1) {
                conditions.forEach(function (condition) { runs.push({ repetition:repetition, values:condition }); });
            }
            runs = shuffle(runs, seededRandom(seed)).map(function (run, index) { run.run = index + 1; return run; });
            latestDoe = {
                model:'HVT-DOE-2LEVEL', version:'1.1', createdAt:new Date().toISOString(),
                experiment:doeForm.elements.experiment.value.trim(), response:doeForm.elements.response.value.trim(),
                responseUnit:doeForm.elements.responseUnit.value.trim(), factors:factors, repetitions:repetitions, seed:seed, runs:runs
            };

            const next = new URL(window.location.href);
            doeParameterNames.forEach(function (name) {
                const value = doeForm.elements[name].value.trim();
                if (value) next.searchParams.set(name, value);
                else next.searchParams.delete(name);
            });
            window.history.replaceState({}, '', next);

            doeResults.innerHTML = '<div class="lab-status">Plan aleatorizado generado · Borrador para revisión técnica</div>' +
                '<div class="lab-table-wrap"><table class="lab-table"><thead><tr><th>Corrida</th><th>Réplica</th>' +
                factors.map(function (factor) { return '<th>' + escapeHtml(factor.name) + '</th>'; }).join('') +
                '<th>' + escapeHtml(latestDoe.response) + ' (' + escapeHtml(latestDoe.responseUnit) + ')</th></tr></thead><tbody>' +
                runs.map(function (run) { return '<tr><td>' + run.run + '</td><td>' + run.repetition + '</td>' +
                    run.values.map(function (value) { return '<td>' + escapeHtml(value.value + (value.unit ? ' ' + value.unit : '')) + '</td>'; }).join('') + '<td></td></tr>'; }).join('') +
                '</tbody></table></div>';
            doeResults.hidden = false;
            if (!automaticDoe) doeResults.scrollIntoView({ behavior:'smooth', block:'start' });
        });

        document.querySelector('[data-download-doe]').addEventListener('click', function () {
            if (!latestDoe) return;
            const header = ['Corrida','Réplica'].concat(latestDoe.factors.map(function (factor) { return factor.name; }), [latestDoe.response + ' (' + latestDoe.responseUnit + ')']);
            const rows = latestDoe.runs.map(function (run) {
                return [run.run,run.repetition].concat(run.values.map(function (value) { return value.value + (value.unit ? ' ' + value.unit : ''); }), ['']);
            });
            const csv = [header].concat(rows).map(function (row) {
                return row.map(function (cell) { const text = String(cell); return /[",\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text; }).join(',');
            }).join('\n');
            downloadFile('plan-experimental-hvt.csv', '\ufeff' + csv, 'text/csv;charset=utf-8');
        });

        if (doeQuery.has('experiment') && doeForm.reportValidity()) {
            automaticDoe = true;
            doeForm.requestSubmit();
            automaticDoe = false;
        }
    }
})();
