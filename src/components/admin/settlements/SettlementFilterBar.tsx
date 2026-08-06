import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import type { SettlementEstado } from '@/common/settlements';
import { formatDisplayDate } from '@/common/waste';
import { colors } from '@/constants/colors';
import type { FarmerOption } from '@/services/settlements';

import type { AdminPalette } from '../merma/colors';
import type { PickerTarget } from '../merma/MermaFilterBar';

interface Props {
  readonly draftDesde: string;
  readonly draftHasta: string;
  readonly isDateRangeInvalid: boolean;
  readonly farmerId: number | undefined;
  readonly farmers: FarmerOption[];
  readonly selectedEstado: SettlementEstado | '';
  readonly showReset: boolean;
  readonly onOpenDate: (target: PickerTarget) => void;
  readonly onOpenFarmer: () => void;
  readonly onEstadoChange: (estado: SettlementEstado | '') => void;
  readonly onApply: () => void;
  readonly onReset: () => void;
  readonly palette: AdminPalette;
}

const ESTADO_FILTERS: readonly {
  label: string;
  value: SettlementEstado | '';
}[] = [
  { label: 'Todas', value: '' },
  { label: 'Pendientes', value: 'pendiente' },
  { label: 'Pagadas', value: 'pagada' },
];

export function SettlementFilterBar({
  draftDesde,
  draftHasta,
  isDateRangeInvalid,
  farmerId,
  farmers,
  selectedEstado,
  showReset,
  onOpenDate,
  onOpenFarmer,
  onEstadoChange,
  onApply,
  onReset,
  palette,
}: Props): React.JSX.Element {
  const { surface, fg, muted, border, brand, bg, segBg, coral } = palette;

  const selectedFarmer = farmers.find((f) => f.id_usuario === farmerId);
  const selectedFarmerName =
    farmerId === undefined
      ? 'Todos los agricultores'
      : selectedFarmer
        ? selectedFarmer.nombre
        : 'Seleccionar';

  return (
    <View
      style={[styles.card, { backgroundColor: surface, borderColor: border }]}
    >
      {/* Estado chips (apply immediately) */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: muted }]}>Estado</Text>
        <View style={styles.chipRow}>
          {ESTADO_FILTERS.map((opt) => {
            const isSelected = opt.value === selectedEstado;
            return (
              <Pressable
                key={opt.value || 'todas'}
                onPress={() => onEstadoChange(opt.value)}
                style={{
                  backgroundColor: isSelected ? brand : segBg,
                  borderRadius: 999,
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '500',
                    color: isSelected ? colors.iconWhite : muted,
                  }}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Farmer field (apply immediately) */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: muted }]}>Agricultor</Text>
        <Pressable
          onPress={onOpenFarmer}
          accessibilityLabel="Selector de agricultor"
          style={[styles.field, { backgroundColor: bg, borderColor: border }]}
        >
          <Text
            style={
              farmerId !== undefined
                ? [styles.fieldText, { color: fg }]
                : [styles.fieldPlaceholder, { color: muted }]
            }
            numberOfLines={1}
          >
            {selectedFarmerName}
          </Text>
          <MaterialCommunityIcons name="menu-down" size={20} color={muted} />
        </Pressable>
      </View>

      {/* Date fields (draft — applied on Buscar) */}
      <View style={styles.row}>
        <View style={styles.fieldCol}>
          <Text style={[styles.label, { color: muted }]}>Desde</Text>
          <Pressable
            onPress={() => onOpenDate('desde')}
            accessibilityLabel="Fecha desde"
            style={[styles.field, { backgroundColor: bg, borderColor: border }]}
          >
            <Text
              style={
                draftDesde
                  ? [styles.fieldText, { color: fg }]
                  : [styles.fieldPlaceholder, { color: muted }]
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

        <View style={styles.fieldCol}>
          <Text style={[styles.label, { color: muted }]}>Hasta</Text>
          <Pressable
            onPress={() => onOpenDate('hasta')}
            accessibilityLabel="Fecha hasta"
            style={[styles.field, { backgroundColor: bg, borderColor: border }]}
          >
            <Text
              style={
                draftHasta
                  ? [styles.fieldText, { color: fg }]
                  : [styles.fieldPlaceholder, { color: muted }]
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
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  section: { gap: 6 },
  row: { flexDirection: 'row', gap: 10 },
  fieldCol: { flex: 1 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  field: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldText: { fontSize: 14, fontWeight: '500', flex: 1 },
  fieldPlaceholder: { fontSize: 14, flex: 1 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
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
    textAlign: 'center',
  },
});
