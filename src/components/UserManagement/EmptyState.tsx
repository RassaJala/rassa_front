import React from 'react';
import { Text, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors } from '@/constants/colors';

interface EmptyStateProps {
  hasFilters: boolean;
}

export default function EmptyState({
  hasFilters,
}: EmptyStateProps): React.JSX.Element {
  return (
    <View className="items-center justify-center px-8 py-20">
      <MaterialCommunityIcons
        name="account-search-outline"
        size={64}
        color={colors.iconMuted}
      />
      <Text className="mt-4 text-center text-base text-gray-500 dark:text-gray-400">
        {hasFilters
          ? 'No se encontraron usuarios con esos filtros.'
          : 'No hay usuarios registrados.'}
      </Text>
    </View>
  );
}
