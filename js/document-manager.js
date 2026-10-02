/**
 * LabelLove - Document Manager (Save, Open, Local Storage & Export Engine)
 * Handles .labellove and .json file formats, schema validation, and persistence.
 */

export class DocumentManager {
  constructor(app) {
    this.app = app;
    this.currentDocumentId = null;
    this.currentFileName = null;
    this.fileHandle = null; // File System Access API handle if available
    this.hasUnsavedChanges = false;
    this.autoSaveTimer = null;

    this.STORAGE_KEY_AUTOSAVE = 'labellove_autosave_doc';
    this.STORAGE_KEY_PROJECTS = 'labellove_saved_projects';
  }

  // ------------------------------------------------------------------------
  // Document Serialization & Deserialization
  // ------------------------------------------------------------------------

  /**
   * Serializes the current application state into a standard LabelLove document schema
   */
  serializeDocument(customName = null) {
    const canvas = this.app.canvasEngine;
    const store = this.app.dataStore;
    const template = canvas.currentTemplate || {};
    const nameInput = typeof document !== 'undefined' ? document.querySelector('.project-name-input') : null;
    const docName = customName || (nameInput ? nameInput.value.trim() : 'Etiqueta sin título');

    const now = new Date().toISOString();

    return {
      $schema: 'https://labellove.app/schemas/v1.json',
      format: 'labellove',
      version: '1.0.0',
      metadata: {
        id: this.currentDocumentId || 'lbl_' + Math.random().toString(36).substring(2, 10),
        name: docName,
        createdAt: this.currentCreatedAt || now,
        updatedAt: now,
        author: 'LabelLove User',
        generator: 'LabelLove v1.0'
      },
      label: {
        widthMm: template.widthMm || 100,
        heightMm: template.heightMm || 150,
        type: canvas.viewMode || template.type || 'roll',
        substrate: canvas.substrate || template.substrate || 'thermal',
        orientation: template.orientation || 'portrait',
        dpi: template.dpi || 203,
        safeMarginMm: template.safeMarginMm !== undefined ? template.safeMarginMm : 1.5,
        sheetConfig: template.sheetConfig || null
      },
      elements: JSON.parse(JSON.stringify(canvas.elements || [])),
      dataStore: {
        columns: JSON.parse(JSON.stringify(store.columns || [])),
        records: JSON.parse(JSON.stringify(store.records || [])),
        activeRecordIndex: store.activeRecordIndex || 0
      },
      viewState: {
        zoom: canvas.zoom || 1.0,
        viewMode: canvas.viewMode || 'roll'
      }
    };
  }

