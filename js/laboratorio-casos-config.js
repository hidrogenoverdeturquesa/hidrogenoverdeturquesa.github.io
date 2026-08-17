/*
 * Configuración pública del buzón técnico HVT.
 * La URL y la clave publicable de Supabase pueden aparecer en el navegador:
 * la seguridad real la aplican las políticas RLS de supabase/migrations/.
 * Nunca escriba aquí service_role, secret keys ni contraseñas.
 */
window.HVT_CASES_CONFIG = Object.freeze({
    supabaseUrl: 'https://faqrxjhmfvedimgtffmn.supabase.co',
    supabasePublishableKey: 'sb_publishable_u1XESsmRFt6FGvFiLXicyw_D_xakhDp',
    storageBucket: 'lab-evidence',
    retentionDays: 30,
    maxFiles: 5,
    maxFileBytes: 15 * 1024 * 1024,
    maxCaseBytes: 25 * 1024 * 1024,
    turnstileSiteKey: ''
});
