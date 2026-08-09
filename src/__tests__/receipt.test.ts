import {
  buildReceiptHtml,
  calcularAjuste,
  calcularSubtotalVisible,
  escapeHtml,
} from '@/common/receipt';
import type { PaymentDetail } from '@/common/payments';

const mockPago: PaymentDetail = {
  id_pago: 9,
  folio: 'PAG-0009',
  pedido: 5,
  tipo_pago: 1,
  tipo_pago_nombre: 'Efectivo',
  cliente_nombre: 'Cliente Test',
  cliente_id: 4,
  monto: '119.48',
  referencia: 'TEST-001',
  total_pedido: '119.48',
  productos: [
    { nombre: 'Manzana', precio: '59.74', cantidad: 2 },
    { nombre: 'Plátano', precio: '30.50', cantidad: 3 },
  ],
  fecha_pago: '2026-07-30T12:00:00Z',
};

describe('calcularSubtotalVisible / calcularAjuste', () => {
  it('exporta la reconciliación para que se pruebe directamente', () => {
    const subtotal = calcularSubtotalVisible(mockPago);
    expect(subtotal).toBeCloseTo(210.98, 2);
    expect(calcularAjuste(mockPago, subtotal)).toBeCloseTo(119.48 - 210.98, 2);
  });

  it('devuelve ajuste 0 cuando el monto no es un número finito', () => {
    const corrupto: PaymentDetail = { ...mockPago, monto: 'abc' };
    expect(calcularAjuste(corrupto, 210.98)).toBe(0);
  });
});

describe('buildReceiptHtml', () => {
  it('cierra aritméticamente: suma de filas + ajuste = total pagado', () => {
    // Filas: 210.98; monto cobrado: 119.48 → ajuste = −91.50.
    const html = buildReceiptHtml(mockPago);
    expect(html).toContain('$210.98');
    expect(html).toContain('Ajuste');
    expect(html).toContain('−$91.50');
    expect(html).toContain('<strong>$119.48</strong>');
  });

  it('muestra Total del pedido como fila informativa cuando difiere de la suma', () => {
    // total_pedido (112.00) no coincide con las filas (210.98): el documento
    // no lo usa como subtotal, solo lo informa.
    const descuento: PaymentDetail = {
      ...mockPago,
      monto: '119.48',
      total_pedido: '112.00',
    };
    const html = buildReceiptHtml(descuento);
    expect(html).toContain('Total del pedido');
    expect(html).toContain('$112.00');
    expect(html).toContain('$210.98');
    expect(html).toContain('−$91.50');
  });

  it('no muestra la fila Total del pedido cuando el backend no la manda', () => {
    const sinTotal: PaymentDetail = { ...mockPago, total_pedido: null };
    const html = buildReceiptHtml(sinTotal);
    expect(html).not.toContain('Total del pedido');
  });

  it('no muestra ajuste cuando monto y suma de filas coinciden', () => {
    const sinTotal: PaymentDetail = {
      ...mockPago,
      monto: '210.98',
      total_pedido: null,
    };
    const html = buildReceiptHtml(sinTotal);
    expect(html).toContain('$210.98');
    expect(html).toContain('<strong>$210.98</strong>');
    expect(html).not.toContain('Ajuste');
  });

  it('etiqueta el ajuste con signo explícito (recargo vs descuento)', () => {
    // monto > subtotal: recargo positivo.
    const recargo: PaymentDetail = {
      ...mockPago,
      monto: '220.98',
      total_pedido: null,
    };
    const html = buildReceiptHtml(recargo);
    expect(html).toContain('Ajuste');
    expect(html).toContain('+$10.00');
  });

  it('imprime el total pagado con $ y 2 decimales', () => {
    const html = buildReceiptHtml(mockPago);
    expect(html).toContain('<strong>$119.48</strong>');
  });

  it('imprime los montos de cada fila con 2 decimales', () => {
    const html = buildReceiptHtml(mockPago);
    expect(html).toContain('$59.74');
    expect(html).toContain('$91.50');
  });

  it('incluye folio, productos y método de pago en el HTML', () => {
    const html = buildReceiptHtml(mockPago);
    expect(html).toContain('PAG-0009');
    expect(html).toContain('Manzana');
    expect(html).toContain('Plátano');
    expect(html).toContain('Efectivo');
  });

  it('tolera total_pedido corrupto sin romper el documento', () => {
    const corrupto: PaymentDetail = { ...mockPago, total_pedido: 'abc' };
    const html = buildReceiptHtml(corrupto);
    expect(html).not.toContain('Total del pedido');
    expect(html).toContain('$210.98');
    expect(html).toContain('−$91.50');
  });

  it('tolera monto corrupto sin imprimir $NaN ni ajuste fantasma', () => {
    const corrupto: PaymentDetail = { ...mockPago, monto: 'abc' };
    const html = buildReceiptHtml(corrupto);
    expect(html).not.toContain('$NaN');
    expect(html).not.toContain('Ajuste');
    expect(html).toContain('<strong>—</strong>');
  });

  it('avisa en el documento cuando los montos de las filas son corruptos', () => {
    const corrupto: PaymentDetail = {
      ...mockPago,
      productos: [{ nombre: 'Raro', precio: '12,50', cantidad: 1 }],
    };
    const html = buildReceiptHtml(corrupto);
    expect(html).not.toContain('$0.00');
    expect(html).not.toContain('$NaN');
    expect(html).toContain('No se pudieron calcular los montos del pedido');
  });

  it('no muestra filas cantidad "NaN" ante cantidades corruptas', () => {
    const corrupto: PaymentDetail = {
      ...mockPago,
      productos: [
        {
          nombre: 'Raro',
          precio: '10.00',
          cantidad: 'abc' as unknown as number,
        },
      ],
    };
    const html = buildReceiptHtml(corrupto);
    expect(html).not.toContain('NaN');
    expect(html).toContain('>—<');
  });

  it('escapa folios y productos con markup en el HTML generado', () => {
    const malicioso: PaymentDetail = {
      ...mockPago,
      folio: '<script>alert(1)</script>',
      productos: [{ nombre: 'X & "Y"', precio: '1.00', cantidad: 1 }],
    };
    const html = buildReceiptHtml(malicioso);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('X &amp; &quot;Y&quot;');
  });
});

describe('escapeHtml', () => {
  it('escapa & < > " \'', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;',
    );
  });

  it('es null-safe: null/undefined se imprimen como "—"', () => {
    expect(escapeHtml(null)).toBe('—');
    expect(escapeHtml(undefined)).toBe('—');
  });
});
