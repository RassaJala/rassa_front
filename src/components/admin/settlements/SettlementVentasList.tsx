import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { SettlementVenta } from '@/common/settlements';
import { formatDisplayDate } from '@/common/waste';
import { colors } from '@/constants/colors';
import { formatMoney } from '@/utils/money';

import type { AdminPalette } from '../merma/colors';

interface Props {
  readonly ventas: SettlementVenta[];
  readonly palette: AdminPalette;
}

export default function SettlementVentasList({
  ventas,
  palette,
}: Props): React.JSX.Element {
  const { surface, fg, muted, border } = palette;

  if (ventas.length === 0) {
    return (
      <View
        style={[
          styles.emptyBox,
          { backgroundColor: surface, borderColor: border },
        ]}
      >
        <Text style={[styles.emptyText, { color: muted }]}>
          Sin ventas en este periodo.
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.box, { backgroundColor: surface, borderColor: border }]}
    >
      <Text style={[styles.sectionTitle, { color: fg }]}>
        Ventas del periodo
      </Text>
      {ventas.map((venta) => (
        <View
          key={venta.id_pedido}
          style={[styles.row, { borderBottomColor: border }]}
        >
          <View style={styles.rowHeader}>
            <Text style={[styles.pedido, { color: fg }]}>
              Pedido #{venta.id_pedido}
            </Text>
            <Text style={[styles.total, { color: fg }]}>
              {formatMoney(venta.total)}
            </Text>
          </View>
          <Text style={[styles.cliente, { color: muted }]}>
            {venta.cliente_nombre}
          </Text>
          <View style={styles.rowFooter}>
            <Text style={[styles.fecha, { color: muted }]}>
              {formatDisplayDate(venta.creado_en)}
            </Text>
            {venta.pago_folio ? (
              <View style={styles.folioBadge}>
                <Text style={styles.folioText}>Folio {venta.pago_folio}</Text>
              </View>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700' },
  row: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 2,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pedido: { fontSize: 14, fontWeight: '700' },
  total: { fontSize: 14, fontWeight: '700' },
  cliente: { fontSize: 13 },
  rowFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  fecha: { fontSize: 12 },
  folioBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: colors.settlementPagadaBg,
  },
  folioText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.settlementPagadaFg,
  },
  emptyBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: { fontSize: 14 },
});
