import React from 'react';

import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import TrashListScreen from '@/components/TrashListScreen';
import type { AdminStackParamList, Unit } from '@/types';

type NavigationProp = NativeStackNavigationProp<
  AdminStackParamList,
  'UnitTrash'
>;

interface Props {
  readonly navigation: NavigationProp;
}

const unitTrashConfig = {
  queryKey: ['units'] as const,
  endpoint: '/unidades/',
  entityName: 'unidad',
  entityNamePlural: 'Unites de Medida',
  getId: (item: Unit) => item.id_unidad,
  getSecondValue: (item: Unit) => item.abreviatura,
  headerTitle: 'Unidades de Medida',
  emptyText: 'No hay unidades en la papelera',
  emptyDescription: 'Las unidades desactivadas aparecerán aquí.',
  loadingErrorText: 'Error al cargar la papelera de unidades.',
  toastRestored: (name: string) => `Se restauró la unidad "${name}"`,
  toastPermanentDeleted: (name: string) =>
    `Se eliminó permanentemente la unidad "${name}"`,
  permanentConfirmText: (item: Unit) =>
    `¿Estás seguro de eliminar permanentemente "${item.nombre} (${item.abreviatura})"?`,
  listScreen: 'UnitList' as const,
};

export default function UnitTrashScreen({
  navigation,
}: Props): React.JSX.Element {
  return <TrashListScreen config={unitTrashConfig} navigation={navigation} />;
}
