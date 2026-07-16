import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native';
import { Button } from 'react-native-paper';

import LogoutButton from '@/components/LogoutButton';
import { colors } from '@/constants/colors';
import {
  useClosePublicacion,
  useDeletePublicacion,
  usePublicaciones,
} from '@/hooks/usePublications';
import type { Publicacion, PublicacionEstado } from '@/services/publications';

interface Props {
  navigation: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
}

const STATUS_TABS: { key: PublicacionEstado | 'all'; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'borrador', label: 'Borradores' },
  { key: 'publicado', label: 'Publicadas' },
  { key: 'cerrado', label: 'Cerradas' },
];

const STATUS_COLORS: Record<
  PublicacionEstado,
  { bg: string; text: string; border: string }
> = {
  borrador: {
    bg: 'bg-amber-50 dark:bg-amber-950',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800',
  },
  publicado: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-brand-coral',
    border: 'border-gray-200 dark:border-gray-700',
  },
  cerrado: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-500 dark:text-gray-400',
    border: 'border-gray-200 dark:border-gray-700',
  },
  cancelado: {
    bg: 'bg-red-50 dark:bg-red-950',
    text: 'text-red-500',
    border: 'border-red-200 dark:border-red-800',
  },
};

const STATUS_LABELS: Record<PublicacionEstado, string> = {
  borrador: 'Borrador',
  publicado: 'Publicado',
  cerrado: 'Cerrado',
  cancelado: 'Cancelado',
};

export default function FarmerDashboardScreen({
  navigation,
}: Props): React.JSX.Element {
  const [selectedTab, setSelectedTab] = useState<PublicacionEstado | 'all'>(
    'all',
  );

  const filterEstado = selectedTab === 'all' ? undefined : selectedTab;
  const { data: response, isLoading, refetch } = usePublicaciones(filterEstado);
  const deleteMutation = useDeletePublicacion();
  const closeMutation = useClosePublicacion();

  const publicaciones = response?.data?.results ?? [];

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refetch();
      }
    });
    return () => subscription.remove();
  }, [refetch]);

  const handleNewPublication = useCallback(() => {
    navigation.navigate('PublicationWizard', {});
  }, [navigation]);

  const handleOpenPublication = useCallback(
    (item: Publicacion) => {
      navigation.navigate('PublicationWizard', {
        publicationId: item.id_publicacion,
      });
    },
    [navigation],
  );

  const handleDelete = useCallback(
    (item: Publicacion) => {
      Alert.alert(
        'Cancelar publicación',
        `¿Estás seguro de que quieres cancelar la publicación de la semana ${String(item.semana)}?`,
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Sí, cancelar',
            style: 'destructive',
            onPress: () => deleteMutation.mutate(item.id_publicacion),
          },
        ],
      );
    },
    [deleteMutation],
  );

  const handleClose = useCallback(
    (item: Publicacion) => {
      Alert.alert(
        'Cerrar publicación',
        `¿Cerrar la publicación de la semana ${String(item.semana)}? Los compradores ya no podrán hacer pedidos.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Cerrar',
            onPress: () => closeMutation.mutate(item.id_publicacion),
          },
        ],
      );
    },
    [closeMutation],
  );

  const renderItem = useCallback(
    ({ item }: { item: Publicacion }) => {
      const statusColors = STATUS_COLORS[item.estado] ?? STATUS_COLORS.borrador;
      const productCount = item.productos.length;

      return (
        <Pressable
          className={`mb-3 rounded-xl border p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:shadow-none ${statusColors.border} bg-white`}
          onPress={() => handleOpenPublication(item)}
          accessibilityRole="button"
          accessibilityLabel={`Publicación semana ${String(item.semana)}`}
        >
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Semana {String(item.semana)}
            </Text>
            <View className={`rounded-full px-2.5 py-1 ${statusColors.bg}`}>
              <Text className={`text-xs font-medium ${statusColors.text}`}>
                {STATUS_LABELS[item.estado]}
              </Text>
            </View>
          </View>

          <Text className="mb-1 text-sm text-gray-500 dark:text-gray-400">
            Publicación: {item.fecha_publicacion}
          </Text>

          <Text className="mb-3 text-sm text-gray-500 dark:text-gray-400">
            {productCount === 0
              ? 'Sin productos'
              : `${String(productCount)} producto${productCount === 1 ? '' : 's'}`}
          </Text>

          <View className="flex-row gap-2">
            {item.estado === 'borrador' ? (
              <>
                <Button
                  mode="contained"
                  buttonColor={colors.brandRedCoral}
                  onPress={() => handleOpenPublication(item)}
                  style={{ flex: 1 }}
                  labelStyle={{ fontSize: 14 }}
                >
                  Editar
                </Button>
                <Button
                  mode="outlined"
                  textColor={colors.error}
                  onPress={() => handleDelete(item)}
                  labelStyle={{ fontSize: 14 }}
                >
                  Cancelar
                </Button>
              </>
            ) : item.estado === 'publicado' ? (
              <Button
                mode="outlined"
                textColor={colors.textSecondary}
                onPress={() => handleClose(item)}
                style={{ flex: 1 }}
                labelStyle={{ fontSize: 14 }}
              >
                Cerrar
              </Button>
            ) : null}
          </View>
        </Pressable>
      );
    },
    [handleOpenPublication, handleDelete, handleClose],
  );

  const keyExtractor = useCallback(
    (item: Publicacion) => String(item.id_publicacion),
    [],
  );

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-950">
      {/* Header — Forest green */}
      <View className="border-b border-gray-200 bg-brand-green-forest px-4 pb-3 pt-12 dark:border-gray-800">
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-lg font-semibold text-white">
            Publicaciones Semanales
          </Text>
          <LogoutButton mode="text" />
        </View>
      </View>

      {/* Status tabs */}
      <View className="border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-800 dark:bg-gray-900">
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={STATUS_TABS}
          keyExtractor={(item) => item.key}
          renderItem={({ item: tab }) => {
            const isSelected = selectedTab === tab.key;
            return (
              <Pressable
                onPress={() => setSelectedTab(tab.key)}
                className={`mr-2 rounded-full border px-3 py-1.5 ${
                  isSelected
                    ? 'border-brand-coral bg-brand-coral'
                    : 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800'
                }`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <Text
                  className={`text-sm font-medium ${
                    isSelected
                      ? 'text-white'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {/* New publication button */}
      <View className="px-4 py-3">
        <Button
          mode="contained"
          buttonColor={colors.brandRedCoral}
          onPress={handleNewPublication}
          labelStyle={{ fontSize: 14, fontWeight: '600' }}
          contentStyle={{ paddingVertical: 4 }}
        >
          + Nueva Publicación
        </Button>
      </View>

      {/* Publications list */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.brandRedCoral} size="large" />
          <Text className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Cargando publicaciones...
          </Text>
        </View>
      ) : (
        <FlatList
          data={publicaciones}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <View className="flex-1 items-center py-12">
              <Text className="text-sm text-gray-500 dark:text-gray-400">
                No se encontraron publicaciones.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
