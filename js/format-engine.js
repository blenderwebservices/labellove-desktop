/**
 * LabelLove - Numeric Formatting & Masking Engine
 * Provides intelligent numeric detection and formatting masks:
 * - Currency: $#,##0.00, $#,##0, MXN, USD, EUR
 * - Percentage & Tax: 0% IVA, 0.0% IVA, 0%, 0.00% (smart x100 scaling for fractions)
 * - Thousands & Decimals: #,##0, #,##0.00
 * - Zero Padding: 00000, 000000, 00000000 (ideal for SKUs, lots, serials)
 * - Units & Custom Patterns: #,##0 pzas, #,##0 kg, PREFIX-00000
 */

export const PRESET_MASKS = [
  {
    category: 'Moneda / Divisa',
    presets: [
      { id: '$#,##0.00', label: '$12,345.00 (Moneda con 2 decimales)', example: '$12,345.00' },
      { id: '$#,##0', label: '$12,345 (Moneda sin decimales)', example: '$12,345' },
      { id: '$#,##0.00 MXN', label: '$12,345.00 MXN', example: '$12,345.00 MXN' },
      { id: 'USD $#,##0.00', label: 'USD $12,345.00', example: 'USD $12,345.00' },
      { id: '€#,##0.00', label: '€12,345.00 (Euro)', example: '€12,345.00' }
    ]
  },
  {
    category: 'Porcentajes e Impuestos',
    presets: [
      { id: '0% IVA', label: '16% IVA (0.16 -> 16% IVA)', example: '16% IVA' },
      { id: '0.0% IVA', label: '16.0% IVA (con 1 decimal)', example: '16.0% IVA' },
      { id: '0.00% IVA', label: '16.00% IVA (con 2 decimales)', example: '16.00% IVA' },
      { id: '0%', label: '16% (Porcentaje entero)', example: '16%' },
      { id: '0.00%', label: '16.00% (Porcentaje con decimales)', example: '16.00%' },
      { id: '#% Descuento', label: '16% Descuento', example: '16% Descuento' }
    ]
  },
  {
    category: 'Números y Millares',
    presets: [
      { id: '#,##0', label: '12,345 (Separador de miles)', example: '12,345' },
      { id: '#,##0.00', label: '12,345.00 (Miles y 2 decimales)', example: '12,345.00' },
      { id: '#,##0.0', label: '12,345.0 (Miles y 1 decimal)', example: '12,345.0' },
      { id: '0.00', label: '12345.00 (2 decimales fijos)', example: '12345.00' },
      { id: '0.000', label: '12345.000 (3 decimales fijos)', example: '12345.000' }
    ]
  },
  {
    category: 'Relleno de Ceros (Padding)',
    presets: [
      { id: '00000', label: '00123 (Relleno a 5 dígitos)', example: '00123' },
      { id: '000000', label: '000123 (Relleno a 6 dígitos)', example: '000123' },
      { id: '00000000', label: '00000123 (Relleno a 8 dígitos)', example: '00000123' }
    ]
  },
  {
    category: 'Unidades y Cantidades',
    presets: [
      { id: '#,##0 pzas', label: '12,345 pzas', example: '12,345 pzas' },
      { id: '#,##0 kg', label: '12,345 kg', example: '12,345 kg' },
      { id: '#,##0.00 kg', label: '12,345.00 kg', example: '12,345.00 kg' },
      { id: '# unidades', label: '12345 unidades', example: '12345 unidades' }
    ]
  }
];

export class FormatEngine {
  /**
   * Check if a raw value can be interpreted as numeric
   */
  static isNumeric(val) {
    if (val === null || val === undefined || val === '') return false;
    if (typeof val === 'number') return !isNaN(val);
    if (typeof val !== 'string') return false;
    const clean = val.trim().replace(/,/g, '');
    return clean !== '' && !isNaN(clean) && !isNaN(parseFloat(clean));
  }

  /**
   * Parse a raw value to a float number
   */
  static parseNumber(val) {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const clean = String(val).trim().replace(/,/g, '');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  }

