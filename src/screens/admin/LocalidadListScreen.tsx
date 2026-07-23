import React from "react";

import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import CrudListScreen from "@/components/CrudListScreen";
import type { AdminStackParamList, Localidad } from "@/types";

type NavigationProp = NativeStackNavigationProp<
  AdminStackParamList,
  "LocalidadList"
>;

type RoutePropType = RouteProp<AdminStackParamList, "LocalidadList">;

interface Props {
  readonly navigation: NavigationProp;
  readonly route: RoutePropType;
}

export default function LocalidadListScreen({
  navigation,
  route,
}: Props): React.JSX.Element {
  const { municipioId, municipioNombre } = route.params;

  const localidadConfig = {
    queryKey: ["localidades"] as const,
    endpoint: "/localidades/",
    queryParams: { municipio_id: String(municipioId) },
    comingSoon: false,
    entityName: "localidad",
    entityNamePlural: `Localidades - ${municipioNombre}`,
    entityNamePluralLower: "localidades",
    getId: (item: Localidad) => item.id_localidad,
    fields: [{ name: "nombre", label: "Nombre" }] as const,
    errorFieldKeys: ["nombre", "detail"] as const,
    emptyIcon: "map-marker-outline",
    emptyText: "No hay localidades",
    emptyDescription: `Agrega una localidad en ${municipioNombre} para comenzar.`,
    headerTitle: `Localidades (${municipioNombre})`,
    loadingErrorText: "Error al cargar localidades.",
    newDialogTitle: "Nueva localidad",
    editDialogTitle: "Editar localidad",
    deleteDialogTitle: "Eliminar localidad",
    deleteConfirmText: (item: Localidad) =>
      `¿Estás seguro de eliminar "${item.nombre}"?`,
    toastCreated: (name: string) => `Se creó la localidad "${name}"`,
    toastEdited: (name: string) => `Se editó la localidad "${name}"`,
    toastDeleted: (name: string) => `Se eliminó la localidad "${name}"`,
    toastActivated: (name: string) => `Se activó la localidad "${name}"`,
    toastDeactivated: (name: string) => `Se desactivó la localidad "${name}"`,
    statusLabels: { active: "Activo", inactive: "Inactivo" },
    trashScreenName: "LocalidadTrash" as const,
    trashScreenParams: { municipioId, municipioNombre },
    toggleEndpoint: "estado/",
    validate: (formValues: Record<string, string>) => {
      if (!(formValues.nombre ?? "").trim()) return "El nombre es obligatorio.";
      return null;
    },
  };

  return (
    <CrudListScreen<Localidad>
      config={localidadConfig}
      navigation={navigation}
    />
  );
}
