import React from 'react';
import { Text, View } from 'react-native';

export default function HomeSellerScreen(): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <Text className="text-3xl font-bold text-green-700">
        Bienvenido Vendedor
      </Text>

      <Text className="mt-5 text-center text-base text-gray-600">
        Desde aquí podrás administrar las ventas de productos agrícolas
        publicados en RASSA JALA.
      </Text>
    </View>
  );
}
