# Plan de Implementación: Elemento de Tipo Imagen en Etiquetas

**Fecha:** 2026-09-24 23:42  
**Proyecto:** LabelLove Desktop Web  
**Objetivo:** Incorporar soporte completo para elementos de tipo Imagen en las etiquetas, permitiendo cargar logos, fotografías, pictogramas de advertencia y gráficos vectoriales/rasterizados con soporte para impresión en hoja, ZPL II para impresoras térmicas y gestión en el inspector.

---

## 1. Análisis de Requisitos y Alcance

Actualmente LabelLove soporta elementos de tipo:
- `text`: Textos con variables dinámicas `{{ campo }}` y máscaras de formateo.
- `barcode`: Códigos de barras 1D con evaluación óptica de lectura.
- `qr`: Códigos 2D (QR estándar, Micro QR, GS1 QR, Data Matrix, PDF417).
- `shape`: Rectángulos y líneas divisorias.

El usuario solicita:
> "agrega la caracteristica para incluir en las etiquetas un elemento de tipo imagen"

### Capacidades Necesarias para el Elemento Imagen:
1. **Creación e Inserción:**
   - Botón en la barra lateral izquierda (Ribbon): `🖼️ Imagen` con atajo de teclado `I`.
   - Selector nativo de archivos (`.png`, `.jpg`, `.jpeg`, `.svg`, `.webp`, `.gif`) que convierte la imagen a Base64 DataURL para garantizar que el archivo `.labellove` sea 100% autocontenido y portátil.
   - Presets integrados de imágenes y pictogramas comunes de logística (ej. Frágil / Copa, Este Lado Arriba `↑↑`, Reciclable `♻️`, Logo genérico).
2. **Edición en el Lienzo WYSIWYG (`CanvasEngine`):**
   - Renderizado en tiempo real escalado proporcionalmente o con ajuste (`contain`, `cover`, `fill`).
   - Soporte de transformación completa con el transformer (8 tiradores de redimensionamiento, arrastre y rotación angular).
   - Control de opacidad y filtro monocromático en vivo (con slider de umbral de blanco y negro para previsualizar cómo se imprimirá en impresoras térmicas).
   - Interpolación de variables si la URL proviene de una columna de datos (`{{ logo_url }}`).
3. **Inspector de Propiedades (`index.html` + `js/app.js`):**
   - Sección `#sectionImageProperties` en el panel derecho del inspector.
   - Miniatura de vista previa de la imagen cargada.
   - Botón "Cambiar Imagen / Subir archivo".
   - Campo para URL externa o variable `{{ columna }}`.
   - Selector de Modo de Ajuste (`contain`, `cover`, `fill`).
   - Control de Opacidad (0% - 100%).
   - Switch y Slider de "Filtro Térmico Monocromático" (Threshold 0-255 e Invertir).
   - Galería rápida de pictogramas predefinidos (Frágil, Flechas arriba, Reciclaje).
4. **Impresión Matricial en Pliegos (`SheetPrintEngine`):**
   - Renderizado fiel de la imagen en cada celda del pliego (Carta, A4, Avery) para impresoras del sistema operativo (`window.print()`).
5. **Generación ZPL II para Impresoras Térmicas (`ZPLGenerator`):**
   - Conversión de la imagen a mapa de bits monocromático en formato ASCII Hex de Zebra (`^GFA,bytes,totalBytes,rowBytes,hexData^FS`).
   - Calibrado exacto según los DPI de la impresora (203, 300 o 600 DPI).
6. **Gestión Documental y Persistencia:**
   - Guardado y restauración en archivos `.labellove` y autoguardado en `localStorage`.
   - Soporte en la lista de capas (icono `🖼️` y nombre del archivo/logo).

---

## 2. Plan Paso a Paso

- [ ] **Paso 1:** Actualizar `index.html` con el botón `toolAddImage` en la barra lateral, input de archivo oculto `#imageFileInput` y la sección de propiedades `#sectionImageProperties` en el inspector.
- [ ] **Paso 2:** Actualizar `js/canvas.js` para renderizar elementos `el.type === 'image'`, soportando DataURL, `object-fit`, opacidad, filtros monocromáticos y placeholder interactivo si no tiene imagen.
- [ ] **Paso 3:** Actualizar `js/app.js` para vincular eventos de creación de imagen, selector de archivos, listeners del inspector de imágenes, atajos de teclado (`I`) y lista de capas.
- [ ] **Paso 4:** Actualizar `js/sheet-print-engine.js` para renderizar imágenes en las celdas de la hoja matricial.
- [ ] **Paso 5:** Implementar en `js/zpl-generator.js` la transpilación de elementos de imagen a comandos nativos Zebra `^GFA` (Graphic Field).
- [ ] **Paso 6:** Actualizar `styles/canvas.css` y `styles/components.css` con estilos refinados para el contenedor de imagen, miniatura en inspector y galería de pictogramas.
- [ ] **Paso 7:** Probar carga de imágenes, redimensionamiento, guardado en `.labellove`, vista previa de hoja y generación de ZPL.
- [ ] **Paso 8:** Actualizar `README.md` y generar el reporte final `docs/2026-09-24_23-42_walkthrough.md`.
