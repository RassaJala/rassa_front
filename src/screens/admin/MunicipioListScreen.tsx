import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import CrudListScreen from '@/components/CrudListScreen';
import { colors } from '@/constants/colors';
import type { AdminStackParamList, Municipio } from '@/types';

type NavigationProp = NativeStackNavigationProp<
  AdminStackParamList,
  'MunicipioList'
>;

interface Props {
  readonly navigation: NavigationProp;
}

interface ItemActions {
  readonly onEdit: () => void;
  readonly onToggleStatus: () => void;
  readonly onDelete: () => void;
}

interface MunicipioItemProps {
  readonly item: Municipio;
  readonly actions: ItemActions;
  readonly navigation: NavigationProp;
}

// ── List item — extracted so the config object stays stable ──

function MunicipioListItem({
  item,
  actions,
  navigation,
}: MunicipioItemProps): React.JSX.Element {
  return (
    <View className="rounded-xl bg-white p-4 shadow-sm dark:border dark:border-gray-800 dark:bg-gray-900 dark:shadow-none">
      <View className="flex-row items-start">
        <View className="mr-3 mt-0.5 h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
          <MaterialCommunityIcons
            name={item.estado ? 'check-circle-outline' : 'circle-outline'}
            size={20}
            color={item.estado ? colors.brandGreenForest : colors.iconMuted}
          />
        </View>

        <View className="flex-1">
          <Text className="text-lg font-medium text-brand-ink dark:text-gray-100">
            {item.nombre}
          </Text>
          <View className="mt-2 self-start rounded-full bg-gray-100 px-2.5 py-0.5 dark:bg-gray-800">
            <Text
              className={`text-xs font-medium ${
                item.estado
                  ? 'text-brand-green-forest'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {item.estado ? 'Activo' : 'Inactivo'}
            </Text>
          </View>
        </View>
      </View>

      <View className="mt-3 flex-row items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
        {/* "Ver localidades" — unique to Municipio */}
        <Pressable
          onPress={() =>
            navigation.navigate('LocalidadList', {
              municipioId: item.id_municipio,
              municipioNombre: item.nombre,
            })
          }
          className="flex-row items-center gap-1 rounded-md px-2 py-1"
          hitSlop={8}
        >
          <MaterialCommunityIcons
            name="map-marker-outline"
            size={14}
            color={colors.brandGreenForest}
          />
          <Text className="text-xs font-medium text-brand-green-forest">
            Ver localidades
          </Text>
        </Pressable>

        <View className="flex-row items-center gap-4">
          <Pressable
            onPress={actions.onEdit}
            className="flex-row items-center gap-1 rounded-md px-2 py-1"
            hitSlop={8}
          >
            <MaterialCommunityIcons
              name="pencil-outline"
              size={14}
              color={colors.brandRedCoral}
            />
            <Text className="text-xs font-medium text-brand-red-coral">
              Editar
            </Text>
          </Pressable>

          <Pressable
            onPress={actions.onToggleStatus}
            className="flex-row items-center gap-1 rounded-md px-2 py-1"
            hitSlop={8}
          >
            <MaterialCommunityIcons
              name={
                item.estado ? 'close-circle-outline' : 'check-circle-outline'
              }
              size={14}
              color={colors.textSecondary}
            />
            <Text className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {item.estado ? 'Desactivar' : 'Activar'}
            </Text>
          </Pressable>

          <Pressable
            onPress={actions.onDelete}
            className="flex-row items-center gap-1 rounded-md px-2 py-1"
            hitSlop={8}
          >
            <MaterialCommunityIcons
              name="trash-can-outline"
              size={14}
              color={colors.error}
            />
            <Text className="text-xs font-medium text-red-500">Eliminar</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ── Config factory — receives navigation only for renderListItem ──

function makeMunicipioConfig(navigation: NavigationProp) {
  return {
    queryKey: ['municipios'] as const,
    endpoint: '/municipios/',
    comingSoon: false,
    entityName: 'municipio',
    entityNamePlural: 'Municipios',
    entityNamePluralLower: 'municipios',
    getId: (item: Municipio) => item.id_municipio,
    fields: [{ name: 'nombre', label: 'Nombre' }] as const,
    errorFieldKeys: ['nombre', 'detail'] as const,
    emptyIcon: 'map-outline',
    emptyText: 'No hay municipios',
    emptyDescription: 'Agrega un municipio para comenzar.',
    headerTitle: 'Municipios',
    loadingErrorText: 'Error al cargar municipios.',
    newDialogTitle: 'Nuevo municipio',
    editDialogTitle: 'Editar municipio',
    deleteDialogTitle: 'Eliminar municipio',
    deleteConfirmText: (item: Municipio) =>
      `¿Estás seguro de eliminar "${item.nombre}"?`,
    toastCreated: (name: string) => `Se creó el municipio "${name}"`,
    toastEdited: (name: string) => `Se editó el municipio "${name}"`,
    toastDeleted: (name: string) => `Se eliminó el municipio "${name}"`,
    toastActivated: (name: string) => `Se activó el municipio "${name}"`,
    toastDeactivated: (name: string) => `Se desactivó el municipio "${name}"`,
    statusLabels: { active: 'Activo', inactive: 'Inactivo' },
    trashScreenName: 'MunicipioTrash' as const,
    validate: (formValues: Record<string, string>) => {
      if (!(formValues.nombre ?? '').trim()) return 'El nombre es obligatorio.';
      return null;
    },
    renderListItem: (item: Municipio, actions: ItemActions) => (
      <MunicipioListItem
        item={item}
        actions={actions}
        navigation={navigation}
      />
    ),
  };
}

// ── Screen ──

export default function MunicipioListScreen({
  navigation,
}: Props): React.JSX.Element {
  const config = React.useMemo(
    () => makeMunicipioConfig(navigation),
    [navigation],
  );

  return <CrudListScreen<Municipio> config={config} navigation={navigation} />;
}
