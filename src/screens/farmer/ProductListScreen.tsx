import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNetInfo } from '@react-native-community/netinfo';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import api, { mediaUrl } from '@/services/api';
import { useAuth } from '@/store/AuthContext';
import { useTheme } from '@/store/ThemeContext';
import type {
  ApiResponse,
  Category,
  FarmerStackParamList,
  Producto,
} from '@/types';

type NavigationProp = NativeStackNavigationProp<
  FarmerStackParamList,
  'ProductList'
>;

interface Props {
  readonly navigation: NavigationProp;
}

export default function ProductListScreen({
  navigation,
}: Props): React.JSX.Element {
  const netInfo = useNetInfo();
  const { colorScheme, toggleColorScheme } = useTheme();
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();

  const isDark = colorScheme === 'dark';
  const bg = isDark ? '#1A211B' : '#F5F7F0';
  const surface = isDark ? '#263028' : '#FFFFFF';
  const fg = isDark ? '#E8EAE4' : '#2D3328';
  const muted = isDark ? '#9DA89D' : '#5E6B5E';
  const border = isDark ? '#353D35' : '#E2E6DF';
  const brand = isDark ? '#4A8A63' : '#24563C';
  const accentBg = isDark ? 'rgba(74,138,99,0.12)' : 'rgba(36,86,60,0.07)';
  const coralBg = isDark ? 'rgba(232,74,74,0.12)' : 'rgba(222,57,58,0.07)';
  const pumpkinBg = isDark ? 'rgba(212,160,32,0.12)' : 'rgba(242,169,0,0.07)';
  const coral = '#DE393A';
  const pumpkin = '#F2A900';
  const overlayBg = isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.4)';
  const drawerBg = isDark ? '#1F2720' : '#FFFFFF';
  const sidebarBorder = isDark ? '#353D35' : '#E8EAE4';

  const { width: SCREEN_WIDTH } = Dimensions.get('window');
  const DRAWER_WIDTH = 0.55;

  const [drawerOpen, setDrawerOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const openDrawer = useCallback(() => {
    setDrawerOpen(true);
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  const closeDrawer = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setDrawerOpen(false);
    });
  }, [slideAnim]);

  const drawerTranslate = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_WIDTH * DRAWER_WIDTH, 0],
  });

  const overlayOpacity = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.35],
  });

  const menuItems = [
    {
      icon: 'account-circle-outline',
      label: 'Perfil',
      desc: 'Tu información personal',
      color: fg,
      action: closeDrawer,
    },
    {
      icon: isDark ? 'weather-sunny' : 'weather-night',
      label: `Tema ${isDark ? 'claro' : 'oscuro'}`,
      desc: 'Alternar apariencia',
      color: fg,
      action: toggleColorScheme,
    },
    {
      icon: 'cog-outline',
      label: 'Configuración',
      desc: 'Preferencias del sistema',
      color: fg,
      action: closeDrawer,
    },
    {
      icon: 'logout',
      label: 'Cerrar sesión',
      desc: '',
      color: coral,
      action: () => {
        closeDrawer();
        void logout();
      },
    },
  ];

  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  const { data: categories } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Category[]>>('/categorias/');
      return data.data;
    },
    staleTime: 60_000,
  });

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (searchText) params.set('nombre', searchText);
    if (selectedCategory) params.set('categoria', String(selectedCategory));
    const qs = params.toString();

    return qs ? `/productos/?${qs}` : '/productos/';
  }, [searchText, selectedCategory]);

  const {
    data: products,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery<Producto[]>({
    queryKey: ['productos', searchText, selectedCategory],
    queryFn: async () => {
      const { data } =
        await api.get<ApiResponse<{ results: Producto[] }>>(buildUrl());
      return data.data.results;
    },
    staleTime: 30_000,
    retry: 2,
    placeholderData: keepPreviousData,
  });

  const renderImage = (uri: string | null) => {
    const resolved = mediaUrl(uri);
    if (resolved) {
      return (
        <Image
          source={{ uri: resolved }}
          style={{ width: 64, height: 64, borderRadius: 12 }}
          resizeMode="cover"
        />
      );
    }
    return (
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 12,
          backgroundColor: accentBg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <MaterialCommunityIcons
          name="image-outline"
          size={24}
          color={brand}
        />
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={brand} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={{ flex: 1, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: coralBg, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={32}
            color={coral}
          />
        </View>
        <Text style={{ fontSize: 18, fontWeight: '700', color: fg, textAlign: 'center', marginBottom: 8 }}>
          {netInfo.isConnected === false
            ? 'Sin conexión a Internet'
            : 'Error al cargar productos'}
        </Text>
        <Text style={{ fontSize: 14, color: muted, textAlign: 'center', marginBottom: 24 }}>
          {netInfo.isConnected === false
            ? 'Verifica tu conexión y vuelve a intentarlo.'
            : 'Ocurrió un problema inesperado. Intenta de nuevo más tarde.'}
        </Text>
        <Pressable
          onPress={() => void refetch()}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: surface,
            borderWidth: 1,
            borderColor: border,
            paddingVertical: 12,
            paddingHorizontal: 24,
            borderRadius: 12,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <MaterialCommunityIcons
            name="refresh"
            size={20}
            color={fg}
            style={{ marginRight: 8 }}
          />
          <Text style={{ fontSize: 16, fontWeight: '600', color: fg }}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  const isEmpty = !products || products.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, minHeight: 48 }}>
          <Pressable
            onPress={() => navigation.goBack()}
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
              zIndex: 1,
            })}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={fg} />
          </Pressable>
          <View style={{ position: 'absolute', left: 0, right: 0, alignItems: 'center', pointerEvents: 'none' }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: fg }}>Mis Productos</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, zIndex: 1 }}>
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
              <MaterialCommunityIcons name="bell-outline" size={24} color={fg} />
            </Pressable>
            <Pressable
              onPress={openDrawer}
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
              <MaterialCommunityIcons name="account-circle" size={24} color={fg} />
            </Pressable>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: surface, borderWidth: 1, borderColor: border, borderRadius: 16, paddingHorizontal: 16, height: 52 }}>
          <MaterialCommunityIcons name="magnify" size={24} color={muted} />
          <TextInput
            style={{ flex: 1, fontSize: 16, color: fg, marginLeft: 10, outlineStyle: 'none' } as any}
            placeholder="Buscar producto..."
            placeholderTextColor={muted}
            value={searchText}
            onChangeText={setSearchText}
            underlineColorAndroid="transparent"
            cursorColor={brand}
          />
          {searchText ? (
            <Pressable onPress={() => setSearchText('')} hitSlop={8}>
              <MaterialCommunityIcons name="close-circle" size={20} color={muted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {categories && categories.length > 0 ? (
        <View style={{ paddingBottom: 12 }}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20 }}
            ItemSeparatorComponent={() => <View style={{ width: 8 }} />}
            data={[
              { id_categoria: 0, nombre: 'Todas', descripcion: '' },
              ...categories,
            ]}
            keyExtractor={(item) => String(item.id_categoria)}
            renderItem={({ item }) => {
              const isSelected =
                item.id_categoria === 0
                  ? selectedCategory === null
                  : selectedCategory === item.id_categoria;
              return (
                <Pressable
                  onPress={() =>
                    setSelectedCategory(
                      item.id_categoria === 0 ? null : item.id_categoria,
                    )
                  }
                  style={({ pressed }) => ({
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 20,
                    backgroundColor: isSelected ? brand : surface,
                    borderWidth: 1,
                    borderColor: isSelected ? brand : border,
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: isSelected ? '#FFFFFF' : fg }}>
                    {item.nombre}
                  </Text>
                </Pressable>
              );
            }}
          />
        </View>
      ) : null}

      {isEmpty ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: accentBg, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <MaterialCommunityIcons name="package-variant" size={40} color={brand} />
          </View>
          <Text style={{ fontSize: 20, fontWeight: '700', color: fg, marginBottom: 8 }}>No hay productos</Text>
          <Text style={{ fontSize: 15, color: muted, textAlign: 'center' }}>Agrega un producto para comenzar a vender.</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => String(item.id_producto)}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
              tintColor={brand}
              colors={[brand]}
            />
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                navigation.navigate('ProductForm', {
                  productoId: item.id_producto,
                })
              }
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: surface,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: border,
                padding: 12,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              {renderImage(item.imagen_principal ?? item.imagen)}
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: fg, marginBottom: 4 }}>
                  {item.nombre_producto}
                </Text>
                <Text style={{ fontSize: 13, color: muted, marginBottom: 8 }}>
                  {item.categoria.nombre}
                  {item.unidad ? ` · ${item.unidad.tipo}` : ''}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: brand }}>
                    ${item.precio}
                  </Text>
                  <Text style={{ fontSize: 13, color: muted }}>
                    Stock: {item.stock}
                  </Text>
                  {item.es_perecedero ? (
                    <View style={{ backgroundColor: pumpkinBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 }}>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: pumpkin }}>
                        Perecedero
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={muted} />
            </Pressable>
          )}
        />
      )}

      <Pressable
        onPress={() => navigation.navigate('ProductForm', {})}
        style={({ pressed }) => ({
          position: 'absolute',
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: brand,
          alignItems: 'center',
          justifyContent: 'center',
          elevation: 4,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <MaterialCommunityIcons name="plus" size={30} color="#FFFFFF" />
      </Pressable>

      {/* OVERLAY */}
      {drawerOpen ? (
        <Animated.View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            right: 0,
            opacity: overlayOpacity,
            backgroundColor: overlayBg,
          }}
        >
          <Pressable onPress={closeDrawer} style={{ flex: 1 }} />
        </Animated.View>
      ) : null}

      {/* DRAWER */}
      <Animated.View
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: `${DRAWER_WIDTH * 100}%`,
          backgroundColor: drawerBg,
          transform: [{ translateX: drawerTranslate }],
          borderLeftWidth: 1,
          borderLeftColor: sidebarBorder,
        }}
      >
        <View style={{ flex: 1, paddingTop: 60 }}>
          <View
            style={{
              alignItems: 'center',
              paddingHorizontal: 20,
              paddingBottom: 24,
              marginBottom: 20,
              borderBottomWidth: 1,
              borderBottomColor: sidebarBorder,
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: accentBg,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              <MaterialCommunityIcons
                name="account-circle"
                size={40}
                color={brand}
              />
            </View>
            <Text
              style={{
                fontSize: 24,
                fontWeight: '700',
                color: fg,
                letterSpacing: -0.2,
              }}
            >
              {user?.nombre ?? 'Agricultor'}
            </Text>
            <Text style={{ fontSize: 15, color: muted, marginTop: 4 }}>
              {user?.email ?? ''}
            </Text>
          </View>

          <View style={{ paddingHorizontal: 16, gap: 6 }}>
            {menuItems.map((item, i) => {
              const isLast = i === menuItems.length - 1;
              return (
                <Pressable
                  key={i}
                  onPress={item.action}
                  style={({ pressed }) => ({
                    backgroundColor: isLast
                      ? isDark
                        ? 'rgba(222,57,58,0.1)'
                        : 'rgba(222,57,58,0.07)'
                      : isDark
                        ? 'rgba(255,255,255,0.05)'
                        : 'rgba(0,0,0,0.03)',
                    borderRadius: 16,
                    borderWidth: isLast ? 1 : 0,
                    borderColor: isLast
                      ? isDark
                        ? 'rgba(222,57,58,0.25)'
                        : 'rgba(222,57,58,0.15)'
                      : 'transparent',
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      minHeight: 56,
                    }}
                  >
                    <MaterialCommunityIcons
                      name={
                        item.icon as keyof typeof MaterialCommunityIcons.glyphMap
                      }
                      size={28}
                      color={item.color}
                    />
                    <Text
                      style={{
                        fontSize: 20,
                        fontWeight: '600',
                        color: item.color,
                        letterSpacing: -0.15,
                        flexShrink: 1,
                      }}
                    >
                      {item.label}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Animated.View>
    </View>
  );
}
