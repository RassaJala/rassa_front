import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors } from '@/constants/colors';

import type { AdminPalette } from './colors';

interface Props {
  readonly totalGeneral: number;
  readonly totalRegistros: number;
  readonly productoMasAfectado: { nombre: string; total: number } | null;
  readonly palette: AdminPalette;
}

export function MermaSummaryCards({
  totalGeneral,
  totalRegistros,
  productoMasAfectado,
  palette,
}: Props): React.JSX.Element {
  const { surface, fg, muted, border, brand, coral } = palette;
  return (
    <View style={styles.row}>
      <View
        style={[styles.card, { backgroundColor: surface, borderColor: border }]}
      >
        <MaterialCommunityIcons
          name="package-variant"
          size={24}
          color={brand}
        />
        <Text style={[styles.value, { color: fg }]}>{totalGeneral}</Text>
        <Text style={[styles.label, { color: muted }]}>Unidades mermadas</Text>
      </View>

      <View
        style={[styles.card, { backgroundColor: surface, borderColor: border }]}
      >
        <MaterialCommunityIcons name="trophy" size={24} color={coral} />
        {productoMasAfectado !== null ? (
          <>
            <Text
              style={[styles.value, { color: fg, fontSize: 18 }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {productoMasAfectado.nombre}
            </Text>
            <Text style={[styles.label, { color: muted }]}>
              {productoMasAfectado.total} perdidos
            </Text>
          </>
        ) : (
          <Text style={[styles.value, { color: muted, fontSize: 14 }]}>
            Sin datos
          </Text>
        )}
      </View>

      <View
        style={[styles.card, { backgroundColor: surface, borderColor: border }]}
      >
        <MaterialCommunityIcons
          name="clipboard-list"
          size={24}
          color={colors.accent}
        />
        <Text style={[styles.value, { color: fg }]}>{totalRegistros}</Text>
        <Text style={[styles.label, { color: muted }]}>Registros</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  card: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
  },
  value: { fontSize: 22, fontWeight: '700', marginTop: 6 },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginTop: 2,
    textAlign: 'center',
  },
});
