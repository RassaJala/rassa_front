import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import CrudListScreen from '@/components/CrudListScreen';
import { colors } from '@/constants/colors';
import { useTheme } from '@/store/ThemeContext';
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

interface ItemTheme {
  readonly surface: string;
  readonly fg: string;
  readonly muted: string;
  readonly border: string;
  readonly brand: string;
  readonly errorColor: string;
  readonly statusBg: string;
  readonly statusColor: string;
  readonly statusIcon: 'check-circle-outline' | 'circle-outline';
  readonly statusLabel: 'Activo' | 'Inactivo';
  readonly toggleIcon: 'pause-circle-outline' | 'play-circle-outline';
  readonly shadowOpacity: number;
  readonly elevation: number;
}

const LIGHT_THEME = {
  surface: colors.admSurfaceL,
  fg: colors.admFgL,
  muted: colors.admMutedL,
  border: colors.admBorderL,
  brand: colors.admBrandL,
  shadowOpacity: 0.05,
  elevation: 2,
  activeBg: colors.admActiveBgL,
  inactiveBg: colors.admInactiveBgL,
} as const;

const DARK_THEME = {
  surface: colors.admSurfaceD,
  fg: colors.admFgD,
  muted: colors.admMutedD,
  border: colors.admBorderD,
  brand: colors.admBrandD,
  shadowOpacity: 0,
  elevation: 0,
  activeBg: colors.admActiveBgD,
  inactiveBg: colors.admInactiveBgD,
} as const;

function getMunicipioItemTheme(
  isDark: boolean,
  isEstadoActive: boolean,
): ItemTheme {
  const theme = isDark ? DARK_THEME : LIGHT_THEME;
  const statusBg = isEstadoActive ? theme.activeBg : theme.inactiveBg;
  const statusColor = isEstadoActive ? theme.brand : theme.muted;
  const statusIcon = isEstadoActive ? 'check-circle-outline' : 'circle-outline';
  const statusLabel = isEstadoActive ? 'Activo' : 'Inactivo';
  const toggleIcon = isEstadoActive
    ? 'pause-circle-outline'
    : 'play-circle-outline';

  return {
    surface: theme.surface,
    fg: theme.fg,
    muted: theme.muted,
    border: theme.border,
    brand: theme.brand,
    errorColor: colors.brandRedCoral,
    statusBg,
    statusColor,
    statusIcon,
    statusLabel,
    toggleIcon,
    shadowOpacity: theme.shadowOpacity,
    elevation: theme.elevation,
  };
}

function MunicipioListItem({
  item,
  actions,
  navigation,
}: MunicipioItemProps): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const {
    surface,
    fg,
    muted,
    border,
    brand,
    errorColor,
    statusBg,
    statusColor,
    statusIcon,
    statusLabel,
    toggleIcon,
    shadowOpacity,
    elevation,
  } = getMunicipioItemTheme(isDark, item.estado);

  return (
    <View
      style={{
        backgroundColor: surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: border,
        padding: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity,
        shadowRadius: 2,
        elevation,
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
            backgroundColor: statusBg,
          }}
        >
          <MaterialCommunityIcons
            name={statusIcon}
            size={20}
            color={statusColor}
          />
        </View>

        {/* Info */}
        <View style={{ flex: 1 }}>
          <Text
            style={{ fontSize: 16, fontWeight: '600', color: fg }}
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
                backgroundColor: statusBg,
                paddingHorizontal: 8,
                paddingVertical: 2,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '600',
                  color: statusColor,
                }}
              >
                {statusLabel}
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
          borderTopColor: border,
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
            color={brand}
          />
          <Text
            style={{
              fontSize: 13,
              fontWeight: '600',
              color: brand,
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
              borderColor: border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            hitSlop={6}
          >
            <MaterialCommunityIcons
              name="pencil-outline"
              size={16}
              color={brand}
            />
          </Pressable>

          <Pressable
            onPress={actions.onToggleStatus}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            hitSlop={6}
          >
            <MaterialCommunityIcons name={toggleIcon} size={16} color={muted} />
          </Pressable>

          <Pressable
            onPress={actions.onDelete}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            hitSlop={6}
          >
            <MaterialCommunityIcons
              name="trash-can-outline"
              size={16}
              color={errorColor}
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
    toggleEndpoint: 'estado/',
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
