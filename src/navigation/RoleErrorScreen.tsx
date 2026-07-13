import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { colors } from '@/constants/colors';

export function RoleErrorScreen({
  onLogout,
}: Readonly<{ onLogout: () => void }>): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center bg-white px-8">
      <Ionicons name="warning" size={64} color={colors.error} />

      <Text className="mt-6 text-center text-xl font-bold text-gray-900">
        Sesión inválida
      </Text>

      <Text className="mt-2 text-center text-base text-gray-500">
        Tu cuenta tiene un rol no reconocido. Cerrá sesión e intentá de nuevo.
      </Text>

      <TouchableOpacity
        onPress={() => {
          void onLogout();
        }}
        className="mt-8 rounded-full bg-green-600 px-8 py-3"
      >
        <Text className="font-bold text-white">Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  );
}
