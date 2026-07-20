import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNetInfo } from '@react-native-community/netinfo';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import Toast from '@/components/Toast';
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

// eslint-disable-next-line sonarjs/cognitive-complexity -- product list with filters/drawer/search logic
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
  const selectedTextColor = '#FFFFFF';
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

  const queryClient = useQueryClient();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/productos/${id}/`);
    },
    onSuccess: () => {
      setToastMessage('Producto eliminado.');
      setToastType('success');
      void queryClient.invalidateQueries({ queryKey: ['productos'] });
    },
    onError: () => {
      setToastMessage('Error al eliminar producto.');
      setToastType('error');
    },
  });

  const confirmDelete = useCallback(
    (producto: Producto) => {
      const msg = `Se eliminará "${producto.nombre_producto}". Esta acción no se puede deshacer.`;
      if (Platform.OS === 'web') {
        if (window.confirm(`¿Eliminar producto?\n${msg}`)) {
          deleteMutation.mutate(producto.id_producto);
        }
        return;
      }
      Alert.alert('¿Eliminar producto?', msg, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(producto.id_producto),
        },
      ]);
    },
    [deleteMutation],
  );

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
    return (
      <View
        style={{
          width: 100,
          height: 100,
          borderRadius: 12,
          overflow: 'hidden',
          backgroundColor: accentBg,
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {resolved ? (
          <Image
            source={{ uri: resolved }}
            style={{ width: 100, height: 100 }}
            resizeMode="cover"
          />
        ) : (
          <MaterialCommunityIcons
            name="image-outline"
            size={24}
            color={brand}
          />
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator size="large" color={brand} />
      </View>
    );
  }

  if (isError) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 24,
        }}
      >
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: coralBg,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}
        >
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={32}
            color={coral}
          />
        </View>
        <Text
          style={{
            fontSize: 18,
            fontWeight: '700',
            color: fg,
            textAlign: 'center',
            marginBottom: 8,
          }}
        >
          {netInfo.isConnected === false
            ? 'Sin conexión a Internet'
            : 'Error al cargar productos'}
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: muted,
            textAlign: 'center',
            marginBottom: 24,
          }}
        >
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
          <Text style={{ fontSize: 16, fontWeight: '600', color: fg }}>
            Reintentar
          </Text>
        </Pressable>
      </View>
    );
  }

  const isEmpty = !products || products.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 20,
          paddingBottom: 16,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
            minHeight: 48,
          }}
        >
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
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              alignItems: 'center',
            }}
            pointerEvents="none"
          >
            <Text style={{ fontSize: 20, fontWeight: '700', color: fg }}>
              Mis Productos
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 14, zIndex: 1 }}>
            <Pressable
              onPress={() => navigation.navigate('ProductForm', {})}
              style={({ pressed }) => ({
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: brand,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <MaterialCommunityIcons name="plus" size={28} color="#FFFFFF" />
            </Pressable>
            <Pressable
              onPress={openDrawer}
              style={({ pressed }) => ({
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: surface,
                borderWidth: 1,
                borderColor: border,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <MaterialCommunityIcons
                name="account-circle"
                size={28}
                color={fg}
              />
            </Pressable>
          </View>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: surface,
            borderWidth: 1,
            borderColor: border,
            borderRadius: 16,
            paddingHorizontal: 16,
            height: 52,
          }}
        >
          <MaterialCommunityIcons name="magnify" size={24} color={muted} />
          <TextInput
            style={{
              flex: 1,
              fontSize: 16,
              color: fg,
              marginLeft: 10,
            }}
            placeholder="Buscar producto..."
            placeholderTextColor={muted}
            value={searchText}
            onChangeText={setSearchText}
            underlineColorAndroid="transparent"
            cursorColor={brand}
          />
          {searchText ? (
            <Pressable onPress={() => setSearchText('')} hitSlop={8}>
              <MaterialCommunityIcons
                name="close-circle"
                size={20}
                color={muted}
              />
            </Pressable>
          ) : null}
        </View>
      </View>

      {categories && categories.length > 0 ? (
        <View style={{ paddingBottom: 14, paddingHorizontal: 20 }}>
          <View
            style={{
              borderWidth: 1,
              borderColor: border,
              borderRadius: 16,
              backgroundColor: surface,
            }}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 10,
                paddingVertical: 10,
                alignItems: 'center',
              }}
              keyboardShouldPersistTaps="handled"
            >
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable
                  onPress={() => setSelectedCategory(null)}
                  style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                >
                  <View
                    style={{
                      paddingHorizontal: 18,
                      paddingVertical: 12,
                      borderRadius: 20,
                      backgroundColor:
                        selectedCategory === null ? brand : surface,
                      borderWidth: 1.5,
                      borderColor: selectedCategory === null ? brand : border,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '600',
                        color:
                          selectedCategory === null ? selectedTextColor : fg,
                      }}
                    >
                      Todas
                    </Text>
                  </View>
                </Pressable>
                {categories.map((item) => {
                  const isSelected = selectedCategory === item.id_categoria;
                  return (
                    <Pressable
                      key={String(item.id_categoria)}
                      onPress={() => setSelectedCategory(item.id_categoria)}
                      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                    >
                      <View
                        style={{
                          paddingHorizontal: 18,
                          paddingVertical: 12,
                          borderRadius: 20,
                          backgroundColor: isSelected ? brand : surface,
                          borderWidth: 1.5,
                          borderColor: isSelected ? brand : border,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: '600',
                            color: isSelected ? selectedTextColor : fg,
                          }}
                        >
                          {item.nombre}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      ) : null}

      {isEmpty ? (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 24,
          }}
        >
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: accentBg,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
            }}
          >
            <MaterialCommunityIcons
              name="package-variant"
              size={40}
              color={brand}
            />
          </View>
          <Text
            style={{
              fontSize: 20,
              fontWeight: '700',
              color: fg,
              marginBottom: 8,
            }}
          >
            No hay productos
          </Text>
          <Text style={{ fontSize: 15, color: muted, textAlign: 'center' }}>
            Agrega un producto para comenzar a vender.
          </Text>
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
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: surface,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: border,
                padding: 12,
              }}
            >
              {renderImage(item.imagen_principal ?? item.imagen)}
              <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: fg,
                    marginBottom: 4,
                    flexShrink: 1,
                  }}
                  numberOfLines={2}
                >
                  {item.nombre_producto}
                </Text>

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  <Text
                    style={{ fontSize: 13, color: muted }}
                    numberOfLines={1}
                  >
                    {item.categoria?.nombre}
                    {item.unidad ? ` · ${item.unidad.tipo}` : ''}
                  </Text>
                  <View
                    style={{
                      backgroundColor: item.estado
                        ? isDark
                          ? 'rgba(74,138,99,0.2)'
                          : '#E8F5E9'
                        : isDark
                          ? 'rgba(255,255,255,0.1)'
                          : '#F5F5F5',
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 12,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '600',
                        color: item.estado
                          ? isDark
                            ? '#4ade80'
                            : brand
                          : muted,
                      }}
                    >
                      {item.estado ? 'Activo' : 'Inactivo'}
                    </Text>
                  </View>
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  <Text
                    style={{ fontSize: 16, fontWeight: '700', color: brand }}
                  >
                    ${item.precio}
                  </Text>
                  <Text style={{ fontSize: 14, color: fg }}>
                    · Stock: {item.stock}
                  </Text>
                  {item.es_perecedero ? (
                    <View
                      style={{
                        backgroundColor: pumpkinBg,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 10,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '600',
                          color: pumpkin,
                        }}
                      >
                        Perecedero
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>

              <View style={{ flexDirection: 'column', gap: 8, marginLeft: 12 }}>
                <Pressable
                  onPress={() =>
                    navigation.navigate('ProductForm', {
                      productoId: item.id_producto,
                    })
                  }
                  style={({ pressed }) => ({
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: border,
                    backgroundColor: surface,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <MaterialCommunityIcons name="pencil" size={20} color={fg} />
                </Pressable>
                <Pressable
                  onPress={() => confirmDelete(item)}
                  style={({ pressed }) => ({
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: border,
                    backgroundColor: surface,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <MaterialCommunityIcons
                    name="trash-can-outline"
                    size={20}
                    color={coral}
                  />
                </Pressable>
              </View>
            </View>
          )}
        />
      )}

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
            zIndex: 10,
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
          zIndex: 11,
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

      <Toast
        message={toastMessage ?? ''}
        visible={!!toastMessage}
        onDismiss={() => setToastMessage(null)}
        type={toastType}
      />
    </View>
  );
}
