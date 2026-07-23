import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { SegmentedButtons, TextInput } from "react-native-paper";

import CatalogSelector from "@/components/CatalogSelector";
import type { useRegistrationForm } from "@/hooks/useRegistrationForm";
import { cleanAddress, cleanName, formatPhoneNumber } from "@/utils/validation";

interface RegistrationFormFieldsProps {
  readonly form: ReturnType<typeof useRegistrationForm>;
  readonly setErrorMessage: (msg: string | null) => void;
  readonly onOpenDatePicker: () => void;
}

export default function RegistrationFormFields({
  form,
  setErrorMessage,
  onOpenDatePicker,
}: RegistrationFormFieldsProps): React.JSX.Element {
  const {
    email,
    setEmail,
    password,
    setPassword,
    telefono,
    setTelefono,
    nombre,
    setNombre,
    apellidoPaterno,
    setApellidoPaterno,
    apellidoMaterno,
    setApellidoMaterno,
    fechaNacimiento,
    setFechaNacimiento,
    sexo,
    setSexo,
    domicilio,
    setDomicilio,
    catalog,
  } = form;

  return (
    <View>
      <TextInput
        mode="outlined"
        label="Correo electrónico *"
        autoCapitalize="none"
        keyboardType="email-address"
        className="mb-4 bg-white dark:bg-gray-900"
        placeholder="ejemplo@correo.com"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        mode="outlined"
        label="Contraseña (mínimo 6 caracteres) *"
        className="mb-4 bg-white dark:bg-gray-900"
        placeholder="••••••••"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TextInput
        mode="outlined"
        label="Nombre *"
        className="mb-4 bg-white dark:bg-gray-900"
        placeholder="Nombre(s)"
        value={nombre}
        onChangeText={(val) => setNombre(cleanName(val))}
      />

      <TextInput
        mode="outlined"
        label="Apellido Paterno *"
        className="mb-4 bg-white dark:bg-gray-900"
        placeholder="Apellido Paterno"
        value={apellidoPaterno}
        onChangeText={(val) => setApellidoPaterno(cleanName(val))}
      />

      <TextInput
        mode="outlined"
        label="Apellido Materno"
        className="mb-4 bg-white dark:bg-gray-900"
        placeholder="Apellido Materno"
        value={apellidoMaterno}
        onChangeText={(val) => setApellidoMaterno(cleanName(val))}
      />

      <TextInput
        mode="outlined"
        label="Teléfono *"
        className="mb-1 bg-white dark:bg-gray-900"
        placeholder="10 dígitos"
        keyboardType="phone-pad"
        value={telefono}
        onChangeText={(val) => setTelefono(formatPhoneNumber(val))}
      />
      <Text className="mb-4 text-xs text-gray-500 dark:text-gray-400">
        Para números extranjeros inicia con + (ej. +1...)
      </Text>

      <TouchableOpacity testID="birthdate-pressable" onPress={onOpenDatePicker}>
        <View pointerEvents="none">
          <TextInput
            mode="outlined"
            label="Fecha de Nacimiento *"
            className="mb-4 bg-white dark:bg-gray-900"
            placeholder="AAAA-MM-DD"
            value={fechaNacimiento}
            showSoftInputOnFocus={false}
            onChangeText={setFechaNacimiento}
          />
        </View>
      </TouchableOpacity>

      <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        Género *
      </Text>
      <SegmentedButtons
        value={sexo}
        onValueChange={setSexo}
        buttons={[
          { value: "M", label: "Masculino" },
          { value: "F", label: "Femenino" },
          { value: "O", label: "Otro" },
        ]}
        style={{ marginBottom: 16 }}
      />

      <TextInput
        mode="outlined"
        label="Dirección *"
        className="mb-4 bg-white dark:bg-gray-900"
        placeholder="Calle, número, colonia"
        value={domicilio}
        onChangeText={(val) => setDomicilio(cleanAddress(val))}
      />

      <CatalogSelector
        selectedMunicipioId={catalog.selectedMunicipioId}
        selectedMunicipioNombre={catalog.selectedMunicipioNombre}
        onSelectMunicipio={catalog.handleSelectMunicipio}
        localidadNombre={catalog.localidadNombre}
        localidadId={catalog.localidadId}
        onSelectLocalidad={catalog.handleSelectLocalidad}
        municipios={catalog.municipios}
        localidades={catalog.localidades}
        isLoadingMunicipios={catalog.isLoadingMunicipios}
        isLoadingLocalidades={catalog.isLoadingLocalidades}
        errorMunicipios={catalog.errorMunicipios}
        errorLocalidades={catalog.errorLocalidades}
        refetchMunicipios={catalog.refetchMunicipios}
        refetchLocalidades={catalog.refetchLocalidades}
        setErrorMessage={setErrorMessage}
      />
    </View>
  );
}
