import React from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';

export default function ProductDetailScreen(): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center bg-gray-50 p-4 dark:bg-gray-950">
      <Text variant="titleMedium" className="text-center text-gray-900 dark:text-gray-100">
        Detalle del producto
      </Text>
      <Text variant="bodyMedium" className="mt-2 text-center text-gray-500 dark:text-gray-400">
        Próximamente podrás ver aquí toda la información del producto.
      </Text>
    </View>
  );
}
