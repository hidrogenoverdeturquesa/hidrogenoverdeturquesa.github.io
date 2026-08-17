(function() {
    'use strict';
    const form = document.querySelector('[data-application-form]');
    if (!form) return;
    const config = window.HVT_APPLICATIONS_CONFIG || {};
    const status = form.querySelector('[data-form-status]');
    const submit = form.querySelector('button[type="submit"]');
    const fileInput = form.querySelector('input[type="file"]');
    const fileLabel = form.querySelector('[data-file-label]');
    const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(config.supabaseUrl || '') && /^sb_publishable_/.test(config.supabasePublishableKey || '');

    function showStatus(message, isError) {
        status.textContent = message;
        status.classList.toggle('is-error', Boolean(isError));
        status.classList.toggle('is-success', !isError);
        status.hidden = false;
        status.focus();
    }
    async function request(url, options) {
        const response = await fetch(url, options);
        const payload = response.status === 204 ? null : await response.json().catch(function() { return null; });
        if (!response.ok) {
            const error = new Error(payload && (payload.message || payload.msg || payload.error_description) || 'Error HTTP ' + response.status);
            error.status = response.status;
            throw error;
        }
        return payload;
    }

    fileInput.addEventListener('change', function() {
        const file = fileInput.files[0];
        fileLabel.textContent = file ? file.name + ' · ' + (file.size / 1024 / 1024).toFixed(1) + ' MB' : 'Seleccionar hoja de vida en PDF';
    });

    form.addEventListener('submit', async function(event) {
        event.preventDefault();
        if (!form.reportValidity()) return;
        if (!configured) return showStatus('El formulario todavía no está disponible. Intenta nuevamente más tarde.', true);
        const file = fileInput.files[0];
        if (!file || (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name))) return showStatus('Selecciona una hoja de vida en formato PDF.', true);
        if (file.size > config.maxFileBytes) return showStatus('El archivo supera el máximo permitido de 5 MB.', true);

        submit.disabled = true;
        submit.textContent = 'Enviando…';
        status.hidden = true;
        let stage = 'autenticación';
        try {
            const publicHeaders = { apikey: config.supabasePublishableKey, 'Content-Type': 'application/json' };
            const session = await request(config.supabaseUrl + '/auth/v1/signup', { method: 'POST', headers: publicHeaders, body: '{}' });
            const authHeaders = { apikey: config.supabasePublishableKey, Authorization: 'Bearer ' + session.access_token };
            const fields = new FormData(form);
            stage = 'registro de los datos';
            const inserted = await request(config.supabaseUrl + '/rest/v1/volunteer_applications?select=id,reference', {
                method: 'POST', headers: Object.assign({}, authHeaders, { 'Content-Type': 'application/json', Prefer: 'return=representation' }),
                body: JSON.stringify({ full_name: String(fields.get('full_name') || '').trim(), email: String(fields.get('email') || '').trim(), phone: String(fields.get('phone') || '').trim() || null, interest_area: String(fields.get('interest_area') || '').trim(), availability: String(fields.get('availability') || '').trim() + ' horas semanales', contribution: String(fields.get('contribution') || '').trim(), processing_consent: fields.get('processing_consent') === 'on', consent_version: config.consentVersion, source_path: window.location.pathname })
            });
            const application = inserted[0];
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-120);
            const path = session.user.id + '/' + application.id + '/' + safeName;
            stage = 'carga de la hoja de vida';
            await request(config.supabaseUrl + '/storage/v1/object/' + config.storageBucket + '/' + path.split('/').map(encodeURIComponent).join('/'), { method: 'POST', headers: Object.assign({}, authHeaders, { 'Content-Type': 'application/pdf', 'x-upsert': 'false' }), body: file });
            stage = 'confirmación final';
            await request(config.supabaseUrl + '/rest/v1/rpc/finalize_volunteer_application', { method: 'POST', headers: Object.assign({}, authHeaders, { 'Content-Type': 'application/json' }), body: JSON.stringify({ target_application: application.id, target_storage_path: path, target_original_name: file.name, target_size_bytes: file.size }) });
            form.reset();
            fileLabel.textContent = 'Seleccionar hoja de vida en PDF';
            form.querySelectorAll('input, textarea, select, button').forEach(function(control) { control.disabled = true; });
            showStatus('Postulación enviada correctamente. Tu número de referencia es ' + application.reference + '.', false);
        } catch (error) {
            console.error('Postulación: fallo en ' + stage, error);
            let message = 'No pudimos completar la ' + stage + '. Intenta nuevamente.';
            if (stage === 'registro de los datos' && error.status === 400) {
                message = 'Revisa los campos: nombre completo, horas disponibles y explicación (mínimo 20 caracteres).';
            } else if (error.status === 429) {
                message = 'Se realizaron varios intentos seguidos. Espera unos minutos y vuelve a intentarlo.';
            }
            showStatus(message + ' Si continúa, escríbenos a contacto@hidrogenoverdeturquesa.com.', true);
            submit.disabled = false;
            submit.textContent = 'Enviar postulación';
        }
    });
})();
