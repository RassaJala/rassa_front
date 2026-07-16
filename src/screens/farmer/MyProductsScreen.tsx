import React from 'react';
import { View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import type { NavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';

import LogoutButton from '@/components/LogoutButton';
import type { FarmerStackParamList } from '@/types';

export default function MyProductsScreen(): React.JSX.Element {
  const navigation = useNavigation<NavigationProp<FarmerStackParamList>>();

  return (
    <View className="flex-1 items-center justify-center bg-gray-50 p-4 dark:bg-gray-950">
      <Text variant="bodyLarge" className="text-gray-500 dark:text-gray-400">
        My Products (Farmer) - Coming soon
      </Text>

      <View className="mt-6 w-full max-w-xs gap-3">
        <Button
          mode="outlined"
          textColor="#DE393A"
          className="rounded-lg border-brand-red-coral"
          onPress={() => navigation.navigate('Profile')}
        >
          Mi Perfil
        </Button>
        <LogoutButton mode="contained" />
      </View>
    </View>
  );
}
