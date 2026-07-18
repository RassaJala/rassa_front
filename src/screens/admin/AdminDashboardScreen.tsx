import React from 'react';
import { Text, View } from 'react-native';

export default function AdminDashboardScreen(): React.JSX.Element {
  return (
    <View className="flex-1 bg-gray-50 px-4 py-6 dark:bg-gray-950">
      <View className="mb-6 flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-bold text-brand-ink dark:text-gray-100">
            RASSA
          </Text>
          <Text className="text-xl font-semibold text-brand-ink dark:text-gray-100">
            Dashboard
          </Text>
        </View>
      </View>

      <View className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <View className="rounded-xl bg-white p-5 shadow-sm dark:border dark:border-gray-800 dark:bg-gray-900 dark:shadow-none">
          <Text className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Total Productos
          </Text>
          <Text className="mt-1 text-2xl font-bold text-brand-ink dark:text-gray-100">
            1,248
          </Text>
        </View>

        <View className="rounded-xl bg-white p-5 shadow-sm dark:border dark:border-gray-800 dark:bg-gray-900 dark:shadow-none">
          <Text className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Total Usuarios
          </Text>
          <Text className="mt-1 text-2xl font-bold text-brand-ink dark:text-gray-100">
            856
          </Text>
        </View>

        <View className="rounded-xl bg-white p-5 shadow-sm dark:border dark:border-gray-800 dark:bg-gray-900 dark:shadow-none">
          <Text className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Total Pedidos
          </Text>
          <Text className="mt-1 text-2xl font-bold text-brand-ink dark:text-gray-100">
            432
          </Text>
        </View>

        <View className="rounded-xl bg-white p-5 shadow-sm dark:border dark:border-gray-800 dark:bg-gray-900 dark:shadow-none">
          <Text className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Ingresos
          </Text>
          <Text className="mt-1 text-2xl font-bold text-brand-orange">
            $12,450.00
          </Text>
        </View>
      </View>
    </View>
  );
}
