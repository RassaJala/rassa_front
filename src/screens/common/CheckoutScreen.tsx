import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Sentry from "@sentry/react-native";
import { useMutation } from "@tanstack/react-query";

import FormErrorBanner from "@/components/FormErrorBanner";
import { colors, themeColors } from "@/constants/colors";
import { createOrder } from "@/services/orders";
import type { CreateOrderPayload } from "@/services/orders";
import { useCartStore } from "@/store/cartStore";
import type { CartItem } from "@/store/cartStore";
import { useTheme } from "@/store/ThemeContext";
import type { BuyerStackParamList } from "@/types";
import { isSafeDetail, parseApiError } from "@/utils/apiErrors";

type Nav = NativeStackNavigationProp<BuyerStackParamList>;

const IVA_RATE = 0.21;
const ORDER_ERROR_FALLBACK = "Error al procesar el pedido. Intente de nuevo.";
const CHECKOUT_AMBIGUOUS_ERROR =
  "No pudimos confirmar si tu pedido se creó. Revisá Mis Pedidos antes de intentar de nuevo.";

function extractCheckoutError(error: unknown): string {
  const parsed = parseApiError(error, ORDER_ERROR_FALLBACK);

  if (parsed !== ORDER_ERROR_FALLBACK) {
    return parsed;
  }

  return extractResponseDataError(error) ?? ORDER_ERROR_FALLBACK;
}

// Sin `response` HTTP no sabemos si el pedido se creó (timeout/red/offline).
function isAmbiguousOrderError(error: unknown): boolean {
  const candidate =
    error instanceof Error && error.cause !== undefined ? error.cause : error;
  return (candidate as { response?: unknown } | null)?.response === undefined;
}

function extractResponseDataError(error: unknown): string | null {
  const candidate =
    error instanceof Error && error.cause !== undefined ? error.cause : error;
  const data = (candidate as { response?: { data?: unknown } })?.response?.data;

  if (typeof data === "string") {
    const trimmed = data.trim();
    if (
      trimmed === "" ||
      trimmed.startsWith("<") ||
      trimmed.includes("Traceback (most recent call last)") ||
      trimmed.includes("django.db")
    ) {
      return null;
    }
    return trimmed;
  }

  if (data === null || typeof data !== "object") {
    return null;
  }

  // DRF non-field errors llegan como array de strings: ["Stock insuficiente..."]
  if (Array.isArray(data)) {
    const first = (data as unknown[])[0];
    if (first !== undefined && String(first).trim() !== "") {
      return String(first);
    }
    return null;
  }

  return extractRecordError(data as Record<string, unknown>);
}

function extractRecordError(record: Record<string, unknown>): string | null {
  for (const key of ["detail", "message", "error"] as const) {
    const value = record[key];
    if (typeof value === "string" && value !== "" && isSafeDetail(value)) {
      return value;
    }
  }

  for (const value of Object.values(record)) {
    if (Array.isArray(value)) {
      const first = (value as unknown[])[0];
      if (first !== undefined) {
        const text = String(first);
        if (isSafeDetail(text)) return text;
      }
    }
  }

  return null;
}

function CheckoutRow({
  item,
  fg,
  muted,
  isDark,
}: {
  item: CartItem;
  fg: string;
  muted: string;
  isDark: boolean;
}): React.JSX.Element {
  const rowBg = isDark ? colors.cartRowBgD : colors.cartRowBg;

  return (
    <View
      className="mb-3 rounded-2xl px-4 py-3"
      style={{ backgroundColor: rowBg }}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <Text
            className="text-sm font-semibold"
            style={{ color: fg }}
            numberOfLines={1}
          >
            {item.producto}
          </Text>
          <Text className="mt-0.5 text-xs" style={{ color: muted }}>
            {`$${Number(item.precio).toFixed(2)}/${item.unidad}`}
          </Text>
          <Text className="mt-1 text-xs" style={{ color: muted }}>
            {`Cantidad: ${item.cantidad}`}
          </Text>
        </View>
        <Text className="text-sm font-bold" style={{ color: colors.primary }}>
          {`$${(item.precio * item.cantidad).toFixed(2)}`}
        </Text>
      </View>
    </View>
  );
}

