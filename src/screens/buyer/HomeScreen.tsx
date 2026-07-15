import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import LogoutButton from '@/components/LogoutButton';
import { useCategorias, useProductos } from '@/hooks/useProductos';
import type { Producto } from '@/services/productos';

const PLACEHOLDER_COLOR = '#94a3b8';

export default function HomeScreen(): React.JSX.Element {
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

  const productos = productosResponse?.data ?? [];
  const categorias = categoriasResponse?.data ?? [];

  const renderItem = useCallback(
    ({ item }: { item: Producto }) => (
      <Pressable
        className="mb-3 w-[48%] rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
        accessibilityRole="button"
        accessibilityLabel={`Producto: ${item.nombre_producto}`}
      >
        {item.imagen_principal ? (
          <Image
            source={{ uri: item.imagen_principal }}
            className="h-28 w-full rounded-lg"
            resizeMode="cover"
          />
        ) : (
          <View className="h-28 w-full items-center justify-center rounded-lg bg-slate-100">
            <Text className="text-sm text-slate-400">Sin imagen</Text>
          </View>
        )}

        <Text
          className="mt-2 text-sm font-medium text-slate-900"
          numberOfLines={2}
        >
          {item.nombre_producto}
        </Text>

        {item.categoria ? (
          <Text className="mt-1 text-xs text-slate-500">
            {item.categoria.nombre}
          </Text>
        ) : null}

        {item.es_perecedero ? (
          <View className="mt-1 self-start rounded bg-amber-100 px-2 py-0.5">
            <Text className="text-xs font-medium text-amber-700">
              Perecedero
            </Text>
          </View>
        ) : null}
      </Pressable>
    ),
    [],
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
            Productos
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
                      ? 'border-emerald-600 bg-emerald-600'
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

      {/* Product grid */}
      {isLoadingProductos ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#059669" size="large" />
          <Text className="mt-3 text-sm text-slate-500">
            Cargando productos...
          </Text>
        </View>
      ) : (
        <FlatList
          data={productos}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
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
