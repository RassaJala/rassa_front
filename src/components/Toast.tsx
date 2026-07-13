/* global setTimeout, clearTimeout, console */
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';

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
  duration = 3000,
  onDismiss,
}: ToastProps): React.JSX.Element | null {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (!visible) return;

    opacity.setValue(0);
    translateY.setValue(50);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 50,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => onDismiss());
    }, duration);

    return () => clearTimeout(timer);
  }, [visible, duration, onDismiss, opacity, translateY]);

  if (!visible) return null;

  const bgClass =
    type === 'success'
      ? 'bg-green-700'
      : type === 'error'
        ? 'bg-red-600'
        : 'bg-gray-800 dark:bg-gray-700';

  return (
    <View className="pointer-events-none absolute bottom-24 left-4 right-4 z-50">
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
