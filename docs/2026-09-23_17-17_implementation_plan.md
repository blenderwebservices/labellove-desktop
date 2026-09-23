# Plan de Implementación: Zoom estilo Inkscape, Barras de Desplazamiento y Ajuste de Tamaño del Lienzo

**Fecha y Hora:** 2026-09-23 17:17

---

## 🎯 Objetivo
Implementar un sistema de navegación y manipulación del lienzo idéntico a **Inkscape** y herramientas de diseño vectorial profesionales:
1. **Zoom estilo Inkscape**:
   - Zoom con `Cmd + Scroll` (o `Ctrl + Scroll` en Windows/Linux) enfocado de manera milimétrica en la **posición del cursor del mouse** (zoom anchor).
   - Atajos de teclado: `Cmd/Ctrl + +`, `Cmd/Ctrl + -`, `Cmd/Ctrl + 0` (ajustar a pantalla / FIT) y `Cmd/Ctrl + 1` (100%).
   - Soporte para gestos trackpad *pinch-to-zoom*.
   - Rango de zoom extendido (20% a 500%).

2. **Barras de Desplazamiento y Navegación del Canvas (Pan & Scroll)**:
   - Estructura de "mundo de trabajo" (`canvas-world`) con margen virtual amplio para permitir desplazamiento y paneo libre en todas direcciones sin cortes.
   - Barras de desplazamiento horizontales y verticales elegantes con diseño oscuro de alta precisión estilo Inkscape/Figma.
   - Paneo fluido con **botón central del mouse** (Middle Click Drag) o tecla **Espacio + Arrastre** (con cursor `grab` / `grabbing`).
   - Desplazamiento con rueda: Scroll vertical (rueda) y horizontal (`Shift + rueda`).
   - Reglas milimétricas horizontales y verticales **sincronizadas en tiempo real** con el desplazamiento y zoom del lienzo (el origen `0 mm` siempre anclado al borde del documento).

3. **Ajuste de Tamaño del Lienzo (Canvas Size Adjustment)**:
   - **Ajuste visual directo en el lienzo**: Tirador de redimensionamiento interactivo en la esquina inferior derecha y bordes de la etiqueta (`stage-resizer`) con tooltip en tiempo real (`📐 W × H mm`).
   - **Controles en Inspector ("Etiqueta")**:
     - Conexión reactiva inmediata de los campos `labelWidthMm` y `labelHeightMm`.
     - Selector de tamaños predefinidos estándar (4x6", 3x2", 2x1", 4x4", 50x30mm, 80x50mm, Personalizado).
     - Botón de cambio rápido de orientación (Vertical ↕ / Horizontal ↔).
   - **Indicador de dimensiones en barra superior**: Píldora interactiva con el tamaño actual del lienzo.
   - **Persistencia**: Sincronización con el generador ZPL (`^PW... ^LL...`), el gestor de documentos (`.labellove`) y auto-guardado en `localStorage`.

---

## 🛠️ Cambios Propuestos

### 1. `js/canvas.js`
- **Mundo y Viewport**:
  - Reestructurar el contenedor del lienzo para incluir un contenedor envolvente con padding generoso (`canvasWorld`).
  - Agregar método `fitToScreen()` que calcula la escala óptima según el tamaño de la etiqueta y el viewport disponible y centra el scroll.
  - Agregar método `centerCanvas()` para centrado inicial o bajo demanda.
- **Zoom centrado en el mouse**:
  - Implementar `zoomAtPoint(newZoomFactor, clientX, clientY)` calculando la compensación de `scrollLeft` y `scrollTop` para que el punto bajo el cursor permanezca estático.
  - Escuchar eventos `wheel` con `e.metaKey || e.ctrlKey` para zoom interactivo.
- **Navegación / Paneo**:
  - Soporte de paneo con botón central (`e.button === 1`), botón derecho o `Espacio + Click arrastre`.
  - Evento de scroll en el viewport para redibujar las reglas milimétricas con offset exacto respecto a la posición de la etiqueta.
