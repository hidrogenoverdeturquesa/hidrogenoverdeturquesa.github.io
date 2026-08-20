# Activar el buzón técnico del Laboratorio HVT sin costo mensual

La interfaz pública, el panel del equipo y las políticas de seguridad ya forman parte del sitio. Para recibir archivos falta conectarlos a un proyecto gratuito de Supabase. No se necesita servidor propio ni correo SMTP: los visitantes usan una sesión anónima únicamente al enviar evidencia y las cuentas del equipo se crean manualmente.

## 1. Crear el proyecto gratuito

1. Crear una cuenta en <https://supabase.com/dashboard>.
2. Crear un proyecto para HVT y guardar de forma privada la contraseña de la base de datos.
3. En **Authentication > Providers**, activar **Anonymous Sign-Ins**.
4. No publicar `service_role`, secretos, contraseñas ni tokens de administración.

El plan gratuito incluye actualmente 500 MB de base de datos, 1 GB de archivos y 5 GB de transferencia. Supabase puede pausar un proyecto gratuito después de una semana sin actividad; se reactiva desde su panel.

## 2. Crear tablas, depósito y permisos

1. Abrir **SQL Editor** dentro del proyecto.
2. Copiar y ejecutar completo `supabase/migrations/202608160001_laboratorio_casos.sql`.
3. Confirmar que en **Storage** aparezca el bucket privado `lab-evidence`.

Las políticas instaladas hacen que cada visitante vea solamente sus propios registros. Solo las personas incluidas en `lab_team_members` pueden consultar todos los casos. Los archivos no tienen direcciones públicas.

## 3. Conectar la página

En **Project Settings > API** copiar:

- Project URL.
- Publishable key (o la clave `anon` heredada).

Pegarlas en `js/laboratorio-casos-config.js`:

```js
supabaseUrl: 'https://PROYECTO.supabase.co',
supabasePublishableKey: 'sb_publishable_...'
```

Estas dos variables son públicas por diseño. La protección proviene de RLS. Nunca usar una clave secreta o `service_role` en ese archivo.

## 4. Crear la primera cuenta del equipo

1. Ir a **Authentication > Users > Add user**.
2. Crear el usuario con el correo corporativo y una contraseña única de al menos 14 caracteres.
3. En SQL Editor ejecutar, sustituyendo el correo:

```sql
insert into public.lab_team_members (user_id, role, display_name)
select id, 'admin', 'Administración HVT'
from auth.users
where email = 'contacto@hidrogenoverdeturquesa.com'
on conflict (user_id) do update
set role = excluded.role, display_name = excluded.display_name, active = true;
```

Después se pueden crear integrantes con los roles `analyst`, `coordinator` o `admin`.

El panel privado queda en:

`https://hidrogenoverdeturquesa.com/laboratorio/equipo/`

## 5. Protección gratuita contra robots

Antes de anunciar públicamente la carga de archivos:

1. Crear un sitio gratuito en Cloudflare Turnstile para `hidrogenoverdeturquesa.com`.
2. En Supabase activar CAPTCHA/Turnstile y pegar la clave secreta proporcionada por Cloudflare.
3. Pegar únicamente la **site key pública** en `turnstileSiteKey` dentro de `js/laboratorio-casos-config.js`.

La interfaz mostrará el control tanto al visitante cuando envía archivos como al equipo al iniciar sesión.

## 6. Prueba mínima antes de publicar

1. Abrir `/laboratorio/` en una ventana privada.
2. Confirmar que las calculadoras funcionan sin registro.
3. Pulsar el clip, adjuntar una imagen pequeña, escribir una consulta y aceptar solo el consentimiento obligatorio.
4. Comprobar que aparece una referencia `HVT-AAAAMMDD-XXXXXXXX`.
5. Entrar a `/laboratorio/equipo/`, abrir el caso y comprobar que el enlace del archivo vence en cinco minutos.
6. Cambiar su estado y eliminar el caso de prueba.

## Operación y límites

- Máximo 5 archivos y 25 MB por caso.
- Máximo 15 MB por archivo.
- Formatos: JPG, PNG, WebP, PDF y CSV.
- Conservación inicial: 30 días.
- El botón **Eliminar vencidos** está disponible solamente para administradores. Debe ejecutarse periódicamente; elimina primero los objetos y después sus registros.
- Esta versión valida extensión, MIME y firma básica en el navegador y restringe el bucket. Para documentos provenientes de fuentes desconocidas o un volumen alto se debe añadir análisis antimalware del lado del servidor antes de abrirlos.
