import React from 'react';
import { Text, View } from 'react-native';

import { useTheme } from '@/store/ThemeContext';

export default function AdminDashboardScreen(): React.JSX.Element {
  const { colorScheme } = useTheme();

  const isDark = colorScheme === 'dark';
  const surface = isDark ? '#111827' : '#FFFFFF';
  const borderColor = isDark ? '#374151' : 'transparent';
  const card = {
    backgroundColor: surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: isDark ? 1 : 0,
    borderColor,
  };

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

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
        <View style={[card, { flexBasis: '48%' }]}>
          <Text className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Total Productos
          </Text>
          <Text className="mt-1 text-2xl font-bold text-brand-ink dark:text-gray-100">
            1,248
          </Text>
        </View>

        <View style={[card, { flexBasis: '48%' }]}>
          <Text className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Total Usuarios
          </Text>
          <Text className="mt-1 text-2xl font-bold text-brand-ink dark:text-gray-100">
            856
          </Text>
        </View>

        <View style={[card, { flexBasis: '48%' }]}>
          <Text className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Total Pedidos
          </Text>
          <Text className="mt-1 text-2xl font-bold text-brand-ink dark:text-gray-100">
            432
          </Text>
        </View>

        <View style={[card, { flexBasis: '48%' }]}>
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
