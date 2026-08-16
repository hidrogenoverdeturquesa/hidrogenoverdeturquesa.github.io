# Activar el formulario de postulaciones

El formulario público usa una sesión anónima limitada para registrar los datos y guardar la hoja de vida en un depósito privado.

## 1. Crear la estructura privada

1. En el proyecto **HVT Postulaciones**, abre **SQL Editor**.
2. Selecciona **New query**.
3. Copia todo el contenido de `supabase/migrations/202608160002_volunteer_applications.sql`.
4. Pulsa **Run** y comprueba que finalice sin errores.

## 2. Permitir postulaciones sin cuenta

1. Abre **Authentication** > **Providers**.
2. Busca **Anonymous Sign-Ins**.
3. Activa la opción y guarda el cambio.

## 3. Verificar

Envía una postulación de prueba desde `/voluntariado-investigacion`. Debe aparecer:

- un registro con estado `received` en **Table Editor** > `volunteer_applications`;
- un PDF en **Storage** > `volunteer-cvs`;
- un número de referencia `HVT-VOL-...` en la confirmación de la página.

La clave `service_role`, la contraseña de la base de datos y cualquier clave secreta nunca deben copiarse al sitio web.
