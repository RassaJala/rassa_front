import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { formatDisplayDate } from '@/common/waste';
import { colors } from '@/constants/colors';

import type { AdminPalette } from './colors';

export type PickerTarget = 'desde' | 'hasta';
export type AgruparPor = 'mes' | 'semana';

interface Props {
  readonly draftDesde: string;
  readonly draftHasta: string;
  readonly productId: number | undefined;
  readonly products: { id: number; nombre: string }[];
  readonly agruparPor: AgruparPor;
  readonly isDateRangeInvalid: boolean;
  readonly showReset: boolean;
  readonly onOpenDate: (target: PickerTarget) => void;
  readonly onOpenProduct: () => void;
  readonly onAgrupar: (value: AgruparPor) => void;
  readonly onApply: () => void;
  readonly onReset: () => void;
  readonly palette: AdminPalette;
}

export function MermaFilterBar({
  draftDesde,
  draftHasta,
  productId,
  products,
  agruparPor,
  isDateRangeInvalid,
  showReset,
  onOpenDate,
  onOpenProduct,
  onAgrupar,
  onApply,
  onReset,
  palette,
}: Props): React.JSX.Element {
  const { surface, fg, muted, border, brand, bg, segBg, coral } = palette;
  return (
    <View
      style={[styles.card, { backgroundColor: surface, borderColor: border }]}
    >
      <View style={styles.row}>
        <View style={styles.field}>
          <Text style={[styles.label, { color: muted }]}>Desde</Text>
          <Pressable
            onPress={() => onOpenDate('desde')}
            accessibilityLabel="Fecha desde"
            style={[
              styles.dateField,
              { backgroundColor: bg, borderColor: border },
            ]}
          >
            <Text
              style={
                draftDesde
                  ? [styles.dateText, { color: fg }]
                  : [styles.datePlaceholder, { color: muted }]
              }
              numberOfLines={1}
            >
              {draftDesde ? formatDisplayDate(draftDesde) : 'Seleccionar'}
            </Text>
            <MaterialCommunityIcons
              name="calendar-month-outline"
              size={20}
              color={muted}
            />
          </Pressable>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: muted }]}>Hasta</Text>
          <Pressable
            onPress={() => onOpenDate('hasta')}
            accessibilityLabel="Fecha hasta"
            style={[
              styles.dateField,
              { backgroundColor: bg, borderColor: border },
            ]}
          >
            <Text
              style={
                draftHasta
                  ? [styles.dateText, { color: fg }]
                  : [styles.datePlaceholder, { color: muted }]
              }
              numberOfLines={1}
            >
              {draftHasta ? formatDisplayDate(draftHasta) : 'Seleccionar'}
            </Text>
            <MaterialCommunityIcons
              name="calendar-month-outline"
              size={20}
              color={muted}
            />
          </Pressable>
        </View>
      </View>

      {products.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.label, { color: muted }]}>Producto</Text>
          <Pressable
            onPress={onOpenProduct}
            accessibilityLabel="Selector de producto"
            style={[
              styles.dateField,
              { backgroundColor: bg, borderColor: border },
            ]}
          >
            <Text
              style={
                productId !== undefined
                  ? [styles.dateText, { color: fg }]
                  : [styles.datePlaceholder, { color: muted }]
              }
              numberOfLines={1}
            >
              {productId !== undefined
                ? (products.find((p) => p.id === productId)?.nombre ??
                  'Seleccionar')
                : 'Todos los productos'}
            </Text>
            <MaterialCommunityIcons name="menu-down" size={20} color={muted} />
          </Pressable>
        </View>
      )}

      <View style={[styles.segRow, { backgroundColor: segBg }]}>
        <Pressable
          onPress={() => onAgrupar('mes')}
          style={[
            styles.segBtn,
            {
              backgroundColor:
                agruparPor === 'mes' ? surface : colors.transparent,
            },
          ]}
        >
          <Text
            style={[
              styles.segText,
              { color: agruparPor === 'mes' ? brand : muted },
            ]}
          >
            Mes
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onAgrupar('semana')}
          style={[
            styles.segBtn,
            {
              backgroundColor:
                agruparPor === 'semana' ? surface : colors.transparent,
            },
          ]}
        >
          <Text
            style={[
              styles.segText,
              { color: agruparPor === 'semana' ? brand : muted },
            ]}
          >
            Semana
          </Text>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={onApply}
          disabled={isDateRangeInvalid}
          style={[
            styles.primaryBtn,
            {
              backgroundColor: isDateRangeInvalid ? muted : brand,
              opacity: isDateRangeInvalid ? 0.5 : 1,
            },
          ]}
        >
          <Text style={[styles.primaryText, { color: colors.iconWhite }]}>
            Buscar
          </Text>
        </Pressable>

        {showReset ? (
          <Pressable
            onPress={onReset}
            accessibilityLabel="Limpiar filtros"
            style={[
              styles.resetBtn,
              { borderColor: border, backgroundColor: surface },
            ]}
          >
            <MaterialCommunityIcons name="close" size={18} color={muted} />
          </Pressable>
        ) : null}
      </View>

      {isDateRangeInvalid ? (
        <Text style={[styles.warning, { color: coral }]}>
          «Hasta» debe ser mayor o igual a «Desde»
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  field: { flex: 1 },
  section: { marginBottom: 12 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  dateField: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: { fontSize: 14, fontWeight: '500' },
  datePlaceholder: { fontSize: 14 },
  segRow: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  segText: { fontSize: 13, fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: 10 },
  primaryBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  primaryText: { fontSize: 14, fontWeight: '700' },
  resetBtn: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warning: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
});
