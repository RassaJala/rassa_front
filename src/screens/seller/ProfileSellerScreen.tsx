import React from 'react';
import { Text, View } from 'react-native';
import { Button } from 'react-native-paper';

import { useAuth } from '@/store/AuthContext';

export default function ProfileSellerScreen(): React.JSX.Element {
  const { logout, user } = useAuth();

  return (
    <View className="flex-1 items-center justify-center bg-white px-6 dark:bg-gray-900">
      <Text className="text-3xl font-bold text-brand-ink dark:text-gray-100">
        Perfil
      </Text>

      <Text className="mt-6 text-lg font-semibold text-brand-ink dark:text-gray-100">
        {user?.first_name}
      </Text>

      <Text className="text-gray-500 dark:text-gray-400">{user?.email}</Text>

      <Button
        mode="contained"
        buttonColor="#ef4444"
        textColor="#ffffff"
        onPress={() => {
          void logout();
        }}
        className="mt-10 rounded-xl"
      >
        Cerrar sesión
      </Button>
    </View>
  );
}
