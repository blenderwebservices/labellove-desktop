# Plan de Implementación: Detección y Máscaras de Formato Numérico

**Fecha y Hora:** 2026-09-24 11:35  
**Proyecto:** LabelLove Desktop Web  
**Objetivo:** Permitir la aplicación de máscaras de formato en campos detectados como numéricos (por ejemplo `12345` -> `$12,345.00`, `0.16` -> `16% IVA`, relleno de ceros `000123`, etc.), tanto para texto estático como para variables del Data Drawer (`{{ precio }}`).

---

## 1. Alcance y Arquitectura de la Solución

### 1.1 Motor de Formato (`js/format-engine.js`)
Crear un motor modular (`FormatEngine`) responsable de:
1. **Detección Numérica (`isNumeric`, `detectNumeric`)**:
   - Evaluar si un valor literal o el valor resuelto de una columna/variable es un número válido.
   - Distinguir casos especiales (decimales porcentuales `< 1` como `0.16` vs números enteros/monetarios como `12345`).
2. **Aplicación Universal de Máscaras (`applyMask(value, maskPattern)`)**:
   - Descomponer la máscara en: `Prefijo`, `Patrón Numérico`, y `Sufijo`.
   - **Moneda**: `$#,##0.00`, `$#,##0`, `$#,##0.00 MXN`, `USD $#,##0.00`, `€#,##0.00`.
   - **Porcentajes e Impuestos**: `0% IVA`, `0.0% IVA`, `0%`, `0.00%`, `#% Descuento`. Auto-multiplicación x100 inteligente para valores fraccionarios (`0.16` -> `16%`).
   - **Millares y Decimales**: `#,##0`, `#,##0.00`, `#,##0.0`, `0.00`.
   - **Relleno con Ceros (Padding)**: `00000`, `000000`, `00000000` (ideal para SKUs y códigos de serie).
   - **Unidades**: `#,##0 pzas`, `#,##0 kg`, etc.
   - **Patrones Personalizados**: Prefijo + ceros obligatorios + sufijo (ej: `SKU-00000`).

### 1.2 Interfaz de Usuario e Inspector (`index.html` & `js/app.js`)
1. Agregar la sección `#sectionNumberMask` en el panel de propiedades del Inspector.
2. Añadir un badge visual interactivo cuando se detecte un valor numérico (`✓ Numérico detectado: 12345`).
3. Selector de presets con `<optgroup>` y opción `Personalizada...`.
4. Campo para ingresar máscara personalizada libre (`#propCustomMask`).
5. Caja de previsualización en vivo (`Resultado: $12,345.00`).
6. Sincronización con el historial de Deshacer/Rehacer (`saveHistory()`).

### 1.3 Integración con DataStore y Variables (`js/data-store.js`)
1. Extender `DataStore.interpolate(templateStr, record, defaultMask)`:
   - Formateo directo si el elemento es literal numérico.
   - Soporte para modificadores en variables: `{{ precio | currency }}`, `{{ tasa | percent }}`, `{{ campo | mask:"0% IVA" }}`.
   - Aplicación de `el.mask` / `el.customMask` a variables numéricas resueltas.

### 1.4 Renderizado en Lienzo y ZPL
1. **Lienzo (`js/canvas.js`)**: Renderizado en vivo del texto formateado con actualización reactiva al cambiar de fila en el Data Drawer.
2. **Generador ZPL (`js/zpl-generator.js`)**: Emisión del texto final enmascarado hacia la impresora térmica Zebra.

---

## 2. Fases de Ejecución

- [ ] **Fase 1: Módulo `js/format-engine.js`**
  - Implementar lógica de detección, parsing y formateo por patrones.
- [ ] **Fase 2: Inspector en `index.html` y Estilos**
  - Crear los controles de selección de máscara, badge numérico y preview en tiempo real.
- [ ] **Fase 3: Integración en `js/app.js` y `js/data-store.js`**
  - Conectar los eventos de cambio de máscara, actualización de inspector y motor de interpolación reactiva.
- [ ] **Fase 4: Adaptación en `js/canvas.js` y `js/zpl-generator.js`**
  - Garantizar que tanto la vista visual como la salida ZPL impriman la máscara seleccionada.
- [ ] **Fase 5: Pruebas y Validación**
  - Probar con `12345` -> `$12,345.00`
  - Probar con `0.16` -> `16% IVA`
  - Probar con padding `000123`
  - Probar con variables del Data Drawer (`{{ precio }}`)
  - Generar el reporte de entrega `docs/YYYY-MM-DD_HH-mm_walkthrough.md`.
