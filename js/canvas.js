/**
 * LabelLove - Interactive Canvas Engine & Manipulator
 */

import { BarcodeEngine } from './barcode-engine.js';

export class CanvasEngine {
  constructor(options = {}) {
    this.viewport = document.getElementById('canvasViewport');
    this.stage = document.getElementById('labelStage');
    this.elementsLayer = document.getElementById('labelElementsLayer');
    this.transformer = document.getElementById('transformerBox');
    this.dimensionPill = document.getElementById('dimensionPill');
    this.floatingHud = document.getElementById('floatingHud');
    this.rulerGuideX = document.getElementById('rulerGuideX');
    this.rulerGuideY = document.getElementById('rulerGuideY');
    this.guideX = document.getElementById('magneticGuideX');
    this.guideY = document.getElementById('magneticGuideY');

    this.dataStore = options.dataStore;
    this.currentTemplate = null;
    this.elements = [];
    this.selectedElementId = null;

    // Viewport & Scale
    this.zoom = 1.0; // 100%
    this.pxPerMm = 3.7795275591; // standard 96 DPI CSS mm to px
    this.viewMode = 'roll'; // 'roll' or 'sheet'
    this.startCellIndex = 0; // For sheet printing

    // Drag / Resize / Interaction state
    this.isDragging = false;
    this.isResizing = false;
    this.activeHandle = null;
    this.dragStart = { x: 0, y: 0 };
    this.elementStart = { xMm: 0, yMm: 0, wMm: 0, hMm: 0 };

    this.onSelectionChange = options.onSelectionChange || (() => {});
    this.onElementUpdate = options.onElementUpdate || (() => {});

    this.initEvents();
  }

  loadTemplate(template) {
    this.currentTemplate = JSON.parse(JSON.stringify(template));
    this.elements = this.currentTemplate.elements || [];
    this.viewMode = template.type || 'roll';
    this.selectedElementId = null;
    this.hideTransformer();
    this.hideHUD();

    this.updateStageSize();
    this.renderElements();
    this.renderRulers();
  }

  updateStageSize() {
    if (!this.currentTemplate) return;
    const wPx = this.currentTemplate.widthMm * this.pxPerMm * this.zoom;
    const hPx = this.currentTemplate.heightMm * this.pxPerMm * this.zoom;

    this.stage.style.width = `${wPx}px`;
    this.stage.style.height = `${hPx}px`;

    // Substrate class
    this.stage.className = `label-stage substrate-${this.currentTemplate.substrate || 'thermal'}`;
  }

  setZoom(zoomFactor) {
    this.zoom = Math.max(0.3, Math.min(3.0, zoomFactor));
    this.updateStageSize();
    this.renderElements();
    this.renderRulers();
    this.updateTransformer();
    this.updateHUD();

    const label = document.getElementById('zoomLevelLabel');
    if (label) label.textContent = `${Math.round(this.zoom * 100)}%`;
  }

  setSubstrate(substrateType) {
    if (this.currentTemplate) {
      this.currentTemplate.substrate = substrateType;
      this.updateStageSize();
    }
  }

