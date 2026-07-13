import React from 'react';
import { Text, View } from 'react-native';

export default function SalesScreen(): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center bg-white px-6 dark:bg-gray-900">
      <Text className="text-3xl font-bold text-brand-ink dark:text-gray-100">
        Ventas
      </Text>

      <Text className="mt-5 text-center text-base text-gray-600 dark:text-gray-400">
        Próximamente aquí podrás visualizar y administrar todas las ventas.
      </Text>
    </View>
  );
}
