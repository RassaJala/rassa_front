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
  it('calcula el subtotal como cantidad × precio', () => {
    const html = buildReceiptHtml(mockPago);
    // 2 × 59.74 + 3 × 30.50 = 210.98
    expect(html).toContain('$210.98');
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
