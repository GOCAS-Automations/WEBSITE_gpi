# Panel de administración de GPI (Mi Cuenta + /admin)

Guía para poner en marcha el backend (Supabase) y usar el panel de contenido.

> **Lo importante en una línea:** el sitio funciona igual con o sin Supabase. Sin
> las variables de entorno muestra el contenido estático de `src/data/`; con
> ellas, el contenido sale de la base de datos y se habilitan `/mi-cuenta` y
> `/admin`.

---

## 1. Aplicar la migración en Supabase

1. Entra al Dashboard de Supabase → proyecto **GPI Project**.
2. Menú lateral → **SQL Editor** → **New query**.
3. Abre el archivo `supabase/migrations/0001_site_content.sql` de este repo,
   copia **todo** su contenido y pégalo en el editor.
4. Pulsa **Run**.
5. Revisa el panel de resultados: al final aparece un `NOTICE` indicando si el
   usuario administrador se creó correctamente.

La migración es **idempotente**: puedes volver a ejecutarla sin duplicar datos.

### ¿Qué crea?

| Objeto | Para qué sirve |
| --- | --- |
| `site_services` | Los 11 servicios (slug, categoría, ítems, imágenes, SEO, orden) |
| `site_projects` | Proyectos realizados |
| `site_clients` | Logos de clientes |
| `site_faqs` | Preguntas frecuentes |
| `site_values` | Valores corporativos |
| `site_settings` | Contacto, hero del inicio, banda EXCELENCIA y video de YouTube |
| `profiles` | Tabla de credenciales: un perfil por usuario con `role` (`admin` \| `employee`) |
| Bucket `site-images` | Imágenes subidas desde el panel (lectura pública) |

Además activa **RLS** en todas las tablas: lectura pública para cualquiera,
escritura solo para usuarios autenticados cuyo perfil tenga `role = 'admin'`
(función `is_admin()`).

El seed carga **todo el contenido actual del sitio**, así que después de
ejecutar la migración verás exactamente lo mismo que ahora, pero ya editable.

### Si el bloque del usuario admin falla

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

Copia la plantilla y rellena los dos valores:

```bash
cp .env.example .env.local
```

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

**Dónde encontrarlas:** Dashboard de Supabase → **Settings** → **API Keys**

- `NEXT_PUBLIC_SUPABASE_URL` → el campo **Project URL**.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → la clave pública **anon** / **publishable**.

> Nunca uses aquí la `service_role key`: es secreta y este proyecto no la
> necesita porque toda la seguridad está en las políticas RLS.

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

### Cambiar la contraseña

Opción A (recomendada, desde el Dashboard):
Authentication → Users → clic en el usuario → **Reset password** o
**Update user** → escribe la nueva contraseña.

Opción B (SQL Editor):

```sql
update auth.users
   set encrypted_password = crypt('NuevaContraseñaSegura', gen_salt('bf'))
 where email = 'admin@gpiprofesionales.com';
```

### Crear más usuarios

Authentication → **Add user**. El trigger `on_auth_user_created` crea su fila en
`profiles` con `role = 'employee'`. Para convertirlo en administrador:

```sql
update public.profiles set role = 'admin' where email = 'otro@correo.com';
```

Los usuarios con `role = 'employee'` pueden iniciar sesión pero verán el aviso
"El portal de empleados estará disponible próximamente" (llega en la Fase 2 con
el registro de horas extra).

---

## 4. Cómo funciona el fallback estático

Toda página pública pide sus datos a `src/lib/content.ts`:

1. Si **no hay** variables de entorno → devuelve los datos de `src/data/*`.
2. Si **hay** variables → consulta Supabase; ante un error de red, un error de
   permisos o una tabla vacía, **vuelve automáticamente** a los datos estáticos.

Consecuencias prácticas:

- El sitio nunca se cae por un problema de base de datos.
- Se puede desplegar en Vercel antes de configurar Supabase.
- Si borras todos los servicios desde el panel, la web volverá a mostrar los 11
  originales (el fallback se activa con tabla vacía).

**Renderizado:** las páginas usan ISR con `revalidate = 300` (5 minutos) y,
además, cada vez que guardas en `/admin` se llama a
`revalidatePath("/", "layout")`, así que los cambios se ven de inmediato.

---

## 5. Qué se puede editar desde `/admin`

| Sección | Qué permite |
| --- | --- |
| **Servicios** | CRUD completo: título, título de menú, slug (URL), categoría, icono, orden, resumen, descripción, lista de ítems, imagen de portada, galería y metadatos SEO |
| **Proyectos** | CRUD: título, cliente, categoría, descripción, imagen y orden |
| **Clientes** | CRUD: nombre, logo, sitio web y orden |
| **FAQ** | CRUD de preguntas y respuestas (alimentan el marcado FAQPage de Google) |
| **Valores** | Crear, editar y eliminar los valores corporativos (título, icono, descripción, orden) |
| **Contacto y ajustes** | Dirección, coordenadas, teléfonos/WhatsApp, correos, redes sociales (incl. YouTube), horario, mapa embebido, textos e imagen del hero, banda EXCELENCIA con sus estadísticas, y video corporativo de YouTube |

### Imágenes

En cada campo de imagen puedes:

- **Subir un archivo** → se guarda en el bucket `site-images` de Supabase y el
  campo se rellena con su URL pública.
- **Pegar una URL** externa (`https://...`).
- **Escribir una ruta local** (`/images/servicios/in1.jpg`) para reutilizar las
  imágenes que ya vienen en `public/images`.

Siempre se muestra una vista previa.

### Navegación del panel

- Barra superior siempre visible con **Ver sitio** (abre `/` en otra pestaña) y
  **Cerrar sesión**.
- Menú lateral en escritorio y tabs desplazables en móvil, con la sección activa
  resaltada.
- Cada sección tiene breadcrumb y botón **← Volver al dashboard**; los
  formularios de crear/editar añaden **← Volver a [sección]**.

---

## 6. Despliegue en Vercel

1. Vercel → proyecto → **Settings** → **Environment Variables**.
2. Añade `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` con los
   mismos valores del `.env.local`, marcando **Production**, **Preview** y
   **Development**.
3. Vuelve a desplegar (**Redeploy**): las variables `NEXT_PUBLIC_*` se incrustan
   en el build, así que no basta con guardarlas.

Si no configuras las variables en Vercel, el sitio se despliega igual y muestra
el contenido estático; `/mi-cuenta` mostrará el aviso de "próximamente" y
`/admin` redirigirá allí.

---

## 7. Notas técnicas

- `src/proxy.ts` (el `middleware` de Next.js 16) refresca la sesión de Supabase
  y hace una redirección optimista de `/admin` a `/mi-cuenta`. Solo corre sobre
  las rutas del portal, para no afectar al cacheado del sitio público.
- La verificación **autoritativa** de rol vive en `src/app/admin/layout.tsx` y
  en **cada server action** (`src/app/admin/actions.ts`), nunca solo en el proxy.
- `/mi-cuenta` y `/admin` llevan `robots: noindex` y están fuera del
  `sitemap.xml`, además de estar en `Disallow` dentro de `robots.txt`.
- Si subes imágenes a Supabase, `next.config.ts` ya permite optimizar imágenes
  desde `**.supabase.co/storage/v1/object/public/**`.
