# Panel de GPI (Mi Cuenta + /admin)

Guía para poner en marcha el backend (Supabase) y usar el panel de contenido,
la gestión de cuentas y el registro de jornadas (horas extra).

> **Lo importante en una línea:** el sitio público funciona igual con o sin
> Supabase. Sin las variables de entorno muestra el contenido estático de
> `src/data/`; con ellas, el contenido sale de la base de datos y se habilitan
> `/mi-cuenta` (login + portal del empleado) y `/admin` (panel).

---

## 1. Aplicar las migraciones en Supabase

Hay **dos** migraciones y se aplican **en orden**:

| Archivo | Qué añade |
| --- | --- |
| `supabase/migrations/0001_site_content.sql` | Contenido del sitio, `profiles`, RLS, bucket de imágenes y usuario administrador inicial |
| `supabase/migrations/0002_empleados_jornadas.sql` | Roles ampliados, visibilidad del contenido, tabla `jornadas` y ajustes de cálculo |

Para cada una:

1. Entra al Dashboard de Supabase → proyecto **GPI Project**.
2. Menú lateral → **SQL Editor** → **New query**.
3. Abre el archivo del repo, copia **todo** su contenido y pégalo en el editor.
4. Pulsa **Run** y revisa los `NOTICE` del panel de resultados.

Ambas son **idempotentes**: puedes volver a ejecutarlas sin duplicar datos.

### ¿Qué crea la 0001?

| Objeto | Para qué sirve |
| --- | --- |
| `site_services` | Los 11 servicios (slug, categoría, ítems, imágenes, SEO, orden) |
| `site_projects` | Proyectos realizados |
| `site_clients` | Logos de clientes |
| `site_faqs` | Preguntas frecuentes |
| `site_values` | Valores corporativos |
| `site_settings` | Contacto, hero, banda EXCELENCIA y video de YouTube |
| `profiles` | Un perfil por usuario, con su rol |
| Bucket `site-images` | Imágenes subidas desde el panel (lectura pública) |

El seed carga **todo el contenido actual del sitio**: después de ejecutarla
verás exactamente lo mismo que ahora, pero ya editable.

### ¿Qué añade la 0002?

| Objeto | Para qué sirve |
| --- | --- |
| Roles ampliados en `profiles` | `admin`, `coordinador`, `marketing`, `empleado` (las filas viejas con `employee` se migran a `empleado`) |
| Columnas `active`, `cargo`, `phone` | Estado de la cuenta y datos del empleado |
| `is_content_editor()` / `is_manager()` | Funciones que usan las políticas RLS |
| Columna `published` en las 5 tablas de contenido | Ocultar ítems del sitio sin borrarlos |
| Tabla `jornadas` | Registro de jornadas y horas extra, con flujo de aprobación |
| Ajuste `visibility` | Interruptores de secciones completas del sitio |
| Ajuste `jornada_config` | Parámetros de cálculo de horas y recargos |

### Si el bloque del usuario admin de la 0001 falla

Algunas versiones de Supabase no permiten insertar directamente en `auth.users`.
En ese caso:

1. Dashboard → **Authentication** → **Users** → **Add user**.
2. Correo `admin@gpiprofesionales.com`, la contraseña de abajo, y marca
   **Auto Confirm User**.
3. Vuelve al SQL Editor y ejecuta solo:

```sql
update public.profiles set role = 'admin'
 where email = 'admin@gpiprofesionales.com';
```

---

## 2. Variables de entorno

Copia la plantilla y rellena los valores:

```bash
cp .env.example .env.local
```

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
```

**Dónde encontrarlas:** Dashboard de Supabase → **Settings** → **API Keys**

| Variable | Valor | ¿Secreta? |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Campo **Project URL** | No |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave **anon** / **publishable** | No |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave **service_role** | **Sí** |

### Sobre `SUPABASE_SERVICE_ROLE_KEY`

- Se necesita **solo** para gestionar cuentas desde `/admin/empleados`: crear
  usuarios, restablecer contraseñas y eliminar cuentas (usan la *Auth Admin API*
  de Supabase, que no funciona con la clave anónima).
- **Salta todas las políticas RLS.** Nunca le pongas el prefijo `NEXT_PUBLIC_`
  ni la importes desde código de cliente. En el proyecto solo la lee
  `src/lib/supabase/admin.ts`, que además lanza un error si alguien intenta
  usarlo en el navegador.
- Si no está configurada, el panel **no se rompe**: la sección Equipo muestra un
  aviso explicando qué falta, y se pueden seguir viendo y editando las cuentas
  existentes.
- En Vercel: **Settings → Environment Variables**, añádela **sin** el prefijo
  `NEXT_PUBLIC_`.

`.env.local` está ignorado por git (`.gitignore` ignora `.env*` y solo versiona
`.env.example`).

Después de crear o cambiar el archivo, reinicia `npm run dev`.

---

## 3. Credenciales iniciales del administrador

| | |
| --- | --- |
| **Correo** | `admin@gpiprofesionales.com` |
| **Contraseña** | `Kt7#mQx4-Rv9zBp2` |

