import React from 'react';

import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import CrudListScreen from '@/components/CrudListScreen';
import type { AdminStackParamList, Unit } from '@/types';

type NavigationProp = NativeStackNavigationProp<
  AdminStackParamList,
  'UnitList'
>;

interface Props {
  readonly navigation: NavigationProp;
}

const unitConfig = {
  queryKey: ['units'] as const,
  endpoint: '/unidades/',
  entityName: 'unidad',
  entityNamePlural: 'Unidades de Medida',
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
  emptyIcon: '📏',
  emptyText: 'No hay unidades',
  emptyDescription: 'Agrega una unidad de medida para comenzar.',
  headerTitle: 'Unidades de Medida',
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
  validate: (formValues: Record<string, string>) => {
    if (!(formValues.nombre ?? '').trim()) return 'El nombre es obligatorio.';
    if (!(formValues.abreviatura ?? '').trim())
      return 'La abreviatura es obligatoria.';
    return null;
  },
};

export default function UnitListScreen({
  navigation,
}: Props): React.JSX.Element {
  return <CrudListScreen config={unitConfig} navigation={navigation} />;
}
