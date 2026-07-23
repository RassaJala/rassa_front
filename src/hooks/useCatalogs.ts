import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import { useQuery } from "@tanstack/react-query";

import api from "@/services/api";
import type { Localidad, Municipio } from "@/types";

export function useCatalogs(
  initialMunicipioId: number | null = null,
  initialLocalidadId: number | null = null,
  initialMunicipioNombre = "",
  initialLocalidadNombre = "",
): {
  municipios: Municipio[];
  localidades: Localidad[];
  selectedMunicipioId: number | null;
  selectedMunicipioNombre: string;
  localidadId: number | null;
  localidadNombre: string;
  isLoadingMunicipios: boolean;
  isLoadingLocalidades: boolean;
  errorMunicipios: string | null;
  errorLocalidades: string | null;
  refetchMunicipios: () => Promise<unknown>;
  refetchLocalidades: () => Promise<unknown>;
  handleSelectMunicipio: (id: number, nombre: string) => void;
  handleSelectLocalidad: (id: number, nombre: string) => void;
  setSelectedMunicipioId: Dispatch<SetStateAction<number | null>>;
  setSelectedMunicipioNombre: Dispatch<SetStateAction<string>>;
  setLocalidadId: Dispatch<SetStateAction<number | null>>;
  setLocalidadNombre: Dispatch<SetStateAction<string>>;
} {
  const [selectedMunicipioId, setSelectedMunicipioId] = useState<number | null>(
    initialMunicipioId,
  );
  const [selectedMunicipioNombre, setSelectedMunicipioNombre] = useState(
    initialMunicipioNombre,
  );
  const [localidadId, setLocalidadId] = useState<number | null>(
    initialLocalidadId,
  );
  const [localidadNombre, setLocalidadNombre] = useState(
    initialLocalidadNombre,
  );

  const {
    data: municipios = [],
    isLoading: isLoadingMunicipios,
    error: errorMunicipios,
    refetch: refetchMunicipios,
  } = useQuery<Municipio[]>({
    queryKey: ["municipios"],
    queryFn: async () => {
      const { data } = await api.get<{ data: Municipio[] }>("/municipios/", {
        timeout: 10000,
      });
      return data.data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const {
    data: localidades = [],
    isLoading: isLoadingLocalidades,
    error: errorLocalidades,
    refetch: refetchLocalidades,
  } = useQuery<Localidad[]>({
    queryKey: ["localidades", selectedMunicipioId],
    queryFn: async () => {
      if (selectedMunicipioId === null) return [];
      const { data } = await api.get<{ data: Localidad[] }>(
        `/localidades/?municipio_id=${selectedMunicipioId}`,
        { timeout: 10000 },
      );
      return data.data;
    },
    enabled: selectedMunicipioId !== null,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    placeholderData: (previousData) => previousData,
  });

  const handleSelectMunicipio = (id: number, nombre: string) => {
    setSelectedMunicipioId(id);
    setSelectedMunicipioNombre(nombre);
    setLocalidadId(null);
    setLocalidadNombre("");
  };

  const handleSelectLocalidad = (id: number, nombre: string) => {
    setLocalidadId(id);
    setLocalidadNombre(nombre);
  };

  return {
    municipios,
    localidades,
    selectedMunicipioId,
    selectedMunicipioNombre,
    localidadId,
    localidadNombre,
    isLoadingMunicipios,
    isLoadingLocalidades,
    errorMunicipios: errorMunicipios
      ? "Error al cargar datos. Toca Reintentar."
      : null,
    errorLocalidades: errorLocalidades
      ? "Error al cargar datos. Toca Reintentar."
      : null,
    refetchMunicipios,
    refetchLocalidades,
    handleSelectMunicipio,
    handleSelectLocalidad,
    setSelectedMunicipioId,
    setSelectedMunicipioNombre,
    setLocalidadId,
    setLocalidadNombre,
  };
}
