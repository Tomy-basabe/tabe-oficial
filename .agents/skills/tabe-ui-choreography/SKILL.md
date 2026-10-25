---
name: tabe-ui-choreography
description: >-
  Guía completa y arquitectura del sistema de animaciones y coreografía UI en 4 pilares
  de T.A.B.E. (estilo Apple / Linear / Notion): (1) Entrada en cascada de módulos y
  widgets en Dashboard, (2) Coreografía global en 3 etapas (estructura neutra -> impacto
  de color -> acomodo final) al cambiar de apartado, (3) Filtrado elástico FLIP por año
  y materia con retiro visual de descartados y reacomodo de filtrados, y (4) Apertura y
  cierre elástico de contenido al tocar un botón con aparición progresiva (stagger) y
  repliegue de los botones internos. Úsala siempre que se creen o modifiquen páginas,
  filtros por año/materia, modales, menús desplegables o paneles interactivos.
---

# Sistema de Coreografía y Animaciones UI (Estándar T.A.B.E.)

Esta skill documenta paso a paso la arquitectura completa de animaciones implementada desde el primer requerimiento de animaciones en local hasta el sistema integral de 4 pilares que gobierna toda la aplicación.

---

## Resumen de la Evolución (Línea de Tiempo de Implementación)

1. **Pilar 1 — Coreografía de Entrada Profunda en `/dashboard`:**
   - Se diseñó una aparición progresiva por capas (`containerVariants` con `staggerChildren: 0.08`) donde primero aparece el saludo/hero, luego las tarjetas de estadísticas (`StatCard`), el anillo SVG animado de progreso de carrera, las barras de progreso por estado (`Aprobadas`, `Regulares`, `Cursables`), la tarjeta de racha y el calendario semanal.
2. **Pilar 2 — Coreografía Global en 3 Etapas para Todos los Apartados (`PageTransition.tsx` + `src/index.css`):**
   - Se extendió la experiencia a **todas las rutas principales** (`/dashboard`, `/apuntes`, `/carrera`, `/examenes`, `/calendario`, `/pomodoro`, `/tareas`, `/rutinas`, `/metricas`, `/flashcards`, `/cuestionarios`, `/biblioteca`, `/consultas`, `/mapa`, `/bosque`, `/logros`, `/amigos`, `/comunidad`, `/juegos`, `/configuracion`, `/tabeai`).
   - En lugar de un simple `fade-in`, cada apartado ejecuta una secuencia en **3 fases**:
     1. **Aparición estructural neutra:** Los módulos emergen escalonados (`--module-idx`) con baja saturación cromática (`saturate(0.08)`).
     2. **Impacto de color:** Se enciende el halo ambiental superior con la paleta RGB propia de la ruta (`SECTION_THEMES`) y los íconos/badges de color internos hacen un pulso elástico (`scale(1.06)`, `saturate(1.28)`).
     3. **Acomodo final (Settle):** Todo se asienta suavemente en su posición y color definitivo (`scale(1)`, `saturate(1)`).
3. **Pilar 3 — Animación Profesional de Filtrado por Año, Materia y Categoría (`AnimatePresence mode="popLayout"` + FLIP `layout`):**
   - Implementada en **todos los apartados con filtros y grillas**: `/apuntes` (galería, barra de materias, sidebar y modales), `/flashcards`, `/cuestionarios`, `/carrera`, `/biblioteca`, `/examenes`, `/consultas`, `/tareas`, `/rutinas`, `/pomodoro`, `/calendario`, `/logros`, `/comunidad`, `/juegos`, `/amigos`, `/bosque`, `/metricas`, `/configuracion` y `SubjectSelect`.
   - Al tocar un filtro de año (`Todos`, `1° Año`, `2° Año`...), categoría o pestaña, la píldora activa viaja con física de resorte (`layoutId`), las materias y tarjetas que **no** pertenecen al filtro seleccionado se encogen, desenfocan y desvanecen en el lugar (`exit`), y las que **sí** quedan filtradas se deslizan elásticamente (`layout`) para ocupar los huecos.
