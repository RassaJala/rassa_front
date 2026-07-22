import { AdminCrudTable } from '../components/admin/AdminCrudTable';

interface Category {
  id: number;
  nombre: string;
  descripcion: string;
  estado: boolean;
}

const initialData: Category[] = [
  {
    id: 1,
    nombre: 'Hortalizas',
    descripcion: 'Verduras y hortalizas frescas',
    estado: true,
  },
  { id: 2, nombre: 'Frutas', descripcion: 'Frutas de temporada', estado: true },
  { id: 3, nombre: 'Cereales', descripcion: 'Granos y cereales', estado: true },
  {
    id: 4,
    nombre: 'Legumbres',
    descripcion: 'Legumbres variadas',
    estado: false,
  },
];

export function AdminCategories() {
  return (
    <AdminCrudTable<Category>
      entityName="categoría"
      entityNamePlural="categorías"
      initialData={initialData}
      fields={[
        { name: 'nombre', label: 'Nombre', placeholder: 'Ej: Hortalizas', required: true, fullWidth: true },
        { name: 'descripcion', label: 'Descripción', placeholder: 'Descripción de la categoría', type: 'textarea', fullWidth: true },
      ]}
      searchFields={['nombre', 'descripcion']}
      nextIdStart={5}
    />
  );
}
