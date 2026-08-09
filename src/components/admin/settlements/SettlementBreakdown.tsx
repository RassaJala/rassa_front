import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { formatMoney } from '@/utils/money';

import type { AdminPalette } from '../merma/colors';

interface Props {
  readonly montoVentas: string;
  readonly comision: string;
  readonly montoLiquidar: string;
  readonly palette: AdminPalette;
}

interface RowProps {
  readonly label: string;
  readonly value: string;
  readonly muted: string;
  readonly valueColor: string;
  readonly strong?: boolean;
}

function Row({
  label,
  value,
  muted,
  valueColor,
  strong = false,
}: RowProps): React.JSX.Element {
  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: muted }]}>{label}</Text>
      <Text
        style={[
          styles.value,
          { color: valueColor, fontWeight: strong ? '800' : '600' },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

export default function SettlementBreakdown({
  montoVentas,
  comision,
  montoLiquidar,
  palette,
}: Props): React.JSX.Element {
  const { surface, fg, muted, border, brand } = palette;
  // Derive the commission rate from the amounts the backend actually sent
  // (the serializer does not expose a tasa_comision field). Guard division by
  // zero so ventas "0.00" renders "Comisión Rassa (0%)".
  const ventas = Number(montoVentas);
  const tasa = ventas > 0 ? Number(comision) / ventas : 0;
  const pct = Math.round(tasa * 100);
  return (
    <View
      style={[styles.box, { backgroundColor: surface, borderColor: border }]}
    >
      <Text style={[styles.sectionTitle, { color: fg }]}>Desglose</Text>
      <Row
        label="Monto de ventas"
        value={formatMoney(montoVentas)}
        muted={muted}
        valueColor={fg}
      />
      <Row
        label={`Comisión Rassa (${pct}%)`}
        value={formatMoney(comision)}
        muted={muted}
        valueColor={fg}
      />
      <View style={[styles.divider, { backgroundColor: border }]} />
      <Row
        label="A liquidar"
        value={formatMoney(montoLiquidar)}
        muted={muted}
        valueColor={brand}
        strong
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: { fontSize: 13 },
  value: { fontSize: 15 },
  divider: { height: 1, marginVertical: 2 },
});
