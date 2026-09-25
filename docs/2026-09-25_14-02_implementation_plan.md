# Plan de Implementación: Validación Diferida de Dimensiones del Lienzo

Permitir que el usuario escriba libremente el valor deseado para el ancho y alto del lienzo (tanto desde el control de inspector como al pulsar el botón de dimensiones de la barra superior `📐 39 × 15 mm`), validando los límites (mínimo 15 mm, máximo 600 mm) únicamente al terminar de escribir (`change`, `blur` o presionar `Enter`), en lugar de validar y sobreescribir el campo en cada pulsación de tecla (`input`).

## 1. Problema Identificado

Actualmente en [js/app.js](file:///Users/francisco/Herd/labellove/js/app.js):
- Los campos `#labelWidthMm` y `#labelHeightMm` escuchan el evento `'input'`.
- En cuanto el usuario presiona una tecla (por ejemplo, teclea `1` con la intención de escribir `100` o `15`), el evento se dispara de inmediato.
- Se invoca `canvasEngine.setCanvasSize(1, h)`, el cual aplica `Math.max(15, ...)`, forzando el valor a `15`.
- Se emite el evento `onCanvasResize`, el cual llama a `updateInspectorLabelSettings()`.
- Esta función sobreescribe inmediatamente el contenido del campo activo (`wInput.value = 15`), destruyendo lo que el usuario estaba escribiendo e impidiendo teclear números normalmente.

## 2. Objetivos y Solución Propuesta

1. **Validación Diferida (Commit on Complete)**:
   - Eliminar la validación destructiva en cada pulsación de tecla (`input`).
   - Validar y redimensionar el lienzo únicamente cuando el usuario confirma el valor:
     - Al perder el foco (`blur`).
     - Al cambiar el valor y salir (`change`).
     - Al presionar la tecla `Enter`.
   - Permitir cancelar con la tecla `Escape` (restituyendo el valor previo).

2. **Validación Amigable y Feedback**:
   - Si el usuario ingresa un valor menor a 15 mm, se ajusta a 15 mm y se muestra una notificación toast informativa: *"El ancho/alto mínimo permitido es 15 mm"*.
   - Si el usuario ingresa un valor mayor a 600 mm, se ajusta a 600 mm y se muestra una notificación toast: *"El ancho/alto máximo permitido es 600 mm"*.
   - Si el campo queda vacío o con un valor inválido (`NaN`), se restituye el valor previo válido sin alterar el lienzo.

3. **Protección del Campo con Foco Activo**:
   - En `updateInspectorLabelSettings()`, verificar que no se sobreescriba el valor si el usuario tiene el foco en el campo (`document.activeElement !== wInput` y `document.activeElement !== hInput`).

4. **Experiencia desde el Botón de la Barra Superior (`#canvasDimBadge`)**:
   - Al hacer clic en `📐 ... mm` de la barra superior, no solo se abre la pestaña "Etiqueta", sino que se enfoca automáticamente el campo de ancho (`#labelWidthMm`) con su texto seleccionado para escribir inmediatamente el nuevo valor.

---

## 3. Archivos Afectados

| Archivo | Acción | Descripción |
|---|---|---|
| [js/app.js](file:///Users/francisco/Herd/labellove/js/app.js) | Modificar | Reemplazar listeners `input` de dimensiones por validación diferida (`change`, `blur`, `keydown` Enter/Escape), proteger `updateInspectorLabelSettings()` ante elementos con foco, y enfocar/seleccionar campo al hacer clic en `#canvasDimBadge`. |
| [index.html](file:///Users/francisco/Herd/labellove/index.html) | Modificar | Alinear atributos `min="15"` y `max="600"` en `#labelWidthMm` y `#labelHeightMm`. |

---

## 4. Plan de Pruebas y Verificación

1. Probar en Node.js la sintaxis y comportamiento de los módulos.
2. Probar interacción escribiendo valores comenzando con `1` (ej. `1`, `10`, `100`, `120`) comprobando que no se sustituya por `15` mientras se escribe.
3. Probar confirmación con `Enter` y con desenfoque (`blur`).
4. Probar límites: escribir `5` y pulsar Enter -> debe corregirse a `15` con mensaje toast; escribir `800` y pulsar Enter -> debe corregirse a `600` con mensaje toast.
5. Probar clic en el botón de la barra superior `📐 ... mm` -> debe cambiar a pestaña Etiqueta y seleccionar el valor de ancho listo para sobrescribir.
