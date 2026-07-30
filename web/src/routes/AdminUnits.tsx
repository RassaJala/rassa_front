import { AdminCrudTable } from '../components/admin/AdminCrudTable';

interface Unit {
  id: number;
  nombre: string;
  abreviatura: string;
  estado: boolean;
}

const initialData: Unit[] = [
  { id: 1, nombre: 'Kilogramo', abreviatura: 'kg', estado: true },
  { id: 2, nombre: 'Unidad', abreviatura: 'pz', estado: true },
  { id: 3, nombre: 'Litro', abreviatura: 'lt', estado: true },
  { id: 4, nombre: 'Libra', abreviatura: 'lb', estado: false },
];

export function AdminUnits() {
  return (
    <AdminCrudTable<Unit>
      entityName="unidad de medida"
      entityNamePlural="unidades de medida"
      initialData={initialData}
      fields={[
        {
          name: 'nombre',
          label: 'Nombre',
          placeholder: 'Ej: Kilogramo',
          required: true,
        },
        {
          name: 'abreviatura',
          label: 'Abreviatura',
          placeholder: 'Ej: kg',
          required: true,
        },
      ]}
      searchFields={['nombre', 'abreviatura']}
      nextIdStart={5}
    />
  );
}
