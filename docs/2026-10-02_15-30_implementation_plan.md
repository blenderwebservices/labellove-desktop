# Plan de Implementación: Opción "Guardar como..." para Guardar con Otro Nombre

**Fecha:** 2026-10-02 15:30  
**Proyecto:** LabelLove  
**Objetivo:** Implementar la opción "Guardar como..." (`Save As...`) para permitir al usuario guardar una copia de su diseño con un nombre personalizado, generando una nueva identidad de proyecto sin alterar el archivo ni el registro original.

---

## 1. Contexto y Diagnóstico

Actualmente en la barra superior (TopBar):
- Existe un botón `btnSaveDoc` con la etiqueta "Guardar" (`Cmd+S`).
- Existe un botón `btnSaveAsDoc` que tenía el texto "Exportar" y descargaba directamente el archivo `.labellove` o abría el selector sin permitir definir previamente un nuevo nombre de proyecto en la UI.
- Si el documento se abrió con la *File System Access API*, las acciones de guardado pueden sobreescribir el archivo original si no se desvincula el `fileHandle`.
- En `localStorage` (Mis Etiquetas), los proyectos se indexan por `metadata.id`. Al guardar como nuevo documento, se requiere generar un nuevo `id` único para no sobreescribir la etiqueta previa.

---

## 2. Solución Propuesta

### A. Interfaz de Usuario (UI) en [index.html](file:///Users/francisco/Herd/labellove/index.html)
1. **Actualizar el botón en TopBar:**
   - Cambiar la etiqueta de `btnSaveAsDoc` de "Exportar" a **"Guardar como..."**.
   - Icono representativo (`📑` o `💾`).
   - Atajo visible en el tooltip: `Cmd+Shift+S` / `Ctrl+Shift+S`.
2. **Modal Interactivo `#saveAsModal`:**
   - Crear una ventana modal consistente con el sistema de diseño de LabelLove.
   - Campo de texto `#saveAsNameInput` con el nombre actual preseleccionado (ej. `[Nombre actual] (Copia)`), permitiendo al usuario escribir inmediatamente el nuevo nombre.
   - Previsualización en tiempo real del nombre de archivo resultante (`slug.labellove`).
   - Tarjeta informativa explicando que el archivo original se mantendrá intacto y se comenzará a trabajar sobre la nueva copia.
   - Botones "Cancelar" (`Escape`) y "Guardar con este nombre" (`Enter`).

### B. Estilos en [styles/components.css](file:///Users/francisco/Herd/labellove/styles/components.css)
- Reglas CSS para `.save-as-modal`, `.save-as-body`, `.save-as-input`, y `.save-as-preview-hint`.
- Compatibilidad visual en modo oscuro y claro con variables CSS existentes.

### C. Lógica de Persistencia en [js/document-manager.js](file:///Users/francisco/Herd/labellove/js/document-manager.js)
- Agregar método `saveAs(newName)`.
- Enriquecer `saveToFile(isSaveAs, customName)`:
  - Generar un nuevo `currentDocumentId` (`lbl_...`) y actualizar `currentCreatedAt`.
  - Desvincular el archivo previo (`this.fileHandle = null`).
  - Actualizar el campo de nombre del proyecto en la interfaz (`.project-name-input`).
  - Guardar el nuevo documento en `localStorage` (proyectos recientes) como una entidad independiente.
  - Soportar guardado vía *File System Access API* (`showSaveFilePicker`) y *Blob Download* como fallback seguro.
  - Revertir limpiamente en caso de que el usuario cancele el diálogo nativo del sistema operativo (`AbortError`).
  - Notificar con Toast de éxito: `Guardado como "[nuevo nombre]"`.

### D. Controlador y Atajos en [js/app.js](file:///Users/francisco/Herd/labellove/js/app.js)
- Escuchar click en `btnSaveAsDoc` para abrir `#saveAsModal`.
- Añadir atajo de teclado: `Cmd+Shift+S` / `Ctrl+Shift+S`.
- Métodos `openSaveAsModal()`, `closeSaveAsModal()`, `handleSaveAsSubmit()`.
- Soporte para tecla `Enter` para guardar y `Escape` para cerrar.
- Sanitización segura mediante `textContent` en todas las manipulaciones del DOM.

### E. Documentación en [README.md](file:///Users/francisco/Herd/labellove/README.md)
- Registrar el atajo `Cmd + Shift + S` / `Ctrl + Shift + S` y la opción "Guardar como..." en la tabla de atajos y características.

---

## 3. Plan de Verificación

1. **Prueba de UI y Modal:**
   - Hacer clic en "Guardar como..." en la barra superior.
   - Verificar apertura del modal, enfoque automático en el input y selección del texto.
   - Probar que al escribir se actualice dinámicamente la previsualización del archivo `.labellove`.
2. **Prueba de Atajos:**
   - Presionar `Cmd+Shift+S` o `Ctrl+Shift+S` y validar apertura del modal.
   - Presionar `Escape` para cerrar sin guardar.
   - Abrir nuevamente, ingresar un nombre (ej. `Etiqueta Fragil Lote 2`) y presionar `Enter`.
3. **Prueba de Independencia de Proyectos:**
   - Verificar que el nombre en la barra superior cambie al nuevo nombre.
   - Verificar que en el modal "Mis Etiquetas" figuren ahora ambos proyectos (el original y la nueva copia).
   - Realizar modificaciones en el nuevo proyecto, presionar `Cmd+S` ("Guardar") y confirmar que se guarda sobre la copia sin sobreescribir el original.
