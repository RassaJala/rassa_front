import { useQuery } from '@tanstack/react-query';

import api from '../services/api';
import { isAbortError, mapWithConcurrency } from '../utils/concurrency';
import { logError } from '../utils/logger';
import { fetchAllPages } from '../utils/pagination';
import { nombreCompletoAgricultor } from '../utils/recolecciones';

export interface AgricultorListItem {
  readonly id_usuario: number;
  readonly nombre: string;
  readonly apellido_paterno: string;
  readonly apellido_materno: string | null;
  readonly role: string;
  readonly localidad: number | null;
}

export interface AgricultorUbicacion {
  readonly municipioNombre: string;
  readonly localidades: readonly {
    readonly localidadNombre: string;
    readonly agricultores: readonly AgricultorListItem[];
  }[];
}

interface Localidad {
  readonly id_localidad: number;
  readonly nombre: string;
  readonly municipio_id: number;
  readonly estado: boolean;
}

interface Municipio {
  readonly id_municipio: number;
  readonly nombre: string;
  readonly estado: boolean;
}

interface AgricultoresResult {
  readonly data: AgricultorListItem[];
  readonly truncated: boolean;
  readonly errores: number;
}

const AGRICULTORES_URL = '/recolecciones/agricultores/';

// Cota total para las fases de carga (agricultores paginados + localidades por
// municipio): municipios × (timeout 15s + retry) puede multiplicarse cuando hay
// muchos municipios; el deadline impide que el modal se quede en spinner
// minutos. El presupuesto es único y compartido entre ambas fases (no se
// apilan 30s + 30s en serie). Los items que no alcanzan se descuentan como
// fallos (deadlineError no es un abort) y la UI avisa con el banner.
const LOCALIDADES_DEADLINE_MS = 30_000;

// Límite de solicitudes de localidades en vuelo (una por municipio activo). Se
// acota para no abrir cientos de fetchs simultáneos contra el API.
const LOCALIDADES_CONCURRENCIA = 4;

function unwrapData<T>(body: unknown): T {
  if (
    body &&
    typeof body === 'object' &&
    'data' in (body as Record<string, unknown>)
  ) {
    return (body as { data: T }).data;
  }
  return body as T;
}

async function fetchMunicipios(signal?: AbortSignal): Promise<Municipio[]> {
  const { data } = await api.get<unknown>('/municipios/', { signal });
  return unwrapData<Municipio[]>(data);
}

async function fetchLocalidades(
  municipioId: number,
  signal?: AbortSignal,
): Promise<Localidad[]> {
  const { data } = await api.get<unknown>('/localidades/', {
    params: { municipio_id: municipioId },
    signal,
  });
  return unwrapData<Localidad[]>(data);
}

async function fetchAgricultores(
  signal?: AbortSignal,
  maxDurationMs?: number,
): Promise<AgricultoresResult> {
  const result = await fetchAllPages<AgricultorListItem>({
    url: AGRICULTORES_URL,
    signal,
    maxDurationMs,
    fetchPage: async (url, _params, pageSignal) =>
      (await api.get<unknown>(url, { signal: pageSignal })).data,
    unwrap: (body) =>
      unwrapData<{
        readonly next?: string | null;
        readonly results?: AgricultorListItem[];
      }>(body),
  });

  if (result.errores > 0 && result.data.length === 0) {
    throw new Error('No se pudieron cargar los agricultores');
  }

  return result;
}

function groupByUbicacion(
  agricultores: AgricultorListItem[],
  municipios: Municipio[],
  localidades: Localidad[],
): AgricultorUbicacion[] {
  // Los registros desactivados (estado=false) no deben ofrecerse para
  // programar: se filtran los municipios/localidades antes de agrupar. Los
  // agricultores cuya localidad quedó fuera (inactiva, o de un municipio
  // inactivo que ni siquiera se consulta) también se excluyen; de lo contrario
  // reaparecerían bajo 'Sin localidad' y serían seleccionables.
  const municipiosActivos = municipios.filter((m) => m.estado);
  const localidadesActivas = localidades.filter((l) => l.estado);
  const municipioNombreById = new Map(
    municipiosActivos.map((m) => [m.id_municipio, m.nombre]),
  );
  const localidadById = new Map(
    localidadesActivas.map((l) => [l.id_localidad, l]),
  );

  const groups = new Map<string, Map<string, AgricultorListItem[]>>();

  for (const agricultor of agricultores) {
    if (
      agricultor.localidad != null &&
      !localidadById.has(agricultor.localidad)
    ) {
      continue;
    }
    const localidad = agricultor.localidad
      ? localidadById.get(agricultor.localidad)
      : undefined;
    const municipioNombre = localidad
      ? (municipioNombreById.get(localidad.municipio_id) ?? 'Sin municipio')
      : 'Sin municipio';
    const localidadNombre = localidad?.nombre ?? 'Sin localidad';

    let localidadMap = groups.get(municipioNombre);
    if (!localidadMap) {
      localidadMap = new Map();
      groups.set(municipioNombre, localidadMap);
    }
    const list = localidadMap.get(localidadNombre) ?? [];
    list.push(agricultor);
    localidadMap.set(localidadNombre, list);
  }

  const sortedMunicipios = [...groups.entries()].sort(([a], [b]) =>
    a.localeCompare(b, 'es'),
  );

  return sortedMunicipios.map(([municipioNombre, localidadMap]) => {
    const sortedLocalidades = [...localidadMap.entries()].sort(([a], [b]) =>
      a.localeCompare(b, 'es'),
    );
    return {
      municipioNombre,
      localidades: sortedLocalidades.map(([localidadNombre, list]) => ({
        localidadNombre,
        agricultores: [...list].sort((a, b) =>
          nombreCompletoAgricultor(a).localeCompare(
            nombreCompletoAgricultor(b),
            'es',
          ),
        ),
      })),
    };
  });
}

