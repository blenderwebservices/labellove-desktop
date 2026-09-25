/**
 * LabelLove - Native Zebra ZPL II Code Generator
 * Converts interactive canvas elements into high-performance ZPL commands
 * with support for 39+ barcode and 2D matrix symbologies.
 */

import { BarcodeEngine } from './barcode-engine.js';
import { FormatEngine } from './format-engine.js';

export class ZPLGenerator {
  /**
   * Convert mm to printer dots
   */
  static mmToDots(mm, dpi = 203) {
    return Math.round((mm / 25.4) * dpi);
  }

  /**
   * Generate complete ZPL II string
   */
  static generate(labelConfig, elements, dataRecord = {}) {
    const dpi = labelConfig.dpi || 203;
    const widthDots = this.mmToDots(labelConfig.widthMm, dpi);
    const heightDots = this.mmToDots(labelConfig.heightMm, dpi);

    const commands = [];

    // Header & Setup
    commands.push('^XA');
    commands.push(`^PW${widthDots}`); // Print Width
    commands.push(`^LL${heightDots}`); // Label Length
    commands.push('^LH0,0'); // Home Position
    commands.push('^CI28'); // UTF-8 Encoding support in Zebra printers

    // Iterate through elements
    for (const el of elements) {
      const x = this.mmToDots(el.xMm, dpi);
      const y = this.mmToDots(el.yMm, dpi);
      const w = this.mmToDots(el.widthMm, dpi);
      const h = this.mmToDots(el.heightMm, dpi);

      if (el.type === 'text') {
        const rawText = el.text || '';
        const mask = el.mask === 'custom' ? el.customMask : el.mask;
        
        // Interpolate record variables with modifier and mask support
        let resolvedText = rawText.replace(/\{\{\s*([a-zA-Z0-9_]+)(?:\s*\|\s*([^}]+))?\s*\}\}/g, (_, field, rawMod) => {
          let val = dataRecord[field] !== undefined ? String(dataRecord[field]) : '';
          if (rawMod) {
            const mod = rawMod.trim();
            if (mod === 'uppercase') return val.toUpperCase();
            if (mod === 'lowercase') return val.toLowerCase();
            if (mod === 'trim') return val.trim();
            if (mod === 'currency') return FormatEngine.applyMask(val, '$#,##0.00');
            if (mod === 'percent') return FormatEngine.applyMask(val, '0%');
            if (mod.startsWith('mask:')) return FormatEngine.applyMask(val, mod.slice(5).trim().replace(/^['"]|['"]$/g, ''));
            if (FormatEngine.isNumeric(val)) return FormatEngine.applyMask(val, mod);
          }
          if (mask && FormatEngine.isNumeric(val)) {
            return FormatEngine.applyMask(val, mask);
          }
          return val;
        });

        // Direct numeric literal with mask
        if (!rawText.includes('{{') && mask && FormatEngine.isNumeric(rawText)) {
          resolvedText = FormatEngine.applyMask(rawText, mask);
        }

        const fontHeight = Math.round(el.fontSize * (dpi / 72)); // points to dots
        const fontWidth = Math.round(fontHeight * 0.85);

        // Field Orientation & Origin
        commands.push(`^FO${x},${y}`);
        commands.push(`^A0N,${fontHeight},${fontWidth}`);
        commands.push(`^FD${this.escapeZPL(resolvedText)}^FS`);
      } 
      else if (el.type === 'barcode' || el.type === 'qr') {
        const rawVal = el.value || '123456';
        const mask = el.mask === 'custom' ? el.customMask : el.mask;
        let resolvedVal = rawVal.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, field) => dataRecord[field] !== undefined ? String(dataRecord[field]) : '');
        if (mask && FormatEngine.isNumeric(resolvedVal)) {
          resolvedVal = FormatEngine.applyMask(resolvedVal, mask);
        }
        const formatKey = BarcodeEngine.normalizeFormat(el.format || (el.type === 'qr' ? 'qrcode' : 'code128'));
        const sym = BarcodeEngine.getSymbology(formatKey);
        const displayVal = el.displayValue !== false ? 'Y' : 'N';
        const barcodeHeight = h;
        const moduleWidth = Math.max(2, Math.round(w / 100));

        commands.push(`^FO${x},${y}`);

        // QR Code Family
        if (sym.category === 'qr') {
          const magnification = Math.max(3, Math.min(10, Math.round(w / 30)));
          commands.push(`^BQN,2,${magnification},M,7`);
          commands.push(`^FDQA,${this.escapeZPL(resolvedVal)}^FS`);
        }
        // Data Matrix Family
        else if (formatKey.includes('datamatrix')) {
          const modSize = Math.max(4, Math.round(w / 35));
          commands.push(`^BXN,${modSize},200`);
          commands.push(`^FD${this.escapeZPL(resolvedVal)}^FS`);
        }
        // PDF417 Family
        else if (formatKey.includes('pdf417')) {
          commands.push(`^B7N,${Math.round(barcodeHeight / 5)},1,2,6,N`);
          commands.push(`^FD${this.escapeZPL(resolvedVal)}^FS`);
        }
        // Code 39
        else if (formatKey.startsWith('code39') || formatKey.startsWith('hibccode39')) {
          commands.push(`^BY${moduleWidth},3,${barcodeHeight}`);
          commands.push(`^B3N,N,${barcodeHeight},${displayVal},N`);
          commands.push(`^FD${this.escapeZPL(resolvedVal)}^FS`);
        }
        // Code 93
        else if (formatKey === 'code93') {
          commands.push(`^BY${moduleWidth},3,${barcodeHeight}`);
          commands.push(`^BAN,${barcodeHeight},${displayVal},N,N`);
          commands.push(`^FD${this.escapeZPL(resolvedVal)}^FS`);
        }
        // Code 11
        else if (formatKey === 'code11') {
          commands.push(`^BY${moduleWidth},3,${barcodeHeight}`);
          commands.push(`^B1N,N,${barcodeHeight},${displayVal},N`);
          commands.push(`^FD${this.escapeZPL(resolvedVal)}^FS`);
        }
        // EAN-13 & ISBN
        else if (formatKey === 'ean13' || formatKey === 'isbn') {
          commands.push(`^BY${moduleWidth},3,${barcodeHeight}`);
          commands.push(`^BEN,${barcodeHeight},${displayVal},N`);
          commands.push(`^FD${this.escapeZPL(resolvedVal)}^FS`);
        }
        // EAN-8
        else if (formatKey === 'ean8') {
          commands.push(`^BY${moduleWidth},3,${barcodeHeight}`);
          commands.push(`^B8N,${barcodeHeight},${displayVal},N`);
          commands.push(`^FD${this.escapeZPL(resolvedVal)}^FS`);
        }
        // UPC-A
        else if (formatKey === 'upca') {
          commands.push(`^BY${moduleWidth},3,${barcodeHeight}`);
          commands.push(`^BUN,${barcodeHeight},${displayVal},N,Y`);
          commands.push(`^FD${this.escapeZPL(resolvedVal)}^FS`);
        }
        // UPC-E
        else if (formatKey === 'upce') {
          commands.push(`^BY${moduleWidth},3,${barcodeHeight}`);
          commands.push(`^B9N,${barcodeHeight},${displayVal},N,Y`);
          commands.push(`^FD${this.escapeZPL(resolvedVal)}^FS`);
        }
        // Interleaved 2 of 5 & ITF-14
        else if (formatKey === 'interleaved2of5' || formatKey === 'itf14') {
          commands.push(`^BY${moduleWidth},3,${barcodeHeight}`);
          commands.push(`^BIN,${barcodeHeight},${displayVal},N,N`);
          commands.push(`^FD${this.escapeZPL(resolvedVal)}^FS`);
        }
        // Codabar
        else if (formatKey === 'codabar') {
          commands.push(`^BY${moduleWidth},3,${barcodeHeight}`);
          commands.push(`^BKN,N,${barcodeHeight},${displayVal},N`);
          commands.push(`^FD${this.escapeZPL(resolvedVal)}^FS`);
        }
        // MSI
        else if (formatKey === 'msi') {
          commands.push(`^BY${moduleWidth},3,${barcodeHeight}`);
          commands.push(`^BMN,N,${barcodeHeight},${displayVal},N`);
          commands.push(`^FD${this.escapeZPL(resolvedVal)}^FS`);
        }
        // USPS POSTNET
        else if (formatKey === 'postnet') {
          commands.push(`^BZN,${barcodeHeight},${displayVal},N`);
          commands.push(`^FD${this.escapeZPL(resolvedVal)}^FS`);
        }
        // Default Code 128 / GS1-128 / SSCC-18
        else {
          commands.push(`^BY${moduleWidth},3,${barcodeHeight}`);
          commands.push(`^BCN,${barcodeHeight},${displayVal},N,N`);
          commands.push(`^FD${this.escapeZPL(resolvedVal)}^FS`);
        }
      } 
      else if (el.type === 'shape') {
        const borderThickness = el.shapeType === 'line' ? Math.max(2, h) : 2;
        commands.push(`^FO${x},${y}`);
        commands.push(`^GB${w},${h},${borderThickness}^FS`);
      }
    }

    // End of Label
    commands.push('^PQ1,0,1,Y'); // Print Quantity: 1
    commands.push('^XZ');

    return commands.join('\n');
  }

  static escapeZPL(text) {
    if (!text) return '';
    return String(text).replace(/[\^~]/g, ''); // strip ZPL control characters
  }
}