4. **Pilar 4 — Acción de Botón Universal + Apertura y Cierre de Contenido con Cascada de Botones Internos (`src/lib/utils.ts`, `PageTransition.tsx`, `button.tsx`, `dialog.tsx`, `alert-dialog.tsx`, `sheet.tsx`, `accordion.tsx`, `collapsible.tsx`, `dropdown-menu.tsx`, `popover.tsx`, `select.tsx`, `ConfirmModalContext.tsx`, `AIBubbleWidget.tsx`, `src/index.css`):**
   - **Acción táctil en todos los botones:** Cada `<button>` y `<Button>` responde al clic con micro-compresión elástica (`scale(0.965)`) y pulso de rebote (`.tabe-btn-clicked`).
   - **Orquestación universal al abrir y cerrar contenido (`orchestrateContentOpen` + `[data-state="closed"]`):** Cuando el usuario toca un botón que abre un contenedor (`Dialog`, `AlertDialog`, `Sheet`, `AccordionContent`, `CollapsibleContent`, `DropdownMenu`, `Popover`, `SelectContent`, `ConfirmModal` o `AIBubbleWidget`), el contenedor se abre con resorte (`.tabe-content-open`), sus secciones internas emergen progresivamente (`.tabe-inner-section-reveal`) y **los botones dentro de ese contenido aparecen de a poco en cascada** (`.tabe-inner-btn-cascade`). Al cerrarse (`[data-state="closed"]` o `exit` de `AnimatePresence`), **los botones y secciones internas se repliegan hacia adentro** (`tabeInnerButtonClose` / `tabeInnerSectionClose`) mientras el contenedor se contrae suavemente (`tabeContentClose` / `tabeCollapsibleClose` / `slide-out`).

---

## Pilar 1: Coreografía de Entrada en Apartados Ricos (`/dashboard`)

Para vistas con múltiples widgets (tarjetas de métricas, gráficos SVG, barras de progreso):

### Reglas clave
- **Contenedor padre con `staggerChildren`:**
  ```tsx
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.04 },
    },
  };
  ```
- **Tarjetas e ítems hijos con curva Apple (`[0.16, 1, 0.3, 1]`):**
  ```tsx
  const itemVariants = {
    hidden: { opacity: 0, y: 18, scale: 0.985 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.48, ease: [0.16, 1, 0.3, 1] },
    },
  };
  ```
- **Barras y anillos de progreso:** Animar `width` o `strokeDashoffset` desde `0` hasta el porcentaje real con un `delay` de `0.25s–0.45s` para que el color llene la barra justo después de que el módulo terminó de posicionarse.

---

## Pilar 2: Coreografía Global en 3 Etapas (`PageTransition.tsx` + `src/index.css`)

Ubicación:
- `src/components/layout/PageTransition.tsx`
- `src/index.css`

### Cómo funciona
1. **Mapa cromático por ruta (`SECTION_THEMES`):**
   Cada ruta define `primaryRgb` y `secondaryRgb` (ej. `/apuntes` usa Violeta `168, 85, 247` y Azul `59, 130, 246`), inyectados como variables CSS `--section-accent-rgb` y `--section-secondary-rgb`.
2. **Orquestador automático del DOM (`orchestrateStageModules`):**
   - Detecta el contenedor `.tabe-page` (o `max-w-*`).
   - Selecciona cabeceras, barras de filtros y tarjetas `.neo-bento-card` o celdas de grillas principales.
   - Asigna `--module-idx` (`0` a `10`) y la clase `.tabe-stage-module`.
   - Dentro de cada módulo, detecta íconos y badges con clases cromáticas (`bg-emerald-`, `text-amber-`, `bg-purple-`, etc.) y les asigna `.tabe-color-impact-badge`.
   - Utiliza un `MutationObserver` activo durante los primeros `2500ms` tras cambiar de ruta para que los módulos que terminan de cargar desde Supabase/caché reciban exactamente la misma coreografía sin afectar interacciones posteriores.

### Keyframes CSS de las 3 Etapas (`src/index.css`)
```css
@keyframes tabeStageModule {
  0% {
    opacity: 0;
    transform: translate3d(0, 18px, 0) scale(0.982);
    filter: saturate(0.08) brightness(0.97);
  }
  46% {
    opacity: 1;
    transform: translate3d(0, -1.5px, 0) scale(1.003);
    filter: saturate(0.25) brightness(1);
  }
  74% {
    opacity: 1;
    transform: translate3d(0, 0.5px, 0) scale(0.999);
    filter: saturate(1.22) brightness(1.02);
    box-shadow:
      0 10px 28px -10px rgba(var(--section-accent-rgb, 59, 130, 246), 0.16),
      0 0 0 1px rgba(var(--section-accent-rgb, 59, 130, 246), 0.18);
  }
  100% {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
    filter: saturate(1) brightness(1);
  }
}
```

---

