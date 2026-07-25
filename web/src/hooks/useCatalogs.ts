import { useState } from 'react';

import { useQuery } from '@tanstack/react-query';

import api from '../services/api';
import type { Localidad, Municipio } from '../types';

export function useCatalogs() {
  const [selectedMunicipioId, setSelectedMunicipioId] = useState<number | null>(
    null,
  );
  const [localidadId, setLocalidadId] = useState<number | null>(null);

  const {
    data: municipios = [],
    isLoading: isLoadingMunicipios,
    error: errorMunicipios,
    refetch: refetchMunicipios,
  } = useQuery<Municipio[]>({
    queryKey: ['municipios'],
    queryFn: async () => {
      const { data } = await api.get<{ data: Municipio[] }>('/municipios/', {
        timeout: 10000,
      });
      return data.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: localidades = [],
    isLoading: isLoadingLocalidades,
    error: errorLocalidades,
    refetch: refetchLocalidades,
  } = useQuery<Localidad[]>({
    queryKey: ['localidades', selectedMunicipioId],
    queryFn: async () => {
      if (selectedMunicipioId === null) return [];
      const { data } = await api.get<{ data: Localidad[] }>(
        `/localidades/?municipio_id=${selectedMunicipioId}`,
        { timeout: 10000 },
      );
      return data.data;
    },
    enabled: selectedMunicipioId !== null,
    staleTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  function handleSelectMunicipio(id: number) {
    setSelectedMunicipioId(id);
    setLocalidadId(null);
  }

  return {
    municipios,
    localidades,
    selectedMunicipioId,
    localidadId,
    isLoadingMunicipios,
    isLoadingLocalidades,
    errorMunicipios: errorMunicipios ? 'Error al cargar municipios' : null,
    errorLocalidades: errorLocalidades ? 'Error al cargar localidades' : null,
    refetchMunicipios,
    refetchLocalidades,
    handleSelectMunicipio,
    setSelectedMunicipioId,
    setLocalidadId,
  };
}
