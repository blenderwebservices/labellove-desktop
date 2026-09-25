# ⚡ LabelLove Desktop

> **Diseñador e Impresor de Etiquetas de Próxima Generación**  
> *Alta precisión milimétrica WYSIWYG, soporte nativo de ZPL II para impresoras térmicas y maquetación matricial para impresoras de hoja suelta (Carta, A4, Avery).*

---

## 🎯 Intención y Visión del Proyecto

### El Problema
Históricamente, el diseño e impresión de etiquetas de códigos de barra, logística y etiquetado comercial ha dependido de software privativo heredado (como *ZebraDesigner*, *BarTender* o utilidades propietarias de marcas específicas). Estas soluciones suelen presentar fricciones críticas:
- Dependencia estricta del sistema operativo Windows y controladores propietarios.
- Curvas de aprendizaje elevadas e interfaces anticuadas y sobrecargadas.
- Costos de licenciamiento prohibitivos para pequeñas y medianas operaciones.
- Poca o nula integración con flujos web modernos, hojas de cálculo en la nube o formatos abiertos.
- Separación rígida entre la impresión de rollo continuo térmico (ZPL/EPL) y la impresión de hojas de etiquetas adhesivas en impresoras convencionales (láser/inyección).

### La Solución LabelLove
**LabelLove** nace como una estación de trabajo moderna, ligera, ágil y de código abierto orientada a funcionar directamente en el navegador (o empaquetada como aplicación de escritorio nativa mediante Tauri o Electron):
- **Cero Instalación / Zero-Build:** Construida con JavaScript moderno (ES Modules puros) sin pasos de compilación complejos obligatorios; funciona sirviendo los archivos estáticos en cualquier entorno.
- **Doble Modalidad de Impresión:**
  1. **Industrial (Rollo Térmico):** Generación directa de código nativo **ZPL II (Zebra Programming Language)** para impresoras industriales (Zebra, TSC, Rollo, Citizen) en 203, 300 o 600 DPI.
  2. **Oficina y Producción (Hojas / Pliegos Matriciales):** Motor de cálculo matricial para papel estándar (**Carta, A4, Oficio, Avery®**) con soporte nativo para el diálogo de impresión del sistema operativo (`window.print()` y `@media print` de precisión milimétrica).
- **Enlace Reactivo de Datos:** Conexión directa con archivos Excel (`.xlsx`, `.xls`) y `.csv` para impresión masiva variable, serialización y validación visual de desbordamientos en tiempo real.
- **Universalidad de Códigos:** Más de 39 simbologías industriales 1D y matrices 2D (incluyendo la familia completa QR, GS1, HIBC y Data Matrix).

---

## ✨ Características Principales

### 1. Lienzo Interactivo WYSIWYG de Precisión Milimétrica
- Medidas reales en milímetros (mm) y pulgadas con conversión física matemática a 96 DPI.
- **Transformer Avanzado:** 8 tiradores de escalado, tirador superior de rotación angular libre, arrastre por clic y dimension pill informativo en tiempo real.
- **Guías Magnéticas (Snapping):** Alineación automática al centro, bordes y elementos adyacentes del lienzo.
- **Reglas Milimétricas Interactivas:** Rulers horizontales y verticales sincronizados con el zoom y paneo.
- **Navegación Fluida:** Zoom de 25% a 400% y paneo espacial estilo Figma/Inkscape (`Espacio + Arrastre` o `Clic central`).
- **Redimensionamiento Dinámico del Lienzo:** Tiradores en los bordes y esquina inferior derecha para ajustar las dimensiones de la etiqueta directamente desde el lienzo.

### 2. Motor Universal de Códigos de Barras y 2D (`BarcodeEngine`)
Soporte de más de 39 simbologías profesionales procesadas en tiempo real mediante `bwip-js`, con motores de respaldo (`JsBarcode` y `qrcode`):
- **Familia QR 2D:** QR Code estándar (ISO/IEC 18004), Micro QR (ultracompacto para joyería y microelectrónica), GS1 QR Code (Digital Link) y HIBC QR (salud y dispositivos médicos).
- **Matrices Industriales 2D:** Data Matrix (ECC 200), PDF417, Aztec Code, MaxiCode.
- **Retail y Logística 1D:** EAN-13, EAN-8, UPC-A, UPC-E, ITF-14, Code 128 (A, B, C y Auto), GS1-128, Code 39, Codabar, ISBN.
- **Postales y Especiales:** USPS Intelligent Mail, Royal Mail, Pharmacode.

