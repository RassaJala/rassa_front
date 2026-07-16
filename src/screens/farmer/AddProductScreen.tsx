import React from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';

import LogoutButton from '@/components/LogoutButton';

export default function AddProductScreen(): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center bg-gray-50 p-4 dark:bg-gray-950">
      <Text variant="bodyLarge" className="text-gray-500 dark:text-gray-400">
        Add Product - Coming soon
      </Text>

      <View className="mt-6">
        <LogoutButton mode="contained" />
      </View>
    </View>
  );
}
