import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

export default function SplashScreen(): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center bg-green-600">
      <Text className="mb-4 text-3xl font-bold text-white">Rassa</Text>
      <ActivityIndicator size="large" color="white" />
    </View>
  );
}
