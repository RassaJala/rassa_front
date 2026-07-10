import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useNetInfo } from '@react-native-community/netinfo';
import * as Sentry from '@sentry/react-native';

import { useAuth } from '@/store/AuthContext';
import { getLoginErrorMessage } from '@/utils/authError';

const PLACEHOLDER_COLOR = '#94a3b8';

const EMAIL_REGEX = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/;

export default function LoginScreen(): React.JSX.Element {
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  return (
    <View className="flex-1 justify-center bg-white px-6 py-8">
      <View className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
        <Text className="mb-2 text-2xl font-semibold text-slate-900">
          Iniciar sesión
        </Text>

        <Text className="mb-6 text-sm text-slate-600">
          Ingresa tus credenciales para continuar.
        </Text>

        <TextInput
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          className="mb-4 rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900"
          placeholder="Correo electrónico"
          placeholderTextColor={PLACEHOLDER_COLOR}
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900"
          placeholder="Contraseña"
          placeholderTextColor={PLACEHOLDER_COLOR}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {errorMessage ? <Text className="mt-4 text-center text-sm text-red-600">
            {errorMessage}
          </Text> : null}

        <Pressable
          disabled={isSubmitting}
          onPress={() => void handleLogin()}
          className={`mt-6 rounded-xl bg-emerald-600 px-4 py-3 ${
            isSubmitting ? 'opacity-70' : ''
          }`}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-center font-semibold text-white">
              Ingresar
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