Se entra por **`/mi-cuenta`** ("Mi Cuenta" en la barra de navegación).

Cambia la contraseña después del primer ingreso: desde el propio portal o desde
el Dashboard (Authentication → Users → **Reset password**).

---

## 4. Roles y permisos

Cada usuario tiene un rol en `profiles`. Esto es lo que puede hacer cada uno:

| | admin | coordinador | marketing | empleado |
| --- | :---: | :---: | :---: | :---: |
| Entrar a `/admin` | ✅ | ✅ | ✅ | ❌ |
| Contenido del sitio (servicios, proyectos, clientes, FAQ, valores, ajustes) | ✅ | ✅ | ✅ | ❌ |
| Subir imágenes al bucket | ✅ | ✅ | ✅ | ❌ |
| Equipo y cuentas (`/admin/empleados`) | ✅ | ✅ ¹ | ❌ | ❌ |
| Aprobar/rechazar jornadas (`/admin/jornadas`) | ✅ | ✅ | ❌ | ❌ |
| Portal de jornadas en `/mi-cuenta` | — ² | — ² | — ² | ✅ |

¹ Un **coordinador** puede gestionar cuentas de coordinador, marketing y
empleado, pero **no** puede crear administradores ni editar, restablecer la
contraseña o eliminar la cuenta de un administrador. Eso solo lo hace un admin.

² Los roles con acceso al panel ven en `/mi-cuenta` un botón para ir a `/admin`
en lugar del portal de jornadas.

Reglas adicionales que aplica el servidor:

- Nadie puede **desactivarse**, **cambiarse el rol** ni **eliminarse** a sí mismo.
- Una cuenta con `active = false` **no puede iniciar sesión** ni usar el portal;
  conserva su historial de jornadas.

La verificación es siempre **de servidor**: el layout de `/admin`, cada página
de sección y **cada server action** vuelven a comprobar el rol. El menú lateral
solo *oculta* lo que no corresponde, no es una barrera de seguridad.

---

## 5. Equipo y cuentas — `/admin/empleados`

Solo para **admin** y **coordinador**.

### Crear una cuenta

1. **Nueva cuenta** → nombre completo, correo, rol, cargo y teléfono.
2. Al guardar, el sistema **genera una contraseña fuerte** y la muestra
   **una sola vez**, con un botón de copiar.
3. Compártela con la persona. Podrá cambiarla desde **Mi Cuenta** cuando entre.

> La contraseña no se puede volver a consultar (Supabase guarda solo su hash).
> Si se pierde, se restablece desde la ficha de la persona.

### Gestionar una cuenta

En la ficha de cada persona puedes:

- **Editar** nombre, rol, cargo y teléfono.
- **Activar / desactivar** el acceso. Desactivar es lo recomendado cuando
  alguien deja de trabajar en GPI: no puede entrar, pero se conserva su
  historial de jornadas.
- **Restablecer la contraseña**: genera una nueva y la muestra una sola vez.
- **Eliminar la cuenta** (zona de peligro): borra también **todas sus
  jornadas**. Exige escribir el correo exacto y confirmar en el navegador.

---

## 6. Jornadas y horas extra

### El empleado — portal en `/mi-cuenta`

Al iniciar sesión, un usuario con rol `empleado` ve su portal:

- **Registrar una jornada**: fecha del día laboral (por defecto hoy), número de
  orden de trabajo, hora de inicio, hora de finalización, descripción de la
  labor y observaciones. Hay una casilla **"terminé al día siguiente"** para los
  turnos que cruzan la medianoche (si la hora de fin es anterior a la de inicio,
  el sistema lo detecta solo y avisa).
- **Vista previa en vivo** del desglose de horas mientras llena el formulario.
- **Mis jornadas**: historial con el estado de cada una
  (*pendiente* / *aprobada* / *rechazada*) y la nota del revisor si la hay.
  Puede **editar o eliminar** solo las que sigan **pendientes**.