  /**
   * Render all label elements inside stage
   */
  renderElements() {
    this.elementsLayer.innerHTML = '';
    const activeRecord = this.dataStore.getActiveRecord();

    this.elements.forEach(el => {
      const elNode = document.createElement('div');
      elNode.id = el.id;
      elNode.className = `canvas-el ${el.id === this.selectedElementId ? 'is-selected' : ''}`;
      
      const xPx = el.xMm * this.pxPerMm * this.zoom;
      const yPx = el.yMm * this.pxPerMm * this.zoom;
      const wPx = el.widthMm * this.pxPerMm * this.zoom;
      const hPx = el.heightMm * this.pxPerMm * this.zoom;

      elNode.style.left = `${xPx}px`;
      elNode.style.top = `${yPx}px`;
      elNode.style.width = `${wPx}px`;
      elNode.style.height = `${hPx}px`;

      // Render content based on element type
      if (el.type === 'text') {
        elNode.classList.add('el-text');
        elNode.style.fontSize = `${el.fontSize * this.zoom}px`;
        elNode.style.fontWeight = el.fontWeight || 'normal';
        elNode.style.fontFamily = el.fontFamily || 'Inter, sans-serif';
        elNode.style.textAlign = el.textAlign || 'left';
        if (el.fontStyle) elNode.style.fontStyle = el.fontStyle;

        const interpolated = this.dataStore.interpolate(el.text, activeRecord);
        elNode.textContent = interpolated;

        if (el.text && el.text.includes('{{')) {
          elNode.classList.add('is-variable');
        }
      } 
      else if (el.type === 'barcode') {
        elNode.classList.add('el-barcode');
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        elNode.appendChild(svg);
        const resolvedVal = this.dataStore.interpolate(el.value, activeRecord);
        BarcodeEngine.renderBarcode(svg, resolvedVal, el.format || 'CODE128', {
          width: 1.5 * this.zoom,
          height: hPx * 0.7,
          displayValue: el.displayValue !== false
        });
      } 
      else if (el.type === 'qr') {
        elNode.classList.add('el-qr');
        const resolvedVal = this.dataStore.interpolate(el.value, activeRecord);
        BarcodeEngine.renderQRCode(elNode, resolvedVal, { width: wPx });
      } 
      else if (el.type === 'shape') {
        elNode.classList.add('el-shape', `shape-${el.shapeType || 'rect'}`);
      }

      // Pointer event for selecting
      elNode.addEventListener('mousedown', (e) => this.onElementMouseDown(e, el));
      this.elementsLayer.appendChild(elNode);
    });

    if (this.selectedElementId) {
      this.updateTransformer();
      this.updateHUD();
    }
  }

  selectElement(elementId) {
    this.selectedElementId = elementId;
    const el = this.elements.find(e => e.id === elementId);

    // Update selection styling in DOM
    document.querySelectorAll('.canvas-el').forEach(node => {
      node.classList.toggle('is-selected', node.id === elementId);
    });

    if (el) {
      this.updateTransformer();
      this.updateHUD();
      this.onSelectionChange(el);
    } else {
      this.hideTransformer();
      this.hideHUD();
      this.onSelectionChange(null);
    }
  }

  updateTransformer() {
    if (!this.selectedElementId || !this.transformer) return;
    const el = this.elements.find(e => e.id === this.selectedElementId);
    if (!el) {
      this.hideTransformer();
      return;
    }

    const xPx = el.xMm * this.pxPerMm * this.zoom;
    const yPx = el.yMm * this.pxPerMm * this.zoom;
    const wPx = el.widthMm * this.pxPerMm * this.zoom;
    const hPx = el.heightMm * this.pxPerMm * this.zoom;

    this.transformer.style.display = 'block';
    this.transformer.style.left = `${xPx}px`;
    this.transformer.style.top = `${yPx}px`;
    this.transformer.style.width = `${wPx}px`;
    this.transformer.style.height = `${hPx}px`;

    if (this.dimensionPill) {
      this.dimensionPill.textContent = `${el.widthMm.toFixed(1)} × ${el.heightMm.toFixed(1)} mm`;
    }
  }

  hideTransformer() {
    if (this.transformer) this.transformer.style.display = 'none';
  }

  updateHUD() {
    if (!this.selectedElementId || !this.floatingHud) return;
    const el = this.elements.find(e => e.id === this.selectedElementId);
    if (!el) {
      this.hideHUD();
      return;
    }

    const xPx = el.xMm * this.pxPerMm * this.zoom;
    const yPx = el.yMm * this.pxPerMm * this.zoom;

    this.floatingHud.style.display = 'flex';
    this.floatingHud.style.left = `${xPx}px`;
    this.floatingHud.style.top = `${yPx}px`;

    // Populate HUD controls based on type
    const fontSelect = document.getElementById('hudFontFamily');
    const sizeInput = document.getElementById('hudFontSize');
    const boldBtn = document.getElementById('hudBoldBtn');
    const formatSelect = document.getElementById('hudBarcodeFormat');
    const textGroup = document.getElementById('hudTextControls');
    const barcodeGroup = document.getElementById('hudBarcodeControls');

    if (el.type === 'text') {
      if (textGroup) textGroup.style.display = 'flex';
      if (barcodeGroup) barcodeGroup.style.display = 'none';
      if (fontSelect) fontSelect.value = el.fontFamily || 'Inter';
      if (sizeInput) sizeInput.value = el.fontSize || 12;
      if (boldBtn) boldBtn.classList.toggle('active', el.fontWeight === 'bold');
    } else if (el.type === 'barcode') {
      if (textGroup) textGroup.style.display = 'none';
      if (barcodeGroup) barcodeGroup.style.display = 'flex';
      if (formatSelect) formatSelect.value = el.format || 'CODE128';
    } else {
      if (textGroup) textGroup.style.display = 'none';
      if (barcodeGroup) barcodeGroup.style.display = 'none';
    }
  }

