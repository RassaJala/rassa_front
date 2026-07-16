import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import LogoutButton from '@/components/LogoutButton';
import { colors } from '@/constants/colors';
import {
  useCategorias,
  useDeleteProducto,
  useProductos,
} from '@/hooks/useProductos';
import type { FarmerStackParamList } from '@/navigation/AppNavigator';
import type { Producto } from '@/services/productos';

const PLACEHOLDER_COLOR = colors.iconMuted;

type Props = NativeStackScreenProps<FarmerStackParamList, 'MyProducts'>;

export default function MyProductsScreen({
  route: _route,
  navigation,
}: Props): React.JSX.Element {
  const [search, setSearch] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState<number | null>(
    null,
  );

  const nombreFilter = search.trim().length > 0 ? search.trim() : undefined;
  const categoriaFilter =
    selectedCategoria !== null ? selectedCategoria : undefined;

  const { data: productosResponse, isLoading: isLoadingProductos } =
    useProductos({
      categoria: categoriaFilter,
      nombre: nombreFilter,
    });

  const { data: categoriasResponse, isLoading: isLoadingCategorias } =
    useCategorias();
  const deleteMutation = useDeleteProducto();

  const productos = productosResponse?.data ?? [];
  const categorias = categoriasResponse?.data ?? [];

  const handleDelete = useCallback(
    (item: Producto) => {
      Alert.alert(
        'Eliminar producto',
        `¿Estás seguro de que quieres eliminar "${item.nombre_producto}"?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: () => deleteMutation.mutate(item.id_producto),
          },
        ],
      );
    },
    [deleteMutation],
  );

  const renderItem = useCallback(
    ({ item }: { item: Producto }) => (
      <Pressable
        className="mb-3 flex-row items-center rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
        onPress={() =>
          navigation.navigate('AddProduct', { productoId: item.id_producto })
        }
        accessibilityRole="button"
        accessibilityLabel={`Producto: ${item.nombre_producto}`}
      >
        {item.imagen_principal ? (
          <Image
            source={{ uri: item.imagen_principal }}
            className="h-16 w-16 rounded-lg"
            resizeMode="cover"
          />
        ) : (
          <View className="h-16 w-16 items-center justify-center rounded-lg bg-slate-100">
            <Text className="text-xs text-slate-400">Sin imagen</Text>
          </View>
        )}

        <View className="ml-3 flex-1">
          <Text
            className="text-sm font-medium text-slate-900"
            numberOfLines={1}
          >
            {item.nombre_producto}
          </Text>

          {item.categoria ? (
            <Text className="mt-0.5 text-xs text-slate-500">
              {item.categoria.nombre}
            </Text>
          ) : null}

          <View className="mt-1 flex-row items-center gap-2">
            <Text className="text-primary text-sm font-semibold">
              ${item.precio}
            </Text>
            <Text className="text-xs text-slate-400">Stock: {item.stock}</Text>
          </View>
        </View>

        <Pressable
          onPress={() => handleDelete(item)}
          className="ml-2 rounded-lg bg-red-50 px-3 py-2"
          accessibilityRole="button"
          accessibilityLabel={`Eliminar ${item.nombre_producto}`}
        >
          <Text className="text-xs font-medium text-red-600">Eliminar</Text>
        </Pressable>
      </Pressable>
    ),
    [handleDelete, navigation],
  );

  const keyExtractor = useCallback(
    (item: Producto) => String(item.id_producto),
    [],
  );

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="border-b border-slate-200 bg-white px-4 pb-3 pt-12">
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-lg font-semibold text-slate-900">
            Mis Productos
          </Text>
          <LogoutButton mode="text" />
        </View>

        {/* Search bar */}
        <TextInput
          autoCapitalize="none"
          className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-base text-slate-900"
          placeholder="Buscar productos..."
          placeholderTextColor={PLACEHOLDER_COLOR}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Category chips */}
      {isLoadingCategorias ? null : (
        <View className="border-b border-slate-100 bg-white px-4 py-2">
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={categorias}
            keyExtractor={(item) => String(item.id_categoria)}
            renderItem={({ item }) => {
              const isSelected = selectedCategoria === item.id_categoria;
              return (
                <Pressable
                  onPress={() =>
                    setSelectedCategoria(isSelected ? null : item.id_categoria)
                  }
                  className={`mr-2 rounded-full border px-3 py-1.5 ${
                    isSelected
                      ? 'border-primary bg-primary'
                      : 'border-slate-300 bg-white'
                  }`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`Categoría: ${item.nombre}`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      isSelected ? 'text-white' : 'text-slate-700'
                    }`}
                  >
                    {item.nombre}
                  </Text>
                </Pressable>
              );
            }}
          />
        </View>
      )}

      {/* Add button */}
      <View className="px-4 py-3">
        <Pressable
          onPress={() => navigation.navigate('AddProduct', {})}
          className="bg-primary items-center rounded-xl py-3"
          accessibilityRole="button"
          accessibilityLabel="Agregar producto"
        >
          <Text className="text-sm font-semibold text-white">
            + Agregar Producto
          </Text>
        </Pressable>
      </View>

      {/* Product list */}
      {isLoadingProductos ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} size="large" />
          <Text className="mt-3 text-sm text-slate-500">
            Cargando productos...
          </Text>
        </View>
      ) : (
        <FlatList
          data={productos}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <View className="flex-1 items-center py-12">
              <Text className="text-sm text-slate-500">
                No se encontraron productos.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