- **Mi contraseña**: cambiarla por una que recuerde.

Estos son los mismos campos del Google Form que usaba GPI, mejor organizados.

### El coordinador — aprobaciones en `/admin/jornadas`

Solo para **admin** y **coordinador**.

- Lista ordenada por fecha (más reciente primero) con filtros de **estado**,
  **empleado** y **rango de fechas**. Por defecto muestra las pendientes.
- Cada jornada muestra empleado, fecha, orden de trabajo, horario, duración,
  descripción, observaciones y el **desglose de horas** calculado.
- **Aprobar** (un clic, con confirmación) o **Rechazar** (exige escribir el
  motivo, que el empleado verá en su portal).
- **Volver a pendiente**: reabre una jornada ya revisada para corregir un error.

El tablero de métricas y gráficas llega en una iteración posterior.

### Cómo se calculan las horas

La lógica vive en `src/lib/jornada.ts` (función pura `calcularJornada`) y se usa
en los tres sitios: vista previa del empleado, aprobaciones y —en el futuro— el
tablero. Trabaja siempre con la **hora de Colombia** (UTC-5 fijo), así que el
resultado es idéntico en el navegador, en el servidor y en la base de datos.

Clasifica el turno **minuto a minuto** en ocho categorías, según tres
condiciones: si supera la jornada ordinaria (extra), si cae en la franja
nocturna, y si es domingo o festivo nacional.

Los parámetros están en el ajuste `jornada_config` de `site_settings`:

```json
{
  "jornadaOrdinariaInicio": "07:00",
  "jornadaOrdinariaFin": "17:00",
  "horasOrdinariasDia": 8,
  "inicioNocturno": "19:00",
  "finNocturno": "06:00",
  "recargos": {
    "extraDiurna": 0.25,
    "extraNocturna": 0.75,
    "nocturno": 0.35,
    "dominicalFestivo": 0.80,
    "extraDominicalDiurna": 1.05,
    "extraDominicalNocturna": 1.55
  }
}
```

> ⚠️ Son valores **por defecto**, tomados de la normativa laboral colombiana
> vigente en 2026. **GPI debe confirmar sus propias reglas** (topes, tratamiento
> de festivos, horario base). Para cambiarlos, edita esa fila en el SQL Editor
> de Supabase; el código cae en los mismos valores por defecto si la clave no
> existe, así que el portal nunca se rompe.

**Festivos**: la lista de festivos nacionales de **2026** está en
`FESTIVOS_COLOMBIA` dentro de `src/lib/jornada.ts` y hay que **ampliarla cada
año**. Mientras un año no esté en la tabla, el cálculo sigue funcionando: solo
los domingos cuentan como día de recargo dominical.

---

## 7. Visibilidad del contenido

Dos niveles, ambos disponibles para admin, coordinador y marketing:

### Por ítem — interruptor "Visible / Oculto"

Servicios, proyectos, clientes, preguntas frecuentes y valores tienen un
interruptor en su formulario y una etiqueta de estado en la lista. Al ocultar un
ítem desaparece del sitio público, pero **no se borra** y se sigue editando
desde el panel.

Se apoya en la columna `published`: la política RLS de anon solo devuelve
`published = true`, y `src/lib/content.ts` vuelve a filtrar por si acaso.

### Por sección — `/admin/ajustes` → "Visibilidad de secciones"

| Interruptor | Qué apaga |
| --- | --- |
| Valores corporativos | Bloque "Nuestros valores" en el inicio y en Nosotros |
| Clientes | Banda de logos de clientes en el inicio |
| Video corporativo | Video de YouTube en Nosotros |
| Preguntas frecuentes | Acordeón de FAQ en Nosotros (y su marcado FAQPage) |

Se guardan en el ajuste `visibility` de `site_settings`. Todo está encendido por
defecto: el sitio se ve completo salvo que alguien apague algo a propósito.

---

## 8. Cómo funciona el fallback estático

Toda página pública pide sus datos a `src/lib/content.ts`:

1. Si **no hay** variables de entorno → devuelve los datos de `src/data/*`.
2. Si **hay** variables → consulta Supabase; ante un error de red, un error de
   permisos o una tabla vacía, **vuelve automáticamente** a los datos estáticos.

Consecuencias prácticas:

- El sitio nunca se cae por un problema de base de datos.
- Se puede desplegar en Vercel antes de configurar Supabase.
- Si borras todos los servicios desde el panel, la web volverá a mostrar los 11
  originales (el fallback se activa con tabla vacía). En cambio, si los
  **ocultas** uno a uno, sí desaparecen: ocultar es una decisión explícita y el
  fallback no la pisa.