### 3. Impresión Térmica en Rollo Continuo (ZPL II)
- Generación de comandos ZPL II nativos optimizados (`^XA ... ^XZ`) listos para enviar por red (puerto 9100), USB o archivo `.zpl`.
- Traducción precisa de coordenadas, fuentes, tipografías Zebra (Fuentes 0, A-Z), dimensiones de barras e identificadores QR (`^BQ`, `^BX`, `^BC`).
- Visor de código ZPL en vivo, copiado al portapapeles y selector de densidad de impresión (203 / 300 / 600 DPI).

### 4. Impresión en Hoja / Matriz (Carta, A4, Avery)
- Motor especializado `SheetPrintEngine` para pliegos de etiquetas adhesivas en impresoras convencionales (Láser, Tinta o Guardar como PDF).
- **Presets Integrados:**
  - Micro-etiquetas: **5 Columnas × 18 Filas (90 etiquetas por pliego)**.
  - Estándares Avery®: Avery 5160 (3×10), Avery 5163 (2×5), Avery 5164 (2×3).
  - Configuraciones de 4×10 (40 etiquetas) y 4×15 (60 etiquetas).
  - Configuración libre de filas, columnas, márgenes y separaciones (gaps X/Y).
  - Cálculo automático: calcula cuántas etiquetas del tamaño actual caben en la hoja.
- **Salto de Celdas Iniciales (Offset):** Permite comenzar la impresión a partir de una celda específica para reutilizar hojas adhesivas con etiquetas ya despegadas.
- **Vista Previa WYSIWYG Multihahoja:** Modal interactivo con zoom, cambio de páginas y representación visual de bordes y marcas de corte.
- **Fidelidad `@media print`:** Invocación limpia de `window.print()` que oculta la UI y transfiere exclusivamente la hoja vectorial a escala 1:1.

### 5. Motor de Datos y Variables Reactivas
- Sintaxis de interpolación fluida mediante doble llave: `{{nombre_campo}}`.
- **`FormatEngine`:** Reconocimiento de tipos y aplicación de máscaras inteligentes:
  - Divisas: `$#,##0.00`, `$#,##0 MXN`, `USD`, `EUR`.
  - Impuestos y Porcentajes: `16% IVA`, `0.00%`, descuentos.
  - Formato numérico y relleno de ceros: `00000` (ideal para SKUs y números de serie correlativos).
- **Importador de Datos:** Carga directa de hojas de cálculo de Excel (`.xlsx`, `.xls`) y `.csv` usando `SheetJS`.
- **Scrubber de Registros:** Navegación registro a registro (`< 1 de 45 >`) para verificar cómo se adapta el diseño en cada caso.
- **Alertas de Desbordamiento:** Detección automática en tiempo real si un dato excede el ancho o alto de su caja de texto.

### 6. Gestión Documental (.labellove)
- Formato de archivo JSON abierto y versionado (`.labellove`).
- Guardado en disco con nombre personalizado y recuperación mediante diálogo nativo o Drag & Drop directo sobre el lienzo.
- Autoguardado periódico en `localStorage` con recuperación automática tras recargas accidentales.
- Historial de proyectos recientes con miniaturas y detalles de fecha/dimensiones.

---

## 🏗️ Arquitectura del Sistema

La arquitectura de **LabelLove** sigue los principios de **Modularidad Estricta**, **Bajo Acoplamiento** y **Ejecución del Lado del Cliente (Client-Side First)**, implementada con ES Modules estándar de JavaScript (sin compiladores ni bundlers obligatorios).

### Diagrama Arquitectónico

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CAPA DE PRESENTACIÓN (UI)                       │
│ ┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────┐ │
│ │   Barra Superior     │ │  Lienzo Interactivo  │ │    Inspector     │ │
│ │ (TopBar + Proyectos) │ │  (Viewport + Guides) │ │   de Elementos   │ │
│ └──────────────────────┘ └──────────────────────┘ └──────────────────┘ │
│ ┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────┐ │
│ │ Drawer de Datos / BD │ │ Modal Impresión Hoja │ │ Modal ZPL Rollo  │ │
│ └──────────────────────┘ └──────────────────────┘ └──────────────────┘ │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     ORQUESTADOR CENTRAL (App Controller)                │
│                               js/app.js                                │
│   Coordina eventos, atajos de teclado, sincronización y ciclo de vida  │
└───────┬──────────────┬──────────────┬──────────────┬──────────────┬────┘
        │              │              │              │              │
        ▼              ▼              ▼              ▼              ▼
