import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNetInfo } from '@react-native-community/netinfo';
import * as Sentry from '@sentry/react-native';
import { useColorScheme } from 'nativewind';

import { colors } from '@/constants/colors';
import { useAuth } from '@/store/AuthContext';
import { getLoginErrorMessage } from '@/utils/authError';

const PLACEHOLDER_COLOR = colors.textTertiary;

const EMAIL_REGEX = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/;

export default function LoginScreen(): React.JSX.Element {
  const { login } = useAuth();
  const { colorScheme, toggleColorScheme } = useColorScheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const netInfo = useNetInfo();
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
    };
  }, []);

  async function handleLogin() {
    if (isSubmitting) return;

    setErrorMessage(null);

    if (netInfo.isConnected === false) {
      setErrorMessage('Sin conexión a Internet.');
      return;
    }

    if (!email.trim() || !password) {
      setErrorMessage('Ingresa tu correo y contraseña.');
      return;
    }

    if (!EMAIL_REGEX.test(email.trim())) {
      setErrorMessage('Ingresa un correo electrónico válido.');
      return;
    }

    setIsSubmitting(true);

    try {
      await login(email.trim(), password);
    } catch (error) {
      const message = getLoginErrorMessage(error);

      if (isMounted.current) {
        setErrorMessage(message);
      }

      Sentry.captureException(error);
    } finally {
      if (isMounted.current) {
        setIsSubmitting(false);
      }
    }
  }

  const isDark = colorScheme === 'dark';

  return (
    <View className="flex-1 items-center justify-center bg-gray-50 px-6 py-10 dark:bg-gray-950">
      <Pressable
        className="absolute right-4 top-12 rounded-full bg-gray-200 p-3 dark:bg-gray-800"
        onPress={() => {
          toggleColorScheme();
        }}
        accessibilityLabel="Alternar tema claro y oscuro"
        accessibilityRole="button"
        hitSlop={8}
      >
        <MaterialCommunityIcons
          name={isDark ? 'weather-sunny' : 'weather-night'}
          size={20}
          color={isDark ? colors.surface : colors.iconDark}
        />
      </Pressable>

      <View className="w-full max-w-sm">
        <View className="mb-8 items-center">
          <Text className="text-3xl font-bold text-brand-ink dark:text-white">
            RASSA JALA
          </Text>
        </View>

        <Text className="mb-2 text-3xl font-bold text-brand-ink dark:text-white">
          Iniciar sesión
        </Text>

        <Text className="mb-8 text-base text-gray-500 dark:text-gray-400">
          Ingresa tus credenciales para continuar.
        </Text>

        <TextInput
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          className="mb-4 rounded-xl border border-gray-200 bg-white px-4 py-4 text-base text-brand-ink dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          placeholder="Correo electrónico"
          placeholderTextColor={PLACEHOLDER_COLOR}
          value={email}
          onChangeText={setEmail}
        />

        <View className="relative mb-4">
          <TextInput
            className="rounded-xl border border-gray-200 bg-white px-4 py-4 pr-16 text-base text-brand-ink dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            placeholder="Contraseña"
            placeholderTextColor={PLACEHOLDER_COLOR}
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />

          <Pressable
            className="absolute right-3 top-0 h-full justify-center"
            onPress={() => setShowPassword((prev) => !prev)}
            accessibilityLabel={
              showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
            }
            accessibilityRole="button"
            hitSlop={8}
          >
            <Text className="text-sm font-medium text-brand-red-coral">
              {showPassword ? 'Ocultar' : 'Mostrar'}
            </Text>
          </Pressable>
        </View>

        {errorMessage ? (
          <Text className="mb-4 text-center text-sm text-red-500">
            {errorMessage}
          </Text>
        ) : null}

        <Pressable
          disabled={isSubmitting}
          onPress={() => void handleLogin()}
          className={`mt-2 rounded-xl bg-brand-red-coral py-4 ${
            isSubmitting ? 'opacity-70' : ''
          }`}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text className="text-center text-base font-semibold text-white">
              Ingresar
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
