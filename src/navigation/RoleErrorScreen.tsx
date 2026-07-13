import React from 'react';
import { Text, View } from 'react-native';
import { Button } from 'react-native-paper';

import { MaterialCommunityIcons } from '@expo/vector-icons';

export function RoleErrorScreen({
  onLogout,
}: Readonly<{ onLogout: () => void }>): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center bg-white px-8 dark:bg-gray-900">
      <MaterialCommunityIcons name="alert" size={64} color="#ef4444" />

      <Text className="mt-6 text-center text-xl font-bold text-brand-ink dark:text-gray-100">
        Sesión inválida
      </Text>

      <Text className="mt-2 text-center text-base text-gray-500 dark:text-gray-400">
        Tu cuenta tiene un rol no reconocido. Cerrá sesión e intentá de nuevo.
      </Text>

      <Button
        mode="contained"
        buttonColor="#DE393A"
        textColor="#ffffff"
        onPress={() => {
          void onLogout();
        }}
        className="mt-8 rounded-full"
      >
        Cerrar sesión
      </Button>
    </View>
  );
}
