import React from 'react';
import { Text, View } from 'react-native';

import LogoutButton from '@/components/LogoutButton';

export default function AdminPanelScreen(): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <Text className="text-lg text-gray-600">Admin Panel - Coming soon</Text>

      <View className="mt-6">
        <LogoutButton mode="contained" />
      </View>
    </View>
  );
}
