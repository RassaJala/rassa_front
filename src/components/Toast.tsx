/* global setTimeout, clearTimeout -- RN timer functions not in ESLint env */
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';

// ── Animation constants ────────────────────────────────────
const DISPLAY_DURATION = 3000;
const FADE_IN_DURATION = 250;
const FADE_OUT_DURATION = 200;
const SLIDE_DISTANCE = 50;

interface ToastProps {
  readonly visible: boolean;
  readonly message: string;
  readonly type?: 'success' | 'error' | 'info';
  readonly duration?: number;
  readonly onDismiss: () => void;
}

export default function Toast({
  visible,
  message,
  type = 'success',
  duration = DISPLAY_DURATION,
  onDismiss,
}: ToastProps): React.JSX.Element | null {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(SLIDE_DISTANCE)).current;

  useEffect(() => {
    if (!visible) return;

    opacity.setValue(0);
    translateY.setValue(SLIDE_DISTANCE);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: FADE_IN_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: FADE_IN_DURATION,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: FADE_OUT_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: SLIDE_DISTANCE,
          duration: FADE_OUT_DURATION,
          useNativeDriver: true,
        }),
      ]).start(() => onDismiss());
    }, duration);

    return () => clearTimeout(timer);
  }, [visible, duration, onDismiss, opacity, translateY]);

  if (!visible) return null;

  const bgClass =
    type === 'success'
      ? 'bg-brand-green-forest'
      : type === 'error'
        ? 'bg-brand-red-coral'
        : 'bg-gray-800 dark:bg-gray-700';

  return (
    <View className="pointer-events-box-none absolute bottom-24 left-4 right-4 z-50">
      <Pressable onPress={onDismiss}>
        <Animated.View
          className={`rounded-xl px-4 py-3.5 shadow-lg ${bgClass}`}
          style={{
            opacity,
            transform: [{ translateY }],
          }}
        >
          <Text className="text-center text-sm font-medium text-white">
            {message}
          </Text>
        </Animated.View>
      </Pressable>
    </View>
  );
}
