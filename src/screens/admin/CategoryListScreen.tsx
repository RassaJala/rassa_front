import React from 'react';

import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import CrudListScreen from '@/components/CrudListScreen';
import type { AdminStackParamList, Category } from '@/types';

type NavigationProp = NativeStackNavigationProp<
  AdminStackParamList,
  'CategoryList'
>;

interface Props {
  readonly navigation: NavigationProp;
}

const categoryConfig = {
  queryKey: ['categories'] as const,
  endpoint: '/categorias/',
  comingSoon: false,
  entityName: 'categoría',
  entityNamePlural: 'Categorías',
  entityNamePluralLower: 'categorías',
  getId: (item: Category) => item.id_categoria,
  fields: [
    { name: 'nombre', label: 'Nombre' },
    {
      name: 'descripcion',
      label: 'Descripción',
      multiline: true,
      numberOfLines: 3,
    },
    {
      name: 'productos_count',
      label: '#Productos',
    },
  ] as const,
  errorFieldKeys: ['nombre', 'descripcion', 'detail'] as const,
  emptyIcon: 'folder-open-outline',
  emptyText: 'No hay categorías',
  emptyDescription: 'Agrega una categoría para comenzar.',
  headerTitle: 'Categorías',
  loadingErrorText: 'Error al cargar categorías.',
  newDialogTitle: 'Nueva categoría',
  editDialogTitle: 'Editar categoría',
  deleteDialogTitle: 'Eliminar categoría',
  deleteConfirmText: (item: Category) =>
    `¿Estás seguro de eliminar "${item.nombre}"?`,
  toastCreated: (name: string) => `Se creó la categoría "${name}"`,
  toastEdited: (name: string) => `Se editó la categoría "${name}"`,
  toastDeleted: (name: string) => `Se eliminó la categoría "${name}"`,
  toastActivated: (name: string) => `Se activó la categoría "${name}"`,
  toastDeactivated: (name: string) => `Se desactivó la categoría "${name}"`,
  statusLabels: { active: 'Activo', inactive: 'Inactivo' },
  trashScreenName: 'CategoryTrash' as const,
  validate: (formValues: Record<string, string>) => {
    if (!(formValues.nombre ?? '').trim()) return 'El nombre es obligatorio.';
    if (!(formValues.descripcion ?? '').trim())
      return 'La descripción es obligatoria.';
    return null;
  },
};

export default function CategoryListScreen({
  navigation,
}: Props): React.JSX.Element {
  return <CrudListScreen config={categoryConfig} navigation={navigation} />;
}
