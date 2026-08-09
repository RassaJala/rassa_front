import { buildReceiptHtml, escapeHtml } from '@/common/receipt';
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

describe('buildReceiptHtml', () => {
  it('usa total_pedido como subtotal autoritativo del documento', () => {
    const html = buildReceiptHtml(mockPago);
    // total_pedido del backend (119.48) manda sobre la suma de filas (210.98).
    expect(html).toContain('$119.48');
    expect(html).not.toContain('$210.98');
  });

  it('cuadra el documento cuando monto y subtotal no coinciden con una fila de ajuste', () => {
    // La suma de filas es 210.98 pero el pedido real cerró en 112.00 y se
    // cobró 119.48: el ajuste (7.48) debe aparecer antes del total.
    const descuento: PaymentDetail = {
      ...mockPago,
      monto: '119.48',
      total_pedido: '112.00',
    };
    const html = buildReceiptHtml(descuento);
    expect(html).toContain('$112.00');
    expect(html).not.toContain('$210.98');
    expect(html).toContain('Descuento/Ajuste');
    expect(html).toContain('$7.48');
  });

  it('usa la suma de filas como subtotal cuando falta total_pedido', () => {
    // Sin total_pedido el subtotal sale de las filas (210.98) y coincide con
    // el monto: el documento cuadra sin fila de ajuste.
    const sinTotal: PaymentDetail = {
      ...mockPago,
      monto: '210.98',
      total_pedido: null,
    };
    const html = buildReceiptHtml(sinTotal);
    expect(html).toContain('$210.98');
    expect(html).toContain('<strong>$210.98</strong>');
    expect(html).not.toContain('Descuento/Ajuste');
  });

  it('imprime el total pagado con $ y 2 decimales', () => {
    const html = buildReceiptHtml(mockPago);
    expect(html).toContain('<strong>$119.48</strong>');
  });

  it('imprime los montos de cada fila con 2 decimales', () => {
    const html = buildReceiptHtml(mockPago);
    expect(html).toContain('$59.74');
    expect(html).toContain('$91.50');
    expect(html).toContain('$119.48');
  });

  it('incluye folio, productos y método de pago en el HTML', () => {
    const html = buildReceiptHtml(mockPago);
    expect(html).toContain('PAG-0009');
    expect(html).toContain('Manzana');
    expect(html).toContain('Plátano');
    expect(html).toContain('Efectivo');
  });

  it('no muestra $0.00 ni $NaN ante precios corruptos (no finitos)', () => {
    const corrupto: PaymentDetail = {
      ...mockPago,
      productos: [{ nombre: 'Raro', precio: '12,50', cantidad: 1 }],
    };
    const html = buildReceiptHtml(corrupto);
    expect(html).not.toContain('$0.00');
    expect(html).not.toContain('$NaN');
    expect(html).toContain('—');
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
});
