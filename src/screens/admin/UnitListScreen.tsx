import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import CrudListScreen from '@/components/CrudListScreen';
import { colors } from '@/constants/colors';
import { useTheme } from '@/store/ThemeContext';
import type { AdminStackParamList, Unit } from '@/types';

type NavigationProp = NativeStackNavigationProp<
  AdminStackParamList,
  'UnitList'
>;

interface Props {
  readonly navigation: NavigationProp;
}

function UnitListItem({
  item,
  actions,
}: {
  item: Unit;
  actions: {
    onEdit: () => void;
    onToggleStatus: () => void;
    onDelete: () => void;
  };
}) {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const surface = isDark ? colors.admSurfaceD : colors.admSurfaceL;
  const fg = isDark ? colors.admFgD : colors.admFgL;
  const muted = isDark ? colors.admMutedD : colors.admMutedL;
  const border = isDark ? colors.admBorderD : colors.admBorderL;
  const brand = isDark ? colors.admBrandD : colors.admBrandL;
  const errorColor = colors.brandRedCoral;
  const accentBg = isDark ? colors.admActiveBgD : colors.admActiveBgL;
  const description = item.abreviatura || 'Sin abreviatura';

  return (
    <View
      style={{
        backgroundColor: surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: border,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: accentBg,
        }}
      >
        <MaterialCommunityIcons
          name={item.estado ? 'check-circle-outline' : 'circle-outline'}
          size={20}
          color={item.estado ? brand : muted}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{ fontSize: 16, fontWeight: '600', color: fg }}
          numberOfLines={1}
        >
          {item.nombre}
        </Text>
        <Text
          style={{ fontSize: 13, color: muted, marginTop: 2 }}
          numberOfLines={1}
        >
          {description}
        </Text>
      </View>
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
        <MaterialCommunityIcons name="pencil-outline" size={16} color={brand} />
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
        <MaterialCommunityIcons
          name={item.estado ? 'pause-circle-outline' : 'play-circle-outline'}
          size={16}
          color={muted}
        />
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
  );
}

const unitConfig = {
  queryKey: ['units'] as const,
  endpoint: '/unidades/',
  comingSoon: false,
  entityName: 'unidad',
  entityNamePlural: 'Unites de Medida',
  entityNamePluralLower: 'unidades de medida',
  getId: (item: Unit) => item.id_unidad,
  fields: [
    { name: 'nombre', label: 'Nombre' },
    {
      name: 'abreviatura',
      label: 'Abreviatura',
      placeholder: 'ej. kg, pz, lt',
    },
  ] as const,
  errorFieldKeys: ['nombre', 'abreviatura', 'detail'] as const,
  emptyIcon: 'ruler',
  emptyText: 'No hay unidades',
  emptyDescription: 'Agrega una unidad de medida para comenzar.',
  headerTitle: 'Unites de Medida',
  loadingErrorText: 'Error al cargar unidades de medida.',
  newDialogTitle: 'Nueva unidad',
  editDialogTitle: 'Editar unidad',
  deleteDialogTitle: 'Eliminar unidad',
  deleteConfirmText: (item: Unit) =>
    `¿Estás seguro de eliminar "${item.nombre} (${item.abreviatura})"?`,
  toastCreated: (name: string) => `Se creó la unidad "${name}"`,
  toastEdited: (name: string) => `Se editó la unidad "${name}"`,
  toastDeleted: (name: string) => `Se eliminó la unidad "${name}"`,
  toastActivated: (name: string) => `Se activó la unidad "${name}"`,
  toastDeactivated: (name: string) => `Se desactivó la unidad "${name}"`,
  statusLabels: { active: 'Activo', inactive: 'Inactivo' },
  trashScreenName: 'UnitTrash' as const,
  validate: (formValues: Record<string, string>) => {
    if (!(formValues.nombre ?? '').trim()) return 'El nombre es obligatorio.';
    if (!(formValues.abreviatura ?? '').trim())
      return 'La abreviatura es obligatoria.';
    return null;
  },
  extraDuplicateCheck: (
    formValues: Record<string, string>,
    items: Unit[] | undefined,
    editingItem: Unit | null,
  ) => {
    const abbrev = (formValues.abreviatura ?? '').trim();
    if (!abbrev) return null;

    const abbrevLower = abbrev.toLocaleLowerCase();
    const isAbbrevDuplicate = (items ?? []).some(
      (u) =>
        (u.abreviatura ?? '').toLocaleLowerCase() === abbrevLower &&
        (!editingItem || u.id_unidad !== editingItem.id_unidad),
    );

    if (isAbbrevDuplicate) {
      return `Ya existe una unidad con la abreviatura "${abbrev}".`;
    }

    return null;
  },
  renderListItem: (
    item: Unit,
    actions: {
      readonly onEdit: () => void;
      readonly onToggleStatus: () => void;
      readonly onDelete: () => void;
    },
  ) => <UnitListItem item={item} actions={actions} />,
};

export default function UnitListScreen({
  navigation,
}: Props): React.JSX.Element {
  return <CrudListScreen config={unitConfig} navigation={navigation} />;
}
