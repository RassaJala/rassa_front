import React from "react";

import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import TrashListScreen from "@/components/TrashListScreen";
import type { AdminStackParamList, Municipio } from "@/types";

type NavigationProp = NativeStackNavigationProp<
  AdminStackParamList,
  "MunicipioTrash"
>;

interface Props {
  readonly navigation: NavigationProp;
}

const municipioTrashConfig = {
  queryKey: ["municipios"] as const,
  endpoint: "/municipios/",
  entityName: "municipio",
  entityNamePlural: "Municipios",
  getId: (item: Municipio) => item.id_municipio,
  getSecondValue: () => null,
  headerTitle: "Municipios inactivos",
  emptyText: "No hay municipios en la papelera",
  emptyDescription: "Los municipios desactivados aparecerán aquí.",
  loadingErrorText: "Error al cargar la papelera de municipios.",
  toastRestored: (name: string) => `Se restauró el municipio "${name}"`,
  toastPermanentDeleted: (name: string) =>
    `Se eliminó permanentemente el municipio "${name}"`,
  permanentConfirmText: (item: Municipio) =>
    `¿Estás seguro de eliminar permanentemente "${item.nombre}"?`,
  listScreen: "MunicipioList" as const,
};

export default function MunicipioTrashScreen({
  navigation,
}: Props): React.JSX.Element {
  return (
    <TrashListScreen<Municipio>
      config={municipioTrashConfig}
      navigation={navigation}
    />
  );
}
