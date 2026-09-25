/**
 * LabelLove - Sheet & Matrix Print Engine (Impresión en Hoja / Papel Carta / A4)
 * Generates matrix grids of labels (e.g. 5x18 = 90 labels, Avery 5160, custom grids),
 * with real-time interactive preview, zoom, sequential data interpolation,
 * start cell offset (to reuse half-used sticker sheets), and direct integration
 * with system printers via browser print API.
 */

import { BarcodeEngine } from './barcode-engine.js';

export const PAPER_SIZES = {
  letter: {
    id: 'letter',
    name: 'Carta / US Letter (215.9 × 279.4 mm)',
    shortName: 'Carta (Letter)',
    widthMm: 215.9,
    heightMm: 279.4,
    cssSize: 'letter'
  },
  a4: {
    id: 'a4',
    name: 'A4 Internacional (210 × 297 mm)',
    shortName: 'A4',
    widthMm: 210.0,
    heightMm: 297.0,
    cssSize: 'a4'
  },
  legal: {
    id: 'legal',
    name: 'Oficio / US Legal (215.9 × 355.6 mm)',
    shortName: 'Oficio (Legal)',
    widthMm: 215.9,
    heightMm: 355.6,
    cssSize: 'legal'
  },
  custom: {
    id: 'custom',
    name: 'Personalizado...',
    shortName: 'Personalizado',
    widthMm: 215.9,
    heightMm: 279.4,
    cssSize: 'auto'
  }
};

export const MATRIX_PRESETS = [
  {
    id: 'matrix_5x18',
    name: '5 Columnas × 18 Filas (90 etiquetas) - Micro',
    cols: 5,
    rows: 18,
    marginTopMm: 8.0,
    marginBottomMm: 8.0,
    marginLeftMm: 6.0,
    marginRightMm: 6.0,
    gapXMm: 1.5,
    gapYMm: 1.0,
    badge: '90 / hoja'
  },
  {
    id: 'matrix_3x10',
    name: '3 Columnas × 10 Filas (Avery® 5160 - 30 etiquetas)',
    cols: 3,
    rows: 10,
    marginTopMm: 12.7,
    marginBottomMm: 12.7,
    marginLeftMm: 4.8,
    marginRightMm: 4.8,
    gapXMm: 3.2,
    gapYMm: 0.0,
    badge: 'Avery® 30'
  },
  {
    id: 'matrix_2x5',
    name: '2 Columnas × 5 Filas (Avery® 5163 - 10 etiquetas)',
    cols: 2,
    rows: 5,
    marginTopMm: 12.7,
    marginBottomMm: 12.7,
    marginLeftMm: 4.0,
    marginRightMm: 4.0,
    gapXMm: 3.6,
    gapYMm: 0.0,
    badge: 'Avery® 10'
  },
  {
    id: 'matrix_2x3',
    name: '2 Columnas × 3 Filas (Avery® 5164 - 6 etiquetas)',
    cols: 2,
    rows: 3,
    marginTopMm: 12.7,
    marginBottomMm: 12.7,
    marginLeftMm: 4.0,
    marginRightMm: 4.0,
    gapXMm: 3.6,
    gapYMm: 0.0,
    badge: 'Avery® 6'
  },
  {
    id: 'matrix_4x10',
    name: '4 Columnas × 10 Filas (40 etiquetas)',
    cols: 4,
    rows: 10,
    marginTopMm: 10.0,
    marginBottomMm: 10.0,
    marginLeftMm: 8.0,
    marginRightMm: 8.0,
    gapXMm: 2.0,
    gapYMm: 1.5,
    badge: '40 / hoja'
  },
  {
    id: 'matrix_4x15',
    name: '4 Columnas × 15 Filas (60 etiquetas)',
    cols: 4,
    rows: 15,
    marginTopMm: 8.0,
    marginBottomMm: 8.0,
    marginLeftMm: 6.0,
    marginRightMm: 6.0,
    gapXMm: 1.5,
    gapYMm: 1.0,
    badge: '60 / hoja'
  },
  {
    id: 'custom',
    name: 'Personalizada (Filas y Columnas libres)',
    cols: 5,
    rows: 18,
    marginTopMm: 8.0,
    marginBottomMm: 8.0,
    marginLeftMm: 6.0,
    marginRightMm: 6.0,
    gapXMm: 1.5,
    gapYMm: 1.0,
    badge: 'Manual'
  }
];

