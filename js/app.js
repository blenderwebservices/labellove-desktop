/**
 * LabelLove - Main Application Controller
 */

import { DataStore } from './data-store.js';
import { CanvasEngine } from './canvas.js';
import { TEMPLATES } from './templates.js';
import { ZPLGenerator } from './zpl-generator.js';
import { BarcodeEngine } from './barcode-engine.js';
import { DocumentManager } from './document-manager.js';

class App {
  constructor() {
    this.dataStore = new DataStore();
    this.docManager = new DocumentManager(this);
    this.canvasEngine = new CanvasEngine({
      dataStore: this.dataStore,
      onSelectionChange: (el) => this.onElementSelected(el),
      onElementUpdate: (el) => {
        this.updateInspectorValues(el);
        this.docManager?.setUnsavedChanges(true);
      },
      onCanvasResize: ({ widthMm, heightMm }) => {
        this.updateInspectorLabelSettings();
        this.updateCanvasDimBadge();
        this.syncPresetSelect(widthMm, heightMm);
        this.docManager?.setUnsavedChanges(true);
      }
    });

    this.currentTemplateId = 'shipping_4x6';
    this.init();
  }

  init() {
    // 1. Try to restore auto-saved session or load default template
    if (this.docManager.hasAutoSavedDocument()) {
      this.docManager.restoreAutoSavedDocument();
    } else {
      this.canvasEngine.loadTemplate(TEMPLATES[this.currentTemplateId]);
    }

    this.updateCanvasDimBadge();
    this.syncPresetSelect(this.canvasEngine.currentTemplate?.widthMm, this.canvasEngine.currentTemplate?.heightMm);

    // 2. Setup Data Drawer & Table
    this.renderDataTable();
    this.updateRecordScrubber();
    this.updateOverflowAlerts();

    // 3. Setup event listeners
    this.setupUIEvents();
    this.setupInspectorEvents();
    this.setupKeyboardShortcuts();

    // Listen to data store changes
    this.dataStore.onChange(() => {
      this.canvasEngine.renderElements();
      this.updateRecordScrubber();
      this.updateActiveTableRow();
      this.updateOverflowAlerts();
      this.docManager?.setUnsavedChanges(true);
    });

    console.log('⚡ LabelLove Application initialized successfully');
  }

