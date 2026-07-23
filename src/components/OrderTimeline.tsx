import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors } from '@/constants/colors';
import { useOrderTimeline } from '@/hooks/useOrderTimeline';
import { useTheme } from '@/store/ThemeContext';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  in_preparation: 'En preparación',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm} ${hh}:${min}`;
}

function getStatusDot(
  status: string,
  isDark: boolean,
  border: string,
): string {
  switch (status) {
    case 'pending':
      return colors.accent;
    case 'confirmed':
    case 'shipped':
    case 'delivered':
      return isDark ? colors.admBrandD : colors.admBrandL;
    case 'in_preparation':
      return isDark ? colors.admBrandD : colors.admBrandL;
    case 'cancelled':
      return colors.brandRedCoral;
    default:
      return border;
  }
}

function buildDescription(entry: {
  readonly previous_status: string | null;
  readonly new_status: string;
}): string {
  if (entry.previous_status === null) {
    return 'Pedido creado';
  }
  const fromLabel = STATUS_LABELS[entry.previous_status] ?? entry.previous_status;
  const toLabel = STATUS_LABELS[entry.new_status] ?? entry.new_status;
  return `${fromLabel} → ${toLabel}`;
}

interface TimelineEntryProps {
  readonly entry: {
    readonly id: number;
    readonly previous_status: string | null;
    readonly new_status: string;
    readonly changed_at: string;
    readonly changed_by: string | null;
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
    <View style={{ flexDirection: 'row', minHeight: 64 }}>
      {/* Timeline gutter */}
      <View style={{ width: 28, alignItems: 'center' }}>
        {/* Dot */}
        <View
          style={{
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: dotColor,
            marginTop: 4,
          }}
        />
        {/* Vertical line */}
        {!isLast && (
          <View
            style={{
              flex: 1,
              width: 2,
              backgroundColor: lineColor,
            }}
          />
        )}
      </View>

      {/* Content */}
      <View style={{ flex: 1, paddingLeft: 12, paddingBottom: isLast ? 0 : 20 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: fg }}>
          {STATUS_LABELS[entry.new_status] ?? entry.new_status}
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: mutedColor,
            marginTop: 2,
          }}
        >
          {buildDescription(entry)}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 }}>
          <MaterialCommunityIcons name="clock-outline" size={12} color={mutedColor} />
          <Text style={{ fontSize: 12, color: mutedColor }}>
            {formatTimestamp(entry.changed_at)}
          </Text>
          {entry.changed_by !== null && (
            <>
              <Text style={{ fontSize: 12, color: mutedColor }}>·</Text>
              <MaterialCommunityIcons name="account-outline" size={12} color={mutedColor} />
              <Text style={{ fontSize: 12, color: mutedColor }}>
                {entry.changed_by}
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

  const { entries, isLoading, isError, error, refetch } =
    useOrderTimeline(orderId);

  // Loading
  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 }}>
        <ActivityIndicator size="large" color={brand} />
      </View>
    );
  }

  // Error
  if (isError) {
    return (
      <View style={{ flex: 1, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 24 }}>
        <MaterialCommunityIcons name="alert-circle-outline" size={40} color={muted} />
        <Text style={{ marginTop: 12, textAlign: 'center', fontSize: 15, color: muted }}>
          {error?.message ?? 'Error al cargar el historial'}
        </Text>
        <Pressable
          onPress={() => void refetch()}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            marginTop: 16,
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: border,
          }}
        >
          <MaterialCommunityIcons name="refresh" size={18} color={brand} />
          <Text style={{ fontSize: 14, fontWeight: '600', color: brand }}>
            Reintentar
          </Text>
        </Pressable>
      </View>
    );
  }

  // Empty
  if (entries.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 }}>
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
        style={{
          backgroundColor: surface,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: border,
          padding: 20,
        }}
      >
        {entries.map((entry, index) => {
          const isLast = index === entries.length - 1;
          const dotColor = getStatusDot(entry.new_status, isDark, border);

          return (
            <TimelineEntry
              key={entry.id}
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
