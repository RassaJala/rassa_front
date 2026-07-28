import type { AppColors } from '../../hooks/useAppColors';
import { formatDate } from '../../utils/publicationWizard';

interface FechaStepProps {
  weekNumber: number;
  nextMonday: Date;
  colors: AppColors;
}

export function FechaStep({ weekNumber, nextMonday, colors }: FechaStepProps) {
  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold" style={{ color: colors.fg }}>
        Fecha de publicación
      </h2>
      <div
        className="rounded-xl p-5"
        style={{
          background: colors.bg,
          border: `1px solid ${colors.border}`,
        }}
      >
        <p className="text-[15px] font-semibold" style={{ color: colors.fg }}>
          Semana {weekNumber}
        </p>
        <p
          className="mt-1 text-[14px] capitalize"
          style={{ color: colors.muted }}
        >
          {formatDate(nextMonday)}
        </p>
        <p className="mt-3 text-[13px]" style={{ color: colors.muted }}>
          La publicación corresponderá a esta semana. Los productos que agregues
          en el siguiente paso estarán disponibles para los compradores.
        </p>
      </div>
    </div>
  );
}
