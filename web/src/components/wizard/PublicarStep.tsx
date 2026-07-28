import type { AppColors } from '../../hooks/useAppColors';
import type { WizardItemDraft } from '../../utils/publicationWizard';
import { productCountLabel } from '../PublicationActions';

interface PublicarStepProps {
  weekNumber: number;
  items: WizardItemDraft[];
  colors: AppColors;
}

export function PublicarStep({ weekNumber, items, colors }: PublicarStepProps) {
  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold" style={{ color: colors.fg }}>
        Publicar
      </h2>
      <div
        className="rounded-xl p-5 text-center"
        style={{
          background: colors.bg,
          border: `1px solid ${colors.border}`,
        }}
      >
        <p className="mb-2 text-[40px]">🚀</p>
        <p className="text-[15px] font-semibold" style={{ color: colors.fg }}>
          ¿Publicar la semana {weekNumber}?
        </p>
        <p className="mt-1 text-[14px]" style={{ color: colors.muted }}>
          {productCountLabel(items.length)} serán publicados y visibles
          para los compradores.
        </p>
      </div>
    </div>
  );
}
