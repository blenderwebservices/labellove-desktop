/**
 * LabelLove - Data Store & Reactive Variable Engine
 */

import { FormatEngine } from './format-engine.js';

export class DataStore {
  constructor() {
    this.columns = ['orden_id', 'nombre_cliente', 'direccion', 'ciudad', 'codigo_postal', 'sku', 'precio', 'tracking_code', 'status'];
    this.records = [
      {
        orden_id: '10842',
        nombre_cliente: 'Mariana Torres Valenzuela',
        direccion: 'Av. Paseo de la Reforma 222, Piso 8, Int. 802',
        ciudad: 'Ciudad de México, CDMX',
        codigo_postal: '06600',
        sku: 'AUR-WL-PRO-BLK',
        precio: '1899.00',
        tracking_code: 'MX-982441-TR',
        status: 'Listo'
      },
      {
        orden_id: '10843',
        nombre_cliente: 'Carlos Mendoza Garza',
        direccion: 'Calle Roble 45, Col. Valle Oriente',
        ciudad: 'San Pedro Garza García, N.L.',
        codigo_postal: '66269',
        sku: 'MOU-ERG-RGB-WHT',
        precio: '749.50',
        tracking_code: 'MX-982442-TR',
        status: 'Listo'
      },
      {
        orden_id: '10844',
        nombre_cliente: 'Dr. Alejandro Fernández de la Cueva y Montes Claros',
        direccion: 'Boulevard Adolfo López Mateos 1420 Depto 402 Edificio Torre Magna',
        ciudad: 'Guadalajara, Jalisco',
        codigo_postal: '44680',
        sku: 'TEC-MEC-K80-SLV',
        precio: '2350.00',
        tracking_code: 'MX-982443-TR',
        status: 'Texto largo ⚠️'
      },
      {
        orden_id: '10845',
        nombre_cliente: 'Sofía Alarcón Benítez',
        direccion: 'Calle 60 No. 341 x 41 y 43, Centro',
        ciudad: 'Mérida, Yucatán',
        codigo_postal: '97000',
        sku: 'HUB-USB-C-7P',
        precio: '599.00',
        tracking_code: 'MX-982444-TR',
        status: 'Listo'
      },
      {
        orden_id: '10846',
        nombre_cliente: 'Rodrigo Gómez Palacio',
        direccion: 'Av. Zaragoza 512, Zona Centro',
        ciudad: 'Querétaro, Qro.',
        codigo_postal: '76000',
        sku: 'CAM-4K-STREAM',
        precio: '1420.00',
        tracking_code: 'MX-982445-TR',
        status: 'Listo'
      }
    ];

    this.activeRecordIndex = 0;
    this.workbook = null;
    this.currentFileName = 'Ordenes_Envio_Septiembre.csv';
    this.currentSheetName = 'General';
    this.listeners = [];
  }

  onChange(callback) {
    this.listeners.push(callback);
  }

  notify() {
    this.listeners.forEach(cb => cb(this));
  }

  getActiveRecord() {
    if (this.records.length === 0) return {};
    return this.records[this.activeRecordIndex] || this.records[0];
  }

  setActiveRecord(index) {
    if (index >= 0 && index < this.records.length) {
      this.activeRecordIndex = index;
      this.notify();
    }
  }

  nextRecord() {
    if (this.activeRecordIndex < this.records.length - 1) {
      this.setActiveRecord(this.activeRecordIndex + 1);
    }
  }

  prevRecord() {
    if (this.activeRecordIndex > 0) {
      this.setActiveRecord(this.activeRecordIndex - 1);
    }
  }

  addRecord(record) {
    this.records.push(record);
    this.notify();
  }

  updateCell(rowIndex, colName, value) {
    if (this.records[rowIndex]) {
      this.records[rowIndex][colName] = value;
      this.notify();
    }
  }


