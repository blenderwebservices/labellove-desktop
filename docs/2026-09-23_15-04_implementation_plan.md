# Plan de Implementación: Sistema de Guardado y Apertura de Documentos de Etiquetas (.labellove)

**Fecha y Hora:** 2026-09-23 15:04

Este plan define la arquitectura, el formato de archivo de datos y la interfaz de usuario para permitir **guardar, exportar, abrir e importar documentos de etiquetas** en **LabelLove**, tanto en disco local (`.labellove` / `.json`) como en almacenamiento del navegador (`localStorage` con historial de etiquetas recientes y auto-guardado).

---

## User Review Required

> [!IMPORTANT]
> **Formato de Archivo Nativo**:
> Definiremos la extensión propietaria **`.labellove`** (que internamente es un JSON estructurado y validado).
> - Se aceptarán tanto archivos `.labellove` como `.json`.
> - Se implementará soporte para la **File System Access API** del navegador (`showOpenFilePicker` / `showSaveFilePicker`) con fallback automático para navegadores que no la soporten mediante descarga Blob/input file estándar.

> [!TIP]
> **Funciones Clave Incluidas**:
> 1. **Atajos de teclado estándar**: `Cmd+S` / `Ctrl+S` (Guardar), `Cmd+O` / `Ctrl+O` (Abrir), `Cmd+N` (Nuevo).
> 2. **Drag & Drop**: Arrastrar un archivo `.labellove` directamente sobre el lienzo para abrirlo instantáneamente.
> 3. **Gestor de Etiquetas Recientes ("Mis Etiquetas")**: Modal visual accesible desde la barra superior para abrir proyectos guardados en el navegador sin necesidad de buscar archivos en disco.
> 4. **Auto-guardado continuo**: Previene la pérdida de trabajo si la pestaña se cierra accidentalmente.

---

## Especificación del Esquema del Documento (`.labellove`)

El archivo guardado contendrá el estado íntegro y portable de la etiqueta:

```json
{
  "$schema": "https://labellove.app/schemas/v1.json",
  "format": "labellove",
  "version": "1.0.0",
  "metadata": {
    "id": "lbl_9f8a2b3c",
    "name": "Etiqueta Envío Express 4x6",
    "createdAt": "2026-09-23T15:05:00.000Z",
    "updatedAt": "2026-09-23T15:05:00.000Z",
    "author": "Usuario LabelLove"
  },
  "label": {
    "widthMm": 100,
    "heightMm": 150,
    "type": "roll",
    "substrate": "thermal",
    "orientation": "portrait",
    "dpi": 203,
    "safeMarginMm": 1.5,
    "sheetConfig": null
  },
  "elements": [
    {
      "id": "el_1",
      "type": "text",
      "xMm": 6,
      "yMm": 8,
      "widthMm": 60,
      "heightMm": 8,
      "text": "EXPRESS AIR LOGISTICS",
      "fontSize": 12,
      "fontWeight": "bold",
      "fontFamily": "Inter",
      "textAlign": "left",
      "color": "#000000"
    },
    {
      "id": "el_2",
      "type": "barcode",
      "format": "CODE128",
      "value": "{{ tracking_code }}",
      "field": "tracking_code",
      "xMm": 10,
      "yMm": 45,
      "widthMm": 80,
      "heightMm": 22,
      "displayValue": true
    }
  ],
  "dataStore": {
    "columns": ["orden_id", "nombre_cliente", "tracking_code"],
    "records": [
      { "orden_id": "10842", "nombre_cliente": "Mariana Torres", "tracking_code": "MX-982441-TR" }
    ],
    "activeRecordIndex": 0
  },
  "viewState": {
    "zoom": 1.0
  }
}
```

---

## Proposed Changes

### 1. Módulo Gestor de Documentos (Document Manager)

