import React, { useCallback } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors } from '@/constants/colors';
import { useCart } from '@/store/CartContext';
import { useTheme } from '@/store/ThemeContext';
import type { BuyerStackParamList } from '@/types';

type Nav = NativeStackNavigationProp<BuyerStackParamList>;

export default function CarritoScreen(): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const navigation = useNavigation<Nav>();
  const cart = useCart();

  const bg = isDark ? colors.admBgD : colors.admBgL;
  const fg = isDark ? colors.admFgD : colors.admFgL;
  const muted = isDark ? colors.admMutedD : colors.admMutedL;
  const surface = isDark ? colors.admSurfaceD : colors.surface;
  const border = isDark ? colors.admBorderD : colors.admBorderL;
  const brand = isDark ? colors.admBrandD : colors.admBrandL;

  const handleCheckout = useCallback(() => {
    navigation.navigate('Checkout');
  }, [navigation]);

  const formatPrice = useCallback((value: number): string => {
    return `$${(value || 0).toFixed(2)}`;
  }, []);

  const renderItem = useCallback(
    ({ item }: { readonly item: (typeof cart.items)[number] }) => (
      <View
        style={{
          backgroundColor: surface,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: border,
          padding: 14,
          marginBottom: 10,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 15,
              fontWeight: '600',
              color: fg,
            }}
            numberOfLines={1}
          >
            {item.nombre_producto}
          </Text>
          <Text style={{ fontSize: 13, color: muted, marginTop: 2 }}>
            {formatPrice(Number.parseFloat(item.precio))} / ud.
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable
            onPress={() =>
              cart.updateQuantity(item.id_producto_semanal, item.cantidad - 1)
            }
            style={({ pressed }) => ({
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: isDark
                ? colors.admInactiveBgD
                : colors.admInactiveBgL,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <MaterialCommunityIcons name="minus" size={18} color={fg} />
          </Pressable>

          <Text
            style={{
              fontSize: 16,
              fontWeight: '700',
              color: fg,
              minWidth: 24,
              textAlign: 'center',
            }}
          >
            {item.cantidad}
          </Text>

          <Pressable
            onPress={() =>
              cart.updateQuantity(item.id_producto_semanal, item.cantidad + 1)
            }
            style={({ pressed }) => ({
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: brand,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <MaterialCommunityIcons
              name="plus"
              size={18}
              color={colors.iconWhite}
            />
          </Pressable>
        </View>

        <Text
          style={{
            fontSize: 15,
            fontWeight: '700',
            color: fg,
            marginLeft: 12,
            minWidth: 60,
            textAlign: 'right',
          }}
        >
          {formatPrice(Number.parseFloat(item.precio) * item.cantidad)}
        </Text>

        <Pressable
          onPress={() => cart.removeItem(item.id_producto_semanal)}
          style={({ pressed }) => ({
            marginLeft: 8,
            opacity: pressed ? 0.6 : 1,
          })}
          hitSlop={8}
        >
          <MaterialCommunityIcons
            name="close-circle"
            size={22}
            color={colors.error}
          />
        </Pressable>
      </View>
    ),
    [surface, border, fg, muted, brand, isDark, cart, formatPrice],
  );

  const keyExtractor = useCallback(
    (item: (typeof cart.items)[number]) => String(item.id_producto_semanal),
    [cart],
  );

  if (cart.items.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: bg, padding: 16 }}>
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialCommunityIcons name="cart-outline" size={64} color={muted} />
          <Text
            style={{
              marginTop: 16,
              fontSize: 22,
              fontWeight: '700',
              color: fg,
              letterSpacing: -0.3,
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
            Agrega productos desde el catálogo para empezar tu pedido.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {/* Header */}
      <View style={{ paddingTop: 60, paddingHorizontal: 20, paddingBottom: 8 }}>
        <Text
          style={{
            fontSize: 28,
            fontWeight: '700',
            letterSpacing: -0.02,
            color: fg,
          }}
        >
          Carrito
        </Text>
        <Text style={{ fontSize: 14, color: muted, marginTop: 2 }}>
          {cart.totalItems} {cart.totalItems === 1 ? 'producto' : 'productos'}
        </Text>
      </View>

      {/* Items */}
      <FlatList
        data={cart.items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      />

      {/* Bottom bar — total + checkout */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: surface,
          borderTopWidth: 1,
          borderTopColor: border,
          paddingHorizontal: 20,
          paddingTop: 14,
          paddingBottom: 32,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 14, color: muted }}>Subtotal</Text>
          <Text style={{ fontSize: 14, fontWeight: '600', color: fg }}>
            {formatPrice(cart.subtotal)}
          </Text>
        </View>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: 4,
          }}
        >
          <Text style={{ fontSize: 14, color: muted }}>IVA (21%)</Text>
          <Text style={{ fontSize: 14, fontWeight: '600', color: fg }}>
            {formatPrice(cart.iva)}
          </Text>
        </View>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: 8,
            paddingTop: 8,
            borderTopWidth: 1,
            borderTopColor: border,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: '700', color: fg }}>
            Total
          </Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: brand }}>
            {formatPrice(cart.total)}
          </Text>
        </View>

        <Pressable
          onPress={handleCheckout}
          style={({ pressed }) => ({
            backgroundColor: brand,
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: 'center',
            marginTop: 12,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: '700',
              color: colors.iconWhite,
            }}
          >
            Ir a pagar
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
