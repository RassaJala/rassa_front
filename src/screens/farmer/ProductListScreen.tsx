import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native';
import { FAB } from 'react-native-paper';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNetInfo } from '@react-native-community/netinfo';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { colors } from '@/constants/colors';
import api, { mediaUrl } from '@/services/api';
import { useAuth } from '@/store/AuthContext';
import type { ApiResponse, Category, FarmerStackParamList, Producto } from '@/types';

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
  const { logout } = useAuth();

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
      const { data } = await api.get<ApiResponse<{ results: Producto[] }>>(
        buildUrl(),
      );
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
          className="h-16 w-16 rounded-lg"
          resizeMode="cover"
        />
      );
    }
    return (
      <View className="h-16 w-16 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
        <MaterialCommunityIcons
          name="image-outline"
          size={24}
          color={colors.iconMuted}
        />
      </View>
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color={colors.brandGreenForest} />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={48}
          color={colors.textSecondary}
        />
        <Text className="mt-4 text-center text-base text-gray-500">
          {netInfo.isConnected === false
            ? 'Sin conexión a Internet. Verifica tu conexión.'
            : 'Error al cargar productos.'}
        </Text>
        <Pressable
          onPress={() => void refetch()}
          className="mt-4 flex-row items-center gap-2 rounded-lg bg-brand-green-forest px-6 py-3"
        >
          <MaterialCommunityIcons
            name="refresh"
            size={18}
            color={colors.iconWhite}
          />
          <Text className="font-semibold text-white">Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  const isEmpty = !products || products.length === 0;

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="bg-brand-green-forest px-4 pb-4 pt-14 shadow-sm">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-2xl font-bold tracking-tight text-white">
            Mis Productos
          </Text>
          <Pressable 
            onPress={() => logout()}
            className="rounded-full bg-white/20 p-2 active:opacity-80"
            hitSlop={8}
          >
            <MaterialCommunityIcons name="logout" size={22} color="white" />
          </Pressable>
        </View>

        {/* Search bar */}
        <View className="flex-row items-center rounded-md bg-white px-3 py-3 shadow-sm">
          <MaterialCommunityIcons
            name="magnify"
            size={22}
            color={colors.iconMuted}
          />
          <TextInput
            className="ml-2 flex-1 text-base text-brand-ink outline-none"
            style={{ outlineStyle: 'none' } as any}
            placeholder="Buscar producto..."
            placeholderTextColor={colors.iconMuted}
            value={searchText}
            onChangeText={setSearchText}
            underlineColorAndroid="transparent"
            cursorColor={colors.brandGreenForest}
          />
          {searchText ? (
            <Pressable onPress={() => setSearchText('')} hitSlop={8}>
              <MaterialCommunityIcons
                name="close-circle"
                size={20}
                color={colors.iconMuted}
              />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Category chips */}
      {categories && categories.length > 0 ? (
        <View className="border-b border-gray-100 bg-white px-4 py-3">
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[{ id_categoria: 0, nombre: 'Todas', descripcion: '' }, ...categories]}
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
                  className={`mr-2 rounded-full px-4 py-2 ${
                    isSelected
                      ? 'bg-brand-green-forest'
                      : 'bg-gray-100'
                  }`}
                  hitSlop={8}
                >
                  <Text
                    className={`text-sm font-medium ${
                      isSelected
                        ? 'text-white'
                        : 'text-gray-600'
                    }`}
                  >
                    {item.nombre}
                  </Text>
                </Pressable>
              );
            }}
          />
        </View>
      ) : null}

      {/* Product list */}
      {isEmpty ? (
        <View className="flex-1 items-center justify-center px-6">
          <MaterialCommunityIcons
            name="package-variant"
            size={64}
            color={colors.iconMuted}
          />
          <Text className="mt-4 text-center text-2xl font-bold text-gray-500">
            No hay productos
          </Text>
          <Text className="mt-1 text-center text-sm text-gray-400">
            Agrega un producto para comenzar.
          </Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => String(item.id_producto)}
          contentContainerClassName="p-4 pb-24 gap-3"
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
              tintColor={colors.brandRedCoral}
            />
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                navigation.navigate('ProductForm', {
                  productoId: item.id_producto,
                })
              }
              className="rounded-xl bg-white p-4 shadow-sm border border-gray-100"
            >
              <View className="flex-row items-center gap-3">
                {renderImage(item.imagen_principal ?? item.imagen)}
                <View className="flex-1">
                  <Text className="text-base font-semibold text-brand-ink">
                    {item.nombre_producto}
                  </Text>
                  <Text className="mt-0.5 text-sm text-gray-500">
                    {item.categoria.nombre}
                    {item.unidad ? ` · ${item.unidad.tipo}` : ''}
                  </Text>
                  <View className="mt-2 flex-row items-center gap-4">
                    <Text className="text-sm font-bold text-brand-green-forest">
                      ${item.precio}
                    </Text>
                    <Text className="text-xs text-gray-500">
                      Stock: {item.stock}
                    </Text>
                    {item.es_perecedero ? (
                      <View className="rounded-full bg-yellow-100 px-2 py-0.5">
                        <Text className="text-xs font-medium text-yellow-700">
                          Perecedero
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color={colors.iconMuted}
                />
              </View>
            </Pressable>
          )}
          ItemSeparatorComponent={() => (
            <View className="h-px bg-gray-100" />
          )}
        />
      )}

      {/* FAB */}
      <FAB
        icon="plus"
        color="white"
        className="absolute bottom-6 right-4 rounded-full bg-brand-green-forest"
        style={{ borderRadius: 100 }}
        onPress={() => navigation.navigate('ProductForm', {})}
      />

    </View>
  );
}
