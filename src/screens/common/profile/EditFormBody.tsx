import { Text, TouchableOpacity, View } from 'react-native';
import { Button, SegmentedButtons } from 'react-native-paper';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { cleanAddress, cleanName, formatPhoneNumber, MAX_NOMBRE } from '@/utils/validation';

import CatalogSelector from './CatalogSelector';
import FormField from './FormField';
import type { ProfileColors } from './profileColors';

interface EditFormBodyProps {
  readonly colors: ProfileColors;
  readonly nombre: string;
  readonly apellidoPaterno: string;
  readonly apellidoMaterno: string;
  readonly telefono: string;
  readonly fechaNacimiento: string;
  readonly sexo: 'M' | 'F' | 'O';
  readonly domicilio: string;
  readonly isSubmitting: boolean;
  readonly selectedMunicipioNombre: string;
  readonly isLoadingMunicipios: boolean;
  readonly errorMunicipios: string | null;
  readonly localidadNombre: string;
  readonly isLoadingLocalidades: boolean;
  readonly errorLocalidades: string | null;
  readonly selectedMunicipioId: number | null;
  readonly onNombreChange: (v: string) => void;
  readonly onApellidoPaternoChange: (v: string) => void;
  readonly onApellidoMaternoChange: (v: string) => void;
  readonly onTelefonoChange: (v: string) => void;
  readonly onSexoChange: (v: 'M' | 'F' | 'O') => void;
  readonly onDomicilioChange: (v: string) => void;
  readonly onOpenDatePicker: (currentDate: string) => void;
  readonly onOpenMunicipioDialog: () => void;
  readonly onOpenLocalidadDialog: () => void;
  readonly onRetryMunicipios: () => void;
  readonly onRetryLocalidades: () => void;
  readonly onSetError: (msg: string | null) => void;
  readonly onCancel: () => void;
  readonly onSave: () => void;
}

