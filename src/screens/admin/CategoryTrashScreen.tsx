import React from 'react';

import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import TrashListScreen from '@/components/TrashListScreen';
import type { AdminStackParamList, Category } from '@/types';

type NavigationProp = NativeStackNavigationProp<
  AdminStackParamList,
  'CategoryTrash'
>;

interface Props {
  readonly navigation: NavigationProp;
}

const categoryTrashConfig = {
  queryKey: ['categories'] as const,
  endpoint: '/categorias/',
  entityName: 'categoría',
  entityNamePlural: 'Categorías',
  getId: (item: Category) => item.id_categoria,
  getSecondValue: (item: Category) => item.descripcion,
  headerTitle: 'Categorías inactivas',
  emptyText: 'No hay categorías en la papelera',
  emptyDescription: 'Las categorías desactivadas aparecerán aquí.',
  loadingErrorText: 'Error al cargar la papelera de categorías.',
  toastRestored: (name: string) => `Se restauró la categoría "${name}"`,
  toastPermanentDeleted: (name: string) =>
    `Se eliminó permanentemente la categoría "${name}"`,
  permanentConfirmText: (item: Category) =>
    `¿Estás seguro de eliminar permanentemente "${item.nombre}"?`,
  listScreen: 'CategoryList' as const,
};

export default function CategoryTrashScreen({
  navigation,
}: Props): React.JSX.Element {
  return (
    <TrashListScreen config={categoryTrashConfig} navigation={navigation} />
  );
}
