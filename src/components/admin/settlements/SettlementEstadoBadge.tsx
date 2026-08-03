import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { SettlementEstado } from '@/common/settlements';
import { ESTADO_PAGADA } from '@/common/settlements';
import { colors } from '@/constants/colors';

interface Props {
  readonly estado: SettlementEstado;
}

export default function SettlementEstadoBadge({
  estado,
}: Props): React.JSX.Element {
  const pagada = estado === ESTADO_PAGADA;
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: pagada
            ? colors.statusPublicadoBg
            : colors.statusBorradorBg,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: pagada ? colors.statusPublicadoFg : colors.statusBorradorFg,
          },
        ]}
      >
        {pagada ? 'Pagada' : 'Pendiente'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  text: { fontSize: 11, fontWeight: '700' },
});
