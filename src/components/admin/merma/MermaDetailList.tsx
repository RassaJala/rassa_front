import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { periodLabel, WASTE_DETAIL_LIMIT } from '@/common/waste';
import type { MermaResumenItem } from '@/common/waste';

import type { AdminPalette } from './colors';
import { getDecisionColor } from './colors';

interface Props {
  readonly rows: MermaResumenItem[];
  readonly detailLength: number;
  readonly agrupacion: 'mes' | 'semana';
  readonly totalPaginas: number;
  readonly paginaSegura: number;
  readonly onPrev: () => void;
  readonly onNext: () => void;
  readonly palette: AdminPalette;
}

export function MermaDetailList({
  rows,
  detailLength,
  agrupacion,
  totalPaginas,
  paginaSegura,
  onPrev,
  onNext,
  palette,
}: Props): React.JSX.Element {
  const { surface, fg, muted, border, coral } = palette;
  return (
    <View
      style={[styles.card, { backgroundColor: surface, borderColor: border }]}
    >
      <Text style={[styles.title, { color: fg }]}>Detalle de mermas</Text>
      {detailLength >= WASTE_DETAIL_LIMIT && (
        <Text style={[styles.truncation, { color: muted }]}>
          Mostrando los primeros {WASTE_DETAIL_LIMIT} registros del detalle.
        </Text>
      )}

      {rows.map((item, idx) => (
        <View
          key={`${item.producto_id}-${item.decision_id}-${item.periodo}-${idx}`}
          style={[
            styles.item,
            { backgroundColor: surface, borderColor: border },
          ]}
        >
          <View
            style={[
              styles.badge,
              { backgroundColor: getDecisionColor(item.decision_nombre) },
            ]}
          />
          <View style={styles.content}>
            <Text style={[styles.product, { color: fg }]} numberOfLines={1}>
              {item.producto_nombre}
            </Text>
            <Text style={[styles.decision, { color: muted }]}>
              {periodLabel(item.periodo, agrupacion)} &middot;{' '}
              {item.decision_nombre}
            </Text>
          </View>
          <View style={styles.amounts}>
            <Text style={[styles.cantidad, { color: coral }]}>
              {item.total_cantidad}
            </Text>
            <Text style={[styles.mermas, { color: muted }]}>
              {item.total_mermas} merma{item.total_mermas !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      ))}

      {totalPaginas > 1 && (
        <View style={[styles.pagination, { borderTopColor: border }]}>
          <Text style={[styles.paginationInfo, { color: muted }]}>
            Página {paginaSegura} de {totalPaginas}
          </Text>
          <View style={styles.paginationBtns}>
            <Pressable
              disabled={paginaSegura <= 1}
              onPress={onPrev}
              accessibilityLabel="Página anterior"
              style={[
                styles.pageBtn,
                {
                  borderColor: border,
                  backgroundColor: surface,
                  opacity: paginaSegura <= 1 ? 0.4 : 1,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="chevron-left"
                size={18}
                color={fg}
              />
            </Pressable>
            <Pressable
              disabled={paginaSegura >= totalPaginas}
              onPress={onNext}
              accessibilityLabel="Página siguiente"
              style={[
                styles.pageBtn,
                {
                  borderColor: border,
                  backgroundColor: surface,
                  opacity: paginaSegura >= totalPaginas ? 0.4 : 1,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="chevron-right"
                size={18}
                color={fg}
              />
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16 },
  title: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  truncation: { fontSize: 12, fontWeight: '500', marginBottom: 14 },
  item: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  content: { flex: 1 },
  product: { fontSize: 14, fontWeight: '600' },
  decision: { fontSize: 12, marginTop: 2 },
  amounts: { alignItems: 'flex-end' },
  cantidad: { fontSize: 16, fontWeight: '700' },
  mermas: { fontSize: 11, marginTop: 1 },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  paginationInfo: { fontSize: 12, fontWeight: '500' },
  paginationBtns: { flexDirection: 'row', gap: 6 },
  pageBtn: {
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 36,
  },
});
