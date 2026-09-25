# Plan de Implementación: Impresión en Hoja / Matriz (Carta, A4, Avery) con Vista Previa para Impresoras del Sistema

**Fecha:** 2026-09-24 16:58  
**Proyecto:** LabelLove Desktop Web  
**Objetivo:** Incorporar un botón de impresión especializado en papel de hojas sueltas (tamaño Carta, A4, Oficio) con distribución en matriz (por ejemplo 5 columnas por 18 filas = 90 etiquetas, Avery 5160, personalizadas), incluyendo un modal de vista previa interactiva antes de enviar a imprimir y soporte nativo para las impresoras del sistema operativo.

---

## 1. Contexto y Requerimiento

Actualmente LabelLove cuenta con un botón de impresión orientado a impresoras térmicas de rollo continuo (Zebra, TSC, Rollo) mediante exportación de código ZPL II nativo o diálogo estándar.

El usuario requiere:
1. **Nuevo Botón en la Barra Superior:**
   - Un botón dedicado a **"Imprimir en Hoja"** (papel estándar como Carta o A4), diferenciándolo claramente del botón de rollo/térmica existente.
2. **Distribución en Matriz (Grid / Matrix Layout):**
   - Configuración de columnas y filas (ejemplo del usuario: **5 columnas × 18 filas = 90 etiquetas**).
   - Presets comunes (5×18 micro-etiquetas, 3×10 Avery 5160, 2×5 Avery 5163, 2×3 Avery 5164, etc.) y dimensiones totalmente personalizables.
   - Márgenes de la hoja (superior, inferior, izquierdo, derecho en mm) y separación entre etiquetas (gap X / gap Y en mm).
   - Cálculo automático del tamaño resultante de cada etiqueta o auto-cálculo de cuadrícula según la etiqueta actual.
3. **Vista Previa Fiel antes de Imprimir (Interactive Print Preview):**
   - Modal interactivo con viewport que renderice la hoja completa a escala real (WYSIWYG).
   - Renderizado de todos los elementos: textos, códigos de barra 1D y QR 2D generados con `BarcodeEngine`, formas, tipografías y variables interpoladas.
   - Controles de zoom (alejar, acercar, 100%, ajustar a ventana).
   - Paginador ("Hoja 1 de N") si hay múltiples páginas.
   - Soporte para **salto de celdas iniciales (Offset / Start Cell)** para aprovechar hojas adhesivas parcialmente usadas (ej. saltar las primeras 5 etiquetas ya despegadas).
4. **Modos de Datos:**
   - **Modo Etiqueta Actual:** Repite el registro activo tantas veces como se indique o llene la hoja.
   - **Modo Tabla de Datos (Secuencial):** Toma los registros de `DataStore` (o archivo CSV/Excel importado) y coloca un registro por etiqueta consecutivamente, creando automáticamente las páginas necesarias.
5. **Impresión con Impresoras del Sistema:**
   - Botón directo para invocar `window.print()` con reglas CSS `@media print` de precisión milimétrica (`@page { size: letter; margin: 0; }`).
   - Oculta la interfaz del sistema y envía únicamente las páginas generadas con gráficos vectoriales y códigos nítidos a cualquier impresora instalada (Láser, Inyección de tinta, PDF, etc.).

---

## 2. Arquitectura de la Solución

```
┌────────────────────────────────────────────────────────┐
│ Topbar: [🏷️ Imprimir Rollo (ZPL)] [📄 Imprimir en Hoja] │
└──────────────────────────┬─────────────────────────────┘
                           │ Clic
                           ▼
┌────────────────────────────────────────────────────────┐
│  Modal: "Impresión en Hoja / Matriz (Carta / A4)"      │
│ ┌─────────────────────────┬──────────────────────────┐ │
│ │ Panel de Configuración  │  Preview WYSIWYG Hoja    │ │
│ │ • Tamaño Papel (Carta)  │  • Hoja Carta visual     │ │
│ │ • Matriz: 5 cols x 18 f │  • Matriz 90 etiquetas   │ │
│ │ • Márgenes y Gaps (mm)  │  • Barcodes/Textos vivos │ │
│ │ • Celda inicio (offset) │  • Zoom: [-] [100%] [+]  │ │
│ │ • Datos: Único / Tabla  │  • Paginador: < Hoja 1 > │ │
│ └─────────────────────────┴──────────────────────────┘ │
│ [ Cancelar ]          [ 🖨️ Imprimir en Impresora Sistema ]│
└──────────────────────────┬─────────────────────────────┘
                           │ Clic
                           ▼
                 window.print() + @media print
                 (Impresoras del Sistema OS)
```