  /**
   * Cleans an object recursively to prevent Prototype Pollution
   */
  stripPollution(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) {
      return obj.map(item => this.stripPollution(item));
    }
    const clean = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      clean[key] = (typeof value === 'object' && value !== null) ? this.stripPollution(value) : value;
    }
    return clean;
  }

  /**
   * Validates document schema and numerical bounds before loading
   */
  validateDocument(doc) {
    if (!doc || typeof doc !== 'object') {
      throw new Error('El archivo no contiene un objeto JSON válido.');
    }

    // Accept both .labellove format and raw templates
    if (doc.format && doc.format !== 'labellove') {
      throw new Error(`Formato no soportado: "${doc.format}". Se esperaba "labellove".`);
    }

    const width = doc.label?.widthMm !== undefined ? doc.label.widthMm : doc.widthMm;
    const height = doc.label?.heightMm !== undefined ? doc.label.heightMm : doc.heightMm;

    if (width === undefined || height === undefined || typeof width !== 'number' || typeof height !== 'number' || !isFinite(width) || !isFinite(height)) {
      throw new Error('El documento no contiene dimensiones numéricas válidas (ancho y alto).');
    }

    if (width < 10 || width > 1000 || height < 10 || height > 1000) {
      throw new Error('Las dimensiones de la etiqueta están fuera de los límites permitidos (10 mm - 1000 mm).');
    }

    const rawElements = doc.elements || doc.label?.elements;
    if (!Array.isArray(rawElements)) {
      throw new Error('El documento no contiene una lista de elementos válida.');
    }

    if (rawElements.length > 500) {
      throw new Error('El documento excede el límite máximo de 500 elementos de diseño.');
    }

    // Sanitize and validate each element
    const allowedTypes = ['text', 'barcode', 'qr', 'shape', 'image'];
    for (let i = 0; i < rawElements.length; i++) {
      const el = rawElements[i];
      if (!el || typeof el !== 'object') {
        throw new Error(`Elemento #${i + 1} no es un objeto válido.`);
      }
      if (!allowedTypes.includes(el.type)) {
        throw new Error(`Tipo de elemento no reconocido: "${el.type}" en elemento #${i + 1}.`);
      }
      // Numeric sanity check
      ['xMm', 'yMm', 'widthMm', 'heightMm'].forEach(coord => {
        if (el[coord] !== undefined && (!isFinite(el[coord]) || el[coord] < -500 || el[coord] > 2000)) {
          el[coord] = 0;
        }
      });
      // String length limits to prevent DoS
      ['text', 'value', 'imageName', 'src', 'id'].forEach(strProp => {
        if (typeof el[strProp] === 'string' && el[strProp].length > 100000) {
          el[strProp] = el[strProp].slice(0, 100000);
        }
      });
    }

    return true;
  }

  /**
   * Loads a serialized document into the application
   */
  loadDocument(rawDoc, fileName = null) {
    const doc = this.stripPollution(rawDoc);
    this.validateDocument(doc);

    const canvas = this.app.canvasEngine;
    const store = this.app.dataStore;

    // Normalization if opened from template format vs full document format
    const labelConfig = doc.label || {
      widthMm: doc.widthMm,
      heightMm: doc.heightMm,
      type: doc.type || 'roll',
      substrate: doc.substrate || 'thermal',
      orientation: doc.orientation || 'portrait',
      dpi: doc.dpi || 203,
      safeMarginMm: doc.safeMarginMm || 1.5,
      sheetConfig: doc.sheetConfig || null
    };

    const elements = doc.elements || doc.label?.elements || [];
    const metadata = doc.metadata || {
      id: 'lbl_' + Math.random().toString(36).substring(2, 10),
      name: fileName ? fileName.replace(/\.(labellove|json)$/i, '') : 'Etiqueta Importada',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 1. Update Project Metadata
    this.currentDocumentId = metadata.id;
    this.currentCreatedAt = metadata.createdAt;
    this.currentFileName = fileName;

    const nameInput = document.querySelector('.project-name-input');
    if (nameInput) {
      nameInput.value = metadata.name || 'Etiqueta sin título';
    }

    // 2. Load Label Dimensions & Settings in Canvas
    const templateData = {
      name: metadata.name,
      widthMm: labelConfig.widthMm,
      heightMm: labelConfig.heightMm,
      type: labelConfig.type || 'roll',
      substrate: labelConfig.substrate || 'thermal',
      orientation: labelConfig.orientation || 'portrait',
      dpi: labelConfig.dpi || 203,
      safeMarginMm: labelConfig.safeMarginMm,
      sheetConfig: labelConfig.sheetConfig,
      elements: elements
    };

    canvas.loadTemplate(templateData);

    // 3. Set Substrate UI Pill
    if (labelConfig.substrate) {
      canvas.setSubstrate(labelConfig.substrate);
      document.querySelectorAll('.substrate-pill').forEach(pill => {
        pill.classList.toggle('active', pill.dataset.substrate === labelConfig.substrate);
      });
    }

    // 4. Set Mode Pill (Roll vs Sheet)
    const mode = labelConfig.type || 'roll';
    document.querySelectorAll('.segment-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    // 5. Restore Data Store if present
    if (doc.dataStore) {
      if (Array.isArray(doc.dataStore.columns)) {
        store.columns = doc.dataStore.columns;
      }
      if (Array.isArray(doc.dataStore.records)) {
        store.records = doc.dataStore.records;
      }
      store.activeRecordIndex = doc.dataStore.activeRecordIndex || 0;
      this.app.renderDataTable();
      this.app.updateRecordScrubber();
      this.app.updateOverflowAlerts();
    }

    // 6. Zoom & View state
    if (doc.viewState?.zoom) {
      canvas.setZoom(doc.viewState.zoom);
    }

    // 7. Update UI Panels
    this.app.updateInspectorLabelSettings();
    this.setUnsavedChanges(false);
    this.triggerAutoSave();

    console.log(`📂 Documento cargado con éxito: "${metadata.name}" (${elements.length} elementos)`);
  }

  // ------------------------------------------------------------------------
  // File I/O (Download, File System Access API & File Input)
  // ------------------------------------------------------------------------

  /**
   * Prompts the user to save to file (.labellove)
   * @param {boolean} isSaveAs - Whether this is a "Save As" operation
   * @param {string|null} customName - Optional custom document name
   * @returns {Promise<boolean>}
   */
  async saveToFile(isSaveAs = false, customName = null) {
    const prevId = this.currentDocumentId;
    const prevCreatedAt = this.currentCreatedAt;
    const prevFileHandle = this.fileHandle;
    const prevFileName = this.currentFileName;
    const nameInput = typeof document !== 'undefined' ? document.querySelector('.project-name-input') : null;
    const prevInputName = nameInput ? nameInput.value : '';

    if (isSaveAs) {
      // Disconnect prior file handle so we never overwrite the original file on disk
      this.fileHandle = null;
      // Generate new document identity for the independent copy
      this.currentDocumentId = 'lbl_' + Math.random().toString(36).substring(2, 10);
      this.currentCreatedAt = new Date().toISOString();
      if (customName && nameInput) {
        nameInput.value = customName.trim();
      }
    }

    const doc = this.serializeDocument(customName);
    const jsonStr = JSON.stringify(doc, null, 2);
    const suggestedName = `${this.slugify(doc.metadata.name)}.labellove`;

    // Try modern File System Access API if supported and not in an iframe
    if (typeof window !== 'undefined' && 'showSaveFilePicker' in window && !window.frameElement) {
      try {
        if (!this.fileHandle || isSaveAs) {
          this.fileHandle = await window.showSaveFilePicker({
            suggestedName: suggestedName,
            types: [
              {
                description: 'Etiqueta LabelLove (*.labellove)',
                accept: { 'application/json': ['.labellove', '.json'] }
              }
            ]
          });
        }

        const writable = await this.fileHandle.createWritable();
        await writable.write(jsonStr);
        await writable.close();

        this.currentFileName = this.fileHandle.name;
        this.setUnsavedChanges(false);
        this.saveToRecentProjects(doc);
        const msg = isSaveAs ? `Guardado como: ${this.currentFileName}` : `Archivo guardado: ${this.currentFileName}`;
        this.showToast(msg, 'success');
        return true;
      } catch (err) {
        if (err.name === 'AbortError') {
          if (isSaveAs) {
            // Rollback to prior identity if user cancelled OS dialog
            this.currentDocumentId = prevId;
            this.currentCreatedAt = prevCreatedAt;
            this.fileHandle = prevFileHandle;
            this.currentFileName = prevFileName;
            if (nameInput) {
              nameInput.value = prevInputName;
            }
          }
          return false; // User cancelled picker
        }
        console.warn('File System Access API falló, usando descarga estándar:', err);
      }
    }

    // Fallback: Standard Blob Download
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = suggestedName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);

    this.currentFileName = suggestedName;
    this.setUnsavedChanges(false);
    this.saveToRecentProjects(doc);
    const msg = isSaveAs ? `Guardado como: ${suggestedName}` : `Descargado: ${suggestedName}`;
    this.showToast(msg, 'success');
    return true;
  }

  /**
   * Saves current state as a new document with the specified name
   * @param {string} newName - New document name
   * @returns {Promise<boolean>}
   */
  async saveAs(newName) {
    const trimmed = (newName || '').trim();
    if (!trimmed) {
      this.showToast('Debes ingresar un nombre válido para guardar la copia.', 'warning');
      return false;
    }
    return this.saveToFile(true, trimmed);
  }

  /**
   * Prompts user to open a .labellove or .json file
   */
  async openFromFile() {
    // If unsaved changes, prompt confirmation
    if (this.hasUnsavedChanges) {
      const confirmOpen = confirm('Tienes cambios sin guardar. ¿Deseas abrir otro documento y descartar los cambios actuales?');
      if (!confirmOpen) return;
    }

    // Try modern File System Access API
    if (typeof window !== 'undefined' && 'showOpenFilePicker' in window && !window.frameElement) {
      try {
        const [handle] = await window.showOpenFilePicker({
          types: [
            {
              description: 'Documentos LabelLove (*.labellove, *.json)',
              accept: { 'application/json': ['.labellove', '.json'] }
            }
          ],
          multiple: false
        });

        const file = await handle.getFile();
        const text = await file.text();
        const doc = JSON.parse(text);

        this.fileHandle = handle;
        this.loadDocument(doc, file.name);
        this.saveToRecentProjects(doc);
        this.showToast(`Documento abierto: ${file.name}`, 'success');
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.warn('File System Access API falló, usando input clásico:', err);
      }
    }

    // Fallback: Click hidden file input
    const fileInput = document.getElementById('fileOpenInput');
    if (fileInput) {
      fileInput.value = '';
      fileInput.click();
    }
  }

  /**
   * Reads a File object and loads it (used by drag & drop or file input)
   */
  async loadFromFileObject(file) {
    if (this.hasUnsavedChanges) {
      const confirmOpen = confirm('Tienes cambios sin guardar. ¿Deseas abrir este documento y descartar los cambios?');
      if (!confirmOpen) return;
    }

    try {
      const text = await file.text();
      const doc = JSON.parse(text);
      this.fileHandle = null;
      this.loadDocument(doc, file.name);
      this.saveToRecentProjects(doc);
      this.showToast(`Documento cargado: ${file.name}`, 'success');
    } catch (err) {
      console.error('Error al abrir archivo:', err);
      alert(`No se pudo abrir el archivo "${file.name}": ${err.message}`);
    }
  }

  /**
   * Resets canvas to a new blank label with custom specifications
   */
  createNewBlankDocument(config = {}) {
    const widthMm = parseFloat(config.widthMm) || 100;
    const heightMm = parseFloat(config.heightMm) || 150;
    const docName = (config.name || `Etiqueta ${widthMm}x${heightMm} mm`).trim();

    const blankTemplate = {
      name: docName,
      widthMm: widthMm,
      heightMm: heightMm,
      type: config.type || 'roll',
      substrate: config.substrate || 'thermal',
      orientation: config.orientation || 'portrait',
      dpi: parseInt(config.dpi, 10) || 300,
      safeMarginMm: config.safeMarginMm !== undefined ? parseFloat(config.safeMarginMm) : 1.5,
      sheetConfig: config.sheetConfig || null,
      elements: []
    };

    this.currentDocumentId = 'lbl_' + Math.random().toString(36).substring(2, 10);
    this.currentCreatedAt = new Date().toISOString();
    this.currentFileName = null;
    this.fileHandle = null;

    const nameInput = typeof document !== 'undefined' ? document.querySelector('.project-name-input') : null;
    if (nameInput) {
      nameInput.value = docName;
    }

    this.app.currentTemplateId = 'custom';
    this.app.canvasEngine.loadTemplate(blankTemplate);

    if (blankTemplate.substrate) {
      this.app.canvasEngine.setSubstrate(blankTemplate.substrate);
      if (typeof document !== 'undefined') {
        document.querySelectorAll('.substrate-pill').forEach(pill => {
          pill.classList.toggle('active', pill.dataset.substrate === blankTemplate.substrate);
        });
      }
    }

    this.app.updateSegmentedControl(blankTemplate.type || 'roll');
    this.app.updateInspectorLabelSettings();
    this.setUnsavedChanges(false);
    this.triggerAutoSave();
    this.showToast(`Lienzo en blanco creado (${widthMm} × ${heightMm} mm)`, 'success');
  }

  /**
   * Resets canvas to a selected pre-designed template
   */
  createNewDocument(templateId = 'shipping_4x6') {
    this.currentDocumentId = 'lbl_' + Math.random().toString(36).substring(2, 10);
    this.currentCreatedAt = new Date().toISOString();
    this.currentFileName = null;
    this.fileHandle = null;

    import('./templates.js').then(({ TEMPLATES }) => {
      const template = TEMPLATES[templateId] || TEMPLATES['shipping_4x6'];
      this.app.currentTemplateId = templateId;

      const nameInput = typeof document !== 'undefined' ? document.querySelector('.project-name-input') : null;
      if (nameInput) {
        nameInput.value = template.name;
      }

      this.app.canvasEngine.loadTemplate(template);

      if (template.substrate) {
        this.app.canvasEngine.setSubstrate(template.substrate);
        if (typeof document !== 'undefined') {
          document.querySelectorAll('.substrate-pill').forEach(pill => {
            pill.classList.toggle('active', pill.dataset.substrate === template.substrate);
          });
        }
      }

      this.app.updateSegmentedControl(template.type || 'roll');
      this.app.updateInspectorLabelSettings();

      const templateSelect = typeof document !== 'undefined' ? document.getElementById('templateSelect') : null;
      if (templateSelect) {
        templateSelect.value = templateId;
      }

      this.setUnsavedChanges(false);
      this.triggerAutoSave();
      this.showToast(`Plantilla cargada: ${template.name}`, 'info');
    });
  }

  // ------------------------------------------------------------------------
  // LocalStorage Persistence & Recent Projects
  // ------------------------------------------------------------------------

  /**
   * Saves to local recent projects list (indexed by document id)
   */
  saveToRecentProjects(doc = null) {
    const documentData = doc || this.serializeDocument();
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY_PROJECTS);
      const projects = raw ? JSON.parse(raw) : [];

      // Filter out existing document with same id
      const filtered = projects.filter(p => p.metadata.id !== documentData.metadata.id);

      // Create lightweight preview item for quick listing
      const summaryItem = {
        metadata: documentData.metadata,
        label: {
          widthMm: documentData.label.widthMm,
          heightMm: documentData.label.heightMm,
          type: documentData.label.type,
          substrate: documentData.label.substrate
        },
        elementsCount: documentData.elements.length,
        fullDoc: documentData
      };

      // Add to front (most recent)
      filtered.unshift(summaryItem);

      // Limit to 20 recent projects
      const trimmed = filtered.slice(0, 20);
      localStorage.setItem(this.STORAGE_KEY_PROJECTS, JSON.stringify(trimmed));
    } catch (e) {
      console.warn('No se pudo guardar en proyectos recientes de localStorage:', e);
    }
  }

  getRecentProjects() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY_PROJECTS);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  deleteRecentProject(docId) {
    try {
      const projects = this.getRecentProjects().filter(p => p.metadata.id !== docId);
      localStorage.setItem(this.STORAGE_KEY_PROJECTS, JSON.stringify(projects));
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Auto-save snapshot into localStorage to prevent lost work on refresh
   */
  triggerAutoSave() {
    clearTimeout(this.autoSaveTimer);
    this.autoSaveTimer = setTimeout(() => {
      try {
        const doc = this.serializeDocument();
        localStorage.setItem(this.STORAGE_KEY_AUTOSAVE, JSON.stringify(doc));
        this.updateSaveStatusBadge(true);
      } catch (e) {
        console.warn('Fallo en el guardado automático de localStorage:', e);
      }
    }, 1200);
  }

  /**
   * Check if there's an auto-saved document available to restore
   */
  hasAutoSavedDocument() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY_AUTOSAVE);
      return !!raw;
    } catch (e) {
      return false;
    }
  }

  restoreAutoSavedDocument() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY_AUTOSAVE);
      if (raw) {
        const doc = JSON.parse(raw);
        this.loadDocument(doc);
        this.showToast('Documento restaurado desde el guardado automático', 'info');
        return true;
      }
    } catch (e) {
      console.warn('Error al restaurar auto-guardado:', e);
    }
    return false;
  }

  // ------------------------------------------------------------------------
  // UI Helpers & Status
  // ------------------------------------------------------------------------

  setUnsavedChanges(hasChanges = true) {
    this.hasUnsavedChanges = hasChanges;
    this.updateSaveStatusBadge(!hasChanges);
    if (hasChanges) {
      this.triggerAutoSave();
    }
  }

  updateSaveStatusBadge(isSaved) {
    if (typeof document === 'undefined') return;
    const badge = document.getElementById('saveStatusBadge');
    if (!badge) return;

    if (isSaved) {
      badge.innerHTML = '<span class="status-dot dot-saved"></span><span class="status-text">Guardado</span>';
      badge.title = 'Todos los cambios están guardados';
    } else {
      badge.innerHTML = '<span class="status-dot dot-unsaved"></span><span class="status-text">Modificado</span>';
      badge.title = 'Hay cambios sin guardar (presiona Cmd+S)';
    }
  }

  showToast(message, type = 'info') {
    if (typeof document === 'undefined') return;
    let toast = document.getElementById('appToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'appToast';
      toast.className = 'app-toast';
      document.body.appendChild(toast);
    }

    const icons = {
      success: '✅',
      info: '⚡',
      warning: '⚠️',
      error: '❌'
    };

    toast.innerHTML = `<span class="toast-icon">${icons[type] || '⚡'}</span><span class="toast-msg"></span>`;
    const msgEl = toast.querySelector('.toast-msg');
    if (msgEl) {
      msgEl.textContent = message;
    }
    toast.className = `app-toast toast-${type} is-visible`;

    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      toast.classList.remove('is-visible');
    }, 2800);
  }

  slugify(text) {
    return (text || 'etiqueta')
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[\s\W-]+/g, '_')
      .replace(/^_|_$/g, '');
  }
}
