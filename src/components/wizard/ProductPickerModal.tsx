import React from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import type { Producto } from '@/services/productos';

export default function ProductPickerModal({
  allProductos,
  onSelect,
  onClose,
}: {
  allProductos: Producto[];
  onSelect: (producto: Producto) => void;
  onClose: () => void;
}): React.JSX.Element {
  return (
    <View
      className="absolute inset-0 z-50 bg-black/50"
      accessibilityViewIsModal
      accessibilityLabel="Seleccionar producto"
    >
      <View className="mx-4 mt-20 max-h-[70vh] rounded-2xl bg-white p-4 dark:bg-gray-900">
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Seleccionar producto
          </Text>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Cerrar selector"
          >
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              Cancelar
            </Text>
          </Pressable>
        </View>

        <FlatList
          data={allProductos}
          keyExtractor={(item) => String(item.id_producto)}
          renderItem={({ item: producto }) => (
            <Pressable
              onPress={() => onSelect(producto)}
              className="flex-row items-center border-b border-gray-100 py-3 dark:border-gray-800"
              accessibilityRole="button"
              accessibilityLabel={`Agregar ${producto.nombre_producto}`}
            >
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {producto.nombre_producto}
                </Text>
                {producto.categoria ? (
                  <Text className="text-xs text-gray-500 dark:text-gray-400">
                    {producto.categoria.nombre}
                  </Text>
                ) : null}
              </View>
              <Text className="text-brand-coral text-xs">Agregar</Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <Text className="py-4 text-center text-sm text-gray-400 dark:text-gray-500">
              No hay productos disponibles.
            </Text>
          }
        />
      </View>
    </View>
  );
}
