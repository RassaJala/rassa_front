import type { ProfileForm } from '~/components/admin/types';
import { getGeneroLabel } from '~/components/admin/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const labelClass =
  'text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider';
const valueClass = 'text-sm font-medium text-brand-ink dark:text-gray-100';

function formatDate(iso: string | undefined): string {
  if (!iso) return 'No especificado';
  try {
    const [y, m, d] = iso.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
  } catch {
    return iso;
  }
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className={labelClass}>{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface AdminProfileViewProps {
  profile: ProfileForm | null;
}

export function AdminProfileView({ profile }: AdminProfileViewProps) {
  const fullName = profile
    ? [profile.nombre, profile.apellido_paterno, profile.apellido_materno]
        .filter(Boolean)
        .join(' ')
    : '';

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <FieldRow label="Nombre Completo" value={fullName} />
      <FieldRow
        label="Teléfono"
        value={profile?.telefono || 'No especificado'}
      />
      <FieldRow
        label="Correo Electrónico"
        value={profile?.email || 'No especificado'}
      />
      <FieldRow
        label="Fecha de Nacimiento"
        value={formatDate(profile?.fecha_nacimiento)}
      />
      <FieldRow label="Género" value={getGeneroLabel(profile?.genero)} />
      <FieldRow
        label="Dirección"
        value={profile?.direccion || 'No especificado'}
      />
      <FieldRow
        label="Localidad"
        value={profile?.localidad_nombre || 'No especificado'}
      />
      <FieldRow
        label="Municipio"
        value={profile?.municipio_nombre || 'No especificado'}
      />
    </div>
  );
}
