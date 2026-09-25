# Plan de Implementación: Eliminación de Registros en el Dataflow

Permitir la eliminación de filas/registros en el módulo Dataflow de LabelLove, tanto desde la barra de herramientas del drawer (junto a `+ Añadir Fila`) como directamente en cada fila de la cuadrícula de datos.

## 1. Contexto y Objetivos

Actualmente, el Dataflow permite importar archivos Excel/CSV y agregar nuevas filas mediante el botón `+ Añadir Fila`. Sin embargo, no existe un mecanismo para eliminar un registro individual ni la fila activa seleccionada.

El objetivo es:
1. Agregar la capacidad en `DataStore` para eliminar registros de forma reactiva (`deleteRecord(index)`), ajustando el índice activo y notificando a la UI y al lienzo en tiempo real.
2. Incorporar un botón `− Eliminar Fila` en el encabezado del Dataflow drawer junto a `+ Añadir Fila`.
3. Incorporar un botón de eliminación individual por fila (`🗑️`) en la tabla dinámica del Dataflow.
4. Asegurar el manejo seguro de casos límite (0 registros, última fila, actualización de scrubber y alertas).
5. Mantener consistencia con el sistema de guardado y notificaciones toast.

---

## 2. Archivos Afectados

| Archivo | Acción | Descripción |
|---|---|---|
| [js/data-store.js](file:///Users/francisco/Herd/labellove/js/data-store.js) | Modificar | Agregar método `deleteRecord(index)`, proteger `getActiveRecord()` y `getOverflowWarnings()` ante colecciones vacías, y sincronizar hojas de trabajo si aplica. |
| [index.html](file:///Users/francisco/Herd/labellove/index.html) | Modificar | Agregar botón `#deleteTableRowBtn` (`− Eliminar Fila`) en la barra de acciones del drawer `#dataDrawer`. |
| [styles/components.css](file:///Users/francisco/Herd/labellove/styles/components.css) | Modificar | Añadir reglas de estilo y hover para botones de eliminación (`.btn-delete-row`, `#deleteTableRowBtn`, estados `:disabled`). |
| [js/app.js](file:///Users/francisco/Herd/labellove/js/app.js) | Modificar | Registrar eventos para `#deleteTableRowBtn`, agregar columna y botón de acción en `renderDataTable()`, asegurar re-renderizado tras añadir/eliminar filas, y actualizar el scrubber en tiempo real. |

---

## 3. Plan Paso a Paso

### Paso 1: Extender `DataStore` (`js/data-store.js`)
- Implementar `deleteRecord(index)`:
  - Validar límites de índice.
  - Eliminar registro con `splice`.
  - Sincronizar con `this.workbook.sheets[this.currentSheetName]` si existe un libro cargado.
  - Recalcular `this.activeRecordIndex` de manera suave (si se elimina la fila actual o anterior).
  - Invocar `this.notify()`.
- Proteger `getActiveRecord()` para que siempre retorne un objeto seguro `{}`.
- Proteger `getOverflowWarnings()` cuando `records.length === 0`.

### Paso 2: Interfaz en `index.html`
- En el header del drawer (`#dataDrawer`), añadir el botón `#deleteTableRowBtn` al lado de `#addTableRowBtn`.
- Ajustar accesibilidad y tooltips.

### Paso 3: Estilos en `styles/components.css`
- Estilos para botón `#deleteTableRowBtn` con tono sutil y hover en color de advertencia/peligro (`var(--accent-danger)`).
- Estilos para el botón `.btn-delete-row` en cada fila (opacidad discreta que resalta al posar el cursor).
- Estado `:disabled` para botones de scrubber y eliminación cuando no haya registros.

### Paso 4: Lógica en `js/app.js`
- Actualizar `renderDataTable()`:
  - Agregar columna de acciones con botón `🗑️` por fila.
  - Mostrar estado vacío descriptivo si `records.length === 0`.
  - Conectar click del botón de borrado de fila con confirmación y ejecución.
- Conectar listener de `#deleteTableRowBtn` para borrar la fila activa.
- Optimizar `addTableRowBtn` para llamar a `renderDataTable()` y activar la nueva fila creada.
- Actualizar `updateRecordScrubber()` para reflejar "Sin registros" y deshabilitar controles de navegación si el conjunto está vacío.

---

## 4. Verificación y Pruebas
1. Iniciar el entorno y abrir la aplicación en el navegador.
2. Abrir el drawer de Dataflow y verificar la presencia del botón `− Eliminar Fila`.
3. Eliminar una fila usando el botón del header y verificar actualización en lienzo, tabla, badge de conteo y scrubber.
4. Eliminar una fila usando el botón `🗑️` específico en la fila.
5. Probar eliminar varias filas consecutivas hasta llegar a 0 registros y verificar que no haya errores de consola ni desbordamientos.
6. Usar `+ Añadir Fila` tras haber eliminado y comprobar que se añade, se visualiza en la tabla y se activa de inmediato.
7. Verificar que el indicador de cambios no guardados se active correctamente al eliminar.
