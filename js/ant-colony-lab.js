(() => {
    const canvas = document.querySelector('#ant-canvas');
    if (!canvas) return;

    const context = canvas.getContext('2d');
    const points = [
        { x: .12, y: .66, name: 'Base' }, { x: .26, y: .28, name: 'A' },
        { x: .43, y: .48, name: 'B' }, { x: .58, y: .18, name: 'C' },
        { x: .73, y: .36, name: 'D' }, { x: .85, y: .70, name: 'E' },
        { x: .56, y: .76, name: 'F' }, { x: .30, y: .82, name: 'G' }
    ];
    const antCount = 18;
    let width = 0;
    let height = 0;
    let iteration = 0;
    let running = false;
    let lastStep = 0;
    let bestRoute = null;
    let bestLength = Infinity;
    let pheromone = [];
    let recentRoutes = [];
    let dragIndex = null;

    const controls = {
        alpha: document.querySelector('#ant-alpha'),
        beta: document.querySelector('#ant-beta'),
        evaporation: document.querySelector('#ant-evaporation'),
        speed: document.querySelector('#ant-speed'),
        step: document.querySelector('#ant-step'),
        run: document.querySelector('#ant-run'),
        reset: document.querySelector('#ant-reset'),
        status: document.querySelector('#ant-status'),
        best: document.querySelector('#ant-best'),
        iteration: document.querySelector('#ant-iteration')
    };

    const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const edgeKey = (a, b) => a < b ? `${a}-${b}` : `${b}-${a}`;
    const pointAt = index => ({ x: points[index].x * width, y: points[index].y * height });

    function setStage(stage) {
        document.querySelectorAll('[data-ant-stage]').forEach(item => item.classList.toggle('is-active', item.dataset.antStage === stage));
    }

    function reset() {
        iteration = 0;
        bestRoute = null;
        bestLength = Infinity;
        recentRoutes = [];
        pheromone = [];
        for (let i = 0; i < points.length; i += 1) {
            for (let j = i + 1; j < points.length; j += 1) pheromone[edgeKey(i, j)] = 1;
        }
        controls.best.textContent = '--';
        controls.iteration.textContent = '0';
        controls.status.textContent = 'Lista para iniciar';
        setStage('initialize');
        draw(performance.now());
    }

    function chooseNext(current, remaining, alpha, beta) {
        const currentPoint = pointAt(current);
        const weights = remaining.map(next => {
            const edge = pheromone[edgeKey(current, next)] || 0.001;
            const nextPoint = pointAt(next);
            return Math.pow(edge, alpha) * Math.pow(1 / Math.max(distance(currentPoint, nextPoint), 1), beta);
        });
        const total = weights.reduce((sum, weight) => sum + weight, 0);
        let random = Math.random() * total;
        for (let i = 0; i < remaining.length; i += 1) {
            random -= weights[i];
            if (random <= 0) return remaining[i];
        }
        return remaining[remaining.length - 1];
    }

    function createRoute() {
        const alpha = Number(controls.alpha.value);
        const beta = Number(controls.beta.value);
        const available = points.map((_, index) => index).slice(1);
        const route = [0];
        while (available.length) {
            const next = chooseNext(route[route.length - 1], available, alpha, beta);
            route.push(next);
            available.splice(available.indexOf(next), 1);
        }
        route.push(0);
        let length = 0;
        for (let i = 0; i < route.length - 1; i += 1) length += distance(pointAt(route[i]), pointAt(route[i + 1]));
        return { route, length };
    }

    function step() {
        const routes = Array.from({ length: antCount }, createRoute);
        const evaporation = 1 - Number(controls.evaporation.value);
        Object.keys(pheromone).forEach(key => { pheromone[key] = Math.max(.02, pheromone[key] * evaporation); });
        routes.forEach(result => {
            const deposit = 950 / Math.max(result.length, 1);
            for (let i = 0; i < result.route.length - 1; i += 1) pheromone[edgeKey(result.route[i], result.route[i + 1])] += deposit;
            if (result.length < bestLength) {
                bestLength = result.length;
                bestRoute = result.route;
            }
        });
        recentRoutes = routes.sort((a, b) => a.length - b.length).slice(0, 6);
        iteration += 1;
        controls.best.textContent = Math.round(bestLength).toLocaleString('es-CO');
        controls.iteration.textContent = iteration;
        controls.status.textContent = `Explorando ${antCount} rutas en la iteración ${iteration}`;
        setStage('reinforce');
    }

    function drawLine(from, to, color, lineWidth) {
        context.beginPath();
        context.moveTo(from.x, from.y);
        context.lineTo(to.x, to.y);
        context.strokeStyle = color;
        context.lineWidth = lineWidth;
        context.stroke();
    }

    function draw(timestamp) {
        context.clearRect(0, 0, width, height);
        const maxTrail = Math.max(...Object.values(pheromone), 1);
        for (let i = 0; i < points.length; i += 1) {
            for (let j = i + 1; j < points.length; j += 1) {
                const trail = pheromone[edgeKey(i, j)] / maxTrail;
                drawLine(pointAt(i), pointAt(j), `rgba(80, 242, 217, ${.05 + trail * .56})`, .6 + trail * 4);
            }
        }
        if (bestRoute) {
            for (let i = 0; i < bestRoute.length - 1; i += 1) drawLine(pointAt(bestRoute[i]), pointAt(bestRoute[i + 1]), 'rgba(255, 188, 80, .95)', 4);
        }
        recentRoutes.forEach((result, index) => {
            const routePosition = ((timestamp / 2300) + index / recentRoutes.length) % 1;
            let partial = routePosition * (result.route.length - 1);
            const edge = Math.floor(partial);
            partial -= edge;
            const from = pointAt(result.route[edge]);
            const to = pointAt(result.route[Math.min(edge + 1, result.route.length - 1)]);
            const x = from.x + (to.x - from.x) * partial;
            const y = from.y + (to.y - from.y) * partial;
            context.beginPath();
            context.arc(x, y, 4.2, 0, Math.PI * 2);
            context.fillStyle = '#ffbc50';
            context.fill();
        });
        points.forEach((point, index) => {
            const coordinate = pointAt(index);
            context.beginPath();
            context.arc(coordinate.x, coordinate.y, index === 0 ? 11 : 8, 0, Math.PI * 2);
            context.fillStyle = index === 0 ? '#ffffff' : '#0c9c8c';
            context.fill();
            context.lineWidth = 3;
            context.strokeStyle = '#102526';
            context.stroke();
            context.fillStyle = '#d9f3ed';
            context.font = '700 12px Manrope, sans-serif';
            context.textAlign = 'center';
            context.fillText(point.name, coordinate.x, coordinate.y - 17);
        });
    }

    function animate(timestamp) {
        if (running) {
            const speed = Number(controls.speed.value);
            const delay = speed === 1 ? 960 : speed === 2 ? 620 : 320;
            if (timestamp - lastStep <= delay) {
                draw(timestamp);
                requestAnimationFrame(animate);
                return;
            }
            setStage('explore');
            step();
            lastStep = timestamp;
        }
        draw(timestamp);
        requestAnimationFrame(animate);
    }

    function resize() {
        const bounds = canvas.parentElement.getBoundingClientRect();
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        width = Math.max(300, bounds.width);
        height = Math.max(360, Math.min(560, width * .62));
        canvas.width = Math.floor(width * ratio);
        canvas.height = Math.floor(height * ratio);
        canvas.style.height = `${height}px`;
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        draw(performance.now());
    }

    [controls.alpha, controls.beta, controls.evaporation].forEach(input => {
        const output = document.querySelector(`#${input.id}-value`);
        input.addEventListener('input', () => { output.textContent = input.value; });
    });
    controls.speed.addEventListener('input', () => {
        document.querySelector('#ant-speed-value').textContent = ['Lenta', 'Media', 'Rápida'][Number(controls.speed.value) - 1];
    });
    controls.step.addEventListener('click', () => {
        running = false;
        controls.run.textContent = 'Continuar exploración';
        setStage('explore');
        step();
    });
    controls.run.addEventListener('click', () => {
        running = !running;
        controls.run.textContent = running ? 'Pausar exploración' : 'Continuar exploración';
        controls.status.textContent = running ? 'La colonia está explorando alternativas' : 'Exploración en pausa';
    });
    controls.reset.addEventListener('click', () => { running = false; controls.run.textContent = 'Iniciar exploración'; reset(); });
    canvas.addEventListener('pointerdown', event => {
        const bounds = canvas.getBoundingClientRect();
        const x = event.clientX - bounds.left;
        const y = event.clientY - bounds.top;
        dragIndex = points.findIndex((_, index) => Math.hypot(pointAt(index).x - x, pointAt(index).y - y) < 20);
        if (dragIndex >= 0) {
            running = false;
            canvas.setPointerCapture(event.pointerId);
            controls.status.textContent = `Moviendo el nodo ${points[dragIndex].name}`;
        }
    });
    canvas.addEventListener('pointermove', event => {
        if (dragIndex === null || dragIndex < 0) return;
        const bounds = canvas.getBoundingClientRect();
        points[dragIndex].x = Math.max(.05, Math.min(.95, (event.clientX - bounds.left) / width));
        points[dragIndex].y = Math.max(.08, Math.min(.92, (event.clientY - bounds.top) / height));
        draw(performance.now());
    });
    canvas.addEventListener('pointerup', event => {
        if (dragIndex === null || dragIndex < 0) return;
        canvas.releasePointerCapture(event.pointerId);
        dragIndex = null;
        controls.run.textContent = 'Iniciar exploración';
        reset();
        controls.status.textContent = 'Red actualizada. Lista para explorar.';
    });
    window.addEventListener('resize', resize);
    resize();
    reset();
    requestAnimationFrame(animate);
})();