export function useAgricultoresUbicacion(options?: {
  readonly enabled?: boolean;
  /** Presupuesto total de pared en ms (default: LOCALIDADES_DEADLINE_MS). Se
   * expone para acotar la duración del presupuesto en pruebas. */
  readonly deadlineMs?: number;
}): {
  agricultores: AgricultorUbicacion[];
  isLoading: boolean;
  isError: boolean;
  truncated: boolean;
  errores: number;
  refetch: () => void;
} {
  const enabled = options?.enabled ?? true;
  const deadlineMs = options?.deadlineMs ?? LOCALIDADES_DEADLINE_MS;

  const { data, isLoading, isError, refetch } = useQuery<{
    grupos: AgricultorUbicacion[];
    truncated: boolean;
    errores: number;
  }>({
    queryKey: ['agricultores-ubicacion'],
    queryFn: async ({ signal }) => {
      // Un único presupuesto compartido de pared para todas las fases: se fija
      // al arrancar y cada fase recibe el tiempo restante (los 30s no se apilan
      // en serie). Las fases corren en serie porque el presupuesto restante solo
      // se conoce al terminar la anterior; en paralelo, la fase que termina
      // después se habría llevado todo el tiempo y la última quedaría sin
      // presupuesto. El deadline aborta también los municipios en vuelo (la
      // señal del presupuesto se pasa a cada fetch), así el tope es de pared.
      const deadline = Date.now() + deadlineMs;
      const remaining = () => Math.max(0, deadline - Date.now());
      const budget = new AbortController();
      const budgetTimer = setTimeout(() => budget.abort(), deadlineMs);
      const onCallerAbort = () => budget.abort();
      if (signal?.aborted) budget.abort();
      else signal?.addEventListener('abort', onCallerAbort, { once: true });

      // El deadline de pared se reconoce por la señal del presupuesto + el
      // reloj (ver uso en el conteo de fallos y en el catch).
      const deadlineExpirado = () =>
        budget.signal.aborted && Date.now() >= deadline;

      try {
        const municipios = await fetchMunicipios(budget.signal);

        // Los municipios desactivados no se consultan ni se agrupan.
        const municipiosActivos = municipios.filter((m) => m.estado);

        const agricultoresResult = await fetchAgricultores(
          budget.signal,
          remaining(),
        );

        const settled = await mapWithConcurrency(
          municipiosActivos,
          LOCALIDADES_CONCURRENCIA,
          (m, budgetSignal) => fetchLocalidades(m.id_municipio, budgetSignal),
          budget.signal,
          remaining(),
        );
        const localidades: Localidad[] = [];
        let fallos = 0;
        // mapWithConcurrency rechaza los items en vuelo con `abortError` cuando
        // aborta la señal del presupuesto (el deadline del mapa corre un
        // instante después que el del hook, así que nunca es el primero en
        // vencer). Esos items abortados por el deadline se cuentan como fallos
        // para que la UI avise con el banner; un abort real del llamador
        // (Date.now() < deadline) sigue sin contar: es una cancelación, no un
        // fallo de carga.
        settled.forEach((result) => {
          if (result.status === 'fulfilled') {
            localidades.push(...result.value);
          } else if (!isAbortError(result.reason) || deadlineExpirado()) {
            fallos += 1;
          }
        });
        if (deadlineExpirado()) {
          logError(
            'useAgricultoresUbicacion',
            new Error('Deadline de carga alcanzado'),
            {
              fallos,
              localidadesCargadas: localidades.length,
              truncated: agricultoresResult.truncated,
            },
          );
        }

        return {
          grupos: groupByUbicacion(
            agricultoresResult.data,
            municipios,
            localidades,
          ),
          truncated: agricultoresResult.truncated,
          errores: agricultoresResult.errores + fallos,
        };
      } catch (error) {
        // Mismo criterio que el conteo de fallos: un abort que coincide con el
        // deadline de pared se registra (es un timeout), el resto de
        // cancelaciones del llamador no.
        if (!isAbortError(error) || deadlineExpirado()) {
          logError('useAgricultoresUbicacion', error);
        }
        throw error;
      } finally {
        clearTimeout(budgetTimer);
        signal?.removeEventListener('abort', onCallerAbort);
      }
    },
    staleTime: 5 * 60 * 1000,
    enabled,
    retry: false,
  });

  const grupos = data?.grupos ?? [];

  return {
    agricultores: grupos,
    isLoading,
    isError,
    truncated: data?.truncated ?? false,
    errores: data?.errores ?? 0,
    refetch: () => void refetch(),
  };
}