┌──────────────┐┌──────────────┐┌──────────────┐┌──────────────┐┌──────────────┐
│ CanvasEngine ││BarcodeEngine ││SheetPrintEng ││ ZPLGenerator ││DocumentManag │
│ js/canvas.js ││js/barcode-...││js/sheet-print││js/zpl-gene...││js/document...│
│              ││              ││              ││              ││              │
│ Coordenadas  ││ 39+ Familias ││ Matriz Pliego││ Compilador   ││ .labellove   │
│ Transform/DOM││ Códigos 1D/2D││ Layout Carta ││ Zebra ZPL II ││ Autosave / IO│
└───────┬──────┘└──────────────┘└───────┬──────┘└──────────────┘└───────┬──────┘
        │                               │                               │
        └───────────────────────┬───────┴───────────────────────────────┘
                                ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      CAPA DE ESTADO Y DATOS REACTIVOS                  │
│                                                                        │
│   ┌───────────────────────────┐       ┌────────────────────────────┐   │
│   │   DataStore (Estado DB)   │◄─────►│ FormatEngine (Máscaras)    │   │
│   │   js/data-store.js        │       │ js/format-engine.js        │   │
│   │   Tablas, Filas, Columns  │       │ Moneda, IVA, Ceros, Fechas │   │
│   └─────────────┬─────────────┘       └────────────────────────────┘   │
│                 │                                                      │
│                 ▼                                                      │
│   ┌───────────────────────────┐       ┌────────────────────────────┐   │
│   │ Catálogo de Plantillas    │       │ Librerías Externas Vendor  │   │
│   │ js/templates.js           │       │ bwip-js, SheetJS (XLSX)    │   │
│   └───────────────────────────┘       └────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

### Módulos Principales

