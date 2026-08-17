(function () {
    'use strict';

    const root = document.querySelector('[data-lab-evidence]');
    if (!root) return;

    const config = window.HVT_CASES_CONFIG || {};
    const toggle = document.querySelector('[data-lab-evidence-toggle]');
    const cameraToggle = document.querySelector('[data-lab-camera-toggle]');
    const closeButton = root.querySelector('[data-lab-evidence-close]');
    const cameraInput = root.querySelector('[data-lab-camera]');
    const filesInput = root.querySelector('[data-lab-files]');
    const fileList = root.querySelector('[data-lab-file-list]');
    const emailInput = root.querySelector('[data-lab-case-email]');
    const projectInput = root.querySelector('[data-lab-case-project]');
    const questionInput = document.querySelector('[data-lab-discovery-query]');
    const requiredConsent = root.querySelector('[data-lab-consent-required]');
    const improvementConsent = root.querySelector('[data-lab-consent-improvement]');
    const submitButton = root.querySelector('[data-lab-case-submit]');
    const status = root.querySelector('[data-lab-case-status]');
    const selectedFiles = [];
    let client = null;
    let turnstileWidget = null;
    let lastTrigger = toggle;

    const allowed = {
        'image/jpeg': ['jpg', 'jpeg'],
        'image/png': ['png'],
        'image/webp': ['webp'],
        'application/pdf': ['pdf'],
        'text/csv': ['csv'],
        'application/csv': ['csv'],
        'application/vnd.ms-excel': ['csv']
    };

    const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(config.supabaseUrl || '') &&
        /^(eyJ|sb_publishable_)/.test(config.supabasePublishableKey || '');

    function setStatus(message, kind) {
        status.textContent = message || '';
        status.className = 'lab-evidence__status' + (kind ? ' is-' + kind : '');
    }

    function openPanel(trigger) {
        lastTrigger = trigger || lastTrigger;
        root.hidden = false;
        toggle.setAttribute('aria-expanded', 'true');
        cameraToggle.setAttribute('aria-expanded', 'true');
        root.scrollIntoView({ behavior:'smooth', block:'nearest' });
        if (!configured) {
            setStatus('La interfaz está lista, pero el depósito privado todavía no está conectado. HVT debe completar la activación gratuita antes de recibir archivos.', 'working');
        }
    }

    function closePanel() {
        root.hidden = true;
        toggle.setAttribute('aria-expanded', 'false');
        cameraToggle.setAttribute('aria-expanded', 'false');
        lastTrigger.focus();
    }

    function bytes(value) {
        if (value < 1024) return value + ' B';
        if (value < 1024 * 1024) return (value / 1024).toFixed(1) + ' KB';
        return (value / (1024 * 1024)).toFixed(1) + ' MB';
    }

    function extension(name) {
        const match = String(name).toLowerCase().match(/\.([a-z0-9]+)$/);
        return match ? match[1] : '';
    }

    function normalizedMime(file) {
        const ext = extension(file.name);
        if (ext === 'csv') return 'text/csv';
        return file.type.toLowerCase();
    }

    async function signatureIsValid(file) {
        const ext = extension(file.name);
        const type = normalizedMime(file);
        if (!allowed[type] || allowed[type].indexOf(ext) === -1) return false;
        const data = new Uint8Array(await file.slice(0, 4096).arrayBuffer());
        const begins = function (values) { return values.every(function (value, index) { return data[index] === value; }); };
        if (type === 'image/jpeg') return begins([0xff, 0xd8, 0xff]);
        if (type === 'image/png') return begins([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
        if (type === 'image/webp') return begins([0x52, 0x49, 0x46, 0x46]) && String.fromCharCode.apply(null, data.slice(8, 12)) === 'WEBP';
        if (type === 'application/pdf') return String.fromCharCode.apply(null, data.slice(0, 5)) === '%PDF-';
        if (type === 'text/csv') {
            if (!data.length || data.some(function (value) { return value === 0; })) return false;
            const sample = new TextDecoder('utf-8', { fatal:false }).decode(data);
            return /[,;\t\n\r]/.test(sample);
        }
        return false;
    }

    function renderFiles() {
        fileList.replaceChildren();
        selectedFiles.forEach(function (file, index) {
            const item = document.createElement('li');
            item.className = 'lab-evidence__file';
            const icon = document.createElement('i');
            icon.className = 'lab-evidence__file-icon';
            icon.textContent = extension(file.name).toUpperCase();
            const detail = document.createElement('span');
            const name = document.createElement('strong');
            const size = document.createElement('small');
            name.textContent = file.name;
            size.textContent = bytes(file.size);
            detail.append(name, size);
            const remove = document.createElement('button');
            remove.type = 'button';
            remove.setAttribute('aria-label', 'Quitar ' + file.name);
            remove.textContent = '×';
            remove.addEventListener('click', function () {
                selectedFiles.splice(index, 1);
                renderFiles();
            });
            item.append(icon, detail, remove);
            fileList.appendChild(item);
        });
    }

    async function addFiles(list) {
        setStatus('', '');
        const incoming = Array.from(list || []);
        for (const file of incoming) {
            if (selectedFiles.length >= Number(config.maxFiles || 5)) {
                setStatus('Puedes adjuntar máximo ' + (config.maxFiles || 5) + ' archivos por caso.', 'error');
                break;
            }
            if (file.size > Number(config.maxFileBytes || 15728640)) {
                setStatus(file.name + ' supera el límite de ' + bytes(config.maxFileBytes || 15728640) + '.', 'error');
                continue;
            }
            if (!(await signatureIsValid(file))) {
                setStatus(file.name + ' no coincide con un formato JPG, PNG, WebP, PDF o CSV válido.', 'error');
                continue;
            }
            const duplicate = selectedFiles.some(function (current) {
                return current.name === file.name && current.size === file.size && current.lastModified === file.lastModified;
            });
            if (!duplicate) selectedFiles.push(file);
        }
        const total = selectedFiles.reduce(function (sum, file) { return sum + file.size; }, 0);
        if (total > Number(config.maxCaseBytes || 26214400)) {
            selectedFiles.length = 0;
            setStatus('El conjunto supera el límite de ' + bytes(config.maxCaseBytes || 26214400) + '. Selecciona menos archivos.', 'error');
        }
        renderFiles();
        cameraInput.value = '';
        filesInput.value = '';
    }

    async function sha256(file) {
        if (!window.crypto || !window.crypto.subtle) return null;
        const digest = await window.crypto.subtle.digest('SHA-256', await file.arrayBuffer());
        return Array.from(new Uint8Array(digest)).map(function (value) { return value.toString(16).padStart(2, '0'); }).join('');
    }

    function caseReference(id) {
        const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        return 'HVT-' + date + '-' + id.slice(0, 8).toUpperCase();
    }

    function safeStoredExtension(file) {
        const ext = extension(file.name);
        return ['jpg','jpeg','png','webp','pdf','csv'].indexOf(ext) !== -1 ? ext : 'bin';
    }

    function captchaToken() {
        if (!config.turnstileSiteKey || !window.turnstile || turnstileWidget === null) return '';
        return window.turnstile.getResponse(turnstileWidget) || '';
    }

    async function ensureSession() {
        const current = await client.auth.getSession();
        if (current.data.session) return current.data.session;
        const token = captchaToken();
        if (config.turnstileSiteKey && !token) throw new Error('Confirma primero que eres una persona.');
        const options = token ? { options:{ captchaToken:token } } : undefined;
        const result = await client.auth.signInAnonymously(options);
        if (result.error) throw result.error;
        return result.data.session;
    }

    async function removePartialCase(caseId, paths) {
        try {
            if (paths.length) await client.storage.from(config.storageBucket).remove(paths);
            await client.from('lab_cases').delete().eq('id', caseId);
        } catch (ignored) {}
    }

    async function submitCase() {
        const question = questionInput.value.trim();
        const email = emailInput.value.trim();
        if (!configured || !client) {
            setStatus('El depósito privado aún no está conectado. No se envió ningún archivo.', 'error');
            return;
        }
        if (!question) {
            setStatus('Describe primero qué necesitas analizar.', 'error');
            questionInput.focus();
            return;
        }
        if (!email || !emailInput.checkValidity()) {
            setStatus('Escribe un correo válido para poder responder el caso.', 'error');
            emailInput.focus();
            return;
        }
        if (!selectedFiles.length) {
            setStatus('Adjunta al menos una foto, PDF o CSV.', 'error');
            return;
        }
        if (!requiredConsent.checked) {
            setStatus('Necesitamos tu autorización para almacenar y procesar temporalmente los archivos.', 'error');
            requiredConsent.focus();
            return;
        }

        submitButton.disabled = true;
        setStatus('Creando un espacio privado y verificando los archivos…', 'working');
        let caseId = null;
        const uploadedPaths = [];
        try {
            for (const file of selectedFiles) {
                if (!(await signatureIsValid(file))) throw new Error(file.name + ' no superó la verificación de formato.');
            }
            const session = await ensureSession();
            const userId = session.user.id;
            caseId = crypto.randomUUID();
            const reference = caseReference(caseId);
            const inserted = await client.from('lab_cases').insert({
                id:caseId,
                reference:reference,
                owner_id:userId,
                question:question,
                project_name:projectInput.value.trim() || null,
                contact_email:email,
                processing_consent:true,
                improvement_consent:improvementConsent.checked,
                consent_version:'lab-evidence-2026-08-16',
                status:'uploading',
                source_path:location.pathname,
                language:document.documentElement.lang || 'es-CO'
            });
            if (inserted.error) throw inserted.error;

            for (let index = 0; index < selectedFiles.length; index += 1) {
                const file = selectedFiles[index];
                setStatus('Cargando archivo ' + (index + 1) + ' de ' + selectedFiles.length + '…', 'working');
                const path = userId + '/' + caseId + '/' + crypto.randomUUID() + '.' + safeStoredExtension(file);
                const upload = await client.storage.from(config.storageBucket).upload(path, file, {
                    cacheControl:'3600', upsert:false, contentType:normalizedMime(file)
                });
                if (upload.error) throw upload.error;
                uploadedPaths.push(path);
                const metadata = await client.from('lab_case_files').insert({
                    case_id:caseId,
                    owner_id:userId,
                    storage_path:path,
                    original_name:file.name.slice(0, 240),
                    mime_type:normalizedMime(file),
                    size_bytes:file.size,
                    sha256:await sha256(file)
                });
                if (metadata.error) throw metadata.error;
            }
            const completed = await client.rpc('finalize_lab_case', { target_case:caseId });
            if (completed.error) throw completed.error;
            selectedFiles.length = 0;
            renderFiles();
            requiredConsent.checked = false;
            improvementConsent.checked = false;
            setStatus('Caso ' + reference + ' recibido. HVT podrá revisarlo durante 30 días y responderá al correo indicado.', 'success');
        } catch (error) {
            if (caseId) await removePartialCase(caseId, uploadedPaths);
            setStatus('No pudimos enviar el caso: ' + (error.message || 'error desconocido') + ' No se conservaron cargas incompletas.', 'error');
            if (config.turnstileSiteKey && window.turnstile && turnstileWidget !== null) window.turnstile.reset(turnstileWidget);
        } finally {
            submitButton.disabled = false;
        }
    }

    function initializeTurnstile() {
        if (!config.turnstileSiteKey) return;
        const holder = document.createElement('div');
        holder.className = 'lab-evidence__captcha';
        root.querySelector('.lab-evidence__consents').before(holder);
        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        script.onload = function () {
            turnstileWidget = window.turnstile.render(holder, { sitekey:config.turnstileSiteKey, theme:'light' });
        };
        document.head.appendChild(script);
    }

    toggle.addEventListener('click', function () {
        if (root.hidden) openPanel(toggle);
        filesInput.click();
    });
    cameraToggle.addEventListener('click', function () {
        if (root.hidden) openPanel(cameraToggle);
        cameraInput.click();
    });
    closeButton.addEventListener('click', closePanel);
    root.querySelector('[data-lab-open-camera]').addEventListener('click', function () { cameraInput.click(); });
    root.querySelector('[data-lab-open-files]').addEventListener('click', function () { filesInput.click(); });
    cameraInput.addEventListener('change', function () { addFiles(cameraInput.files); });
    filesInput.addEventListener('change', function () { addFiles(filesInput.files); });
    submitButton.addEventListener('click', submitCase);

    if (configured && window.supabase && typeof window.supabase.createClient === 'function') {
        client = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey, {
            auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:true }
        });
        initializeTurnstile();
    } else if (configured) {
        setStatus('No fue posible cargar el componente seguro. Revisa tu conexión e inténtalo nuevamente.', 'error');
    }
    if (new URLSearchParams(location.search).get('adjuntar') === '1') openPanel(toggle);
})();
