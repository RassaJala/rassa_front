import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '@/store/AuthContext';

export default function LoginScreen(): React.JSX.Element {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleLoginPress() {
    void handleLogin();
  }

  async function handleLogin() {
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Ingresa tu correo y contraseña.');
      return;
    }

    if (!email.includes('@')) {
      setErrorMessage('Ingresa un correo electrónico válido.');
      return;
    }

    setIsSubmitting(true);

    try {
      await login(email.trim(), password);
    } catch (error) {
      let message =
        'No se pudo iniciar sesión. Revisa el backend y la URL de la API.';

      if (error instanceof Error) {
        message = error.message;
      } else if (typeof error === 'string') {
        message = error;
      } else if (error && typeof error === 'object') {
        message = JSON.stringify(error);
      }

      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
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
          className="mb-4 rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="Correo electrónico"
          placeholderTextColor="#94a3b8"
          value={email}
        />

        <TextInput
          className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900"
          onChangeText={setPassword}
          placeholder="Contraseña"
          placeholderTextColor="#94a3b8"
          secureTextEntry
          value={password}
        />

        {errorMessage ? (
          <Text className="mt-4 text-center text-sm text-red-600">
            {errorMessage}
          </Text>
        ) : null}

        <Pressable
          className={`mt-6 rounded-xl bg-emerald-600 px-4 py-3 ${isSubmitting ? 'opacity-70' : ''}`}
          disabled={isSubmitting}
          onPress={handleLoginPress}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
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
