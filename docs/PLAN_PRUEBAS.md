# Plan de pruebas — sitio GPI (antes de la reunión del viernes)

Plan accionable para probar el sitio completo mañana. Cada bloque trae pasos
concretos, resultado esperado y una casilla para marcar. Al final hay una
tabla para anotar hallazgos y pasármelos.

Documento hermano: `docs/REUNION_VIERNES.md` (briefing para la reunión del
viernes con el community manager).

---

## Antes de empezar

### Dónde probar

**Recomendado: la URL de Vercel, no `npm run dev` en local.** Es lo más
parecido a lo que verá el CM, y es la base sobre la que se hizo la auditoría
del 28 de julio (build de producción).

- **URL de producción: <https://website-gpi.vercel.app/>**
- Las variables de entorno de Supabase **ya están configuradas en Vercel**
  (confirmado el 29 de julio), así que los Bloques 4 a 9 —todo lo que depende
  del login— funcionan ahí. Si algún día `/mi-cuenta` mostrara el aviso "El
  portal estará disponible próximamente", significa que se perdieron esas
  variables.
- Verificación en producción del 29 de julio: las **7 cabeceras de seguridad**
  llegan, `x-powered-by` no aparece, las 9 rutas públicas responden **200** y
  `/admin` redirige (307) a `/mi-cuenta` sin sesión.
- Si Vercel no tiene Supabase conectado todavía, usa un **build de
  producción en local** en vez de modo desarrollo:

  ```bash
  npm run build
  npm start
  ```

  y abre `http://localhost:3000`. **No uses `npm run dev`** para estas
  pruebas: el modo desarrollo relaja la política de seguridad (CSP permite
  `unsafe-eval` y conexiones a `ws://localhost`) y no representa lo que ve un
  usuario real ni lo que viste en la auditoría. Necesitas `.env.local` con las
  tres variables de Supabase configuradas (ver `docs/ADMIN.md` sección 2) para
  que `/mi-cuenta` y `/admin` funcionen en local.
- Bloques 1, 2, 3 y 10 (sitio público, responsive, accesibilidad, cabeceras)
  se pueden probar igual sin Supabase configurado — el sitio cae al contenido
  estático y sigue 100 % funcional.

### Credenciales

- **Importante — no inventes ni supongas contraseñas.** Las credenciales de las cuentas
  de prueba creadas para este ejercicio están en la hoja de credenciales que
  te entregó el orquestador.
- La **cuenta administradora inicial** es `admin@gpiprofesionales.com` (se
  escribe el correo completo porque es una cuenta antigua, de antes del
  ingreso por usuario). Su contraseña está documentada en
  `docs/ADMIN.md`, sección 3 ("Credenciales iniciales del administrador") —
  no se repite acá para no duplicar el dato en dos archivos.
- Si necesitas cuentas de prueba de los otros 3 roles (coordinador, Community
  Manager, empleado) y no existen todavía, las creas tú mismo en el
  **Bloque 4** — el panel te muestra la contraseña generada una sola vez;
  apúntala en tu propia nota, no hace falta ponerla en ningún documento del
  repo.

### Dispositivo móvil

Si tienes a mano un celular real, ábrelo también ahí (mismo Wi-Fi, la URL de
Vercel). Es la única forma de probar lo que el Bloque 2 no puede cubrir desde
el computador: tamaño real de los botones al tocar con el dedo, teclado
nativo en los formularios, y cómo se siente de verdad en la mano. Si no
tienes uno a mano, usa el modo de dispositivo de las herramientas de
desarrollador del navegador (F12 → ícono de celular/tableta) como sustituto
parcial — no es lo mismo, pero cubre el Bloque 2.

### Cómo anotar mientras pruebas

No esperes al final: cada vez que algo no se vea o no funcione como se
espera, anótalo de una vez en la tabla del **Cierre**, con la página, qué
pasó y qué tan grave te parece. Así no se te olvida nada.

