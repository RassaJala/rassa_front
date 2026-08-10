import {
  buildReceiptHtml,
  calcularAjuste,
  calcularSubtotalVisible,
  escapeHtml,
  formatearCantidad,
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

  it('devuelve ajuste 0 cuando el subtotal no es finito (contrato cubre ambos lados)', () => {
    // Documenta el contrato: con subtotal NaN no se genera un ajuste NaN.
    expect(calcularAjuste(mockPago, Number.NaN)).toBe(0);
  });

  it('devuelve ajuste 0 cuando el monto es vacío o solo espacios (no un falso $0)', () => {
    // Number('') === 0 y Number(' ') === 0: sin la coerción serían finitos y
    // generarían un ajuste fantasma de $210.98.
    expect(calcularAjuste({ ...mockPago, monto: '' }, 210.98)).toBe(0);
    expect(calcularAjuste({ ...mockPago, monto: ' ' }, 210.98)).toBe(0);
  });

  it('reconcilia a centavos con subtotales de 3 decimales (penny-off)', () => {
    // 3 × 3.335 = 10.005 en matemática; en flotante el subtotal raw tiene
    // ruido (10.0049…). El fix redondea subtotal y monto a centavos ANTES de
    // restar, así lo impreso siempre cierra: subtotal $10.00 + ajuste +$0.01
    // = total $10.01 (la tabla NUNCA muestra 10.00 + 0.00 ni 10.01 + 0.01).
    const pennyOff: PaymentDetail = {
      ...mockPago,
      monto: '10.01',
      total_pedido: null,
      productos: [{ nombre: 'Trucha', precio: '3.335', cantidad: 3 }],
    };
    const html = buildReceiptHtml(pennyOff);
    expect(html).toContain(
      '<td colspan="3">Subtotal</td><td class="num">$10.00</td>',
    );
    expect(html).toContain('<td colspan="3">Ajuste</td>');
    expect(html).toContain('<td class="num">+$0.01</td>');
    expect(html).toContain('<strong>$10.01</strong>');
  });
});

describe('formatearCantidad', () => {
  it('es null-safe y nunca imprime NaN ni un 0 falso', () => {
    expect(formatearCantidad(null)).toBe('—');
    expect(formatearCantidad(undefined)).toBe('—');
    expect(formatearCantidad('')).toBe('—');
    expect(formatearCantidad('  ')).toBe('—');
    expect(formatearCantidad('abc')).toBe('—');
    expect(formatearCantidad(0)).toBe('0');
    expect(formatearCantidad('2')).toBe('2');
    expect(formatearCantidad(2.5)).toBe('2.5');
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

  it('suprime la fila Total del pedido cuando coincide con el subtotal visible', () => {
    // total_pedido (210.98) == suma de filas: la fila informativa se omite
    // porque sería ruido duplicado.
    const coincide: PaymentDetail = {
      ...mockPago,
      monto: '210.98',
      total_pedido: '210.98',
    };
    const html = buildReceiptHtml(coincide);
    expect(html).not.toContain('Total del pedido');
    expect(html).not.toContain('Ajuste');
    expect(html).toContain('<strong>$210.98</strong>');
  });

  it('no muestra ajuste cuando el monto coincide con la suma de filas (caso 0 y frontera)', () => {
    const casoCero: PaymentDetail = {
      ...mockPago,
      monto: '210.98',
      total_pedido: null,
    };
    expect(buildReceiptHtml(casoCero)).not.toContain('Ajuste');
    // Cualquier diferencia visible a centavos genera la fila (>= sobre el
    // ajuste ya redondeado): 210.99 − 210.98 = 0.01.
    const frontera: PaymentDetail = {
      ...mockPago,
      monto: '210.99',
      total_pedido: null,
    };
    expect(buildReceiptHtml(frontera)).toContain('Ajuste');
    expect(buildReceiptHtml(frontera)).toContain('+$0.01');
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

  it('tolera total_pedido numérico sin lanzar (trim is not a function)', () => {
    // El backend puede serializar Decimal como número: la coerción previa
    // evita el throw que dejaría el botón de impresión muerto (CRITICAL R4).
    const numerico: PaymentDetail = {
      ...mockPago,
      total_pedido: 119.48 as unknown as string,
    };
    const html = buildReceiptHtml(numerico);
    expect(html).toContain('$210.98');
    expect(html).toContain('−$91.50');
    expect(html).toContain('<strong>$119.48</strong>');
  });

  it('tolera monto vacío o con espacios sin ajuste fantasma ni $0 falso', () => {
    for (const monto of ['', ' ']) {
      const corrupto: PaymentDetail = { ...mockPago, monto };
      const html = buildReceiptHtml(corrupto);
      expect(html).toContain('<strong>—</strong>');
      expect(html).not.toContain('Ajuste');
      // El monto vacío es tan corrupto como 'abc': el aviso debe aparecer.
      expect(html).toContain('El total pagado del pago no pudo calcularse.');
    }
  });

  it('tolera monto corrupto sin imprimir $NaN ni ajuste fantasma', () => {
    const corrupto: PaymentDetail = { ...mockPago, monto: 'abc' };
    const html = buildReceiptHtml(corrupto);
    expect(html).not.toContain('$NaN');
    expect(html).not.toContain('Ajuste');
    expect(html).toContain('<strong>—</strong>');
  });

  it('avisa en el documento cuando el monto está corrupto', () => {
    const corrupto: PaymentDetail = { ...mockPago, monto: 'abc' };
    const html = buildReceiptHtml(corrupto);
    expect(html).toContain('El total pagado del pago no pudo calcularse.');
  });

  it('tolera productos: null sin romper el documento', () => {
    const sinProductos: PaymentDetail = { ...mockPago, productos: null };
    const html = buildReceiptHtml(sinProductos);
    expect(html).toContain('$119.48');
    expect(html).toContain('<strong>$119.48</strong>');
  });

  it('tolera cliente_nombre: null (imprime "—")', () => {
    const sinCliente: PaymentDetail = { ...mockPago, cliente_nombre: null };
    const html = buildReceiptHtml(sinCliente);
    expect(html).toContain('>—<');
  });

  it('tolera pedido: null (omite la fila Pedido)', () => {
    const sinPedido: PaymentDetail = { ...mockPago, pedido: null };
    const html = buildReceiptHtml(sinPedido);
    expect(html).not.toContain('>Pedido<');
  });

  it('tolera referencia: "" (omite la fila Referencia)', () => {
    const sinReferencia: PaymentDetail = { ...mockPago, referencia: '' };
    const html = buildReceiptHtml(sinReferencia);
    expect(html).not.toContain('>Referencia<');
  });

  it('escapa el id de pedido aunque el backend lo envíe como string', () => {
    const pedidoString: PaymentDetail = {
      ...mockPago,
      pedido: '<img src=x onerror=alert(1)>' as unknown as number,
    };
    const html = buildReceiptHtml(pedidoString);
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });

  it('usa <th> en el header de la tabla (el CSS de thead th aplica)', () => {
    const html = buildReceiptHtml(mockPago);
    const thead = html.match(/<thead>([\s\S]*?)<\/thead>/)?.[1] ?? '';
    expect(thead).toContain('<th>Producto</th>');
    expect(thead).toContain('<th class="num">Importe</th>');
    expect(thead).not.toContain('<td>');
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
