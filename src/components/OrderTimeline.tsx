import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { MaterialCommunityIcons } from "@expo/vector-icons";

import {
  buildDescription,
  DOT_SIZE,
  formatTimestamp,
  getStatusColor,
  isNotFoundError,
  STATUS_LABELS,
} from "@/constants/orderTimeline";
import { useAdminColors } from "@/hooks/useAdminColors";
import { useOrderTimeline } from "@/hooks/useOrderTimeline";

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
    alignItems: "center",
  },
  gutterLine: {
    flex: 1,
    width: 2,
  },
  row: {
    flexDirection: "row",
    minHeight: MIN_HEIGHT,
  },
  content: {
    flex: 1,
    paddingLeft: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 4,
  },
  metaText: {
    fontSize: 12,
  },
  centeredContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  errorText: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 15,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
});

interface OrderTimelineProps {
  readonly orderId: number;
  readonly onBack?: () => void;
}

export default function OrderTimeline({
  orderId,
  onBack,
}: OrderTimelineProps): React.JSX.Element {
  const { bg, surface, fg, muted, border, brand } = useAdminColors();

  const { entries, isLoading, isError, error, refetch } =
    useOrderTimeline(orderId);

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
    const is404 = isNotFoundError(error);
    return (
      <View style={[styles.centeredContainer, { backgroundColor: bg }]}>
        <MaterialCommunityIcons
          name={is404 ? "package-variant-closed" : "alert-circle-outline"}
          size={40}
          color={muted}
        />
        <Text style={[styles.errorText, { color: muted }]}>
          {is404 ? "Pedido no encontrado" : "Error al cargar el historial"}
        </Text>
        {is404 && onBack ? (
          <Pressable
            onPress={onBack}
            style={[styles.retryBtn, { borderColor: border }]}
          >
            <MaterialCommunityIcons name="arrow-left" size={18} color={brand} />
            <Text style={[styles.retryBtnText, { color: brand }]}>Volver</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => void refetch()}
            style={[styles.retryBtn, { borderColor: border }]}
          >
            <MaterialCommunityIcons name="refresh" size={18} color={brand} />
            <Text style={[styles.retryBtnText, { color: brand }]}>
              Reintentar
            </Text>
          </Pressable>
        )}
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
            <View key={entry.id_historial} style={styles.row}>
              <View style={styles.gutter}>
                <View style={[styles.dot, { backgroundColor: dotColor }]} />
                {!isLast && (
                  <View
                    style={[styles.gutterLine, { backgroundColor: border }]}
                  />
                )}
              </View>
              <View
                style={[styles.content, { paddingBottom: isLast ? 0 : 20 }]}
              >
                <Text style={[styles.title, { color: fg }]}>
                  {STATUS_LABELS[entry.estado_nuevo] ?? entry.estado_nuevo}
                </Text>
                <Text style={[styles.subtitle, { color: muted }]}>
                  {buildDescription(entry)}
                </Text>
                <View style={styles.metaRow}>
                  <MaterialCommunityIcons
                    name="clock-outline"
                    size={DOT_SIZE}
                    color={muted}
                  />
                  <Text style={[styles.metaText, { color: muted }]}>
                    {formatTimestamp(entry.creado_en)}
                  </Text>
                  {entry.cambiado_por_nombre !== null && (
                    <>
                      <Text style={[styles.metaText, { color: muted }]}>·</Text>
                      <MaterialCommunityIcons
                        name="account-outline"
                        size={DOT_SIZE}
                        color={muted}
                      />
                      <Text style={[styles.metaText, { color: muted }]}>
                        {entry.cambiado_por_nombre}
                      </Text>
                    </>
                  )}
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
