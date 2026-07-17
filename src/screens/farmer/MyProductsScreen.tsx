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

import LogoutButton from '@/components/LogoutButton';
import {
  useCategorias,
  useDeleteProducto,
  useProductos,
} from '@/hooks/useProductos';
import type { Producto } from '@/services/productos';

interface Props {
  navigation: { navigate: (screen: string, params?: Record<string, unknown>) => void };
}

export default function MyProductsScreen({ navigation }: Props): React.JSX.Element {
  const [search, setSearch] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState<number | null>(null);

  const nombreFilter = search.trim().length > 0 ? search.trim() : undefined;
  const categoriaFilter = selectedCategoria !== null ? selectedCategoria : undefined;

  const { data: productosResponse, isLoading: isLoadingProductos, isError: isErrorProductos, refetch: refetchProductos } = useProductos({
    categoria: categoriaFilter,
    nombre: nombreFilter,
  });

  const { data: categoriasResponse, isLoading: isLoadingCategorias } = useCategorias();
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
        className="mb-3 flex-row items-center rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:shadow-none"
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
          <View className="h-16 w-16 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
            <Text className="text-xs text-gray-400 dark:text-gray-500">
              Sin imagen
            </Text>
          </View>
        )}

        <View className="ml-3 flex-1">
          <Text
            className="text-sm font-medium text-gray-900 dark:text-gray-100"
            numberOfLines={1}
          >
            {item.nombre_producto}
          </Text>

          {item.categoria ? (
            <Text className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {item.categoria.nombre}
            </Text>
          ) : null}

          <View className="mt-1 flex-row items-center gap-2">
            <Text className="text-sm font-semibold text-brand-orange">
              ${item.precio}
            </Text>
            <Text className="text-xs text-gray-400 dark:text-gray-500">
              Stock: {item.stock}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() => handleDelete(item)}
          className="ml-2 rounded-lg bg-red-50 px-3 py-2 dark:bg-red-950"
          accessibilityRole="button"
          accessibilityLabel={`Eliminar ${item.nombre_producto}`}
        >
          <Text className="text-xs font-medium text-red-600 dark:text-red-400">
            Eliminar
          </Text>
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
    <View className="flex-1 bg-gray-50 dark:bg-gray-950">
      {/* Header — Forest vive solo aquí */}
      <View className="border-b border-gray-200 bg-brand-green-forest px-4 pb-3 pt-12 dark:border-gray-800">
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-lg font-semibold text-white">
            Mis Productos
          </Text>
          <LogoutButton mode="text" />
        </View>

        {/* Search bar */}
        <TextInput
          autoCapitalize="none"
          className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-base text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          placeholder="Buscar productos..."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Category chips */}
      {isLoadingCategorias ? null : (
        <View className="border-b border-gray-100 bg-white px-4 py-2 dark:border-gray-800 dark:bg-gray-900">
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
                      ? 'border-brand-red-coral bg-brand-red-coral'
                      : 'border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-800'
                  }`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`Categoría: ${item.nombre}`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      isSelected
                        ? 'text-white'
                        : 'text-gray-700 dark:text-gray-300'
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

      {/* Add button — Coral es el único CTA */}
      <View className="px-4 py-3">
        <Pressable
          onPress={() => navigation.navigate('AddProduct', {})}
          className="items-center rounded-xl bg-brand-red-coral py-3"
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
          <ActivityIndicator color="#DE393A" size="large" />
          <Text className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Cargando productos...
          </Text>
        </View>
      ) : isErrorProductos ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="mb-2 text-center text-sm font-medium text-red-600 dark:text-red-400">
            Error al cargar productos
          </Text>
          <Text className="mb-4 text-center text-xs text-gray-500 dark:text-gray-400">
            Verifica tu conexión y vuelve a intentar.
          </Text>
          <Pressable
            onPress={() => void refetchProductos()}
            className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 dark:border-red-800 dark:bg-red-950"
            accessibilityRole="button"
            accessibilityLabel="Reintentar"
          >
            <Text className="text-sm font-medium text-red-600 dark:text-red-400">
              Reintentar
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={productos}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <View className="flex-1 items-center py-12">
              <Text className="text-sm text-gray-500 dark:text-gray-400">
                No se encontraron productos.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
