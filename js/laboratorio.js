/* Laboratorio HVT
 * Interfaz local, modular y sin credenciales públicas. Los cálculos no dependen de IA.
 */
(function () {
    'use strict';

    if (window.__hvtLabLoaded) return;
    window.__hvtLabLoaded = true;

    const locale = location.pathname.indexOf('/ru/') === 0 ? 'ru' :
        (location.pathname.indexOf('/en/') === 0 ? 'en' : 'es');
    const hasPublicPortal = locale === 'es';

    const copy = {
        es: {
            lab: 'Laboratorio HVT', tools: 'Herramientas rápidas de HVT', tagline: 'Consulta, calcula y compara', open: 'Abrir Laboratorio HVT', close: 'Cerrar laboratorio',
            consult: 'Consultar', solar: 'Solar → H₂', experiment: 'Experimento real', sources: 'Fuentes',
            welcome: 'Describe tu necesidad. Esta primera versión identifica la herramienta adecuada y realiza los cálculos con modelos verificables.',
            prompt: 'Ejemplo: tengo 12 kWp solares y quiero estimar cuánto hidrógeno puedo producir', send: 'Orientarme',
            privacy: 'Tus datos permanecen en este dispositivo. Esta versión no los envía a una IA ni al equipo de HVT.',
            guided: 'Asistente guiado local', guidedNote: 'La conversación con IA se conectará mediante un servicio seguro. Mientras tanto, el laboratorio no finge respuestas de IA: te conduce a cálculos y planes reproducibles.',
            quickSolar: 'Estimar producción de hidrógeno', quickExperiment: 'Diseñar un experimento real', quickUnits: 'Convertir unidades',
            routeSolar: 'Tu consulta requiere un balance solar–hidrógeno. Completa o ajusta los datos que preparé.',
            routeExperiment: 'Tu consulta parece una prueba física. Vamos a convertirla en un plan experimental reproducible y revisable.',
            routeOther: 'Todavía no tengo un módulo validado para esa consulta. Puedes comenzar por Solar → H₂ o Experimento real; más adelante este campo se conectará al asistente de IA.',
            calcTitle: 'Prediagnóstico solar–hidrógeno', calcIntro: 'Compara tres escenarios sin ocultar fórmulas ni supuestos. No sustituye un diseño de ingeniería.',
            location: 'Ubicación o nombre del escenario', solarPower: 'Potencia fotovoltaica', sunHours: 'Horas solares pico', performance: 'Rendimiento global', electrolyzer: 'Potencia del electrolizador', operatingHours: 'Horas disponibles por día', specificEnergy: 'Consumo específico', waterFactor: 'Agua de proceso', operatingDays: 'Días de operación por año', electricityPrice: 'Electricidad (opcional)', baseline: 'Emisiones de referencia (opcional)', calculate: 'Calcular escenarios',
            unitsHint: 'Usa datos medidos o de una fuente identificada. Los valores iniciales son referencias editables, no datos del lugar indicado.',
            conservative: 'Conservador', expected: 'Esperado', favorable: 'Favorable',
            dailyH2: 'H₂ por día', annualH2: 'H₂ por año', solarEnergy: 'Energía solar diaria', water: 'Agua por día', utilization: 'Uso del electrolizador', energyCost: 'Costo eléctrico/kg', avoided: 'Emisiones evitadas/año',
            assumptions: 'Supuestos y límites', noPrice: 'Agrega un precio para calcularlo', noBaseline: 'Agrega una referencia para calcularlas', download: 'Descargar escenario',
            calcWarning: 'Prediagnóstico educativo. Deben verificarse recurso, curvas del equipo, calidad del agua, balance de planta, seguridad, permisos y costos antes de tomar decisiones.',
            doeTitle: 'Diseño de experimentos reales', doeIntro: 'Organiza una prueba física con hipótesis, factores, réplicas, aleatorización y trazabilidad. El plan no autoriza la ejecución.',
            project: 'Nombre del experimento', question: 'Pregunta experimental', hypothesis: 'Hipótesis', response: 'Variable de respuesta', responseUnit: 'Unidad', system: 'Sistema estudiado', experimentalUnit: 'Unidad experimental', measurementMethod: 'Método de medición', stopCriteria: 'Criterios de parada', blockMeaning: 'Qué representa cada bloque',
            systemOptions: ['Solar fotovoltaico', 'Electrolizador', 'Agua y tratamiento', 'Bioeconomía o fermentación', 'Materiales y hábitat', 'Sensores y control', 'Otro'],
            factors: 'Factores controlables (máximo 3)', factor: 'Factor', low: 'Nivel bajo', high: 'Nivel alto', unit: 'Unidad',
            replicates: 'Réplicas independientes', blocks: 'Bloques', reference: 'Condición de referencia (opcional)', seed: 'Semilla de aleatorización',
            safety: 'Revisión previa de realidad y seguridad', hazards: 'Marca los peligros presentes',
            hazardLabels: ['Hidrógeno o gas inflamable', 'Presión o vacío', 'Alta corriente o tensión', 'Sustancias químicas o biológicas', 'Temperatura o partes móviles'],
            responsible: 'Responsable técnico', site: 'Lugar autorizado', risk: 'Evaluación de riesgos documentada', procedure: 'Procedimiento y criterios de parada aprobados', calibrated: 'Instrumentos identificados y calibrados', emergency: 'Respuesta a emergencias y supervisión disponibles',
            generate: 'Generar plan aleatorizado', plan: 'Plan experimental', statusBlocked: 'BORRADOR — NO EJECUTAR', statusReview: 'LISTO PARA REVISIÓN TÉCNICA — NO ES UNA AUTORIZACIÓN',
            missingDoe: 'Completa nombre, pregunta, variable de respuesta, unidad experimental, método de medición y al menos un factor con dos niveles diferentes.',
            run: 'Corrida', block: 'Bloque', replicate: 'Réplica', condition: 'Condición', measured: 'Respuesta medida', referenceRun: 'Referencia',
            exportCsv: 'Descargar tabla CSV', exportPlan: 'Descargar plan JSON', print: 'Imprimir',
            doeWarning: 'Antes de ejecutar: revisión humana competente, permisos, análisis de riesgos, protocolo, calibración, manejo de residuos y criterios de parada. Para hidrógeno, presión, electricidad o sustancias peligrosas se requiere infraestructura y supervisión apropiadas.',
            scienceTitle: 'Fuentes científicas verificadas', scienceIntro: 'Tres artículos reales que orientan el desarrollo del Laboratorio HVT. Cada referencia identifica su DOI, alcance y disponibilidad.',
            verifiedDoi: 'DOI verificado', openAccess: 'Acceso abierto', abstractAccess: 'Resumen disponible; texto completo por suscripción',
            supports: 'Aporta al laboratorio', viewDoi: 'Ver publicación', viewFullText: 'Leer texto completo',
            sourceUses: [
                'Modelo y validación experimental de un electrolizador PEM; ayuda a definir variables, supuestos y contraste entre cálculo y medición.',
                'Dimensionamiento dinámico de plantas aisladas de hidrógeno verde; aporta criterios para comparar producción, operación y costo.',
                'Diseño y optimización experimental de un electrolizador PEM mediante metodología de superficie de respuesta; orienta factores, respuestas y análisis DoE.'
            ],
            evidenceNote: 'Alcance responsable: estas referencias fundamentan decisiones metodológicas, pero no certifican por sí solas los resultados de la calculadora. Los valores deben contrastarse con datos del equipo, mediciones y revisión técnica.'
        },
        en: {
            lab: 'HVT Laboratory', tools: 'HVT quick tools', tagline: 'Ask, calculate and compare', open: 'Open HVT Laboratory', close: 'Close laboratory',
            consult: 'Ask', solar: 'Solar → H₂', experiment: 'Real experiment', sources: 'Sources', welcome: 'Describe your need. This first version identifies the appropriate tool and performs calculations with verifiable models.', prompt: 'Example: I have 12 kWp of solar and want to estimate hydrogen production', send: 'Guide me', privacy: 'Your data stays on this device. This version does not send it to an AI or to HVT.', guided: 'Local guided assistant', guidedNote: 'AI conversation will be connected through a secure service. For now, the laboratory does not pretend to be AI: it routes you to reproducible calculations and plans.', quickSolar: 'Estimate hydrogen production', quickExperiment: 'Design a real experiment', quickUnits: 'Convert units', routeSolar: 'Your request needs a solar-to-hydrogen balance. Complete or adjust the prepared data.', routeExperiment: 'Your request appears to involve a physical test. Let us turn it into a reproducible, reviewable experimental plan.', routeOther: 'There is no validated module for that request yet. Start with Solar → H₂ or Real experiment; this field can later connect to the AI assistant.',
            calcTitle: 'Solar-to-hydrogen pre-assessment', calcIntro: 'Compare three scenarios without hiding formulas or assumptions. This is not an engineering design.', location: 'Location or scenario name', solarPower: 'PV capacity', sunHours: 'Peak sun hours', performance: 'Overall performance ratio', electrolyzer: 'Electrolyser capacity', operatingHours: 'Available hours per day', specificEnergy: 'Specific consumption', waterFactor: 'Process water', operatingDays: 'Operating days per year', electricityPrice: 'Electricity price (optional)', baseline: 'Reference emissions (optional)', calculate: 'Calculate scenarios', unitsHint: 'Use measured data or an identified source. Initial values are editable references, not data for the named location.', conservative: 'Conservative', expected: 'Expected', favorable: 'Favourable', dailyH2: 'H₂ per day', annualH2: 'H₂ per year', solarEnergy: 'Daily solar energy', water: 'Water per day', utilization: 'Electrolyser use', energyCost: 'Electricity cost/kg', avoided: 'Avoided emissions/year', assumptions: 'Assumptions and limits', noPrice: 'Add a price to calculate', noBaseline: 'Add a reference to calculate', download: 'Download scenario', calcWarning: 'Educational pre-assessment. Resource, equipment curves, water quality, balance of plant, safety, permits and costs must be verified before decisions are made.',
            doeTitle: 'Design of real experiments', doeIntro: 'Organise a physical test using hypotheses, factors, replication, randomisation and traceability. The plan does not authorise execution.', project: 'Experiment name', question: 'Experimental question', hypothesis: 'Hypothesis', response: 'Response variable', responseUnit: 'Unit', system: 'System under study', experimentalUnit: 'Experimental unit', measurementMethod: 'Measurement method', stopCriteria: 'Stop criteria', blockMeaning: 'What each block represents', systemOptions: ['Solar PV', 'Electrolyser', 'Water and treatment', 'Bioeconomy or fermentation', 'Materials and habitats', 'Sensors and control', 'Other'], factors: 'Controllable factors (maximum 3)', factor: 'Factor', low: 'Low level', high: 'High level', unit: 'Unit', replicates: 'Independent replicates', blocks: 'Blocks', reference: 'Reference condition (optional)', seed: 'Randomisation seed', safety: 'Reality and safety review', hazards: 'Select present hazards', hazardLabels: ['Hydrogen or flammable gas', 'Pressure or vacuum', 'High current or voltage', 'Chemical or biological substances', 'Temperature or moving parts'], responsible: 'Technical lead', site: 'Authorised location', risk: 'Risk assessment documented', procedure: 'Procedure and stop criteria approved', calibrated: 'Instruments identified and calibrated', emergency: 'Emergency response and supervision available', generate: 'Generate randomised plan', plan: 'Experimental plan', statusBlocked: 'DRAFT — DO NOT RUN', statusReview: 'READY FOR TECHNICAL REVIEW — NOT AN AUTHORISATION', missingDoe: 'Complete the name, question, response, experimental unit, measurement method and at least one factor with two different levels.', run: 'Run', block: 'Block', replicate: 'Replicate', condition: 'Condition', measured: 'Measured response', referenceRun: 'Reference', exportCsv: 'Download CSV table', exportPlan: 'Download JSON plan', print: 'Print', doeWarning: 'Before execution: competent human review, permits, risk assessment, protocol, calibration, waste handling and stop criteria. Hydrogen, pressure, electricity and hazardous substances require appropriate infrastructure and supervision.',
            scienceTitle: 'Verified scientific sources', scienceIntro: 'Three genuine research articles guiding the development of the HVT Laboratory. Each reference identifies its DOI, scope and availability.',
            verifiedDoi: 'Verified DOI', openAccess: 'Open access', abstractAccess: 'Abstract available; full text by subscription',
            supports: 'Contribution to the laboratory', viewDoi: 'View publication', viewFullText: 'Read full text',
            sourceUses: [
                'PEM electrolyser modelling and experimental validation; supports the selection of variables, assumptions and comparison between calculations and measurements.',
                'Dynamic sizing of off-grid green-hydrogen plants; informs comparisons of production, operation and cost.',
                'Experimental design and PEM electrolyser optimisation using response-surface methodology; informs DoE factors, responses and analysis.'
            ],
            evidenceNote: 'Responsible scope: these references support methodological choices, but do not by themselves certify calculator results. Values must be checked against equipment data, measurements and technical review.'
        },
        ru: {
            lab: 'Лаборатория HVT', tools: 'Быстрые инструменты HVT', tagline: 'Спросить, рассчитать и сравнить', open: 'Открыть лабораторию HVT', close: 'Закрыть лабораторию', consult: 'Консультация', solar: 'Солнце → H₂', experiment: 'Реальный эксперимент', sources: 'Источники', welcome: 'Опишите задачу. Первая версия выбирает подходящий инструмент и использует проверяемые расчётные модели.', prompt: 'Пример: у меня 12 кВт солнечных панелей, сколько водорода можно получить?', send: 'Подобрать инструмент', privacy: 'Данные остаются на этом устройстве и не отправляются ИИ или команде HVT.', guided: 'Локальный помощник', guidedNote: 'Диалог с ИИ будет подключён через защищённый сервис. Сейчас лаборатория честно направляет к воспроизводимым расчётам и планам.', quickSolar: 'Оценить производство водорода', quickExperiment: 'Спланировать реальный эксперимент', quickUnits: 'Преобразовать единицы', routeSolar: 'Для запроса нужен баланс солнечной энергии и водорода. Проверьте подготовленные данные.', routeExperiment: 'Запрос связан с физическим испытанием. Создадим воспроизводимый план для технической проверки.', routeOther: 'Проверенного модуля для этого запроса пока нет. Выберите Солнце → H₂ или Реальный эксперимент.',
            calcTitle: 'Предварительная оценка солнце–водород', calcIntro: 'Три сценария с открытыми формулами и допущениями. Это не инженерный проект.', location: 'Место или название сценария', solarPower: 'Мощность ФЭМ', sunHours: 'Пиковые солнечные часы', performance: 'Общий коэффициент эффективности', electrolyzer: 'Мощность электролизёра', operatingHours: 'Доступные часы в сутки', specificEnergy: 'Удельное потребление', waterFactor: 'Технологическая вода', operatingDays: 'Рабочие дни в год', electricityPrice: 'Цена электроэнергии (необязательно)', baseline: 'Эталонные выбросы (необязательно)', calculate: 'Рассчитать сценарии', unitsHint: 'Используйте измеренные данные или указанной источник. Начальные значения — редактируемые примеры.', conservative: 'Консервативный', expected: 'Ожидаемый', favorable: 'Благоприятный', dailyH2: 'H₂ в сутки', annualH2: 'H₂ в год', solarEnergy: 'Солнечная энергия в сутки', water: 'Вода в сутки', utilization: 'Загрузка электролизёра', energyCost: 'Стоимость энергии/кг', avoided: 'Сокращение выбросов/год', assumptions: 'Допущения и ограничения', noPrice: 'Добавьте цену', noBaseline: 'Добавьте эталон', download: 'Скачать сценарий', calcWarning: 'Учебная предварительная оценка. Перед решениями необходимо проверить ресурс, оборудование, воду, вспомогательные системы, безопасность, разрешения и затраты.',
            doeTitle: 'Планирование реальных экспериментов', doeIntro: 'Физическое испытание с гипотезой, факторами, повторениями, рандомизацией и прослеживаемостью. План не разрешает выполнение.', project: 'Название эксперимента', question: 'Исследовательский вопрос', hypothesis: 'Гипотеза', response: 'Отклик', responseUnit: 'Единица', system: 'Исследуемая система', experimentalUnit: 'Экспериментальная единица', measurementMethod: 'Метод измерения', stopCriteria: 'Критерии остановки', blockMeaning: 'Что означает каждый блок', systemOptions: ['Солнечная ФЭМ', 'Электролизёр', 'Вода и очистка', 'Биоэкономика или ферментация', 'Материалы и среда', 'Датчики и управление', 'Другое'], factors: 'Управляемые факторы (до 3)', factor: 'Фактор', low: 'Низкий уровень', high: 'Высокий уровень', unit: 'Единица', replicates: 'Независимые повторения', blocks: 'Блоки', reference: 'Эталонное условие (необязательно)', seed: 'Ключ рандомизации', safety: 'Проверка реальности и безопасности', hazards: 'Отметьте опасности', hazardLabels: ['Водород или горючий газ', 'Давление или вакуум', 'Высокий ток или напряжение', 'Химические или биологические вещества', 'Температура или движущиеся части'], responsible: 'Технический руководитель', site: 'Разрешённое место', risk: 'Оценка рисков документирована', procedure: 'Процедура и критерии остановки утверждены', calibrated: 'Приборы определены и откалиброваны', emergency: 'Доступны аварийные меры и надзор', generate: 'Создать рандомизированный план', plan: 'План эксперимента', statusBlocked: 'ЧЕРНОВИК — НЕ ВЫПОЛНЯТЬ', statusReview: 'ГОТОВО К ТЕХНИЧЕСКОЙ ПРОВЕРКЕ — НЕ РАЗРЕШЕНИЕ', missingDoe: 'Заполните название, вопрос, отклик, экспериментальную единицу, метод измерения и хотя бы один фактор с двумя разными уровнями.', run: 'Запуск', block: 'Блок', replicate: 'Повторение', condition: 'Условие', measured: 'Измеренный отклик', referenceRun: 'Эталон', exportCsv: 'Скачать CSV', exportPlan: 'Скачать JSON', print: 'Печать', doeWarning: 'До выполнения нужны компетентная проверка, разрешения, анализ рисков, протокол, калибровка, обращение с отходами и критерии остановки. Водород, давление, электричество и опасные вещества требуют подходящей инфраструктуры и надзора.',
            scienceTitle: 'Проверенные научные источники', scienceIntro: 'Три подлинные научные статьи, используемые при развитии лаборатории HVT. Для каждой ссылки указаны DOI, область применения и доступность.',
            verifiedDoi: 'DOI проверен', openAccess: 'Открытый доступ', abstractAccess: 'Доступна аннотация; полный текст по подписке',
            supports: 'Вклад в лабораторию', viewDoi: 'Открыть публикацию', viewFullText: 'Читать полный текст',
            sourceUses: [
                'Модель PEM-электролизёра и экспериментальная проверка; помогает выбирать переменные, допущения и сопоставлять расчёты с измерениями.',
                'Динамическое проектирование автономных установок зелёного водорода; задаёт критерии сравнения производства, режима работы и стоимости.',
                'Планирование и оптимизация эксперимента с PEM-электролизёром методом поверхности отклика; помогает выбирать факторы, отклики и анализ DoE.'
            ],
            evidenceNote: 'Ответственное применение: эти статьи обосновывают методические решения, но сами по себе не сертифицируют результаты калькулятора. Значения необходимо сверять с данными оборудования, измерениями и технической экспертизой.'
        }
    };
    const t = copy[locale];
    const nf = new Intl.NumberFormat(locale === 'es' ? 'es-CO' : locale, { maximumFractionDigits: 2 });
    const scientificSources = [
        {
            title: 'Simple PEM water electrolyser model and experimental validation',
            authors: 'R. García-Valverde, N. Espinosa, A. Urbina',
            publication: 'International Journal of Hydrogen Energy 37(2), 1927–1938 (2012)',
            doi: '10.1016/j.ijhydene.2011.09.027',
            url: 'https://doi.org/10.1016/j.ijhydene.2011.09.027',
            open: false
        },
        {
            title: 'Designing off-grid green hydrogen plants using dynamic polymer electrolyte membrane electrolyzers to minimize the hydrogen production cost',
            authors: 'M. J. Ginsberg, D. V. Esposito, V. M. Fthenakis',
            publication: 'Cell Reports Physical Science 4(10), 101625 (2023)',
            doi: '10.1016/j.xcrp.2023.101625',
            url: 'https://doi.org/10.1016/j.xcrp.2023.101625',
            fullText: 'https://www.osti.gov/pages/servlets/purl/2577198',
            open: true
        },
        {
            title: 'Performance assessment and optimization of the PEM water electrolyzer by coupled response surface methodology and finite element modeling',
            authors: 'S. N. Ozdemir, I. Taymaz, F. G. Boyacı San, E. Okumuş',
            publication: 'Fuel 365, 131138 (2024)',
            doi: '10.1016/j.fuel.2024.131138',
            url: 'https://doi.org/10.1016/j.fuel.2024.131138',
            open: false
        }
    ];

    function sourceCards() {
        return scientificSources.map((source, index) => `<article class="hvt-lab__source">
            <div class="hvt-lab__source-meta"><span>${t.verifiedDoi}</span><span class="${source.open ? 'is-open' : ''}">${source.open ? t.openAccess : t.abstractAccess}</span></div>
            <h3>${escapeHtml(source.title)}</h3>
            <p class="hvt-lab__source-authors">${escapeHtml(source.authors)}</p>
            <p class="hvt-lab__source-publication">${escapeHtml(source.publication)}</p>
            <p class="hvt-lab__source-use"><strong>${t.supports}:</strong> ${escapeHtml(t.sourceUses[index])}</p>
            <div class="hvt-lab__source-actions"><a href="${source.url}" target="_blank" rel="noopener noreferrer">${t.viewDoi}<small>DOI ${source.doi}</small></a>${source.fullText ? `<a href="${source.fullText}" target="_blank" rel="noopener noreferrer">${t.viewFullText}<small>OSTI</small></a>` : ''}</div>
        </article>`).join('');
    }

    const root = document.createElement('aside');
    root.className = 'hvt-lab';
    root.setAttribute('aria-label', t.lab);
    root.innerHTML = `
        <section class="hvt-lab__panel" aria-hidden="true" role="dialog" aria-modal="false" aria-labelledby="hvt-lab-title">
            <header class="hvt-lab__header">
                <div><strong id="hvt-lab-title">${t.lab}</strong><span>${t.tagline}</span></div>
                <button class="hvt-lab__close" type="button" aria-label="${t.close}">×</button>
            </header>
            <nav class="hvt-lab__tabs" aria-label="${t.lab}">
                <button type="button" data-view="consult" class="is-active">${t.consult}</button>
                <button type="button" data-view="solar">${t.solar}</button>
                <button type="button" data-view="experiment">${t.experiment}</button>
                <button type="button" data-view="sources">${t.sources}</button>
            </nav>
            <div class="hvt-lab__body">
                <section class="hvt-lab__view is-active" data-view-panel="consult">
                    <p class="hvt-lab__lead">${t.welcome}</p>
                    <form class="hvt-lab__ask">
                        <label class="hvt-lab__sr" for="hvt-lab-question">${t.consult}</label>
                        <textarea id="hvt-lab-question" maxlength="500" placeholder="${t.prompt}"></textarea>
                        <button class="hvt-lab__primary" type="submit">${t.send}</button>
                    </form>
                    <div class="hvt-lab__quick">
                        <button type="button" data-route="solar">${t.quickSolar}</button>
                        <button type="button" data-route="experiment">${t.quickExperiment}</button>
                    </div>
                    <div class="hvt-lab__answer" hidden></div>
                    <article class="hvt-lab__notice"><strong>${t.guided}</strong><p>${t.guidedNote}</p></article>
                    <p class="hvt-lab__privacy">${t.privacy}</p>
                </section>
                <section class="hvt-lab__view" data-view-panel="solar">
                    <div class="hvt-lab__section-head"><div><h2>${t.calcTitle}</h2><p>${t.calcIntro}</p></div><span>v1.0</span></div>
                    <form class="hvt-lab__grid" id="hvt-solar-form">
                        ${field('scenarioName', t.location, 'text', '', '', '', '')}
                        ${field('solarKw', t.solarPower, 'number', 12, 0.1, 100000, 'kWp')}
                        ${field('sunHours', t.sunHours, 'number', 4.5, 0.5, 10, 'kWh/m²/día')}
                        ${field('performanceRatio', t.performance, 'number', 0.80, 0.3, 1, '0–1', '0.01')}
                        ${field('electrolyzerKw', t.electrolyzer, 'number', 5, 0.1, 100000, 'kW')}
                        ${field('availableHours', t.operatingHours, 'number', 8, 0.1, 24, 'h/día', '0.1')}
                        ${field('specificKwhKg', t.specificEnergy, 'number', 52, 35, 90, 'kWh/kg H₂', '0.1')}
                        ${field('waterLKg', t.waterFactor, 'number', 11, 9, 50, 'L/kg H₂', '0.1')}
                        ${field('daysYear', t.operatingDays, 'number', 330, 1, 366, 'días', '1')}
                        ${field('electricityPrice', t.electricityPrice, 'number', '', 0, 100000, locale === 'es' ? 'COP/kWh' : 'currency/kWh', '0.01')}
                        ${field('baselineEmissions', t.baseline, 'number', '', 0, 100, 'kg CO₂e/kg H₂', '0.01')}
                        <p class="hvt-lab__field-note">${t.unitsHint}</p>
                        <button class="hvt-lab__primary hvt-lab__grid-action" type="submit">${t.calculate}</button>
                    </form>
                    <div id="hvt-solar-results" class="hvt-lab__results" hidden></div>
                    <p class="hvt-lab__warning">${t.calcWarning}</p>
                </section>
                <section class="hvt-lab__view" data-view-panel="experiment">
                    <div class="hvt-lab__section-head"><div><h2>${t.doeTitle}</h2><p>${t.doeIntro}</p></div><span>DoE v1.0</span></div>
                    <form id="hvt-doe-form" class="hvt-lab__doe">
                        <div class="hvt-lab__grid">
                            ${field('doeName', t.project, 'text', '', '', '', '')}
                            ${selectField('doeSystem', t.system, t.systemOptions)}
                            ${areaField('doeQuestion', t.question)}
                            ${areaField('doeHypothesis', t.hypothesis)}
                            ${field('doeResponse', t.response, 'text', '', '', '', '')}
                            ${field('doeResponseUnit', t.responseUnit, 'text', '', '', '', '')}
                            ${field('doeExperimentalUnit', t.experimentalUnit, 'text', '', '', '', '')}
                            ${field('doeMeasurementMethod', t.measurementMethod, 'text', '', '', '', '')}
                            ${areaField('doeStopCriteria', t.stopCriteria)}
                        </div>
                        <fieldset><legend>${t.factors}</legend><div class="hvt-lab__factor-head"><span>${t.factor}</span><span>${t.low}</span><span>${t.high}</span><span>${t.unit}</span></div>${[1,2,3].map(factorRow).join('')}</fieldset>
                        <div class="hvt-lab__grid hvt-lab__grid--small">
                            ${field('doeReplicates', t.replicates, 'number', 3, 2, 8, '', '1')}
                            ${field('doeBlocks', t.blocks, 'number', 1, 1, 4, '', '1')}
                            ${field('doeBlockMeaning', t.blockMeaning, 'text', '', '', '', '')}
                            ${field('doeReference', t.reference, 'text', '', '', '', '')}
                            ${field('doeSeed', t.seed, 'number', 2026, 1, 999999, '', '1')}
                        </div>
                        <fieldset><legend>${t.safety}</legend><p class="hvt-lab__field-note">${t.hazards}</p><div class="hvt-lab__checks">${t.hazardLabels.map((label, i) => check('hazard-' + i, label, 'hazard')).join('')}</div><div class="hvt-lab__grid hvt-lab__grid--small">${field('doeResponsible', t.responsible, 'text', '', '', '', '')}${field('doeSite', t.site, 'text', '', '', '', '')}</div><div class="hvt-lab__checks">${check('gateRisk', t.risk, 'gate')}${check('gateProcedure', t.procedure, 'gate')}${check('gateCalibration', t.calibrated, 'gate')}${check('gateEmergency', t.emergency, 'gate')}</div></fieldset>
                        <button class="hvt-lab__primary" type="submit">${t.generate}</button>
                    </form>
                    <div id="hvt-doe-results" class="hvt-lab__results" hidden></div>
                    <p class="hvt-lab__warning hvt-lab__warning--danger">${t.doeWarning}</p>
                </section>
                <section class="hvt-lab__view" data-view-panel="sources">
                    <div class="hvt-lab__section-head"><div><h2>${t.scienceTitle}</h2><p>${t.scienceIntro}</p></div><span>3 DOI</span></div>
                    <div class="hvt-lab__sources">${sourceCards()}</div>
                    <p class="hvt-lab__evidence-note">${t.evidenceNote}</p>
                </section>
            </div>
        </section>
        ${hasPublicPortal ? `<a class="hvt-lab__toggle hvt-lab__toggle--portal" href="/laboratorio/" aria-label="Entrar al Laboratorio HVT"><span class="hvt-lab__mark" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M12 3h8M14 3v8L6.5 24.5A3 3 0 0 0 9.1 29h13.8a3 3 0 0 0 2.6-4.5L18 11V3"/><path class="hvt-lab__liquid" d="M9 22h14M11 18.5h10"/><circle cx="13" cy="25" r="1"/><circle cx="19" cy="23.5" r="1"/></svg></span><b>Entrar al Laboratorio HVT</b><span class="hvt-lab__portal-arrow" aria-hidden="true">→</span></a>` : `<button class="hvt-lab__toggle" type="button" aria-label="${t.open}" aria-expanded="false"><span class="hvt-lab__mark" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M12 3h8M14 3v8L6.5 24.5A3 3 0 0 0 9.1 29h13.8a3 3 0 0 0 2.6-4.5L18 11V3"/><path class="hvt-lab__liquid" d="M9 22h14M11 18.5h10"/><circle cx="13" cy="25" r="1"/><circle cx="19" cy="23.5" r="1"/></svg></span><b>${t.lab}</b></button>`}`;

    function field(name, label, type, value, min, max, suffix, step) {
        const attrs = [min !== '' ? `min="${min}"` : '', max !== '' ? `max="${max}"` : '', step ? `step="${step}"` : ''].join(' ');
        return `<label class="hvt-lab__field"><span>${label}</span><span class="hvt-lab__input"><input name="${name}" type="${type}" value="${value}" ${attrs}>${suffix ? `<small>${suffix}</small>` : ''}</span></label>`;
    }
    function areaField(name, label) { return `<label class="hvt-lab__field hvt-lab__field--wide"><span>${label}</span><textarea name="${name}" rows="2"></textarea></label>`; }
    function selectField(name, label, options) { return `<label class="hvt-lab__field"><span>${label}</span><select name="${name}">${options.map(x => `<option>${x}</option>`).join('')}</select></label>`; }
    function factorRow(number) { return `<div class="hvt-lab__factor"><label><span>${t.factor} ${number}</span><input aria-label="${t.factor} ${number}" name="factorName${number}"></label><label><span>${t.low}</span><input aria-label="${t.low} ${number}" name="factorLow${number}"></label><label><span>${t.high}</span><input aria-label="${t.high} ${number}" name="factorHigh${number}"></label><label><span>${t.unit}</span><input aria-label="${t.unit} ${number}" name="factorUnit${number}"></label></div>`; }
    function check(name, label, group) { return `<label><input type="checkbox" name="${name}" data-check-group="${group}"><span>${label}</span></label>`; }

    document.body.appendChild(root);
    ['solarKw', 'sunHours', 'performanceRatio', 'electrolyzerKw', 'availableHours', 'specificKwhKg', 'waterLKg', 'daysYear'].forEach(name => {
        root.querySelector(`#hvt-solar-form [name="${name}"]`).required = true;
    });
    const panel = root.querySelector('.hvt-lab__panel');
    const toggle = root.querySelector('.hvt-lab__toggle');
    const close = root.querySelector('.hvt-lab__close');
    let latestSolar = null;
    let latestDoe = null;

    function openLab(view) { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); document.body.classList.add('hvt-lab-open'); root.classList.add('is-open'); panel.setAttribute('aria-hidden', 'false'); panel.setAttribute('aria-modal', String(window.matchMedia('(max-width: 1100px)').matches)); toggle.setAttribute('aria-expanded', 'true'); switchView(view || 'consult'); close.focus({ preventScroll: true }); }
    function closeLab() { document.body.classList.remove('hvt-lab-open'); root.classList.remove('is-open'); panel.setAttribute('aria-hidden', 'true'); panel.setAttribute('aria-modal', 'false'); toggle.setAttribute('aria-expanded', 'false'); toggle.focus(); }
    function switchView(view) {
        root.querySelectorAll('[data-view]').forEach(button => button.classList.toggle('is-active', button.dataset.view === view));
        root.querySelectorAll('[data-view-panel]').forEach(section => section.classList.toggle('is-active', section.dataset.viewPanel === view));
        panel.querySelector('.hvt-lab__body').scrollTop = 0;
    }
    if (!hasPublicPortal) toggle.addEventListener('click', () => root.classList.contains('is-open') ? closeLab() : openLab());
    close.addEventListener('click', closeLab);
    root.querySelector('.hvt-lab__tabs').addEventListener('click', event => { const b = event.target.closest('[data-view]'); if (b) switchView(b.dataset.view); });
    root.querySelector('.hvt-lab__quick').addEventListener('click', event => { const b = event.target.closest('[data-route]'); if (b) switchView(b.dataset.route); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && root.classList.contains('is-open')) closeLab(); });

    root.querySelector('.hvt-lab__ask').addEventListener('submit', function (event) {
        event.preventDefault();
        const question = root.querySelector('#hvt-lab-question').value.trim();
        if (!question) return;
        const answer = root.querySelector('.hvt-lab__answer');
        const normalized = question.toLowerCase();
        let message = t.routeOther;
        let route = '';
        if (/experiment|experimento|ensayo|prueba|doe|опыт|эксперимент/.test(normalized)) { message = t.routeExperiment; route = 'experiment'; }
        else if (/solar|hydrogen|hidrogen|hidr[oó]geno|electroly|electr[oó]li|водород|солнеч/.test(normalized)) { message = t.routeSolar; route = 'solar'; }
        answer.textContent = message;
        answer.hidden = false;
        if (route) window.setTimeout(() => switchView(route), 650);
    });

    function readNumber(form, name, optional) {
        const raw = form.elements[name].value;
        if (optional && raw === '') return null;
        return Number(raw);
    }
    function format(value, suffix) { return `${nf.format(value)} ${suffix}`; }
    function scenario(input, kind) {
        const changes = kind === 'conservative' ? { sun: .85, pr: -.05, sec: 1.05 } : (kind === 'favorable' ? { sun: 1.15, pr: .03, sec: .95 } : { sun: 1, pr: 0, sec: 1 });
        const pr = Math.max(.1, Math.min(1, input.performanceRatio + changes.pr));
        const solarEnergy = input.solarKw * input.sunHours * changes.sun * pr;
        const electrolyzerCapacity = input.electrolyzerKw * input.availableHours;
        const usableEnergy = Math.min(solarEnergy, electrolyzerCapacity);
        const specific = input.specificKwhKg * changes.sec;
        const dailyH2 = usableEnergy / specific;
        const annualH2 = dailyH2 * input.daysYear;
        return {
            kind, solarEnergy, usableEnergy, specific, dailyH2, annualH2,
            water: dailyH2 * input.waterLKg,
            utilization: electrolyzerCapacity ? usableEnergy / electrolyzerCapacity * 100 : 0,
            energyCost: input.electricityPrice === null ? null : specific * input.electricityPrice,
            avoided: input.baselineEmissions === null ? null : annualH2 * input.baselineEmissions
        };
    }
    root.querySelector('#hvt-solar-form').addEventListener('submit', function (event) {
        event.preventDefault();
        if (!event.currentTarget.reportValidity()) return;
        const form = event.currentTarget;
        const input = {
            name: form.elements.scenarioName.value.trim(), solarKw: readNumber(form, 'solarKw'), sunHours: readNumber(form, 'sunHours'), performanceRatio: readNumber(form, 'performanceRatio'), electrolyzerKw: readNumber(form, 'electrolyzerKw'), availableHours: readNumber(form, 'availableHours'), specificKwhKg: readNumber(form, 'specificKwhKg'), waterLKg: readNumber(form, 'waterLKg'), daysYear: readNumber(form, 'daysYear'), electricityPrice: readNumber(form, 'electricityPrice', true), baselineEmissions: readNumber(form, 'baselineEmissions', true)
        };
        const scenarios = ['conservative', 'expected', 'favorable'].map(kind => scenario(input, kind));
        latestSolar = { model: 'HVT-SOLAR-H2', version: '1.0', createdAt: new Date().toISOString(), locale, inputs: input, scenarios };
        const labels = { conservative: t.conservative, expected: t.expected, favorable: t.favorable };
        const results = root.querySelector('#hvt-solar-results');
        results.innerHTML = `<div class="hvt-lab__scenario-grid">${scenarios.map(s => `<article><h3>${labels[s.kind]}</h3><dl><div><dt>${t.dailyH2}</dt><dd>${format(s.dailyH2, 'kg')}</dd></div><div><dt>${t.annualH2}</dt><dd>${format(s.annualH2, 'kg')}</dd></div><div><dt>${t.solarEnergy}</dt><dd>${format(s.solarEnergy, 'kWh')}</dd></div><div><dt>${t.water}</dt><dd>${format(s.water, 'L')}</dd></div><div><dt>${t.utilization}</dt><dd>${format(s.utilization, '%')}</dd></div><div><dt>${t.energyCost}</dt><dd>${s.energyCost === null ? t.noPrice : nf.format(s.energyCost)}</dd></div><div><dt>${t.avoided}</dt><dd>${s.avoided === null ? t.noBaseline : format(s.avoided, 'kg CO₂e')}</dd></div></dl></article>`).join('')}</div><details><summary>${t.assumptions}</summary><ul><li>E<sub>solar</sub> = kWp × horas solares × rendimiento global.</li><li>E<sub>útil</sub> = min(E<sub>solar</sub>, kW<sub>electrolizador</sub> × horas disponibles).</li><li>m<sub>H₂</sub> = E<sub>útil</sub> ÷ consumo específico.</li><li>${t.conservative}: recurso −15 %, rendimiento −0.05, consumo +5 %.</li><li>${t.favorable}: recurso +15 %, rendimiento +0.03, consumo −5 %.</li></ul></details><button class="hvt-lab__secondary" type="button" data-download-solar>${t.download}</button>`;
        results.hidden = false;
    });

    function seededRandom(seed) { let a = seed >>> 0; return function () { a += 0x6D2B79F5; let x = a; x = Math.imul(x ^ x >>> 15, x | 1); x ^= x + Math.imul(x ^ x >>> 7, x | 61); return ((x ^ x >>> 14) >>> 0) / 4294967296; }; }
    function shuffle(array, random) { for (let i = array.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [array[i], array[j]] = [array[j], array[i]]; } return array; }
    function csvCell(value) { const text = String(value == null ? '' : value); return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text; }
    function download(name, content, type) { const url = URL.createObjectURL(new Blob([content], { type })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); }

    root.querySelector('#hvt-doe-form').addEventListener('submit', function (event) {
        event.preventDefault();
        const form = event.currentTarget;
        const factors = [1,2,3].map(i => ({ name: form.elements['factorName' + i].value.trim(), low: form.elements['factorLow' + i].value.trim(), high: form.elements['factorHigh' + i].value.trim(), unit: form.elements['factorUnit' + i].value.trim() })).filter(f => f.name && f.low && f.high && f.low !== f.high);
        const base = { name: form.elements.doeName.value.trim(), system: form.elements.doeSystem.value, question: form.elements.doeQuestion.value.trim(), hypothesis: form.elements.doeHypothesis.value.trim(), response: form.elements.doeResponse.value.trim(), responseUnit: form.elements.doeResponseUnit.value.trim(), experimentalUnit: form.elements.doeExperimentalUnit.value.trim(), measurementMethod: form.elements.doeMeasurementMethod.value.trim(), stopCriteria: form.elements.doeStopCriteria.value.trim(), factors, replicates: readNumber(form, 'doeReplicates'), blocks: readNumber(form, 'doeBlocks'), blockMeaning: form.elements.doeBlockMeaning.value.trim(), reference: form.elements.doeReference.value.trim(), seed: readNumber(form, 'doeSeed'), responsible: form.elements.doeResponsible.value.trim(), site: form.elements.doeSite.value.trim() };
        base.blocks = Math.min(base.blocks, base.replicates);
        const results = root.querySelector('#hvt-doe-results');
        if (!base.name || !base.question || !base.response || !base.experimentalUnit || !base.measurementMethod || !factors.length) { results.textContent = t.missingDoe; results.hidden = false; return; }
        const conditions = [];
        const count = Math.pow(2, factors.length);
        for (let mask = 0; mask < count; mask++) conditions.push({ type: 'factorial', values: factors.map((factor, index) => ({ name: factor.name, value: mask & (1 << index) ? factor.high : factor.low, unit: factor.unit })) });
        let runs = [];
        for (let replicate = 1; replicate <= base.replicates; replicate++) {
            conditions.forEach(condition => runs.push({ replicate, block: ((replicate - 1) % base.blocks) + 1, condition }));
            if (base.reference) runs.push({ replicate, block: ((replicate - 1) % base.blocks) + 1, condition: { type: 'reference', label: base.reference, values: [] } });
        }
        const random = seededRandom(base.seed);
        runs = Array.from({ length: base.blocks }, (_, index) => index + 1).flatMap(block => shuffle(runs.filter(run => run.block === block), random)).map((run, index) => Object.assign({ run: index + 1 }, run));
        const hazards = Array.from(form.querySelectorAll('[data-check-group="hazard"]:checked')).map(x => x.parentElement.textContent.trim());
        const gates = Array.from(form.querySelectorAll('[data-check-group="gate"]'));
        const gatesComplete = gates.every(x => x.checked) && base.responsible && base.site;
        const inferredHazard = /electroly|electrol|hidr[oó]geno|hydrogen|pressure|presi[oó]n|водород|давлен/i.test([base.system, base.question, base.hypothesis].concat(factors.map(f => f.name)).join(' '));
        const status = (hazards.length || inferredHazard) && !gatesComplete ? 'blocked' : 'review';
        latestDoe = { model: 'HVT-DOE-2LEVEL', version: '1.0', createdAt: new Date().toISOString(), locale, status, experiment: base, hazards, safetyGates: Object.fromEntries(gates.map(x => [x.name, x.checked])), runs };
        const columns = factors.map(f => f.name);
        results.innerHTML = `<div class="hvt-lab__status hvt-lab__status--${status}">${status === 'blocked' ? t.statusBlocked : t.statusReview}</div><div class="hvt-lab__plan-summary"><strong>${escapeHtml(base.name)}</strong><p>${escapeHtml(base.question)}</p><small>${runs.length} ${t.run.toLowerCase()} · ${base.replicates} ${t.replicate.toLowerCase()} · ${base.blocks} ${t.block.toLowerCase()}</small></div><div class="hvt-lab__table-wrap" role="region" aria-label="${escapeHtml(t.doeTitle)}" tabindex="0"><table><thead><tr><th>${t.run}</th><th>${t.block}</th><th>${t.replicate}</th><th>${t.condition}</th>${columns.map(x => `<th>${escapeHtml(x)}</th>`).join('')}<th>${t.measured} (${escapeHtml(base.responseUnit)})</th></tr></thead><tbody>${runs.map(run => `<tr><td>${run.run}</td><td>${run.block}</td><td>${run.replicate}</td><td>${run.condition.type === 'reference' ? t.referenceRun : '2^k'}</td>${factors.map(f => { const value = run.condition.values.find(v => v.name === f.name); return `<td>${value ? escapeHtml(value.value + (value.unit ? ' ' + value.unit : '')) : '—'}</td>`; }).join('')}<td></td></tr>`).join('')}</tbody></table></div><div class="hvt-lab__result-actions"><button class="hvt-lab__secondary" type="button" data-download-doe-csv>${t.exportCsv}</button><button class="hvt-lab__secondary" type="button" data-download-doe-json>${t.exportPlan}</button><button class="hvt-lab__secondary" type="button" data-print-doe>${t.print}</button></div>`;
        results.hidden = false;
    });
    function escapeHtml(value) { return String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char])); }

    root.addEventListener('click', function (event) {
        if (event.target.closest('[data-download-solar]') && latestSolar) download('hvt-solar-h2.json', JSON.stringify(latestSolar, null, 2), 'application/json');
        if (event.target.closest('[data-download-doe-json]') && latestDoe) download('hvt-plan-experimental.json', JSON.stringify(latestDoe, null, 2), 'application/json');
        if (event.target.closest('[data-download-doe-csv]') && latestDoe) {
            const factors = latestDoe.experiment.factors;
            const header = [t.run, t.block, t.replicate, t.condition].concat(factors.map(f => f.name), [`${t.measured} (${latestDoe.experiment.responseUnit})`]);
            const rows = latestDoe.runs.map(run => [run.run, run.block, run.replicate, run.condition.type === 'reference' ? t.referenceRun : '2^k'].concat(factors.map(f => { const value = run.condition.values.find(v => v.name === f.name); return value ? `${value.value}${value.unit ? ' ' + value.unit : ''}` : ''; }), ['']));
            download('hvt-corridas-experimentales.csv', '\ufeff' + [header].concat(rows).map(row => row.map(csvCell).join(',')).join('\n'), 'text/csv;charset=utf-8');
        }
        if (event.target.closest('[data-print-doe]')) window.print();
    });

    const requestedView = new URLSearchParams(location.search).get('lab');
    if (['consult', 'solar', 'experiment', 'sources'].indexOf(requestedView) !== -1) {
        window.setTimeout(() => openLab(requestedView), 120);
    }
})();
