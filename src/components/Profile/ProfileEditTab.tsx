import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Button, SegmentedButtons, TextInput } from "react-native-paper";

import CatalogSelector from "@/components/CatalogSelector";
import { BRAND_RED_CORAL } from "@/constants/brandColors";
import type { Localidad, Municipio } from "@/types";
import { cleanAddress, cleanName, formatPhoneNumber } from "@/utils/validation";

export interface ProfileFormFields {
  readonly nombre: string;
  readonly setNombre: (val: string) => void;
  readonly apellidoPaterno: string;
  readonly setApellidoPaterno: (val: string) => void;
  readonly apellidoMaterno: string;
  readonly setApellidoMaterno: (val: string) => void;
  readonly telefono: string;
  readonly setTelefono: (val: string) => void;
  readonly fechaNacimiento: string;
  readonly setFechaNacimiento: (val: string) => void;
  readonly sexo: "M" | "F" | "O";
  readonly setSexo: (val: "M" | "F" | "O") => void;
  readonly domicilio: string;
  readonly setDomicilio: (val: string) => void;
}

export interface ProfileLocationFields {
  readonly selectedMunicipioId: number | null;
  readonly selectedMunicipioNombre: string;
  readonly localidadId: number | null;
  readonly localidadNombre: string;
  readonly municipios: Municipio[];
  readonly localidades: Localidad[];
  readonly isLoadingMunicipios: boolean;
  readonly isLoadingLocalidades: boolean;
  readonly errorMunicipios: string | null;
  readonly errorLocalidades: string | null;
  readonly refetchMunicipios: () => void;
  readonly refetchLocalidades: () => void;
  readonly handleSelectMunicipio: (id: number, nombre: string) => void;
  readonly handleSelectLocalidad: (id: number, nombre: string) => void;
}

interface ProfileEditTabProps {
  readonly isSubmitting: boolean;
  readonly form: ProfileFormFields;
  readonly location: ProfileLocationFields;
  readonly callbacks: {
    readonly handleUpdateProfile: () => void;
    readonly setErrorMessage: (val: string | null) => void;
    readonly onOpenDatePicker: () => void;
  };
}

export default function ProfileEditTab({
  isSubmitting,
  form,
  location,
  callbacks,
}: ProfileEditTabProps): React.JSX.Element {
  return (
    <View className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <Text className="mb-4 border-b border-gray-200 pb-2 text-lg font-bold text-brand-ink dark:border-gray-800 dark:text-gray-100">
        Editar Perfil
      </Text>

      <TextInput
        mode="outlined"
        label="Nombre *"
        className="mb-4 bg-white dark:bg-gray-900"
        placeholder="Nombre"
        value={form.nombre}
        onChangeText={(val) => form.setNombre(cleanName(val))}
      />

      <TextInput
        mode="outlined"
        label="Apellido Paterno *"
        className="mb-4 bg-white dark:bg-gray-900"
        placeholder="Apellido Paterno"
        value={form.apellidoPaterno}
        onChangeText={(val) => form.setApellidoPaterno(cleanName(val))}
      />

      <TextInput
        mode="outlined"
        label="Apellido Materno"
        className="mb-4 bg-white dark:bg-gray-900"
        placeholder="Apellido Materno"
        value={form.apellidoMaterno}
        onChangeText={(val) => form.setApellidoMaterno(cleanName(val))}
      />

      <TextInput
        mode="outlined"
        label="Teléfono *"
        className="mb-4 bg-white dark:bg-gray-900"
        placeholder="xxx-xxx-xx-xx"
        keyboardType="phone-pad"
        value={form.telefono}
        onChangeText={(val) => form.setTelefono(formatPhoneNumber(val))}
      />

      <TouchableOpacity
        testID="birthdate-pressable"
        onPress={callbacks.onOpenDatePicker}
      >
        <TextInput
          mode="outlined"
          label="Fecha de Nacimiento *"
          className="mb-4 bg-white dark:bg-gray-900"
          placeholder="AAAA-MM-DD"
          value={form.fechaNacimiento}
          showSoftInputOnFocus={false}
          onChangeText={form.setFechaNacimiento}
        />
      </TouchableOpacity>

      <Text className="mb-2 text-sm font-normal text-gray-700 dark:text-gray-300">
        Género *
      </Text>
      <SegmentedButtons
        value={form.sexo}
        onValueChange={form.setSexo}
        buttons={[
          { value: "M", label: "Masculino" },
          { value: "F", label: "Femenino" },
          { value: "O", label: "Otro" },
        ]}
        style={styles.segmentedButtons}
      />

      <TextInput
        mode="outlined"
        label="Dirección *"
        className="mb-4 bg-white dark:bg-gray-900"
        placeholder="Calle, número, colonia"
        value={form.domicilio}
        onChangeText={(val) => form.setDomicilio(cleanAddress(val))}
      />

      <CatalogSelector
        selectedMunicipioId={location.selectedMunicipioId}
        selectedMunicipioNombre={location.selectedMunicipioNombre}
        onSelectMunicipio={location.handleSelectMunicipio}
        localidadNombre={location.localidadNombre}
        localidadId={location.localidadId}
        onSelectLocalidad={location.handleSelectLocalidad}
        municipios={location.municipios}
        localidades={location.localidades}
        isLoadingMunicipios={location.isLoadingMunicipios}
        isLoadingLocalidades={location.isLoadingLocalidades}
        errorMunicipios={location.errorMunicipios}
        errorLocalidades={location.errorLocalidades}
        refetchMunicipios={location.refetchMunicipios}
        refetchLocalidades={location.refetchLocalidades}
        setErrorMessage={callbacks.setErrorMessage}
      />

      <Button
        testID="save-changes-button"
        mode="contained"
        disabled={isSubmitting}
        onPress={callbacks.handleUpdateProfile}
        buttonColor={BRAND_RED_CORAL}
        className="mt-4 rounded-lg"
        contentStyle={styles.buttonContent}
      >
        {isSubmitting ? <ActivityIndicator color="#fff" /> : "Guardar Cambios"}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  buttonContent: {
    paddingVertical: 6,
  },
  segmentedButtons: {
    marginBottom: 16,
  },
});