export class SheetPrintEngine {
  constructor(options = {}) {
    this.canvasEngine = options.canvasEngine;
    this.dataStore = options.dataStore;

    this.pxPerMm = 3.7795275591; // 96 DPI CSS mm to px
    this.currentPage = 1;
    this.previewZoom = 0.55; // Default fit zoom for preview
    this.zoomAutoFit = true;

    // Configuration defaults
    this.config = {
      paperSize: 'letter',
      customWidthMm: 215.9,
      customHeightMm: 279.4,
      orientation: 'portrait', // 'portrait' | 'landscape'
      presetId: 'matrix_5x18',
      cols: 5,
      rows: 18,
      marginTopMm: 8.0,
      marginBottomMm: 8.0,
      marginLeftMm: 6.0,
      marginRightMm: 6.0,
      gapXMm: 1.5,
      gapYMm: 1.0,
      fitMode: 'fit', // 'fit' (proporcional) | 'fill' (estirar) | 'original' (1:1)
      dataMode: 'single', // 'single' (repetir activo) | 'dataset' (secuencial de DataStore)
      copies: 90, // Cantidad en modo single
      startCellIndex: 0, // 0-based (etiqueta 1 = índice 0)
      showCutGuides: true,
      showLabelNumbers: false
    };

    if (typeof document !== 'undefined') {
      this.initDOMReferences();
      this.bindEvents();
    }
  }

  initDOMReferences() {
    this.modal = document.getElementById('sheetPrintModal');
    this.previewViewport = document.getElementById('sheetPreviewViewport');
    this.previewContainer = document.getElementById('sheetPreviewContainer');
    this.printArea = document.getElementById('sheetPrintArea');

    // Controls
    this.paperSelect = document.getElementById('sheetPaperSize');
    this.orientationSelect = document.getElementById('sheetOrientation');
    this.presetSelect = document.getElementById('sheetMatrixPreset');
    this.colsInput = document.getElementById('sheetCols');
    this.rowsInput = document.getElementById('sheetRows');
    this.marginTopInput = document.getElementById('sheetMarginTop');
    this.marginBottomInput = document.getElementById('sheetMarginBottom');
    this.marginLeftInput = document.getElementById('sheetMarginLeft');
    this.marginRightInput = document.getElementById('sheetMarginRight');
    this.gapXInput = document.getElementById('sheetGapX');
    this.gapYInput = document.getElementById('sheetGapY');
    this.fitModeSelect = document.getElementById('sheetFitMode');
    this.dataModeSelect = document.getElementById('sheetDataMode');
    this.copiesInput = document.getElementById('sheetCopies');
    this.startCellInput = document.getElementById('sheetStartCell');
    this.cutGuidesCheckbox = document.getElementById('sheetCutGuides');
    this.labelNumbersCheckbox = document.getElementById('sheetLabelNumbers');

    // Info Displays
    this.cellDimBadge = document.getElementById('sheetCellDimBadge');
    this.totalLabelsBadge = document.getElementById('sheetTotalLabelsBadge');
    this.pageIndicator = document.getElementById('sheetPageIndicator');
    this.summaryText = document.getElementById('sheetSummaryText');
    this.zoomLevelLabel = document.getElementById('sheetZoomLevel');

    // Zoom & Nav buttons
    this.btnPrevPage = document.getElementById('sheetBtnPrevPage');
    this.btnNextPage = document.getElementById('sheetBtnNextPage');
    this.btnZoomOut = document.getElementById('sheetBtnZoomOut');
    this.btnZoomIn = document.getElementById('sheetBtnZoomIn');
    this.btnZoomFit = document.getElementById('sheetBtnZoomFit');
    this.btnAutoCalcGrid = document.getElementById('sheetBtnAutoCalcGrid');
  }

