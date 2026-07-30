/* globals require -- React Native module resolution */

import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Image, Text, View } from 'react-native';

export default function SplashScreen(): React.JSX.Element {
  const scale = useRef(new Animated.Value(0.7)).current;

  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
      }),

      Animated.timing(opacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, scale]);

  return (
    <View className="bg-brand-green-forest dark:bg-brand-green-forest flex-1 items-center justify-center">
      <Animated.View
        style={{
          transform: [
            {
              scale,
            },
          ],

          opacity,
        }}

        className="items-center"
      >
        <Image
          source={require('../../../assets/icon.png') as number}

          className="mb-6 h-32 w-32"

          resizeMode="contain"
        />

        <Text className="text-4xl font-bold text-white dark:text-gray-100">
          RASSA JALA
        </Text>

        <Text className="mt-3 text-center text-white dark:text-gray-100">
          Conectando productores y compradores.
        </Text>

        <ActivityIndicator
          size="large"

          color="white"

          className="mt-8"
        />

        <Text className="mt-3 text-white dark:text-gray-100">
          Cargando sesión...
        </Text>
      </Animated.View>
    </View>
  );
}
