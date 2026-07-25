import React from 'react';
import { Alert, FlatList, Image, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors, themeColors } from '@/constants/colors';
import { mediaUrl } from '@/services/api';
import { useCartStore } from '@/store/cartStore';
import type { CartItem } from '@/store/cartStore';
import { useTheme } from '@/store/ThemeContext';

// ── Cart color tokens from theme ──
function cartColors(isDark: boolean) {
  return {
    rowBg: isDark ? colors.cartRowBgD : colors.cartRowBg,
    placeholderBg: isDark ? colors.cartPlaceholderBgD : colors.cartPlaceholderBg,
    btnBg: isDark ? colors.cartBtnBgD : colors.cartBtnBg,
    btnDisabledBg: isDark ? colors.cartBtnDisabledBgD : colors.cartBtnDisabledBg,
  };
}

function CartRow({
  item,
  onRemove,
  onInc,
  onDec,
  fg,
  muted,
  isDark,
}: {
  item: CartItem;
  onRemove: () => void;
  onInc: () => void;
  onDec: () => void;
  fg: string;
  muted: string;
  isDark: boolean;
}) {
  const cc = cartColors(isDark);
  const atStockLimit = item.cantidad >= item.stock;
  const atMinLimit = item.cantidad <= 1;
  const uri = mediaUrl(item.foto);
  return (
    <View
      className="mb-3 flex-row items-center rounded-2xl px-4 py-3"
      style={{ backgroundColor: cc.rowBg }}
    >
      {/* Image */}
      <View
        className="items-center justify-center overflow-hidden rounded-xl"
        style={{ width: 60, height: 60, backgroundColor: cc.placeholderBg }}
      >
        {uri ? (
          <Image
            source={{ uri }}
            style={{ width: 60, height: 60 }}
            resizeMode="cover"
          />
        ) : (
          <MaterialCommunityIcons
            name="image-off-outline"
            size={28}
            color={muted}
          />
        )}
      </View>

      {/* Info */}
      <View className="ml-3 flex-1">
        <Text
          className="text-sm font-semibold"
          style={{ color: fg }}
          numberOfLines={1}
        >
          {item.producto}
        </Text>
        <Text className="mt-0.5 text-xs" style={{ color: muted }}>
          ${item.precio}/{item.unidad}
        </Text>
      </View>

      {/* Quantity controls */}
      <View className="flex-row items-center">
        <Pressable
          testID="qty-dec"
          onPress={onDec}
          disabled={atMinLimit}
          accessibilityLabel="Decrementar cantidad"
          className="items-center justify-center rounded-full"
          style={{
            width: 28,
            height: 28,
            backgroundColor: atMinLimit ? cc.btnDisabledBg : cc.btnBg,
          }}
        >
          <MaterialCommunityIcons
            name="minus"
            size={16}
            color={atMinLimit ? muted : fg}
          />
        </Pressable>

        <Text
          className="mx-2 text-sm font-bold"
          style={{ color: fg, minWidth: 20, textAlign: 'center' }}
        >
          {item.cantidad}
        </Text>

        <Pressable
          testID="qty-inc"
          onPress={onInc}
          disabled={atStockLimit}
          accessibilityLabel="Incrementar cantidad"
          className="items-center justify-center rounded-full"
          style={{
            width: 28,
            height: 28,
            backgroundColor: atStockLimit ? cc.btnDisabledBg : cc.btnBg,
          }}
        >
          <MaterialCommunityIcons
            name="plus"
            size={16}
            color={atStockLimit ? muted : fg}
          />
        </Pressable>
      </View>

      {/* Subtotal + remove */}
      <View className="ml-3 items-end" style={{ minWidth: 60 }}>
        <Text className="text-sm font-bold" style={{ color: colors.primary }}>
          ${(item.precio * item.cantidad).toFixed(2)}
        </Text>
        <Pressable testID="remove-item" onPress={onRemove} className="mt-1">
          <MaterialCommunityIcons
            name="trash-can-outline"
            size={16}
            color={colors.error}
          />
        </Pressable>
      </View>
    </View>
  );
}

function handleClearCart(clearCart: () => void) {
  Alert.alert(
    'Vaciar carrito',
    '¿Estás seguro? Se eliminarán todos los productos.',
    [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Vaciar', style: 'destructive', onPress: clearCart },
    ],
  );
}

export default function CarritoScreen(): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const tc = themeColors(isDark);
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const clearCart = useCartStore((s) => s.clearCart);
  const total = useCartStore((s) => s.total);

  const totalItems = items.reduce((s, i) => s + i.cantidad, 0);

  if (items.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: tc.bg }} edges={['top']}>
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
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
              fontWeight: '700',
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
              textAlign: 'center',
            }}
          >
            Agregá productos desde el catálogo para comenzar tu compra.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tc.bg }} edges={['top']}>
      <View style={{ flex: 1, paddingTop: 8, paddingHorizontal: 16 }}>
        {/* Header */}
        <View
          className="mb-4 flex-row items-center justify-between"
          style={{ paddingTop: 12 }}
        >
          <Text className="text-2xl font-bold" style={{ color: tc.fg }}>
            Mi Carrito
          </Text>
          <Pressable testID="clear-cart" onPress={() => handleClearCart(clearCart)}>
            <Text
              className="text-sm font-semibold"
              style={{ color: colors.error }}
            >
              Vaciar
            </Text>
          </Pressable>
        </View>

        {/* Items */}
        <FlatList
          data={items}
          keyExtractor={(i) => i.id_producto_semanal.toString()}
          renderItem={({ item }) => (
            <CartRow
              item={item}
              fg={tc.fg}
              muted={tc.muted}
              isDark={isDark}
              onRemove={() => removeItem(item.id_producto_semanal)}
              onInc={() =>
                updateQuantity(item.id_producto_semanal, item.cantidad + 1)
              }
              onDec={() =>
                updateQuantity(item.id_producto_semanal, item.cantidad - 1)
              }
            />
          )}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />

        {/* Total + Checkout */}
        <View
          className="mb-4 rounded-2xl px-5 py-4"
          style={{
            backgroundColor: tc.surface,
            borderTopWidth: 1,
            borderTopColor: tc.border,
          }}
        >
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-base" style={{ color: tc.muted }}>
              {totalItems} productos
            </Text>
            <View className="flex-row items-baseline">
              <Text className="mr-1 text-xs" style={{ color: tc.muted }}>
                Total
              </Text>
              <Text className="text-xl font-bold" style={{ color: tc.fg }}>
                ${total().toFixed(2)}
              </Text>
            </View>
          </View>
          <Pressable
            testID="checkout-btn"
            className="items-center justify-center rounded-xl py-3.5"
            style={{ backgroundColor: tc.brand }}
            onPress={() =>
              Alert.alert(
                'Próximamente',
                'El flujo de pago estará disponible pronto.',
              )
            }
          >
            <Text
              className="text-base font-bold"
              style={{ color: colors.iconWhite }}
            >
              Continuar compra
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