export default function CheckoutScreen(): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === "dark";
  const tc = themeColors(isDark);
  const navigation = useNavigation<Nav>();
  const items = useCartStore((s) => s.items);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const orderMutation = useMutation({
    mutationFn: createOrder,
  });

  const handleConfirm = useCallback(async () => {
    if (orderMutation.isPending) {
      return;
    }

    setErrorMessage(null);

    const payload: CreateOrderPayload = {
      items: items.map((i) => ({
        id_producto_semanal: i.id_producto_semanal,
        cantidad: i.cantidad,
      })),
    };

    try {
      const order = await orderMutation.mutateAsync(payload);
      useCartStore.getState().clearCart();
      navigation.replace("OrderSuccess", {
        orderId: order.id_pedido,
        total: String(order.total),
        estado: order.estado,
      });
    } catch (error) {
      Sentry.captureException(error, {
        tags: { flow: "checkout", step: "createOrder" },
      });
      if (isAmbiguousOrderError(error)) {
        setErrorMessage(CHECKOUT_AMBIGUOUS_ERROR);
      } else {
        setErrorMessage(extractCheckoutError(error));
      }
    }
  }, [items, navigation, orderMutation]);

  if (items.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: tc.bg }} edges={["top"]}>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <MaterialCommunityIcons
            name="cart-outline"
            size={64}
            color={tc.muted}
          />
          <Text
            style={{
              marginTop: 16,
              fontSize: 22,
              fontWeight: "700",
              color: tc.fg,
            }}
          >
            Carrito vacío
          </Text>
          <Text
            style={{
              marginTop: 8,
              fontSize: 14,
              color: tc.muted,
              textAlign: "center",
            }}
          >
            Agregá productos desde el catálogo para comenzar tu compra.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const subtotal = items.reduce((sum, i) => sum + i.precio * i.cantidad, 0);
  const iva = subtotal * IVA_RATE;
  const total = subtotal + iva;
  const disabledBg = isDark
    ? colors.cartBtnDisabledBgD
    : colors.cartBtnDisabledBg;
  const buttonBg = orderMutation.isPending ? disabledBg : tc.brand;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tc.bg }} edges={["top"]}>
      <View style={{ flex: 1, paddingTop: 8, paddingHorizontal: 16 }}>
        {/* Header */}
        <View
          className="mb-4 flex-row items-center justify-between"
          style={{ paddingTop: 12 }}
        >
          <Text className="text-2xl font-bold" style={{ color: tc.fg }}>
            Confirmar pedido
          </Text>
        </View>

        <FormErrorBanner message={errorMessage} isDark={isDark} />

        {/* Items */}
        <FlatList
          data={items}
          keyExtractor={(i) => i.id_producto_semanal.toString()}
          renderItem={({ item }) => (
            <CheckoutRow
              item={item}
              fg={tc.fg}
              muted={tc.muted}
              isDark={isDark}
            />
          )}
          contentContainerStyle={{ paddingBottom: 16 }}
          showsVerticalScrollIndicator={false}
        />

        {/* Totals */}
        <View
          className="mb-4 rounded-2xl px-5 py-4"
          style={{
            backgroundColor: tc.surface,
            borderTopWidth: 1,
            borderTopColor: tc.border,
          }}
        >
          <View className="mb-1 flex-row items-center justify-between">
            <Text className="text-sm" style={{ color: tc.muted }}>
              Subtotal
            </Text>
            <Text className="text-sm font-semibold" style={{ color: tc.fg }}>
              {`$${subtotal.toFixed(2)}`}
            </Text>
          </View>
          <View className="mb-1 flex-row items-center justify-between">
            <Text className="text-sm" style={{ color: tc.muted }}>
              IVA (21%)
            </Text>
            <Text className="text-sm font-semibold" style={{ color: tc.fg }}>
              {`$${iva.toFixed(2)}`}
            </Text>
          </View>
          <View
            className="mt-2 flex-row items-center justify-between border-t pt-2"
            style={{ borderTopColor: tc.border }}
          >
            <Text className="text-base font-bold" style={{ color: tc.fg }}>
              Total
            </Text>
            <Text className="text-xl font-bold" style={{ color: tc.fg }}>
              {`$${total.toFixed(2)}`}
            </Text>
          </View>

          <Pressable
            testID="confirm-order-btn"
            className="mt-4 items-center justify-center rounded-xl py-3.5"
            style={{ backgroundColor: buttonBg }}
            disabled={orderMutation.isPending}
            onPress={() => void handleConfirm()}
          >
            {orderMutation.isPending ? (
              <ActivityIndicator size="small" color={colors.iconWhite} />
            ) : (
              <Text
                className="text-base font-bold"
                style={{ color: colors.iconWhite }}
              >
                Confirmar pedido
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
