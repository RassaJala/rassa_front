import * as Sentry from '@sentry/react-native';
import { useQuery } from '@tanstack/react-query';

import api from '@/services/api';
import { fetchAllPages, unwrapOk } from '@/services/pagination';
import type { Localidad, Municipio } from '@/types';
import type { AdminUser } from '@/types/userManagement';
import { getFullName } from '@/utils/userManagement';

export interface AgricultorUbicacion {
  readonly municipioNombre: string;
  readonly localidades: readonly {
    readonly localidadNombre: string;
    readonly agricultores: readonly AdminUser[];
  }[];
}

const AGRICULTORES_URL = '/admin/usuarios/?rol=Agricultor&estado=true';

async function fetchMunicipios(): Promise<Municipio[]> {
  const { data } = await api.get<unknown>('/municipios/');
  return unwrapOk<Municipio[]>(data);
}

async function fetchLocalidades(municipioId: number): Promise<Localidad[]> {
  const { data } = await api.get<unknown>(
    `/localidades/?municipio_id=${municipioId}`,
  );
  return unwrapOk<Localidad[]>(data);
}

function groupByUbicacion(
  agricultores: AdminUser[],
  municipios: Municipio[],
  localidades: Localidad[],
): AgricultorUbicacion[] {
  const municipioNombreById = new Map(
    municipios.map((m) => [m.id_municipio, m.nombre]),
  );
  const localidadById = new Map(localidades.map((l) => [l.id_localidad, l]));

  const groups = new Map<string, Map<string, AdminUser[]>>();

  for (const agricultor of agricultores) {
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
          getFullName(a).localeCompare(getFullName(b), 'es'),
        ),
      })),
    };
  });
}

export function useAgricultoresUbicacion(options?: {
  readonly enabled?: boolean;
}): {
  agricultores: AgricultorUbicacion[];
  totalAgricultores: number;
  isLoading: boolean;
  isError: boolean;
  isRefetching: boolean;
  truncated: boolean;
  errores: number;
  refetch: () => void;
} {
  const enabled = options?.enabled ?? true;
  const { data, isLoading, isError, isRefetching, refetch } = useQuery<{
    grupos: AgricultorUbicacion[];
    truncated: boolean;
    errores: number;
  }>({
    queryKey: ['agricultores-ubicacion'],
    queryFn: async ({ signal }) => {
      const [municipiosResult, agricultoresResult] = await Promise.allSettled([
        fetchMunicipios(),
        fetchAllPages<AdminUser>(AGRICULTORES_URL, {
          source: 'agricultores',
          keyOf: (a) => a.id_usuario,
          signal,
        }),
      ]);

      if (
        municipiosResult.status === 'rejected' ||
        agricultoresResult.status === 'rejected'
      ) {
        const muniErr: unknown =
          municipiosResult.status === 'rejected'
            ? municipiosResult.reason
            : null;
        const agriErr: unknown =
          agricultoresResult.status === 'rejected'
            ? agricultoresResult.reason
            : null;
        Sentry.captureMessage(
          `[agricultores] fetch parcial: municipios=${
            muniErr ? 'fallo' : 'ok'
          } agricultores=${agriErr ? 'fallo' : 'ok'}`,
        );
        if (muniErr && agriErr) {
          throw muniErr;
        }
      }

      const municipios =
        municipiosResult.status === 'fulfilled' ? municipiosResult.value : [];
      const agriData =
        agricultoresResult.status === 'fulfilled'
          ? agricultoresResult.value
          : { data: [] as AdminUser[], truncated: false, errores: 1 };
      const settled = await Promise.allSettled(
        municipios.map((m) => fetchLocalidades(m.id_municipio)),
      );
      const localidades: Localidad[] = [];
      let fallos = 0;
      settled.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          localidades.push(...result.value);
        } else {
          fallos += 1;
          const municipio = municipios[idx];
          console.warn(
            `[agricultores] no se pudieron cargar localidades de ${
              municipio?.nombre ?? 'municipio desconocido'
            } (${municipio?.id_municipio ?? '?'}):`,
            result.reason,
          );
        }
      });
      if (fallos > 0) {
        Sentry.captureMessage(
          `[agricultores] ${fallos} de ${municipios.length} municipios sin localidades`,
        );
      }
      return {
        grupos: groupByUbicacion(agriData.data, municipios, localidades),
        truncated: agriData.truncated,
        errores: agriData.errores + fallos,
      };
    },
    staleTime: 5 * 60 * 1000,
    enabled,
    retry: false,
  });

  const grupos = data?.grupos ?? [];

  return {
    agricultores: grupos,
    totalAgricultores: grupos.reduce(
      (acc, grupo) =>
        acc +
        grupo.localidades.reduce(
          (sub, localidad) => sub + localidad.agricultores.length,
          0,
        ),
      0,
    ),
    isLoading,
    isError,
    isRefetching,
    truncated: data?.truncated ?? false,
    errores: data?.errores ?? 0,
    refetch: () => void refetch(),
  };
}
