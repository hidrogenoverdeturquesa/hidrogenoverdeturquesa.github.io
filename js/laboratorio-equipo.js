(function () {
    'use strict';

    const config = window.HVT_CASES_CONFIG || {};
    const loginSection = document.querySelector('[data-team-login]');
    const loginForm = document.querySelector('[data-team-login-form]');
    const loginStatus = document.querySelector('[data-team-login-status]');
    const dashboard = document.querySelector('[data-team-dashboard]');
    const identity = document.querySelector('[data-team-identity]');
    const caseList = document.querySelector('[data-team-case-list]');
    const empty = document.querySelector('[data-team-empty]');
    const detail = document.querySelector('[data-team-detail]');
    const message = document.querySelector('[data-team-message]');
    const searchInput = document.querySelector('[data-team-search]');
    const filterInput = document.querySelector('[data-team-filter]');
    const cleanupButton = document.querySelector('[data-team-cleanup]');
    let client = null;
    let member = null;
    let cases = [];
    let activeId = null;
    let turnstileWidget = null;

    const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(config.supabaseUrl || '') &&
        /^(eyJ|sb_publishable_)/.test(config.supabasePublishableKey || '');

    function setLoginStatus(text, error) {
        loginStatus.textContent = text || '';
        loginStatus.className = 'lab-team-login__status' + (error ? ' is-error' : '');
    }

    function setMessage(text) { message.textContent = text || ''; }
    function formatDate(value) { return new Intl.DateTimeFormat('es-CO', { dateStyle:'medium', timeStyle:'short' }).format(new Date(value)); }
    function formatBytes(value) {
        if (value < 1024) return value + ' B';
        if (value < 1048576) return (value / 1024).toFixed(1) + ' KB';
        return (value / 1048576).toFixed(1) + ' MB';
    }
    function statusLabel(value) { return ({ new:'Nuevo', reviewing:'En revisión', answered:'Respondido', closed:'Cerrado', uploading:'Carga incompleta' })[value] || value; }
    function node(tag, className, text) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (text !== undefined) element.textContent = text;
        return element;
    }

    async function verifyMembership(user) {
        const result = await client.from('lab_team_members').select('role,display_name,active').eq('user_id', user.id).maybeSingle();
        if (result.error) throw result.error;
        if (!result.data || !result.data.active) throw new Error('Esta cuenta no tiene autorización para acceder a los casos.');
        member = result.data;
        identity.textContent = (member.display_name || user.email) + ' · ' + member.role;
        cleanupButton.hidden = member.role !== 'admin';
    }

    async function enterDashboard(session) {
        await verifyMembership(session.user);
        loginSection.hidden = true;
        dashboard.hidden = false;
        await loadCases();
    }

    async function loadCases() {
        setMessage('Actualizando casos…');
        const result = await client.from('lab_cases').select('id,reference,question,project_name,contact_email,status,processing_consent,improvement_consent,consent_version,created_at,updated_at,retention_until,lab_case_files(id,storage_path,original_name,mime_type,size_bytes,sha256,created_at)').order('created_at', { ascending:false }).limit(250);
        if (result.error) {
            setMessage('No fue posible consultar los casos: ' + result.error.message);
            return;
        }
        cases = result.data || [];
        setMessage('');
        updateStats();
        renderCases();
        if (activeId) {
            const selected = cases.find(function (item) { return item.id === activeId; });
            if (selected) renderDetail(selected);
            else { activeId = null; detail.hidden = true; }
        }
    }

    function updateStats() {
        const now = Date.now();
        const week = now + 7 * 86400000;
        document.querySelector('[data-stat-new]').textContent = cases.filter(function (item) { return item.status === 'new'; }).length;
        document.querySelector('[data-stat-review]').textContent = cases.filter(function (item) { return item.status === 'reviewing'; }).length;
        document.querySelector('[data-stat-files]').textContent = cases.reduce(function (sum, item) { return sum + (item.lab_case_files || []).length; }, 0);
        document.querySelector('[data-stat-expiring]').textContent = cases.filter(function (item) { const time = new Date(item.retention_until).getTime(); return time >= now && time <= week; }).length;
    }

    function filteredCases() {
        const query = searchInput.value.trim().toLocaleLowerCase('es');
        const state = filterInput.value;
        return cases.filter(function (item) {
            const haystack = [item.reference,item.contact_email,item.project_name,item.question].filter(Boolean).join(' ').toLocaleLowerCase('es');
            return (!query || haystack.indexOf(query) !== -1) && (!state || item.status === state);
        });
    }

    function renderCases() {
        const values = filteredCases();
        caseList.replaceChildren();
        empty.hidden = values.length > 0;
        values.forEach(function (item) {
            const row = document.createElement('tr');
            if (item.id === activeId) row.className = 'is-active';
            [item.reference, formatDate(item.created_at), item.project_name || '—', statusLabel(item.status), String((item.lab_case_files || []).length)].forEach(function (value) { row.appendChild(node('td', '', value)); });
            row.tabIndex = 0;
            row.addEventListener('click', function () { activeId = item.id; renderCases(); renderDetail(item); });
            row.addEventListener('keydown', function (event) { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); row.click(); } });
            caseList.appendChild(row);
        });
    }

    async function openFile(file) {
        const pending = window.open('about:blank', '_blank');
        if (pending) {
            pending.document.title = 'Abriendo archivo privado…';
            pending.opener = null;
        }
        const result = await client.storage.from(config.storageBucket).createSignedUrl(file.storage_path, 300);
        if (result.error) {
            if (pending) pending.close();
            setMessage('No fue posible abrir el archivo: ' + result.error.message);
            return;
        }
        await client.from('lab_case_events').insert({ case_id:activeId, action:'file_opened', details:{ file_id:file.id } });
        if (pending) pending.location.replace(result.data.signedUrl);
        else window.location.assign(result.data.signedUrl);
    }

    function appendDefinition(list, term, value) {
        list.append(node('dt', '', term), node('dd', '', value));
    }

    function renderDetail(item) {
        detail.replaceChildren();
        detail.hidden = false;
        const head = node('div', 'lab-team-detail__head');
        const title = node('h2', '', item.reference);
        const close = node('button', '', '×');
        close.type = 'button';
        close.setAttribute('aria-label', 'Cerrar detalle');
        close.addEventListener('click', function () { activeId = null; detail.hidden = true; renderCases(); });
        head.append(title, close);
        const question = node('p', 'lab-team-detail__question', item.question);
        const facts = document.createElement('dl');
        appendDefinition(facts, 'Correo', item.contact_email);
        appendDefinition(facts, 'Proyecto', item.project_name || 'No indicado');
        appendDefinition(facts, 'Recibido', formatDate(item.created_at));
        appendDefinition(facts, 'Vence', formatDate(item.retention_until));
        appendDefinition(facts, 'Procesamiento', item.processing_consent ? 'Autorizado' : 'No autorizado');
        appendDefinition(facts, 'Mejora desidentificada', item.improvement_consent ? 'Autorizada' : 'No autorizada');
        const filesTitle = node('strong', '', 'Archivos privados');
        const files = node('ul', 'lab-team-detail__files');
        (item.lab_case_files || []).forEach(function (file) {
            const row = document.createElement('li');
            const button = document.createElement('button');
            button.type = 'button';
            button.append(node('span', '', file.original_name), node('small', '', formatBytes(file.size_bytes)));
            button.addEventListener('click', function () { openFile(file); });
            row.appendChild(button);
            files.appendChild(row);
        });
        if (!(item.lab_case_files || []).length) files.appendChild(node('li', '', 'No hay archivos completos.'));
        const controls = node('div', 'lab-team-detail__controls');
        const select = document.createElement('select');
        [['new','Nuevo'],['reviewing','En revisión'],['answered','Respondido'],['closed','Cerrado']].forEach(function (pair) {
            const option = document.createElement('option'); option.value = pair[0]; option.textContent = pair[1]; option.selected = item.status === pair[0]; select.appendChild(option);
        });
        select.setAttribute('aria-label', 'Estado del caso');
        select.addEventListener('change', async function () {
            select.disabled = true;
            const result = await client.from('lab_cases').update({ status:select.value }).eq('id', item.id);
            select.disabled = false;
            if (result.error) setMessage('No fue posible actualizar el estado: ' + result.error.message);
            else { await client.from('lab_case_events').insert({ case_id:item.id, action:'status_changed', details:{ status:select.value } }); await loadCases(); }
        });
        controls.appendChild(select);
        if (member.role === 'admin') {
            const remove = node('button', 'lab-team-detail__danger', 'Eliminar caso y archivos');
            remove.type = 'button';
            remove.addEventListener('click', function () { deleteCase(item); });
            controls.appendChild(remove);
        }
        detail.append(head, question, facts, filesTitle, files, controls);
    }

    async function deleteCase(item) {
        if (!window.confirm('¿Eliminar definitivamente ' + item.reference + ' y sus archivos?')) return;
        const paths = (item.lab_case_files || []).map(function (file) { return file.storage_path; });
        if (paths.length) {
            const removed = await client.storage.from(config.storageBucket).remove(paths);
            if (removed.error) { setMessage('No se eliminaron los archivos: ' + removed.error.message); return; }
        }
        const result = await client.from('lab_cases').delete().eq('id', item.id);
        if (result.error) { setMessage('No se eliminó el caso: ' + result.error.message); return; }
        activeId = null;
        detail.hidden = true;
        setMessage('Caso eliminado definitivamente.');
        await loadCases();
    }

    async function cleanupExpired() {
        if (!window.confirm('Se eliminarán definitivamente todos los casos vencidos y sus archivos. ¿Continuar?')) return;
        const expired = cases.filter(function (item) { return new Date(item.retention_until).getTime() < Date.now(); });
        let removed = 0;
        for (const item of expired) {
            const paths = (item.lab_case_files || []).map(function (file) { return file.storage_path; });
            if (paths.length) {
                const storageResult = await client.storage.from(config.storageBucket).remove(paths);
                if (storageResult.error) { setMessage('La limpieza se detuvo: ' + storageResult.error.message); return; }
            }
            const caseResult = await client.from('lab_cases').delete().eq('id', item.id);
            if (caseResult.error) { setMessage('La limpieza se detuvo: ' + caseResult.error.message); return; }
            removed += 1;
        }
        setMessage('Se eliminaron ' + removed + ' casos vencidos.');
        await loadCases();
    }

    loginForm.addEventListener('submit', async function (event) {
        event.preventDefault();
        if (!configured || !client) { setLoginStatus('El depósito privado todavía no está configurado.', true); return; }
        setLoginStatus('Verificando acceso…', false);
        const captchaToken = config.turnstileSiteKey && window.turnstile && turnstileWidget !== null ? window.turnstile.getResponse(turnstileWidget) : '';
        if (config.turnstileSiteKey && !captchaToken) { setLoginStatus('Confirma primero que eres una persona.', true); return; }
        const result = await client.auth.signInWithPassword({ email:document.querySelector('[data-team-email]').value.trim(), password:document.querySelector('[data-team-password]').value, options:captchaToken ? { captchaToken:captchaToken } : undefined });
        if (result.error) { setLoginStatus('No fue posible entrar: ' + result.error.message, true); return; }
        try { await enterDashboard(result.data.session); setLoginStatus('', false); }
        catch (error) { await client.auth.signOut(); setLoginStatus(error.message, true); }
    });
    document.querySelector('[data-team-refresh]').addEventListener('click', loadCases);
    document.querySelector('[data-team-signout]').addEventListener('click', async function () { await client.auth.signOut(); location.reload(); });
    cleanupButton.addEventListener('click', cleanupExpired);
    searchInput.addEventListener('input', renderCases);
    filterInput.addEventListener('change', renderCases);

    async function initialize() {
        if (!configured) { setLoginStatus('El panel está instalado, pero falta conectar el proyecto gratuito de Supabase.', true); return; }
        if (!window.supabase || typeof window.supabase.createClient !== 'function') { setLoginStatus('No fue posible cargar el componente seguro.', true); return; }
        client = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey, { auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:true } });
        if (config.turnstileSiteKey) {
            const holder = document.querySelector('[data-team-captcha]');
            holder.hidden = false;
            const script = document.createElement('script');
            script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
            script.async = true;
            script.defer = true;
            script.onload = function () { turnstileWidget = window.turnstile.render(holder, { sitekey:config.turnstileSiteKey, theme:'light' }); };
            document.head.appendChild(script);
        }
        const current = await client.auth.getSession();
        if (current.data.session && current.data.session.user && !current.data.session.user.is_anonymous) {
            try { await enterDashboard(current.data.session); }
            catch (error) { await client.auth.signOut(); setLoginStatus(error.message, true); }
        }
    }
    initialize();
})();
