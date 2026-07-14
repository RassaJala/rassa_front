import React from 'react';
import { Text, View } from 'react-native';

export default function ProductDetailScreen(): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center bg-white px-6 dark:bg-gray-950">
      <Text className="text-center text-lg font-semibold text-slate-700 dark:text-slate-200">
        Detalle del producto
      </Text>
      <Text className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
        Próximamente podrás ver aquí toda la información del producto.
      </Text>
    </View>
  );
}
