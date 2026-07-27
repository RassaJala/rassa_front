import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { RouteProp } from "@react-navigation/native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import ErrorBoundary from "@/components/ErrorBoundary";
import OrderTimeline from "@/components/OrderTimeline";
import { useAdminColors } from "@/hooks/useAdminColors";
import type { AdminStackParamList } from "@/types";

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.02,
  },
  card: {
    flex: 1,
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
});

export default function OrderDetailScreen(): React.JSX.Element {
  const { bg, surface, fg, border } = useAdminColors();
  const insets = useSafeAreaInsets();

  const route = useRoute<RouteProp<AdminStackParamList, "OrderDetail">>();
  const { orderId } = route.params;
  const navigation =
    useNavigation<
      NativeStackNavigationProp<AdminStackParamList, "OrderDetail">
    >();

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => ({
            opacity: pressed ? 0.5 : 1,
            ...styles.backButton,
          })}
        >
          <MaterialCommunityIcons name="arrow-left" size={28} color={fg} />
        </Pressable>
        <Text style={[styles.title, { color: fg }]}>Pedido #{orderId}</Text>
      </View>
      <View
        style={[styles.card, { backgroundColor: surface, borderColor: border }]}
      >
        <ErrorBoundary>
          <OrderTimeline orderId={orderId} onBack={() => navigation.goBack()} />
        </ErrorBoundary>
      </View>
    </View>
  );
}
