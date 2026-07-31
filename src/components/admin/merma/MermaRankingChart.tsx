import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { getDecisionColor } from './colors';

export interface RankingItem {
  nombre: string;
  total: number;
}

interface Props {
  readonly isSingleProduct: boolean;
  readonly ranking: RankingItem[];
  readonly maxTotal: number;
  readonly surface: string;
  readonly fg: string;
  readonly muted: string;
  readonly border: string;
  readonly coral: string;
  readonly isDark: boolean;
}

// Palette for ranked bars; module-scope so color literals are not inline styles.
const RANK_PALETTE = ['#E46C38', '#F2A900', '#CED295'];
const RANK_GRAY = { light: '#D1D5DB', dark: '#4B5563' } as const;
const RANK_GREEN = { light: '#3A6D56', dark: '#4A8A63' } as const;

function rankColor(
  index: number,
  count: number,
  coral: string,
  isDark: boolean,
): string {
  if (count <= 1) return isDark ? RANK_GRAY.dark : RANK_GRAY.light;
  if (index === 0) return coral;
  if (index === 1) return RANK_PALETTE[0] ?? '#E46C38';
  if (index === 2) return RANK_PALETTE[1] ?? '#F2A900';
  return isDark ? RANK_GREEN.dark : RANK_GREEN.light;
}

export function MermaRankingChart({
  isSingleProduct,
  ranking,
  maxTotal,
  surface,
  fg,
  muted,
  border,
  coral,
  isDark,
}: Props): React.JSX.Element {
  return (
    <View
      style={[styles.card, { backgroundColor: surface, borderColor: border }]}
    >
      <Text style={[styles.title, { color: fg }]}>
        {isSingleProduct
          ? 'Desglose por decisión'
          : 'Ranking de productos más mermados'}
      </Text>
      <Text style={[styles.subtitle, { color: muted }]}>
        {isSingleProduct
          ? 'Cantidad de unidades por cada decisión tomada'
          : 'La barra más larga = el producto que más pérdidas genera'}
      </Text>
      {ranking.length > 0 ? (
        ranking.map((item, idx) => {
          const pct = (item.total / maxTotal) * 100;
          return (
            <View
              key={isSingleProduct ? `d-${item.nombre}` : item.nombre}
              style={styles.barItem}
            >
              <View style={styles.labelRow}>
                {!isSingleProduct && (
                  <Text style={[styles.rank, { color: muted }]}>
                    {idx + 1}.
                  </Text>
                )}
                <Text style={[styles.label, { color: fg }]} numberOfLines={1}>
                  {item.nombre}
                </Text>
                <Text style={[styles.value, { color: fg }]}>
                  {item.total} uds
                </Text>
              </View>
              <View style={[styles.track, { backgroundColor: border }]}>
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${Math.max(pct, 3)}%`,
                      backgroundColor: isSingleProduct
                        ? getDecisionColor(item.nombre)
                        : rankColor(idx, ranking.length, coral, isDark),
                    },
                  ]}
                />
              </View>
            </View>
          );
        })
      ) : (
        <Text style={[styles.empty, { color: muted }]}>
          No hay datos de productos para mostrar.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16 },
  title: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  subtitle: { fontSize: 12, fontWeight: '500', marginBottom: 14 },
  barItem: { marginBottom: 12 },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  rank: { width: 22, fontSize: 12, fontWeight: '600' },
  label: { flex: 1, fontSize: 13, fontWeight: '500' },
  value: { fontSize: 13, fontWeight: '700', marginLeft: 8, textAlign: 'right' },
  track: { height: 14, borderRadius: 7, overflow: 'hidden', width: '100%' },
  fill: { height: '100%', borderRadius: 8, minWidth: 4 },
  empty: { textAlign: 'center', paddingVertical: 20 },
});
