# Reunión del viernes con el Community Manager de GPI

> Documento interno de preparación para César — **no es para GPI**. Es la
> chuleta para llegar con las respuestas a la mano. El documento que sí se le
> entrega a GPI es `docs/INFORME_SITIO_GPI.html` (más `docs/MANUAL_SITIO_GPI.html`
> si quiere el detalle operativo del panel).

## 1. Contexto y objetivo de la reunión

El community manager (CM) de GPI ya tenía su propio prototipo del sitio y un
"informe técnico de diseño y desarrollo" — le gustó el sitio nuevo que
construimos. El viernes la reunión es una **validación técnica conjunta**
contra su ficha técnica: mecanismo/funcionalidad, responsive, compatibilidad
entre navegadores, accesibilidad, certificado SSL, políticas de seguridad,
rendimiento, y SEO técnico + Core Web Vitals.

**Qué quiere el CM:** confirmar que el sitio cumple los estándares técnicos
que él ya había planteado, y entender el mecanismo y la funcionalidad para
poder avalarlo internamente en GPI.

**Qué queremos nosotros:** salir con validación técnica (que no haya
objeciones de fondo en los 8 frentes) y **luz verde para conectar el dominio**
`gpiprofesionales.com` — hoy sigue apuntando al hosting viejo de GoDaddy.

**Cómo llegar:** el sitio vive hoy en **<https://website-gpi.vercel.app/>**
(entorno de prueba, todavía no en el dominio final). Lleva abierto en el
navegador: esa URL, `/admin` con sesión iniciada, y
`docs/INFORME_SITIO_GPI.html` para señalar tablas si el CM pide una cifra
puntual.

Tono para toda la reunión: el CM **es aliado, no competencia** — su plan
técnico fue el punto de partida y este documento (sección 5) muestra cómo se
respetó y se llevó más lejos.

---

## 2. Los 8 conceptos que el CM va a mencionar

Todas las cifras son de la **auditoría del 28 de julio de 2026**, corrida
sobre el **build de producción** (no `npm run dev`). Fuente ampliada:
`docs/INFORME_SITIO_GPI.html`, capítulo 4.

### 2.1 Funcionalidad

- **Qué es:** que cada página, botón, formulario y enlace haga exactamente lo
  que promete, sin errores. Es la validación más básica de un sitio.
- **Qué tiene nuestro sitio:** las 16 páginas cargan sin errores de consola;
  imágenes, mapa de Google y video de YouTube embebidos funcionan; el
  formulario de contacto arma el mensaje y lo manda a WhatsApp; el enlace a
  "Recurso Hídrico" que daba 404 en el sitio viejo ya funciona.
- **Dato exacto:** *"7 de 7 rutas probadas responden HTTP 200, 0 errores de
  consola, 100 % de imágenes cargan correctamente, formulario conectado a
  WhatsApp."*
- **Si pregunta más:** ofrece hacer la demo en vivo ahí mismo — es
  literalmente el Bloque 1 de `docs/PLAN_PRUEBAS.md`. Si menciona el enlace
  roto del sitio viejo, es el gancho perfecto para señalar que ya se corrigió.

### 2.2 Responsive

- **Qué es:** que el sitio se vea y se use bien sin importar el tamaño de
  pantalla — celular, tableta o computador.
- **Qué tiene nuestro sitio:** diseño "mobile-first" (se piensa primero para
  pantalla chica y se expande hacia arriba), menú hamburguesa en celular,
  mega-menú en escritorio.
- **Dato exacto:** *"28 combinaciones probadas (7 páginas × 4 anchos: 360,
  768, 1024 y 1440 px) — 0 con desplazamiento horizontal, 0 con texto
  solapado."*
- **Si pregunta más:** admite que falta probarlo en un celular físico real con
  red 4G (sección 4). Si el CM tiene el teléfono a mano, ábrelo ahí mismo — es
  la prueba de campo más fácil de hacer en vivo.

