import { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { CalendarCheck, X } from 'lucide-react';

import {
  type AgricultorListItem,
  useAgricultoresUbicacion,
} from '../../hooks/useAgricultoresUbicacion';
import { useAppColors } from '../../hooks/useAppColors';
import { createRecoleccion } from '../../services/recolecciones';
import type {
  Recoleccion,
  RecoleccionPayload,
} from '../../types/recolecciones';
import { extractApiError } from '../../utils/apiErrors';
import {
  buildDuplicateKeys,
  nombreCompletoAgricultor,
  normalizeHora,
  todayString,
  validateProgramarForm,
} from '../../utils/recolecciones';
import { AgricultorSelector } from './AgricultorSelector';

interface ScheduleRecoleccionModalProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly onSaved: (message: string) => void;
  readonly existing: readonly Recoleccion[];
  readonly duplicateCheckFailed?: boolean;
}

export function ScheduleRecoleccionModal({
  visible,
  onClose,
  onSaved,
  existing,
  duplicateCheckFailed = false,
}: ScheduleRecoleccionModalProps) {
  const colors = useAppColors();

  const {
    agricultores,
    isLoading: isLoadingAgricultores,
    isError: isErrorAgricultores,
    truncated: agricultoresTruncados,
    errores: erroresAgricultores,
    refetch: refetchAgricultores,
  } = useAgricultoresUbicacion({ enabled: visible });

  const [agricultor, setAgricultor] = useState<AgricultorListItem | null>(null);
  const [fecha, setFecha] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [comentarios, setComentarios] = useState('');
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setAgricultor(null);
      setFecha(todayString());
      setHoraInicio('');
      setHoraFin('');
      setComentarios('');
      setQuery('');
      setError(null);
    }
  }, [visible]);

  const mutation = useMutation({
    mutationFn: (payload: RecoleccionPayload) => createRecoleccion(payload),
    onSuccess: () => {
      setError(null);
      // Se cierra el modal antes de invalidar: el fetch de `todas` está gateado
      // por `modalVisible`, así que invalidarlo con el modal abierto aborta el
      // refetch al cerrarlo y la lista de duplicados queda con el dato viejo en
      // la próxima apertura.
      onClose();
      onSaved('Recolección programada correctamente.');
    },
    onError: (err: unknown) => {
      const detail = extractApiError(err, [
        'fk_agricultor',
        'fecha_recoleccion',
        'hora_inicio',
        'hora_fin',
        'comentarios',
      ]);
      setError(detail);
    },
  });

  const duplicateKeys = useMemo(() => buildDuplicateKeys(existing), [existing]);

  const gruposFiltrados = useMemo(() => {
    const termino = query.trim().toLowerCase();
    return agricultores
      .map((municipio) => ({
        municipioNombre: municipio.municipioNombre,
        localidades: municipio.localidades
          .map((localidad) => ({
            localidadNombre: localidad.localidadNombre,
            agricultores: localidad.agricultores.filter((a) => {
              if (!termino) return true;
              return nombreCompletoAgricultor(a)
                .toLowerCase()
                .includes(termino);
            }),
          }))
          .filter((localidad) => localidad.agricultores.length > 0),
      }))
      .filter((municipio) => municipio.localidades.length > 0);
  }, [agricultores, query]);

  function handleSubmit() {
    if (mutation.isPending) return;
    const validationError = validateProgramarForm({
      agricultorSeleccionado: agricultor !== null,
      fecha,
      horaInicio,
      horaFin,
    });
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!agricultor) return;
    setError(null);
    mutation.mutate({
      fk_agricultor: agricultor.id_usuario,
      fecha_recoleccion: fecha,
      hora_inicio: horaInicio ? normalizeHora(horaInicio) : null,
      hora_fin: horaFin ? normalizeHora(horaFin) : null,
      comentarios: comentarios.trim() || null,
    });
  }

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        justifyContent: 'center',
        overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: colors.bg,
          width: '100%',
          maxWidth: 640,
          minHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '20px 20px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 700, color: colors.fg }}>
            Programar recolección
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            style={{
              background: 'none',
              border: 'none',
              color: colors.coral,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            <X size={18} />
            Cancelar
          </button>
        </div>

        <div style={{ padding: 20, flex: 1 }}>
          <label
            htmlFor="fecha-recoleccion"
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: colors.fg,
              display: 'block',
            }}
          >
            Fecha
          </label>
          <input
            id="fecha-recoleccion"
            type="date"
            value={fecha}
            min={todayString()}
            onChange={(e) => setFecha(e.target.value)}
            style={inputStyle(colors)}
          />

          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <div style={{ flex: 1 }}>
              <label
                htmlFor="hora-inicio"
                style={{ fontSize: 13, fontWeight: 700, color: colors.fg }}
              >
                Hora inicio
              </label>
              <input
                id="hora-inicio"
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                style={inputStyle(colors)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label
                htmlFor="hora-fin"
                style={{ fontSize: 13, fontWeight: 700, color: colors.fg }}
              >
                Hora fin
              </label>
              <input
                id="hora-fin"
                type="time"
                value={horaFin}
                onChange={(e) => setHoraFin(e.target.value)}
                style={inputStyle(colors)}
              />
            </div>
          </div>

          <label
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: colors.fg,
              marginTop: 14,
              display: 'block',
            }}
          >
            Comentarios
          </label>
          <textarea
            value={comentarios}
            onChange={(e) => setComentarios(e.target.value)}
            placeholder="Notas para la recolección (opcional)"
            rows={3}
            style={{ ...inputStyle(colors), minHeight: 76, resize: 'vertical' }}
          />

          <label
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: colors.fg,
              marginTop: 18,
              display: 'block',
            }}
          >
            Agricultor
          </label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre…"
            style={inputStyle(colors)}
          />

          {agricultor ? (
            <div
              style={{
                marginTop: 10,
                backgroundColor: colors.accentBg,
                borderRadius: 10,
                padding: '10px 12px',
              }}
            >
              <span
                style={{ fontSize: 14, fontWeight: 600, color: colors.brand }}
              >
                Seleccionado: {nombreCompletoAgricultor(agricultor)}
              </span>
            </div>
          ) : null}

          {duplicateCheckFailed ? (
            <div
              style={{
                marginTop: 12,
                fontSize: 13,
                fontWeight: 600,
                color: colors.coral,
                backgroundColor: colors.accentBg,
                borderRadius: 10,
                padding: '10px 12px',
              }}
            >
              No se pudieron cargar todas las recolecciones. El servidor
              validará duplicados al programar.
            </div>
          ) : null}

          <AgricultorSelector
            grupos={gruposFiltrados}
            isLoading={isLoadingAgricultores}
            isError={isErrorAgricultores}
            truncated={agricultoresTruncados}
            errores={erroresAgricultores}
            selectedId={agricultor?.id_usuario ?? null}
            duplicateKeys={duplicateKeys}
            fecha={fecha}
            onRetry={refetchAgricultores}
            onSelect={setAgricultor}
          />

          {error ? (
            <div
              style={{
                marginTop: 14,
                fontSize: 13,
                fontWeight: 600,
                color: colors.coral,
                textAlign: 'center',
              }}
            >
              {error}
            </div>
          ) : null}
        </div>

        <div
          style={{
            padding: '12px 20px',
            borderTop: `1px solid ${colors.border}`,
            backgroundColor: colors.surface,
          }}
        >
          <button
            type="button"
            onClick={handleSubmit}
            disabled={mutation.isPending}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              width: '100%',
              backgroundColor: colors.brand,
              borderRadius: 12,
              padding: '14px',
              color: '#fff',
              fontSize: 15,
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              opacity: mutation.isPending ? 0.6 : 1,
            }}
          >
            <CalendarCheck size={20} />
            {mutation.isPending ? 'Guardando…' : 'Programar recolección'}
          </button>
        </div>
      </div>
    </div>
  );
}

function inputStyle(colors: ReturnType<typeof useAppColors>) {
  return {
    marginTop: 6,
    backgroundColor: colors.surface,
    borderRadius: 10,
    border: `1px solid ${colors.border}`,
    padding: '10px 12px',
    fontSize: 15,
    color: colors.fg,
    width: '100%',
    boxSizing: 'border-box' as const,
    fontFamily: 'inherit',
  };
}
