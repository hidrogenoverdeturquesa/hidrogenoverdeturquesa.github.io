(() => {
    const canvas = document.querySelector('#nsga-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const populationSize = 48;
    let width = 0;
    let height = 0;
    let generation = 0;
    let population = [];
    let front = [];
    let selected = null;
    let running = false;
    let lastGeneration = 0;
    let seed = 1987;

    const ui = {
        status: document.querySelector('#nsga-status'), generation: document.querySelector('#nsga-generation'),
        front: document.querySelector('#nsga-front'), choice: document.querySelector('#nsga-choice'),
        detail: document.querySelector('#nsga-choice-detail'), priority: document.querySelector('#nsga-priority'),
        priorityValue: document.querySelector('#nsga-priority-value'), step: document.querySelector('#nsga-step'),
        run: document.querySelector('#nsga-run'), reset: document.querySelector('#nsga-reset')
    };

    const random = () => {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
    };
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

    function evaluate(candidate) {
        const solar = candidate.solar;
        const storage = candidate.storage;
        const efficiency = candidate.efficiency;
        const investment = 18500 + solar * 780 + storage * 360 + efficiency * 210;
        const operation = 17800 - solar * 120 - storage * 38 - efficiency * 290 + Math.abs(storage - solar * .7) * 48;
        candidate.cost = investment / 12 + operation;
        candidate.emissions = clamp(84 - solar * 1.45 - storage * .38 - efficiency * 1.1 + Math.max(0, storage - solar) * .22, 10, 98);
        candidate.solar = Math.round(solar * 10) / 10;
        candidate.storage = Math.round(storage * 10) / 10;
        candidate.efficiency = Math.round(efficiency * 10) / 10;
        return candidate;
    }

    function makeCandidate() {
        return evaluate({ solar: 4 + random() * 42, storage: random() * 32, efficiency: random() * 18 });
    }

    function dominates(a, b) {
        return a.cost <= b.cost && a.emissions <= b.emissions && (a.cost < b.cost || a.emissions < b.emissions);
    }

    function nonDominatedSort(candidates) {
        const remaining = candidates.slice();
        const fronts = [];
        let rank = 0;
        while (remaining.length) {
            const current = remaining.filter(candidate => !remaining.some(other => dominates(other, candidate)));
            current.forEach(candidate => { candidate.rank = rank; candidate.crowding = 0; });
            ['cost', 'emissions'].forEach(objective => {
                current.sort((a, b) => a[objective] - b[objective]);
                current[0].crowding = Infinity;
                current[current.length - 1].crowding = Infinity;
                const span = Math.max(1, current[current.length - 1][objective] - current[0][objective]);
                for (let i = 1; i < current.length - 1; i += 1) current[i].crowding += (current[i + 1][objective] - current[i - 1][objective]) / span;
            });
            fronts.push(current);
            current.forEach(candidate => remaining.splice(remaining.indexOf(candidate), 1));
            rank += 1;
        }
        return fronts;
    }

    function rankPopulation() {
        const fronts = nonDominatedSort(population);
        front = fronts[0] || [];
        front.sort((a, b) => a.cost - b.cost);
        ui.front.textContent = front.length;
        setStage('rank');
    }

    function pickParent() {
        const contenders = Array.from({ length: 3 }, () => population[Math.floor(random() * population.length)]);
        return contenders.sort((a, b) => (a.rank - b.rank) || (b.crowding - a.crowding))[0];
    }

    function evolve() {
        setStage('evaluate');
        rankPopulation();
        setStage('evolve');
        const offspring = [];
        while (offspring.length < populationSize) {
            const one = pickParent();
            const two = pickParent();
            offspring.push(evaluate({
                solar: clamp((one.solar + two.solar) / 2 + (random() - .5) * 7, 2, 50),
                storage: clamp((one.storage + two.storage) / 2 + (random() - .5) * 6, 0, 35),
                efficiency: clamp((one.efficiency + two.efficiency) / 2 + (random() - .5) * 4, 0, 20)
            }));
        }
        const fronts = nonDominatedSort(population.concat(offspring));
        const nextPopulation = [];
        fronts.forEach(current => {
            if (nextPopulation.length >= populationSize) return;
            const available = populationSize - nextPopulation.length;
            if (current.length <= available) nextPopulation.push(...current);
            else nextPopulation.push(...current.slice().sort((a, b) => b.crowding - a.crowding).slice(0, available));
        });
        population = nextPopulation;
        generation += 1;
        rankPopulation();
        ui.generation.textContent = generation;
        ui.status.textContent = `Generación ${generation}: ${front.length} alternativas no dominadas`;
        chooseByPriority();
    }

    function setStage(stage) {
        document.querySelectorAll('[data-nsga-stage]').forEach(item => item.classList.toggle('is-active', item.dataset.nsgaStage === stage));
    }

    function chooseByPriority() {
        if (!front.length) return;
        const priority = Number(ui.priority.value) / 100;
        const costMin = Math.min(...front.map(point => point.cost));
        const costMax = Math.max(...front.map(point => point.cost));
        const emissionMin = Math.min(...front.map(point => point.emissions));
        const emissionMax = Math.max(...front.map(point => point.emissions));
        selected = front.reduce((best, candidate) => {
            const candidateScore = (1 - priority) * ((candidate.cost - costMin) / Math.max(1, costMax - costMin)) + priority * ((candidate.emissions - emissionMin) / Math.max(1, emissionMax - emissionMin));
            const bestScore = (1 - priority) * ((best.cost - costMin) / Math.max(1, costMax - costMin)) + priority * ((best.emissions - emissionMin) / Math.max(1, emissionMax - emissionMin));
            return candidateScore < bestScore ? candidate : best;
        });
        updateChoice();
    }

    function updateChoice() {
        if (!selected) return;
        ui.choice.textContent = `Solar ${selected.solar} kW · Batería ${selected.storage} kWh`;
        ui.detail.textContent = `$${Math.round(selected.cost).toLocaleString('es-CO')}/año · ${selected.emissions.toFixed(1)} tCO₂e/año · Eficiencia ${selected.efficiency}%`;
    }

    function scales() {
        const costValues = population.map(point => point.cost);
        const emissionValues = population.map(point => point.emissions);
        return { minCost: Math.min(...costValues) * .96, maxCost: Math.max(...costValues) * 1.04, minEmission: Math.min(...emissionValues) * .92, maxEmission: Math.max(...emissionValues) * 1.06 };
    }

    function toCanvas(point, scale) {
        const pad = { left: 65, right: 28, top: 32, bottom: 58 };
        const plotWidth = width - pad.left - pad.right;
        const plotHeight = height - pad.top - pad.bottom;
        return {
            x: pad.left + ((point.cost - scale.minCost) / (scale.maxCost - scale.minCost)) * plotWidth,
            y: pad.top + ((scale.maxEmission - point.emissions) / (scale.maxEmission - scale.minEmission)) * plotHeight
        };
    }

    function draw() {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#112526';
        ctx.fillRect(0, 0, width, height);
        const scale = scales();
        const pad = { left: 65, right: 28, top: 32, bottom: 58 };
        ctx.strokeStyle = 'rgba(255,255,255,.11)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 5; i += 1) {
            const y = pad.top + ((height - pad.top - pad.bottom) * i / 4);
            ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(width - pad.right, y); ctx.stroke();
        }
        ctx.fillStyle = 'rgba(255,255,255,.55)';
        ctx.font = '700 11px Manrope, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Costo anualizado →', width / 2, height - 18);
        ctx.save(); ctx.translate(17, height / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('Emisiones anuales →', 0, 0); ctx.restore();
        population.forEach(point => {
            const position = toCanvas(point, scale);
            ctx.beginPath(); ctx.arc(position.x, position.y, 4.6, 0, Math.PI * 2);
            ctx.fillStyle = point.rank === 0 ? '#44dfce' : 'rgba(181, 206, 201, .38)';
            ctx.fill();
        });
        if (front.length > 1) {
            ctx.beginPath();
            front.forEach((point, index) => {
                const position = toCanvas(point, scale);
                index ? ctx.lineTo(position.x, position.y) : ctx.moveTo(position.x, position.y);
            });
            ctx.strokeStyle = '#44dfce'; ctx.lineWidth = 2; ctx.stroke();
        }
        if (selected) {
            const position = toCanvas(selected, scale);
            ctx.beginPath(); ctx.arc(position.x, position.y, 10, 0, Math.PI * 2);
            ctx.strokeStyle = '#ffbe54'; ctx.lineWidth = 3; ctx.stroke();
        }
    }

    function reset() {
        seed = 1987;
        generation = 0;
        population = Array.from({ length: populationSize }, makeCandidate);
        rankPopulation();
        selected = null;
        ui.generation.textContent = '0';
        ui.status.textContent = 'Población inicial lista';
        ui.choice.textContent = 'Selecciona un punto';
        ui.detail.textContent = 'Haz clic en un punto del frente para inspeccionar sus intercambios.';
        setStage('evaluate');
        draw();
    }

    function resize() {
        const bounds = canvas.parentElement.getBoundingClientRect();
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        width = Math.max(300, bounds.width);
        height = Math.max(390, Math.min(570, width * .64));
        canvas.width = Math.floor(width * ratio); canvas.height = Math.floor(height * ratio); canvas.style.height = `${height}px`;
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        if (population.length) draw();
    }

    function animate(timestamp) {
        if (running && timestamp - lastGeneration > 650) { evolve(); lastGeneration = timestamp; }
        requestAnimationFrame(animate);
    }

    ui.priority.addEventListener('input', () => {
        const value = Number(ui.priority.value);
        ui.priorityValue.textContent = value < 35 ? 'Menor costo' : value > 65 ? 'Menores emisiones' : 'Equilibrada';
        chooseByPriority(); draw();
    });
    ui.step.addEventListener('click', () => { running = false; ui.run.textContent = 'Ejecutar evolución'; evolve(); draw(); });
    ui.run.addEventListener('click', () => { running = !running; ui.run.textContent = running ? 'Pausar evolución' : 'Ejecutar evolución'; ui.status.textContent = running ? 'Generando y evaluando nuevas alternativas' : 'Evolución en pausa'; });
    ui.reset.addEventListener('click', () => { running = false; ui.run.textContent = 'Ejecutar evolución'; reset(); });
    canvas.addEventListener('click', event => {
        const rect = canvas.getBoundingClientRect();
        const scale = scales();
        const click = { x: event.clientX - rect.left, y: event.clientY - rect.top };
        const closest = population.map(point => ({ point, position: toCanvas(point, scale) })).sort((a, b) => Math.hypot(a.position.x - click.x, a.position.y - click.y) - Math.hypot(b.position.x - click.x, b.position.y - click.y))[0];
        if (closest && Math.hypot(closest.position.x - click.x, closest.position.y - click.y) < 18) { selected = closest.point; updateChoice(); draw(); }
    });
    window.addEventListener('resize', resize);
    resize(); reset(); requestAnimationFrame(animate);
})();
