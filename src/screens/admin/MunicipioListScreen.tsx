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
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
      }}
    >
      {/* Top row: Icon + Info */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {/* Icono de Estado */}
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: item.estado
              ? colors.activeGreenBg
              : colors.inactiveGrayBg,
          }}
        >
          <MaterialCommunityIcons
            name={item.estado ? 'check-circle-outline' : 'circle-outline'}
            size={20}
            color={item.estado ? colors.brandGreenForest : colors.iconMuted}
          />
        </View>

        {/* Info */}
        <View style={{ flex: 1 }}>
          <Text
            style={{ fontSize: 16, fontWeight: '600', color: colors.text }}
            numberOfLines={1}
          >
            {item.nombre}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              marginTop: 2,
            }}
          >
            <View
              style={{
                borderRadius: 999,
                backgroundColor: item.estado
                  ? colors.activeGreenBg
                  : colors.inactiveGrayBg,
                paddingHorizontal: 8,
                paddingVertical: 2,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '600',
                  color: item.estado
                    ? colors.brandGreenForest
                    : colors.iconMuted,
                }}
              >
                {item.estado ? 'Activo' : 'Inactivo'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Bottom row: Ver localidades (Left) + CRUD Actions (Right) */}
      <View
        style={{
          marginTop: 12,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* "Ver localidades" (botón con texto) */}
        <Pressable
          onPress={() =>
            navigation.navigate('LocalidadList', {
              municipioId: item.id_municipio,
              municipioNombre: item.nombre,
            })
          }
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingVertical: 6,
            paddingHorizontal: 8,
          }}
          hitSlop={8}
        >
          <MaterialCommunityIcons
            name="map-marker-outline"
            size={16}
            color={colors.brandGreenForest}
          />
          <Text
            style={{
              fontSize: 13,
              fontWeight: '600',
              color: colors.brandGreenForest,
            }}
          >
            Ver localidades
          </Text>
        </Pressable>

        {/* CRUD Actions: 36x36 buttons */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable
            onPress={actions.onEdit}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            hitSlop={6}
          >
            <MaterialCommunityIcons
              name="pencil-outline"
              size={16}
              color={colors.brandGreenForest}
            />
          </Pressable>

          <Pressable
            onPress={actions.onToggleStatus}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            hitSlop={6}
          >
            <MaterialCommunityIcons
              name={
                item.estado ? 'pause-circle-outline' : 'play-circle-outline'
              }
              size={16}
              color={colors.iconMuted}
            />
          </Pressable>

          <Pressable
            onPress={actions.onDelete}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            hitSlop={6}
          >
            <MaterialCommunityIcons
              name="trash-can-outline"
              size={16}
              color={colors.error}
            />
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