---

## Resumen de bloques

| # | Bloque | Tiempo estimado | Prioridad |
| - | --- | :---: | --- |
| 1 | Sitio público | 35 min | **Imprescindible** |
| 2 | Responsive y navegadores | 20 min | **Imprescindible** |
| 3 | Accesibilidad rápida | 10 min | **Imprescindible** |
| 4 | Login y roles | 25 min | **Imprescindible** |
| 5 | Panel de contenido | 15 min | **Imprescindible** |
| 6 | Empleados y cuentas | 15 min | Si alcanza el tiempo |
| 7 | Horarios mensuales | 10 min | Si alcanza el tiempo |
| 8 | Jornadas de punta a punta | 30 min | Si alcanza el tiempo* |
| 9 | Tablero de métricas | 15 min | Si alcanza el tiempo |
| 10 | Verificación técnica visible | 15 min | **Imprescindible** |

**Total: ~3 h 10 min.** Si el tiempo aprieta, haz los 6 bloques marcados
**Imprescindible** (≈ 2 h) — cubren exactamente los 8 conceptos de la ficha
técnica del CM. \*Del Bloque 8, al menos el primer caso (una jornada normal,
registrar → aprobar) sí conviene hacerlo siempre: es la funcionalidad más
usada del portal interno.

---

## Bloque 1 — Sitio público (~35 min) — Imprescindible

Objetivo: confirmar que las 16 páginas cargan y hacen lo que prometen (frente
de **Funcionalidad** de la ficha del CM).

- [ ] **Inicio (`/`)**: hero, bloque "Nuestros valores", resumen de
  servicios, banda EXCELENCIA con las 4 cifras, logos de clientes, botón
  "Contáctanos". Pasa el mouse por "Servicios" en el menú: debe desplegar el
  mega-menú con las dos categorías (Industriales/Ambientales) y sus 11
  servicios.
- [ ] **Nosotros (`/nosotros`)**: presentación de la empresa, valores, video
  institucional (clic para reproducir), acordeón de preguntas frecuentes
  (clic en una pregunta la expande, clic otra vez la cierra).
- [ ] **Servicios (`/servicios`)**: hub con las dos categorías y tarjetas
  hacia los 11 servicios.
- [ ] **Ficha de un servicio** (prueba al menos 2: uno del principio y uno
  del final de la lista, p. ej. `automatizacion-y-control` e `iso-14001`):
  - Breadcrumbs arriba: Inicio > Servicios > [nombre del servicio].
  - Bloque "¿Qué incluye este servicio?" con la lista de ítems.
  - Galería de imágenes, si el servicio tiene.
  - Botón "Cotiza este servicio" → abre WhatsApp con un mensaje ya armado
    mencionando el servicio.
  - Barra lateral "Todos los servicios" (enlaza a los demás).
  - Al pie: navegación "Servicio anterior / Todos los servicios / Servicio
    siguiente" — en el primer servicio no debe aparecer "anterior", en el
    último no debe aparecer "siguiente" (y el diseño no debe romperse).
  - Entra puntualmente a **Recurso Hídrico** (`/servicios/recurso-hidrico`):
    en el sitio viejo este enlace daba error 404 — confirma que carga bien.
- [ ] **Proyectos (`/proyectos`)**: tarjetas de proyectos realizados, con
  imagen, cliente y descripción.
- [ ] **Contacto (`/contacto`)**:
  - Tarjetas de dirección, teléfonos, correos y horario.
  - Botones "Escríbenos directo por WhatsApp" (uno por cada número) → abren
    WhatsApp Web/app con el número correcto.
  - Iconos de Facebook, Instagram y YouTube → abren en pestaña nueva.
  - **Formulario de contacto**: llénalo y envíalo → debe abrir WhatsApp con
    el mensaje armado a partir de lo que escribiste.
  - **Mapa de Google Maps** embebido: debe cargar y dejarse hacer zoom/mover.
