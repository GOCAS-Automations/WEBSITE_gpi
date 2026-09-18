# Plan de pruebas — Calendario y Nómina (sep 2026)

Guía para que César pruebe en **local** los dos módulos nuevos antes de desplegar.
Marca cada casilla; al final está qué reportar.

> Estado: implementado en los commits locales `9023bcf` (calendario + apodo) y
> `7eb6070` (nómina). Migraciones **0010 y 0011 ya aplicadas** en el GPI Project
> (la base es la real, así que lo que guardes queda guardado). **Sin push.**

## 0. Preparación

- [ ] `npm run dev` → http://localhost:3000
- [ ] Entrar en `/mi-cuenta` con la cuenta **`admin`** (contraseñas en
      `FREELANCE/GPI/Credenciales/CREDENCIALES_EQUIPO_GPI.md`). Debe aterrizar en `/admin`.
- [ ] El menú lateral ahora tiene **ocho entradas**: Dashboard, Contenido del sitio,
      Equipo, Horarios, Jornadas, **Calendario**, **Nómina**, Ajustes.

**Datos reales que ya hay en la base** (útiles para nómina): jornadas **aprobadas** de
`dgomez`, `hdcorrea` y `scordoba` en **agosto 2026** (9, 11 y 8 jornadas) y unas pocas
en septiembre. No hay jornadas pendientes. La quincena más cómoda para probar es
**16–31 de agosto de 2026**.

## 1. Calendario — `/admin/calendario`

### 1.1 Crear y editar
- [ ] **Nuevo evento**: título, fecha, hora inicio y fin, descripción.
- [ ] En **Elegir responsables…**: buscar por nombre o cargo y marcar **dos cuentas**.
- [ ] Añadir un **externo** con la opción «Otro» (ej.: *Ing. Marcela Ruiz (cliente)*).
- [ ] Guardar → el evento aparece en la cuadrícula del mes y en la agenda.
- [ ] Abrir el evento → **Editar evento**: cambiar la hora y quitar un responsable.
- [ ] Intentar guardar con hora de fin **anterior** a la de inicio → debe rechazarlo.

### 1.2 Estados
- [ ] **Marcar cumplido** (verde) y **Volver a programado**.
- [ ] **Marcar incompleto** (rojo suave).
- [ ] **Aplazar a otra fecha** → elegir una fecha posterior → **Confirmar aplazamiento**.
      El evento se mueve de día, queda en ámbar y muestra de qué fecha venía.
- [ ] **Eliminar evento** → pide confirmar («Sí, eliminar definitivamente»).

### 1.3 Notas
- [ ] Desde el detalle del evento: **Agregar una nota** → Guardar nota.
- [ ] Pestaña **Notas**: la nota aparece con evento, autor y fecha.
- [ ] Filtrar por evento, por autor y por rango de fechas.
- [ ] Comprobar que las notas **no** se pintan en la cuadrícula del calendario.

### 1.4 Métricas
- [ ] Pestaña **Métricas**: cumplidos / incompletos y aplazados, tasa de cumplimiento,
      eventos por estado, carga por responsable (incluye externos) y eventos con más notas.
- [ ] Cambiar el rango de fechas y ver que los números responden.
- [ ] Botones **Ayuda**: el texto se entiende sin ser técnico.

### 1.5 Vista del empleado
- [ ] Salir y entrar como **`dgomez`** (asígnale antes un evento como admin).
- [ ] En `/mi-cuenta` ve **Mis eventos** solo con lo suyo, y puede dejar una nota.
- [ ] Escribir a mano `/admin/calendario` → debe rebotarlo (no puede entrar).

## 2. Apodo (solo admin) — `/admin/empleados`

- [ ] Editar un empleado: el campo **Apodo** es editable (Yeison ya tiene «YC»).
- [ ] El apodo aparece como etiqueta corta en los chips de responsables del calendario
      y en las tablas; al pasar el cursor se ve el nombre completo.
- [ ] (Si creas una cuenta *coordinador* para probar) ese rol **ve el apodo pero no lo edita**.

## 3. Nómina — `/admin/nomina`