---

## 3. Plan Paso a Paso

### Paso 1: Módulo Especializado `js/sheet-print-engine.js`
- Crear el motor de cálculo y renderizado de hojas:
  - Definición de tamaños de papel (Letter, A4, Legal, etc.).
  - Presets matriciales (5×18, 3×10, 2×5, 2×3, 4×10, 4×12, etc.).
  - Cálculo de celdas, márgenes, gaps y factor de escala para ajustar el diseño dentro de la celda.
  - Función de renderizado de celdas usando la misma precisión que `canvas.js` (BarcodeEngine con BWIP-JS / QRCode, interpolación de variables con `DataStore`).
  - Generación de DOM tanto para la vista previa en el modal como para el contenedor de impresión física `#sheetPrintArea`.

### Paso 2: Interfaz en `index.html`
- Actualizar botones de la barra superior:
  - `topbarPrintBtn`: `<span>🏷️</span><span>Imprimir Rollo (ZPL)</span>`
  - `topbarSheetPrintBtn`: `<span>📄</span><span>Imprimir en Hoja</span>`
- Crear la estructura del modal `#sheetPrintModal`:
  - Panel izquierdo con formulario de parámetros matriciales, selector de presets, márgenes, gaps, selector de inicio de etiqueta, modo de datos y guías de corte.
  - Panel derecho con toolbar de zoom/páginas y viewport de vista previa de alta resolución.
- Agregar el contenedor de impresión invisible en pantalla `#sheetPrintArea`.

### Paso 3: Estilos en `styles/components.css` y `@media print`
- Estilos para el modal extendido, panel de configuración, vista previa de hoja blanca con sombras y bordes de etiquetas.
- Celda vacía/saltada con patrón tenue.
- Reglas `@media print` garantizando:
  - Ocultación de todo el software LabelLove (`body > *:not(#sheetPrintArea)`).
  - Configuración milimétrica `@page { size: auto; margin: 0; }`.
  - Salto de página estricto `break-after: page; page-break-after: always;`.
  - Renderizado de fondos y gráficos para impresión.

### Paso 4: Integración en `js/app.js`
- Instanciar `SheetPrintEngine` y vincular eventos:
  - Apertura del modal al hacer clic en `topbarSheetPrintBtn`.
  - Atajo o enlace cruzado desde el modal de rollo existente.
  - Re-renderizado reactivo en tiempo real al cambiar cualquier input del panel.
  - Ejecución de `window.print()` al presionar "Imprimir con Impresoras del Sistema".

### Paso 5: Verificación y Pruebas
- Probar con la matriz solicitada por el usuario (5 columnas × 18 filas = 90 etiquetas en tamaño Carta).
- Probar presets Avery (3×10 Avery 5160).
- Probar modificación de márgenes y gaps.
- Probar desplazamiento de celda inicial (ej. iniciar en la celda 6).
- Probar datos vinculados a la tabla (recorrer múltiples páginas).
- Validar fidelidad visual de los códigos de barra y textos.

---

## 4. Criterios de Aceptación
1. Existen dos botones claramente diferenciados en el topbar: uno para rollo térmico/ZPL y otro para hoja en matriz.
2. El modal de hoja permite elegir tamaño de papel (Carta, A4, etc.) y configurar columnas y filas (con preset inicial de 5 cols × 18 filas).
3. La vista previa muestra la hoja completa con todas las etiquetas renderizadas y se actualiza al instante al modificar los parámetros.
4. El envío a impresión utiliza las impresoras del sistema operativo (`window.print()`) con salida limpia y sin elementos de la interfaz.
