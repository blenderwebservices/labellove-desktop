# Plan de Implementación: Prototipo Interactivo "LabelLove"

Desarrollo del prototipo funcional y de alta fidelidad para **LabelLove**: una aplicación de diseño e impresión de etiquetas de próxima generación que combina la velocidad de **Label LIVE** (enfoque térmico, variables simples, interfaz ligera) con la potencia de datos de **Labeljoy** (catálogo de códigos de barras, soporte de hojas troqueladas Avery/A4 y conectividad de datos), envuelto en una interfaz moderna inspirada en **Figma, Linear y Canva**.

## User Review Required

> [!IMPORTANT]
> **Modo de despliegue**: Desarrollaremos la aplicación como una SPA (*Single-Page Application*) interactiva completa utilizando **HTML5 + ES Modules + Vanilla CSS moderno + Motor vectorial interactivo**.
> - Se integrará directamente en `/Users/francisco/Herd/labellove`, haciéndolo inmediatamente accesible tanto en `http://labellove.test` (vía Laravel Herd) como a través de cualquier servidor local o navegador.
> - No requiere dependencias pesadas de compilación para empezar a probarlo de inmediato, pero cuenta con arquitectura modular lista para evolucionar a Tauri/Electron si se desea empaquetar como app de escritorio.

> [!TIP]
> **Características estrella que se incluirán en el prototipo funcional**:
> 1. **Canvas Interactivo con Unidades Reales**: Reglas en milímetros/pulgadas, arrastrar/soltar, redimensionar, rotar y guías magnéticas inteligentes.
> 2. **Generador Real de Códigos 1D & 2D**: Generación activa de Code 128, EAN-13, UPC-A, Code 39 y códigos QR en vivo.
> 3. **Data Drawer Reactivo (Estilo Airtable/Linear)**: Hoja de cálculo integrada en la parte inferior con *Record Scrubber* (`< Registro 3 de 20 >`) que actualiza la etiqueta en el lienzo en tiempo real.
> 4. **Detector de Desbordamiento (Overflow Guard)**: Advertencia visual si el texto de la base de datos supera el área asignada, con auto-ajuste de tamaño de fuente (*fit-to-box*).
> 5. **Selector de Sustrato Realista**: Alternar entre Térmico Directo, Papel Blanco Mate, Vinil y Papel Kraft.
> 6. **Modo Híbrido**: Alternar entre "Rollo Térmico Individual" y "Pliego Troquelado (Avery / A4 Multi-etiqueta)".
> 7. **Centro de Salida**: Previsualización de impresión, exportador de PDF y generador de código nativo ZPL II para impresoras Zebra.

---

## Proposed Changes

### 1. Estructura y Sistema de Diseño

#### [NEW] [index.html](file:///Users/francisco/Herd/labellove/index.html)
- Estructura semántica principal con TopBar, Left Creation Ribbon, Center Canvas con reglas métricas, Floating HUD, Right Properties Inspector y Bottom Data Drawer.

#### [NEW] [styles/theme.css](file:///Users/francisco/Herd/labellove/styles/theme.css)
- Tokens de diseño: paleta de colores oscuros premium (estilo Linear/Figma con acentos Indigo/Violeta y Emerald), tipografía Inter y JetBrains Mono, sombras de profundidad, variables de escala métrica (mm a px).

#### [NEW] [styles/canvas.css](file:///Users/francisco/Herd/labellove/styles/canvas.css)
- Estilos del lienzo, reglas graduadas, sustratos realistas (texturas térmico directo, kraft, glossy), cajas delimitadoras de selección (*bounding box* con 8 *handles*), guías magnéticas y HUD flotante.

#### [NEW] [styles/components.css](file:///Users/francisco/Herd/labellove/styles/components.css)
- Estilos para la barra superior, paneles de herramientas, inspector de propiedades de 3 pestañas (Elemento, Etiqueta, Capas), Data Drawer colapsable con tabla tipo Airtable, y modales de exportación/impresión.

---

### 2. Lógica y Motor del Diseñador

#### [NEW] [js/app.js](file:///Users/francisco/Herd/labellove/js/app.js)
- Controlador principal de la aplicación, inicialización de eventos de teclado (Cmd+P, Delete, Undo/Redo, Cmd+K), sincronización entre datos y lienzo.

#### [NEW] [js/canvas.js](file:///Users/francisco/Herd/labellove/js/canvas.js)
- Motor de manipulación de elementos: selección, arrastre, redimensionamiento, rotación, alineación magnética con cálculo de coordenadas en milímetros exactos.

#### [NEW] [js/barcode-engine.js](file:///Users/francisco/Herd/labellove/js/barcode-engine.js)
- Motor de renderizado dinámico de códigos de barras lineales (Code 128, EAN, UPC) y QR codes vectoriales usando librerías ligeras embebidas.

#### [NEW] [js/data-store.js](file:///Users/francisco/Herd/labellove/js/data-store.js)
- Gestión de fuentes de datos (CSV, JSON, datos de ejemplo pre-cargados), motor de reemplazo de variables `{{ campo }}` y detección de desbordamiento de texto.

#### [NEW] [js/templates.js](file:///Users/francisco/Herd/labellove/js/templates.js)
- Catálogo de plantillas preconfiguradas:
  - Envío E-Commerce (100x150 mm / 4x6")
  - Logística / Almacén (50x30 mm)
  - Hoja Avery 5160 (Carta, 30 etiquetas)
  - Joyería / Retail (40x20 mm)

#### [NEW] [js/zpl-generator.js](file:///Users/francisco/Herd/labellove/js/zpl-generator.js)
- Conversor del diseño activo a código nativo ZPL II (`^XA...^XZ`) para impresoras Zebra térmicas.

---

## Verification Plan

### Automated / Browser Verification
1. **Lanzar y verificar en navegador**:
   - Acceder a `http://labellove.test` o mediante servidor local.
   - Usar `browser_subagent` para interactuar con la aplicación:
     - Seleccionar y mover elementos de texto y códigos de barras en el canvas.
     - Cambiar la fila activa en el Data Drawer y validar que los datos en el lienzo se actualicen en tiempo real.
     - Probar el cambio entre formato "Rollo Térmico" y "Pliego Avery".
     - Abrir el modal de impresión y validar la generación del código ZPL y vista de impresión.
     - Tomar captura de pantalla de la interfaz para documentar el resultado visual.

### Manual Verification
- Validar fluidez de animaciones, soporte de atajos de teclado y experiencia de usuario.