| Módulo | Archivo | Responsabilidad Principal |
|---|---|---|
| **App** | [`js/app.js`](file:///Users/franciscogomezbarragan/Herd/labellove-desktop/js/app.js) | Controlador mediador. Inicializa subsistemas, enlaza atajos de teclado (`Cmd+P`, `Cmd+S`, `Cmd+Z`, `Supr`), sincroniza el inspector con la selección activa y orquesta los modales. |
| **CanvasEngine** | [`js/canvas.js`](file:///Users/franciscogomezbarragan/Herd/labellove-desktop/js/canvas.js) | Motor gráfico de interacción en el lienzo. Convierte unidades físicas (mm) a píxeles de pantalla (96 DPI), gestiona el transformer (escalado con 8 tiradores, rotación angular), guías magnéticas, reglas y redimensionamiento del escenario. |
| **BarcodeEngine** | [`js/barcode-engine.js`](file:///Users/franciscogomezbarragan/Herd/labellove-desktop/js/barcode-engine.js) | Fachada universal de simbologías. Genera códigos 1D y 2D (QR, Micro QR, GS1 QR, HIBC, DataMatrix, EAN, Code128, etc.) sobre elementos `<canvas>` optimizados mediante `bwip-js`. |
| **SheetPrintEngine** | [`js/sheet-print-engine.js`](file:///Users/franciscogomezbarragan/Herd/labellove-desktop/js/sheet-print-engine.js) | Motor de maquetación en pliegos matriciales. Calcula dimensiones de celdas, márgenes y separaciones (gaps), administra el salto de etiquetas usadas (offset) y genera la salida para el diálogo de impresión del sistema operativo (`@media print`). |
| **ZPLGenerator** | [`js/zpl-generator.js`](file:///Users/franciscogomezbarragan/Herd/labellove-desktop/js/zpl-generator.js) | Compilador visual a código máquina Zebra ZPL II. Convierte cada elemento del lienzo en secuencias de comandos ZPL (`^FO`, `^FD`, `^BC`, `^BQ`, etc.) calibradas en dots según la resolución (203/300/600 DPI). |
| **DataStore** | [`js/data-store.js`](file:///Users/franciscogomezbarragan/Herd/labellove-desktop/js/data-store.js) | Gestión del estado de datos tabulares. Mantiene columnas y registros, interpola variables dinámicas (`{{columna}}`), procesa importaciones de archivos Excel/CSV y emite alertas de desbordamiento. |
| **FormatEngine** | [`js/format-engine.js`](file:///Users/franciscogomezbarragan/Herd/labellove-desktop/js/format-engine.js) | Motor de formateo y formateo condicional. Evalúa expresiones numéricas para aplicar máscaras de divisa (`$#,##0.00`), porcentajes, relleno de ceros y unidades de medida. |
| **DocumentManager** | [`js/document-manager.js`](file:///Users/franciscogomezbarragan/Herd/labellove-desktop/js/document-manager.js) | Persistencia y gestión documental. Serializa y deserializa el esquema `.labellove`, controla el autoguardado en `localStorage`, la File System Access API y la apertura mediante Drag & Drop. |
| **Templates** | [`js/templates.js`](file:///Users/franciscogomezbarragan/Herd/labellove-desktop/js/templates.js) | Catálogo de plantillas maestras (envío de paquetes 4×6", joyería, almacén, estantería) y presets de medidas físicas estándar. |

---

### Sistema de Diseño y Estilos

El diseño visual de la interfaz se basa en tokens CSS puros organizados en tres capas especializadas:

1. **[`styles/theme.css`](file:///Users/franciscogomezbarragan/Herd/labellove-desktop/styles/theme.css):**
   - Variables de color en espacio HSL para temas claro y oscuro.
   - Definición de elevaciones (`box-shadow`), bordes redondeados y tipografía moderna (`Inter` para interfaz, `JetBrains Mono` para datos técnicos y código).
2. **[`styles/canvas.css`](file:///Users/franciscogomezbarragan/Herd/labellove-desktop/styles/canvas.css):**
   - Estilos del espacio de trabajo milimétrico: reglas superior e izquierda, guías magnéticas azules, capas de escenario (`#labelStage`), transformer con tiradores y dimension pill.
3. **[`styles/components.css`](file:///Users/franciscogomezbarragan/Herd/labellove-desktop/styles/components.css):**
   - Componentes modulares: barra superior (TopBar), barra de herramientas lateral, panel inspector de propiedades, drawer inferior de datos, modales interactivos y reglas estrictas de `@media print`.

---

## 📄 Especificación del Formato de Archivo `.labellove`

Los proyectos de LabelLove se guardan en un formato JSON estándar con la extensión `.labellove`:

```json
{
  "$schema": "https://labellove.app/schemas/v1.json",
  "format": "labellove",
  "version": "1.0.0",
  "metadata": {
    "id": "lbl_9k2a8b",
    "name": "Etiqueta Envio Express 4x6",
    "createdAt": "2026-09-24T18:00:00.000Z",
    "updatedAt": "2026-09-24T22:30:00.000Z",
    "author": "LabelLove User",
    "generator": "LabelLove v1.0"
  },
  "label": {
    "widthMm": 101.6,
    "heightMm": 152.4,
    "orientation": "portrait",
    "unit": "mm",
    "dpi": 203,
    "backgroundColor": "#ffffff"
  },
  "elements": [
    {
      "id": "el_1",
      "type": "text",
      "xMm": 6.0,
      "yMm": 8.0,
      "widthMm": 89.6,
      "heightMm": 12.0,
      "text": "DESTINATARIO: {{nombre_cliente}}",
      "fontSize": 14,
      "fontWeight": "bold",
      "fontFamily": "Inter",
      "textAlign": "left",
      "color": "#000000"
    },
    {
      "id": "el_2",
      "type": "barcode",
      "xMm": 6.0,
      "yMm": 25.0,
      "widthMm": 89.6,
      "heightMm": 30.0,
      "symbology": "code128",
      "value": "{{tracking_code}}",
      "includeText": true
    }
  ],
  "dataStore": {
    "columns": ["nombre_cliente", "tracking_code"],
    "records": [
      { "nombre_cliente": "Mariana Torres", "tracking_code": "MX-982441-TR" }
    ]
  }
}
```

---

## 🚀 Puesta en Marcha y Uso Local

LabelLove no requiere instalación de dependencias vía `npm` para su funcionamiento en desarrollo o uso local, ya que aprovecha la arquitectura estándar de módulos nativos de los navegadores modernos.

### Opción 1: Con Laravel Herd / Valet / Servidor Local
Si cuentas con **Laravel Herd** o similar, simplemente vincula el directorio o accede directamente mediante el virtual host configurado (ejemplo: `http://labellove-desktop.test`).

### Opción 2: Con Python
```bash
cd /Users/franciscogomezbarragan/Herd/labellove-desktop
python3 -m http.server 8000
```
Abre en tu navegador: [http://localhost:8000](http://localhost:8000)

### Opción 3: Con Node / npx
```bash
cd /Users/franciscogomezbarragan/Herd/labellove-desktop
npx serve .
```

### Opción 4: Con VSCode / Antigravity Live Server
Haz clic en **"Go Live"** desde la barra de estado en el archivo `index.html`.

---

## ⌨️ Atajos de Teclado (Cheat Sheet)

| Atajo | Acción |
|---|---|
| `Cmd + P` / `Ctrl + P` | Abrir diálogo de impresión matricial en hoja |
| `Cmd + S` / `Ctrl + S` | Guardar proyecto actual (`.labellove`) |
| `Cmd + O` / `Ctrl + O` | Abrir archivo de proyecto desde disco |
| `Cmd + Z` / `Ctrl + Z` | Deshacer última modificación |
| `Cmd + Shift + Z` / `Ctrl + Y` | Rehacer modificación |
| `Supr` / `Backspace` | Eliminar elemento seleccionado |
| `Espacio + Arrastre` | Paneo libre del lienzo |
| `Clic Central + Arrastre` | Paneo estilo Inkscape / CAD |
| `Escape` | Cerrar modal activo o deseleccionar elemento |
| `Arrastrar archivo al lienzo` | Cargar documento `.labellove` o `.json` instantáneamente |

---

## 📂 Estructura del Repositorio

```text
labellove-desktop/
├── index.html                   # Interfaz de usuario principal y estructura de modales
├── README.md                    # Documentación integral de función, intención y arquitectura
├── AGENTS.md                    # Reglas operativas y directrices de documentación para agentes
│
├── js/                          # Núcleo modular de la aplicación (ES Modules)
│   ├── app.js                   # Orquestador general y mediador de eventos
│   ├── canvas.js                # Motor del lienzo interactivo y transformaciones WYSIWYG
│   ├── barcode-engine.js        # Motor de 39+ simbologías de códigos 1D y 2D
│   ├── sheet-print-engine.js    # Motor de maquetación matricial y salida a @media print
│   ├── zpl-generator.js         # Generador de comandos nativos Zebra ZPL II
│   ├── data-store.js            # Estado reactivo de datos tabulares e interpolador
│   ├── format-engine.js         # Formateador de máscaras (divisas, IVA, ceros, etc.)
│   ├── document-manager.js      # Serialización, guardado local y persistencia
│   ├── templates.js             # Biblioteca de plantillas predefinidas y dimensiones
│   └── vendor/
│       └── bwip-js-min.js       # Motor gráfico de alta resolución para códigos de barras
│
├── styles/                      # Sistema de diseño con CSS puro
│   ├── theme.css                # Paleta HSL, tipografía y tokens de diseño
│   ├── canvas.css               # Estilos del lienzo, reglas, guías y transformer
│   └── components.css           # Modales, TopBar, inspector, tablas y @media print
│
├── examples/                    # Archivos de ejemplo para pruebas
│   ├── etiqueta_envio_express.labellove   # Proyecto muestra con variables y código de barras
│   └── muestras_etiquetas_multihoja.xlsx # Archivo Excel con registros de prueba
│
└── docs/                        # Historial cronológico de planes y walkthroughs
    ├── YYYY-MM-DD_HH-mm_implementation_plan.md
    └── YYYY-MM-DD_HH-mm_walkthrough.md
```

---

## 📄 Licencia

Este proyecto está disponible para desarrollo y uso en estaciones de trabajo de etiquetado moderno. Diseñado con precisión y simplicidad para optimizar flujos de trabajo de producción, logística y comercio.
