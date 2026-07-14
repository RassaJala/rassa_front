import React from 'react';
import { Text, View } from 'react-native';
import { Button } from 'react-native-paper';

import { useNavigation } from '@react-navigation/native';

import LogoutButton from '@/components/LogoutButton';

export default function HomeScreen(): React.JSX.Element {
  const navigation = useNavigation();

  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <Text className="text-lg text-gray-600">Home (Buyer) - Coming soon</Text>

      <View className="mt-6 w-full max-w-xs gap-3">
        <Button
          mode="outlined"
          textColor="#DE393A"
          className="rounded-lg border-brand-red-coral"
          onPress={() => navigation.navigate('Profile' as never)}
        >
          Mi Perfil
        </Button>
        <LogoutButton mode="contained" />
      </View>
    </View>
  );
}