### 2.3 Compatibilidad entre navegadores

- **Qué es:** que el sitio se vea y funcione igual sin importar qué navegador
  use el visitante (Chrome, Edge, Firefox, Safari…).
- **Qué tiene nuestro sitio:** se probó contra los tres motores que cubren,
  entre los tres, casi todo el mercado de navegadores.
- **Dato exacto:** *"Chromium (Chrome/Edge), Firefox 148 y WebKit 26.4 (motor
  de Safari) — 0 errores de consola, 0 violaciones de CSP, 100 % de imágenes y
  estilos cargados en los tres."*
- **Si pregunta más:** aclara que WebKit se probó vía Playwright (el motor
  real de Safari), no en un iPhone o Mac físico — eso queda pendiente de
  "campo" (sección 4).

### 2.4 Accesibilidad (WCAG / axe)

- **Qué es:** que cualquier persona pueda usar el sitio, incluida gente que
  navega solo con teclado o con lector de pantalla.
- **Qué tiene nuestro sitio:** enlace "Saltar al contenido", foco visible en
  todo, menús cerrables con Escape, acordeón de FAQ operable por teclado,
  formularios con etiquetas asociadas, contraste de color corregido,
  preferencia de "menos movimiento" del sistema respetada.
- **Dato exacto:** *"axe-core (WCAG 2.1 A+AA) en 8 páginas → 0 violaciones (se
  detectaron y corrigieron 3 reales de contraste durante la auditoría).
  Lighthouse Accesibilidad 100/100. El verde de marca como texto pasó de
  2.88:1 a 4.74:1; rótulos sobre fondo suave 6.17:1; footer 9.17:1."*
- **Si pregunta más:** el salto de 2.88:1 → 4.74:1 es el dato más fuerte
  porque demuestra que se **encontró y corrigió** un problema real, no que "ya
  venía bien". Si pregunta por lectores de pantalla reales (NVDA/VoiceOver),
  admite que no se probaron todavía (sección 4).

### 2.5 Certificado SSL / HTTPS (+ HSTS)

- **Qué es:** el "candado" del navegador; sin él, los navegadores modernos
  advierten "sitio no seguro". SSL es el nombre viejo — hoy el protocolo real
  es TLS.
- **Qué tiene nuestro sitio:** Vercel emite y renueva el certificado
  automáticamente al conectar el dominio (Let's Encrypt, cero gestión manual,
  cero costo adicional). Además se envía HSTS, que obliga al navegador a no
  volver a hablar por HTTP con el dominio.
- **Dato exacto:** *"HSTS activo, 2 años (max-age=63072000). El dominio actual
  ya tiene un certificado Let's Encrypt válido, TLS 1.2, vigente hasta el 10
  de septiembre de 2026."*
- **Si pregunta más:** el certificado **definitivo** del hosting nuevo se
  emite automático apenas se apunte el DNS — no hay que hacer nada manual ni
  pagar nada. Si pregunta por qué no lleva `includeSubDomains`/`preload`, ver
  sección 3.

### 2.6 Políticas de seguridad (cabeceras HTTP)

- **Qué es:** instrucciones que el sitio le da al navegador para reducir
  riesgos comunes (inyección de contenido ajeno, suplantación visual, robo de
  información). Se implementan con cabeceras HTTP en cada respuesta.
- **Qué tiene nuestro sitio:** Content-Security-Policy, Strict-Transport-Security,
  X-Content-Type-Options (`nosniff`), X-Frame-Options (`SAMEORIGIN`),
  Referrer-Policy (`strict-origin-when-cross-origin`), Permissions-Policy
  (cámara/micrófono/ubicación/pagos bloqueados) y X-DNS-Prefetch-Control.
  Además: sesiones seguras, verificación de rol siempre en el servidor (nunca
  solo en pantalla) y seguridad a nivel de fila en la base de datos.
