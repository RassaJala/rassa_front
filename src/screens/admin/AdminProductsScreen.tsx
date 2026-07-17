import React from 'react';
import { Text, View } from 'react-native';

export default function AdminProductsScreen(): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center bg-gray-50 px-6 dark:bg-gray-950">
      <Text className="text-6xl">📦</Text>

      <Text className="mt-5 text-2xl font-bold text-brand-ink dark:text-gray-100">
        Productos
      </Text>

      <Text className="mt-3 text-center text-base text-gray-500 dark:text-gray-400">
        Moderación y administración de productos publicados.
      </Text>
    </View>
  );
}
