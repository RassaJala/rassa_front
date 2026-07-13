/* globals require -- React Native module resolution */

import React, { useState } from 'react';
import type { ImageSourcePropType } from 'react-native';
import { Image, Text, TouchableOpacity, View } from 'react-native';

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- require() retorna any en React Native; el tipo se declara explícitamente.
const logo: ImageSourcePropType = require('../../../assets/logo-rassa.jpeg');

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

  const currentSlide = slides[current] ?? slides[0];

  const next = (): void => {
    if (current < slides.length - 1) {
      setCurrent((previous) => previous + 1);
    } else {
      onFinish();
    }
  };

  return (
    <View className="flex-1 bg-green-600">
      <View className="flex-9 items-center justify-center px-16">
        <View className="mb-6 h-16 w-16 items-center justify-center rounded-full bg-white/20">
          <Image source={logo} className="h-10 w-10" resizeMode="contain" />
        </View>

        <Text className="mb-4 text-center text-2xl font-bold text-white">
          {currentSlide.title}
        </Text>

        <Text className="px-4 text-center text-base leading-6 text-white/90">
          {currentSlide.description}
        </Text>
      </View>

      <View className="items-center pb-16">
        <View className="mb-8 flex-row">
          {slides.map((slide, index) => (
            <View
              key={slide.title}
              className={`mx-1 rounded-full ${
                index === current ? 'h-3 w-10 bg-white' : 'h-3 w-3 bg-white/40'
              }`}
            />
          ))}
        </View>

        <TouchableOpacity
          onPress={next}
          className="w-64 items-center rounded-full bg-white py-4"
          activeOpacity={0.8}
        >
          <Text className="text-lg font-bold text-green-700">
            {current === slides.length - 1 ? 'Comenzar' : 'Siguiente'}
          </Text>
        </TouchableOpacity>

        {current < slides.length - 1 && (
          <TouchableOpacity
            onPress={onFinish}
            className="mt-4 py-2"
            activeOpacity={0.7}
          >
            <Text className="text-sm text-white/70">Omitir</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
