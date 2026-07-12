import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Text,
  View,
} from 'react-native';


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

    <View className="flex-1 items-center justify-center bg-green-600">

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
          source={require('../../../assets/icon.png')}
          className="mb-6 h-32 w-32"
          resizeMode="contain"
        />


        <Text className="text-4xl font-bold text-white">
          RASSA JALA
        </Text>


        <Text className="mt-3 text-white">
          Conectando productores y compradores.
        </Text>


        <ActivityIndicator
          size="large"
          color="white"
          className="mt-8"
        />


        <Text className="mt-3 text-white">
          Cargando sesión...
        </Text>


      </Animated.View>


    </View>

  );
}