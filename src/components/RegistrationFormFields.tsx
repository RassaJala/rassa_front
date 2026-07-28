import React from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';

import CatalogSelector from '@/components/CatalogSelector';
import type { useRegistrationForm } from '@/hooks/useRegistrationForm';
import type { AdminColors } from '@/utils/adminTheme';
import { cleanAddress, cleanName, formatPhoneNumber } from '@/utils/validation';

interface RegistrationFormFieldsProps {
  readonly form: ReturnType<typeof useRegistrationForm>;
  readonly colors: AdminColors;
  readonly setErrorMessage: (msg: string | null) => void;
  readonly onOpenDatePicker: () => void;
  readonly disabled?: boolean;
}

export default function RegistrationFormFields({
  form,
  colors,
  setErrorMessage,
  onOpenDatePicker,
  disabled = false,
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

  const labelStyle = {
    marginBottom: 6,
    marginTop: 16,
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: 0.08,
    textTransform: 'uppercase' as const,
    color: colors.muted,
  };

  const inputStyle = {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    color: colors.fg,
    fontSize: 15,
    paddingHorizontal: 14,
    height: 46,
  };

  const placeholderColor = colors.muted;

  const sexoOptions = [
    { value: 'M' as const, label: 'Masculino' },
    { value: 'F' as const, label: 'Femenino' },
    { value: 'O' as const, label: 'Otro' },
  ];

  return (
    <View>
      <Text style={labelStyle}>Correo electrónico *</Text>
      <TextInput
        style={inputStyle}
        placeholder="ejemplo@correo.com"
        placeholderTextColor={placeholderColor}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        editable={!disabled}
      />

      <Text style={labelStyle}>Contraseña *</Text>
      <TextInput
        style={inputStyle}
        placeholder="Mínimo 8 caracteres"
        placeholderTextColor={placeholderColor}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        editable={!disabled}
      />

      <Text style={labelStyle}>Nombre *</Text>
      <TextInput
        style={inputStyle}
        placeholder="Nombre(s)"
        placeholderTextColor={placeholderColor}
        value={nombre}
        onChangeText={(val) => setNombre(cleanName(val))}
        editable={!disabled}
      />

      <Text style={labelStyle}>Apellido Paterno *</Text>
      <TextInput
        style={inputStyle}
        placeholder="Apellido Paterno"
        placeholderTextColor={placeholderColor}
        value={apellidoPaterno}
        onChangeText={(val) => setApellidoPaterno(cleanName(val))}
        editable={!disabled}
      />

      <Text style={labelStyle}>Apellido Materno</Text>
      <TextInput
        style={inputStyle}
        placeholder="Apellido Materno"
        placeholderTextColor={placeholderColor}
        value={apellidoMaterno}
        onChangeText={(val) => setApellidoMaterno(cleanName(val))}
        editable={!disabled}
      />

      <Text style={labelStyle}>Teléfono *</Text>
      <TextInput
        style={inputStyle}
        placeholder="10 dígitos"
        placeholderTextColor={placeholderColor}
        keyboardType="phone-pad"
        value={telefono}
        onChangeText={(val) => setTelefono(formatPhoneNumber(val))}
        editable={!disabled}
      />
      <Text style={{ marginTop: 4, fontSize: 12, color: colors.muted }}>
        Para números extranjeros inicia con + (ej. +1...)
      </Text>

      <TouchableOpacity
        testID="birthdate-pressable"
        onPress={onOpenDatePicker}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Text style={labelStyle}>Fecha de Nacimiento *</Text>
        <View pointerEvents="none">
          <TextInput
            style={inputStyle}
            placeholder="AAAA-MM-DD"
            placeholderTextColor={placeholderColor}
            value={fechaNacimiento}
            showSoftInputOnFocus={false}
            onChangeText={setFechaNacimiento}
            editable={!disabled}
          />
        </View>
      </TouchableOpacity>

      <Text style={labelStyle}>Género *</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {sexoOptions.map((opt) => {
          const isActive = sexo === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              activeOpacity={0.7}
              onPress={() => setSexo(opt.value)}
              disabled={disabled}
              style={{
                flex: 1,
                height: 40,
                borderRadius: 10,
                borderWidth: 1.5,
                borderColor: isActive ? colors.brand : colors.border,
                backgroundColor: isActive ? colors.accentBg : colors.segBg,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: isActive ? colors.brand : colors.muted,
                }}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={labelStyle}>Dirección *</Text>
      <TextInput
        style={inputStyle}
        placeholder="Calle, número, colonia"
        placeholderTextColor={placeholderColor}
        value={domicilio}
        onChangeText={(val) => setDomicilio(cleanAddress(val))}
        editable={!disabled}
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
        catalogColors={colors}
      />
    </View>
  );
}
