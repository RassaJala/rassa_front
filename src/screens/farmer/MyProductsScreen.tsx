import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  Text,
  View,
} from 'react-native';

import LogoutButton from '@/components/LogoutButton';
import { useDeleteProducto, useProductos } from '@/hooks/useProductos';
import type { Producto } from '@/services/productos';

import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/AppNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'MyProducts'>;
};

export default function MyProductsScreen({
  navigation,
}: Props): React.JSX.Element {
  const { data: productosResponse, isLoading } = useProductos();
  const deleteMutation = useDeleteProducto();

  const [deletingId, setDeletingId] = useState<number | null>(null);

  const productos = productosResponse?.data ?? [];

  const handleDelete = useCallback(
    (item: Producto) => {
      Alert.alert(
        'Eliminar producto',
        `¿Estás seguro de eliminar "${item.nombre_producto}"?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: () => {
              setDeletingId(item.id_producto);
              deleteMutation.mutate(item.id_producto, {
                onSettled: () => {
                  setDeletingId(null);
                },
                onError: () => {
                  Alert.alert('Error', 'No se pudo eliminar el producto.');
                },
                onSuccess: () => {
                  Alert.alert('Éxito', 'Producto eliminado correctamente.');
                },
              });
            },
          },
        ],
      );
    },
    [deleteMutation],
  );

  const handleEdit = useCallback(
    (item: Producto) => {
      navigation.navigate('AddProduct', { productoId: item.id_producto });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: Producto }) => (
      <View className="mb-3 flex-row rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        {item.imagen_principal ? (
          <Image
            source={{ uri: item.imagen_principal }}
            className="h-20 w-20 rounded-lg"
            resizeMode="cover"
          />
        ) : (
          <View className="h-20 w-20 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
            <Text className="text-xs text-gray-400 dark:text-gray-500">
              Sin imagen
            </Text>
          </View>
        )}

        <View className="ml-3 flex-1 justify-center">
          <Text
            className="text-sm font-medium text-gray-900 dark:text-gray-100"
            numberOfLines={1}
          >
            {item.nombre_producto}
          </Text>

          <Text className="mt-1 text-sm font-bold text-orange-500 dark:text-orange-400">
            ${Number(item.precio).toFixed(2)}
          </Text>

          <Text className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Stock: {item.stock}
          </Text>
        </View>

        <View className="justify-center">
          <Pressable
            onPress={() => handleEdit(item)}
            className="mb-1 rounded-lg bg-brand-green-forest px-3 py-1.5"
            accessibilityRole="button"
            accessibilityLabel={`Editar ${item.nombre_producto}`}
          >
            <Text className="text-xs font-semibold text-white">Editar</Text>
          </Pressable>

          {deletingId === item.id_producto ? (
            <ActivityIndicator color="#DE393A" size="small" className="mt-1" />
          ) : (
            <Pressable
              onPress={() => handleDelete(item)}
              className="mt-1 rounded-lg border border-red-300 bg-white px-3 py-1.5 dark:border-red-700 dark:bg-gray-800"
              accessibilityRole="button"
              accessibilityLabel={`Eliminar ${item.nombre_producto}`}
            >
              <Text className="text-xs font-semibold text-red-500 dark:text-red-400">
                Eliminar
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    ),
    [deletingId, handleDelete, handleEdit],
  );

  const keyExtractor = useCallback(
    (item: Producto) => String(item.id_producto),
    [],
  );

  return (
    <View className="flex-1 bg-slate-50 dark:bg-gray-950">
      {/* Header — Forest */}
      <View className="flex-row items-center justify-between border-b border-gray-200 bg-brand-green-forest px-4 pb-3 pt-12 dark:border-gray-800">
        <Text className="text-lg font-semibold text-white">Mis Productos</Text>
        <LogoutButton mode="text" />
      </View>

      {/* Botón agregar — Coral CTA */}
      <Pressable
        onPress={() => navigation.navigate('AddProduct')}
        className="mx-4 mt-4 items-center rounded-xl bg-brand-red-coral py-3"
        accessibilityRole="button"
        accessibilityLabel="Agregar nuevo producto"
      >
        <Text className="text-base font-semibold text-white">
          + Agregar Producto
        </Text>
      </Pressable>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#059669" size="large" />
        </View>
      ) : (
        <FlatList
          data={productos}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <View className="items-center py-12">
              <Text className="text-sm text-gray-500 dark:text-gray-400">
                No tienes productos todavía.
              </Text>
              <Text className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                Presiona "Agregar Producto" para comenzar.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
