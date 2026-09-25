# Plan de Implementación: Soporte Universal de Códigos de Barras y QR (39 Simbologías de Label Live)

**Fecha y Hora:** 2026-09-24 11:19  
**Proyecto:** LabelLove Desktop Web  
**Objetivo:** Incorporar soporte completo para las 39 simbologías de códigos de barras y códigos 2D de Label Live, priorizando la familia de Códigos QR (QR Code, Micro QR Code, GS1 QR Code, HIBC QR Code), matrices 2D (Data Matrix, PDF417) y estándares industriales, comerciales y postales.

---

## 1. Simbologías a Integrar (Catálogo Completo de Label Live)

### Prioridad 1: Familia Códigos QR (2D)
1. **QR Code** (`qrcode`): Estándar mundial ISO/IEC 18004 para enlaces, texto y datos estructurados.
2. **Micro QR Code** (`microqrcode`): Variante compacta para piezas pequeñas o impresiones de alta densidad con un solo patrón de detección.
3. **GS1 QR Code** (`gs1qrcode`): QR con identificadores de aplicación (AI) GS1 y Digital Link.
4. **HIBC QR Code** (`hibcqrcode`): Estándar del Health Industry Bar Code para dispositivos médicos y hospitales.

### Prioridad 2: Matrices 2D Adicionales
5. **Data Matrix** (`datamatrix`): Matriz 2D cuadrada industrial estándar ISO/IEC 16022.
6. **Data Matrix Rectangular** (`datamatrixrectangular`): Variante rectangular para empaques alargados o viales farmacéuticos.
7. **GS1 Data Matrix** (`gs1datamatrix`): Estándar obligatorio en la industria farmacéutica para serialización.
8. **HIBC Data Matrix** (`hibcdatamatrix`): Data Matrix para insumos de salud.
9. **HIBC Data Matrix Rectangular** (`hibcdatamatrixrectangular`): Data Matrix rectangular de salud.
10. **PDF417** (`pdf417`): Código 2D apilado de alta capacidad para identificaciones, envíos y licencias.
11. **PDF417 - Compact** (`pdf417compact`): Versión truncada sin margen derecho para espacios reducidos.
12. **PDF417 - Micro** (`micropdf417`): Variante compacta de PDF417 para piezas y etiquetas reducidas.

### Prioridad 3: Retail y Comercio (GS1 / EAN / UPC / ISBN)
13. **EAN-13** (`ean13`): Código de producto universal para comercio fuera de Norteamérica.
14. **EAN-8** (`ean8`): Código de 8 dígitos para empaques reducidos.
15. **UPC-A** (`upca`): Código comercial estándar de 12 dígitos para Estados Unidos y Canadá.
16. **UPC-E** (`upce`): Versión comprimida de 6/8 dígitos de UPC-A.
17. **ISBN** (`isbn`): Número estándar internacional de libros (con cálculo de dígito verificador).
18. **ITF-14 / GS1-14** (`itf14`): Código para cajas maestras de cartón corrugado.
19. **GS1-128** (`gs1-128`): Estándar logístico con identificadores de aplicación.
20. **SSCC-18** (`sscc18`): Serial Shipping Container Code para palets y contenedores de envío.
21. **GS1 DataBar Omnidirectional** (`databaromni`): Código de barra para productos frescos y cupones.
22. **GS1 DataBar Stacked** (`databarstacked`): Versión apilada de GS1 DataBar.
23. **GS1 DataBar Expanded** (`databarexpanded`): GS1 DataBar con datos adicionales (peso, lote, fecha).
24. **GS1 DataBar Expanded Stacked** (`databarexpandedstacked`): Variante expandida apilada en múltiples niveles.

### Prioridad 4: Códigos Industriales y Logística (1D)
25. **Code 128** (`code128`): Código alfanumérico universal de alta densidad.
26. **Code 39** (`code39`): Estándar militar e industrial.
27. **Code 39 Extended** (`code39ext`): Soporte para los 128 caracteres ASCII.
28. **Code 93** (`code93`): Mayor densidad y redundancia que Code 39.
29. **Code 11** (`code11`): Utilizado en componentes de telecomunicaciones.
30. **Codabar** (`rationalizedCodabar`): Estándar para bancos de sangre y guías aéreas.
31. **Interleaved 2 of 5 (ITF)** (`interleaved2of5`): Código numérico por pares de barras.
32. **MSI Modified Plessey** (`msi`): Utilizado en estanterías de supermercados y control de stock.
33. **HIBC Code 128** (`hibccode128`): Código 128 con estructura de datos HIBC.
34. **HIBC Code 39** (`hibccode39`): Código 39 con estructura de datos HIBC.

### Prioridad 5: Postales y Mensajería
35. **USPS Intelligent Mail (IMb)** (`onecode`): Código de 4 estados para correspondencia de EE.UU.
36. **USPS POSTNET** (`postnet`): Código postal tradicional de EE.UU.
37. **Royal Mail 4 State** (`royalmail`): Código postal RM4SCC del correo británico.
38. **Royal Dutch TPG Post KIX** (`kix`): Código postal de los Países Bajos.

---

## 2. Fases de Trabajo

- [ ] **Fase 1: Integración del Motor Universal `bwip-js`**
  - Añadir `bwip-js-min.js` a `index.html` vía CDN con garantía de carga local/offline.
  - Actualizar `js/barcode-engine.js` para crear un mapa unificado de simbologías con metadatos (nombre legible, tipo 1D/2D, ejemplo de datos, categoría).
- [ ] **Fase 2: Métodos de Renderizado Multi-Formato**
  - Implementar en `BarcodeEngine.renderBarcode()` y `BarcodeEngine.renderQRCode()` el renderizado vectorial y en canvas de alta resolución con `bwipjs.toCanvas()`.
  - Soporte de opciones de QR (Micro QR, GS1 QR, HIBC QR, corrección de errores, escala automática).
  - Mantener fallback automático con `JsBarcode` / `QRCode` / SVG si `bwipjs` no estuviera disponible.
- [ ] **Fase 3: Interfaz de Usuario y Selectores en Inspector**
  - Modificar `#propBarcodeFormat` y `#hudBarcodeFormat` en `index.html` para incluir los 39 formatos organizados en `<optgroup>`.
  - Crear sincronización bidireccional en `js/app.js` e inspector: al cambiar de simbología, sugerir valores de prueba representativos para evitar errores de validación (por ejemplo, números de 13 dígitos para EAN-13, enlaces para QR, etc.).
- [ ] **Fase 4: Adaptación del Lienzo (`js/canvas.js`)**
  - Manejar elementos tipo `qr` y `barcode` con renderizado reactivo a medida que el usuario ajusta tamaño o valor interpolado con datos variables `{{ campo }}`.
- [ ] **Fase 5: Pruebas y Validación**
  - Verificar renderizado de cada grupo en navegador y en entorno headless.
  - Documentar reporte de entrega en `docs/YYYY-MM-DD_HH-mm_walkthrough.md`.