  bindEvents() {
    // Modal close
    document.getElementById('closeSheetPrintModalBtn')?.addEventListener('click', () => this.close());
    document.getElementById('cancelSheetPrintBtn')?.addEventListener('click', () => this.close());

    // Paper size changed
    this.paperSelect?.addEventListener('change', (e) => {
      this.config.paperSize = e.target.value;
      const paper = PAPER_SIZES[this.config.paperSize] || PAPER_SIZES.letter;
      const customDimsRow = document.getElementById('sheetCustomDimsRow');
      if (customDimsRow) {
        customDimsRow.style.display = this.config.paperSize === 'custom' ? 'flex' : 'none';
      }
      this.refresh();
    });

    // Custom paper dims
    document.getElementById('sheetCustomWidth')?.addEventListener('input', (e) => {
      this.config.customWidthMm = parseFloat(e.target.value) || 215.9;
      this.refresh();
    });
    document.getElementById('sheetCustomHeight')?.addEventListener('input', (e) => {
      this.config.customHeightMm = parseFloat(e.target.value) || 279.4;
      this.refresh();
    });

    // Orientation
    this.orientationSelect?.addEventListener('change', (e) => {
      this.config.orientation = e.target.value;
      this.refresh();
    });

    // Presets
    this.presetSelect?.addEventListener('change', (e) => {
      const presetId = e.target.value;
      this.applyPreset(presetId);
    });

    // Grid inputs
    this.colsInput?.addEventListener('input', (e) => {
      this.config.cols = Math.max(1, parseInt(e.target.value, 10) || 1);
      this.config.presetId = 'custom';
      if (this.presetSelect) this.presetSelect.value = 'custom';
      this.updateCopiesToMatchGridIfSingle();
      this.refresh();
    });

    this.rowsInput?.addEventListener('input', (e) => {
      this.config.rows = Math.max(1, parseInt(e.target.value, 10) || 1);
      this.config.presetId = 'custom';
      if (this.presetSelect) this.presetSelect.value = 'custom';
      this.updateCopiesToMatchGridIfSingle();
      this.refresh();
    });

    // Margins and Gaps
    const marginInputs = [
      { el: this.marginTopInput, prop: 'marginTopMm' },
      { el: this.marginBottomInput, prop: 'marginBottomMm' },
      { el: this.marginLeftInput, prop: 'marginLeftMm' },
      { el: this.marginRightInput, prop: 'marginRightMm' },
      { el: this.gapXInput, prop: 'gapXMm' },
      { el: this.gapYInput, prop: 'gapYMm' }
    ];

    marginInputs.forEach(({ el, prop }) => {
      el?.addEventListener('input', (e) => {
        this.config[prop] = Math.max(0, parseFloat(e.target.value) || 0);
        this.config.presetId = 'custom';
        if (this.presetSelect) this.presetSelect.value = 'custom';
        this.refresh();
      });
    });

    // Fit mode
    this.fitModeSelect?.addEventListener('change', (e) => {
      this.config.fitMode = e.target.value;
      this.refresh();
    });

    // Data mode
    this.dataModeSelect?.addEventListener('change', (e) => {
      this.config.dataMode = e.target.value;
      const copiesRow = document.getElementById('sheetCopiesRow');
      const datasetInfo = document.getElementById('sheetDatasetInfo');
      if (copiesRow) copiesRow.style.display = this.config.dataMode === 'single' ? 'flex' : 'none';
      if (datasetInfo) datasetInfo.style.display = this.config.dataMode === 'dataset' ? 'block' : 'none';
      this.currentPage = 1;
      this.refresh();
    });

    // Copies in single mode
    this.copiesInput?.addEventListener('input', (e) => {
      this.config.copies = Math.max(1, parseInt(e.target.value, 10) || 1);
      this.refresh();
    });

    // Start Cell offset (1-based input, 0-based internally)
    this.startCellInput?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10) || 1;
      this.config.startCellIndex = Math.max(0, val - 1);
      this.refresh();
    });

    // Cut guides & label numbers
    this.cutGuidesCheckbox?.addEventListener('change', (e) => {
      this.config.showCutGuides = e.target.checked;
      this.refresh();
    });

    this.labelNumbersCheckbox?.addEventListener('change', (e) => {
      this.config.showLabelNumbers = e.target.checked;
      this.refresh();
    });

    // Auto calculate grid according to current canvas design
    this.btnAutoCalcGrid?.addEventListener('click', () => {
      this.autoCalculateGridFromDesign();
    });

    // Zoom controls
    this.btnZoomOut?.addEventListener('click', () => {
      this.zoomAutoFit = false;
      this.previewZoom = Math.max(0.2, this.previewZoom - 0.1);
      this.updateZoomDisplay();
      this.renderPreview();
    });

    this.btnZoomIn?.addEventListener('click', () => {
      this.zoomAutoFit = false;
      this.previewZoom = Math.min(2.0, this.previewZoom + 0.1);
      this.updateZoomDisplay();
      this.renderPreview();
    });

    this.btnZoomFit?.addEventListener('click', () => {
      this.zoomAutoFit = true;
      this.calcAutoFitZoom();
      this.updateZoomDisplay();
      this.renderPreview();
    });

    // Pagination
    this.btnPrevPage?.addEventListener('click', () => {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.renderPreview();
      }
    });

    this.btnNextPage?.addEventListener('click', () => {
      const layout = this.calculateLayout();
      if (this.currentPage < layout.totalPages) {
        this.currentPage++;
        this.renderPreview();
      }
    });

    // System Print Button
    document.getElementById('executeSheetPrintBtn')?.addEventListener('click', () => {
      this.executePrint();
    });
  }

  applyPreset(presetId) {
    const preset = MATRIX_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    this.config.presetId = preset.id;
    this.config.cols = preset.cols;
    this.config.rows = preset.rows;
    this.config.marginTopMm = preset.marginTopMm;
    this.config.marginBottomMm = preset.marginBottomMm;
    this.config.marginLeftMm = preset.marginLeftMm;
    this.config.marginRightMm = preset.marginRightMm;
    this.config.gapXMm = preset.gapXMm;
    this.config.gapYMm = preset.gapYMm;

    // Sync input values
    if (this.presetSelect) this.presetSelect.value = preset.id;
    if (this.colsInput) this.colsInput.value = preset.cols;
    if (this.rowsInput) this.rowsInput.value = preset.rows;
    if (this.marginTopInput) this.marginTopInput.value = preset.marginTopMm;
    if (this.marginBottomInput) this.marginBottomInput.value = preset.marginBottomMm;
    if (this.marginLeftInput) this.marginLeftInput.value = preset.marginLeftMm;
    if (this.marginRightInput) this.marginRightInput.value = preset.marginRightMm;
    if (this.gapXInput) this.gapXInput.value = preset.gapXMm;
    if (this.gapYInput) this.gapYInput.value = preset.gapYMm;

    this.updateCopiesToMatchGridIfSingle();
    this.refresh();
  }

  updateCopiesToMatchGridIfSingle() {
    if (this.config.dataMode === 'single') {
      const labelsPerSheet = this.config.cols * this.config.rows;
      // Default to 1 full sheet
      this.config.copies = labelsPerSheet;
      if (this.copiesInput) this.copiesInput.value = labelsPerSheet;
    }
  }

  autoCalculateGridFromDesign() {
    const tpl = this.canvasEngine.currentTemplate;
    if (!tpl) return;

    const paper = this.getPaperDimensions();
    const tplW = tpl.widthMm || 50;
    const tplH = tpl.heightMm || 30;

    // Fixed default margins and gaps
    const marginX = 8;
    const marginY = 8;
    const gapX = 2;
    const gapY = 2;

    const availW = paper.widthMm - (marginX * 2);
    const availH = paper.heightMm - (marginY * 2);

    const cols = Math.max(1, Math.floor((availW + gapX) / (tplW + gapX)));
    const rows = Math.max(1, Math.floor((availH + gapY) / (tplH + gapY)));

    this.config.presetId = 'custom';
    this.config.cols = cols;
    this.config.rows = rows;
    this.config.marginLeftMm = marginX;
    this.config.marginRightMm = marginX;
    this.config.marginTopMm = marginY;
    this.config.marginBottomMm = marginY;
    this.config.gapXMm = gapX;
    this.config.gapYMm = gapY;

    // Update UI
    if (this.presetSelect) this.presetSelect.value = 'custom';
    if (this.colsInput) this.colsInput.value = cols;
    if (this.rowsInput) this.rowsInput.value = rows;
    if (this.marginLeftInput) this.marginLeftInput.value = marginX;
    if (this.marginRightInput) this.marginRightInput.value = marginX;
    if (this.marginTopInput) this.marginTopInput.value = marginY;
    if (this.marginBottomInput) this.marginBottomInput.value = marginY;
    if (this.gapXInput) this.gapXInput.value = gapX;
    if (this.gapYInput) this.gapYInput.value = gapY;

    this.updateCopiesToMatchGridIfSingle();
    this.refresh();
  }

  getPaperDimensions() {
    let base = PAPER_SIZES[this.config.paperSize] || PAPER_SIZES.letter;
    let w = this.config.paperSize === 'custom' ? this.config.customWidthMm : base.widthMm;
    let h = this.config.paperSize === 'custom' ? this.config.customHeightMm : base.heightMm;

    if (this.config.orientation === 'landscape') {
      return {
        widthMm: Math.max(w, h),
        heightMm: Math.min(w, h),
        cssSize: base.cssSize
      };
    } else {
      return {
        widthMm: Math.min(w, h),
        heightMm: Math.max(w, h),
        cssSize: base.cssSize
      };
    }
  }

  calculateLayout() {
    const paper = this.getPaperDimensions();
    const cols = Math.max(1, this.config.cols);
    const rows = Math.max(1, this.config.rows);
    const labelsPerPage = cols * rows;

    const availW = paper.widthMm - this.config.marginLeftMm - this.config.marginRightMm - ((cols - 1) * this.config.gapXMm);
    const cellWidthMm = Math.max(1, availW / cols);

    const availH = paper.heightMm - this.config.marginTopMm - this.config.marginBottomMm - ((rows - 1) * this.config.gapYMm);
    const cellHeightMm = Math.max(1, availH / rows);

    let totalLabels = 0;
    if (this.config.dataMode === 'single') {
      totalLabels = Math.max(1, this.config.copies || 1);
    } else {
      totalLabels = Math.max(1, this.dataStore.records.length);
    }

    // Handle start cell offset on Page 1
    const startOffset = Math.min(this.config.startCellIndex, labelsPerPage - 1);
    const firstPageCapacity = Math.max(1, labelsPerPage - startOffset);

    let totalPages = 1;
    if (totalLabels > firstPageCapacity) {
      const remaining = totalLabels - firstPageCapacity;
      totalPages = 1 + Math.ceil(remaining / labelsPerPage);
    }

    // Clamp current page
    if (this.currentPage > totalPages) {
      this.currentPage = totalPages;
    }
    if (this.currentPage < 1) {
      this.currentPage = 1;
    }

    return {
      paper,
      cols,
      rows,
      labelsPerPage,
      cellWidthMm,
      cellHeightMm,
      totalLabels,
      totalPages,
      startOffset
    };
  }

  open() {
    if (!this.modal) return;

    // Reset pagination to first page
    this.currentPage = 1;

    // Update dataset record count badge if available
    const datasetCountEl = document.getElementById('sheetDatasetCountBadge');
    if (datasetCountEl && this.dataStore) {
      datasetCountEl.textContent = `${this.dataStore.records.length} registros`;
    }

    // Auto fit zoom based on current viewport
    this.zoomAutoFit = true;

    // Show modal
    this.modal.classList.add('is-open');

    // Force layout update and initial preview
    setTimeout(() => {
      this.calcAutoFitZoom();
      this.updateZoomDisplay();
      this.refresh();
    }, 50);
  }

  close() {
    if (this.modal) {
      this.modal.classList.remove('is-open');
    }
  }

  calcAutoFitZoom() {
    if (!this.previewViewport) return;
    const paper = this.getPaperDimensions();
    const vpW = this.previewViewport.clientWidth - 40;
    const vpH = this.previewViewport.clientHeight - 40;

    const paperPxW = paper.widthMm * this.pxPerMm;
    const paperPxH = paper.heightMm * this.pxPerMm;

    if (vpW > 100 && vpH > 100) {
      const scaleX = vpW / paperPxW;
      const scaleY = vpH / paperPxH;
      this.previewZoom = Math.max(0.2, Math.min(1.2, Math.min(scaleX, scaleY) * 0.95));
    } else {
      this.previewZoom = 0.55;
    }
  }

  updateZoomDisplay() {
    if (this.zoomLevelLabel) {
      this.zoomLevelLabel.textContent = `${Math.round(this.previewZoom * 100)}%`;
    }
  }

  refresh() {
    const layout = this.calculateLayout();

    // Update Badges & Info
    if (this.cellDimBadge) {
      this.cellDimBadge.textContent = `${layout.cellWidthMm.toFixed(1)} × ${layout.cellHeightMm.toFixed(1)} mm`;
    }

    if (this.totalLabelsBadge) {
      this.totalLabelsBadge.textContent = `${layout.labelsPerPage} etiquetas / hoja`;
    }

    if (this.pageIndicator) {
      this.pageIndicator.textContent = `Hoja ${this.currentPage} de ${layout.totalPages}`;
    }

    if (this.btnPrevPage) this.btnPrevPage.disabled = this.currentPage <= 1;
    if (this.btnNextPage) this.btnNextPage.disabled = this.currentPage >= layout.totalPages;

    if (this.summaryText) {
      const paperName = PAPER_SIZES[this.config.paperSize]?.shortName || 'Papel';
      this.summaryText.textContent = `${paperName} (${this.config.orientation === 'portrait' ? 'Vertical' : 'Horizontal'}) • ${layout.totalLabels} etiquetas en ${layout.totalPages} ${layout.totalPages === 1 ? 'hoja' : 'hojas'}`;
    }

    // Render Preview
    this.renderPreview(layout);
  }

  renderPreview(layout = null) {
    if (!layout) layout = this.calculateLayout();
    if (!this.previewContainer) return;

    this.previewContainer.innerHTML = '';

    // Create Sheet Page Node
    const pageNode = this.buildPageDOM(this.currentPage, layout, false);

    // Apply zoom transform to preview page
    const zoomWrapper = document.createElement('div');
    zoomWrapper.className = 'sheet-preview-zoom-wrapper';
    zoomWrapper.style.transform = `scale(${this.previewZoom})`;
    zoomWrapper.style.transformOrigin = 'top center';
    zoomWrapper.appendChild(pageNode);

    this.previewContainer.appendChild(zoomWrapper);
  }

  /**
   * Builds the DOM for a single sheet page (used for both Preview and Physical Printing)
   */
  buildPageDOM(pageNumber, layout, isPrintVersion = false) {
    const paper = layout.paper;
    const pageNode = document.createElement('div');
    pageNode.className = `sheet-print-page ${isPrintVersion ? 'for-print' : 'for-preview'}`;
    
    // Exact dimensions in mm
    pageNode.style.width = `${paper.widthMm}mm`;
    pageNode.style.height = `${paper.heightMm}mm`;
    pageNode.style.paddingTop = `${this.config.marginTopMm}mm`;
    pageNode.style.paddingBottom = `${this.config.marginBottomMm}mm`;
    pageNode.style.paddingLeft = `${this.config.marginLeftMm}mm`;
    pageNode.style.paddingRight = `${this.config.marginRightMm}mm`;

    // Grid Container
    const gridNode = document.createElement('div');
    gridNode.className = 'sheet-grid-container';
    gridNode.style.display = 'grid';
    gridNode.style.gridTemplateColumns = `repeat(${layout.cols}, ${layout.cellWidthMm}mm)`;
    gridNode.style.gridTemplateRows = `repeat(${layout.rows}, ${layout.cellHeightMm}mm)`;
    gridNode.style.columnGap = `${this.config.gapXMm}mm`;
    gridNode.style.rowGap = `${this.config.gapYMm}mm`;
    gridNode.style.width = '100%';
    gridNode.style.height = '100%';

    const labelsPerPage = layout.labelsPerPage;
    const startOffset = (pageNumber === 1) ? layout.startOffset : 0;

    // Calculate which record / label indices fall on this page
    let pageStartIndex = 0;
    if (pageNumber === 1) {
      pageStartIndex = 0;
    } else {
      const firstPageLabels = labelsPerPage - layout.startOffset;
      pageStartIndex = firstPageLabels + ((pageNumber - 2) * labelsPerPage);
    }

    const tpl = this.canvasEngine.currentTemplate || { widthMm: 50, heightMm: 30 };
    const elements = this.canvasEngine.elements || [];
    const activeRecord = this.dataStore.getActiveRecord();

    for (let cellIdx = 0; cellIdx < labelsPerPage; cellIdx++) {
      const cellNode = document.createElement('div');
      cellNode.className = 'sheet-label-cell';
      cellNode.style.width = `${layout.cellWidthMm}mm`;
      cellNode.style.height = `${layout.cellHeightMm}mm`;

      if (this.config.showCutGuides) {
        cellNode.classList.add('has-cut-guide');
      }

      // Check if cell is skipped / unused (before start offset on page 1)
      if (pageNumber === 1 && cellIdx < startOffset) {
        cellNode.classList.add('cell-skipped');
        if (!isPrintVersion) {
          const skipLabel = document.createElement('div');
          skipLabel.className = 'cell-skipped-badge';
          skipLabel.textContent = `Omitida (#${cellIdx + 1})`;
          cellNode.appendChild(skipLabel);
        }
        gridNode.appendChild(cellNode);
        continue;
      }

      // Calculate corresponding label index
      const labelIndexOnPage = cellIdx - startOffset;
      const globalLabelIndex = pageStartIndex + labelIndexOnPage;

      // Check if we exceeded total labels to print
      if (globalLabelIndex >= layout.totalLabels) {
        cellNode.classList.add('cell-empty');
        gridNode.appendChild(cellNode);
        continue;
      }

      // Determine record data for this label
      let record = activeRecord;
      if (this.config.dataMode === 'dataset') {
        record = this.dataStore.records[globalLabelIndex] || activeRecord;
      }

      // Optional cell sequence number badge (preview only)
      if (this.config.showLabelNumbers && !isPrintVersion) {
        const numBadge = document.createElement('span');
        numBadge.className = 'cell-num-badge';
        numBadge.textContent = `#${globalLabelIndex + 1}`;
        cellNode.appendChild(numBadge);
      }

      // Render the scaled label into the cell
      this.renderLabelInCell(cellNode, tpl, elements, record, layout.cellWidthMm, layout.cellHeightMm);
      gridNode.appendChild(cellNode);
    }

    pageNode.appendChild(gridNode);
    return pageNode;
  }

  /**
   * Renders a single label design inside a cell, properly scaled
   */
  renderLabelInCell(cellNode, tpl, elements, record, cellWidthMm, cellHeightMm) {
    const tplW = tpl.widthMm || 50;
    const tplH = tpl.heightMm || 30;

    // Determine scale factor
    let scaleX = 1.0;
    let scaleY = 1.0;

    if (this.config.fitMode === 'fit') {
      const factor = Math.min(cellWidthMm / tplW, cellHeightMm / tplH);
      scaleX = factor;
      scaleY = factor;
    } else if (this.config.fitMode === 'fill') {
      scaleX = cellWidthMm / tplW;
      scaleY = cellHeightMm / tplH;
    } else {
      // 'original' 1:1
      scaleX = 1.0;
      scaleY = 1.0;
    }

    // Outer flex wrapper to center scaled content in cell
    const wrapper = document.createElement('div');
    wrapper.className = 'sheet-label-wrapper';
    wrapper.style.width = '100%';
    wrapper.style.height = '100%';
    wrapper.style.display = 'flex';
    wrapper.style.alignItems = 'center';
    wrapper.style.justifyContent = 'center';
    wrapper.style.overflow = 'hidden';

    // The virtual stage with native design pixel dimensions
    const stage = document.createElement('div');
    stage.className = 'sheet-label-stage';
    stage.style.width = `${tplW * this.pxPerMm}px`;
    stage.style.height = `${tplH * this.pxPerMm}px`;
    stage.style.position = 'relative';
    stage.style.transform = `scale(${scaleX}, ${scaleY})`;
    stage.style.transformOrigin = 'center center';
    stage.style.flexShrink = '0';
    stage.style.backgroundColor = '#ffffff';

    // Render each element onto this stage
    elements.forEach(el => {
      const elNode = document.createElement('div');
      elNode.className = 'canvas-el print-el';
      
      const xPx = el.xMm * this.pxPerMm;
      const yPx = el.yMm * this.pxPerMm;
      const wPx = el.widthMm * this.pxPerMm;
      const hPx = el.heightMm * this.pxPerMm;

      elNode.style.position = 'absolute';
      elNode.style.left = `${xPx}px`;
      elNode.style.top = `${yPx}px`;
      elNode.style.width = `${wPx}px`;
      elNode.style.height = `${hPx}px`;

      if (el.type === 'text') {
        elNode.classList.add('el-text');
        elNode.style.fontSize = `${el.fontSize || 14}px`;
        elNode.style.fontWeight = el.fontWeight || 'normal';
        elNode.style.fontFamily = el.fontFamily || 'Inter, sans-serif';
        elNode.style.textAlign = el.textAlign || 'left';
        elNode.style.color = '#000000';
        if (el.fontStyle) elNode.style.fontStyle = el.fontStyle;

        const mask = el.mask === 'custom' ? el.customMask : el.mask;
        const interpolated = this.dataStore.interpolate(el.text, record, mask);
        elNode.textContent = interpolated;
      }
      else if (el.type === 'barcode' || el.type === 'qr') {
        elNode.classList.add(el.type === 'qr' ? 'el-qr' : 'el-barcode');
        const mask = el.mask === 'custom' ? el.customMask : el.mask;
        const resolvedVal = this.dataStore.interpolate(el.value, record, mask);
        const format = el.format || (el.type === 'qr' ? 'qrcode' : 'code128');

        BarcodeEngine.renderCode(elNode, resolvedVal, format, {
          width: wPx,
          height: hPx,
          displayValue: el.displayValue !== false,
          zoom: 1.0
        });
      }
      else if (el.type === 'shape') {
        elNode.classList.add('el-shape', `shape-${el.shapeType || 'rect'}`);
        elNode.style.borderColor = '#000000';
      }
      else if (el.type === 'image') {
        elNode.classList.add('el-image');
        let rawSrc = el.src || '';
        if (rawSrc && rawSrc.includes('{{')) {
          rawSrc = this.dataStore.interpolate(rawSrc, record);
        }
        if (rawSrc) {
          const img = document.createElement('img');
          img.src = rawSrc;
          img.alt = el.imageName || 'Imagen';
          img.style.width = '100%';
          img.style.height = '100%';
          img.style.objectFit = el.fit || 'contain';
          img.style.opacity = el.opacity !== undefined ? el.opacity : 1;
          img.style.display = 'block';

          if (el.monochrome) {
            const thresh = el.threshold !== undefined ? el.threshold : 128;
            const contrastVal = Math.max(100, (thresh / 128) * 1000);
            const invertStr = el.invert ? 'invert(100%) ' : '';
            img.style.filter = `${invertStr}grayscale(100%) contrast(${contrastVal}%)`;
          } else if (el.invert) {
            img.style.filter = 'invert(100%)';
          }

          elNode.appendChild(img);
        }
      }

      stage.appendChild(elNode);
    });

    wrapper.appendChild(stage);
    cellNode.appendChild(wrapper);
  }

  /**
   * Prepares and triggers system print dialog
   */
  executePrint() {
    const layout = this.calculateLayout();
    if (!this.printArea) return;

    // Clear previous print area
    this.printArea.innerHTML = '';

    // Mark body for sheet printing
    document.body.classList.add('is-printing-sheet');

    // Build all pages into #sheetPrintArea
    for (let p = 1; p <= layout.totalPages; p++) {
      const pageNode = this.buildPageDOM(p, layout, true);
      this.printArea.appendChild(pageNode);
    }

    // Dynamic @page size style tag
    let printStyleTag = document.getElementById('sheetDynamicPrintStyle');
    if (!printStyleTag) {
      printStyleTag = document.createElement('style');
      printStyleTag.id = 'sheetDynamicPrintStyle';
      document.head.appendChild(printStyleTag);
    }

    const cssSize = layout.paper.cssSize === 'auto'
      ? `${layout.paper.widthMm}mm ${layout.paper.heightMm}mm`
      : `${layout.paper.cssSize} ${this.config.orientation}`;

    printStyleTag.textContent = `
      @page {
        size: ${cssSize};
        margin: 0mm !important;
      }
    `;

    // Small delay to allow BarcodeEngine canvases to paint completely
    setTimeout(() => {
      window.print();

      // Clean up body class after print dialog is closed
      const cleanUp = () => {
        document.body.classList.remove('is-printing-sheet');
        if (this.printArea) this.printArea.innerHTML = '';
        window.removeEventListener('afterprint', cleanUp);
      };

      window.addEventListener('afterprint', cleanUp);
      // Fallback cleanup if afterprint doesn't fire
      setTimeout(cleanUp, 3000);
    }, 250);
  }
}