#### [NEW] [js/document-manager.js](file:///Users/francisco/Herd/labellove/js/document-manager.js)
- Controlador encargado de serializar y deserializar el estado de la aplicación.
- **Métodos**:
  - `exportDocument(app)`: Empaqueta plantilla, elementos, sustrato y datos en el formato `.labellove`.
  - `importDocument(app, docData)`: Valida el esquema y restaura lienzo, elementos, inspector y tabla de datos.
  - `saveToFile(app, isSaveAs)`: Guarda mediante File System Access API o descarga directa.
  - `openFromFile(app)`: Selector de archivos del sistema.
  - `saveToLocalStorage(app)`: Almacena en la colección de proyectos locales y en la ranura de auto-guardado.
  - `getRecentDocuments()` / `deleteRecentDocument(id)`.
  - `validateSchema(json)`: Comprobación de integridad para evitar corrupciones.

---

### 2. Actualización de Interfaz y TopBar

#### [MODIFY] [index.html](file:///Users/francisco/Herd/labellove/index.html)
- Añadir a la barra superior menú / botones de:
  - 📄 **Nuevo**: Limpiar o crear a partir de plantilla.
  - 📂 **Abrir**: Selector de archivo y botón para abrir modal "Mis Etiquetas".
  - 💾 **Guardar**: Guardado rápido (`Cmd+S`).
  - ⬇️ **Guardar como...**: Exportar archivo `.labellove`.
  - Indicador de estado de guardado (icono nube / *badge* "Guardado").
- Agregar el **Modal "Mis Etiquetas / Abrir Proyecto"**:
  - Lista visual con vista previa de proyectos recientes en memoria local.
  - Botón de importar archivo `.labellove` o `.json`.
  - Botón de eliminar o clonar etiquetas guardadas.
- Zona de *Drag & Drop* con capa de overlay cuando se arrastra un archivo sobre la ventana.

#### [MODIFY] [styles/components.css](file:///Users/francisco/Herd/labellove/styles/components.css)
- Estilos para el menú de archivo desplegable en la TopBar.
- Estilos del modal de "Mis Etiquetas" (grid de tarjetas con fecha, tamaño y mini-previsualización).
- Estilos del indicador de estado de guardado (*Saved Pill* con animación sutil).
- Estilos para la zona de arrastre (*Dropzone Overlay* con borde iluminado).

---

### 3. Integración en el Controlador Principal

#### [MODIFY] [js/app.js](file:///Users/francisco/Herd/labellove/js/app.js)
- Integrar `DocumentManager` en la inicialización de `App`.
- Vincular eventos de la UI (botones Nuevo, Abrir, Guardar, Guardar Como).
- Habilitar atajos de teclado globales:
  - `Cmd+S` / `Ctrl+S` -> Guardar.
  - `Cmd+O` / `Ctrl+O` -> Abrir archivo.
  - `Cmd+N` / `Ctrl+N` -> Nueva etiqueta.
- Configurar detector de arrastrar y soltar (*drag & drop*) en el elemento `window` y en el canvas.
- Cargar el último estado auto-guardado al inicio si existe, o la plantilla por defecto.

---

## Verification Plan

### Automated & Static Verification
1. Verificación de sintaxis de módulos ES:
   ```bash
   node --check js/document-manager.js
   node --check js/app.js
   ```
2. Pruebas unitarias de serialización y deserialización:
   - Crear un script de prueba que verifique que exportar un objeto y volver a importarlo produzca exactamente los mismos elementos y dimensiones.

### Manual Verification
1. **Flujo de Guardado y Descarga**:
   - Diseñar una etiqueta personalizada con código de barras y texto variable.
   - Pulsar `Cmd+S` o botón "Guardar" y verificar la descarga del archivo `.labellove`.
2. **Flujo de Apertura**:
   - Modificar el lienzo o pulsar "Nuevo".
   - Arrastrar el archivo `.labellove` descargado sobre la pantalla o usar el botón "Abrir".
   - Verificar que se restablezcan las dimensiones milimétricas, el sustrato, todos los elementos y las filas de la tabla de datos.
3. **Persistencia Local y Modal "Mis Etiquetas"**:
   - Guardar con un nombre personalizado en el modal.
   - Recargar la página y verificar que el auto-guardado o la lista de recientes recupere el trabajo de forma inmediata.
