import React from 'react';

import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import TrashListScreen from '@/components/TrashListScreen';
import type { AdminStackParamList, Localidad } from '@/types';

type NavigationProp = NativeStackNavigationProp<
  AdminStackParamList,
  'LocalidadTrash'
>;

type RoutePropType = RouteProp<AdminStackParamList, 'LocalidadTrash'>;

interface Props {
  readonly navigation: NavigationProp;
  readonly route: RoutePropType;
}

export default function LocalidadTrashScreen({
  navigation,
  route,
}: Props): React.JSX.Element {
  const { municipioId, municipioNombre } = route.params;

  const localidadTrashConfig = {
    queryKey: ['localidades'] as const,
    endpoint: '/localidades/',
    queryParams: { municipio_id: String(municipioId) },
    entityName: 'localidad',
    entityNamePlural: `Localidades - ${municipioNombre}`,
    getId: (item: Localidad) => item.id_localidad,
    getSecondValue: () => null,
    headerTitle: `Localidades inactivas (${municipioNombre})`,
    emptyText: 'No hay localidades en la papelera',
    emptyDescription: `Las localidades desactivadas de ${municipioNombre} aparecerán aquí.`,
    loadingErrorText: 'Error al cargar la papelera de localidades.',
    toastRestored: (name: string) => `Se restauró la localidad "${name}"`,
    toastPermanentDeleted: (name: string) =>
      `Se eliminó permanentemente la localidad "${name}"`,
    permanentConfirmText: (item: Localidad) =>
      `¿Estás seguro de eliminar permanentemente "${item.nombre}"?`,
    listScreen: 'LocalidadList' as const,
  };

  return (
    <TrashListScreen<Localidad>
      config={localidadTrashConfig}
      navigation={navigation}
    />
  );
}