- **Dato exacto:** *"0 de 7 cabeceras de seguridad en el sitio anterior → 7 de
  7 en el nuevo. `x-powered-by` eliminado (no se anuncia el framework). 0
  violaciones de CSP en las pruebas con los tres navegadores."*
- **Si pregunta más:** ver sección 3 para el detalle de por qué la CSP
  conserva `'unsafe-inline'` en `script-src` — es la pregunta técnica más
  probable de todo el frente de seguridad.

### 2.7 Rendimiento

- **Qué es:** qué tan rápido carga el sitio y qué tan fluido se siente
  usarlo.
- **Qué tiene nuestro sitio:** medido con Lighthouse (herramienta de
  referencia de Google) sobre el build de producción, en modo escritorio, en
  4 rutas representativas.
- **Dato exacto:** *"Lighthouse Rendimiento 100/100. LCP 0.7 s, CLS 0, TBT 0
  ms. JS público ~194 KB comprimido; la librería de gráficas del panel (123
  KB comprimido) NO se descarga en el sitio público, solo dentro de
  `/admin`."*
- **Si pregunta más:** aclara que son mediciones de **laboratorio en
  escritorio** (localhost, red controlada) — los datos de campo con usuarios
  reales llegan después del lanzamiento (sección 4).

### 2.8 SEO técnico y Core Web Vitals

- **Qué es:** que Google y los demás buscadores puedan encontrar, entender y
  mostrar bien el sitio de GPI en sus resultados.
- **Qué tiene nuestro sitio:** título y descripción únicos en las 16 páginas,
  `sitemap.xml`, `robots.txt`, enlaces canónicos, JSON-LD (`Organization`,
  `LocalBusiness`, `BreadcrumbList`, `Service` por cada servicio, `FAQPage`),
  jerarquía de encabezados correcta (1 H1 por página), y `/admin` +
  `/mi-cuenta` con `noindex` y fuera del sitemap.
- **Dato exacto:** *"Lighthouse SEO 100/100. Sitemap con 16 URL registradas.
  Core Web Vitals de laboratorio: LCP 0.7–0.8 s, CLS 0."*
- **Si pregunta más:** los datos de **campo** de Core Web Vitals (CrUX) solo
  existen cuando el dominio real tiene tráfico — es una oportunidad declarada
  para después del lanzamiento, no una carencia de hoy.

---

## 3. Decisiones técnicas que conviene saber defender

Por si el CM las cuestiona — todas están documentadas como comentarios en
`next.config.ts`:

- **La CSP es estricta en todo salvo `script-src`**, que conserva
  `'unsafe-inline'`. La alternativa (nonce + `strict-dynamic` generado en
  `src/proxy.ts`) obligaría a renderizado dinámico en **todas** las páginas y
  mataría el ISR/CDN de Vercel (LCP y costo de hosting se degradarían). El
  sitio público no inyecta HTML de terceros ni contenido de usuarios, así que
  el riesgo real que ese endurecimiento mitiga es bajo aquí. Lo que sí queda
  cerrado y es lo que de verdad contiene el daño: `default-src 'self'`,
  `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`,
  `frame-ancestors 'self'` y listas blancas explícitas de `frame-src`,
  `img-src` y `connect-src`. Mejora futura: aplicar nonce solo a `/admin` y
  `/mi-cuenta` (ya son `force-dynamic`), dejando el sitio público estático.
- **HSTS sin `includeSubDomains` ni `preload`, a propósito.** Los subdominios
  de `gpiprofesionales.com` (`mail.`, `webmail.`, `cpanel.`) sirven el
  **correo** de GPI desde el cPanel de GoDaddy — forzarlos a HTTPS desde acá
  podría dejar el webmail inaccesible. Se endurece a
  `includeSubDomains; preload` cuando se confirme que todos los subdominios
  sirven HTTPS válido.
- **El certificado TLS lo emite y renueva Vercel automáticamente** al
  conectar el dominio — no es un trámite pendiente ni algo que GPI deba
  gestionar. Hoy el dominio sigue apuntando al sitio viejo, con su propio
  certificado Let's Encrypt válido (TLS 1.2, vence 10 sep 2026).
