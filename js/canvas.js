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

    this.world = document.getElementById('canvasWorld');
    this.resizerSE = document.getElementById('stageResizerSE');
    this.resizerE = document.getElementById('stageResizerE');
    this.resizerS = document.getElementById('stageResizerS');
    this.resizerTooltip = document.getElementById('stageResizerTooltip');

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

    // Pan state (Inkscape style middle-click or space-drag)
    this.isPanning = false;
    this.panStart = { x: 0, y: 0, scrollLeft: 0, scrollTop: 0 };
    this.isSpacePressed = false;

    // Stage Resize state (Canvas size direct adjustment)
    this.isResizingStage = false;
    this.stageResizeHandle = null;
    this.stageResizeStart = { x: 0, y: 0, wMm: 0, hMm: 0 };

    this.onSelectionChange = options.onSelectionChange || (() => {});
    this.onElementUpdate = options.onElementUpdate || (() => {});
    this.onCanvasResize = options.onCanvasResize || (() => {});

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

    // Center in viewport and render rulers
    setTimeout(() => {
      this.centerCanvas();
      this.renderRulers();
    }, 40);
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

  centerCanvas() {
    if (!this.viewport || !this.stage) return;
    const stageRect = this.stage.getBoundingClientRect();
    const vpRect = this.viewport.getBoundingClientRect();

    const stageCenterX = stageRect.left + stageRect.width / 2;
    const stageCenterY = stageRect.top + stageRect.height / 2;
    const vpCenterX = vpRect.left + vpRect.width / 2;
    const vpCenterY = vpRect.top + vpRect.height / 2;

    this.viewport.scrollLeft += (stageCenterX - vpCenterX);
    this.viewport.scrollTop += (stageCenterY - vpCenterY);
    this.renderRulers();
  }

  fitToScreen() {
    if (!this.currentTemplate || !this.viewport) return;
    const availW = Math.max(180, this.viewport.clientWidth - 120);
    const availH = Math.max(180, this.viewport.clientHeight - 120);

    const naturalW = this.currentTemplate.widthMm * this.pxPerMm;
    const naturalH = this.currentTemplate.heightMm * this.pxPerMm;

    const zoomFactor = Math.min(availW / naturalW, availH / naturalH);
    const targetZoom = Math.max(0.2, Math.min(4.0, zoomFactor * 0.95));

    this.setZoom(targetZoom);
    setTimeout(() => this.centerCanvas(), 25);
  }

  setZoom(zoomFactor) {
    this.zoom = Math.max(0.2, Math.min(5.0, zoomFactor));
    this.updateStageSize();
    this.renderElements();
    this.renderRulers();
    this.updateTransformer();
    this.updateHUD();

    const label = document.getElementById('zoomLevelLabel');
    if (label) label.textContent = `${Math.round(this.zoom * 100)}%`;
  }

  /**
   * Inkscape-Style Zoom: Anchored directly at pointer coordinates (clientX, clientY)
   */
  zoomAtPoint(newZoomFactor, clientX, clientY) {
    if (!this.viewport || !this.stage) return;
    const targetZoom = Math.max(0.2, Math.min(5.0, newZoomFactor));
    if (Math.abs(targetZoom - this.zoom) < 0.001) return;

    const vpRect = this.viewport.getBoundingClientRect();
    const stageRect = this.stage.getBoundingClientRect();

    // If clientX/clientY not provided, use viewport center
    const pointerX = clientX !== undefined ? clientX : (vpRect.left + vpRect.width / 2);
    const pointerY = clientY !== undefined ? clientY : (vpRect.top + vpRect.height / 2);

    // Pointer offset in mm from stage top-left before zoom
    const offsetMmX = (pointerX - stageRect.left) / (this.pxPerMm * this.zoom);
    const offsetMmY = (pointerY - stageRect.top) / (this.pxPerMm * this.zoom);

    // Pointer position inside viewport box
    const pointerVpX = pointerX - vpRect.left;
    const pointerVpY = pointerY - vpRect.top;

    this.zoom = targetZoom;
    this.updateStageSize();
    this.renderElements();
    this.updateTransformer();
    this.updateHUD();

    const label = document.getElementById('zoomLevelLabel');
    if (label) label.textContent = `${Math.round(this.zoom * 100)}%`;

    // Recalculate scroll so pointer remains on exact same mm position
    const stageWorldLeft = this.stage.offsetLeft;
    const stageWorldTop = this.stage.offsetTop;

    const pointWorldX = stageWorldLeft + (offsetMmX * this.pxPerMm * this.zoom);
    const pointWorldY = stageWorldTop + (offsetMmY * this.pxPerMm * this.zoom);

    this.viewport.scrollLeft = pointWorldX - pointerVpX;
    this.viewport.scrollTop = pointWorldY - pointerVpY;

    this.renderRulers();
  }

  /**
   * Adjust Canvas Size (Ancho / Alto mm)
   */
  setCanvasSize(widthMm, heightMm, options = {}) {
    if (!this.currentTemplate) return;
    const clampedW = Math.max(15, Math.min(600, Math.round(widthMm * 10) / 10));
    const clampedH = Math.max(15, Math.min(600, Math.round(heightMm * 10) / 10));

    this.currentTemplate.widthMm = clampedW;
    this.currentTemplate.heightMm = clampedH;

    this.updateStageSize();
    this.renderRulers();
    this.updateTransformer();
    this.updateHUD();

    if (!options.silent) {
      this.onCanvasResize({
        widthMm: clampedW,
        heightMm: clampedH
      });
    }
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

        const mask = el.mask === 'custom' ? el.customMask : el.mask;
        const interpolated = this.dataStore.interpolate(el.text, activeRecord, mask);
        elNode.textContent = interpolated;

        if (el.text && el.text.includes('{{')) {
          elNode.classList.add('is-variable');
        }
      } 
      else if (el.type === 'barcode' || el.type === 'qr') {
        elNode.classList.add(el.type === 'qr' ? 'el-qr' : 'el-barcode');
        const mask = el.mask === 'custom' ? el.customMask : el.mask;
        const resolvedVal = this.dataStore.interpolate(el.value, activeRecord, mask);
        const format = el.format || (el.type === 'qr' ? 'qrcode' : 'code128');
        BarcodeEngine.renderCode(elNode, resolvedVal, format, {
          width: wPx,
          height: hPx,
          displayValue: el.displayValue !== false,
          zoom: this.zoom
        });
      } 
      else if (el.type === 'shape') {
        elNode.classList.add('el-shape', `shape-${el.shapeType || 'rect'}`);
      }
      else if (el.type === 'image') {
        elNode.classList.add('el-image');
        let rawSrc = el.src || '';
        if (rawSrc && rawSrc.includes('{{')) {
          rawSrc = this.dataStore.interpolate(rawSrc, activeRecord);
        }

        if (!rawSrc) {
          elNode.innerHTML = `
            <div class="image-empty-placeholder" style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 1.5px dashed var(--border-subtle); border-radius: 4px; background: rgba(0, 0, 0, 0.03); color: var(--text-faint); font-size: ${Math.max(9, 11 * this.zoom)}px; text-align: center; padding: 4px; box-sizing: border-box; pointer-events: none;">
              <span style="font-size: ${Math.max(14, 18 * this.zoom)}px;">🖼️</span>
              <span>Sin imagen</span>
            </div>
          `;
        } else {
          const img = document.createElement('img');
          img.src = rawSrc;
          img.alt = el.imageName || 'Imagen';
          img.style.width = '100%';
          img.style.height = '100%';
          img.style.objectFit = el.fit || 'contain';
          img.style.opacity = el.opacity !== undefined ? el.opacity : 1;
          img.style.display = 'block';
          img.style.pointerEvents = 'none';
          img.draggable = false;

          if (el.monochrome) {
            const thresh = el.threshold !== undefined ? el.threshold : 128;
            const contrastVal = Math.max(100, (thresh / 128) * 1000);
            const invertStr = el.invert ? 'invert(100%) ' : '';
            img.style.filter = `${invertStr}grayscale(100%) contrast(${contrastVal}%)`;
          } else if (el.invert) {
            img.style.filter = 'invert(100%)';
          }

          elNode.innerHTML = '';
          elNode.appendChild(img);
        }

        elNode.addEventListener('dblclick', (e) => {
          e.stopPropagation();
          document.getElementById('imageFileInput')?.click();
        });
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
    } else if (el.type === 'barcode' || el.type === 'qr') {
      if (textGroup) textGroup.style.display = 'none';
      if (barcodeGroup) barcodeGroup.style.display = 'flex';
      const normFormat = BarcodeEngine.normalizeFormat(el.format || (el.type === 'qr' ? 'qrcode' : 'code128'));
      if (formatSelect) formatSelect.value = normFormat;
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
   * Draw high precision millimeter rulers on the top and left canvas,
   * accurately synchronized with the stage origin (0 mm = stage top-left)
   */
  renderRulers() {
    const canvasH = document.getElementById('rulerCanvasH');
    const canvasV = document.getElementById('rulerCanvasV');
    if (!canvasH || !canvasV || !this.stage || !this.viewport) return;

    const ctxH = canvasH.getContext('2d');
    const ctxV = canvasV.getContext('2d');

    const vpRect = this.viewport.getBoundingClientRect();
    const stageRect = this.stage.getBoundingClientRect();

    // Stage origin relative to rulers
    const originX = stageRect.left - vpRect.left;
    const originY = stageRect.top - vpRect.top;

    const hWidth = canvasH.parentElement.clientWidth;
    const vHeight = canvasV.parentElement.clientHeight;

    canvasH.width = hWidth;
    canvasH.height = 24;
    canvasV.width = 24;
    canvasV.height = vHeight;

    ctxH.clearRect(0, 0, canvasH.width, canvasH.height);
    ctxV.clearRect(0, 0, canvasV.width, canvasV.height);

    const mmInPx = this.pxPerMm * this.zoom;
    if (mmInPx <= 0) return;

    const isLight = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light';
    const highlightColor = isLight ? '#0284c7' : '#38bdf8';
    const mainColor = isLight ? '#475569' : '#94a3b8';
    const minorColor = isLight ? '#94a3b8' : '#64748b';
    const subMinorColor = isLight ? '#cbd5e1' : '#475569';
    const boundaryFill = isLight ? 'rgba(79, 70, 229, 0.10)' : 'rgba(99, 102, 241, 0.12)';

    // Highlight document boundary background on rulers
    if (this.currentTemplate) {
      const stageW = this.currentTemplate.widthMm * mmInPx;
      const stageH = this.currentTemplate.heightMm * mmInPx;

      ctxH.fillStyle = boundaryFill;
      ctxH.fillRect(originX, 0, stageW, 24);

      ctxV.fillStyle = boundaryFill;
      ctxV.fillRect(0, originY, 24, stageH);
    }

    // Determine interval for numbers (5, 10, 20, 50 mm)
    let majorInterval = 10;
    if (mmInPx < 1.5) majorInterval = 50;
    else if (mmInPx < 2.8) majorInterval = 20;
    else if (mmInPx > 8.0) majorInterval = 5;

    const minorInterval = majorInterval / 2;

    // Horizontal Ruler
    const minMmH = Math.floor(-originX / mmInPx);
    const maxMmH = Math.ceil((hWidth - originX) / mmInPx);
    const startMmH = Math.floor(minMmH / majorInterval) * majorInterval;

    ctxH.font = '9px JetBrains Mono, monospace';
    for (let mm = startMmH; mm <= maxMmH; mm += 1) {
      const x = Math.round(originX + mm * mmInPx);
      if (x < 0 || x > hWidth) continue;

      if (mm % majorInterval === 0) {
        ctxH.fillStyle = (mm === 0 || (this.currentTemplate && mm === this.currentTemplate.widthMm)) ? highlightColor : mainColor;
        ctxH.fillRect(x, 10, 1, 14);
        ctxH.fillText(`${mm}`, x + 3, 18);
      } else if (mm % minorInterval === 0) {
        ctxH.fillStyle = minorColor;
        ctxH.fillRect(x, 15, 1, 9);
      } else if (mmInPx >= 3.0) {
        ctxH.fillStyle = subMinorColor;
        ctxH.fillRect(x, 19, 1, 5);
      }
    }

    // Vertical Ruler
    const minMmV = Math.floor(-originY / mmInPx);
    const maxMmV = Math.ceil((vHeight - originY) / mmInPx);
    const startMmV = Math.floor(minMmV / majorInterval) * majorInterval;

    ctxV.font = '9px JetBrains Mono, monospace';
    for (let mm = startMmV; mm <= maxMmV; mm += 1) {
      const y = Math.round(originY + mm * mmInPx);
      if (y < 0 || y > vHeight) continue;

      if (mm % majorInterval === 0) {
        ctxV.fillStyle = (mm === 0 || (this.currentTemplate && mm === this.currentTemplate.heightMm)) ? highlightColor : mainColor;
        ctxV.fillRect(10, y, 14, 1);
        ctxV.save();
        ctxV.translate(2, y + 9);
        ctxV.fillText(`${mm}`, 0, 0);
        ctxV.restore();
      } else if (mm % minorInterval === 0) {
        ctxV.fillStyle = minorColor;
        ctxV.fillRect(15, y, 9, 1);
      } else if (mmInPx >= 3.0) {
        ctxV.fillStyle = subMinorColor;
        ctxV.fillRect(19, y, 5, 1);
      }
    }
  }

  setSpacePan(isPressed) {
    this.isSpacePressed = isPressed;
    if (this.viewport) {
      this.viewport.classList.toggle('panning', isPressed && !this.isPanning);
    }
  }

  onPanMouseDown(e) {
    // Middle button (1) or Space + Left click (0)
    if (e.button === 1 || (e.button === 0 && this.isSpacePressed)) {
      e.preventDefault();
      e.stopPropagation();
      this.isPanning = true;
      this.panStart = {
        x: e.clientX,
        y: e.clientY,
        scrollLeft: this.viewport.scrollLeft,
        scrollTop: this.viewport.scrollTop
      };
      this.viewport.classList.add('is-panning');

      window.addEventListener('mousemove', this.onPanMouseMove);
      window.addEventListener('mouseup', this.onPanMouseUp);
    }
  }

  onPanMouseMove = (e) => {
    if (!this.isPanning) return;
    const dx = e.clientX - this.panStart.x;
    const dy = e.clientY - this.panStart.y;
    this.viewport.scrollLeft = this.panStart.scrollLeft - dx;
    this.viewport.scrollTop = this.panStart.scrollTop - dy;
    this.renderRulers();
  };

  onPanMouseUp = () => {
    this.isPanning = false;
    this.viewport.classList.remove('is-panning');
    this.viewport.classList.toggle('panning', this.isSpacePressed);
    window.removeEventListener('mousemove', this.onPanMouseMove);
    window.removeEventListener('mouseup', this.onPanMouseUp);
  };

  onStageResizeMouseDown(e, handle) {
    if (e.button !== 0 || !this.currentTemplate) return;
    e.stopPropagation();
    e.preventDefault();

    this.isResizingStage = true;
    this.stageResizeHandle = handle;
    this.stageResizeStart = {
      x: e.clientX,
      y: e.clientY,
      wMm: this.currentTemplate.widthMm,
      hMm: this.currentTemplate.heightMm
    };

    if (this.resizerTooltip) {
      this.resizerTooltip.classList.add('is-visible');
      this.resizerTooltip.textContent = `📐 ${this.currentTemplate.widthMm.toFixed(1)} × ${this.currentTemplate.heightMm.toFixed(1)} mm`;
    }

    window.addEventListener('mousemove', this.onStageResizeMouseMove);
    window.addEventListener('mouseup', this.onStageResizeMouseUp);
  }

  onStageResizeMouseMove = (e) => {
    if (!this.isResizingStage) return;
    const dxPx = e.clientX - this.stageResizeStart.x;
    const dyPx = e.clientY - this.stageResizeStart.y;
    const dxMm = dxPx / (this.pxPerMm * this.zoom);
    const dyMm = dyPx / (this.pxPerMm * this.zoom);

    let newW = this.stageResizeStart.wMm;
    let newH = this.stageResizeStart.hMm;

    if (this.stageResizeHandle.includes('e')) {
      newW += dxMm;
    }
    if (this.stageResizeHandle.includes('s')) {
      newH += dyMm;
    }

    const snap = e.shiftKey ? 0.5 : 1.0;
    newW = Math.max(20, Math.round(newW / snap) * snap);
    newH = Math.max(20, Math.round(newH / snap) * snap);

    this.setCanvasSize(newW, newH);

    if (this.resizerTooltip) {
      this.resizerTooltip.textContent = `📐 ${newW.toFixed(1)} × ${newH.toFixed(1)} mm`;
    }
  };

  onStageResizeMouseUp = () => {
    this.isResizingStage = false;
    this.stageResizeHandle = null;
    if (this.resizerTooltip) {
      this.resizerTooltip.classList.remove('is-visible');
    }
    window.removeEventListener('mousemove', this.onStageResizeMouseMove);
    window.removeEventListener('mouseup', this.onStageResizeMouseUp);
    this.renderElements();
  };

  initEvents() {
    // Canvas background click to deselect
    if (this.viewport) {
      this.viewport.addEventListener('mousedown', (e) => {
        // If it's a pan trigger, let pan handle it
        if (e.button === 1 || (e.button === 0 && this.isSpacePressed)) {
          this.onPanMouseDown(e);
          return;
        }

        if (e.target === this.viewport || e.target === this.world || e.target === this.stage || e.target === this.elementsLayer) {
          this.selectElement(null);
        }
      });

      // Synchronize rulers with scrolling
      this.viewport.addEventListener('scroll', () => {
        this.renderRulers();
      });

      // Inkscape-style Cmd / Ctrl + Wheel Zoom & Shift + Wheel Pan
      this.viewport.addEventListener('wheel', (e) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          const delta = e.deltaY;
          const factor = delta < 0 ? 1.15 : (1 / 1.15);
          this.zoomAtPoint(this.zoom * factor, e.clientX, e.clientY);
        }
      }, { passive: false });

      // Mouse tracking for ruler indicators
      this.viewport.addEventListener('mousemove', (e) => {
        const rect = this.viewport.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        if (this.rulerGuideX) this.rulerGuideX.style.left = `${mouseX}px`;
        if (this.rulerGuideY) this.rulerGuideY.style.top = `${mouseY}px`;
      });
    }

    // Connect Stage Resizers
    this.resizerSE?.addEventListener('mousedown', (e) => this.onStageResizeMouseDown(e, 'se'));
    this.resizerE?.addEventListener('mousedown', (e) => this.onStageResizeMouseDown(e, 'e'));
    this.resizerS?.addEventListener('mousedown', (e) => this.onStageResizeMouseDown(e, 's'));

    // Connect transformer element handles
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