  hideHUD() {
    if (this.floatingHud) this.floatingHud.style.display = 'none';
  }

  /**
   * Element Drag & Drop and Resizing
   */
  onElementMouseDown(e, el) {
    if (e.button !== 0) return;
    e.stopPropagation();

    this.selectElement(el.id);
    this.isDragging = true;
    this.dragStart = { x: e.clientX, y: e.clientY };
    this.elementStart = { xMm: el.xMm, yMm: el.yMm, wMm: el.widthMm, hMm: el.heightMm };

    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
  }

  onHandleMouseDown(e, handleName) {
    if (e.button !== 0) return;
    e.stopPropagation();

    const el = this.elements.find(item => item.id === this.selectedElementId);
    if (!el) return;

    this.isResizing = true;
    this.activeHandle = handleName;
    this.dragStart = { x: e.clientX, y: e.clientY };
    this.elementStart = { xMm: el.xMm, yMm: el.yMm, wMm: el.widthMm, hMm: el.heightMm };

    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
  }

  onMouseMove = (e) => {
    const el = this.elements.find(item => item.id === this.selectedElementId);
    if (!el) return;

    const dxPx = e.clientX - this.dragStart.x;
    const dyPx = e.clientY - this.dragStart.y;
    const dxMm = dxPx / (this.pxPerMm * this.zoom);
    const dyMm = dyPx / (this.pxPerMm * this.zoom);

    if (this.isDragging) {
      let targetX = Math.round((this.elementStart.xMm + dxMm) * 2) / 2; // 0.5mm grid snap
      let targetY = Math.round((this.elementStart.yMm + dyMm) * 2) / 2;

      // Smart snapping to center of label
      const labelCenterX = this.currentTemplate.widthMm / 2;
      const elCenterX = targetX + (el.widthMm / 2);
      if (Math.abs(elCenterX - labelCenterX) < 1.0) {
        targetX = labelCenterX - (el.widthMm / 2);
        this.showMagneticGuideX(labelCenterX * this.pxPerMm * this.zoom);
      } else {
        this.hideMagneticGuides();
      }

      el.xMm = Math.max(0, Math.min(this.currentTemplate.widthMm - el.widthMm, targetX));
      el.yMm = Math.max(0, Math.min(this.currentTemplate.heightMm - el.heightMm, targetY));

      this.updateTransformer();
      this.updateHUD();
      this.updateElementDOMPosition(el);
      this.onElementUpdate(el);
    } 
    else if (this.isResizing) {
      const handle = this.activeHandle;
      let newW = this.elementStart.wMm;
      let newH = this.elementStart.hMm;
      let newX = this.elementStart.xMm;
      let newY = this.elementStart.yMm;

      if (handle.includes('e')) newW = Math.max(6, this.elementStart.wMm + dxMm);
      if (handle.includes('s')) newH = Math.max(4, this.elementStart.hMm + dyMm);
      if (handle.includes('w')) {
        const potentialW = this.elementStart.wMm - dxMm;
        if (potentialW >= 6) {
          newW = potentialW;
          newX = this.elementStart.xMm + dxMm;
        }
      }
      if (handle.includes('n')) {
        const potentialH = this.elementStart.hMm - dyMm;
        if (potentialH >= 4) {
          newH = potentialH;
          newY = this.elementStart.yMm + dyMm;
        }
      }

      el.xMm = Math.round(newX * 2) / 2;
      el.yMm = Math.round(newY * 2) / 2;
      el.widthMm = Math.round(newW * 2) / 2;
      el.heightMm = Math.round(newH * 2) / 2;

      this.updateTransformer();
      this.updateHUD();
      this.updateElementDOMPosition(el);
      this.onElementUpdate(el);
    }
  };

  onMouseUp = () => {
    this.isDragging = false;
    this.isResizing = false;
    this.activeHandle = null;
    this.hideMagneticGuides();

    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);

