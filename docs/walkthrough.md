# Walkthrough: Prototipo Interactivo "LabelLove"

Hemos implementado con éxito la aplicación interactiva de **LabelLove**, inspirada en la velocidad de **Label LIVE** y la potencia de datos y formatos de **Labeljoy**, con un diseño moderno estilo **Figma + Linear**.

---

## 🚀 Acceso Inmediato

La aplicación ya se encuentra activa y servida localmente por Laravel Herd:
👉 **[http://labellove.test](http://labellove.test)**

---

## 🎨 Arquitectura y Componentes Construidos

### 1. Canvas Interactivo & Simulación 1:1
- **Reglas métricas dinámicas** ([canvas.js](file:///Users/francisco/Herd/labellove/js/canvas.js)): Medición milimétrica en tiempo real en los ejes horizontal y vertical con seguidores de cursor.
- **Manipulación directa**:
  - Arrastre fluido de elementos con cuadrícula magnética (*smart snap* al centro de la etiqueta y bordes).
  - Caja delimitadora (*transformer*) con **8 tiradores de redimensionamiento**.
  - Píldora de dimensiones dinámicas (`45.0 × 18.0 mm`).
  - **Margen de seguridad**: Delimitador visual de 1.5 mm correspondiente al cabezal de impresión térmico.
- **Simulador de Sustratos**:
  - Alternador de material en 1 clic: **Térmico Directo Mate**, **Blanco Brillante**, **Papel Kraft** y **Transparente**.

### 2. Motor Reactivo de Datos ("Data Flow")
- **Data Drawer inferior** ([components.css](file:///Users/francisco/Herd/labellove/styles/components.css)): Hoja de cálculo integrada tipo Airtable/Linear.
- **Record Scrubber**:
  - Permite avanzar o retroceder registros (`< Registro 1 de 5 >`).
  - Al cambiar de fila, el lienzo actualiza **instantáneamente** los nombres, direcciones, códigos de seguimiento y QR.
- **Detector de desbordamiento (Overflow Guard)**:
  - Alerta visual en la barra (`⚠️ 1 desbordamiento detectado`).
  - Función de 1 clic para auto-reducir la tipografía (*fit-to-box*).

### 3. Generación Universal de Códigos & Verificador Óptico
- Motor híbrido ([barcode-engine.js](file:///Users/francisco/Herd/labellove/js/barcode-engine.js)):
  - Soporte de códigos 1D (Code 128, EAN-13, UPC-A, Code 39) y 2D (QR Code).
  - Incluye renderizador vectorial de respaldo (*zero-dependency SVG fallback*) en caso de trabajar sin conexión a internet.
  - **Scanner Readability Gauge**: Indicador que evalúa el ancho del módulo (mils/dots) contra la resolución de la impresora para certificar que el lector óptico del almacén siempre lo leerá.

### 4. Generador Nativo ZPL II
- Módulo especializado ([zpl-generator.js](file:///Users/francisco/Herd/labellove/js/zpl-generator.js)):
  - Convierte los milímetros y puntos tipográficos del lienzo a coordenadas de puntos nativos (`^XA ... ^FO ... ^BC ... ^BQ ... ^XZ`).
  - Permite previsualizar, copiar al portapapeles o descargar el archivo `.zpl` listo para enviar por socket TCP (puerto 9100) o USB a impresoras Zebra, TSC o Rollo.

### 5. Catálogo de Plantillas
- **Envío E-commerce (100x150 mm / 4x6")**: Formato estándar de paquetería con código de barras de rastreo, QR dinámico y desglose de orden.
- **Almacén / Retail (50x30 mm)**: Formato compacto de anaquel con SKU, EAN-13 y precio.
- **Pliego Avery 5160 (Carta - 30 etiquetas)**: Formato de hoja troquelada multietiqueta.

---

## 🧪 Verificación Realizada

1. **Sintaxis de código**:
   ```bash
   node --check js/app.js && node --check js/canvas.js && node --check js/data-store.js && node --check js/templates.js && node --check js/barcode-engine.js && node --check js/zpl-generator.js
   # Resultado: 0 errores de sintaxis
   ```
2. **Validación de la lógica de datos y ZPL**:
   - Probado cálculo de coordenadas y sustitución de variables dinámicas `{{ nombre_cliente }}` y `{{ tracking_code }}` en consola con éxito.
3. **Disponibilidad web**:
   - `curl -I http://labellove.test` respondió `HTTP/1.1 200 OK` a través de Nginx/Laravel Herd.
