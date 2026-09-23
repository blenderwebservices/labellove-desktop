/**
 * LabelLove - Data Store & Reactive Variable Engine
 */

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
   * Replaces variables {{ field }} or {{ field | modifier }} with active record values
   */
  interpolate(templateStr, record = null) {
    if (!templateStr || typeof templateStr !== 'string') return '';
    const data = record || this.getActiveRecord();

    return templateStr.replace(/\{\{\s*([a-zA-Z0-9_]+)(\s*\|\s*([a-zA-Z0-9_]+))?\s*\}\}/g, (match, field, _, modifier) => {
      let val = data[field];
      if (val === undefined || val === null) {
        return match; // Keep unchanged if field doesn't exist
      }
      val = String(val);
      if (modifier === 'uppercase') return val.toUpperCase();
      if (modifier === 'lowercase') return val.toLowerCase();
      if (modifier === 'trim') return val.trim();
      return val;
    });
  }

  /**
   * Check if any records in the table produce text overflow
   */
  getOverflowWarnings(elements) {
    const warnings = [];
    const activeRec = this.getActiveRecord();

    elements.filter(el => el.type === 'text' && (el.field || el.text.includes('{{'))).forEach(el => {
      const interpolated = this.interpolate(el.text, activeRec);
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
}
