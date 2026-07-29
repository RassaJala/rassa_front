import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import {
  ProfileDrawerProvider,
  ProfileDrawerTrigger,
} from '@/components/ProfileDrawer';
import StatCard from '@/components/StatCard';
import { colors } from '@/constants/colors';
import { useFormattedDate } from '@/hooks/useFormattedDate';
import { usePublicacionesCurrent } from '@/hooks/usePublicacionesCurrent';
import type { ProductoSemanalPublic } from '@/services/publications';
import { useCart } from '@/store/CartContext';
import { useTheme } from '@/store/ThemeContext';
import type { BuyerTabsParamList } from '@/types';

type Nav = BottomTabNavigationProp<BuyerTabsParamList>;

interface Props {
  readonly navigation: Nav;
}

export default function HomeScreen({ navigation }: Props): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const cart = useCart();

  const {
    data: currentPubRes,
    isLoading,
    isError,
    refetch,
  } = usePublicacionesCurrent();

  const handleProfilePress = useCallback(() => {
    navigation.getParent()?.navigate('Profile');
  }, [navigation]);

  const handleProductPress = useCallback(
    (producto: ProductoSemanalPublic, farmerId: number, farmerName: string) => {
      navigation.getParent()?.navigate('ProductDetail', {
        productoSemanalId: producto.id_producto_semanal,
        farmerId,
        farmerName,
        nombreProducto: producto.producto,
        precio: producto.precio,
        stock: producto.stock,
        unidad: producto.unidad,
        foto: producto.foto,
      });
    },
    [navigation],
  );

  const handleAddToCart = useCallback(
    (producto: ProductoSemanalPublic) => {
      cart.addItem({
        id_producto_semanal: producto.id_producto_semanal,
        nombre_producto: producto.producto,
        precio: producto.precio,
        stock: producto.stock,
        cantidad: 1,
      });
    },
    [cart],
  );

  const bg = isDark ? colors.admBgD : colors.admBgL;
  const surface = isDark ? colors.admSurfaceD : colors.surface;
  const fg = isDark ? colors.admFgD : colors.admFgL;
  const muted = isDark ? colors.admMutedD : colors.admMutedL;
  const border = isDark ? colors.admBorderD : colors.admBorderL;
  const brand = isDark ? colors.admBrandD : colors.admBrandL;
  const accentBg = isDark ? colors.admActiveBgD : colors.admActiveBgL;
  const coralBg = isDark ? colors.admCoralBgD : colors.admCoralBgL;
  const pumpkinBg = isDark ? colors.admPumpkinBgD : colors.admPumpkinBgL;
  const coral = colors.brandRedCoral;
  const pumpkin = colors.accent;

  const { today } = useFormattedDate();

  const formatPrice = useCallback((value: string): string => {
    return `$${(Number.parseFloat(value) || 0).toFixed(2)}`;
  }, []);

  // Extract all products from all publications
  const allProductos: Array<{
    producto: ProductoSemanalPublic;
    farmerId: number;
    farmerName: string;
  }> = [];
  if (currentPubRes?.data) {
    for (const pub of currentPubRes.data) {
      for (const prod of pub.productos) {
        allProductos.push({
          producto: prod,
          farmerId: pub.agricultor.id_usuario,
          farmerName: `${pub.agricultor.nombre} ${pub.agricultor.apellido}`,
        });
      }
    }
  }

  return (
    <ProfileDrawerProvider
      defaultName="Cliente"
      defaultEmail="cliente@rassa.com"
      onProfilePress={handleProfilePress}
    >
      <View style={{ flex: 1, backgroundColor: bg }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={{ paddingTop: 48, paddingHorizontal: 20 }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <View>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '600',
                    letterSpacing: 0.06,
                    textTransform: 'uppercase',
                    color: muted,
                  }}
                >
                  {today}
                </Text>
                <Text
                  style={{
                    fontSize: 32,
                    fontWeight: '700',
                    letterSpacing: -0.3,
                    color: fg,
                  }}
                >
                  Inicio
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable
                  style={({ pressed }) => ({
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: surface,
                    borderWidth: 1,
                    borderColor: border,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <MaterialCommunityIcons
                    name="bell-outline"
                    size={24}
                    color={fg}
                  />
                </Pressable>
                <ProfileDrawerTrigger />
              </View>
            </View>

            {/* Stats */}
            <View
              style={{
                flexDirection: 'row',
                gap: 10,
                paddingVertical: 24,
              }}
            >
              <StatCard
                icon="package-variant"
                value={allProductos.length.toLocaleString()}
                label="Productos"
                surface={surface}
                border={border}
                muted={muted}
                iconBg={accentBg}
                iconColor={brand}
              />
              <StatCard
                icon="heart-outline"
                value={8}
                label="Favoritos"
                surface={surface}
                border={border}
                muted={muted}
                iconBg={coralBg}
                iconColor={coral}
              />
              <Pressable
                onPress={() => navigation.navigate('Pedidos')}
                style={{ flex: 1 }}
              >
                <StatCard
                  icon="truck-outline"
                  value={cart.totalItems}
                  label="Carrito"
                  surface={surface}
                  border={border}
                  muted={muted}
                  iconBg={pumpkinBg}
                  iconColor={pumpkin}
                />
              </Pressable>
            </View>
          </View>

          {/* Products section */}
          <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
            <Text
              style={{
                fontSize: 20,
                fontWeight: '700',
                color: fg,
                marginBottom: 4,
              }}
            >
              Productos disponibles
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: muted,
                marginBottom: 16,
              }}
            >
              Esta semana en tu mercado
            </Text>

            {isLoading ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={brand} />
              </View>
            ) : isError ? (
              <View
                style={{
                  alignItems: 'center',
                  paddingVertical: 32,
                  gap: 12,
                }}
              >
                <MaterialCommunityIcons
                  name="alert-circle-outline"
                  size={40}
                  color={muted}
                />
                <Text
                  style={{ fontSize: 14, color: muted, textAlign: 'center' }}
                >
                  No se pudieron cargar los productos
                </Text>
                <Pressable
                  onPress={() => void refetch()}
                  style={{
                    paddingHorizontal: 20,
                    paddingVertical: 8,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: border,
                  }}
                >
                  <Text
                    style={{ fontSize: 13, fontWeight: '600', color: brand }}
                  >
                    Reintentar
                  </Text>
                </Pressable>
              </View>
            ) : allProductos.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <MaterialCommunityIcons
                  name="package-variant-closed"
                  size={40}
                  color={muted}
                />
                <Text
                  style={{
                    fontSize: 14,
                    color: muted,
                    textAlign: 'center',
                    marginTop: 8,
                  }}
                >
                  No hay productos disponibles esta semana
                </Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {allProductos.map(({ producto, farmerId, farmerName }) => {
                  const inCart = cart.hasItem(producto.id_producto_semanal);
                  return (
                    <Pressable
                      key={producto.id_producto_semanal}
                      onPress={() =>
                        handleProductPress(producto, farmerId, farmerName)
                      }
                      style={({ pressed }) => ({
                        backgroundColor: surface,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: border,
                        padding: 14,
                        opacity: pressed ? 0.9 : 1,
                      })}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 16,
                              fontWeight: '600',
                              color: fg,
                            }}
                          >
                            {producto.producto}
                          </Text>
                          <Text
                            style={{
                              fontSize: 13,
                              color: muted,
                              marginTop: 2,
                            }}
                          >
                            {farmerName} · {producto.unidad}
                          </Text>
                          <Text
                            style={{
                              fontSize: 13,
                              color: muted,
                              marginTop: 1,
                            }}
                          >
                            Stock: {producto.stock} {producto.unidad}
                          </Text>
                        </View>
                        <Text
                          style={{
                            fontSize: 18,
                            fontWeight: '700',
                            color: brand,
                          }}
                        >
                          {formatPrice(producto.precio)}
                        </Text>
                      </View>

                      <Pressable
                        onPress={() => handleAddToCart(producto)}
                        disabled={inCart}
                        style={({ pressed }) => ({
                          backgroundColor: inCart ? muted : brand,
                          borderRadius: 10,
                          paddingVertical: 10,
                          alignItems: 'center',
                          marginTop: 10,
                          opacity: pressed ? 0.8 : 1,
                        })}
                      >
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: '700',
                            color: colors.iconWhite,
                          }}
                        >
                          {inCart
                            ? `En carrito (${cart.items.find((i) => i.id_producto_semanal === producto.id_producto_semanal)?.cantidad ?? 0})`
                            : 'Agregar al carrito'}
                        </Text>
                      </Pressable>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </ProfileDrawerProvider>
  );
}
