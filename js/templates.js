/**
 * LabelLove - Templates & Presets Catalog
 */

export const TEMPLATES = {
  'shipping_4x6': {
    id: 'shipping_4x6',
    name: 'Envío E-Commerce (4x6" / 100x150mm)',
    type: 'roll', // roll or sheet
    widthMm: 100,
    heightMm: 150,
    dpi: 203,
    substrate: 'thermal',
    elements: [
      {
        id: 'el-logo-text',
        type: 'text',
        xMm: 6,
        yMm: 8,
        widthMm: 45,
        heightMm: 10,
        text: '⚡ LABELLOVE EXPRESS',
        fontSize: 14,
        fontWeight: 'bold',
        fontFamily: 'Inter',
        textAlign: 'left'
      },
      {
        id: 'el-badge-priority',
        type: 'text',
        xMm: 65,
        yMm: 8,
        widthMm: 30,
        heightMm: 8,
        text: 'PRIORITY-1',
        fontSize: 10,
        fontWeight: 'bold',
        fontFamily: 'JetBrains Mono',
        textAlign: 'right'
      },
      {
        id: 'el-divider-1',
        type: 'shape',
        shapeType: 'line',
        xMm: 6,
        yMm: 19,
        widthMm: 88,
        heightMm: 1
      },
      {
        id: 'el-to-label',
        type: 'text',
        xMm: 6,
        yMm: 22,
        widthMm: 30,
        heightMm: 5,
        text: 'DESTINATARIO:',
        fontSize: 8,
        fontWeight: 'bold',
        fontFamily: 'Inter',
        textAlign: 'left'
      },
      {
        id: 'el-dest-name',
        type: 'text',
        xMm: 6,
        yMm: 28,
        widthMm: 88,
        heightMm: 8,
        text: '{{ nombre_cliente }}',
        fontSize: 15,
        fontWeight: 'bold',
        fontFamily: 'Inter',
        textAlign: 'left',
        field: 'nombre_cliente'
      },
      {
        id: 'el-dest-address',
        type: 'text',
        xMm: 6,
        yMm: 37,
        widthMm: 88,
        heightMm: 12,
        text: '{{ direccion }}',
        fontSize: 11,
        fontWeight: 'normal',
        fontFamily: 'Inter',
        textAlign: 'left',
        field: 'direccion'
      },
      {
        id: 'el-dest-city',
        type: 'text',
        xMm: 6,
        yMm: 50,
        widthMm: 88,
        heightMm: 7,
        text: '{{ ciudad }} - C.P. {{ codigo_postal }}',
        fontSize: 11,
        fontWeight: '600',
        fontFamily: 'Inter',
        textAlign: 'left'
      },
      {
        id: 'el-divider-2',
        type: 'shape',
        shapeType: 'line',
        xMm: 6,
        yMm: 60,
        widthMm: 88,
        heightMm: 1
      },
      {
        id: 'el-tracking-barcode',
        type: 'barcode',
        xMm: 10,
        yMm: 66,
        widthMm: 80,
        heightMm: 28,
        format: 'CODE128',
        value: '{{ tracking_code }}',
        field: 'tracking_code',
        displayValue: true
      },
      {
        id: 'el-divider-3',
        type: 'shape',
        shapeType: 'line',
        xMm: 6,
        yMm: 98,
        widthMm: 88,
        heightMm: 1
      },
      {
        id: 'el-qr-code',
        type: 'qr',
        xMm: 8,
        yMm: 104,
        widthMm: 34,
        heightMm: 34,
        value: 'https://labellove.test/track/{{ tracking_code }}',
        field: 'tracking_code'
      },
      {
        id: 'el-order-info',
        type: 'text',
        xMm: 46,
        yMm: 104,
        widthMm: 48,
        heightMm: 7,
        text: 'ORDEN: #{{ orden_id }}',
        fontSize: 11,
        fontWeight: 'bold',
        fontFamily: 'JetBrains Mono',
        textAlign: 'left',
        field: 'orden_id'
      },
      {
        id: 'el-sku-info',
        type: 'text',
        xMm: 46,
        yMm: 112,
        widthMm: 48,
        heightMm: 6,
        text: 'SKU: {{ sku }}',
        fontSize: 10,
        fontWeight: 'normal',
        fontFamily: 'JetBrains Mono',
        textAlign: 'left',
        field: 'sku'
      },
      {
        id: 'el-date-info',
        type: 'text',
        xMm: 46,
        yMm: 120,
        widthMm: 48,
        heightMm: 6,
        text: 'FECHA: 2026-09-23',
        fontSize: 9,
        fontWeight: 'normal',
        fontFamily: 'Inter',
        textAlign: 'left'
      },
      {
        id: 'el-weight-info',
        type: 'text',
        xMm: 46,
        yMm: 128,
        widthMm: 48,
        heightMm: 7,
        text: 'PESO: 1.45 KG (ZONE 4)',
        fontSize: 9,
        fontWeight: 'bold',
        fontFamily: 'Inter',
        textAlign: 'left'
      }
    ]
  },

  'warehouse_50x30': {
    id: 'warehouse_50x30',
    name: 'Almacén / Retail (50x30 mm)',
    type: 'roll',
    widthMm: 50,
    heightMm: 30,
    dpi: 203,
    substrate: 'thermal',
    elements: [
      {
        id: 'el-product-title',
        type: 'text',
        xMm: 3,
        yMm: 3,
        widthMm: 44,
        heightMm: 6,
        text: '{{ sku }}',
        fontSize: 11,
        fontWeight: 'bold',
        fontFamily: 'JetBrains Mono',
        textAlign: 'center',
        field: 'sku'
      },
      {
        id: 'el-barcode-prod',
        type: 'barcode',
        xMm: 4,
        yMm: 9,
        widthMm: 42,
        heightMm: 14,
        format: 'EAN13',
        value: '750103131130',
        displayValue: true
      },
      {
        id: 'el-price',
        type: 'text',
        xMm: 3,
        yMm: 24,
        widthMm: 44,
        heightMm: 5,
        text: '$ {{ precio }} MXN',
        fontSize: 10,
        fontWeight: 'bold',
        fontFamily: 'Inter',
        textAlign: 'center',
        field: 'precio'
      }
    ]
  },

  'avery_5160': {
    id: 'avery_5160',
    name: 'Pliego Avery 5160 (Carta - 30 etiquetas)',
    type: 'sheet',
    pageWidthMm: 215.9,  // Letter width (8.5 in)
    pageHeightMm: 279.4, // Letter height (11 in)
    cols: 3,
    rows: 10,
    labelWidthMm: 66.6,  // 2.625 in
    labelHeightMm: 25.4, // 1.0 in
    marginLeftMm: 4.8,
    marginTopMm: 12.7,
    gapXMm: 3.1,
    gapYMm: 0,
    widthMm: 66.6,
    heightMm: 25.4,
    dpi: 300,
    substrate: 'gloss',
    elements: [
      {
        id: 'el-avery-name',
        type: 'text',
        xMm: 4,
        yMm: 4,
        widthMm: 58,
        heightMm: 6,
        text: '{{ nombre_cliente }}',
        fontSize: 10,
        fontWeight: 'bold',
        fontFamily: 'Inter',
        textAlign: 'left',
        field: 'nombre_cliente'
      },
      {
        id: 'el-avery-addr',
        type: 'text',
        xMm: 4,
        yMm: 10,
        widthMm: 40,
        heightMm: 10,
        text: '{{ direccion }}\n{{ ciudad }}',
        fontSize: 8,
        fontWeight: 'normal',
        fontFamily: 'Inter',
        textAlign: 'left',
        field: 'direccion'
      },
      {
        id: 'el-avery-qr',
        type: 'qr',
        xMm: 48,
        yMm: 5,
        widthMm: 16,
        heightMm: 16,
        value: '{{ tracking_code }}',
        field: 'tracking_code'
      }
    ]
  }
};
