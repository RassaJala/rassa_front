import React from 'react';
import { Text, View } from 'react-native';

export default function NotificationsScreen(): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center bg-white px-6 dark:bg-gray-900">
      <Text className="text-6xl">🔔</Text>

      <Text className="mt-5 text-2xl font-bold text-brand-ink dark:text-gray-100">
        Notificaciones
      </Text>

      <Text className="mt-3 text-center text-gray-500 dark:text-gray-400">
        No tienes notificaciones por el momento.
      </Text>
    </View>
  );
}