- **Las mediciones son de laboratorio en escritorio (localhost)**, no de
  campo. Los datos con usuarios reales (CrUX, INP real) solo se pueden medir
  una vez el dominio esté conectado y reciba tráfico.

---

## 4. Qué NO está medido (dilo si preguntan — da credibilidad)

Admitirlo de entrada es mejor que dejar que el CM lo descubra preguntando:

- **Rendimiento en móvil real con 4G** — solo se midió en escritorio, en
  condiciones de red controladas.
- **Lectores de pantalla reales** (NVDA en Windows, VoiceOver en macOS/iOS) —
  el análisis de accesibilidad fue automatizado (axe-core) más revisión manual
  de teclado y contraste, no una sesión con un lector de pantalla real.
- **Safari real en macOS/iOS** — se probó el motor WebKit 26.4 vía Playwright,
  que es el mismo motor de renderizado, pero no la app Safari en un
  dispositivo Apple físico.
- **Las páginas del panel (`/admin`) quedaron fuera del barrido de axe** —
  están detrás de login, así que el análisis automatizado de accesibilidad
  cubrió el sitio público y `/mi-cuenta`, no cada pantalla interna del panel.

Ninguno de estos puntos es un defecto conocido — son, simplemente, pruebas que
todavía no se hicieron. Encuádralo como la ruta de mejora continua post-lanzamiento
(ver también el capítulo 5 de `docs/INFORME_SITIO_GPI.html`).

---

## 5. Alineación con el plan del CM

| Punto del plan del CM | Estado en el sitio construido |
| --- | --- |
| Identidad visual: verde/gris corporativo, tipografía Inter, tarjetas, microanimaciones, espacio en blanco | Implementada tal cual — Inter en textos, Manrope en títulos, misma paleta de marca |
| Referentes industriales (Siemens, ABB, Schneider Electric) | Lograda — estética industrial moderna, bloques claros, jerarquía visual definida |
| Arquitectura: Inicio, Nosotros, Servicios Industriales, Servicios Ambientales, Casos de Éxito, Clientes, Contacto | Cubierta en su totalidad — "casos de éxito" vive en Proyectos; clientes aparece en Inicio y en su propia sección |
| Posible línea de Obras Civiles | Lista para sumarse cuando GPI la confirme (agenda propia, sección 6) |
| Ficha de validación técnica (responsive, SSL, seguridad, accesibilidad, SEO, rendimiento) | Resuelta y medida — sección 2 de este documento |

**Lo que la plataforma suma sobre el plan original** (útil si el CM pregunta
"y esto qué le da a GPI que yo no había puesto"):

- **Autonomía total**: GPI edita su propio contenido desde un panel privado,
  sin depender de un tercero ni de conocimientos técnicos.
- **Portal interno de jornadas y horas extra**, con aprobaciones y tablero de
  métricas para nómina — una necesidad operativa que surgió durante el
  proyecto y que ya está resuelta, sin costo ni herramienta adicional.
- **Cuentas con roles diferenciados** (Administrador, Coordinador, Community
  Manager, Empleado) — una capa de seguridad y orden que antes no existía.
- **Una base para crecer**: la misma tecnología permite después conectar
  nómina, CRM o un asistente de atención sin rehacer el sitio.

Encuadre para la conversación: esto **no reemplaza** su plan — es la
continuidad de un trabajo en equipo, llevado un paso más allá gracias a la
tecnología elegida (aplicación web + base de datos gestionada, en vez de HTML
suelto).

---

## 6. Temas que César debe plantear (agenda propia)

No son solo respuestas — hay que llevar preguntas propias a la reunión:

- [ ] **Obras Civiles**: ¿es una línea de negocio activa? El prototipo del CM
  la incluía con 6 subservicios y hay fotos reales que la respaldan — sería la
  mayor adición de contenido pendiente.