    // Re-render completely in case barcode / QR needs dimension update
    this.renderElements();
  };

  updateElementDOMPosition(el) {
    const node = document.getElementById(el.id);
    if (!node) return;
    const xPx = el.xMm * this.pxPerMm * this.zoom;
    const yPx = el.yMm * this.pxPerMm * this.zoom;
    const wPx = el.widthMm * this.pxPerMm * this.zoom;
    const hPx = el.heightMm * this.pxPerMm * this.zoom;

    node.style.left = `${xPx}px`;
    node.style.top = `${yPx}px`;
    node.style.width = `${wPx}px`;
    node.style.height = `${hPx}px`;
  }

  showMagneticGuideX(xPx) {
    if (this.guideX) {
      this.guideX.style.display = 'block';
      this.guideX.style.left = `${xPx}px`;
    }
  }

  hideMagneticGuides() {
    if (this.guideX) this.guideX.style.display = 'none';
    if (this.guideY) this.guideY.style.display = 'none';
  }

  addElement(elementSpec) {
    const newId = `el-${Date.now()}`;
    const newEl = {
      id: newId,
      xMm: 10,
      yMm: 10,
      widthMm: 40,
      heightMm: 15,
      ...elementSpec
    };
    this.elements.push(newEl);
    this.renderElements();
    this.selectElement(newId);
  }

  deleteSelectedElement() {
    if (!this.selectedElementId) return;
    this.elements = this.elements.filter(e => e.id !== this.selectedElementId);
    this.selectElement(null);
    this.renderElements();
  }

  /**
   * Draw high precision millimeter rulers on the top and left canvas
   */
  renderRulers() {
    const canvasH = document.getElementById('rulerCanvasH');
    const canvasV = document.getElementById('rulerCanvasV');
    if (!canvasH || !canvasV) return;

    const ctxH = canvasH.getContext('2d');
    const ctxV = canvasV.getContext('2d');

    // Size canvas accurately for device pixel ratio
    canvasH.width = canvasH.parentElement.clientWidth;
    canvasH.height = 24;
    canvasV.width = 24;
    canvasV.height = canvasV.parentElement.clientHeight;

    ctxH.clearRect(0, 0, canvasH.width, canvasH.height);
    ctxV.clearRect(0, 0, canvasV.width, canvasV.height);

    ctxH.fillStyle = '#64748b';
    ctxH.font = '9px JetBrains Mono, monospace';
    ctxV.fillStyle = '#64748b';
    ctxV.font = '9px JetBrains Mono, monospace';

    const mmInPx = this.pxPerMm * this.zoom;

    // Horizontal Ruler
    for (let mm = 0; mm < 400; mm += 1) {
      const x = mm * mmInPx;
      if (x > canvasH.width) break;

      if (mm % 10 === 0) {
        ctxH.fillRect(x, 10, 1, 14);
        ctxH.fillText(`${mm}`, x + 3, 18);
      } else if (mm % 5 === 0) {
        ctxH.fillRect(x, 15, 1, 9);
      } else {
        ctxH.fillRect(x, 19, 1, 5);
      }
    }

    // Vertical Ruler
    for (let mm = 0; mm < 400; mm += 1) {
      const y = mm * mmInPx;
      if (y > canvasV.height) break;

      if (mm % 10 === 0) {
        ctxV.fillRect(10, y, 14, 1);
        ctxV.save();
        ctxV.translate(2, y + 10);
        ctxV.fillText(`${mm}`, 0, 0);
        ctxV.restore();
      } else if (mm % 5 === 0) {
        ctxV.fillRect(15, y, 9, 1);
      } else {
        ctxV.fillRect(19, y, 5, 1);
      }
    }
  }

  initEvents() {
    // Canvas background click to deselect
    if (this.viewport) {
      this.viewport.addEventListener('mousedown', (e) => {
        if (e.target === this.viewport || e.target === this.stage || e.target === this.elementsLayer) {
          this.selectElement(null);
        }
      });

      // Mouse tracking for ruler indicators
      this.viewport.addEventListener('mousemove', (e) => {
        const rect = this.viewport.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        if (this.rulerGuideX) this.rulerGuideX.style.left = `${mouseX}px`;
        if (this.rulerGuideY) this.rulerGuideY.style.top = `${mouseY}px`;
      });
    }

    // Connect handles
    const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
    handles.forEach(h => {
      const handleEl = document.getElementById(`handle-${h}`);
      if (handleEl) {
        handleEl.addEventListener('mousedown', (e) => this.onHandleMouseDown(e, h));
      }
    });

    window.addEventListener('resize', () => this.renderRulers());
  }
}