  // ------------------------------------------------------------------------
  // UI & Toolbar Interactions
  // ------------------------------------------------------------------------
  setupUIEvents() {
    // ------------------------------------------------------------------------
    // Document File Operations (Nuevo, Abrir, Guardar, Exportar)
    // ------------------------------------------------------------------------
    document.getElementById('btnNewDoc')?.addEventListener('click', () => {
      this.docManager.createNewDocument(this.currentTemplateId);
    });

    const openMenuBtn = document.getElementById('btnOpenMenu');
    const openMenuDropdown = document.getElementById('openMenuDropdown');
    openMenuBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      openMenuDropdown?.classList.toggle('is-open');
    });

    document.addEventListener('click', () => {
      openMenuDropdown?.classList.remove('is-open');
    });

    // Recent Projects Modal
    const recentModal = document.getElementById('recentProjectsModal');
    document.getElementById('btnOpenRecent')?.addEventListener('click', () => {
      openMenuDropdown?.classList.remove('is-open');
      this.renderRecentProjectsGrid();
      recentModal?.classList.add('is-open');
    });

    document.getElementById('closeRecentProjectsBtn')?.addEventListener('click', () => {
      recentModal?.classList.remove('is-open');
    });
    document.getElementById('closeRecentModalBottomBtn')?.addEventListener('click', () => {
      recentModal?.classList.remove('is-open');
    });

    // Open from file
    document.getElementById('btnOpenFile')?.addEventListener('click', () => {
      openMenuDropdown?.classList.remove('is-open');
      this.docManager.openFromFile();
    });

    document.getElementById('importModalBtn')?.addEventListener('click', () => {
      recentModal?.classList.remove('is-open');
      this.docManager.openFromFile();
    });

    // Save & Export
    document.getElementById('btnSaveDoc')?.addEventListener('click', () => {
      this.docManager.saveToFile(false);
    });

    document.getElementById('btnSaveAsDoc')?.addEventListener('click', () => {
      this.docManager.saveToFile(true);
    });

    // Native file input change
    const fileOpenInput = document.getElementById('fileOpenInput');
    fileOpenInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) {
        this.docManager.loadFromFileObject(file);
      }
    });

    // Project Name edit
    const projNameInput = document.querySelector('.project-name-input');
    projNameInput?.addEventListener('input', () => {
      this.docManager.setUnsavedChanges(true);
    });

    // Setup Drag & Drop
    this.setupDragAndDrop();

    // Template Selector
    const templateSelect = document.getElementById('templateSelect');
    if (templateSelect) {
      templateSelect.addEventListener('change', (e) => {
        this.currentTemplateId = e.target.value;
        const template = TEMPLATES[this.currentTemplateId];
        this.canvasEngine.loadTemplate(template);
        this.updateInspectorLabelSettings();
        this.updateSegmentedControl(template.type || 'roll');
        this.docManager.setUnsavedChanges(true);
      });
    }

    // Segmented Mode Control (Thermal Roll vs Sheet)
    document.querySelectorAll('.segment-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.segment-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.dataset.mode;
        if (mode === 'sheet') {
          // Switch to Avery template if currently on roll
          if (this.canvasEngine.currentTemplate.type !== 'sheet') {
            templateSelect.value = 'avery_5160';
            this.currentTemplateId = 'avery_5160';
            this.canvasEngine.loadTemplate(TEMPLATES['avery_5160']);
          }
        } else {
          if (this.canvasEngine.currentTemplate.type !== 'roll') {
            templateSelect.value = 'shipping_4x6';
            this.currentTemplateId = 'shipping_4x6';
            this.canvasEngine.loadTemplate(TEMPLATES['shipping_4x6']);
          }
        }
        this.docManager.setUnsavedChanges(true);
      });
    });

    // Substrate pills
    document.querySelectorAll('.substrate-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.substrate-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.canvasEngine.setSubstrate(pill.dataset.substrate);
        this.docManager.setUnsavedChanges(true);
      });
    });

    // Zoom buttons
    document.getElementById('zoomInBtn')?.addEventListener('click', () => {
      this.canvasEngine.setZoom(this.canvasEngine.zoom * 1.15);
    });
    document.getElementById('zoomOutBtn')?.addEventListener('click', () => {
      this.canvasEngine.setZoom(this.canvasEngine.zoom / 1.15);
    });
    document.getElementById('zoomFitBtn')?.addEventListener('click', () => {
      this.canvasEngine.fitToScreen();
    });

    // Canvas Dimensions Badge in Topbar (switches to Label tab)
    document.getElementById('canvasDimBadge')?.addEventListener('click', () => {
      document.querySelector('.tab-btn[data-tab="label"]')?.click();
    });

    // Left Ribbon Creation Tools
    document.getElementById('toolAddText')?.addEventListener('click', () => {
      this.canvasEngine.addElement({
        type: 'text',
        text: 'Nuevo Texto',
        fontSize: 12,
        fontWeight: 'normal',
        widthMm: 40,
        heightMm: 8
      });
      this.docManager.setUnsavedChanges(true);
    });

    document.getElementById('toolAddBarcode')?.addEventListener('click', () => {
      this.canvasEngine.addElement({
        type: 'barcode',
        format: 'CODE128',
        value: '750103131000',
        widthMm: 50,
        heightMm: 18,
        displayValue: true
      });
      this.docManager.setUnsavedChanges(true);
    });

    document.getElementById('toolAddQR')?.addEventListener('click', () => {
      this.canvasEngine.addElement({
        type: 'qr',
        value: 'https://labellove.test',
        widthMm: 24,
        heightMm: 24
      });
      this.docManager.setUnsavedChanges(true);
    });

    document.getElementById('toolAddBox')?.addEventListener('click', () => {
      this.canvasEngine.addElement({
        type: 'shape',
        shapeType: 'rect',
        widthMm: 40,
        heightMm: 20
      });
      this.docManager.setUnsavedChanges(true);
    });

    document.getElementById('toolAddLine')?.addEventListener('click', () => {
      this.canvasEngine.addElement({
        type: 'shape',
        shapeType: 'line',
        widthMm: 50,
        heightMm: 1
      });
      this.docManager.setUnsavedChanges(true);
    });

    document.getElementById('toolAddVariable')?.addEventListener('click', () => {
      this.canvasEngine.addElement({
        type: 'text',
        text: '{{ nombre_cliente }}',
        field: 'nombre_cliente',
        fontSize: 13,
        fontWeight: 'bold',
        widthMm: 60,
        heightMm: 9
      });
      this.docManager.setUnsavedChanges(true);
    });

    // Drawer Toggle
    const drawer = document.getElementById('dataDrawer');
    const drawerToggle = document.getElementById('drawerToggleBtn');
    drawerToggle?.addEventListener('click', () => {
      drawer.classList.toggle('is-collapsed');
      document.querySelector('.workspace-area')?.classList.toggle('drawer-open', !drawer.classList.contains('is-collapsed'));
      setTimeout(() => this.canvasEngine.renderRulers(), 260);
    });

    // Scrubber Controls
    document.getElementById('scrubberPrevBtn')?.addEventListener('click', () => this.dataStore.prevRecord());
    document.getElementById('scrubberNextBtn')?.addEventListener('click', () => this.dataStore.nextRecord());

    // Print & ZPL Dialog
    const printModal = document.getElementById('printModal');
    document.getElementById('topbarPrintBtn')?.addEventListener('click', () => {
      this.openPrintModal();
    });
    document.getElementById('closePrintModalBtn')?.addEventListener('click', () => {
      printModal.classList.remove('is-open');
    });
    document.getElementById('copyZPLBtn')?.addEventListener('click', () => {
      const code = document.getElementById('zplCodePreview').textContent;
      navigator.clipboard.writeText(code).then(() => {
        alert('Código ZPL copiado al portapapeles!');
      });
    });
    document.getElementById('downloadZPLBtn')?.addEventListener('click', () => {
      const code = document.getElementById('zplCodePreview').textContent;
      const blob = new Blob([code], { type: 'text/plain' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `etiqueta_${this.currentTemplateId}.zpl`;
      a.click();
    });

    // Native Browser Print Dialog simulation
    document.getElementById('nativePrintBtn')?.addEventListener('click', () => {
      window.print();
    });

    // Add Row in Data Table
    document.getElementById('addTableRowBtn')?.addEventListener('click', () => {
      const nextId = 10842 + this.dataStore.records.length;
      this.dataStore.addRecord({
        orden_id: String(nextId),
        nombre_cliente: 'Nuevo Cliente',
        direccion: 'Av. Constitución 100',
        ciudad: 'Monterrey, N.L.',
        codigo_postal: '64000',
        sku: 'ACC-CBL-FAST',
        precio: '299.00',
        tracking_code: `MX-${nextId}-TR`,
        status: 'Listo'
      });
    });

    // Floating HUD controls
    document.getElementById('hudFontSize')?.addEventListener('change', (e) => {
      const el = this.canvasEngine.elements.find(item => item.id === this.canvasEngine.selectedElementId);
      if (el && el.type === 'text') {
        el.fontSize = parseInt(e.target.value, 10);
        this.canvasEngine.renderElements();
        this.updateInspectorValues(el);
      }
    });

    document.getElementById('hudBoldBtn')?.addEventListener('click', () => {
      const el = this.canvasEngine.elements.find(item => item.id === this.canvasEngine.selectedElementId);
      if (el && el.type === 'text') {
        el.fontWeight = el.fontWeight === 'bold' ? 'normal' : 'bold';
        this.canvasEngine.renderElements();
        this.updateInspectorValues(el);
      }
    });

    document.getElementById('hudBarcodeFormat')?.addEventListener('change', (e) => {
      const el = this.canvasEngine.elements.find(item => item.id === this.canvasEngine.selectedElementId);
      if (el && el.type === 'barcode') {
        el.format = e.target.value;
        this.canvasEngine.renderElements();
        this.updateInspectorValues(el);
      }
    });
  }

  // ------------------------------------------------------------------------
  // Right Inspector Panel
  // ------------------------------------------------------------------------
  setupInspectorEvents() {
    // Tabs switcher
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.dataset.tab;
        document.getElementById('tabProperties').style.display = tab === 'properties' ? 'flex' : 'none';
        document.getElementById('tabLabelSettings').style.display = tab === 'label' ? 'flex' : 'none';
        document.getElementById('tabLayers').style.display = tab === 'layers' ? 'flex' : 'none';

        if (tab === 'layers') this.renderLayersList();
      });
    });

    // Element Geometry Inputs
    const bindNumInput = (id, prop) => {
      const input = document.getElementById(id);
      if (input) {
        input.addEventListener('change', (e) => {
          const el = this.canvasEngine.elements.find(item => item.id === this.canvasEngine.selectedElementId);
          if (el) {
            el[prop] = parseFloat(e.target.value) || 0;
            this.canvasEngine.renderElements();
            this.canvasEngine.updateTransformer();
            this.canvasEngine.updateHUD();
          }
        });
      }
    };

    bindNumInput('propX', 'xMm');
    bindNumInput('propY', 'yMm');
    bindNumInput('propW', 'widthMm');
    bindNumInput('propH', 'heightMm');

    // Text Content Input
    document.getElementById('propTextContent')?.addEventListener('input', (e) => {
      const el = this.canvasEngine.elements.find(item => item.id === this.canvasEngine.selectedElementId);
      if (el) {
        el.text = e.target.value;
        this.canvasEngine.renderElements();
      }
    });

    // Barcode / QR Value Input
    document.getElementById('propCodeValue')?.addEventListener('input', (e) => {
      const el = this.canvasEngine.elements.find(item => item.id === this.canvasEngine.selectedElementId);
      if (el) {
        el.value = e.target.value;
        this.canvasEngine.renderElements();
      }
    });

    // Barcode Symbology Dropdown
    document.getElementById('propBarcodeFormat')?.addEventListener('change', (e) => {
      const el = this.canvasEngine.elements.find(item => item.id === this.canvasEngine.selectedElementId);
      if (el && el.type === 'barcode') {
        el.format = e.target.value;
        this.canvasEngine.renderElements();
        this.updateInspectorValues(el);
      }
    });

    // Data Field Binding Dropdown
    document.getElementById('propFieldBinding')?.addEventListener('change', (e) => {
      const el = this.canvasEngine.elements.find(item => item.id === this.canvasEngine.selectedElementId);
      if (el) {
        const field = e.target.value;
        el.field = field || null;
        if (field) {
          if (el.type === 'text') el.text = `{{ ${field} }}`;
          if (el.type === 'barcode' || el.type === 'qr') el.value = `{{ ${field} }}`;
        }
        this.canvasEngine.renderElements();
        this.updateInspectorValues(el);
      }
    });

    // Delete Element button in inspector
    document.getElementById('deleteElementBtn')?.addEventListener('click', () => {
      this.canvasEngine.deleteSelectedElement();
    });

    // ------------------------------------------------------------------------
    // Label / Canvas Dimensions and Settings
    // ------------------------------------------------------------------------
    const onCanvasDimInput = () => {
      const w = parseFloat(document.getElementById('labelWidthMm')?.value);
      const h = parseFloat(document.getElementById('labelHeightMm')?.value);
      if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
        this.canvasEngine.setCanvasSize(w, h);
        this.updateCanvasDimBadge();
        this.syncPresetSelect(w, h);
        this.docManager?.setUnsavedChanges(true);
      }
    };
    document.getElementById('labelWidthMm')?.addEventListener('input', onCanvasDimInput);
    document.getElementById('labelHeightMm')?.addEventListener('input', onCanvasDimInput);

    // Label Preset Dropdown
    document.getElementById('labelPresetSelect')?.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val && val !== 'custom' && val.includes('x')) {
        const [w, h] = val.split('x').map(parseFloat);
        this.canvasEngine.setCanvasSize(w, h);
        this.updateInspectorLabelSettings();
        this.updateCanvasDimBadge();
        this.docManager?.setUnsavedChanges(true);
      }
    });

    // Toggle Orientation Button
    document.getElementById('btnToggleOrientation')?.addEventListener('click', () => {
      const t = this.canvasEngine.currentTemplate;
      if (t) {
        const newW = t.heightMm;
        const newH = t.widthMm;
        this.canvasEngine.setCanvasSize(newW, newH);
        this.updateInspectorLabelSettings();
        this.updateCanvasDimBadge();
        this.syncPresetSelect(newW, newH);
        this.docManager?.setUnsavedChanges(true);
      }
    });

    // DPI Selector
    document.getElementById('labelDpi')?.addEventListener('change', (e) => {
      if (this.canvasEngine.currentTemplate) {
        this.canvasEngine.currentTemplate.dpi = parseInt(e.target.value, 10) || 203;
        this.docManager?.setUnsavedChanges(true);
      }
    });
  }

  onElementSelected(el) {
    const emptyState = document.getElementById('inspectorEmpty');
    const formState = document.getElementById('inspectorForm');

    if (!el) {
      if (emptyState) emptyState.style.display = 'flex';
      if (formState) formState.style.display = 'none';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (formState) formState.style.display = 'flex';

    this.updateInspectorValues(el);
  }

  updateInspectorValues(el) {
    if (!el) return;
    document.getElementById('propX').value = el.xMm.toFixed(1);
    document.getElementById('propY').value = el.yMm.toFixed(1);
    document.getElementById('propW').value = el.widthMm.toFixed(1);
    document.getElementById('propH').value = el.heightMm.toFixed(1);

    const textSection = document.getElementById('sectionTextProperties');
    const barcodeSection = document.getElementById('sectionBarcodeProperties');

    if (el.type === 'text') {
      if (textSection) textSection.style.display = 'flex';
      if (barcodeSection) barcodeSection.style.display = 'none';
      document.getElementById('propTextContent').value = el.text || '';
    } else if (el.type === 'barcode' || el.type === 'qr') {
      if (textSection) textSection.style.display = 'none';
      if (barcodeSection) barcodeSection.style.display = 'flex';
      document.getElementById('propCodeValue').value = el.value || '';
      
      const formatDropdown = document.getElementById('propBarcodeFormat');
      if (formatDropdown) {
        formatDropdown.style.display = el.type === 'barcode' ? 'block' : 'none';
        formatDropdown.value = el.format || 'CODE128';
      }

      // Update Scanner Optical Readability Gauge
      const gauge = document.getElementById('scannerGauge');
      if (gauge && el.type === 'barcode') {
        const evalResult = BarcodeEngine.evaluateReadability(el.widthMm, el.format || 'CODE128', this.canvasEngine.currentTemplate.dpi);
        gauge.className = `scanner-gauge ${evalResult.isGood ? '' : 'warning'}`;
        gauge.innerHTML = `
          <span>${evalResult.isGood ? '✓' : '⚠️'}</span>
          <div>
            <strong>${evalResult.label}</strong>
            <div style="font-size: 10px; opacity: 0.85;">Módulo: ${evalResult.mils} mils (${evalResult.dots} dots)</div>
          </div>
        `;
      }
    } else {
      if (textSection) textSection.style.display = 'none';
      if (barcodeSection) barcodeSection.style.display = 'none';
    }

    // Populate data binding options
    const bindingSelect = document.getElementById('propFieldBinding');
    if (bindingSelect) {
      bindingSelect.innerHTML = '<option value="">-- Sin vincular (Estático) --</option>';
      this.dataStore.columns.forEach(col => {
        const opt = document.createElement('option');
        opt.value = col;
        opt.textContent = `Columna: {{ ${col} }}`;
        if (el.field === col) opt.selected = true;
        bindingSelect.appendChild(opt);
      });
    }
  }

  updateInspectorLabelSettings() {
    const t = this.canvasEngine.currentTemplate;
    if (!t) return;
    document.getElementById('labelWidthMm').value = t.widthMm;
    document.getElementById('labelHeightMm').value = t.heightMm;
    document.getElementById('labelDpi').value = t.dpi;
  }

  updateSegmentedControl(mode) {
    document.querySelectorAll('.segment-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.mode === mode);
    });
  }

  renderLayersList() {
    const container = document.getElementById('layersContainer');
    if (!container) return;
    container.innerHTML = '';

    [...this.canvasEngine.elements].reverse().forEach(el => {
      const row = document.createElement('div');
      row.className = `layer-row ${el.id === this.canvasEngine.selectedElementId ? 'active' : ''}`;
      row.style.cssText = `
        display: flex; align-items: center; justify-content: space-between;
        padding: 6px 8px; background: var(--bg-surface-elevated);
        border: 1px solid var(--border-subtle); border-radius: 4px; cursor: pointer;
        font-size: 11px; margin-bottom: 4px;
      `;
      row.innerHTML = `
        <div style="display:flex; align-items:center; gap:6px;">
          <span>${el.type === 'text' ? 'T' : el.type === 'barcode' ? '|||' : el.type === 'qr' ? '▦' : '▢'}</span>
          <span style="font-weight: 500;">${el.text || el.value || el.id}</span>
        </div>
        <span style="color: var(--text-faint); font-size: 10px;">${el.type}</span>
      `;
      row.addEventListener('click', () => {
        this.canvasEngine.selectElement(el.id);
        this.renderLayersList();
      });
      container.appendChild(row);
    });
  }

  // ------------------------------------------------------------------------
  // Data Table & Scrubber
  // ------------------------------------------------------------------------
  renderDataTable() {
    const table = document.getElementById('dataTable');
    if (!table) return;

    // Header
    let html = '<thead><tr><th>#</th>';
    this.dataStore.columns.forEach(col => {
      html += `<th>{{ ${col} }}</th>`;
    });
    html += '</tr></thead><tbody>';

    // Rows
    this.dataStore.records.forEach((row, idx) => {
      const isActive = idx === this.dataStore.activeRecordIndex;
      html += `<tr class="${isActive ? 'active-record' : ''}" data-index="${idx}">`;
      html += `<td style="font-family: var(--font-mono); font-weight: bold; width: 36px;">${idx + 1}</td>`;
      this.dataStore.columns.forEach(col => {
        html += `<td contenteditable="true" data-col="${col}">${row[col] || ''}</td>`;
      });
      html += '</tr>';
    });

    html += '</tbody>';
    table.innerHTML = html;

    // Table click listener
    table.querySelectorAll('tbody tr').forEach(tr => {
      tr.addEventListener('click', (e) => {
        if (e.target.tagName !== 'TD') return;
        const idx = parseInt(tr.dataset.index, 10);
        this.dataStore.setActiveRecord(idx);
      });
    });

    // Contenteditable changes
    table.querySelectorAll('td[contenteditable="true"]').forEach(td => {
      td.addEventListener('blur', (e) => {
        const tr = td.closest('tr');
        const idx = parseInt(tr.dataset.index, 10);
        const col = td.dataset.col;
        this.dataStore.updateCell(idx, col, td.textContent.trim());
      });
    });

    const countBadge = document.getElementById('recordCountBadge');
    if (countBadge) countBadge.textContent = `${this.dataStore.records.length} registros`;
  }

  updateRecordScrubber() {
    const label = document.getElementById('scrubberStatusText');
    if (label) {
      label.textContent = `Registro ${this.dataStore.activeRecordIndex + 1} de ${this.dataStore.records.length}`;
    }
  }

  updateActiveTableRow() {
    document.querySelectorAll('#dataTable tbody tr').forEach(tr => {
      const idx = parseInt(tr.dataset.index, 10);
      tr.classList.toggle('active-record', idx === this.dataStore.activeRecordIndex);
    });
  }

  updateOverflowAlerts() {
    const alertPill = document.getElementById('overflowAlertPill');
    if (!alertPill) return;

    const warnings = this.dataStore.getOverflowWarnings(this.canvasEngine.elements);
    if (warnings.length > 0) {
      alertPill.style.display = 'flex';
      alertPill.textContent = `⚠️ ${warnings.length} desbordamiento detectado (Click para auto-ajustar)`;
      alertPill.onclick = () => {
        warnings.forEach(w => {
          const el = this.canvasEngine.elements.find(e => e.id === w.elementId);
          if (el) el.fontSize = w.suggestedSize;
        });
        this.canvasEngine.renderElements();
        this.updateOverflowAlerts();
      };
    } else {
      alertPill.style.display = 'none';
    }
  }

  // ------------------------------------------------------------------------
  // Print & ZPL Dialog
  // ------------------------------------------------------------------------
  openPrintModal() {
    const modal = document.getElementById('printModal');
    const zplBox = document.getElementById('zplCodePreview');
    const zpl = ZPLGenerator.generate(
      this.canvasEngine.currentTemplate,
      this.canvasEngine.elements,
      this.dataStore.getActiveRecord()
    );

    if (zplBox) zplBox.textContent = zpl;
    if (modal) modal.classList.add('is-open');
  }

  setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Don't trigger shortcuts when typing inside inputs or contenteditable
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName) || e.target.isContentEditable) {
        return;
      }

      // Cmd+S / Ctrl+S (Guardar)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        this.docManager.saveToFile(false);
        return;
      }

      // Cmd+O / Ctrl+O (Abrir archivo)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        this.docManager.openFromFile();
        return;
      }

      // Cmd+N / Ctrl+N (Nueva etiqueta)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        this.docManager.createNewDocument(this.currentTemplateId);
        return;
      }

      // Delete / Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        this.canvasEngine.deleteSelectedElement();
        this.docManager.setUnsavedChanges(true);
      }

      // Cmd+P / Ctrl+P
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        this.openPrintModal();
      }

      // Escape
      if (e.key === 'Escape') {
        this.canvasEngine.selectElement(null);
        document.getElementById('printModal')?.classList.remove('is-open');
        document.getElementById('recentProjectsModal')?.classList.remove('is-open');
        document.getElementById('openMenuDropdown')?.classList.remove('is-open');
      }

      // Arrow keys nudging
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const el = this.canvasEngine.elements.find(item => item.id === this.canvasEngine.selectedElementId);
        if (el) {
          const step = e.shiftKey ? 2.0 : 0.5; // mm
          if (e.key === 'ArrowUp') el.yMm = Math.max(0, el.yMm - step);
          if (e.key === 'ArrowDown') el.yMm = el.yMm + step;
          if (e.key === 'ArrowLeft') el.xMm = Math.max(0, el.xMm - step);
          if (e.key === 'ArrowRight') el.xMm = el.xMm + step;

          this.canvasEngine.renderElements();
          this.canvasEngine.updateTransformer();
          this.canvasEngine.updateHUD();
          this.updateInspectorValues(el);
          this.docManager.setUnsavedChanges(true);
        }
      }
    });
  }

  // ------------------------------------------------------------------------
  // Drag & Drop File Handling
  // ------------------------------------------------------------------------
  setupDragAndDrop() {
    const overlay = document.getElementById('dropzoneOverlay');
    let dragCounter = 0;

    window.addEventListener('dragenter', (e) => {
      e.preventDefault();
      dragCounter++;
      if (overlay) overlay.classList.add('is-active');
    });

    window.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    window.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter <= 0) {
        dragCounter = 0;
        if (overlay) overlay.classList.remove('is-active');
      }
    });

    window.addEventListener('drop', (e) => {
      e.preventDefault();
      dragCounter = 0;
      if (overlay) overlay.classList.remove('is-active');

      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.name.endsWith('.labellove') || file.name.endsWith('.json')) {
          this.docManager.loadFromFileObject(file);
        } else {
          alert('Por favor arrastra un archivo válido con extensión .labellove o .json');
        }
      }
    });
  }

  // ------------------------------------------------------------------------
  // Recent Projects Grid Renderer
  // ------------------------------------------------------------------------
  renderRecentProjectsGrid() {
    const grid = document.getElementById('recentProjectsGrid');
    if (!grid) return;

    const projects = this.docManager.getRecentProjects();
    if (projects.length === 0) {
      grid.innerHTML = `
        <div class="recent-empty-state">
          <div class="recent-empty-icon">📂</div>
          <h4 style="font-size: 14px; font-weight: 600; color: var(--text-main); margin-bottom: 4px;">No hay etiquetas guardadas</h4>
          <p style="font-size: 12px; color: var(--text-muted); margin: 0;">Tus etiquetas guardadas localmente aparecerán aquí para acceso rápido.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = projects.map(proj => {
      const meta = proj.metadata || {};
      const lbl = proj.label || {};
      const dateStr = meta.updatedAt ? new Date(meta.updatedAt).toLocaleDateString(undefined, {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      }) : 'Reciente';

      const typeLabel = lbl.type === 'sheet' ? '📄 Pliego' : '🖨️ Rollo';
      const substrateLabel = {
        thermal: 'Térmico Directo',
        gloss: 'Blanco Brillante',
        kraft: 'Papel Kraft',
        clear: 'Transparente'
      }[lbl.substrate] || lbl.substrate || 'Térmico';

      return `
        <div class="recent-project-card" data-id="${meta.id}">
          <div class="recent-card-header">
            <div>
              <div class="recent-card-title">${this.escapeHtml(meta.name || 'Etiqueta sin título')}</div>
              <div class="recent-card-specs">
                <span class="spec-badge">${lbl.widthMm || 100} × ${lbl.heightMm || 150} mm</span>
                <span class="spec-badge">${typeLabel}</span>
                <span class="spec-badge">${substrateLabel}</span>
              </div>
            </div>
          </div>
          <div class="recent-card-footer">
            <span class="recent-card-date">${dateStr}</span>
            <div class="recent-card-actions">
              <button class="btn-card-del" data-id="${meta.id}" title="Eliminar de proyectos recientes">🗑️</button>
              <button class="btn-card-open" data-id="${meta.id}">Abrir</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach open and delete events
    grid.querySelectorAll('.btn-card-open').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const project = projects.find(p => p.metadata.id === id);
        if (project && project.fullDoc) {
          this.docManager.loadDocument(project.fullDoc);
          document.getElementById('recentProjectsModal')?.classList.remove('is-open');
        }
      });
    });

    grid.querySelectorAll('.btn-card-del').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        if (confirm('¿Eliminar esta etiqueta de tus proyectos recientes?')) {
          this.docManager.deleteRecentProject(id);
          this.renderRecentProjectsGrid();
        }
      });
    });
  }

  escapeHtml(str) {
    return (str || '').replace(/[&<>"']/g, (m) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }
}

// Start app on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
  window.labelLoveApp = new App();
});
