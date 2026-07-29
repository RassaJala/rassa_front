import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppColors, type AppColors } from '../hooks/useAppColors';
import {
  useClosePublicacion,
  useDeletePublicacion,
  usePublicaciones,
  usePublishPublicacion,
} from '../hooks/usePublications';
import type { Publicacion, PublicacionEstado } from '../services/publications';
import { extractApiError } from '../utils/apiErrors';
import { formatDate } from '../utils/publicationWizard';
import { mediaUrl } from '../utils/mediaUrl';
import { hideBrokenImage } from '../utils/imageHelpers';
import {
  PublicationActions,
  getStatusBadge,
  productCountLabel,
} from '../components/PublicationActions';
import { PageHeader } from '../components/layout/PageHeader';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Toast, type ToastState } from '../components/ui/Toast';

const PAGE_SIZE = 10;

const TABS: Array<{ key: PublicacionEstado | 'all'; label: string }> = [
  { key: 'all', label: 'Todas' },
  { key: 'borrador', label: 'Borradores' },
  { key: 'publicado', label: 'Publicadas' },
  { key: 'cerrado', label: 'Cerradas' },
];

const MONTHS = [
  { value: 0, label: 'Todos los meses' },
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
];

// ── DetailModal ───────────────────────────────────────────

function DetailModal({
  pub,
  onClose,
  colors,
}: {
  pub: Publicacion;
  onClose: () => void;
  colors: AppColors;
}) {
  const productos = pub.productos ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full max-w-xl overflow-y-auto rounded-2xl p-6"
        style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold" style={{ color: colors.fg }}>
              Semana {pub.semana}
            </h2>
            <p className="text-[13px]" style={{ color: colors.muted }}>
              {formatDate(new Date(pub.fecha_publicacion), { short: true })}
            </p>
          </div>
          <Badge variant={getStatusBadge(pub.estado).variant}>
            {getStatusBadge(pub.estado).label}
          </Badge>
        </div>

        <p
          className="mb-4 text-[14px] font-semibold"
          style={{ color: colors.fg }}
        >
          {productCountLabel(productos.length)}
        </p>

        {productos.length === 0 ? (
          <p className="text-[13px]" style={{ color: colors.muted }}>
            Esta publicación no tiene productos.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {productos.map((p) => {
              const img = mediaUrl(p.foto);
              return (
                <div
                  key={p.id_producto_semanal}
                  className="flex items-center gap-4 rounded-xl p-3"
                  style={{
                    background: colors.bg,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  {img ? (
                    <img
                      src={img}
                      alt=""
                      className="h-14 w-14 rounded-lg object-cover"
                      onError={hideBrokenImage}
                    />
                  ) : (
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-lg text-[22px]"
                      style={{ background: colors.border }}
                    >
                      📦
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-[14px] font-semibold"
                      style={{ color: colors.fg }}
                    >
                      Producto #{p.fk_producto}
                    </p>
                    <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
                      <span style={{ color: colors.muted }}>
                        Stock: {p.stock}
                      </span>
                      <span style={{ color: colors.brand }}>${p.precio}</span>
                      <Badge
                        variant={p.estado === 'activo' ? 'success' : 'default'}
                      >
                        {p.estado}
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────

function Pagination({
  page,
  totalPages,
  onChange,
  colors,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
  colors: AppColors;
}) {
  if (totalPages <= 1) return null;

  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div
      className="flex items-center justify-center gap-1.5 px-[18px] py-4"
      style={{
        borderTop: `1px solid ${colors.border}`,
      }}
    >
      <button
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="cursor-pointer rounded-lg px-3 py-1.5 text-[13px] font-medium disabled:cursor-not-allowed disabled:opacity-40"
        style={{
          background: colors.bg,
          color: colors.muted,
          border: `1px solid ${colors.border}`,
        }}
      >
        Anterior
      </button>

      {start > 1 && (
        <>
          <button
            onClick={() => onChange(1)}
            className="cursor-pointer rounded-lg px-3 py-1.5 text-[13px] font-medium"
            style={{
              background: colors.bg,
              color: colors.muted,
              border: `1px solid ${colors.border}`,
            }}
          >
            1
          </button>
          {start > 2 && (
            <span className="px-1 text-[13px]" style={{ color: colors.muted }}>
              ...
            </span>
          )}
        </>
      )}

      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className="cursor-pointer rounded-lg px-3 py-1.5 text-[13px] font-medium"
          style={{
            background: p === page ? colors.brand : colors.bg,
            color: p === page ? '#fff' : colors.muted,
            border: `1px solid ${p === page ? colors.brand : colors.border}`,
          }}
        >
          {p}
        </button>
      ))}

      {end < totalPages && (
        <>
          {end < totalPages - 1 && (
            <span className="px-1 text-[13px]" style={{ color: colors.muted }}>
              ...
            </span>
          )}
          <button
            onClick={() => onChange(totalPages)}
            className="cursor-pointer rounded-lg px-3 py-1.5 text-[13px] font-medium"
            style={{
              background: colors.bg,
              color: colors.muted,
              border: `1px solid ${colors.border}`,
            }}
          >
            {totalPages}
          </button>
        </>
      )}

      <button
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className="cursor-pointer rounded-lg px-3 py-1.5 text-[13px] font-medium disabled:cursor-not-allowed disabled:opacity-40"
        style={{
          background: colors.bg,
          color: colors.muted,
          border: `1px solid ${colors.border}`,
        }}
      >
        Siguiente
      </button>
    </div>
  );
}

// ── FarmerPublications ─────────────────────────────────────

export function FarmerPublications() {
  const colors = useAppColors();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<PublicacionEstado | 'all'>('all');
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [detailPub, setDetailPub] = useState<Publicacion | null>(null);

  const [filterMonth, setFilterMonth] = useState(0);
  const [filterYear, setFilterYear] = useState(0);
  const [filterMinProducts, setFilterMinProducts] = useState(0);

  const { data, isLoading, isError, refetch } = usePublicaciones(
    activeTab === 'all' ? undefined : activeTab,
    page,
  );
  const deleteMutation = useDeletePublicacion();
  const publishMutation = usePublishPublicacion();
  const closeMutation = useClosePublicacion();

  const showToast = useCallback((msg: string, asError = false) => {
    setToast({ message: msg, type: asError ? 'error' : 'success' });
  }, []);

  const publications = data?.data?.results ?? [];
  const totalCount = data?.data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(() => {
    const years = [0];
    for (const p of publications) {
      const y = new Date(p.fecha_publicacion).getFullYear();
      if (!years.includes(y)) years.push(y);
    }
    return years.sort((a, b) => b - a);
  }, [publications]);

  const filtered = useMemo(() => {
    return publications.filter((pub) => {
      if (filterMonth) {
        const d = new Date(pub.fecha_publicacion);
        if (d.getMonth() + 1 !== filterMonth) return false;
      }
      if (filterYear) {
        const d = new Date(pub.fecha_publicacion);
        if (d.getFullYear() !== filterYear) return false;
      }
      if (
        filterMinProducts > 0 &&
        (pub.productos ?? []).length < filterMinProducts
      )
        return false;
      return true;
    });
  }, [publications, filterMonth, filterYear, filterMinProducts]);

  function handleTabChange(tab: PublicacionEstado | 'all') {
    setActiveTab(tab);
    setPage(1);
  }

  function clearFilters() {
    setFilterMonth(0);
    setFilterYear(0);
    setFilterMinProducts(0);
  }

  const listToRender = filtered;
  const filtersActive =
    filterMonth > 0 || filterYear > 0 || filterMinProducts > 0;

  const isMutating =
    deleteMutation.isPending ||
    publishMutation.isPending ||
    closeMutation.isPending;

  function handleEdit(id: number) {
    void navigate(`/agricultor/publicaciones/${String(id)}/editar`);
  }

  async function handleDelete(id: number) {
    if (!window.confirm('¿Eliminar esta publicación?')) return;
    try {
      await deleteMutation.mutateAsync(id);
      showToast('Publicación eliminada.');
    } catch (err) {
      showToast(extractApiError(err, ['detail', 'message']), true);
    }
  }

  async function handlePublish(id: number) {
    try {
      await publishMutation.mutateAsync(id);
      showToast('Publicación publicada.');
    } catch (err) {
      showToast(extractApiError(err, ['detail', 'message']), true);
    }
  }

  async function handleClose(id: number) {
    if (!window.confirm('¿Cerrar esta publicación?')) return;
    try {
      await closeMutation.mutateAsync(id);
      showToast('Publicación cerrada.');
    } catch (err) {
      showToast(extractApiError(err, ['detail', 'message']), true);
    }
  }

  return (
    <div className="relative">
      <Toast toast={toast} onDone={() => setToast(null)} />

      {detailPub && (
        <DetailModal
          pub={detailPub}
          onClose={() => setDetailPub(null)}
          colors={colors}
        />
      )}

      <PageHeader
        title="Publicaciones Semanales"
        action={
          <Button
            variant="primary"
            onClick={() => void navigate('/agricultor/publicaciones/nueva')}
          >
            + Nueva publicación
          </Button>
        }
      />

      {/* Tabs */}
      <div
        className="mb-5 flex gap-1 p-1"
        style={{
          background: colors.bg,
          borderRadius: 12,
          border: `1px solid ${colors.border}`,
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className="cursor-pointer px-4 py-2 font-[inherit] text-[13px] font-semibold"
              style={{
                borderRadius: 10,
                border: 'none',
                background: isActive ? colors.surface : 'transparent',
                color: isActive ? colors.fg : colors.muted,
                boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      {!isLoading && !isError && publications.length > 0 && (
        <div
          className="mb-5 flex flex-wrap items-end gap-3"
          style={{
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: 12,
            padding: '12px 16px',
          }}
        >
          <div className="flex flex-col gap-1">
            <label
              className="text-[12px] font-semibold uppercase tracking-[0.05em]"
              style={{ color: colors.muted }}
            >
              Mes
            </label>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(Number(e.target.value))}
              className="h-9 cursor-pointer rounded-lg px-3 text-[13px]"
              style={{
                border: `1px solid ${colors.border}`,
                background: colors.bg,
                color: colors.fg,
                fontFamily: 'inherit',
              }}
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label
              className="text-[12px] font-semibold uppercase tracking-[0.05em]"
              style={{ color: colors.muted }}
            >
              Año
            </label>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(Number(e.target.value))}
              className="h-9 cursor-pointer rounded-lg px-3 text-[13px]"
              style={{
                border: `1px solid ${colors.border}`,
                background: colors.bg,
                color: colors.fg,
                fontFamily: 'inherit',
              }}
            >
              <option value={0}>Todos los años</option>
              {yearOptions
                .filter((y) => y > 0)
                .map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label
              className="text-[12px] font-semibold uppercase tracking-[0.05em]"
              style={{ color: colors.muted }}
            >
              Min. productos
            </label>
            <input
              type="number"
              min={0}
              value={filterMinProducts}
              onChange={(e) =>
                setFilterMinProducts(Math.max(0, Number(e.target.value)))
              }
              className="h-9 w-20 rounded-lg px-3 text-[13px]"
              style={{
                border: `1px solid ${colors.border}`,
                background: colors.bg,
                color: colors.fg,
                fontFamily: 'inherit',
              }}
            />
          </div>

          {filtersActive && (
            <button
              onClick={clearFilters}
              className="h-9 cursor-pointer rounded-lg px-3 text-[13px] font-semibold"
              style={{
                border: `1px solid ${colors.border}`,
                background: colors.bg,
                color: colors.coral,
                fontFamily: 'inherit',
              }}
            >
              Limpiar
            </button>
          )}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <LoadingSpinner className="py-12" />
      ) : isError ? (
        <div className="py-12 text-center">
          <p className="mb-3" style={{ color: colors.coral }}>
            Error al cargar publicaciones
          </p>
          <Button variant="secondary" onClick={() => void refetch()}>
            Reintentar
          </Button>
        </div>
      ) : publications.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No hay publicaciones"
          message="Creá una publicación semanal para vender tus productos."
          action={
            <Button
              variant="primary"
              onClick={() => void navigate('/agricultor/publicaciones/nueva')}
            >
              + Nueva publicación
            </Button>
          }
        />
      ) : listToRender.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="Sin resultados"
          message="No hay publicaciones que coincidan con los filtros."
          action={
            <Button variant="secondary" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <div
            className="hidden overflow-hidden rounded-2xl md:block"
            style={{
              background: colors.surface,
              border: `1px solid ${colors.border}`,
            }}
          >
            <table className="w-full border-collapse">
              <thead>
                <tr
                  style={{
                    borderBottom: `1px solid ${colors.border}`,
                    background: colors.bg,
                  }}
                >
                  {['Semana', 'Fecha', 'Productos', 'Estado', ''].map((h) => (
                    <th
                      key={h}
                      className="px-[18px] py-3.5 text-left text-[13px] font-semibold uppercase tracking-[0.05em]"
                      style={{ color: colors.muted }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {listToRender.map((pub) => {
                  const badge = getStatusBadge(pub.estado);
                  const productos = pub.productos ?? [];
                  return (
                    <tr
                      key={pub.id_publicacion}
                      className="cursor-pointer"
                      style={{
                        borderBottom: `1px solid ${colors.border}`,
                      }}
                      onClick={() => setDetailPub(pub)}
                    >
                      <td
                        className="px-[18px] py-4 text-[15px] font-semibold"
                        style={{ color: colors.fg }}
                      >
                        Semana {pub.semana}
                      </td>
                      <td
                        className="px-[18px] py-4 text-[14px]"
                        style={{ color: colors.muted }}
                      >
                        {formatDate(new Date(pub.fecha_publicacion), {
                          short: true,
                        })}
                      </td>
                      <td
                        className="px-[18px] py-4 text-[14px]"
                        style={{ color: colors.fg }}
                      >
                        {productCountLabel(productos.length)}
                        {productos.length > 0 && (
                          <span
                            className="ml-2 flex gap-1"
                            style={{ display: 'inline-flex' }}
                          >
                            {productos.slice(0, 3).map((p) => {
                              const img = mediaUrl(p.foto);
                              return img ? (
                                <img
                                  key={p.id_producto_semanal}
                                  src={img}
                                  alt=""
                                  className="h-6 w-6 rounded-full object-cover"
                                  onError={hideBrokenImage}
                                />
                              ) : null;
                            })}
                          </span>
                        )}
                      </td>
                      <td className="px-[18px] py-4">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </td>
                      <td className="px-[18px] py-4">
                        <PublicationActions
                          pub={pub}
                          isMutating={isMutating}
                          onEdit={handleEdit}
                          onPublish={handlePublish}
                          onDelete={handleDelete}
                          onClose={handleClose}
                          colors={colors}
                          variant="button"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Pagination
              page={page}
              totalPages={totalPages}
              onChange={setPage}
              colors={colors}
            />
          </div>

          {/* Mobile cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {listToRender.map((pub) => {
              const badge = getStatusBadge(pub.estado);
              return (
                <div
                  key={pub.id_publicacion}
                  className="rounded-[14px] p-4"
                  style={{
                    background: colors.surface,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p
                        className="text-base font-semibold"
                        style={{ color: colors.fg }}
                      >
                        Semana {pub.semana}
                      </p>
                      <p
                        className="text-[13px]"
                        style={{ color: colors.muted }}
                      >
                        {formatDate(new Date(pub.fecha_publicacion), {
                          short: true,
                        })}
                      </p>
                    </div>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </div>

                  <p
                    className="mb-3 text-[13px]"
                    style={{ color: colors.muted }}
                  >
                    {productCountLabel((pub.productos ?? []).length)}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="ghost"
                      className="!px-3 !py-1.5 !text-[13px]"
                      onClick={() => setDetailPub(pub)}
                    >
                      Ver detalle
                    </Button>
                    <PublicationActions
                      pub={pub}
                      isMutating={isMutating}
                      onEdit={handleEdit}
                      onPublish={handlePublish}
                      onDelete={handleDelete}
                      onClose={handleClose}
                      colors={colors}
                      variant="button"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobile pagination */}
          <div className="mt-4 md:hidden">
            <Pagination
              page={page}
              totalPages={totalPages}
              onChange={setPage}
              colors={colors}
            />
          </div>
        </>
      )}
    </div>
  );
}
