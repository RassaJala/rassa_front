import React from 'react';

import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import CrudListScreen from '@/components/CrudListScreen';
import type { AdminStackParamList, Municipio } from '@/types';

type NavigationProp = NativeStackNavigationProp<
  AdminStackParamList,
  'MunicipioList'
>;

interface Props {
  readonly navigation: NavigationProp;
}

const municipioConfig = {
  queryKey: ['municipios'] as const,
  endpoint: '/municipios/',
  comingSoon: false,
  entityName: 'municipio',
  entityNamePlural: 'Municipios',
  entityNamePluralLower: 'municipios',
  getId: (item: Municipio) => item.id_municipio,
  fields: [{ name: 'nombre', label: 'Nombre' }] as const,
  errorFieldKeys: ['nombre', 'detail'] as const,
  emptyIcon: 'map-marker-outline',
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
  validate: (formValues: Record<string, string>) => {
    if (!(formValues.nombre ?? '').trim()) return 'El nombre es obligatorio.';
    return null;
  },
};

export default function MunicipioListScreen({
  navigation,
}: Props): React.JSX.Element {
  return <CrudListScreen config={municipioConfig} navigation={navigation} />;
}
