/* globals require -- React Native module resolution */

import React, { useEffect, useRef, useState } from 'react';
import type { ImageSourcePropType } from 'react-native';
import { Animated, Image, Text, View } from 'react-native';
import { Button } from 'react-native-paper';

import { colors } from '@/constants/colors';

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
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    return () => {
      fadeAnim.stopAnimation();
    };
  }, [fadeAnim]);

  const currentSlide = slides[current] ?? slides[0];

  const goToNext = (): void => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      if (current < slides.length - 1) {
        setCurrent((previous) => previous + 1);
      } else {
        onFinish();
        return;
      }

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  };

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-950">
      {/* Contenido principal */}
      <View className="flex-1 items-center justify-center px-8">
        <Animated.View style={{ opacity: fadeAnim }} className="items-center">
          {/* Logo */}
          <Image
            source={logo}
            className="mb-10 h-50 w-50 rounded-full"
            resizeMode="contain"
          />

          {/* Título */}
          <Text className="text-brand-ink mb-5 text-center text-3xl font-bold dark:text-gray-100">
            {currentSlide.title}
          </Text>

          {/* Descripción */}
          <Text className="px-6 text-center text-lg leading-7 text-gray-500 dark:text-gray-400">
            {currentSlide.description}
          </Text>
        </Animated.View>
      </View>

      {/* Parte inferior */}
      <View className="items-center pt-1 pb-3">
        {/* Indicadores */}
        <View className="mb-10 flex-row">
          {slides.map((slide, index) => (
            <View
              key={slide.title}
              className={`mx-1 rounded-full ${
                index === current
                  ? 'bg-brand-red-coral h-3 w-10'
                  : 'h-3 w-3 bg-gray-300 dark:bg-gray-600'
              }`}
            />
          ))}
        </View>

        {/* Botón */}
        <Button
          mode="contained"
          buttonColor={colors.brandRedCoral}
          textColor={colors.surface}
          onPress={goToNext}
          className="w-56 rounded-full"
        >
          {current === slides.length - 1 ? 'Comenzar' : 'Siguiente'}
        </Button>

        {/* Omitir */}
        {current < slides.length - 1 && (
          <Button
            mode="text"
            textColor={colors.textSecondary}
            onPress={onFinish}
            className="mt-4"
          >
            Omitir
          </Button>
        )}
      </View>
    </View>
  );
}