export default function EditFormBody({
  colors: c,
  nombre,
  apellidoPaterno,
  apellidoMaterno,
  telefono,
  fechaNacimiento,
  sexo,
  domicilio,
  isSubmitting,
  selectedMunicipioNombre,
  isLoadingMunicipios,
  errorMunicipios,
  localidadNombre,
  isLoadingLocalidades,
  errorLocalidades,
  selectedMunicipioId,
  onNombreChange,
  onApellidoPaternoChange,
  onApellidoMaternoChange,
  onTelefonoChange,
  onSexoChange,
  onDomicilioChange,
  onOpenDatePicker,
  onOpenMunicipioDialog,
  onOpenLocalidadDialog,
  onRetryMunicipios,
  onRetryLocalidades,
  onSetError,
  onCancel,
  onSave,
}: EditFormBodyProps): React.JSX.Element {
  return (
    <>
      <Text
        style={{
          fontSize: 16,
          fontWeight: '700',
          color: c.fg,
          letterSpacing: -0.15,
          marginBottom: 20,
        }}
      >
        Editar Información
      </Text>

      <FormField
        label="Nombre"
        value={nombre}
        onChangeText={(val) => onNombreChange(cleanName(val))}
        placeholder="Nombre"
        maxLength={MAX_NOMBRE}
        required
        colors={c}
      />

      <FormField
        label="Apellido Paterno"
        value={apellidoPaterno}
        onChangeText={(val) => onApellidoPaternoChange(cleanName(val))}
        placeholder="Apellido Paterno"
        maxLength={MAX_NOMBRE}
        required
        colors={c}
      />

      <FormField
        label="Apellido Materno"
        value={apellidoMaterno}
        onChangeText={(val) => onApellidoMaternoChange(cleanName(val))}
        placeholder="Apellido Materno"
        maxLength={MAX_NOMBRE}
        colors={c}
      />

      <FormField
        label="Teléfono"
        value={telefono}
        onChangeText={(val) => {
          const digitsOnly = val.replace(/\D/g, '');
          if (digitsOnly.length <= 10) {
            onTelefonoChange(formatPhoneNumber(val));
          }
        }}
        placeholder="xxx-xxx-xx-xx"
        maxLength={13}
        keyboardType="phone-pad"
        required
        colors={c}
      />

      {/* Fecha de Nacimiento */}
      <Text
        style={{
          fontSize: 12,
          fontWeight: '600',
          color: c.muted,
          marginBottom: 4,
          textTransform: 'uppercase',
          letterSpacing: 0.04,
        }}
      >
        Fecha de Nacimiento *
      </Text>
      <TouchableOpacity
        onPress={() => onOpenDatePicker(fechaNacimiento)}
        activeOpacity={0.7}
        style={{
          marginBottom: 14,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: c.border,
          backgroundColor: c.inputBg,
          paddingHorizontal: 16,
          paddingVertical: 14,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <MaterialCommunityIcons
          name="calendar"
          size={20}
          color={c.muted}
          style={{ marginRight: 10 }}
        />
        <Text
          style={{
            fontSize: 16,
            color: fechaNacimiento ? c.inputText : c.placeholderColor,
          }}
        >
          {fechaNacimiento || 'AAAA-MM-DD'}
        </Text>
      </TouchableOpacity>

      {/* Género */}
      <Text
        style={{
          fontSize: 12,
          fontWeight: '600',
          color: c.muted,
          marginBottom: 8,
          textTransform: 'uppercase',
          letterSpacing: 0.04,
        }}
      >
        Género *
      </Text>
      <View style={{ marginBottom: 14, alignItems: 'flex-start' }}>
        <SegmentedButtons
          value={sexo}
          onValueChange={(val) => onSexoChange(val as 'M' | 'F' | 'O')}
          buttons={[
            { value: 'M', label: 'Masculino' },
            { value: 'F', label: 'Femenino' },
            { value: 'O', label: 'Otro' },
          ]}
          theme={{
            colors: {
              secondaryContainer: c.accentBg,
              onSecondaryContainer: c.brand,
              outline: c.border,
            },
          }}
        />
      </View>

      <FormField
        label="Dirección"
        value={domicilio}
        onChangeText={(val) => onDomicilioChange(cleanAddress(val))}
        placeholder="Calle, número, colonia"
        maxLength={255}
        required
        colors={c}
      />

      <CatalogSelector
        label="Municipio"
        icon="map-marker-radius-outline"
        value={selectedMunicipioNombre}
        placeholder="Seleccionar Municipio"
        isLoading={isLoadingMunicipios}
        error={errorMunicipios}
        onPress={onOpenMunicipioDialog}
        onRetry={() => void onRetryMunicipios()}
        colors={c}
      />

      <CatalogSelector
        label="Localidad"
        icon="city-variant-outline"
        value={localidadNombre}
        placeholder="Seleccionar Localidad"
        isLoading={isLoadingLocalidades}
        error={selectedMunicipioId ? errorLocalidades : null}
        onPress={() => {
          if (!selectedMunicipioId) {
            onSetError('Selecciona primero un municipio.');
            return;
          }
          onOpenLocalidadDialog();
        }}
        onRetry={() => void onRetryLocalidades()}
        disabled={!selectedMunicipioId}
        colors={c}
      />

      {/* Botones */}
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
        <Button
          mode="outlined"
          onPress={onCancel}
          textColor={c.muted}
          style={{ flex: 1, borderRadius: 12 }}
          contentStyle={{ paddingVertical: 8 }}
        >
          Cancelar
        </Button>
        <Button
          mode="contained"
          onPress={onSave}
          loading={isSubmitting}
          disabled={isSubmitting}
          buttonColor={c.brand}
          textColor={c.white}
          style={{ flex: 1, borderRadius: 12 }}
          contentStyle={{ paddingVertical: 8 }}
        >
          Guardar
        </Button>
      </View>
    </>
  );
}