**Renderizado:** las páginas usan ISR con `revalidate = 300` (5 minutos) y,
además, cada vez que guardas en `/admin` se llama a
`revalidatePath("/", "layout")`, así que los cambios se ven de inmediato.

---

## 9. Qué se puede editar desde `/admin`

| Sección | Quién | Qué permite |
| --- | --- | --- |
| **Servicios** | contenido | CRUD completo: título, título de menú, slug, categoría, icono, orden, visibilidad, resumen, descripción, ítems, portada, galería y SEO |
| **Proyectos** | contenido | CRUD: título, cliente, categoría, descripción, imagen, orden y visibilidad |
| **Clientes** | contenido | CRUD: nombre, logo, sitio web, orden y visibilidad |
| **FAQ** | contenido | CRUD de preguntas y respuestas (alimentan el marcado FAQPage) + visibilidad |
| **Valores** | contenido | CRUD de valores corporativos + visibilidad |
| **Contacto y ajustes** | contenido | Visibilidad de secciones, dirección, coordenadas, teléfonos/WhatsApp, correos, redes, horario, mapa, hero, banda EXCELENCIA y video de YouTube |
| **Equipo** | managers | Cuentas del portal: crear, editar, roles, activar/desactivar, contraseñas y eliminación |
| **Jornadas** | managers | Revisión y aprobación de jornadas con desglose de horas |

*"contenido" = admin, coordinador y marketing · "managers" = admin y coordinador*

### Imágenes

En cada campo de imagen puedes:

- **Subir un archivo** → se guarda en el bucket `site-images` de Supabase y el
  campo se rellena con su URL pública.
- **Pegar una URL** externa (`https://...`).
- **Escribir una ruta local** (`/images/servicios/in1.jpg`) para reutilizar las
  imágenes que ya vienen en `public/images`.

Siempre se muestra una vista previa.

### Navegación del panel

- Barra superior siempre visible con el rol de la sesión, **Ver sitio** y
  **Cerrar sesión**.
- Menú lateral en escritorio y tabs desplazables en móvil, con la sección activa
  resaltada. Las secciones internas (Equipo, Jornadas) solo aparecen para
  managers.
- Cada sección tiene breadcrumb y botón **← Volver al dashboard**; los
  formularios de crear/editar añaden **← Volver a [sección]**.

---

## 10. Despliegue en Vercel

1. Vercel → proyecto → **Settings** → **Environment Variables**.
2. Añade `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` con los
   mismos valores del `.env.local`, marcando **Production**, **Preview** y
   **Development**.
3. Añade `SUPABASE_SERVICE_ROLE_KEY` **sin** prefijo `NEXT_PUBLIC_`.
4. Vuelve a desplegar (**Redeploy**): las variables `NEXT_PUBLIC_*` se incrustan
   en el build, así que no basta con guardarlas.

Si no configuras las variables en Vercel, el sitio se despliega igual y muestra
el contenido estático; `/mi-cuenta` mostrará el aviso de "próximamente" y
`/admin` redirigirá allí.

---

## 11. Notas técnicas

- `src/proxy.ts` (el `middleware` de Next.js 16) refresca la sesión de Supabase
  y hace una redirección optimista de `/admin` a `/mi-cuenta`. Solo corre sobre
  las rutas del portal, para no afectar al cacheado del sitio público.
- La verificación **autoritativa** de rol vive en `src/app/admin/layout.tsx`, en
  cada página de sección (`requireManager`) y en **cada server action**
  (`getContentEditorOrNull` / `getManagerOrNull` / `getActiveSession`).
- Módulos clave:
  - `src/lib/roles.ts` — roles, etiquetas y helpers (módulo puro).
  - `src/lib/supabase/auth.ts` — sesión, perfil y guardas de servidor.
  - `src/lib/supabase/admin.ts` — cliente service-role y generador de contraseñas
    (**solo servidor**).
  - `src/lib/jornada.ts` — cálculo de horas, festivos y formateo (módulo puro).
- `/mi-cuenta` y `/admin` llevan `robots: noindex` y están fuera del
  `sitemap.xml`, además de estar en `Disallow` dentro de `robots.txt`.
- Si subes imágenes a Supabase, `next.config.ts` ya permite optimizar imágenes
  desde `**.supabase.co/storage/v1/object/public/**`.
