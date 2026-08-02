import { useQuery } from '@tanstack/react-query';

import api from '../services/api';
import { isAbortError, mapWithConcurrency } from '../utils/concurrency';
import { logError } from '../utils/logger';
import { fetchAllPages } from '../utils/pagination';

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

export function getFullNameAgricultor(a: AgricultorListItem): string {
  return [a.nombre, a.apellido_paterno, a.apellido_materno]
    .filter(Boolean)
    .join(' ');
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
          getFullNameAgricultor(a).localeCompare(
            getFullNameAgricultor(b),
            'es',
          ),
        ),
      })),
    };
  });
}

export function useAgricultoresUbicacion(options?: {
  readonly enabled?: boolean;
}): {
  agricultores: AgricultorUbicacion[];
  isLoading: boolean;
  isError: boolean;
  truncated: boolean;
  errores: number;
  refetch: () => void;
} {
  const enabled = options?.enabled ?? true;

  const { data, isLoading, isError, refetch } = useQuery<{
    grupos: AgricultorUbicacion[];
    truncated: boolean;
    errores: number;
  }>({
    queryKey: ['agricultores-ubicacion'],
    queryFn: async ({ signal }) => {
      // Un único presupuesto compartido: el deadline se fija al arrancar y
      // cada fase recibe el tiempo restante (los 30s no se apilan en serie).
      const deadline = Date.now() + LOCALIDADES_DEADLINE_MS;
      const remaining = () => Math.max(0, deadline - Date.now());
      try {
        const [municipios, agricultoresResult] = await Promise.all([
          fetchMunicipios(signal),
          fetchAgricultores(signal, remaining()),
        ]);

        // Los municipios desactivados no se consultan ni se agrupan.
        const municipiosActivos = municipios.filter((m) => m.estado);

        const settled = await mapWithConcurrency(
          municipiosActivos,
          4,
          (m, budgetSignal) => fetchLocalidades(m.id_municipio, budgetSignal),
          signal,
          remaining(),
        );
        const localidades: Localidad[] = [];
        let fallos = 0;
        settled.forEach((result) => {
          if (result.status === 'fulfilled') {
            localidades.push(...result.value);
          } else if (!isAbortError(result.reason)) {
            fallos += 1;
          }
        });

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
        if (!isAbortError(error)) {
          logError('useAgricultoresUbicacion', error);
        }
        throw error;
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
