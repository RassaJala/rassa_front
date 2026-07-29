import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, themeColors } from '@/constants/colors';
import { useCreatePrivateConversation } from '@/features/chat/hooks/useCreatePrivateConversation';
import { useCart } from '@/store/CartContext';
import { useTheme } from '@/store/ThemeContext';
import type { BuyerStackParamList } from '@/types';

type Nav = NativeStackNavigationProp<BuyerStackParamList, 'ProductDetail'>;
type Route = RouteProp<BuyerStackParamList, 'ProductDetail'>;

export default function ProductDetailScreen(): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const cart = useCart();
  const createPrivateConversation = useCreatePrivateConversation();

  const { farmerId } = route.params;

  const handleContactFarmer = useCallback(() => {
    createPrivateConversation.mutate({ fk_usuario: farmerId });
  }, [createPrivateConversation, farmerId]);

  const {
    productoSemanalId,
    farmerName,
    nombreProducto,
    precio,
    stock,
    unidad,
  } = route.params;

  const [cantidad, setCantidad] = useState(1);
  const [added, setAdded] = useState(false);

  const bg = isDark ? colors.admBgD : colors.admBgL;
  const fg = isDark ? colors.admFgD : colors.admFgL;
  const muted = isDark ? colors.admMutedD : colors.admMutedL;
  const surface = isDark ? colors.admSurfaceD : colors.surface;
  const border = isDark ? colors.admBorderD : colors.admBorderL;
  const brand = isDark ? colors.admBrandD : colors.admBrandL;
  const tc = themeColors(isDark);

  const formatPrice = useCallback((value: string): string => {
    return `$${(Number.parseFloat(value) || 0).toFixed(2)}`;
  }, []);

  const importeTotal = (Number.parseFloat(precio) || 0) * cantidad;

  const handleAddToCart = useCallback(() => {
    cart.addItem({
      id_producto_semanal: productoSemanalId,
      nombre_producto: nombreProducto,
      precio,
      stock,
      cantidad,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }, [cart, productoSemanalId, nombreProducto, precio, stock, cantidad]);

  const handleIncrement = useCallback(() => {
    if (cantidad < stock) {
      setCantidad((c) => c + 1);
    }
  }, [cantidad, stock]);

  const handleDecrement = useCallback(() => {
    if (cantidad > 1) {
      setCantidad((c) => c - 1);
    }
  }, [cantidad]);

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {/* Header */}
      <View
        style={{
          paddingTop: 60,
          paddingHorizontal: 20,
          paddingBottom: 8,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => ({
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: surface,
            borderWidth: 1,
            borderColor: border,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={fg} />
        </Pressable>
        <Text style={{ fontSize: 22, fontWeight: '700', color: fg, flex: 1 }}>
          {nombreProducto}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Product info */}
        <View
          style={{
            backgroundColor: surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: border,
            padding: 20,
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              fontSize: 28,
              fontWeight: '700',
              color: brand,
              marginBottom: 12,
            }}
          >
            {formatPrice(precio)}
            <Text
              style={{
                fontSize: 14,
                fontWeight: '400',
                color: muted,
              }}
            >
              {' '}
              / {unidad}
            </Text>
          </Text>

          <View
            style={{
              flexDirection: 'row',
              gap: 20,
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: border,
            }}
          >
            <View>
              <Text style={{ fontSize: 12, color: muted }}>Agricultor</Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: fg,
                  marginTop: 2,
                }}
              >
                {farmerName}
              </Text>
            </View>
            <View>
              <Text style={{ fontSize: 12, color: muted }}>Stock</Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: fg,
                  marginTop: 2,
                }}
              >
                {stock} {unidad}
              </Text>
            </View>
          </View>
        </View>

        {/* Quantity selector */}
        <Text
          style={{
            fontSize: 16,
            fontWeight: '600',
            color: fg,
            marginBottom: 10,
          }}
        >
          Cantidad
        </Text>

        <View
          style={{
            backgroundColor: surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: border,
            padding: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Pressable
            onPress={handleDecrement}
            disabled={cantidad <= 1}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor:
                cantidad <= 1
                  ? isDark
                    ? colors.admInactiveBgD
                    : colors.admInactiveBgL
                  : brand,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <MaterialCommunityIcons
              name="minus"
              size={24}
              color={cantidad <= 1 ? muted : colors.iconWhite}
            />
          </Pressable>

          <Text
            style={{
              fontSize: 32,
              fontWeight: '700',
              color: fg,
              minWidth: 48,
              textAlign: 'center',
            }}
          >
            {cantidad}
          </Text>

          <Pressable
            onPress={handleIncrement}
            disabled={cantidad >= stock}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor:
                cantidad >= stock
                  ? isDark
                    ? colors.admInactiveBgD
                    : colors.admInactiveBgL
                  : brand,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <MaterialCommunityIcons
              name="plus"
              size={24}
              color={cantidad >= stock ? muted : colors.iconWhite}
            />
          </Pressable>
        </View>

        {/* Importe total */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: 16,
            paddingHorizontal: 4,
          }}
        >
          <Text style={{ fontSize: 15, color: muted }}>
            {cantidad} × {formatPrice(precio)}
          </Text>
          <Text
            style={{
              fontSize: 18,
              fontWeight: '700',
              color: fg,
            }}
          >
            {formatPrice(String(importeTotal))}
          </Text>
        </View>

        {/* Added confirmation */}
        {added ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              backgroundColor: tc.statusPublicadoBg,
              borderRadius: 12,
              padding: 14,
              marginTop: 20,
            }}
          >
            <MaterialCommunityIcons
              name="check-circle"
              size={22}
              color={colors.success}
            />
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: colors.success,
                flex: 1,
              }}
            >
              {cantidad} × {nombreProducto} agregado al carrito
            </Text>
          </View>
        ) : null}

        {/* Contact farmer */}
        <Pressable
          onPress={handleContactFarmer}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginTop: 20,
            paddingVertical: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: border,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <MaterialCommunityIcons name="chat-outline" size={20} color={muted} />
          <Text style={{ fontSize: 14, fontWeight: '600', color: muted }}>
            Contactar a {farmerName}
          </Text>
        </Pressable>
      </ScrollView>

      {/* Bottom add to cart button */}
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
        <Pressable
          onPress={handleAddToCart}
          style={({ pressed }) => ({
            backgroundColor: brand,
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: 'center',
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
            Agregar al carrito — {formatPrice(String(importeTotal))}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