- **Reglas sincronizadas**:
  - Modificar `renderRulers()` para tomar las coordenadas relativas de `labelStage` respecto al viewport y pintar el `0 mm` exactamente en la esquina superior izquierda de la etiqueta.
- **Ajuste de tamaño interactivo del lienzo**:
  - Elemento y listeners para `stageResizer` en la esquina y bordes del `labelStage`.
  - Método `setCanvasSize(widthMm, heightMm, options)` para redimensionar la plantilla actual, actualizar estilos, notificar a observadores y recalcular guías magnéticas.

### 2. `index.html`
- Agregar contenedor envolvente `.canvas-world` dentro de `#canvasViewport`.
- Incorporar tirador visual interactivo de redimensionamiento en `#labelStage` (`#stageResizerCorner`, `#stageResizerRight`, `#stageResizerBottom`).
- En la pestaña de "Etiqueta" del Inspector:
  - Selector de medidas predeterminadas (`#labelPresetSelect`).
  - Botón de alternancia de orientación (`#btnToggleOrientation`).
  - Controles de paso rápido para ancho y alto.
- En la barra superior:
  - Añadir botón de atajo o indicador interactivo de dimensiones del lienzo.

### 3. `styles/canvas.css` y `styles/components.css`
- Estilos para `.canvas-world`: padding virtual espacioso (ej. 800px) que permite navegar cómodamente en cualquier nivel de zoom.
- Barras de desplazamiento personalizadas con WebKit y Firefox con tema oscuro estilizado, contraste fino y hover suave.
- Estilos para los tiradores de redimensionamiento del canvas (`.stage-resizer`, `.stage-resizer-corner`, `.stage-resizer-badge`).
- Estados de cursor para paneo (`.panning`, `.is-panning`).

### 4. `js/app.js`
- Conectar eventos de `labelWidthMm` y `labelHeightMm` con `canvasEngine.setCanvasSize()`.
- Conectar selector de presets de etiqueta y botón de cambio de orientación.
- Atajos de teclado adicionales:
  - `Cmd + +` / `Cmd + =` (Zoom In).
  - `Cmd + -` (Zoom Out).
  - `Cmd + 0` (Ajustar lienzo a la pantalla).
  - `Cmd + 1` (Zoom 100%).
  - Barra espaciadora para activar temporalmente la herramienta Mano (Hand Tool).
- Sincronizar el selector de plantillas a "Personalizado" cuando se alteren las medidas manualmente.

---

## 🧪 Plan de Verificación

### 1. Pruebas de Zoom y Paneo
- Probar zoom con `Cmd + Scroll` hacia arriba y hacia abajo sobre diferentes partes de la etiqueta (ej. esquina superior izquierda, código de barras central, esquina inferior derecha) y verificar que el punto bajo el cursor no se desplace.
- Probar zoom con trackpad (*pinch*).
- Probar atajos de teclado `Cmd + +`, `Cmd + -`, `Cmd + 0` y `Cmd + 1`.
- Probar paneo con clic central (middle click) y con `Espacio + Arrastre`.
- Verificar que las barras de desplazamiento se muestren activas y permitan deslizar el área de trabajo en 360 grados.
- Verificar que las reglas milimétricas se desplacen y que el valor `0` coincida exactamente con el borde del documento al hacer scroll o zoom.

### 2. Pruebas de Ajuste de Tamaño
- Arrastrar el tirador de la esquina del lienzo y verificar que las dimensiones cambien en vivo, mostrando el badge con los mm exactos.
- Editar valores numéricos en el Inspector (Ancho y Alto) y verificar que el lienzo se redimensione de inmediato.
- Seleccionar presets de tamaño (4x6", 3x2", etc.) y verificar cambio instantáneo.
- Presionar el botón de orientación (Vertical ↔ Horizontal) y verificar intercambio de ancho y alto.
- Verificar que el código ZPL generado (`Imprimir / ZPL`) actualice sus directivas `^PW` y `^LL` con las nuevas medidas.
- Guardar el documento (`Cmd+S`) y verificar que las nuevas medidas persistan al recargar.

### 3. Validación de Código y Sintaxis
- Ejecutar `node --check` en todos los archivos `.js` modificados.