### 3.1 Configuración (hazlo primero)
- [ ] Pestaña **Configuración** → persona `dgomez` → mes **agosto 2026**.
- [ ] Se crea sola: si no hay mes anterior, con valores sugeridos (`salario / 240 × factor`);
      si lo hay, aparece el aviso **«Copiado del mes anterior»**.
- [ ] Poner el **salario básico mensual** real y revisar las siete tarifas:
      rotación diurna, rotación nocturna (recargo), extra diurna, extra nocturna,
      hora en domingo o festivo, extra diurna en festivo, extra nocturna en festivo.
- [ ] Auxilio de transporte, **Salud** y **Pensión** (4 % y 4 % por defecto).
- [ ] **Guardar cambios** y volver a entrar: los valores persisten.
- [ ] Repetir con `hdcorrea` y `scordoba` (para ver la tabla completa).

### 3.2 Liquidación
- [ ] Pestaña **Liquidación** → tipo **Quincena** → **Segunda (del 16 al fin de mes)**,
      agosto 2026.
- [ ] La tabla lista a las personas con sueldo del período, horas y recargos, otros
      devengados, descuentos, **neto** y estado. Quien no tenga configuración sale
      marcado («Sin salario configurado»).
- [ ] **Crear liquidación** para `dgomez` y abrir el detalle.
- [ ] Revisar el desglose: cantidad de horas por concepto y su valor. **Contrástalo con
      Jornadas** (mismo período, mismo empleado): las horas deben cuadrar.
- [ ] Editar conceptos manuales (bonificación, auxilio, comisión, prima, préstamo,
      otros descuentos) y ver cómo cambia el neto.
- [ ] **Cerrar liquidación** → queda «Congelado al cerrar» (los valores ya no cambian
      aunque después toques la configuración: pruébalo).
- [ ] **Marcar pagada** → **Confirmar pago** con fecha. Probar **Corregir fecha de pago**.
- [ ] **Reabrir** → vuelve a borrador y se recalcula.
- [ ] Exportar el **CSV** del período y abrirlo en Excel: las columnas de horas y valores
      deben quedar como **números**, no como texto.

### 3.3 Volante de pago (PDF)
- [ ] **Descargar volante** de una liquidación cerrada.
- [ ] Revisar: razón social y NIT, empleado, cédula, cargo, período con fechas reales,
      fecha de pago, devengados (con cantidad de horas y valor), descuentos, totales,
      **neto** y las dos firmas.
- [ ] Descargar el volante de una liquidación en **borrador**: debe salir marcado como tal.
- [ ] `/admin/ajustes` → tarjeta **datos de la empresa**: cambiar razón social o NIT y
      comprobar que el volante lo refleja.

### 3.4 Tablero
- [ ] Pestaña **Tablero**: neto pagado por mes, reparto por concepto, neto por persona
      e **historial** con filtros (persona, año, tipo de período, estado).
- [ ] Desde el historial se puede abrir el volante de cada liquidación.

### 3.5 Vista del empleado
- [ ] Entrar como `dgomez` → `/mi-cuenta` → **Mi nómina**: solo liquidaciones
      **cerradas o pagadas**; descargar su volante.
- [ ] Escribir a mano `/admin/nomina` → rebota.

### 3.6 Casos borde que conviene mirar
- [ ] Crear una jornada nueva **sin aprobar** en el período y volver a Liquidación:
      debe avisar «Jornadas sin aprobar en el período» y **no** pagarlas.
- [ ] Liquidar un **mes completo** en vez de quincena.
- [ ] Un empleado sin jornadas en el período: debe liquidar solo sueldo y auxilio.

## 4. Regresión rápida (que nada viejo se rompió)

- [ ] **Jornadas**: aprobar/rechazar una jornada y ver que el botón responde
      (aquí se corrigió un fallo que dejaba el botón en «Guardando…» en producción).
- [ ] **Métricas de jornadas** y su CSV.
- [ ] Sitio público: inicio, un servicio, contacto (el formulario **no** lo pruebes con
      envíos reales innecesarios).

## 5. Qué reportar

Para cada cosa que falle: **dónde estabas, qué hiciste y qué esperabas**. Y aparte, las
decisiones de negocio pendientes con Yeison (están en `docs/PLAN.md`, sección de dudas):
tarifas de domingo y festivo, divisor del valor hora, auxilio de transporte 2026 y
**cuál NIT** va en el volante.
