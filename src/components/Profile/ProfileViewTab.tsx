import React from 'react';
import { Text, View } from 'react-native';

import type { useAuth } from '@/store/AuthContext';
import { getGenderLabel } from '@/utils/labels';

interface ProfileViewTabProps {
  readonly user: ReturnType<typeof useAuth>['user'];
}

export default function ProfileViewTab({
  user,
}: ProfileViewTabProps): React.JSX.Element {
  return (
    <View className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <Text className="text-brand-ink mb-4 border-b border-gray-200 pb-2 text-lg font-bold dark:border-gray-800 dark:text-gray-100">
        Detalles Personales
      </Text>

      <View className="space-y-4">
        <View className="mb-3">
          <Text className="text-xs text-gray-500 dark:text-gray-400">
            Nombre Completo
          </Text>
          <Text className="text-brand-ink text-base font-normal dark:text-gray-200">
            {user?.nombre} {user?.apellido_paterno}{' '}
            {user?.apellido_materno ?? ''}
          </Text>
        </View>

        <View className="mb-3">
          <Text className="text-xs text-gray-500 dark:text-gray-400">
            Teléfono
          </Text>
          <Text className="text-brand-ink text-base font-normal dark:text-gray-200">
            {user?.telefono ?? 'No especificado'}
          </Text>
        </View>

        <View className="mb-3">
          <Text className="text-xs text-gray-500 dark:text-gray-400">
            Fecha de Nacimiento
          </Text>
          <Text className="text-brand-ink text-base font-normal dark:text-gray-200">
            {user?.fecha_nacimiento}
          </Text>
        </View>

        <View className="mb-3">
          <Text className="text-xs text-gray-500 dark:text-gray-400">
            Género
          </Text>
          <Text className="text-brand-ink text-base font-normal dark:text-gray-200">
            {user?.genero ? getGenderLabel(user.genero) : 'No especificado'}
          </Text>
        </View>

        <View className="mb-3">
          <Text className="text-xs text-gray-500 dark:text-gray-400">
            Dirección
          </Text>
          <Text className="text-brand-ink text-base font-normal dark:text-gray-200">
            {user?.direccion}
          </Text>
        </View>

        <View className="mb-3">
          <Text className="text-xs text-gray-500 dark:text-gray-400">
            Localidad
          </Text>
          <Text className="text-brand-ink text-base font-normal dark:text-gray-200">
            {user?.localidad_nombre}
          </Text>
        </View>
      </View>
    </View>
  );
}