## Pilar 3: Animación Profesional de Filtrado por Año y Materia (FLIP + `popLayout`)

Cuando el usuario toca un filtro de año (`Todos`, `1° Año`, `2° Año`...) o de materia, debe ver claramente **cómo se retiran los elementos descartados** y **cómo se acomodan fluidamente los que quedan filtrados**.

### Patrón obligatorio en 3 partes

#### A. Píldoras de Filtro por Año con `layoutId`
```tsx
<div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-100/80 dark:bg-zinc-900/90 border border-zinc-200/70 dark:border-zinc-800/80">
  {years.map((year) => {
    const isSelected = selectedYear === year;
    return (
      <button
        key={year}
        type="button"
        onClick={() => setSelectedYear(year)}
        className={cn(
          "relative px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer select-none",
          isSelected ? "text-white dark:text-zinc-900" : "text-zinc-600 dark:text-zinc-400"
        )}
      >
        {isSelected && (
          <motion.span
            layoutId="section-year-pill"
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="absolute inset-0 rounded-lg bg-zinc-900 dark:bg-zinc-100 shadow-2xs"
          />
        )}
        <span className="relative z-10">{year}° Año</span>
      </button>
    );
  })}
</div>
```

#### B. Barra de Materias Animada (Descarte y Reacomodo de Materias)
```tsx
<AnimatePresence mode="popLayout">
  {subjects
    .filter((sub) => selectedYear === null || sub.año === selectedYear)
    .map((sub) => (
      <motion.button
        layout
        key={sub.id}
        type="button"
        initial={{ opacity: 0, scale: 0.82, y: 6, filter: "blur(4px)" }}
        animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
        exit={{
          opacity: 0,
          scale: 0.78,
          y: -6,
          filter: "blur(4px)",
          transition: { duration: 0.18, ease: [0.32, 0, 0.67, 0] },
        }}
        transition={{
          layout: { type: "spring", stiffness: 380, damping: 28, mass: 0.7 },
          duration: 0.22,
        }}
        onClick={() => setSelectedSubject(sub.id)}
      >
        {sub.nombre}
      </motion.button>
    ))}
</AnimatePresence>
```

#### C. Grilla de Tarjetas Filtradas (Apuntes, Mazos, Cuestionarios, Materias, Archivos, Exámenes, Tareas)
- El contenedor grid lleva `<motion.div layout className="grid ...">`.
- Adentro va `<AnimatePresence mode="popLayout">`.
- Cada ítem se envuelve en un `<motion.div layout key={item.id}>` directo (evita problemas de `forwardRef` en componentes memoizados):
```tsx
<motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
  <AnimatePresence mode="popLayout">
    {filteredItems.map((item) => (
      <motion.div
        layout
        key={item.id}
        initial={{ opacity: 0, scale: 0.88, y: 14, filter: "blur(5px)" }}
        animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
        exit={{
          opacity: 0,
          scale: 0.84,
          y: -12,
          filter: "blur(6px)",
          transition: { duration: 0.22, ease: [0.32, 0, 0.67, 0] },
        }}
        transition={{
          layout: { type: "spring", stiffness: 360, damping: 28, mass: 0.72 },
          duration: 0.26,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        <CardComponent item={item} />
      </motion.div>
    ))}
  </AnimatePresence>
</motion.div>
```

---

## Pilar 4: Acción de Botón + Apertura y Cierre de Contenido con Cascada de Botones Internos

Cuando el usuario hace clic en cualquier botón de la aplicación para abrir o cerrar un contenedor:

1. **Micro-interacción táctil de Acción de Botón (`.tabe-btn-action` y `.tabe-btn-clicked`):**
   Todo `<button>` tiene compresión `active:scale-[0.965]` y al hacer clic dispara `tabeButtonActionPulse` (`0.22s cubic-bezier(0.22, 1, 0.36, 1)`).
2. **Al Abrir — El contenedor emerge con resorte y sus botones entran en cascada:**
   - **Contenedor (`.tabe-content-open:not([data-state="closed"])`):** Escala desde `0.975` con `translate3d(0, 6px, 0)` hasta `scale(1)` en `0.22s cubic-bezier(0.16, 1, 0.3, 1)`.
   - **Secciones internas (`.tabe-inner-section-reveal`):** Cada bloque hijo directo recibe `--sec-idx` (`0..4`) con delay incremental de `18ms`.
   - **Botones internos (`.tabe-inner-btn-cascade` y `.tabe-dropdown-cascade`):** La utilidad `orchestrateContentOpen(node, { skipContainerClass })` en `src/lib/utils.ts` asigna `--btn-idx` (`0..7`) y `.tabe-inner-btn-cascade` (`animation-delay: calc(25ms + var(--btn-idx, 0) * 15ms)`) a los botones internos de `DialogContent`, `AlertDialogContent`, `SheetContent`, `AccordionContent`, `CollapsibleContent`, `PopoverContent`, `DropdownMenuContent`, `SelectContent`, `ConfirmModalProvider` y `AIBubbleWidget`.
