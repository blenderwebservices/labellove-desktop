# Plan de Implementación: Endurecimiento Integral de Seguridad (Fase 2)

**Fecha:** 2026-10-02 10:46  
**Proyecto:** LabelLove  
**Objetivo:** Completar el endurecimiento de seguridad cerrando los vectores identificados en la segunda auditoría: exfiltración de datos por canal lateral, dependencia de CDN externa, permisos `'unsafe-inline'` en CSP, validación estricta de documentos y mitigación contra Prototype Pollution.

---

## 1. Alcance de las Mejoras

### A. Vendoring Local y Eliminación de Dependencias CDN
1. Incorporar permanentemente las versiones locales de `jsbarcode.min.js`, `qrcode.min.js` y `xlsx.full.min.js` en `js/vendor/` (junto con el ya existente `bwip-js-min.js`).
2. Extraer el script inline del inicializador de tema anti-parpadeo a `js/theme-init.js`.
3. Actualizar [index.html](file:///Users/francisco/Herd/labellove/index.html) para cargar exclusivamente scripts locales.

### B. CSP Hermética (`script-src 'self'`) y Cierre de Exfiltración por Imágenes
1. Modificar la política `Content-Security-Policy` en `index.html`:
   - `script-src 'self';` (eliminando `'unsafe-inline'` y el origen abierto `https://cdn.jsdelivr.net`).
   - `img-src 'self' data: blob:;` (eliminando `https:` genérico para evitar que plantillas manipuladas exfiltren datos sensibles vía peticiones GET con parámetros interpolados).
   - Mantener `connect-src 'self' blob: data:;` y `object-src 'none'; base-uri 'self';`.

### C. Validación Segura de Orígenes de Imagen en Canvas e Impresión
1. En [js/canvas.js](file:///Users/francisco/Herd/labellove/js/canvas.js) y [js/sheet-print-engine.js](file:///Users/francisco/Herd/labellove/js/sheet-print-engine.js):
   - Validar que `rawSrc` cumpla con formatos seguros (`data:image/...`, `blob:...`, o rutas relativas locales seguras) antes de asignarlo a `img.src`.
   - Bloquear esquemas `javascript:`, `vbscript:`, o URLs remotas no autorizadas.

### D. Validación Estricta de Esquema y Protección contra Prototype Pollution
1. En [js/document-manager.js](file:///Users/francisco/Herd/labellove/js/document-manager.js):
   - Fortalecer `validateDocument(doc)` para verificar rangos numéricos seguros (`widthMm`, `heightMm`, coordenadas y dimensiones de elementos).
   - Implementar un sanitizador de objetos que descarte claves peligrosas (`__proto__`, `constructor`, `prototype`) al deserializar archivos `.labellove` o JSON.
2. En [js/app.js](file:///Users/francisco/Herd/labellove/js/app.js):
   - En `sanitizeColumnKey`, asegurar que claves como `__proto__`, `constructor` o `prototype` se conviertan en nombres neutros seguros (ej. `col_proto`).

---

## 2. Pasos de Ejecución

1. **Creación de `js/theme-init.js`:**
   - Mover la lógica del tema a un script estático independiente.
2. **Actualización de `index.html`:**
   - Ajustar CSP estricta.
   - Reemplazar llamadas a CDN por scripts locales en `js/vendor/`.
   - Cargar `js/theme-init.js`.
3. **Modificación de `js/canvas.js` y `js/sheet-print-engine.js`:**
   - Incorporar validación de fuentes de imágenes.
4. **Modificación de `js/document-manager.js` y `js/app.js`:**
   - Añadir validación estricta y protección contra prototype pollution.
5. **Verificación y Testing:**
   - Comprobar sintaxis con `node --check`.
   - Ejecutar pruebas automatizadas en Node.
