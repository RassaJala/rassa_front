import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarPlus } from 'lucide-react';

import { PageHeader } from '../components/layout/PageHeader';
import { FilterChips } from '../components/recolecciones/FilterChips';
import { RecoleccionCard } from '../components/recolecciones/RecoleccionCard';
import { ScheduleRecoleccionModal } from '../components/recolecciones/ScheduleRecoleccionModal';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Toast, type ToastState } from '../components/ui/Toast';
import { useCreatePrivateConversation } from '../hooks/chat/useCreatePrivateConversation';
import { useAppColors } from '../hooks/useAppColors';
import { useAuth } from '../hooks/useAuth';
import {
  cambiarEstadoRecoleccion,
  cancelarRecoleccion,
  getRecolecciones,
  getTodasLasRecolecciones,
} from '../services/recolecciones';
import type { Recoleccion, RecoleccionEstado } from '../types/recolecciones';
import { extractApiError } from '../utils/apiErrors';
import { formatFechaHeader, todayString } from '../utils/recolecciones';

export function SellerRecolecciones() {
  const colors = useAppColors();
  const { user } = useAuth();
  const [today, setToday] = useState(() => todayString());

  useEffect(() => {
    // Al cruzar medianoche con la pestaña abierta, la fecha debe actualizarse
    // para que las query keys cambien y las consultas se re-emitan con el día
    // nuevo en lugar de quedar cacheadas con el anterior. Se vuelve a armar el
    // timer en cada disparo para que funcione también en días sucesivos.
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const now = new Date();
      const msUntilMidnight =
        new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + 1,
        ).getTime() - now.getTime();
      timer = setTimeout(() => {
        setToday(todayString());
        schedule();
      }, msUntilMidnight);
    };
    schedule();
    return () => clearTimeout(timer);
  }, []);

  const [filter, setFilter] = useState<RecoleccionEstado | ''>('');
  const [toast, setToast] = useState<ToastState | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
  const [modalVisible, setModalVisible] = useState(false);
  const [cancelId, setCancelId] = useState<number | null>(null);

  const queryClient = useQueryClient();

  const {
    data: result,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['recolecciones', filter, today],
    queryFn: () =>
      getRecolecciones({
        ...(filter ? { estado: filter } : {}),
        fecha_desde: today,
      }),
    retry: false,
  });

  const recolecciones = useMemo(() => result?.data?.results ?? [], [result]);

  const { data: todasLasRecolecciones } = useQuery({
    queryKey: ['recolecciones', 'todas', today],
    queryFn: ({ signal }) =>
      getTodasLasRecolecciones({ fecha_desde: today }, signal),
    // Solo se necesita al abrir el modal de programación: gatear la consulta
    // garantiza un fetch fresco de `todas` en cada apertura, de modo que los
    // marcadores de duplicado se calculan con datos recientes (flush del
    // cache tras guardar) en lugar de con una lista vieja del primer render.
    enabled: modalVisible,
    retry: false,
  });

  const totalErrores = todasLasRecolecciones?.errores ?? 0;
  // Si la consulta paginada falló, caemos a la lista filtrada por estado (la
  // que sí se muestra en pantalla) para no perder del todo la validación.
  const duplicateSource =
    totalErrores > 0
      ? recolecciones
      : (todasLasRecolecciones?.data ?? recolecciones);
  // El banner solo informa de una falla real (errores o recorrido truncado),
  // no de la carga en curso: `todas` se re-fetcha en cada apertura del modal,
  // así que gatear por `isLoadingTodas` mostraría el aviso en cada apertura
  // incluso en el camino feliz.
  const duplicateCheckFailed =
    totalErrores > 0 || (todasLasRecolecciones?.truncated ?? false);

  const sections = useMemo(() => {
    const map = new Map<string, Recoleccion[]>();
    for (const recoleccion of recolecciones) {
      const list = map.get(recoleccion.fecha_recoleccion) ?? [];
      list.push(recoleccion);
      map.set(recoleccion.fecha_recoleccion, list);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([title, data]) => ({ title, data }));
  }, [recolecciones]);

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['recolecciones', filter] });
    void queryClient.invalidateQueries({
      queryKey: ['recolecciones', 'todas'],
    });
  }, [queryClient, filter]);

  const markPending = (id: number) =>
    setPendingIds((prev) => new Set(prev).add(id));
  const clearPending = (id: number) =>
    setPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  const notifySuccess = (message: string) => {
    invalidate();
    setToast({ message, type: 'success' });
    // El refetch corre en segundo plano y no retrasa el toast de éxito: el
    // guardado no implica que la pantalla quedó al día, pero en red degradada
    // esperar el refetch podía retrasar el aviso ~15s o incluso reemplazar el
    // éxito por un error. Si la actualización falla, se degrada a un aviso
    // secundario.
    void refetch().then((refreshed) => {
      if (!refreshed.isError) return;
      // La degradación solo reemplaza el toast de éxito de esta operación: si
      // mientras tanto se mostró un aviso más reciente (otra acción) o el
      // `onDone` ya cerró el actual, un error tardío del refetch en segundo
      // plano no debe pisarlo.
      setToast((current) =>
        current?.type === 'success' && current.message === message
          ? {
              message:
                'El cambio se guardó, pero no se pudo actualizar la lista.',
              type: 'error',
            }
          : current,
      );
    });
  };
  const notifyError = (error: unknown) => {
    setToast({ message: extractApiError(error, ['estado']), type: 'error' });
  };

  const transicionMutation = useMutation({
    mutationFn: (payload: {
      readonly id: number;
      readonly estado: RecoleccionEstado;
    }) => cambiarEstadoRecoleccion(payload.id, payload.estado),
    onMutate: ({ id }) => markPending(id),
    onSettled: (_data, _error, { id }) => clearPending(id),
    onSuccess: () => notifySuccess('Estado actualizado correctamente.'),
    onError: notifyError,
  });

  const cancelarMutation = useMutation({
    mutationFn: (id: number) => cancelarRecoleccion(id),
    onMutate: (id) => markPending(id),
    onSettled: (_data, _error, id) => clearPending(id),
    onSuccess: () => notifySuccess('Recolección cancelada.'),
    onError: notifyError,
  });

  const createChat = useCreatePrivateConversation();

  const chatPendingId = createChat.isPending
    ? (createChat.variables?.fk_usuario ?? null)
    : null;

  useEffect(() => {
    if (createChat.isError) {
      setToast({
        message: 'No se pudo abrir el chat con el agricultor.',
        type: 'error',
      });
      // react-query conserva `variables` tras fallar; resetear evita que un
      // estado pendiente obsoleto mantenga deshabilitado el botón de contacto.
      createChat.reset();
    }
  }, [createChat, createChat.isError]);

  const handleContact = useCallback(
    (fkAgricultor: number) => {
      if (chatPendingId === fkAgricultor) return;
      createChat.mutate({ fk_usuario: fkAgricultor });
    },
    [chatPendingId, createChat],
  );

  return (
    <div>
      <Toast toast={toast} onDone={() => setToast(null)} />

      <ConfirmDialog
        open={cancelId != null}
        title="Cancelar recolección"
        message="¿Estás seguro de que querés cancelar esta recolección?"
        confirmLabel="Sí, cancelar"
        cancelLabel="No"
        onConfirm={() => {
          if (cancelId != null && !cancelarMutation.isPending) {
            cancelarMutation.mutate(cancelId);
          }
          setCancelId(null);
        }}
        onCancel={() => setCancelId(null)}
      />

      <PageHeader
        title="Recolecciones"
        action={
          <Button variant="primary" onClick={() => setModalVisible(true)}>
            <CalendarPlus size={16} />
            Nueva
          </Button>
        }
      />

      <div
        style={{
          backgroundColor: colors.surface,
          borderRadius: 14,
          border: `1px solid ${colors.border}`,
          padding: 12,
          marginBottom: 16,
        }}
      >
        <FilterChips filter={filter} onSelect={setFilter} />
      </div>

      {isLoading ? (
        <LoadingSpinner className="py-12" />
      ) : isError ? (
        <div className="py-12 text-center">
          <p className="mb-3" style={{ color: colors.coral }}>
            Error al cargar recolecciones
          </p>
          <Button variant="secondary" onClick={() => void refetch()}>
            Reintentar
          </Button>
        </div>
      ) : recolecciones.length === 0 ? (
        <EmptyState
          icon="🗓️"
          title={
            filter
              ? 'No hay recolecciones en este estado'
              : 'No hay recolecciones programadas'
          }
          message="Programá una recolección para los agricultores desde el botón Nueva."
        />
      ) : (
        sections.map((section) => (
          <div key={section.title} style={{ marginBottom: 4 }}>
            <div
              style={{
                paddingTop: 18,
                paddingBottom: 8,
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 700, color: colors.fg }}>
                {formatFechaHeader(section.title, today)}
              </div>
              <div style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
                {section.title} · {section.data.length}{' '}
                {section.data.length === 1 ? 'recolección' : 'recolecciones'}
              </div>
            </div>
            {section.data.map((item) => (
              <RecoleccionCard
                key={item.id_recoleccion}
                item={item}
                busy={
                  pendingIds.has(item.id_recoleccion) ||
                  chatPendingId === item.fk_agricultor
                }
                canContact={
                  item.fk_agricultor != null && item.fk_agricultor !== user?.id
                }
                onTransition={(estado) =>
                  transicionMutation.mutate({
                    id: item.id_recoleccion,
                    estado,
                  })
                }
                onCancel={() => setCancelId(item.id_recoleccion)}
                onContact={() => {
                  if (item.fk_agricultor != null)
                    handleContact(item.fk_agricultor);
                }}
              />
            ))}
          </div>
        ))
      )}

      <ScheduleRecoleccionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSaved={notifySuccess}
        existing={duplicateSource}
        duplicateCheckFailed={duplicateCheckFailed}
      />
    </div>
  );
}
