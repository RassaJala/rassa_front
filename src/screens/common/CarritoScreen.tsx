import React from 'react';
import { Alert, FlatList, Image, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors } from '@/constants/colors';
import { useCartStore } from '@/store/cartStore';
import type { CartItem } from '@/store/cartStore';
import { useTheme } from '@/store/ThemeContext';

function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const envUrl = String(process.env.EXPO_PUBLIC_API_URL ?? '');
  const base = envUrl.replace(/\/api\/?$/, '');
  return `${base}${path}`;
}

// Cart color tokens from theme
const rowBg = colors.cartRowBg;
const placeholderBg = colors.cartPlaceholderBg;
const btnBg = colors.cartBtnBg;
const btnDisabledBg = colors.cartBtnDisabledBg;

function CartRow({
  item,
  onRemove,
  onInc,
  onDec,
  fg,
  muted,
}: {
  item: CartItem;
  onRemove: () => void;
  onInc: () => void;
  onDec: () => void;
  fg: string;
  muted: string;
}) {
  const uri = mediaUrl(item.foto);
  return (
    <View
      className="mb-3 flex-row items-center rounded-2xl px-4 py-3"
      style={{ backgroundColor: rowBg }}
    >
      {/* Image */}
      <View
        className="items-center justify-center overflow-hidden rounded-xl"
        style={{ width: 60, height: 60, backgroundColor: placeholderBg }}
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
          onPress={onDec}
          className="items-center justify-center rounded-full"
          style={{ width: 28, height: 28, backgroundColor: btnBg }}
        >
          <MaterialCommunityIcons name="minus" size={16} color={fg} />
        </Pressable>

        <Text
          className="mx-2 text-sm font-bold"
          style={{ color: fg, minWidth: 20, textAlign: 'center' }}
        >
          {item.cantidad}
        </Text>

        <Pressable
          onPress={onInc}
          disabled={item.cantidad >= item.stock}
          className="items-center justify-center rounded-full"
          style={{
            width: 28,
            height: 28,
            backgroundColor:
              item.cantidad >= item.stock ? btnDisabledBg : btnBg,
          }}
        >
          <MaterialCommunityIcons
            name="plus"
            size={16}
            color={item.cantidad >= item.stock ? muted : fg}
          />
        </Pressable>
      </View>

      {/* Subtotal + remove */}
      <View className="ml-3 items-end" style={{ minWidth: 60 }}>
        <Text className="text-sm font-bold" style={{ color: colors.primary }}>
          ${(item.precio * item.cantidad).toFixed(2)}
        </Text>
        <Pressable onPress={onRemove} className="mt-1">
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

export default function CarritoScreen(): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const clearCart = useCartStore((s) => s.clearCart);
  const total = useCartStore((s) => s.total);

  const bg = isDark ? colors.admBgD : colors.admBgL;
  const fg = isDark ? colors.admFgD : colors.admFgL;
  const muted = isDark ? colors.admMutedD : colors.admMutedL;
  const border = isDark ? colors.admBorderD : colors.admBorderL;

  if (items.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['top']}>
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <MaterialCommunityIcons name="cart-outline" size={64} color={muted} />
          <Text
            style={{
              marginTop: 16,
              fontSize: 22,
              fontWeight: '700',
              color: fg,
            }}
          >
            Carrito vacío
          </Text>
          <Text
            style={{
              marginTop: 8,
              fontSize: 14,
              color: muted,
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
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['top']}>
      <View style={{ flex: 1, paddingTop: 8, paddingHorizontal: 16 }}>
        {/* Header */}
        <View
          className="mb-4 flex-row items-center justify-between"
          style={{ paddingTop: 12 }}
        >
          <Text className="text-2xl font-bold" style={{ color: fg }}>
            Mi Carrito
          </Text>
          <Pressable onPress={clearCart}>
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
              fg={fg}
              muted={muted}
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
            backgroundColor: isDark ? colors.admSurfaceD : colors.surface,
            borderTopWidth: 1,
            borderTopColor: border,
          }}
        >
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-base" style={{ color: muted }}>
              {items.reduce((s, i) => s + i.cantidad, 0)} productos
            </Text>
            <View className="flex-row items-baseline">
              <Text className="mr-1 text-xs" style={{ color: muted }}>
                Total
              </Text>
              <Text className="text-xl font-bold" style={{ color: fg }}>
                ${total().toFixed(2)}
              </Text>
            </View>
          </View>
          <Pressable
            className="items-center justify-center rounded-xl py-3.5"
            style={{ backgroundColor: colors.primary }}
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
