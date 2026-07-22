import { useTheme } from '~/providers/ThemeProvider';
import { getColors } from '~/constants/colors';
import type { ProfileFormData } from '~/components/profile/types';
import { getGeneroLabel } from '~/components/profile/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
  const { resolved } = useTheme();
  const isDark = resolved === 'dark';
  const colors = getColors(isDark);
  const { fg, muted } = colors;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: muted,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: fg,
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ProfileViewProps {
  profile: ProfileFormData | null;
}

export function ProfileView({ profile }: ProfileViewProps) {
  const fullName = profile
    ? [profile.nombre, profile.apellido_paterno, profile.apellido_materno]
        .filter(Boolean)
        .join(' ')
    : '';

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 20,
      }}
    >
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
