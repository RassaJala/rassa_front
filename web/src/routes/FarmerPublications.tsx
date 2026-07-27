import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppColors } from "../hooks/useAppColors";
import {
  useClosePublicacion,
  useDeletePublicacion,
  usePublicaciones,
  usePublishPublicacion,
} from "../hooks/usePublications";
import type { PublicacionEstado } from "../services/publications";
import { extractApiError } from "../utils/apiError";
import { formatDate } from "../utils/publicationWizard";
import { mediaUrl } from "../utils/mediaUrl";
import { hideBrokenImage } from "../utils/imageHelpers";
import {
  PublicationActions,
  getStatusBadge,
  productCountLabel,
} from "../components/PublicationActions";
import { PageHeader } from "../components/layout/PageHeader";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { Toast, type ToastState } from "../components/ui/Toast";

// ── Helpers ────────────────────────────────────────────────

const TABS: Array<{ key: PublicacionEstado | "all"; label: string }> = [
  { key: "all", label: "Todas" },
  { key: "borrador", label: "Borradores" },
  { key: "publicado", label: "Publicadas" },
  { key: "cerrado", label: "Cerradas" },
];

// ── FarmerPublications ─────────────────────────────────────

export function FarmerPublications() {
  const colors = useAppColors();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<PublicacionEstado | "all">("all");
  const [toast, setToast] = useState<ToastState | null>(null);

  const { data, isLoading, isError, refetch } = usePublicaciones(
    activeTab === "all" ? undefined : activeTab,
  );
  const deleteMutation = useDeletePublicacion();
  const publishMutation = usePublishPublicacion();
  const closeMutation = useClosePublicacion();

  const showToast = useCallback((msg: string, asError = false) => {
    setToast({ message: msg, type: asError ? "error" : "success" });
  }, []);

  const publications = data?.data?.results ?? [];

  const isMutating =
    deleteMutation.isPending ||
    publishMutation.isPending ||
    closeMutation.isPending;

  function handleEdit(id: number) {
    void navigate(`/agricultor/publicaciones/${String(id)}/editar`);
  }

  async function handleDelete(id: number) {
    if (!window.confirm("¿Eliminar esta publicación?")) return;
    try {
      await deleteMutation.mutateAsync(id);
      showToast("Publicación eliminada.");
    } catch (err) {
      showToast(extractApiError(err, ["detail", "message"]), true);
    }
  }

  async function handlePublish(id: number) {
    try {
      await publishMutation.mutateAsync(id);
      showToast("Publicación publicada.");
    } catch (err) {
      showToast(extractApiError(err, ["detail", "message"]), true);
    }
  }

  async function handleClose(id: number) {
    if (!window.confirm("¿Cerrar esta publicación?")) return;
    try {
      await closeMutation.mutateAsync(id);
      showToast("Publicación cerrada.");
    } catch (err) {
      showToast(extractApiError(err, ["detail", "message"]), true);
    }
  }

  return (
    <div className="relative">
      {/* Toast */}
      <Toast toast={toast} onDone={() => setToast(null)} />

      <PageHeader
        title="Publicaciones Semanales"
        action={
          <Button
            variant="primary"
            onClick={() => void navigate("/agricultor/publicaciones/nueva")}
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
              onClick={() => setActiveTab(tab.key)}
              className="cursor-pointer px-4 py-2 font-[inherit] text-[13px] font-semibold"
              style={{
                borderRadius: 10,
                border: "none",
                background: isActive ? colors.surface : "transparent",
                color: isActive ? colors.fg : colors.muted,
                boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                transition: "background 0.15s, color 0.15s",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

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
              onClick={() => void navigate("/agricultor/publicaciones/nueva")}
            >
              + Nueva publicación
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
                  {["Semana", "Fecha", "Productos", "Estado", ""].map((h) => (
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
                {publications.map((pub) => {
                  const badge = getStatusBadge(pub.estado);
                  const productos = pub.productos ?? [];
                  return (
                    <tr
                      key={pub.id_publicacion}
                      style={{ borderBottom: `1px solid ${colors.border}` }}
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
                            style={{ display: "inline-flex" }}
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
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {publications.map((pub) => {
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
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