3. **Al Cerrar — Repliegue de botones internos y contracción elástica del contenedor (`[data-state="closed"]` y `AnimatePresence`):**
   - **Repliegue de botones y secciones internas (`tabeInnerButtonClose` y `tabeInnerSectionClose`):** Cuando el contenedor pasa a `[data-state="closed"]`, sus `.tabe-inner-btn-cascade`, ítems de `.tabe-dropdown-cascade` y bloques `.tabe-inner-section-reveal` se repliegan hacia adentro (`opacity: 0; transform: translate3d(0, 4px, 0) scale(0.93)`) en `130ms–140ms cubic-bezier(0.32, 0, 0.67, 0)`.
   - **Cierre del contenedor (`.tabe-content-open[data-state="closed"]`):** Ejecuta `tabeContentClose` (`opacity: 0; transform: translate3d(0, 8px, 0) scale(0.945)` en `180ms cubic-bezier(0.32, 0, 0.67, 0) forwards`), mientras el overlay (`.tabe-overlay-motion[data-state="closed"]`) ejecuta `tabeOverlayClose`.
   - **Cierre de Paneles Deslizantes y Colapsables (`SheetContent`, `AccordionContent`, `CollapsibleContent`):** Usan `orchestrateContentOpen(node, { skipContainerClass: true })` para no interferir con la animación direccional de salida (`slide-out-to-*` en `Sheet` o `.tabe-collapsible-motion[data-state="closed"]` con `tabeCollapsibleClose` en `Collapsible` y `Accordion`), logrando que la altura o el cajón se cierre con fluidez mientras sus botones internos se repliegan.
   - **Modales y Paneles React condicionales (`ConfirmModalContext.tsx`, `AIBubbleWidget.tsx`):** Envueltos en `<AnimatePresence>` con `exit={{ opacity: 0, scale: 0.94, y: 8 }}` para que al tocar "Cerrar", "Cancelar", "Minimizar" o confirmar, el contenedor se cierre con la misma física elástica.

---

## Reglas de Rendimiento, Carga Instantánea (0ms) y Accesibilidad

1. **Prohibido `<AnimatePresence mode="wait">` en `<Outlet />` (`PageTransition.tsx`):**
   - El cambio de ruta debe ser **instantáneo (0ms de espera de salida)** montando directamente el contenedor del nuevo apartado sin esperar a que el anterior haga `exit`.
2. **`<Suspense>` Local dentro de `MainLayout.tsx` + Precarga Completa (`routePreload.ts`):**
   - `<Outlet />` está envuelto en su propio `<Suspense>` dentro de `MainLayout.tsx` para que el Sidebar y los widgets globales **nunca se desmonten** al navegar entre rutas `lazy`.
   - `preloadCoreRoutes()` precarga todos los apartados del sidebar en segundo plano y el hover sobre cualquier categoría del sidebar precarga sus sub-rutas de inmediato.
3. **Cero `filter: blur()` o `filter: saturate()` en Contenedores Grandes:**
   - Las clases `.tabe-stage-module`, `.tabe-content-open` y `.tabe-inner-btn-cascade` usan exclusivamente `transform: translate3d(...) scale(...)` y `opacity` acelerados por GPU para mantener **60fps constantes** sin bloquear el hilo de rasterizado.
4. **Tiempos Ultrarrápidos que Nunca Hacen Esperar al Usuario:**
   - Entrada de módulos (`.tabe-stage-module`): `300ms` de duración con paso de `20ms` (tope máximo `--module-idx: 5` = `100ms`), completando toda la aparición en menos de `400ms`.
   - Apertura de modales/popovers (`.tabe-content-open`) y cascada de botones internos (`.tabe-inner-btn-cascade`): `200ms–220ms` con delays de `15ms` por botón (aplicado únicamente a modales, menús y paneles emergentes, nunca a pestañas de página completa como `TabsContent`).
   - Respeto total a `prefers-reduced-motion: reduce`.
