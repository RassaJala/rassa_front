import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors } from '@/constants/colors';
import {
  formatTimestamp,
  getStatusColor,
  STATUS_LABELS,
} from '@/constants/orderTimeline';
import { useOrderTimeline } from '@/hooks/useOrderTimeline';
import { useTheme } from '@/store/ThemeContext';

const DOT_SIZE = 12;
const GUTTER_WIDTH = 28;
const MIN_HEIGHT = 64;

const styles = StyleSheet.create({
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    marginTop: 4,
  },
  gutter: {
    width: GUTTER_WIDTH,
    alignItems: 'center',
  },
  gutterLine: {
    flex: 1,
    width: 2,
  },
  row: {
    flexDirection: 'row',
    minHeight: MIN_HEIGHT,
  },
  content: {
    flex: 1,
    paddingLeft: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  metaText: {
    fontSize: 12,
  },
  centeredContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  centeredContainerWide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  errorText: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 15,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
});

function buildDescription(entry: {
  readonly estado_anterior: string | null;
  readonly estado_nuevo: string;
}): string {
  if (entry.estado_anterior === null) {
    return 'Pedido creado';
  }
  const fromLabel =
    STATUS_LABELS[entry.estado_anterior] ?? entry.estado_anterior;
  const toLabel = STATUS_LABELS[entry.estado_nuevo] ?? entry.estado_nuevo;
  return `${fromLabel} → ${toLabel}`;
}

interface TimelineEntryProps {
  readonly entry: {
    readonly id_historial: number;
    readonly estado_anterior: string | null;
    readonly estado_nuevo: string;
    readonly creado_en: string;
    readonly cambiado_por_nombre: string | null;
  };
  readonly isLast: boolean;
  readonly lineColor: string;
  readonly dotColor: string;
  readonly fg: string;
  readonly mutedColor: string;
}

function TimelineEntry({
  entry,
  isLast,
  lineColor,
  dotColor,
  fg,
  mutedColor,
}: TimelineEntryProps): React.JSX.Element {
  return (
    <View style={styles.row}>
      {/* Timeline gutter */}
      <View style={styles.gutter}>
        {/* Dot */}
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        {/* Vertical line */}
        {!isLast && (
          <View style={[styles.gutterLine, { backgroundColor: lineColor }]} />
        )}
      </View>

      {/* Content */}
      <View style={[styles.content, { paddingBottom: isLast ? 0 : 20 }]}>
        <Text style={[styles.title, { color: fg }]}>
          {STATUS_LABELS[entry.estado_nuevo] ?? entry.estado_nuevo}
        </Text>
        <Text style={[styles.subtitle, { color: mutedColor }]}>
          {buildDescription(entry)}
        </Text>
        <View style={styles.metaRow}>
          <MaterialCommunityIcons
            name="clock-outline"
            size={DOT_SIZE}
            color={mutedColor}
          />
          <Text style={[styles.metaText, { color: mutedColor }]}>
            {formatTimestamp(entry.creado_en)}
          </Text>
          {entry.cambiado_por_nombre !== null && (
            <>
              <Text style={[styles.metaText, { color: mutedColor }]}>·</Text>
              <MaterialCommunityIcons
                name="account-outline"
                size={DOT_SIZE}
                color={mutedColor}
              />
              <Text style={[styles.metaText, { color: mutedColor }]}>
                {entry.cambiado_por_nombre}
              </Text>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

interface OrderTimelineProps {
  readonly orderId: number;
}

export default function OrderTimeline({
  orderId,
}: OrderTimelineProps): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const bg = isDark ? colors.admBgD : colors.admBgL;
  const surface = isDark ? colors.admSurfaceD : colors.admSurfaceL;
  const fg = isDark ? colors.admFgD : colors.admFgL;
  const muted = isDark ? colors.admMutedD : colors.admMutedL;
  const border = isDark ? colors.admBorderD : colors.admBorderL;
  const brand = isDark ? colors.admBrandD : colors.admBrandL;

  const { entries, isLoading, isError, refetch } = useOrderTimeline(orderId);

  // Loading
  if (isLoading) {
    return (
      <View style={[styles.centeredContainer, { backgroundColor: bg }]}>
        <ActivityIndicator
          size="large"
          color={brand}
          testID="loading-indicator"
        />
      </View>
    );
  }

  // Error
  if (isError) {
    return (
      <View style={[styles.centeredContainerWide, { backgroundColor: bg }]}>
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={40}
          color={muted}
        />
        <Text style={[styles.errorText, { color: muted }]}>
          Error al cargar el historial
        </Text>
        <Pressable
          onPress={() => void refetch()}
          style={[styles.retryBtn, { borderColor: border }]}
        >
          <MaterialCommunityIcons name="refresh" size={18} color={brand} />
          <Text style={[styles.retryBtnText, { color: brand }]}>
            Reintentar
          </Text>
        </Pressable>
      </View>
    );
  }

  // Empty
  if (entries.length === 0) {
    return (
      <View style={[styles.centeredContainer, { backgroundColor: bg }]}>
        <MaterialCommunityIcons name="history" size={40} color={muted} />
        <Text style={{ marginTop: 12, fontSize: 15, color: muted }}>
          Sin historial de cambios
        </Text>
      </View>
    );
  }

  // Success
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: bg }}
      contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={[styles.card, { backgroundColor: surface, borderColor: border }]}
      >
        {entries.map((entry, index) => {
          const isLast = index === entries.length - 1;
          const dotColor = getStatusColor(entry.estado_nuevo, border);

          return (
            <TimelineEntry
              key={entry.id_historial}
              entry={entry}
              isLast={isLast}
              lineColor={border}
              dotColor={dotColor}
              fg={fg}
              mutedColor={muted}
            />
          );
        })}
      </View>
    </ScrollView>
  );
}
