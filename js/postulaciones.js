(function() {
    'use strict';

    const form = document.querySelector('[data-application-form]');
    if (!form) return;

    const config = window.HVT_APPLICATIONS_CONFIG || {};
    const status = form.querySelector('[data-form-status]');
    const submit = form.querySelector('button[type="submit"]');
    const fileInput = form.querySelector('input[type="file"]');
    const fileLabel = form.querySelector('[data-file-label]');
    const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(config.supabaseUrl || '') &&
        /^sb_publishable_/.test(config.supabasePublishableKey || '');

    const showStatus = function(message, isError) {
        status.textContent = message;
        status.classList.toggle('is-error', Boolean(isError));
        status.classList.toggle('is-success', !isError);
        status.hidden = false;
        status.focus();
    };

    fileInput.addEventListener('change', function() {
        const file = fileInput.files[0];
        fileLabel.textContent = file ? file.name + ' · ' + (file.size / 1024 / 1024).toFixed(1) + ' MB' : 'Seleccionar hoja de vida en PDF';
    });

    form.addEventListener('submit', async function(event) {
        event.preventDefault();
        if (!form.reportValidity()) return;
        if (!configured || !window.supabase) {
            showStatus('El formulario todavía no está disponible. Intenta nuevamente más tarde.', true);
            return;
        }

        const file = fileInput.files[0];
        if (!file || file.type !== 'application/pdf') {
            showStatus('Selecciona una hoja de vida en formato PDF.', true);
            return;
        }
        if (file.size > config.maxFileBytes) {
            showStatus('El archivo supera el máximo permitido de 5 MB.', true);
            return;
        }

        submit.disabled = true;
        submit.textContent = 'Enviando…';
        status.hidden = true;

        try {
            const client = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey, {
                auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
            });
            const authResult = await client.auth.signInAnonymously();
            if (authResult.error) throw authResult.error;

            const fields = new FormData(form);
            const insertResult = await client.from('volunteer_applications').insert({
                full_name: String(fields.get('full_name') || '').trim(),
                email: String(fields.get('email') || '').trim(),
                phone: String(fields.get('phone') || '').trim() || null,
                interest_area: String(fields.get('interest_area') || '').trim(),
                availability: String(fields.get('availability') || '').trim(),
                contribution: String(fields.get('contribution') || '').trim(),
                processing_consent: fields.get('processing_consent') === 'on',
                consent_version: config.consentVersion,
                source_path: window.location.pathname
            }).select('id, reference').single();
            if (insertResult.error) throw insertResult.error;

            const application = insertResult.data;
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-120);
            const path = authResult.data.user.id + '/' + application.id + '/' + safeName;
            const uploadResult = await client.storage.from(config.storageBucket).upload(path, file, {
                contentType: 'application/pdf', upsert: false
            });
            if (uploadResult.error) throw uploadResult.error;

            const finalizeResult = await client.rpc('finalize_volunteer_application', {
                target_application: application.id,
                target_storage_path: path,
                target_original_name: file.name,
                target_size_bytes: file.size
            });
            if (finalizeResult.error) throw finalizeResult.error;

            form.reset();
            fileLabel.textContent = 'Seleccionar hoja de vida en PDF';
            form.querySelectorAll('input, textarea, button').forEach(function(control) { control.disabled = true; });
            showStatus('Postulación enviada correctamente. Tu número de referencia es ' + application.reference + '.', false);
        } catch (error) {
            showStatus('No pudimos enviar la postulación. Revisa los datos e intenta nuevamente.', true);
            submit.disabled = false;
            submit.textContent = 'Enviar postulación';
        }
    });
})();
