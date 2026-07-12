import React, { useRef, useState } from 'react';
import type { ImageSourcePropType } from 'react-native';
import { Animated, Image, Text, TouchableOpacity, View } from 'react-native';

const logo: ImageSourcePropType = {
  uri: 'asset:///assets/logo-rassa.jpeg',
};

const slides = [
  {
    title: 'Bienvenido a RASSA JALA',
    description:
      'Una plataforma que conecta productores agrícolas con compradores.',
  },
  {
    title: 'Compra productos frescos',
    description:
      'Encuentra productos agrícolas publicados directamente por productores.',
  },
  {
    title: 'Publica y vende tu cosecha',
    description:
      'Los agricultores pueden mostrar sus productos y administrar sus publicaciones.',
  },
] as const;

interface Props {
  readonly onFinish: () => void;
}

export default function OnboardingScreen({
  onFinish,
}: Props): React.JSX.Element {
  const [current, setCurrent] = useState(0);

  const fade = useRef(new Animated.Value(1)).current;

  const currentSlide = slides[current] ?? slides[0];

  const next = (): void => {
    if (current < slides.length - 1) {
      Animated.sequence([
        Animated.timing(fade, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),

        Animated.timing(fade, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      setCurrent((previous) => previous + 1);
    } else {
      onFinish();
    }
  };

  return (
    <View className="flex-1 items-center justify-center bg-green-600 px-8">
      <Animated.View
        style={{
          opacity: fade,
        }}
        className="items-center"
      >
        <Image
          source={logo}
          className="mb-10 h-64 w-full"
          resizeMode="contain"
        />

        <Text className="text-center text-3xl font-bold text-white">
          {currentSlide.title}
        </Text>

        <Text className="mt-4 text-center text-lg text-white">
          {currentSlide.description}
        </Text>
      </Animated.View>

      <View className="mt-10 flex-row">
        {slides.map((slide) => (
          <View
            key={slide.title}
            className={
              slide.title === currentSlide.title
                ? 'mx-1 h-3 w-8 rounded-full bg-white'
                : 'mx-1 h-3 w-3 rounded-full bg-green-300'
            }
          />
        ))}
      </View>

      <TouchableOpacity
        onPress={next}
        className="absolute bottom-16 rounded-full bg-white px-12 py-4"
      >
        <Text className="font-bold text-green-700">
          {current === slides.length - 1 ? 'Comenzar' : 'Siguiente'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