  /**
   * Inspect an element or text to detect if it contains or resolves to a number
   */
  static detectNumeric(el, dataStore = null) {
    if (!el) return { isNumeric: false };

    const rawText = (el.text || '').trim();
    // 1. Direct numeric text
    if (this.isNumeric(rawText)) {
      const num = this.parseNumber(rawText);
      return {
        isNumeric: true,
        type: 'literal',
        value: num,
        suggestedMask: (Math.abs(num) <= 1 && num !== 0) ? '0% IVA' : '$#,##0.00'
      };
    }

    // 2. Check variable references {{ field }}
    const varMatch = rawText.match(/\{\{\s*([a-zA-Z0-9_]+)/);
    const field = el.field || (varMatch ? varMatch[1] : null);

    if (field && dataStore) {
      const activeRecord = dataStore.getActiveRecord();
      if (activeRecord && activeRecord[field] !== undefined) {
        const val = activeRecord[field];
        if (this.isNumeric(val)) {
          const num = this.parseNumber(val);
          return {
            isNumeric: true,
            type: 'variable',
            field,
            value: num,
            suggestedMask: (Math.abs(num) <= 1 && num !== 0) ? '0% IVA' : '$#,##0.00'
          };
        }
      }
    }

    return { isNumeric: false };
  }

  /**
   * Universal Mask Applicator
   * Supports:
   * - Currency: "$#,##0.00", "$#,##0", "$#,##0.00 MXN", "USD $#,##0.00", "€#,##0.00"
   * - Percentages: "0% IVA", "0.0% IVA", "0%", "0.00%", "#% Descuento"
   * - Thousands/Decimals: "#,##0", "#,##0.00", "0.00"
   * - Zero-padding: "00000", "000000"
   * - Custom tokens: "SKU-00000", "#,##0 kg"
   */
  static applyMask(rawVal, mask) {
    if (!mask || mask === 'none' || !this.isNumeric(rawVal)) {
      return rawVal;
    }

    const num = this.parseNumber(rawVal);

    // Deconstruct mask into [prefix, numericPattern, suffix]
    // Matches prefix (non-#/0), numeric pattern ([#0,]+(?:\.[#0]+)?%?), and suffix (rest)
    const match = mask.match(/^([^#0]*?)([#0,]+(?:\.[#0]+)?%?)(.*)$/);
    if (!match) {
      return String(rawVal);
    }

    const prefix = match[1] || '';
    let pattern = match[2] || '';
    const suffix = match[3] || '';

    // Check if pattern has percentage %
    const isPercent = pattern.endsWith('%');
    if (isPercent) {
      pattern = pattern.slice(0, -1);
    }

    // Determine target calculation value
    // Smart x100 factor: if mask is percent and |num| <= 1 (e.g. 0.16 -> 16%), multiply by 100
    let calcVal = num;
    if (isPercent) {
      if (Math.abs(num) <= 1 && num !== 0) {
        calcVal = num * 100;
      }
    }

    const isNegative = calcVal < 0;
    const absVal = Math.abs(calcVal);

    // Decimal specifications
    let decimals = 0;
    if (pattern.includes('.')) {
      const decPart = pattern.split('.')[1];
      decimals = decPart.length;
    }

    // Thousands separator
    const hasThousands = pattern.includes(',');

    // Minimum integer digits (zero padding)
    const intPattern = pattern.split('.')[0].replace(/,/g, '');
    const minIntDigits = (intPattern.match(/0/g) || []).length;

    // Format number
    const fixedStr = absVal.toFixed(decimals);
    let [intStr, decStr] = fixedStr.split('.');

    // Apply zero padding
    if (minIntDigits > 0 && intStr.length < minIntDigits) {
      intStr = intStr.padStart(minIntDigits, '0');
    }

    // Apply thousands separator
    if (hasThousands) {
      intStr = intStr.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    // Combine number
    let formattedNumber = decStr !== undefined ? `${intStr}.${decStr}` : intStr;

    if (isPercent) {
      formattedNumber += '%';
    }

    // Handle sign and prefixes
    if (isNegative) {
      // Place minus before currency symbol or at start
      return `-${prefix}${formattedNumber}${suffix}`;
    }

    return `${prefix}${formattedNumber}${suffix}`;
  }
}
