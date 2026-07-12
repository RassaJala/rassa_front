import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { useAuth } from '@/store/AuthContext';

export default function ProfileSellerScreen(): React.JSX.Element {
  const { logout, user } = useAuth();

  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <Text className="text-3xl font-bold text-green-700">Perfil</Text>

      <Text className="mt-6 text-lg font-semibold">{user?.first_name}</Text>

      <Text className="text-gray-500">{user?.email}</Text>

      <TouchableOpacity
        className="mt-10 rounded-xl bg-red-600 px-8 py-4"
        onPress={() => {
          void logout();
        }}
      >
        <Text className="text-lg font-bold text-white">Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  );
}
