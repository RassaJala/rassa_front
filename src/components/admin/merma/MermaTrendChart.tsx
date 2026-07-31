import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export interface TrendItem {
  nombre: string;
  total: number;
}

interface Props {
  readonly data: TrendItem[];
  readonly maxTotal: number;
  readonly agruparPor: 'mes' | 'semana';
  readonly surface: string;
  readonly fg: string;
  readonly muted: string;
  readonly border: string;
  readonly brand: string;
}

export function MermaTrendChart({
  data,
  maxTotal,
  agruparPor,
  surface,
  fg,
  muted,
  border,
  brand,
}: Props): React.JSX.Element {
  return (
    <View
      style={[styles.card, { backgroundColor: surface, borderColor: border }]}
    >
      <Text style={[styles.title, { color: fg }]}>
        Evolución por {agruparPor === 'mes' ? 'mes' : 'semana'}
      </Text>
      <Text style={[styles.subtitle, { color: muted }]}>
        Cada barra = total de unidades mermadas en ese período
      </Text>
      {data.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.row}>
            {data.map((item) => {
              const pct = (item.total / maxTotal) * 100;
              return (
                <View key={item.nombre} style={styles.col}>
                  <Text style={[styles.value, { color: fg }]}>
                    {item.total}
                  </Text>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: `${Math.max(pct, 4)}%`,
                        backgroundColor: brand,
                      },
                    ]}
                  />
                  <Text style={[styles.label, { color: muted }]}>
                    {item.nombre}
                  </Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      ) : (
        <Text style={[styles.empty, { color: muted }]}>
          No hay suficientes datos para mostrar tendencia.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16 },
  title: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  subtitle: { fontSize: 12, fontWeight: '500', marginBottom: 14 },
  row: { flexDirection: 'row', alignItems: 'flex-end', height: 160, gap: 4 },
  col: { flex: 1, alignItems: 'center' },
  value: { fontSize: 11, fontWeight: '700', marginBottom: 4 },
  bar: { width: '100%', borderRadius: 4, minHeight: 4, maxWidth: 36 },
  label: { fontSize: 9, fontWeight: '600', marginTop: 4, textAlign: 'center' },
  empty: { textAlign: 'center', paddingVertical: 20 },
});