- [ ] **Botón flotante de WhatsApp**: visible abajo a la derecha en todas las
  páginas públicas; ábrelo y confirma que manda a WhatsApp. Ve a `/mi-cuenta`
  o `/admin` y confirma que **no aparece** ahí (es a propósito).
- [ ] **Página 404**: entra a una URL inventada, p. ej. `/esto-no-existe`.
  Debe mostrar la página "Página no encontrada" con botones "Ir al inicio" y
  "Ver servicios", no un error crudo del navegador.

**Resultado esperado:** 0 enlaces rotos, 0 imágenes que no cargan, formulario
y botones de WhatsApp funcionando, mapa y video visibles.

---

## Bloque 2 — Responsive y navegadores (~20 min) — Imprescindible

Objetivo: cubrir los frentes de **Responsive** y **Compatibilidad entre
navegadores**.

- [ ] Abre Inicio, una ficha de servicio y Contacto. Con las herramientas de
  desarrollador del navegador (F12 → ícono de dispositivo), prueba los
  anchos **360, 768, 1024 y 1440 px** (los mismos de la auditoría). En cada
  uno revisa:
  - [ ] No hay scroll horizontal (la página no se corre hacia los lados).
  - [ ] No hay texto que se superponga con otro elemento.
  - [ ] El menú se ve y se usa bien (hamburguesa en móvil, completo en
    escritorio).
  - [ ] Las imágenes no se ven cortadas ni deformadas.
- [ ] Repite Inicio y Contacto en **al menos 2 navegadores de escritorio**
  (por ejemplo Chrome y Firefox, o Edge y Firefox). Mira la consola (F12 →
  Console) en cada uno: no debe haber errores en rojo.
- [ ] Si tienes Mac o iPhone a mano, abre el sitio en **Safari real** — es
  justo lo que la auditoría de laboratorio no pudo cubrir (se probó el motor
  WebKit vía herramientas automatizadas, no Safari de verdad).
