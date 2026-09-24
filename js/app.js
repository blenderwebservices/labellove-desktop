/**
 * LabelLove - Main Application Controller
 */

import { DataStore } from './data-store.js';
import { CanvasEngine } from './canvas.js';
import { TEMPLATES, STANDARD_PRESETS } from './templates.js';
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
      this.handleNewDocumentRequest();
    });

    const openMenuBtn = document.getElementById('btnOpenMenu');
    const openMenuDropdown = document.getElementById('openMenuDropdown');
    openMenuBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      document.getElementById('themeDropdown')?.classList.remove('is-open');
      openMenuDropdown?.classList.toggle('is-open');
    });

    document.addEventListener('click', () => {
      openMenuDropdown?.classList.remove('is-open');
      document.getElementById('themeDropdown')?.classList.remove('is-open');
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

    // Setup New Job & Unsaved Changes Modal Events
    this.setupNewJobModalEvents();

    // Setup Excel / CSV Multi-Sheet Import Events
    this.setupExcelImportEvents();

    // Setup Theme Manager (Claro / Oscuro / Sistema)
    this.setupThemeManager();

    // Template Selector
    const templateSelect = document.getElementById('templateSelect');
    if (templateSelect) {
      templateSelect.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
          this.handleNewDocumentRequest();
          return;
        }
        this.currentTemplateId = e.target.value;
        const template = TEMPLATES[this.currentTemplateId];
        if (template) {
          this.canvasEngine.loadTemplate(template);
          this.updateInspectorLabelSettings();
          this.updateSegmentedControl(template.type || 'roll');
          this.docManager.setUnsavedChanges(true);
        }
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
    const wInput = document.getElementById('labelWidthMm');
    const hInput = document.getElementById('labelHeightMm');
    const dpiSelect = document.getElementById('labelDpi');
    if (wInput) wInput.value = t.widthMm;
    if (hInput) hInput.value = t.heightMm;
    if (dpiSelect) dpiSelect.value = t.dpi || 203;

    this.updateCanvasDimBadge();
    this.syncPresetSelect(t.widthMm, t.heightMm);
  }

  updateCanvasDimBadge() {
    const t = this.canvasEngine.currentTemplate;
    const badgeLabel = document.getElementById('canvasDimLabel');
    if (t && badgeLabel) {
      badgeLabel.textContent = `${t.widthMm} × ${t.heightMm} mm`;
    }
  }

  syncPresetSelect(widthMm, heightMm) {
    const presetSelect = document.getElementById('labelPresetSelect');
    if (!presetSelect) return;
    let matched = false;
    for (const opt of presetSelect.options) {
      if (opt.value && opt.value.includes('x')) {
        const [pw, ph] = opt.value.split('x').map(parseFloat);
        if (Math.abs(pw - widthMm) < 0.2 && Math.abs(ph - heightMm) < 0.2) {
          presetSelect.value = opt.value;
          matched = true;
          break;
        }
      }
    }
    if (!matched) {
      presetSelect.value = 'custom';
    }
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
        this.handleNewDocumentRequest();
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
        document.getElementById('unsavedChangesModal')?.classList.remove('is-open');
        document.getElementById('newJobModal')?.classList.remove('is-open');
        document.getElementById('excelImportModal')?.classList.remove('is-open');
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

      // Inkscape Zoom Shortcuts: Cmd/Ctrl + = / +, -, 0, 1
      if ((e.metaKey || e.ctrlKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        this.canvasEngine.setZoom(this.canvasEngine.zoom * 1.15);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === '-' || e.key === '_')) {
        e.preventDefault();
        this.canvasEngine.setZoom(this.canvasEngine.zoom / 1.15);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '0') {
        e.preventDefault();
        this.canvasEngine.fitToScreen();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '1') {
        e.preventDefault();
        this.canvasEngine.setZoom(1.0);
        return;
      }

      // Space key for Pan (Hand Tool)
      if (e.code === 'Space' && !e.repeat) {
        this.canvasEngine.setSpacePan(true);
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        this.canvasEngine.setSpacePan(false);
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

  // ------------------------------------------------------------------------
  // New Document & Confirmation Modal Flow
  // ------------------------------------------------------------------------
  handleNewDocumentRequest() {
    if (this.docManager.hasUnsavedChanges) {
      this.openUnsavedChangesModal();
    } else {
      this.openNewJobModal();
    }
  }

  openUnsavedChangesModal() {
    const modal = document.getElementById('unsavedChangesModal');
    if (!modal) return;

    const nameInput = document.querySelector('.project-name-input');
    const docName = nameInput ? nameInput.value.trim() : 'Etiqueta actual';
    const desc = document.getElementById('unsavedModalDesc');
    if (desc) {
      desc.innerHTML = `El trabajo actual "<strong>${this.escapeHtml(docName)}</strong>" tiene modificaciones que no has guardado. Si continúas sin guardar, los cambios se perderán.`;
    }

    modal.classList.add('is-open');
  }

  closeUnsavedChangesModal() {
    document.getElementById('unsavedChangesModal')?.classList.remove('is-open');
  }

  openNewJobModal() {
    this.closeUnsavedChangesModal();
    const modal = document.getElementById('newJobModal');
    if (!modal) return;

    this.switchNewJobTab('blank');
    this.renderStandardPresetsGrid();
    this.renderTemplatesCatalog('all', '');
    this.updateBlankCanvasPreview();

    modal.classList.add('is-open');
  }

  closeNewJobModal() {
    document.getElementById('newJobModal')?.classList.remove('is-open');
  }

  switchNewJobTab(tabName) {
    document.querySelectorAll('.new-job-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    const isBlank = tabName === 'blank';
    document.getElementById('tabContentBlank')?.classList.toggle('active', isBlank);
    document.getElementById('tabContentTemplates')?.classList.toggle('active', !isBlank);

    const submitBtn = document.getElementById('btnCreateBlankSubmit');
    if (submitBtn) {
      submitBtn.style.display = isBlank ? 'inline-flex' : 'none';
    }
  }

  renderStandardPresetsGrid() {
    const grid = document.getElementById('standardPresetsGrid');
    if (!grid) return;

    grid.innerHTML = STANDARD_PRESETS.map((p, idx) => `
      <div class="preset-card ${idx === 0 ? 'active' : ''}" data-id="${p.id}" tabindex="0">
        <div class="preset-card-top">
          <span class="preset-card-icon">${p.icon || '🏷️'}</span>
          ${p.badge ? `<span class="preset-badge">${p.badge}</span>` : ''}
        </div>
        <div class="preset-card-name">${this.escapeHtml(p.name)}</div>
        <div class="preset-card-dims">${p.dims}</div>
        <div class="preset-card-desc">${this.escapeHtml(p.desc)}</div>
      </div>
    `).join('');

    // Attach click events
    grid.querySelectorAll('.preset-card').forEach(card => {
      card.addEventListener('click', () => {
        grid.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');

        const presetId = card.dataset.id;
        const preset = STANDARD_PRESETS.find(p => p.id === presetId);
        if (!preset) return;

        const nameInput = document.getElementById('newJobName');
        const wInput = document.getElementById('newJobWidth');
        const hInput = document.getElementById('newJobHeight');
        const typeSelect = document.getElementById('newJobType');
        const substrateSelect = document.getElementById('newJobSubstrate');
        const dpiSelect = document.getElementById('newJobDpi');
        const orientSelect = document.getElementById('newJobOrientation');

        if (nameInput) nameInput.value = preset.name;
        if (wInput) wInput.value = preset.widthMm;
        if (hInput) hInput.value = preset.heightMm;
        if (typeSelect) typeSelect.value = preset.type || 'roll';
        if (substrateSelect) substrateSelect.value = preset.substrate || 'thermal';
        if (dpiSelect) dpiSelect.value = preset.dpi || 300;
        if (orientSelect) {
          orientSelect.value = (preset.widthMm >= preset.heightMm) ? 'landscape' : 'portrait';
        }

        this.updateBlankCanvasPreview();
      });
    });
  }

  updateBlankCanvasPreview() {
    const wInput = document.getElementById('newJobWidth');
    const hInput = document.getElementById('newJobHeight');
    const substrateSelect = document.getElementById('newJobSubstrate');
    const dpiSelect = document.getElementById('newJobDpi');
    const orientSelect = document.getElementById('newJobOrientation');

    const widthMm = parseFloat(wInput?.value) || 100;
    const heightMm = parseFloat(hInput?.value) || 150;
    const substrate = substrateSelect?.value || 'thermal';
    const dpi = dpiSelect?.value || '300';
    const orientation = orientSelect?.value || (widthMm >= heightMm ? 'landscape' : 'portrait');

    // Converted inches
    const wInch = (widthMm / 25.4).toFixed(2);
    const hInch = (heightMm / 25.4).toFixed(2);
    const wInchEl = document.getElementById('widthInchesLabel');
    const hInchEl = document.getElementById('heightInchesLabel');
    if (wInchEl) wInchEl.textContent = `${wInch} in`;
    if (hInchEl) hInchEl.textContent = `${hInch} in`;

    // Preview Tags
    const dimTag = document.getElementById('blankPreviewDimTag');
    if (dimTag) dimTag.textContent = `${widthMm} × ${heightMm} mm (${wInch}" × ${hInch}")`;

    const aspectTag = document.getElementById('previewAspectTag');
    if (aspectTag) {
      const ratio = widthMm / heightMm;
      const ratioStr = ratio >= 1 ? `${ratio.toFixed(2)}:1` : `1:${(1 / ratio).toFixed(2)}`;
      aspectTag.textContent = `${ratioStr} (${orientation === 'portrait' ? 'Vertical' : 'Horizontal'})`;
    }

    const subTag = document.getElementById('previewSubstrateTag');
    if (subTag) {
      const names = {
        thermal: 'Térmico Directo',
        gloss: 'Blanco Brillante',
        kraft: 'Papel Kraft',
        clear: 'Transparente'
      };
      subTag.textContent = `Sustrato: ${names[substrate] || substrate}`;
    }

    const dpiTag = document.getElementById('previewDpiTag');
    if (dpiTag) dpiTag.textContent = `${dpi} DPI`;

    // Stage scaling in container (max width 190, max height 140)
    const stage = document.getElementById('blankPreviewStage');
    if (stage) {
      const maxW = 190;
      const maxH = 140;
      const ratio = widthMm / heightMm;

      let drawW, drawH;
      if (ratio >= maxW / maxH) {
        drawW = maxW;
        drawH = Math.max(30, Math.round(maxW / ratio));
      } else {
        drawH = maxH;
        drawW = Math.max(30, Math.round(maxH * ratio));
      }

      stage.style.width = `${drawW}px`;
      stage.style.height = `${drawH}px`;

      // Substrate visual simulation
      if (substrate === 'kraft') {
        stage.style.background = '#d2b48c';
      } else if (substrate === 'clear') {
        stage.style.background = 'repeating-conic-gradient(#cbd5e1 0% 25%, #f1f5f9 0% 50%) 50% / 12px 12px';
      } else if (substrate === 'gloss') {
        stage.style.background = 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)';
      } else {
        stage.style.background = '#ffffff';
      }
    }
  }

  renderTemplatesCatalog(category = 'all', searchQuery = '') {
    const grid = document.getElementById('templatesCatalogGrid');
    if (!grid) return;

    const query = (searchQuery || '').trim().toLowerCase();
    const templateEntries = Object.entries(TEMPLATES);

    const filtered = templateEntries.filter(([key, t]) => {
      // Category check
      if (category !== 'all' && t.category !== category) {
        return false;
      }
      // Query check
      if (query) {
        const text = `${t.name} ${t.badge || ''} ${t.description || ''} ${t.dimensionsLabel || ''} ${key}`.toLowerCase();
        return text.includes(query);
      }
      return true;
    });

    const badgeCount = document.getElementById('templatesCountBadge');
    if (badgeCount) badgeCount.textContent = filtered.length;

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="recent-empty-state" style="grid-column: 1 / -1; padding: 30px;">
          <div class="recent-empty-icon">🔍</div>
          <h4 style="font-size: 14px; font-weight: 600; color: var(--text-main); margin-bottom: 4px;">No se encontraron plantillas</h4>
          <p style="font-size: 12px; color: var(--text-muted);">Prueba con otra palabra clave o selecciona otra categoría.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(([key, t]) => {
      const miniSvg = this.generateTemplateMiniSvg(t);
      const labelsCount = t.labelsPerSheet ? `${t.labelsPerSheet} etiquetas / hoja` : (t.type === 'sheet' ? 'Pliego' : 'Rollo continuo');

      return `
        <div class="template-card" data-template-id="${key}">
          <div class="template-card-preview">
            ${t.badge ? `<span class="template-badge">${this.escapeHtml(t.badge)}</span>` : ''}
            <span class="template-labels-per-sheet">${labelsCount}</span>
            ${miniSvg}
          </div>
          <div class="template-card-body">
            <div class="template-card-title">${this.escapeHtml(t.name)}</div>
            <div class="template-card-dims">${t.dimensionsLabel || `${t.widthMm} × ${t.heightMm} mm`}</div>
            <div class="template-card-desc">${this.escapeHtml(t.description || '')}</div>
          </div>
          <div class="template-card-actions">
            <button class="btn-template-use" data-template-id="${key}">
              <span>✨</span>
              <span>Usar Esta Plantilla</span>
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Attach click events on use buttons
    grid.querySelectorAll('.btn-template-use').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.templateId;
        this.closeNewJobModal();
        this.docManager.createNewDocument(id);
      });
    });
  }

  generateTemplateMiniSvg(template) {
    if (template.type === 'sheet') {
      const cols = template.cols || 2;
      const rows = template.rows || 5;
      const isCircle = template.id && template.id.includes('22807');
      let cells = '';
      const w = 120;
      const h = 88;
      const cellW = (w - (cols + 1) * 3) / cols;
      const cellH = (h - (rows + 1) * 3) / rows;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = 3 + c * (cellW + 3);
          const y = 3 + r * (cellH + 3);
          if (isCircle) {
            const rx = cellW / 2;
            const ry = cellH / 2;
            const rRad = Math.min(rx, ry);
            cells += `<circle cx="${x + rx}" cy="${y + ry}" r="${rRad}" fill="rgba(99, 102, 241, 0.25)" stroke="#6366f1" stroke-width="0.8" />`;
          } else {
            cells += `<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" rx="1.5" fill="rgba(99, 102, 241, 0.18)" stroke="#6366f1" stroke-width="0.8" />`;
          }
        }
      }
      return `
        <svg class="template-mini-svg" viewBox="0 0 120 88">
          <rect x="0" y="0" width="120" height="88" rx="3" fill="#ffffff" stroke="#cbd5e1" stroke-width="1"/>
          ${cells}
        </svg>
      `;
    } else {
      // Roll label preview
      const isLandscape = (template.widthMm || 100) > (template.heightMm || 100);
      const vbW = isLandscape ? 120 : 80;
      const vbH = isLandscape ? 80 : 120;
      return `
        <svg class="template-mini-svg" viewBox="0 0 ${vbW} ${vbH}">
          <rect x="2" y="2" width="${vbW - 4}" height="${vbH - 4}" rx="3" fill="#ffffff" stroke="#94a3b8" stroke-width="1.2"/>
          <line x1="8" y1="12" x2="${vbW - 8}" y2="12" stroke="#475569" stroke-width="2"/>
          <rect x="8" y="18" width="${vbW * 0.4}" height="4" fill="#94a3b8" rx="1"/>
          <rect x="8" y="26" width="${vbW * 0.7}" height="3" fill="#cbd5e1" rx="1"/>
          <rect x="8" y="${vbH - 34}" width="${vbW - 16}" height="18" fill="none" stroke="#64748b" stroke-width="0.8"/>
          <path d="M12 ${vbH - 30} v10 M15 ${vbH - 30} v10 M18 ${vbH - 30} v10 M22 ${vbH - 30} v10 M25 ${vbH - 30} v10 M29 ${vbH - 30} v10 M34 ${vbH - 30} v10 M38 ${vbH - 30} v10 M42 ${vbH - 30} v10 M46 ${vbH - 30} v10 M50 ${vbH - 30} v10 M55 ${vbH - 30} v10" stroke="#0f172a" stroke-width="1.2"/>
        </svg>
      `;
    }
  }

  setupNewJobModalEvents() {
    // Unsaved Changes Modal Events
    document.getElementById('closeUnsavedModalBtn')?.addEventListener('click', () => {
      this.closeUnsavedChangesModal();
    });

    document.getElementById('btnCancelUnsavedModal')?.addEventListener('click', () => {
      this.closeUnsavedChangesModal();
    });

    document.getElementById('btnDiscardAndContinueNew')?.addEventListener('click', () => {
      this.closeUnsavedChangesModal();
      this.openNewJobModal();
    });

    document.getElementById('btnSaveAndContinueNew')?.addEventListener('click', async () => {
      const saved = await this.docManager.saveToFile(false);
      if (saved !== false) {
        this.closeUnsavedChangesModal();
        this.openNewJobModal();
      }
    });

    // New Job Modal Close
    document.getElementById('closeNewJobModalBtn')?.addEventListener('click', () => {
      this.closeNewJobModal();
    });
    document.getElementById('cancelNewJobModalBtn')?.addEventListener('click', () => {
      this.closeNewJobModal();
    });

    // Tab Switching
    document.querySelectorAll('.new-job-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.switchNewJobTab(btn.dataset.tab);
      });
    });

    // Live Blank Dimension & Property Updates
    const wInput = document.getElementById('newJobWidth');
    const hInput = document.getElementById('newJobHeight');
    const orientSelect = document.getElementById('newJobOrientation');
    const substrateSelect = document.getElementById('newJobSubstrate');
    const dpiSelect = document.getElementById('newJobDpi');

    wInput?.addEventListener('input', () => this.updateBlankCanvasPreview());
    hInput?.addEventListener('input', () => this.updateBlankCanvasPreview());
    substrateSelect?.addEventListener('change', () => this.updateBlankCanvasPreview());
    dpiSelect?.addEventListener('change', () => this.updateBlankCanvasPreview());

    // Swap Dimensions Button
    document.getElementById('btnSwapDims')?.addEventListener('click', () => {
      if (!wInput || !hInput) return;
      const tmp = wInput.value;
      wInput.value = hInput.value;
      hInput.value = tmp;

      if (orientSelect) {
        orientSelect.value = parseFloat(wInput.value) >= parseFloat(hInput.value) ? 'landscape' : 'portrait';
      }
      this.updateBlankCanvasPreview();
    });

    orientSelect?.addEventListener('change', (e) => {
      if (!wInput || !hInput) return;
      const w = parseFloat(wInput.value) || 100;
      const h = parseFloat(hInput.value) || 150;
      if (e.target.value === 'landscape' && w < h) {
        wInput.value = h;
        hInput.value = w;
      } else if (e.target.value === 'portrait' && w > h) {
        wInput.value = h;
        hInput.value = w;
      }
      this.updateBlankCanvasPreview();
    });

    // Create Blank Canvas Submit
    document.getElementById('btnCreateBlankSubmit')?.addEventListener('click', () => {
      const name = document.getElementById('newJobName')?.value || 'Nueva Etiqueta';
      const widthMm = parseFloat(wInput?.value) || 100;
      const heightMm = parseFloat(hInput?.value) || 150;
      const type = document.getElementById('newJobType')?.value || 'roll';
      const substrate = substrateSelect?.value || 'thermal';
      const orientation = orientSelect?.value || 'portrait';
      const dpi = parseInt(dpiSelect?.value, 10) || 300;

      this.closeNewJobModal();
      this.docManager.createNewBlankDocument({
        name,
        widthMm,
        heightMm,
        type,
        substrate,
        orientation,
        dpi
      });
    });

    // Templates Filter Category Pills
    let currentCategory = 'all';
    let currentSearchQuery = '';

    document.querySelectorAll('#templateCategoryPills .cat-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('#templateCategoryPills .cat-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        currentCategory = pill.dataset.cat || 'all';
        this.renderTemplatesCatalog(currentCategory, currentSearchQuery);
      });
    });

    // Templates Search Box
    const searchInput = document.getElementById('templateSearchInput');
    searchInput?.addEventListener('input', (e) => {
      currentSearchQuery = e.target.value;
      this.renderTemplatesCatalog(currentCategory, currentSearchQuery);
    });
  }

  // ------------------------------------------------------------------------
  // Excel / CSV Multi-Sheet Import Logic
  // ------------------------------------------------------------------------
  setupExcelImportEvents() {
    const fileInput = document.getElementById('excelFileInput');
    const importBtn = document.getElementById('btnImportExcel');
    const chooseAnotherBtn = document.getElementById('btnChooseAnotherExcelFile');
    const closeBtn = document.getElementById('closeExcelModalBtn');
    const cancelBtn = document.getElementById('cancelExcelModalBtn');
    const confirmBtn = document.getElementById('confirmExcelImportBtn');
    const headersCheckbox = document.getElementById('excelHasHeadersCheckbox');
    const drawerSheetSelect = document.getElementById('drawerSheetSelect');

    // Trigger file picker
    importBtn?.addEventListener('click', () => {
      if (fileInput) {
        fileInput.value = '';
        fileInput.click();
      }
    });

    chooseAnotherBtn?.addEventListener('click', () => {
      if (fileInput) {
        fileInput.value = '';
        fileInput.click();
      }
    });

    // File selected
    fileInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) {
        this.processExcelFile(file);
      }
    });

    // Close buttons
    closeBtn?.addEventListener('click', () => this.closeExcelImportModal());
    cancelBtn?.addEventListener('click', () => this.closeExcelImportModal());

    // Toggle headers checkbox
    headersCheckbox?.addEventListener('change', () => {
      if (this.currentExcelWorkbook && this.activeImportSheetName) {
        this.renderExcelSheetPreview(this.activeImportSheetName, headersCheckbox.checked);
      }
    });

    // Confirm import button
    confirmBtn?.addEventListener('click', () => {
      this.confirmExcelImport();
    });

    // Drawer sheet select
    drawerSheetSelect?.addEventListener('change', (e) => {
      const sheetName = e.target.value;
      if (this.dataStore.loadSheet(sheetName)) {
        const selectedEl = this.canvasEngine.elements.find(el => el.id === this.canvasEngine.selectedElementId);
        if (selectedEl) this.updateInspectorValues(selectedEl);
        this.docManager.setUnsavedChanges(true);
        this.docManager.showToast(`Hoja activa: ${sheetName}`, 'info');
      }
    });
  }

  processExcelFile(file) {
    if (typeof XLSX === 'undefined') {
      alert('La librería SheetJS para procesar Excel no está disponible en este momento. Revisa tu conexión a internet.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
          alert('El archivo no contiene hojas de cálculo válidas.');
          return;
        }

        const parsedWorkbook = {
          fileName: file.name,
          fileSize: file.size,
          sheetNames: workbook.SheetNames,
          sheets: {}
        };

        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
          parsedWorkbook.sheets[sheetName] = {
            rawRows: rawRows
          };
        });

        this.currentExcelWorkbook = parsedWorkbook;
        this.openExcelImportModal();
      } catch (err) {
        console.error('Error al procesar archivo Excel:', err);
        alert(`Error al procesar el archivo Excel: ${err.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  openExcelImportModal(targetSheet = null) {
    const modal = document.getElementById('excelImportModal');
    if (!modal || !this.currentExcelWorkbook) return;

    const wb = this.currentExcelWorkbook;
    this.activeImportSheetName = targetSheet || wb.sheetNames[0];

    // File info display
    const nameEl = document.getElementById('excelFileNameDisplay');
    const metaEl = document.getElementById('excelFileMetaDisplay');
    if (nameEl) nameEl.textContent = wb.fileName;
    if (metaEl) {
      const sizeKb = (wb.fileSize / 1024).toFixed(1);
      metaEl.textContent = `${sizeKb} KB • ${wb.sheetNames.length} hoja${wb.sheetNames.length > 1 ? 's' : ''} disponible${wb.sheetNames.length > 1 ? 's' : ''}`;
    }

    // Sheet Selector List
    const sheetsList = document.getElementById('excelSheetsList');
    if (sheetsList) {
      sheetsList.innerHTML = wb.sheetNames.map((name) => {
        const rowCount = Math.max(0, (wb.sheets[name].rawRows?.length || 1) - 1);
        const isActive = name === this.activeImportSheetName;
        return `
          <button type="button" class="excel-sheet-pill ${isActive ? 'active' : ''}" data-sheet="${this.escapeHtml(name)}">
            <span>📑</span>
            <span>${this.escapeHtml(name)}</span>
            <span class="excel-sheet-count-tag">${rowCount} filas</span>
          </button>
        `;
      }).join('');

      sheetsList.querySelectorAll('.excel-sheet-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          sheetsList.querySelectorAll('.excel-sheet-pill').forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          this.activeImportSheetName = pill.dataset.sheet;
          const hasHeaders = document.getElementById('excelHasHeadersCheckbox')?.checked ?? true;
          this.renderExcelSheetPreview(this.activeImportSheetName, hasHeaders);
        });
      });
    }

    const hasHeaders = document.getElementById('excelHasHeadersCheckbox')?.checked ?? true;
    this.renderExcelSheetPreview(this.activeImportSheetName, hasHeaders);

    modal.classList.add('is-open');
  }

  closeExcelImportModal() {
    document.getElementById('excelImportModal')?.classList.remove('is-open');
  }

  renderExcelSheetPreview(sheetName, hasHeaders = true) {
    const table = document.getElementById('excelPreviewTable');
    const statsBadge = document.getElementById('excelSheetStatsBadge');
    const summaryText = document.getElementById('excelImportSummaryText');
    if (!table || !this.currentExcelWorkbook) return;

    const sheetInfo = this.currentExcelWorkbook.sheets[sheetName];
    if (!sheetInfo || !sheetInfo.rawRows) {
      table.innerHTML = '<tbody><tr><td style="padding: 20px; text-align: center; color: var(--text-muted);">Hoja vacía</td></tr></tbody>';
      return;
    }

    const rawRows = sheetInfo.rawRows;
    if (rawRows.length === 0) {
      table.innerHTML = '<tbody><tr><td style="padding: 20px; text-align: center; color: var(--text-muted);">Esta hoja no contiene datos.</td></tr></tbody>';
      if (statsBadge) statsBadge.textContent = '0 columnas • 0 filas';
      return;
    }

    let columns = [];
    let records = [];

    if (hasHeaders && rawRows.length > 0) {
      const headerRow = rawRows[0];
      columns = headerRow.map((cell, idx) => this.sanitizeColumnKey(String(cell), idx));

      // Ensure unique column names
      const seen = {};
      columns = columns.map(c => {
        if (!seen[c]) {
          seen[c] = 1;
          return c;
        }
        seen[c]++;
        return `${c}_${seen[c]}`;
      });

      for (let r = 1; r < rawRows.length; r++) {
        const rowData = rawRows[r];
        if (!rowData || rowData.length === 0 || (rowData.length === 1 && rowData[0] === '')) continue;
        const record = {};
        columns.forEach((col, cIdx) => {
          record[col] = rowData[cIdx] !== undefined ? String(rowData[cIdx]) : '';
        });
        records.push(record);
      }
    } else {
      const maxCols = Math.max(...rawRows.map(r => r.length), 1);
      for (let i = 0; i < maxCols; i++) {
        columns.push(`col_${i + 1}`);
      }
      for (let r = 0; r < rawRows.length; r++) {
        const rowData = rawRows[r];
        if (!rowData || rowData.length === 0 || (rowData.length === 1 && rowData[0] === '')) continue;
        const record = {};
        columns.forEach((col, cIdx) => {
          record[col] = rowData[cIdx] !== undefined ? String(rowData[cIdx]) : '';
        });
        records.push(record);
      }
    }

    // Cache formatted columns & records into sheetInfo
    sheetInfo.columns = columns;
    sheetInfo.records = records;

    if (statsBadge) {
      statsBadge.textContent = `${columns.length} columnas • ${records.length} registros`;
    }
    if (summaryText) {
      summaryText.textContent = `Se importarán ${records.length} registros con ${columns.length} campos desde la hoja "${sheetName}".`;
    }

    // Render Preview Table
    let html = '<thead><tr><th style="width: 32px;">#</th>';
    columns.forEach(c => {
      html += `<th>{{ ${this.escapeHtml(c)} }}</th>`;
    });
    html += '</tr></thead><tbody>';

    const previewRows = records.slice(0, 5);
    previewRows.forEach((rec, idx) => {
      html += `<tr><td style="color: var(--text-muted); font-family: var(--font-mono); font-weight: bold;">${idx + 1}</td>`;
      columns.forEach(c => {
        html += `<td>${this.escapeHtml(rec[c] || '')}</td>`;
      });
      html += '</tr>';
    });

    if (records.length > 5) {
      html += `<tr><td colspan="${columns.length + 1}" style="text-align: center; color: var(--text-muted); font-style: italic; padding: 8px;">... y ${records.length - 5} registros adicionales que estarán disponibles al importar</td></tr>`;
    }

    html += '</tbody>';
    table.innerHTML = html;
  }

  confirmExcelImport() {
    if (!this.currentExcelWorkbook || !this.activeImportSheetName) return;

    const sheetInfo = this.currentExcelWorkbook.sheets[this.activeImportSheetName];
    if (!sheetInfo || !sheetInfo.columns || sheetInfo.columns.length === 0) {
      alert('La hoja seleccionada no tiene columnas ni registros válidos para importar.');
      return;
    }

    // Load into DataStore
    this.dataStore.loadWorkbook(this.currentExcelWorkbook, this.activeImportSheetName);

    // Update Drawer File Name Display
    const drawerTitle = document.getElementById('dataDrawerFileName');
    if (drawerTitle) {
      drawerTitle.textContent = `DATA FLOW: ${this.currentExcelWorkbook.fileName}`;
    }

    // Update Drawer Sheet Select if multiple sheets exist
    const sheetGroup = document.getElementById('drawerSheetSelectorGroup');
    const sheetSelect = document.getElementById('drawerSheetSelect');
    if (this.currentExcelWorkbook.sheetNames.length > 1 && sheetGroup && sheetSelect) {
      sheetGroup.style.display = 'inline-flex';
      sheetSelect.innerHTML = this.currentExcelWorkbook.sheetNames.map(name => `
        <option value="${this.escapeHtml(name)}" ${name === this.activeImportSheetName ? 'selected' : ''}>
          ${this.escapeHtml(name)} (${this.currentExcelWorkbook.sheets[name]?.records?.length || 0})
        </option>
      `).join('');
    } else if (sheetGroup) {
      sheetGroup.style.display = 'none';
    }

    // Refresh Inspector Field Bindings if element is selected
    const selectedEl = this.canvasEngine.elements.find(el => el.id === this.canvasEngine.selectedElementId);
    if (selectedEl) {
      this.updateInspectorValues(selectedEl);
    }

    this.closeExcelImportModal();

    // Mark project changes
    this.docManager.setUnsavedChanges(true);
    this.docManager.showToast(`✅ Hoja "${this.activeImportSheetName}" importada (${sheetInfo.records.length} registros)`, 'success');
  }

  sanitizeColumnKey(str, index) {
    if (!str || typeof str !== 'string') return `col_${index + 1}`;
    const clean = str.trim()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[\s\W-]+/g, '_')
      .replace(/^_+|_+$/g, '');
    return clean || `col_${index + 1}`;
  }

  escapeHtml(str) {
    return (str || '').replace(/[&<>"']/g, (m) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }

  // ------------------------------------------------------------------------
  // Theme Manager (Light / Dark / System)
  // ------------------------------------------------------------------------
  setupThemeManager() {
    const THEME_STORAGE_KEY = 'labellove_theme_preference';
    const themeBtn = document.getElementById('btnThemeToggle');
    const themeDropdown = document.getElementById('themeDropdown');
    const themeBtnIcon = document.getElementById('themeBtnIcon');
    const themeBtnLabel = document.getElementById('themeBtnLabel');
    const themeSystemSubLabel = document.getElementById('themeSystemSubLabel');
    const themeOptions = document.querySelectorAll('.theme-option');

    const mediaQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    const getSystemTheme = () => (mediaQuery && mediaQuery.matches ? 'dark' : 'light');

    const applyTheme = (preference, showFeedback = false) => {
      const resolvedTheme = preference === 'system' ? getSystemTheme() : preference;
      document.documentElement.setAttribute('data-theme', resolvedTheme);
      document.documentElement.setAttribute('data-theme-preference', preference);

      // Update button icon & label
      if (preference === 'system') {
        if (themeBtnIcon) themeBtnIcon.textContent = '💻';
        if (themeBtnLabel) themeBtnLabel.textContent = 'Auto';
      } else if (preference === 'light') {
        if (themeBtnIcon) themeBtnIcon.textContent = '☀️';
        if (themeBtnLabel) themeBtnLabel.textContent = 'Claro';
      } else {
        if (themeBtnIcon) themeBtnIcon.textContent = '🌙';
        if (themeBtnLabel) themeBtnLabel.textContent = 'Oscuro';
      }

      // Update system subtitle
      if (themeSystemSubLabel) {
        const sysMode = getSystemTheme() === 'dark' ? 'Oscuro' : 'Claro';
        themeSystemSubLabel.textContent = `Automático (detectado: ${sysMode})`;
      }

      // Update active checks in dropdown
      themeOptions.forEach(opt => {
        const mode = opt.dataset.themeMode;
        if (mode === preference) {
          opt.classList.add('is-active');
        } else {
          opt.classList.remove('is-active');
        }
      });

      // Save preference to localStorage
      try {
        localStorage.setItem(THEME_STORAGE_KEY, preference);
      } catch (e) {}

      // Re-render canvas rulers with new theme colors
      if (this.canvasEngine && typeof this.canvasEngine.renderRulers === 'function') {
        this.canvasEngine.renderRulers();
      }

      if (showFeedback && this.docManager) {
        const labels = {
          light: '☀️ Modo Claro activado',
          dark: '🌙 Modo Oscuro activado',
          system: `💻 Modo Sistema activado (${getSystemTheme() === 'dark' ? 'Oscuro' : 'Claro'})`
        };
        this.docManager.showToast(labels[preference] || 'Tema actualizado', 'info');
      }
    };

    // Load initial preference
    let savedPref = 'system';
    try {
      savedPref = localStorage.getItem(THEME_STORAGE_KEY) || 'system';
    } catch (e) {
      savedPref = 'system';
    }
    applyTheme(savedPref, false);

    // Listen for OS system theme changes
    if (mediaQuery && typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', () => {
        const currentPref = document.documentElement.getAttribute('data-theme-preference') || 'system';
        if (currentPref === 'system') {
          applyTheme('system', false);
        }
      });
    }

    // Toggle dropdown
    themeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      document.getElementById('openMenuDropdown')?.classList.remove('is-open');
      themeDropdown?.classList.toggle('is-open');
    });

    // Option clicks
    themeOptions.forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        const mode = opt.dataset.themeMode;
        applyTheme(mode, true);
        themeDropdown?.classList.remove('is-open');
      });
    });
  }
}

// Start app on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
  window.labelLoveApp = new App();
});