- [ ] **Huella de Carbono**: confirmar si es un servicio real a publicar
  (estaba en el prototipo del CM, no está en nuestro sitio).
- [ ] **Misión y Visión**: pedir el texto como bloque para la página Nosotros.
- [ ] **Cifras oficiales para la barra de estadísticas**: el prototipo del CM
  tenía cifras inconsistentes (150+ vs 500+ proyectos) — **no publicar
  ninguna cifra de proyectos/clientes sin confirmar**. Hoy el sitio usa solo
  cifras defendibles (+5 años, 100 %, 11 servicios, 2 áreas).
- [ ] **Video comercial**: definir quién sube `V2 Comercial GPI.mp4` (485 MB)
  al canal de YouTube de GPI para poder embeberlo (hoy el sitio ya tiene
  embebido otro video, "Inspección con Drones 4K" — este sería adicional o
  reemplazo, a confirmar).
- [ ] **Foto del dron**: la que usa el prototipo del CM es una imagen de
  producto DJI (riesgo de derechos de autor/marca) — proponer una foto propia
  de GPI en su lugar.
- [ ] **Horas extra — porcentajes de recargo**: confirmar si los valores de
  la ley colombiana 2026 (los que trae el sistema por defecto) aplican tal
  cual o GPI tiene su propia política.
- [ ] **Horas extra — regla del almuerzo**: hoy se descuenta 1 h
  automáticamente cuando el turno pasa de 6 h en día laboral (porque el
  empleado solo registra entrada/salida, no la hora exacta del almuerzo) —
  confirmar si esa regla es correcta o si GPI prefiere pedir la hora exacta.
- [ ] **Fecha para conectar el dominio**: acordar cuándo. Implica **cancelar
  el hosting de GoDaddy** (no el dominio ni el correo, que se quedan igual).

---

## 7. Glosario rápido

| Sigla | Qué es |
| --- | --- |
| CSP | Content Security Policy — cabecera que limita de qué orígenes puede cargar contenido el navegador |
| HSTS | HTTP Strict Transport Security — obliga al navegador a usar siempre HTTPS con el dominio |
| TLS | Transport Layer Security — el protocolo de cifrado detrás del "candado" (sucesor de SSL) |
| WCAG | Web Content Accessibility Guidelines — el estándar internacional de accesibilidad web |
| AA | Nivel de conformidad de WCAG usado como estándar de facto en la industria y en la mayoría de leyes |
| axe | axe-core — herramienta automática de referencia para auditar accesibilidad contra WCAG |
| LCP | Largest Contentful Paint — tiempo hasta pintar el elemento más grande visible (qué tan rápido se ve "lo importante") |
| CLS | Cumulative Layout Shift — cuánto se mueven los elementos mientras carga la página (estabilidad visual) |
| INP | Interaction to Next Paint — qué tan rápido responde la página a un clic o toque |
| TBT | Total Blocking Time — tiempo que el hilo principal queda bloqueado sin poder responder (proxy de laboratorio del INP) |
| ISR | Incremental Static Regeneration — páginas estáticas que se regeneran solas cada cierto tiempo, sin rehacer el build |
| CDN | Content Delivery Network — red de servidores que sirve el sitio desde el más cercano al visitante |
| JSON-LD | Formato de datos estructurados que le explica a Google qué es la empresa, sus servicios y su ubicación |
| CrUX | Chrome User Experience Report — datos reales de Core Web Vitals de usuarios de Chrome (a diferencia de laboratorio) |
| SSR | Server-Side Rendering — renderizar la página en el servidor en cada petición, en vez de servirla ya generada |

---

*Documentos de apoyo: `docs/INFORME_SITIO_GPI.html` (para entregar a GPI),
`docs/MANUAL_SITIO_GPI.html` (manual de uso detallado) y
`docs/PLAN_PRUEBAS.md` (plan de pruebas para hacer mañana, antes de la
reunión).*
