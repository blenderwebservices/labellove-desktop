# Plan de Implementación: Remediación de Seguridad contra Inyección de Código Malicioso

**Fecha:** 2026-10-02 10:23  
**Proyecto:** LabelLove  
**Objetivo:** Mitigar las vulnerabilidades de inyección de código (XSS y supply-chain), evitar vectores de ejecución no autorizada (como minería de criptomonedas / cryptojacking) y aplicar defensa en profundidad mediante Content Security Policy (CSP), Subresource Integrity (SRI) y sanitización estricta de sumideros DOM.

---

## 1. Diagnóstico de Brechas Identificadas

1. **Scripts externos sin SRI ni CSP en [index.html](file:///Users/francisco/Herd/labellove/index.html):**
   - Librerías cargadas desde `cdn.jsdelivr.net` (JsBarcode, QRCode, SheetJS) carecen de los atributos `integrity` y `crossorigin="anonymous"`.
   - Uso de `document.write` como mecanismo de fallback para `bwip-js`.
   - Ausencia total de una política `Content-Security-Policy` (CSP) que restrinja orígenes de scripts y conexiones salientes (WebSockets/fetch hacia pools maliciosos).

2. **Sumideros DOM vulnerables a XSS en [js/app.js](file:///Users/francisco/Herd/labellove/js/app.js):**
   - **`renderDataTable` (Línea 1035 y 1053):** Nombres de columnas (`col`) provenientes de CSV/Excel insertados directamente en `<th>{{ ${col} }}</th>` y `data-col="${col}"` sin escapar.
   - **`renderLayersList` (Línea 1013):** Texto o valor del elemento `${el.imageName || el.text || el.value || el.id}` insertado directamente en `row.innerHTML` sin escapar.
   - **`renderProjectsList` (Línea 1372 y 1386-1387):** Identificador `meta.id` insertado en atributos `data-id="${meta.id}"` sin escapar.

3. **Sumidero DOM en notificaciones Toast en [js/document-manager.js](file:///Users/francisco/Herd/labellove/js/document-manager.js):**
   - **`showToast` (Línea 557):** Inserción de `message` (que incluye nombres de archivos locales y nombres de hojas de cálculo importadas) directamente en `toast.innerHTML`.

4. **Inyección en SVG de código de barras en [js/barcode-engine.js](file:///Users/francisco/Herd/labellove/js/barcode-engine.js):**
   - **`renderVectorBarcodeFallback` (Línea 567):** El valor de texto (`cleanText`) se inserta en el tag `<text>` dentro de `svg.innerHTML` sin escape de entidades XML/HTML.

---

## 2. Acciones de Remediación

### Fase 1: Política de Seguridad de Contenido (CSP) y Subresource Integrity (SRI)
- Modificar [index.html](file:///Users/francisco/Herd/labellove/index.html):
  - Añadir meta etiqueta `<meta http-equiv="Content-Security-Policy" ...>` con directivas estrictas:
    - `default-src 'self'`
    - `script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net`
    - `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`
    - `font-src 'self' https://fonts.gstatic.com data:`
    - `img-src 'self' data: blob: https:`
    - `connect-src 'self' blob: data:` *(bloquea WebSockets o peticiones HTTP hacia servidores externos no autorizados, neutralizando mineros de criptomonedas)*
    - `object-src 'none'`
    - `base-uri 'self'`
  - Añadir hashes SHA-384 calculados y `crossorigin="anonymous"` a:
    - `JsBarcode.all.min.js`
    - `qrcode.min.js`
    - `xlsx.full.min.js`
  - Reemplazar el bloque `document.write` para el fallback de `bwip-js` por una carga dinámica estándar y segura con SRI.

### Fase 2: Sanitización de Sumideros DOM en `js/app.js`
- En `renderDataTable()`: Escapar `col` con `this.escapeHtml(col)` tanto en el encabezado `<th>` como en el atributo `data-col`.
- En `renderLayersList()`: Escapar `el.imageName || el.text || el.value || el.id` con `this.escapeHtml(...)`.
- En `renderProjectsList()`: Escapar `meta.id` con `this.escapeHtml(meta.id)` en los atributos `data-id`.

### Fase 3: Sanitización del Sistema Toast en `js/document-manager.js`
- En `showToast(message, type)`: Construir la estructura fija del toast y asignar el texto mediante `textContent`, impidiendo cualquier interpretación de HTML/scripts proveniente de nombres de archivo u hojas de cálculo.

### Fase 4: Escape de Entidades en Motor de Código de Barras en `js/barcode-engine.js`
- Agregar método utilitario `escapeXml(str)` en `BarcodeEngine`.
- Sanitizar `cleanText` en `renderVectorBarcodeFallback` antes de incluirlo en la etiqueta `<text>` de SVG.

---

## 3. Verificación y Validación

1. **Inspección de sintaxis y carga limpia:**
   - Validar que no existan errores de consola o sintaxis al cargar la aplicación.
2. **Verificación de SRI:**
   - Confirmar que los scripts de CDN cargan correctamente con sus hashes de integridad.
3. **Prueba de inyección controlada:**
   - Probar que entradas con caracteres HTML (`<`, `>`, `"`, `'`) en nombres de columnas de datos, nombres de capas, nombres de archivo en toasts y texto de códigos de barras se rendericen de forma segura como texto plano.