- [ ] Abre el sitio en tu **celular real** (ver nota de la sección "Antes de
  empezar"): navega el menú, abre un servicio, prueba el formulario de
  contacto con el teclado del teléfono.

**Resultado esperado:** mismo comportamiento en todos los anchos y
navegadores probados; 0 errores de consola.

---

## Bloque 3 — Accesibilidad rápida (~10 min) — Imprescindible

Objetivo: cubrir el frente de **Accesibilidad** sin herramientas, solo con
teclado. Es barato de hacer y es exactamente lo que el CM va a preguntar.

- [ ] Abre Inicio. **Sin tocar el mouse**, presiona `Tab`. El primer elemento
  que debe recibir foco es un enlace "Saltar al contenido" (invisible hasta
  que tiene foco). Presiona `Enter`: debe llevarte directo al contenido
  principal, saltándose el menú.
- [ ] Sigue presionando `Tab` por el menú y los botones: en cada parada debe
  verse un **contorno de foco** claro alrededor del elemento (nunca debe
  "perderse" el foco sin que se note dónde está).
- [ ] Achica la ventana (o usa el modo de dispositivo) para que aparezca el
  menú hamburguesa. Ábrelo con clic. Con el menú abierto, presiona `Escape`:
  debe cerrarse y el foco debe volver al botón que lo abrió.
- [ ] Ve a Nosotros, usa `Tab` hasta llegar a una pregunta del acordeón de
  FAQ y presiona `Enter` o `Espacio`: debe expandirse. Repite sobre la misma
  pregunta: debe colapsarse.
- [ ] (Opcional) En escritorio, usa `Tab` para llegar al enlace "Servicios"
  del menú principal: el mega-menú debe desplegarse también por teclado, no
  solo con el mouse.

**Resultado esperado:** todo lo anterior se puede hacer sin usar el mouse ni
una sola vez, y el foco siempre es visible.

---

## Bloque 4 — Login y roles (~25 min) — Imprescindible

Objetivo: verificar la matriz de permisos de los 4 roles.

**Requisito previo:** necesitas una cuenta activa de cada uno de los 4 roles
(admin, coordinador, Community Manager, empleado). Ya tienes la de admin
(`admin@gpiprofesionales.com`). Si no existen las otras 3 todavía, créalas
ahora mismo desde el panel:

1. Entra a `/mi-cuenta` con la cuenta admin → botón **"Ir al panel"** →
   **Equipo** en el menú lateral → **Nueva cuenta**.
2. Repite 3 veces (rol coordinador, rol Community Manager, rol empleado):
   nombre, usuario (minúsculas, sin tildes ni espacios), rol. Al guardar, el
   panel muestra **usuario y contraseña una sola vez** — anótalos en tu nota
   personal, los vas a reusar en los Bloques 6, 8 y 9.

Con las 4 cuentas listas:

- [ ] **Administrador**: cierra sesión, entra con la cuenta admin. Debe ver
  en el menú lateral: Dashboard, Servicios, Proyectos, Clientes, FAQ,
  Valores, Contacto y ajustes, **Equipo, Horarios y Jornadas**.
- [ ] **Coordinador**: mismo acceso que admin, salvo que en Equipo no debe
  poder crear, editar, restablecer contraseña ni eliminar una cuenta de rol
  Administrador (verifica que esas acciones no estén disponibles sobre la
  cuenta admin).
- [ ] **Community Manager**: en el menú lateral debe ver solo Dashboard,
  Servicios, Proyectos, Clientes, FAQ, Valores y Contacto y ajustes — **NO**
  debe aparecer Equipo, Horarios ni Jornadas. Cierra sesión desde el panel,
  vuelve a entrar por `/mi-cuenta`: debe ver, además del botón "Ir al panel",
  su propio portal de jornadas más abajo (puede registrar sus propias horas).
- [ ] **Empleado**: entra por `/mi-cuenta`. Debe caer directo en el portal de
  jornadas (registrar jornada, mis jornadas, mi contraseña) — **sin** botón
  "Ir al panel". Con esta sesión, escribe a mano en la barra de direcciones
  `/admin`: debe rebotarte fuera del panel, no dejarte entrar.
- [ ] **Credenciales incorrectas**: en `/mi-cuenta`, intenta entrar con un
  usuario que no existe o una contraseña equivocada → debe mostrar "Usuario o
  contraseña incorrectos", no un error técnico.

**Resultado esperado:** cada rol ve exactamente lo que le corresponde según
la tabla de `docs/ADMIN.md` sección 4; nadie entra a una sección que no le
toca ni tecleando la URL directamente.

---

## Bloque 5 — Panel de contenido (~15 min) — Imprescindible

Objetivo: confirmar que GPI puede editar su propio sitio sin ayuda técnica.

- [ ] **Editar un servicio**: entra a Servicios, abre uno cualquiera, cambia
  el texto del resumen, guarda. Abre el sitio público en otra pestaña
  (incógnito o recarga fuerte) y confirma que el cambio ya se ve — no debería
  hacer falta esperar.
- [ ] **Subir una imagen**: en ese mismo servicio (o en Proyectos), usa el
  campo de imagen para subir un archivo desde tu computador. Debe mostrarte
  una vista previa y, al guardar, la imagen debe verse en el sitio público.
- [ ] **Ocultar/mostrar un elemento**: en Clientes o en FAQ, cambia el
  interruptor "Visible/Oculto" de un ítem a Oculto, guarda, confirma que
  desaparece del sitio público (pero sigue en la lista del panel). Vuelve a
  activarlo y confirma que reaparece.
- [ ] **Apagar una sección del inicio**: ve a Contacto y ajustes →
  "Visibilidad de secciones", apaga por ejemplo "Preguntas frecuentes",
  guarda, confirma que el acordeón de FAQ desaparece de Nosotros. Vuelve a
  activarlo.
- [ ] **Cambiar un dato de contacto**: edita un teléfono o el horario de
  atención en Contacto y ajustes, guarda, confirma en `/contacto` que
  cambió.

**Resultado esperado:** todos los cambios se reflejan en el sitio público de
inmediato, sin tocar código ni redeploy.

---

## Bloque 6 — Empleados y cuentas (~15 min) — Si alcanza el tiempo

Objetivo: probar el ciclo de vida completo de una cuenta (más allá de solo
crearla, que ya hiciste en el Bloque 4).

- [ ] Entra a Equipo, abre la ficha de una de las cuentas de prueba que
  creaste en el Bloque 4 (usa la de rol empleado).
- [ ] **Restablecer contraseña**: pulsa el botón, confirma que te muestra
  una contraseña nueva de un solo uso. Cierra sesión, entra con esa cuenta
  usando la contraseña **nueva** (la vieja ya no debería servir).
- [ ] **Desactivar**: vuelve como manager, desactiva esa misma cuenta.
  Intenta iniciar sesión con ella: debe mostrar "Tu cuenta está
  desactivada", no dejarla entrar.
- [ ] **Reactivar** la cuenta y confirma que puede volver a entrar.
- [ ] **Eliminar** (zona de peligro): hazlo solo al final, después de
  terminar los Bloques 8 y 9 si vas a usar esta misma cuenta ahí — eliminar
  borra también todas sus jornadas. El panel exige escribir el usuario exacto
  y confirmar en el navegador antes de borrar.

**Resultado esperado:** cada acción (restablecer, desactivar, reactivar,
eliminar) tiene efecto inmediato y el mensaje que ve la persona afectada es
claro.

---

## Bloque 7 — Horarios mensuales (~10 min) — Si alcanza el tiempo

Objetivo: probar `/admin/horarios` (solo admin y coordinador).

- [ ] Entra a Horarios. Debe mostrar el mes actual con una tabla de lunes a
  domingo.
- [ ] Navega con las flechas ← → a un mes que no exista todavía: debe
  **autocrearse** clonando el mes anterior (o el horario predeterminado) y
  mostrar un aviso explicando de dónde salió.
- [ ] Edita un día: cambia la hora de salida de un día laboral (por ejemplo,
  adelanta el viernes a las 4:00 p. m.) o marca un día como "No laboral".
  Mientras editas, las celdas **"Horas de jornada"** y **"Total de horas
  semanales"** deben recalcularse solas, sin recargar la página.
- [ ] Escribe algo en "Nota del mes" (opcional) y pulsa **Guardar horario**.
  Recarga la página (F5) y confirma que el cambio quedó guardado.
- [ ] Pulsa **"Restablecer al horario predeterminado"**: la tabla debe
  volver al horario base (L–J 8:00 a. m.–5:30 p. m., V 8:00 a. m.–5:00 p. m.,
  1 h de almuerzo). Recuerda que hay que pulsar Guardar de nuevo para que
  aplique — solo restablecer no basta.

**Resultado esperado:** el horario de cada mes se edita y se guarda de forma
independiente; el cálculo de horas de jornadas de ese mes usa lo que quede
guardado aquí.

---

## Bloque 8 — Jornadas de punta a punta (~30 min) — Si alcanza el tiempo*

Objetivo: probar el flujo completo de registro y aprobación de horas extra.
Usa la cuenta de prueba de rol **empleado** del Bloque 4 para registrar, y la
cuenta admin o coordinador para aprobar.

- [ ] **Jornada normal**: como empleado, en `/mi-cuenta`, registra una
  jornada de un día laboral (p. ej. lunes, 8:00 a. m. a 5:30 p. m.), con
  número de orden de trabajo y descripción. Mientras llenas el formulario,
  observa la vista previa **"Así quedarían tus horas"**: debe actualizarse
  sola con cada cambio.
- [ ] **Turno que cruza medianoche**: registra otra jornada marcando la
  casilla **"Terminé al día siguiente"**, con hora de inicio en la noche
  (p. ej. 8:00 p. m.) y hora de fin en la madrugada (p. ej. 2:00 a. m.).
  Confirma que el sistema lo detecta y lo explica en la vista previa.
- [ ] **Turno en domingo** (para ver el recargo dominical/festivo): registra
  una jornada con fecha de un domingo cualquiera. La vista previa debe
  mostrar todo el turno como recargo dominical/festivo, no como horas
  ordinarias, aunque el horario diga que ese día no es laboral.
- [ ] **Aprobar**: entra como admin o coordinador a `/admin/jornadas`
  (pestaña Aprobaciones), filtra por "Pendientes", abre el desglose de la
  jornada normal y pulsa **Aprobar** (pide confirmación).
- [ ] **Rechazar**: sobre otra de las jornadas pendientes, pulsa
  **Rechazar** e intenta enviar sin escribir nada en "Motivo del rechazo":
  no debe dejarte — el motivo es obligatorio. Escribe un motivo y confirma.
- [ ] **Qué ve el empleado**: vuelve a entrar con la cuenta empleado, ve a
  "Mis jornadas": la aprobada debe decir "Aprobada" y la rechazada
  "Rechazada" con el motivo visible.
- [ ] **Edición de pendientes**: confirma que una jornada **pendiente** se
  puede editar o eliminar desde "Mis jornadas", y que una ya aprobada o
  rechazada **no** trae esos botones.

**Congelamiento del cálculo — nota importante antes de probarlo:**

> Esta función depende de una migración (`0004_congelar_desglose.sql`) que
> **no está listada todavía** en `docs/ADMIN.md` ni en `docs/PLAN.md` — es
> reciente. Al momento de escribir este plan (29 de julio), el guardado del
> cálculo al aprobar sí está implementado en el servidor
> (`src/app/admin/jornadas/actions.ts`), pero las pantallas que **muestran**
> el desglose (Aprobaciones, Mis jornadas, tablero de Métricas) todavía
> podrían estar recalculando en vivo en vez de leer el valor guardado — puede
> que ya se haya terminado de conectar para cuando pruebes esto. **Si el
> número cambia visualmente en pantalla, no lo marques de una todavía como
> error**: confírmalo primero (pregúntame a mí o revisa si la migración 0004
> ya se aplicó en Supabase) antes de anotarlo como hallazgo.

- [ ] Aprueba una jornada y anota su desglose de horas (ordinarias / extra)
  tal como se ve en pantalla.
- [ ] Ve a `/admin/horarios` y cambia el horario de ese mismo mes (p. ej.
  adelanta la hora de salida 1 hora), guarda.
- [ ] Vuelve a `/admin/jornadas` y revisa la misma jornada ya aprobada:
  compárala con lo que anotaste. Revisa también una jornada **pendiente** del
  mismo mes: su desglose sí debe reflejar el horario nuevo.
- [ ] Si quieres confirmar el dato "de fondo" sin depender de si la pantalla
  ya lo usa: en el Dashboard de Supabase → Table Editor → tabla `jornadas` →
  la fila de la jornada aprobada → columnas `desglose`, `contexto_calculo` y
  `calculado_at` deberían tener contenido (no estar vacías) si la migración
  0004 está aplicada y la aprobación quedó bien guardada.

**Resultado esperado (una vez todo esté conectado):** la jornada aprobada
mantiene siempre el mismo desglose sin importar qué cambie después en
Horarios; solo las pendientes reflejan el horario más reciente.

---

## Bloque 9 — Tablero de métricas (~15 min) — Si alcanza el tiempo

Objetivo: probar `/admin/jornadas?vista=metricas` (usa las jornadas que
registraste en el Bloque 8; si está vacío, el tablero debe mostrar un mensaje
amable, no un error).

- [ ] **4 indicadores** arriba: "Jornadas registradas", "Empleados con
  jornadas", "Total de horas" y "Horas extra". Pasa el mouse sobre el valor
  de "Total de horas" y "Horas extra": debe aparecer el dato exacto en
  minutos.
- [ ] **8 gráficas**: "Horas trabajadas por día", "Composición de horas",
  "Tendencia semanal de horas extra", "Horas por empleado", "Horas extra por
  empleado" (solo aparece si hay extras en el período), "Turnos del día
  (entrada → salida)", "Horas por orden de trabajo" y "Estado de las
  jornadas". Revisa que cada una tenga datos si registraste jornadas variadas
  en el Bloque 8.
- [ ] **Filtros**: cambia el rango de fechas, elige un empleado específico
  en el desplegable de Empleados, cambia el filtro de Estado — el tablero
  completo (KPIs, gráficas y tabla) debe actualizarse al instante, sin
  recargar la página.
- [ ] **Control de horas extra por semana**: si alguna de tus jornadas de
  prueba pasó el tope diario o semanal configurado, debe aparecer una fila de
  alerta con el empleado, la semana y el estado ("Revisar día" o "Supera el
  tope semanal").
- [ ] **Exportar CSV**: pulsa "Exportar CSV", abre el archivo descargado en
  Excel (o Google Sheets) y confirma que las columnas y los datos se ven
  correctos, sin caracteres raros por acentos o símbolos.

**Resultado esperado:** el tablero es usable sin explicación técnica (los
botones "Ayuda" de cada tarjeta explican los términos en lenguaje llano) y el
CSV abre limpio en Excel.

---

## Bloque 10 — Verificación técnica visible (~15 min) — Imprescindible

Objetivo: preparar lo que puedes **mostrar en vivo** en la reunión si el CM
pide evidencia en pantalla, no solo cifras en un informe.

- [ ] **Cabeceras de seguridad**: abre cualquier página del sitio, `F12` →
  pestaña **Red/Network** → recarga la página (`Ctrl+R`) → haz clic en el
  primer documento de la lista (el HTML de la página, normalmente el primer
  renglón) → panel de la derecha, pestaña **Headers/Encabezados** → sección
  **Response Headers**. Ahí deben verse `content-security-policy`,
  `strict-transport-security`, `x-content-type-options`, `x-frame-options`,
  `referrer-policy`, `permissions-policy` y `x-dns-prefetch-control`. Confirma
  también que **no** aparece `x-powered-by`.
- [ ] **Lighthouse en vivo**: `F12` → pestaña **Lighthouse** → marca las 4
  categorías (Performance, Accessibility, Best Practices, SEO) → modo
  **Desktop** (así fue la auditoría) → botón **Analyze page load**. Espera el
  resultado — sirve para mostrarle al CM el 100/100/100/100 corriendo delante
  de él, no solo en una captura del informe. Hazlo en la URL de producción
  (Vercel), no en local, para que el resultado sea representativo.
- [ ] **Sitemap y robots**: abre `/sitemap.xml` y `/robots.txt` directamente
  en el navegador (agregándolos a la URL del sitio). El sitemap debe listar
  16 URL; el robots.txt debe excluir `/admin` y `/mi-cuenta`.

**Resultado esperado:** puedes hacer estos tres pasos sin tropiezos delante
del CM, en menos de 5 minutos, como demostración en vivo de las secciones 2.6,
2.7 y 2.8 de `docs/REUNION_VIERNES.md`.

---

## Cierre — hallazgos

Anota acá cualquier cosa que no se haya visto o comportado como se esperaba,
para pasármela después. Severidad: **Bloqueante** (hay que arreglarlo antes
del viernes), **Importante** (arreglar pronto, no bloquea la reunión), **Menor**
(cosmético o de bajo impacto).

| Bloque | Página / sección | Qué pasó | Severidad |
| :---: | --- | --- | :---: |
| | | | |
| | | | |
| | | | |
| | | | |
| | | | |
