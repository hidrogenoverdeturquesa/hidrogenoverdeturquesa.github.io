/* Mentor: asistente contextual de navegación.
 * Módulo autónomo: no modifica el contenido ni depende del resto del sitio.
 */
(function () {
    'use strict';

    if (window.__mentorLoaded) return;
    window.__mentorLoaded = true;

    /* Solo activar cuando todos los costos utilizados estén revisados y aprobados. */
    const PUBLIC_PRICE_RANGES_ENABLED = false;

    const page = (location.pathname.split('/').pop() || 'index')
        .toLowerCase()
        .replace(/\.html$/i, '');
    const isPueblitoPage = page === 'pueblito-boyacense';
    const state = {
        page: page,
        section: '',
        opened: false,
        visits: JSON.parse(sessionStorage.getItem('mentor-visits') || '{}'),
        dismissed: Number(sessionStorage.getItem('mentor-dismissed') || 0),
        lastSuggestion: '',
        quote: null
    };

    const contexts = {
        home: {
            label: 'este panorama',
            prompt: 'Toda transformación comienza con una mirada atenta. Puedo mostrarte las rutas de conocimiento, los proyectos o los servicios que habitan este espacio.',
            actions: [['Explorar servicios', '#services'], ['Conocer la fundación', '/fundacion']]
        },
        impact: {
            label: 'nuestro impacto',
            prompt: 'Las cifras describen una parte del camino; su verdadero valor aparece cuando revelan aquello que puede transformarse. ¿Quieres conocer cómo convertimos propósito en resultados?',
            actions: [['Ver servicios', '#services'], ['Conocer proyectos', '#portfolio']]
        },
        services: {
            label: 'los servicios',
            prompt: 'Una necesidad bien comprendida contiene ya el principio de su solución. Si me dices qué buscas transformar, puedo orientarte entre nuestras líneas de trabajo.',
            actions: [['Solicitar estimación', 'chat:cotizar'], ['Tengo un proyecto', 'chat:proyecto'], ['Comparar opciones', 'chat:comparar']]
        },
        portfolio: {
            label: 'los proyectos',
            prompt: 'Los proyectos son ideas que aprendieron a dialogar con la realidad. Puedo ayudarte a reconocer cuál de estas experiencias se aproxima más a tu propósito.',
            actions: [['Encontrar un proyecto afín', 'chat:proyecto'], ['Explorar servicios', '#services']]
        },
        blog: {
            label: 'estas reflexiones',
            prompt: 'Leer es permitir que una idea encuentre nuevas preguntas. Puedo ayudarte a relacionar este contenido con una ruta de aprendizaje o con una aplicación concreta.',
            actions: [['Quiero aprender', '/fundacion#cursos'], ['Buscar una aplicación', 'chat:aplicacion']]
        },
        about: {
            label: 'nuestra forma de trabajar',
            prompt: 'El conocimiento adquiere sentido cuando se acompaña de método y de propósito. Puedo explicarte cómo abordamos una iniciativa desde su primera pregunta.',
            actions: [['Cómo trabajan', 'chat:metodo'], ['Hablar de mi iniciativa', '#contact']]
        },
        contact: {
            label: 'el siguiente paso',
            prompt: 'Toda conversación fecunda comienza cuando una posibilidad encuentra palabras. Puedo ayudarte a ordenar tu idea antes de ponerte en contacto con el equipo.',
            actions: [['Preparar mi consulta', 'chat:consulta'], ['Contactar ahora', 'mailto:contacto@hidrogenoverdeturquesa.com']]
        },
        cursos: {
            label: 'la ruta de aprendizaje',
            prompt: 'Aprender no es acumular respuestas, sino descubrir preguntas cada vez más precisas. Puedo ayudarte a elegir un punto de partida según tu experiencia.',
            actions: [['Estoy comenzando', 'chat:principiante'], ['Ya tengo experiencia', 'chat:avanzado']]
        },
        course: {
            label: 'esta lección',
            prompt: 'Cada concepto dominado ensancha el horizonte de lo posible. Si algo parece complejo, puedo ayudarte a mirarlo desde una perspectiva más sencilla.',
            actions: [['Explícamelo sencillo', 'chat:sencillo'], ['Ver otros cursos', '/fundacion#cursos']]
        },
        project: {
            label: 'este proyecto',
            prompt: 'Una obra no se comprende únicamente por su resultado, sino por las decisiones que la hicieron posible. Puedo ayudarte a relacionar este proyecto con una necesidad propia.',
            actions: [['Tengo una idea similar', 'chat:similar'], ['Consultar al equipo', '/#contact']]
        },
        foundation: {
            label: 'la fundación',
            prompt: 'Cuando el conocimiento se comparte, deja de ser privilegio y se convierte en territorio común. Puedo guiarte por nuestras iniciativas y rutas educativas.',
            actions: [['Ver cursos', '#cursos'], ['Cómo participar', 'chat:participar']]
        },
        pueblito: {
            label: 'esta mirada desde Pueblito Boyacense',
            prompt: 'Estás recorriendo una visión de Hidrógeno Verde Turquesa nacida desde Pueblito Boyacense. Aquí relacionamos energía, agua, alimento, arquitectura y cultura sin afirmar que ya exista una instalación de hidrógeno en el lugar.',
            actions: [['Explorar la casa', '#casa-viva'], ['Entender la visión', 'chat:pueblito-vision'], ['Sitio oficial de Pueblito', 'https://pueblitoboyacense.org/']]
        },
        vision: {
            label: 'la visión territorial',
            prompt: 'La soberanía energética no significa aislarse: significa comprender la demanda, los recursos y las decisiones del territorio. En esta propuesta, la energía también se relaciona con agua segura, alimentos y capacidades locales.',
            actions: [['Ver el plano conceptual', '#ecosistema'], ['¿Qué papel tiene el hidrógeno?', 'chat:pueblito-hidrogeno']]
        },
        ecosistema: {
            label: 'el plano territorial',
            prompt: 'Este dibujo es un esquema conceptual, no un diseño constructivo. Muestra cómo energía, agua, alimento, materiales y cultura deben estudiarse como partes de un mismo sistema habitado.',
            actions: [['Explorar la casa real', '#casa-viva'], ['¿Ya está instalado?', 'chat:pueblito-transparencia']]
        },
        'casa-viva': {
            label: 'la casa como organismo',
            prompt: 'Los puntos sobre la fotografía presentan hipótesis de integración: cubierta, muros, aire, huerta y núcleo técnico. La prioridad es mejorar confort y eficiencia sin borrar la arquitectura ni convertir el hogar en una industria.',
            actions: [['Conocer los materiales', '#materiales'], ['¿Cómo se protege la arquitectura?', 'chat:pueblito-arquitectura']]
        },
        materiales: {
            label: 'la mesa de materiales',
            prompt: 'Tierra, madera, piedra, fibras y materiales biobasados pueden aportar identidad y confort. Su uso responsable exige caracterización, ensayos y validación estructural, contra incendios y de eficiencia energética.',
            actions: [['Ver el método', 'chat:pueblito-materiales'], ['Explorar proyectos', '#proyectos-relacionados']]
        },
        'proyectos-relacionados': {
            label: 'el archivo de investigación',
            prompt: 'Estas cinco rutas conectan vivienda, territorio, hidrógeno y bioeconomía. Son investigaciones y formulaciones relacionadas con la visión; no son obras que afirmemos haber ejecutado en Pueblito Boyacense.',
            actions: [['Ver hogares eficientes', '/proyecto-hogares-eficientes'], ['Resolver una duda', '#preguntas-pueblito']]
        },
        'memoria-visual': {
            label: 'la memoria visual',
            prompt: 'Las fotografías documentan fachadas, jardines, plazas y lugares de encuentro. Este archivo reconoce que el territorio también se comprende caminándolo, observándolo y escuchando su memoria.',
            actions: [['Volver a la casa', '#casa-viva'], ['Conocer Pueblito oficialmente', 'https://pueblitoboyacense.org/']]
        },
        'preguntas-pueblito': {
            label: 'las preguntas necesarias',
            prompt: 'Esta sección separa con claridad la visión de lo que aún debe investigarse. No afirmamos que Pueblito Boyacense funcione hoy con hidrógeno ni que exista allí un sistema instalado por la empresa.',
            actions: [['¿Qué propone entonces?', 'chat:pueblito-vision'], ['Conversar con el equipo', '#presencia-pueblito']]
        },
        'presencia-pueblito': {
            label: 'nuestra presencia en el territorio',
            prompt: 'Hidrógeno Verde Turquesa piensa esta visión desde Pueblito Boyacense, en Duitama. Puedo ayudarte a preparar una conversación con el equipo o llevarte al portal oficial del lugar.',
            actions: [['Conversar por WhatsApp', 'https://wa.me/573209574884?text=Hola%2C%20quiero%20conocer%20la%20visi%C3%B3n%20de%20Hidr%C3%B3geno%20Verde%20Turquesa%20desde%20Pueblito%20Boyacense'], ['Portal oficial', 'https://pueblitoboyacense.org/']]
        }
    };

    function initialContext() {
        if (isPueblitoPage) return (location.hash || '#pueblito').slice(1) || 'pueblito';
        if (page.indexOf('curso-') === 0) return 'course';
        if (page.indexOf('proyecto-') === 0) return 'project';
        if (page === 'fundacion') return location.hash === '#cursos' ? 'cursos' : 'foundation';
        if (page.indexOf('blog') !== -1 || page === 'category') return 'blog';
        return (location.hash || '#home').slice(1) || 'home';
    }

    const root = document.createElement('aside');
    root.className = 'mentor';
    root.setAttribute('aria-label', 'Mentor, asistente de navegación');
    root.innerHTML = `
        <div class="mentor__hint" role="status" aria-live="polite"></div>
        <section class="mentor__panel" role="dialog" aria-modal="false" aria-hidden="true" aria-labelledby="mentor-title">
            <header class="mentor__header">
                <div class="mentor__mark mentor__mark--small" aria-hidden="true"><i></i><i></i></div>
                <div><strong id="mentor-title">Mentor</strong><span>Una mirada que orienta</span></div>
                <button class="mentor__close" type="button" aria-label="Cerrar Mentor">×</button>
            </header>
            <div class="mentor__messages" role="log" aria-live="polite"></div>
            <div class="mentor__actions"></div>
            <form class="mentor__form">
                <label class="mentor__sr" for="mentor-question">Escribe tu pregunta</label>
                <input id="mentor-question" maxlength="240" autocomplete="off" placeholder="Escribe lo que deseas comprender…">
                <button type="submit" aria-label="Enviar pregunta">→</button>
            </form>
            <p class="mentor__privacy">Mentor utiliza únicamente tu recorrido dentro de este sitio para contextualizar sus sugerencias.</p>
        </section>
        <button class="mentor__toggle" type="button" aria-label="Abrir Mentor" aria-expanded="false">
            <span class="mentor__mark" aria-hidden="true"><i></i><i></i></span><span class="mentor__toggle-label">Mentor</span>
        </button>`;
    document.body.appendChild(root);

    const panel = root.querySelector('.mentor__panel');
    const toggle = root.querySelector('.mentor__toggle');
    const messages = root.querySelector('.mentor__messages');
    const actions = root.querySelector('.mentor__actions');
    const hint = root.querySelector('.mentor__hint');
    const input = root.querySelector('input');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const typingQueue = [];
    let typingActive = false;
    let hintTypingTimer = 0;
    let hintHideTimer = 0;

    function typeNextMessage() {
        if (typingActive || !typingQueue.length) return;
        typingActive = true;
        const current = typingQueue.shift();
        const characters = Array.from(current.text);
        let position = 0;
        current.item.classList.add('mentor__message--typing');

        function typeCharacter() {
            position += 1;
            current.item.textContent = characters.slice(0, position).join('');
            messages.scrollTop = messages.scrollHeight;
            if (position < characters.length) {
                window.setTimeout(typeCharacter, 18);
                return;
            }
            current.item.classList.remove('mentor__message--typing');
            typingActive = false;
            typeNextMessage();
        }

        typeCharacter();
    }

    function addMessage(text, who) {
        const author = who || 'mentor';
        const item = document.createElement('div');
        item.className = 'mentor__message mentor__message--' + author;
        messages.appendChild(item);
        if (author === 'mentor' && !reducedMotion) {
            item.setAttribute('aria-label', text);
            typingQueue.push({ item: item, text: text });
            typeNextMessage();
        } else {
            item.textContent = text;
        }
        messages.scrollTop = messages.scrollHeight;
    }

    function setActions(items) {
        actions.innerHTML = '';
        (items || []).forEach(function (item) {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = item[0];
            button.dataset.target = item[1];
            actions.appendChild(button);
        });
    }

    function openMentor() {
        document.dispatchEvent(new CustomEvent('hvt:mentor-opening'));
        state.opened = true;
        root.classList.add('mentor--open');
        panel.setAttribute('aria-hidden', 'false');
        panel.setAttribute('aria-modal', String(window.matchMedia('(max-width: 1100px)').matches));
        toggle.setAttribute('aria-expanded', 'true');
        document.body.classList.add('mentor-is-open');
        window.clearTimeout(hintTypingTimer);
        window.clearTimeout(hintHideTimer);
        hint.classList.remove('mentor__hint--show', 'mentor__hint--typing');
        if (!messages.children.length) speakFor(state.section || initialContext());
        window.setTimeout(function () { input.focus(); }, 220);
    }

    function closeMentor() {
        state.opened = false;
        root.classList.remove('mentor--open');
        panel.setAttribute('aria-hidden', 'true');
        panel.setAttribute('aria-modal', 'false');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('mentor-is-open');
        state.dismissed += 1;
        sessionStorage.setItem('mentor-dismissed', state.dismissed);
        toggle.focus();
    }

    function contextFor(id) {
        if (contexts[id]) return id;
        if (isPueblitoPage) return 'pueblito';
        if (id && id.indexOf('curso') !== -1) return 'cursos';
        return initialContext() in contexts ? initialContext() : 'home';
    }

    function speakFor(id) {
        const key = contextFor(id);
        const context = contexts[key];
        state.section = key;
        addMessage(context.prompt);
        setActions(context.actions);
    }

    function showHint(id) {
        if (state.opened || state.dismissed > 1) return;
        const key = contextFor(id);
        if (state.lastSuggestion === key) return;
        state.lastSuggestion = key;
        const text = contexts[key].prompt.split('. ')[0] + '.';
        const characters = Array.from(text);
        let position = 0;
        window.clearTimeout(hintTypingTimer);
        window.clearTimeout(hintHideTimer);
        hint.textContent = reducedMotion ? text : '';
        hint.setAttribute('aria-label', text);
        hint.classList.add('mentor__hint--show');
        if (reducedMotion) {
            hintHideTimer = window.setTimeout(function () { hint.classList.remove('mentor__hint--show'); }, 9000);
            return;
        }
        hint.classList.add('mentor__hint--typing');

        function typeHintCharacter() {
            position += 1;
            hint.textContent = characters.slice(0, position).join('');
            if (position < characters.length) {
                hintTypingTimer = window.setTimeout(typeHintCharacter, 22);
                return;
            }
            hint.classList.remove('mentor__hint--typing');
            hintHideTimer = window.setTimeout(function () { hint.classList.remove('mentor__hint--show'); }, 9000);
        }

        typeHintCharacter();
    }

    function money(value) {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency', currency: 'COP', maximumFractionDigits: 0
        }).format(Math.round(value));
    }

    function startQuote() {
        state.quote = { stage: 'service' };
        addMessage('SIMULADOR PRELIMINAR\n\nResponderé dos preguntas breves para ofrecerte un rango inicial. En esta primera prueba, el valor es únicamente ilustrativo.');
        setActions([
            ['Diagnóstico energético', 'quote:energy-audit'],
            ['Cancelar simulación', 'quote:cancel']
        ]);
    }

    function startDoorQuote() {
        state.quote = { stage: 'door-width', type: 'door', service: 'Puerta de madera' };
        addMessage('ESTIMADOR DE PUERTA — PRUEBA\n\nCalcularé un rango ilustrativo a partir del área y los componentes principales. Para comenzar, escribe el ancho de la puerta en metros; por ejemplo: 0,90.');
        setActions([['Cancelar estimación', 'quote:cancel']]);
    }

    function startGenericQuote(question) {
        state.quote = {
            stage: 'generic-details',
            type: 'generic',
            request: question
        };
        addMessage('Para ofrecerte una orientación adecuada, indícame la cantidad, las medidas o las características principales de lo que necesitas.');
        setActions([['Cancelar solicitud', 'quote:cancel']]);
    }

    const specializedServices = {
        solar: {
            name: 'Sistema solar',
            intro: 'Para orientar un sistema solar, indica el consumo mensual aproximado o valor de la factura, tipo de inmueble, área disponible y si buscas respaldo con baterías.'
        },
        wind: {
            name: 'Sistema eólico',
            intro: 'Para estudiar un sistema eólico, indica la necesidad de energía, tipo de predio, espacio disponible y si cuentas con mediciones o referencias del viento.'
        },
        hydro: {
            name: 'Sistema de energía hidráulica',
            intro: 'Para una primera orientación hidráulica, indica el uso esperado, caudal aproximado, desnivel disponible y si la fuente de agua mantiene flujo durante todo el año.'
        },
        water: {
            name: 'Sistema de ahorro de agua',
            intro: 'Para orientar el ahorro de agua, indica el tipo de inmueble, número de usuarios, consumo aproximado y si te interesa captación de lluvia, reutilización o dispositivos eficientes.'
        },
        humidity: {
            name: 'Solución para humedad en vivienda',
            intro: 'Para estudiar la humedad, indica cuántos espacios están afectados, qué señales observas —condensación, manchas, olor o filtración— y desde cuándo ocurre. La causa debe diagnosticarse antes de recomendar un filtro o equipo.'
        }
    };

    function serviceIntent(text) {
        const q = text.toLowerCase();
        if (/solar|panel(?:es)?|fotovolta/.test(q)) return 'solar';
        if (/e[oó]lic|aerogener|turbina de viento/.test(q)) return 'wind';
        if (/hidr[aá]ul|hidroel[eé]ct|micro.?central|turbina de agua/.test(q)) return 'hydro';
        if (/ahorro de agua|ahorrar agua|captaci[oó]n.*lluv|reutilizaci[oó]n.*agua/.test(q)) return 'water';
        if (/humedad|deshumid|filtraci[oó]n|moho/.test(q)) return 'humidity';
        return '';
    }

    function startSpecializedInquiry(key) {
        const service = specializedServices[key];
        state.quote = {
            stage: 'generic-details',
            type: 'generic',
            request: service.name
        };
        addMessage(service.intro);
        setActions([['Cancelar solicitud', 'quote:cancel']]);
    }

    function quoteAction(target, label) {
        if (target === 'quote:cancel') {
            state.quote = null;
            addMessage('La simulación ha terminado. Ninguna cifra fue guardada ni enviada.');
            setActions([['Explorar servicios', '/#services']]);
            return;
        }
        if (target === 'quote:energy-audit') {
            state.quote = { stage: 'area', service: 'Diagnóstico energético' };
            addMessage(label, 'user');
            addMessage('Para comenzar, escribe el área aproximada de la instalación en metros cuadrados. Puedes escribir, por ejemplo: 120.');
            setActions([['Cancelar simulación', 'quote:cancel']]);
        }
        if (target.indexOf('quote:door-quality-') === 0 && state.quote && state.quote.type === 'door') {
            state.quote.quality = target.replace('quote:door-quality-', '');
            state.quote.stage = 'door-installation';
            addMessage(label, 'user');
            addMessage('¿Deseas incluir la instalación en el rango?');
            setActions([
                ['Sí, con instalación', 'quote:door-install-yes'],
                ['No, solo suministro', 'quote:door-install-no'],
                ['Cancelar', 'quote:cancel']
            ]);
        }
        if (target.indexOf('quote:door-install-') === 0 && state.quote && state.quote.type === 'door') {
            state.quote.installation = target === 'quote:door-install-yes';
            state.quote.stage = 'door-location';
            addMessage(label, 'user');
            addMessage('Finalmente, escribe el municipio y departamento de entrega.');
            setActions([['Cancelar estimación', 'quote:cancel']]);
        }
    }

    function quoteInput(value) {
        if (!state.quote) return false;
        if (state.quote.stage === 'generic-details') {
            if (value.length < 3) {
                addMessage('Cuéntame brevemente la cantidad y las características principales.');
                return true;
            }
            state.quote.details = value;
            state.quote.stage = 'generic-location';
            addMessage('¿En qué municipio y departamento se requiere el producto o servicio?');
            return true;
        }
        if (state.quote.stage === 'generic-location') {
            if (value.length < 3) {
                addMessage('Escribe el municipio y, si es posible, el departamento.');
                return true;
            }
            state.quote.location = value;
            const whatsappMessage = encodeURIComponent(
                'Hola, deseo solicitar una cotización. ' +
                'Solicitud: ' + state.quote.request + '. ' +
                'Cantidad y características: ' + state.quote.details + '. ' +
                'Ubicación: ' + state.quote.location + '.'
            );
            addMessage(
                'SOLICITUD PREPARADA\n\n' +
                'Necesidad: ' + state.quote.request + '\n' +
                'Características: ' + state.quote.details + '\n' +
                'Ubicación: ' + state.quote.location + '\n\n' +
                'Con esta información, nuestro equipo podrá precisar el alcance y confirmar el valor de la cotización por WhatsApp.'
            );
            state.quote = null;
            setActions([
                ['Enviar por WhatsApp', 'https://wa.me/573209574884?text=' + whatsappMessage],
                ['Nueva solicitud', 'chat:generic-quote']
            ]);
            return true;
        }
        if (state.quote.stage === 'door-width' || state.quote.stage === 'door-height') {
            const dimension = Number(value.trim().replace(',', '.').replace(/[^0-9.]/g, ''));
            if (!Number.isFinite(dimension) || dimension < 0.4 || dimension > 5) {
                addMessage('Escribe la medida en metros, entre 0,40 y 5,00. Por ejemplo: 0,90.');
                return true;
            }
            if (state.quote.stage === 'door-width') {
                state.quote.width = dimension;
                state.quote.stage = 'door-height';
                addMessage('Ahora escribe la altura en metros; por ejemplo: 2,10.');
            } else {
                state.quote.height = dimension;
                state.quote.stage = 'door-quantity';
                addMessage('¿Cuántas puertas necesitas?');
            }
            return true;
        }
        if (state.quote.stage === 'door-quantity') {
            const quantity = Number(value.replace(/[^0-9]/g, ''));
            if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
                addMessage('Escribe una cantidad entre 1 y 100.');
                return true;
            }
            state.quote.quantity = quantity;
            state.quote.stage = 'door-quality';
            addMessage('Selecciona una categoría general. La cotización formal definirá la especie de madera, el acabado y los herrajes exactos.');
            setActions([
                ['Económica', 'quote:door-quality-economic'],
                ['Estándar', 'quote:door-quality-standard'],
                ['Premium', 'quote:door-quality-premium'],
                ['Cancelar', 'quote:cancel']
            ]);
            return true;
        }
        if (state.quote.stage === 'door-quality' || state.quote.stage === 'door-installation') {
            addMessage('Utiliza una de las opciones disponibles para continuar.');
            return true;
        }
        if (state.quote.stage === 'door-location') {
            if (value.length < 3) {
                addMessage('Escribe el municipio y, si es posible, el departamento.');
                return true;
            }
            state.quote.location = value;
            const areaUnit = state.quote.width * state.quote.height;
            const totalArea = areaUnit * state.quote.quantity;
            const ranges = {
                economic: [280000, 420000],
                standard: [450000, 650000],
                premium: [700000, 1050000]
            };
            const labels = { economic: 'Económica', standard: 'Estándar', premium: 'Premium' };
            const unitRange = ranges[state.quote.quality];
            const frameMin = 180000 * state.quote.quantity;
            const frameMax = 320000 * state.quote.quantity;
            const hardwareMin = 90000 * state.quote.quantity;
            const hardwareMax = 220000 * state.quote.quantity;
            const installationMin = state.quote.installation ? 120000 * state.quote.quantity : 0;
            const installationMax = state.quote.installation ? 220000 * state.quote.quantity : 0;
            const directMin = totalArea * unitRange[0] + frameMin + hardwareMin + installationMin;
            const directMax = totalArea * unitRange[1] + frameMax + hardwareMax + installationMax;
            const minimum = directMin * 1.12;
            const maximum = directMax * 1.25;
            const whatsappMessage = encodeURIComponent(
                'Hola, deseo una cotización formal para ' + state.quote.quantity + ' puerta(s) de madera. ' +
                'Medidas: ' + state.quote.width + ' m × ' + state.quote.height + ' m. ' +
                'Categoría: ' + labels[state.quote.quality] + '. ' +
                'Instalación: ' + (state.quote.installation ? 'sí' : 'no') + '. ' +
                'Ubicación: ' + state.quote.location + '. ' +
                'Rango preliminar mostrado por Mentor: ' + money(minimum) + ' a ' + money(maximum) + '.'
            );
            addMessage(
                'RANGO PRELIMINAR\n\n' +
                state.quote.quantity + ' puerta(s) de ' + state.quote.width.toLocaleString('es-CO') + ' m × ' + state.quote.height.toLocaleString('es-CO') + ' m\n' +
                'Área total: ' + totalArea.toLocaleString('es-CO', { maximumFractionDigits: 2 }) + ' m²\n' +
                'Categoría: ' + labels[state.quote.quality] + '\n' +
                'Instalación: ' + (state.quote.installation ? 'incluida' : 'no incluida') + '\n' +
                'Ubicación: ' + state.quote.location + '\n\n' +
                money(minimum) + ' – ' + money(maximum) + '\n\n' +
                'Valor ilustrativo de prueba. El precio definitivo dependerá de la madera, el diseño, el marco, los herrajes, el acabado, el transporte y la verificación humana.'
            );
            state.quote = null;
            setActions([
                ['Cotizar por WhatsApp', 'https://wa.me/573209574884?text=' + whatsappMessage],
                ['Calcular otra puerta', 'quote:door-start']
            ]);
            return true;
        }
        if (state.quote.stage === 'area') {
            const normalized = value.replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '');
            const area = Number(normalized);
            if (!Number.isFinite(area) || area < 10 || area > 100000) {
                addMessage('Necesito un área entre 10 y 100.000 m² para continuar con esta demostración.');
                return true;
            }
            state.quote.area = area;
            state.quote.stage = 'location';
            addMessage('El territorio modifica los costos y las condiciones de desplazamiento. ¿En qué municipio y departamento se realizaría el diagnóstico?');
            return true;
        }
        if (state.quote.stage === 'location') {
            if (value.length < 3) {
                addMessage('Escribe el municipio y, si es posible, el departamento.');
                return true;
            }
            state.quote.location = value;
            /* Valores exclusivamente demostrativos; no son precios comerciales ni SECOP. */
            const materials = state.quote.area * 2500 * 1.10;
            const labor = state.quote.area * 6500 * 1.15;
            const direct = materials + labor + 450000;
            const central = direct * (1 + 0.12 + 0.05 + 0.08);
            const minimum = central * 0.90;
            const maximum = central * 1.15;
            const whatsappMessage = encodeURIComponent(
                'Hola, deseo solicitar una cotización formal para un diagnóstico energético. ' +
                'Área aproximada: ' + state.quote.area + ' m². ' +
                'Ubicación: ' + state.quote.location + '. ' +
                'Rango preliminar mostrado por Mentor: ' + money(minimum) + ' a ' + money(maximum) + '.'
            );
            addMessage(
                'RANGO PRELIMINAR\n\n' +
                'Servicio: ' + state.quote.service + '\n' +
                'Área: ' + state.quote.area.toLocaleString('es-CO') + ' m²\n' +
                'Ubicación: ' + state.quote.location + '\n\n' +
                money(minimum) + ' – ' + money(maximum) + '\n\n' +
                'Valor ilustrativo de prueba. El precio definitivo será establecido por una persona del equipo después de conocer el alcance completo.'
            );
            state.quote = null;
            setActions([
                ['Solicitar cotización por WhatsApp', 'https://wa.me/573209574884?text=' + whatsappMessage],
                ['Repetir estimación', 'chat:cotizar']
            ]);
            return true;
        }
        return false;
    }

    function answer(question) {
        const q = question.toLowerCase();
        if (isPueblitoPage) {
            if (/pueblito-transparencia|ya funciona|ya existe|ya est[aá] instalado|instalaci[oó]n.*hidr[oó]geno|hidr[oó]geno.*instalado/.test(q)) return [
                'No afirmamos que Pueblito Boyacense funcione actualmente con hidrógeno ni que Hidrógeno Verde Turquesa haya instalado allí uno de estos sistemas. La página presenta una visión territorial y varias hipótesis que requerirían estudios, acuerdos, permisos, diseño y verificación de seguridad.',
                [['Ver preguntas y respuestas', '#preguntas-pueblito'], ['Conocer la visión', '#vision']]
            ];
            if (/pueblito-arquitectura|arquitect|colonial|casa|cabaña|fachada|patrimonio/.test(q)) return [
                'La tecnología debe adaptarse a la vivienda y no al contrario. Primero se estudian orientación, ventilación, luz, materiales, demanda y valor arquitectónico; después se plantean intervenciones discretas, seguras, mantenibles y, cuando corresponda, reversibles.',
                [['Explorar la casa', '#casa-viva'], ['Ver materiales', '#materiales']]
            ];
            if (/pueblito-materiales|material|tierra|madera|piedra|fibra|biobasad|sismo|incendio|bioclim/.test(q)) return [
                'Un material tradicional o biobasado no se valida solo por ser natural. Debe caracterizarse y ensayarse como parte de un sistema completo: estructura y uniones, humedad, durabilidad, comportamiento térmico, fuego, mantenimiento y normativa aplicable.',
                [['Ver la mesa de materiales', '#materiales'], ['Explorar proyectos', '#proyectos-relacionados']]
            ];
            if (/soberan[ií]a.*aliment|alimento|huerta|cultivo|agua/.test(q)) return [
                'La soberanía alimentaria necesita energía para agua segura, riego, conservación, frío, monitoreo y transformación local. La propuesta no reduce el territorio a energía: conecta agua, suelo, alimentos, biodiversidad y conocimiento cotidiano.',
                [['Ver el plano territorial', '#ecosistema'], ['Explorar la casa', '#casa-viva']]
            ];
            if (/pueblito-hidrogeno|hidr[oó]geno|electr[oó]lisis|energ[ií]a/.test(q)) return [
                'Aquí el hidrógeno se entiende como vector energético, no como fuente primaria ni como solución automática. Solo tendría sentido después de reducir la demanda y comparar alternativas, y si demuestra necesidad, seguridad, viabilidad y beneficio territorial.',
                [['Ver preguntas necesarias', '#preguntas-pueblito'], ['Conocer proyectos relacionados', '#proyectos-relacionados']]
            ];
            if (/turis|visitar|sitio oficial|portal oficial|conocer pueblito|direcci[oó]n|llegar/.test(q)) return [
                'Esta es la página de la visión de Hidrógeno Verde Turquesa desde el territorio. Para información turística, cultural, de acceso o programación de Pueblito Boyacense, la fuente adecuada es su portal oficial.',
                [['Visitar el portal oficial', 'https://pueblitoboyacense.org/'], ['Ver memoria visual', '#memoria-visual']]
            ];
            if (/pueblito-vision|qu[eé] propone|de qu[eé] trata|esta p[aá]gina|visi[oó]n|pueblito|boyacense|duitama/.test(q)) return [
                'La página propone investigar cómo la soberanía energética y alimentaria, la vivienda eficiente, el hidrógeno y los materiales bioclimáticos pueden convivir con la arquitectura y la cultura de Pueblito Boyacense. Es una visión de integración responsable, no el anuncio de una obra ya ejecutada.',
                [['Recorrer el plano', '#ecosistema'], ['Explorar la casa', '#casa-viva'], ['Ver preguntas', '#preguntas-pueblito']]
            ];
        }
        const specialized = serviceIntent(q);
        if (specialized) {
            const service = specializedServices[specialized];
            return [
                service.name + ' requiere reconocer primero el recurso, la necesidad y las condiciones del lugar. Puedo reunir la información inicial para que el equipo determine la solución adecuada.',
                [['Preparar solicitud', 'chat:service-' + specialized], ['Hablar por WhatsApp', 'https://wa.me/573209574884?text=' + encodeURIComponent('Hola, deseo información sobre: ' + service.name)]]
            ];
        }
        if (/puerta|madera|carpinter/.test(q)) return [
            'El valor de una puerta de madera depende de sus dimensiones, la especie de madera, el acabado, los herrajes, la instalación y el lugar de entrega. Puedo reunir estos datos y ayudarte a solicitar una cotización con el equipo.',
            [['Cotizar por WhatsApp', 'https://wa.me/573209574884?text=' + encodeURIComponent('Hola, deseo cotizar una puerta de madera. Necesito orientación sobre medidas, tipo de madera, acabado, herrajes e instalación.')], ['Explorar servicios', '/#services']]
        ];
        if (/precio|costo|cotiza|presupuesto/.test(q)) return ['El costo no es una cifra aislada: es el reflejo de una escala, un territorio y un propósito. Para orientarte con rigor, conviene conocer la ubicación, la necesidad y el alcance de tu iniciativa.', [['Preparar consulta', 'chat:consulta'], ['Contactar al equipo', '/#contact']]];
        if (/curso|aprender|estudi|principiante/.test(q)) return ['El aprendizaje más sólido comienza donde la curiosidad encuentra una ruta. Puedes iniciar con nuestros cursos y avanzar desde los fundamentos hacia aplicaciones concretas.', [['Ver cursos', '/fundacion#cursos']]];
        if (/servicio|proyecto|asesor|idea|similar/.test(q)) return ['Una idea adquiere forma cuando se reconocen sus condiciones. Cuéntame, en una frase, qué deseas transformar y en qué territorio; con ello podré señalarte una línea de trabajo adecuada.', [['Ver líneas de servicio', '/#services'], ['Contactar', '/#contact']]];
        if (/hidrogen|electrol|energ/.test(q)) return ['La energía es posibilidad antes de convertirse en servicio. En el hidrógeno, esa posibilidad depende de cómo se produce, almacena y utiliza. Puedo conducirte hacia formación o hacia una evaluación aplicada.', [['Quiero aprender', '/fundacion#cursos'], ['Tengo un proyecto', '/#services']]];
        if (/fundaci|particip|miembro/.test(q)) return ['El conocimiento crece cuando circula. La fundación reúne formación, participación y acción territorial para convertir el aprendizaje en capacidad compartida.', [['Conocer la fundación', '/fundacion'], ['Ver cursos', '/fundacion#cursos']]];
        return ['Toda pregunta señala un horizonte, aunque aún no tenga un nombre preciso. Puedo orientarte mejor si eliges entre aprender sobre el tema, explorar un servicio o conversar acerca de un proyecto.', [['Quiero aprender', '/fundacion#cursos'], ['Explorar servicios', '/#services'], ['Tengo un proyecto', 'chat:proyecto']]];
    }

    function handleTarget(target, label) {
        if (target.indexOf('quote:') === 0) {
            if (!PUBLIC_PRICE_RANGES_ENABLED) {
                addMessage(label, 'user');
                startGenericQuote('Solicitud de cotización');
                return;
            }
            if (target === 'quote:door-start') {
                addMessage(label, 'user');
                startDoorQuote();
                return;
            }
            quoteAction(target, label);
            return;
        }
        if (target.indexOf('chat:') === 0) {
            if (target === 'chat:cotizar') {
                addMessage(label, 'user');
                if (PUBLIC_PRICE_RANGES_ENABLED) {
                    startQuote();
                } else {
                    startGenericQuote('Solicitud de producto o servicio');
                }
                return;
            }
            if (target === 'chat:generic-quote') {
                addMessage(label, 'user');
                startGenericQuote('Nueva solicitud de producto o servicio');
                return;
            }
            if (target.indexOf('chat:service-') === 0) {
                addMessage(label, 'user');
                startSpecializedInquiry(target.replace('chat:service-', ''));
                return;
            }
            const result = answer(target.slice(5));
            addMessage(label, 'user');
            window.setTimeout(function () { addMessage(result[0]); setActions(result[1]); }, 260);
            return;
        }
        if (/^https?:\/\//.test(target)) {
            window.open(target, '_blank', 'noopener');
        } else {
            location.href = target;
        }
    }

    toggle.addEventListener('click', function () { state.opened ? closeMentor() : openMentor(); });
    root.querySelector('.mentor__close').addEventListener('click', closeMentor);
    hint.addEventListener('click', openMentor);
    document.addEventListener('click', function (event) {
        const opener = event.target.closest('[data-open-mentor]');
        if (opener) {
            event.preventDefault();
            openMentor();
            return;
        }
        if (state.opened && !root.contains(event.target)) closeMentor();
    });
    actions.addEventListener('click', function (event) {
        const button = event.target.closest('button');
        if (button) handleTarget(button.dataset.target, button.textContent);
    });
    root.querySelector('form').addEventListener('submit', function (event) {
        event.preventDefault();
        const question = input.value.trim();
        if (!question) return;
        addMessage(question, 'user');
        input.value = '';
        if (quoteInput(question)) return;
        if (/puerta|madera|carpinter/i.test(question)) {
            if (PUBLIC_PRICE_RANGES_ENABLED) {
                startDoorQuote();
            } else {
                startGenericQuote(question);
            }
            return;
        }
        const specialized = serviceIntent(question);
        if (specialized && /precio|costo|cotiza|presupuesto|cu[aá]nto vale|cuesta|valor|necesito|quiero/i.test(question)) {
            startSpecializedInquiry(specialized);
            return;
        }
        if (/precio|costo|cotiza|presupuesto|cu[aá]nto vale|cuesta|valor/i.test(question)) {
            startGenericQuote(question);
            return;
        }
        const result = answer(question);
        window.setTimeout(function () { addMessage(result[0]); setActions(result[1]); }, 320);
    });
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && state.opened) closeMentor();
    });

    const sections = Array.from(document.querySelectorAll('section[id]'));
    if ('IntersectionObserver' in window && sections.length) {
        const observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting || entry.intersectionRatio < 0.28) return;
                const id = contextFor(entry.target.id);
                if (state.section === id) return;
                state.section = id;
                state.visits[id] = (state.visits[id] || 0) + 1;
                sessionStorage.setItem('mentor-visits', JSON.stringify(state.visits));
                window.clearTimeout(state.hintTimer);
                state.hintTimer = window.setTimeout(function () { showHint(id); }, state.visits[id] > 1 ? 2600 : 5200);
            });
        }, { threshold: [0.28, 0.55] });
        sections.forEach(function (section) { observer.observe(section); });
    } else {
        state.section = contextFor(initialContext());
    }

    window.setTimeout(function () { showHint(state.section || initialContext()); }, 6500);
})();