  /**
   * Replaces variables {{ field }} or {{ field | modifier }} with active record values.
   * Supports number masks and filters: {{ field | currency }}, {{ field | percent }}, {{ field | mask:"pattern" }},
   * and element-level defaultMask formatting.
   */
  interpolate(templateStr, record = null, defaultMask = null) {
    if (!templateStr || typeof templateStr !== 'string') return '';
    const data = record || this.getActiveRecord() || {};

    // 1. Direct numeric string with mask applied (e.g. "12345" -> "$12,345.00" or "0.16" -> "16% IVA")
    if (!templateStr.includes('{{') && defaultMask && FormatEngine.isNumeric(templateStr)) {
      return FormatEngine.applyMask(templateStr, defaultMask);
    }

    // 2. Variable replacement: {{ field }} or {{ field | modifier }}
    return templateStr.replace(/\{\{\s*([a-zA-Z0-9_]+)(?:\s*\|\s*([^}]+))?\s*\}\}/g, (match, field, rawModifier) => {
      let val = data[field];
      if (val === undefined || val === null) {
        return match; // Keep unchanged if field doesn't exist
      }
      val = String(val);

      if (rawModifier) {
        const mod = rawModifier.trim();
        if (mod === 'uppercase') return val.toUpperCase();
        if (mod === 'lowercase') return val.toLowerCase();
        if (mod === 'trim') return val.trim();
        if (mod === 'currency') return FormatEngine.applyMask(val, '$#,##0.00');
        if (mod === 'percent') return FormatEngine.applyMask(val, '0%');
        if (mod.startsWith('mask:')) {
          const custom = mod.slice(5).trim().replace(/^['"]|['"]$/g, '');
          return FormatEngine.applyMask(val, custom);
        }
        // Direct preset mask passed as modifier e.g. {{ precio | $#,##0.00 }}
        if (FormatEngine.isNumeric(val)) {
          return FormatEngine.applyMask(val, mod);
        }
      }

      // If no explicit modifier in variable, check defaultMask
      if (defaultMask && FormatEngine.isNumeric(val)) {
        return FormatEngine.applyMask(val, defaultMask);
      }

      return val;
    });
  }

  /**
   * Check if any records in the table produce text overflow
   */
  getOverflowWarnings(elements) {
    const warnings = [];
    const activeRec = this.getActiveRecord();

    elements.filter(el => el.type === 'text' && (el.field || el.text.includes('{{') || el.mask)).forEach(el => {
      const mask = el.mask === 'custom' ? el.customMask : el.mask;
      const interpolated = this.interpolate(el.text, activeRec, mask);
      // Heuristic: estimate character count vs width in mm
      // Roughly 1 character at 12pt is ~2.2mm wide
      const charWidthEst = (el.fontSize || 12) * 0.18;
      const maxCharsPerLine = Math.floor(el.widthMm / charWidthEst);
      const lines = interpolated.split('\n');
      const estimatedLines = lines.reduce((acc, line) => acc + Math.ceil(line.length / Math.max(1, maxCharsPerLine)), 0);
      const estimatedHeightNeeded = estimatedLines * ((el.fontSize || 12) * 0.45);

      if (estimatedHeightNeeded > el.heightMm * 1.05) {
        warnings.push({
          elementId: el.id,
          text: interpolated,
          currentSize: el.fontSize,
          suggestedSize: Math.max(7, Math.floor(el.fontSize * (el.heightMm / estimatedHeightNeeded)))
        });
      }
    });

    return warnings;
  }

  /**
   * Loads a parsed Excel / CSV workbook with multi-sheet support
   */
  loadWorkbook(workbookData, targetSheet = null) {
    this.workbook = workbookData;
    this.currentFileName = workbookData.fileName || 'datos.xlsx';
    const sheetName = targetSheet || (workbookData.sheetNames && workbookData.sheetNames[0]) || 'Hoja1';
    return this.loadSheet(sheetName);
  }

  /**
   * Switches the active sheet in the data store
   */
  loadSheet(sheetName) {
    if (!this.workbook || !this.workbook.sheets || !this.workbook.sheets[sheetName]) {
      console.warn(`La hoja "${sheetName}" no existe en el libro cargado.`);
      return false;
    }

    const sheet = this.workbook.sheets[sheetName];
    this.currentSheetName = sheetName;
    this.columns = Array.isArray(sheet.columns) ? [...sheet.columns] : [];
    this.records = Array.isArray(sheet.records) ? JSON.parse(JSON.stringify(sheet.records)) : [];
    this.activeRecordIndex = 0;
    this.notify();
    return true;
  }

  /**
   * Checks if current workbook has multiple sheets
   */
  hasMultiSheets() {
    return Boolean(this.workbook && Array.isArray(this.workbook.sheetNames) && this.workbook.sheetNames.length > 1);
  }
}
