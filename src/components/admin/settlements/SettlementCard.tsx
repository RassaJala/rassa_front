import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import type { Settlement } from '@/common/settlements';
import { formatDisplayDate } from '@/common/waste';
import { formatMoney } from '@/utils/money';

import type { MermaPalette } from '../merma/colors';
import SettlementEstadoBadge from './SettlementEstadoBadge';

interface Props {
  readonly settlement: Settlement;
  readonly onPress: () => void;
  readonly palette: MermaPalette;
}

export function SettlementCard({
  settlement,
  onPress,
  palette,
}: Props): React.JSX.Element {
  const { surface, fg, muted, border, brand } = palette;
  const periodo = `${formatDisplayDate(settlement.periodo_inicio)} — ${formatDisplayDate(settlement.periodo_fin)}`;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: surface,
          borderColor: border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.titleBlock}>
          <Text style={[styles.farmerName, { color: fg }]} numberOfLines={1}>
            {settlement.agricultor_nombre}
          </Text>
          <Text style={[styles.periodo, { color: muted }]} numberOfLines={1}>
            {periodo}
          </Text>
        </View>
        <SettlementEstadoBadge estado={settlement.estado} />
      </View>

      <View style={styles.footerRow}>
        <View>
          <Text style={[styles.label, { color: muted }]}>A liquidar</Text>
          <Text style={[styles.amount, { color: brand }]}>
            {formatMoney(settlement.monto_liquidar)}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color={muted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  titleBlock: { flex: 1 },
  farmerName: { fontSize: 16, fontWeight: '700' },
  periodo: { fontSize: 12, marginTop: 2 },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  amount: { fontSize: 18, fontWeight: '700', marginTop: 2 },
});
