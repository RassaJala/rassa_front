import type { AppColors } from '../../hooks/useAppColors';
import type {
  ItemValidation,
  WizardItemDraft,
} from '../../utils/publicationWizard';
import { mediaUrl } from '../../utils/mediaUrl';
import { hideBrokenImage } from '../../utils/imageHelpers';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { FormField } from '../ui/FormField';
import { FormSelect } from '../ui/FormSelect';
import { Input } from '../ui/Input';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface ProductosStepProps {
  items: WizardItemDraft[];
  validations: Map<string, ItemValidation>;
  saving: boolean;
  colors: AppColors;
  unidades: Array<{ id_unidad: number; tipo: string }>;
  loadingCatalog: boolean;
  onAddItem: () => void;
  onRemoveItem: (tempId: string) => void;
  onUpdateItem: (
    tempId: string,
    field: keyof WizardItemDraft,
    value: string | number | null,
  ) => void;
  onImageSelect: (tempId: string, file: File) => void;
  onImageRemove: (tempId: string) => void;
}

export function ProductosStep({
  items,
  validations,
  saving,
  colors,
  unidades,
  loadingCatalog,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
  onImageSelect,
  onImageRemove,
}: ProductosStepProps) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold" style={{ color: colors.fg }}>
          Productos ({items.length})
        </h2>
        <Button variant="secondary" onClick={onAddItem}>
          + Agregar producto
        </Button>
      </div>

      {loadingCatalog ? (
        <LoadingSpinner className="py-8" />
      ) : items.length === 0 ? (
        <EmptyState
          icon="📦"
          title="No hay productos"
          message="Agregá productos para tu publicación semanal."
          action={
            <Button variant="primary" onClick={onAddItem}>
              + Agregar producto
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => {
            const errs = validations.get(item.tempId) ?? {};
            const displayImage = item.imagePreview ?? mediaUrl(item.foto);
            return (
              <div
                key={item.tempId}
                className="rounded-xl p-4"
                style={{
                  border: `1px solid ${colors.border}`,
                  background: colors.surface,
                }}
              >
                <div className="mb-3 flex items-center justify-between">
                  <p
                    className="text-[15px] font-semibold"
                    style={{ color: colors.fg }}
                  >
                    {item.nombre_producto ||
                      'Producto no disponible (eliminado del catálogo)'}
                  </p>
                  <button
                    onClick={() => onRemoveItem(item.tempId)}
                    disabled={saving}
                    className="cursor-pointer border-none bg-transparent text-[16px]"
                    style={{ color: colors.coral }}
                  >
                    ✕
                  </button>
                </div>

                {!item.nombre_producto && (
                  <div
                    className="mb-3 rounded-lg px-3 py-2 text-[13px]"
                    style={{
                      border: `1px solid ${colors.coral}`,
                      background: colors.accentBg,
                      color: colors.coral,
                    }}
                  >
                    Este producto fue eliminado del catálogo y ya no se puede
                    publicar. Quitalo de la publicación para continuar.
                  </div>
                )}

                <div className="flex gap-3">
                  <div className="shrink-0">
                    <div
                      className="relative grid h-20 w-20 cursor-pointer place-items-center overflow-hidden rounded-xl"
                      style={{
                        border: displayImage
                          ? 'none'
                          : `2px dashed ${colors.inputBorder}`,
                        background: displayImage
                          ? 'transparent'
                          : colors.accentBg,
                      }}
                      onClick={() => {
                        if (saving) return;
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement)
                            .files?.[0];
                          if (file) onImageSelect(item.tempId, file);
                        };
                        input.click();
                      }}
                    >
                      {displayImage ? (
                        <img
                          src={displayImage}
                          alt=""
                          className="h-full w-full object-cover"
                          onError={hideBrokenImage}
                        />
                      ) : (
                        <span className="text-2xl">📷</span>
                      )}
                    </div>
                    {displayImage && (
                      <button
                        onClick={() => {
                          if (saving) return;
                          onImageRemove(item.tempId);
                        }}
                        disabled={saving}
                        className="relative -mt-2 ml-16 grid h-5 w-5 cursor-pointer place-items-center rounded-full border-none text-[11px]"
                        style={{
                          background: colors.coral,
                          color: '#fff',
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <FormField
                          label="Stock *"
                          error={errs.stock}
                          colors={colors}
                        >
                          <Input
                            colors={colors}
                            type="number"
                            min="0"
                            value={item.stock}
                            disabled={saving}
                            onChange={(e) =>
                              onUpdateItem(item.tempId, 'stock', e.target.value)
                            }
                            placeholder="0"
                          />
                        </FormField>
                      </div>
                      <div className="flex-1">
                        <FormField
                          label="Precio *"
                          error={errs.precio}
                          colors={colors}
                        >
                          <Input
                            colors={colors}
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.precio}
                            disabled={saving}
                            onChange={(e) =>
                              onUpdateItem(
                                item.tempId,
                                'precio',
                                e.target.value,
                              )
                            }
                            placeholder="0.00"
                          />
                        </FormField>
                      </div>
                    </div>
                    <FormField
                      label="Unidad *"
                      error={errs.fk_unidad}
                      colors={colors}
                    >
                      <FormSelect
                        colors={colors}
                        hasError={!!errs.fk_unidad}
                        value={item.fk_unidad || ''}
                        disabled={saving}
                        onChange={(e) =>
                          onUpdateItem(
                            item.tempId,
                            'fk_unidad',
                            Number(e.target.value),
                          )
                        }
                      >
                        <option value="">Seleccionar unidad</option>
                        {unidades.map((u) => (
                          <option key={u.id_unidad} value={u.id_unidad}>
                            {u.tipo}
                          </option>
                        ))}
                      </FormSelect>
                    </FormField>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
