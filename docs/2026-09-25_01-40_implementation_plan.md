# Plan de Implementación: Barra Superior de Botones de la UI con Comportamiento Responsivo

**Fecha:** 2026-09-25 01:40  
**Proyecto:** LabelLove Desktop Web  
**Objetivo:** Hacer que la barra superior (`.topbar`) tenga un comportamiento 100% responsivo, de modo que cuando el ancho de la pantalla sea insuficiente, los botones y controles que se ocultaban salten ordenadamente al siguiente renglón, adaptando automáticamente la altura del área de trabajo, reglas y paneles laterales.

---

## 1. Análisis del Problema y Requisitos

### Situación Actual
- Actualmente, la clase `.topbar` tiene `height: var(--header-height)` (54px fijo) y `display: flex; justify-content: space-between; gap: 12px;` sin `flex-wrap: wrap`.
- En pantallas o ventanas menores a ~1450px de ancho (por ejemplo 1200px, 1024px o laptops con ventanas partidas):
  - Los controles de modo (Rollo Térmico vs Pliego), selector de materiales, controles de zoom, badge de dimensiones, selector de tema y ambos botones de impresión principal (`Rollo (ZPL)` e `Imprimir en Hoja`) quedan desbordados fuera de la pantalla hacia la derecha, quedando totalmente invisibles e inaccesibles.
- Además, los elementos inferiores (`.ribbon`, `.workspace-area`, `.inspector`) están posicionados con `position: absolute; top: var(--header-height);`. Si la barra superior salta a un segundo renglón y su altura crece, debe sincronizarse dinámicamente el valor de `--header-height` para que la barra no cubra el lienzo ni las herramientas.

### Requisitos del Usuario
> "la barra superior de botones de la UI, que sea responsiva o con comportamiento responsivo. Es decir, que cuando supere la dimension de la pantalla, los botones y controles que pudieran ocultarse, salten al segundo renglon y asi."

---

## 2. Solución Propuesta

### A. Estructura y Estilos CSS Responsivos (`styles/components.css` y `styles/theme.css`)
1. **Contenedor `.topbar`:**
   - Cambiar `height: var(--header-height)` por `min-height: var(--header-height); height: auto;`.
   - Habilitar `display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;`.
   - Establecer `row-gap: 8px; column-gap: 12px; padding: 6px 16px; box-sizing: border-box;`.
2. **Grupos Internos (`.topbar-left`, `.topbar-center`, `.topbar-right`):**
   - Habilitar `display: flex; flex-wrap: wrap; align-items: center; gap: 8px 10px;`.
   - Permitir que `.topbar-left` distribuya sus bloques lógicos (Marca, Acciones de archivo, Selector de proyecto, Badge de guardado).
   - Permitir que `.topbar-center` y `.topbar-right` fluyan hacia el segundo renglón cuando el ancho no baste, manteniéndose alineados y con espaciados armónicos.
3. **Controles Adaptables:**
   - Ajustar `.project-selector` y `.project-name-input` con `min-width` y `max-width` flexibles para evitar desbordes rígidos en anchos reducidos.
   - Ajustar `.template-dropdown-select` con `text-overflow: ellipsis; max-width: 200px;`.
   - Asegurar que los menús desplegables (`#openMenuDropdown`, `#themeDropdown`) sigan abriéndose en la posición correcta con `z-index: 150` sobre el lienzo.
4. **Transiciones Suaves:**
   - Añadir `transition: top var(--transition-fast);` a `.ribbon`, `.workspace-area`, `.inspector` para que cuando el renglón salte, el área de trabajo se desplace con una animación suave y prémium.

### B. Sincronización Dinámica de Altura en JavaScript (`js/app.js`)
1. **Observador de Redimensionamiento (`ResizeObserver`):**
   - Instanciar un `ResizeObserver` sobre `.topbar` en `App.init()`.
   - Cada vez que la barra cambie de altura (por salto de renglón en resize de ventana, cambio de orientación o escala):
     - Calcular `topbar.offsetHeight`.
     - Actualizar la variable CSS: `document.documentElement.style.setProperty('--header-height', `${h}px`)`.
     - Notificar a `this.canvasEngine.renderRulers()` para recalcular de inmediato las reglas horizontales y verticales.

---

## 3. Plan de Tareas Paso a Paso

- [ ] **Paso 1:** Actualizar `styles/components.css` con las reglas de flex-wrap, gaps y comportamiento responsivo de `.topbar`, `.topbar-left`, `.topbar-center`, `.topbar-right` y sus controles hijos.
- [ ] **Paso 2:** Actualizar `styles/theme.css` y `styles/canvas.css` si es necesario para asegurar la adaptación dinámica de `--header-height`.
- [ ] **Paso 3:** Implementar en `js/app.js` la inicialización del `ResizeObserver` para sincronizar `--header-height` con la altura real de `.topbar` y redibujar las reglas del lienzo.
- [ ] **Paso 4:** Tomar capturas de verificación en múltiples resoluciones (1440px, 1200px, 992px, 768px) mediante Chrome para validar visualmente que todos los botones y controles saltan al segundo renglón sin ocultarse ni superponerse.
- [ ] **Paso 5:** Actualizar la documentación y generar el reporte final `docs/2026-09-25_01-40_walkthrough.md`.
