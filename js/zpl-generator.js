/**
 * LabelLove - Native Zebra ZPL II Code Generator
 * Converts interactive canvas elements into high-performance ZPL commands
 */

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
        // Interpolate record variables if present
        const resolvedText = rawText.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, field) => dataRecord[field] || '');
        const fontHeight = Math.round(el.fontSize * (dpi / 72)); // points to dots
        const fontWidth = Math.round(fontHeight * 0.85);

        // Field Orientation & Origin
        commands.push(`^FO${x},${y}`);
        commands.push(`^A0N,${fontHeight},${fontWidth}`);
        commands.push(`^FD${this.escapeZPL(resolvedText)}^FS`);
      } 
      else if (el.type === 'barcode') {
        const rawVal = el.value || '123456';
        const resolvedVal = rawVal.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, field) => dataRecord[field] || '');
        const barcodeHeight = h;
        const moduleWidth = Math.max(2, Math.round(w / 100)); // Estimated module dots

        commands.push(`^FO${x},${y}`);
        commands.push(`^BY${moduleWidth},3,${barcodeHeight}`);
        commands.push(`^BCN,${barcodeHeight},${el.displayValue !== false ? 'Y' : 'N'},N,N`);
        commands.push(`^FD${this.escapeZPL(resolvedVal)}^FS`);
      } 
      else if (el.type === 'qr') {
        const rawVal = el.value || 'https://labellove.test';
        const resolvedVal = rawVal.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, field) => dataRecord[field] || '');
        const magnification = Math.max(3, Math.min(10, Math.round(w / 30)));

        commands.push(`^FO${x},${y}`);
        commands.push(`^BQN,2,${magnification},M,7`);
        commands.push(`^FDQA,${this.escapeZPL(resolvedVal)}^FS`);
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
