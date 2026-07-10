import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { useAuth } from '~/store/AuthContext';

export default function MyProductsScreen(): React.JSX.Element {
  const { logout } = useAuth();

  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <Text className="text-lg text-gray-600">
        My Products (Farmer) - Coming soon
      </Text>

      <Pressable
        className="mt-6 rounded-xl bg-red-600 px-4 py-3"
        onPress={() => {
          void logout();
        }}
      >
        <Text className="font-semibold text-white">Cerrar sesión</Text>
      </Pressable>
    </View>
  );
}
