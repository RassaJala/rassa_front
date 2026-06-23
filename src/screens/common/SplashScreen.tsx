import React from "react";
import { View, Text, ActivityIndicator } from "react-native";

export default function SplashScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-green-600">
      <Text className="text-white text-3xl font-bold mb-4">Rassa</Text>
      <ActivityIndicator size="large" color="white" />
    </View>
  );
}
