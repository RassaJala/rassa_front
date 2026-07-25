import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, Dialog, Portal } from 'react-native-paper';

import { BRAND_RED_CORAL } from '@/constants/brandColors';
import type { Localidad, Municipio } from '@/types';

const DIALOG_MAX_HEIGHT = 400;

interface CatalogSelectorProps {
  readonly selectedMunicipioId: number | null;
  readonly selectedMunicipioNombre: string;
  readonly onSelectMunicipio: (id: number, nombre: string) => void;
  readonly localidadId: number | null;
  readonly localidadNombre: string;
  readonly onSelectLocalidad: (id: number, nombre: string) => void;
  readonly municipios: readonly Municipio[];
  readonly localidades: readonly Localidad[];
  readonly isLoadingMunicipios: boolean;
  readonly isLoadingLocalidades: boolean;
  readonly errorMunicipios: string | null;
  readonly errorLocalidades: string | null;
  readonly refetchMunicipios: () => void;
  readonly refetchLocalidades: () => void;
  readonly setErrorMessage: (msg: string | null) => void;
}

interface MunicipioSelectorProps {
  readonly errorMunicipios: string | null;
  readonly isLoadingMunicipios: boolean;
  readonly selectedMunicipioNombre: string;
  readonly refetchMunicipios: () => void;
  readonly onPress: () => void;
}

function MunicipioSelector({
  errorMunicipios,
  isLoadingMunicipios,
  selectedMunicipioNombre,
  refetchMunicipios,
  onPress,
}: MunicipioSelectorProps): React.JSX.Element {
  return (
    <>
      <Text className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
        Municipio *
      </Text>
      {errorMunicipios ? (
        <View className="mb-3 flex-row items-center justify-between rounded-xl border border-red-300 bg-red-50 px-4 py-2 dark:border-red-900/50 dark:bg-red-950/20">
          <Text className="text-sm text-red-600 dark:text-red-400">
            {errorMunicipios !== 'API Error'
              ? errorMunicipios
              : 'Error al cargar municipios'}
          </Text>
          <TouchableOpacity onPress={() => void refetchMunicipios()}>
            <Text className="font-semibold text-red-700 dark:text-red-300">
              Reintentar
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          onPress={onPress}
          disabled={isLoadingMunicipios}
          className="dark:bg-gray-955 mb-3 rounded-xl border border-gray-300 bg-white px-4 py-3 dark:border-gray-800"
        >
          {isLoadingMunicipios ? (
            <ActivityIndicator
              testID="loading-municipios"
              size="small"
              color={BRAND_RED_CORAL}
            />
          ) : (
            <Text
              className={`text-base ${
                selectedMunicipioNombre
                  ? 'text-brand-ink dark:text-gray-100'
                  : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              {selectedMunicipioNombre || 'Seleccionar Municipio'}
            </Text>
          )}
        </TouchableOpacity>
      )}
    </>
  );
}

interface LocalidadSelectorProps {
  readonly selectedMunicipioId: number | null;
  readonly errorLocalidades: string | null;
  readonly isLoadingLocalidades: boolean;
  readonly localidadNombre: string;
  readonly refetchLocalidades: () => void;
  readonly onPress: () => void;
}

function LocalidadSelector({
  selectedMunicipioId,
  errorLocalidades,
  isLoadingLocalidades,
  localidadNombre,
  refetchLocalidades,
  onPress,
}: LocalidadSelectorProps): React.JSX.Element {
  return (
    <>
      <Text className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
        Localidad *
      </Text>
      {selectedMunicipioId && errorLocalidades ? (
        <View className="mb-4 flex-row items-center justify-between rounded-xl border border-red-300 bg-red-50 px-4 py-2 dark:border-red-900/50 dark:bg-red-950/20">
          <Text className="text-sm text-red-600 dark:text-red-400">
            {errorLocalidades !== 'API Error'
              ? errorLocalidades
              : 'Error al cargar localidades'}
          </Text>
          <TouchableOpacity onPress={() => void refetchLocalidades()}>
            <Text className="font-semibold text-red-700 dark:text-red-300">
              Reintentar
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          onPress={onPress}
          disabled={isLoadingLocalidades}
          className="mb-4 rounded-xl border border-gray-300 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900"
        >
          {isLoadingLocalidades ? (
            <ActivityIndicator
              testID="loading-localidades"
              size="small"
              color={BRAND_RED_CORAL}
            />
          ) : (
            <Text
              className={`text-base ${
                localidadNombre
                  ? 'text-brand-ink dark:text-gray-100'
                  : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              {localidadNombre || 'Seleccionar Localidad'}
            </Text>
          )}
        </TouchableOpacity>
      )}
    </>
  );
}

export default function CatalogSelector({
  selectedMunicipioId,
  selectedMunicipioNombre,
  onSelectMunicipio,
  localidadId: _localidadId,
  localidadNombre,
  onSelectLocalidad,
  municipios,
  localidades,
  isLoadingMunicipios,
  isLoadingLocalidades,
  errorMunicipios,
  errorLocalidades,
  refetchMunicipios,
  refetchLocalidades,
  setErrorMessage,
}: CatalogSelectorProps): React.JSX.Element {
  const [showMunicipioDialog, setShowMunicipioDialog] = useState(false);
  const [showLocalidadDialog, setShowLocalidadDialog] = useState(false);

  return (
    <View>
      <MunicipioSelector
        errorMunicipios={errorMunicipios}
        isLoadingMunicipios={isLoadingMunicipios}
        selectedMunicipioNombre={selectedMunicipioNombre}
        refetchMunicipios={refetchMunicipios}
        onPress={() => setShowMunicipioDialog(true)}
      />

      <LocalidadSelector
        selectedMunicipioId={selectedMunicipioId}
        errorLocalidades={errorLocalidades}
        isLoadingLocalidades={isLoadingLocalidades}
        localidadNombre={localidadNombre}
        refetchLocalidades={refetchLocalidades}
        onPress={() => {
          if (!selectedMunicipioId) {
            setErrorMessage('Selecciona primero un municipio.');
            return;
          }
          setShowLocalidadDialog(true);
        }}
      />

      <Portal>
        <Dialog
          visible={showMunicipioDialog}
          onDismiss={() => setShowMunicipioDialog(false)}
          style={{ maxHeight: DIALOG_MAX_HEIGHT }}
        >
          <Dialog.Title>Seleccionar Municipio</Dialog.Title>
          <Dialog.Content>
            <FlatList
              data={municipios}
              keyExtractor={(item) => String(item.id_municipio)}
              style={{ maxHeight: 300 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    onSelectMunicipio(item.id_municipio, item.nombre);
                    setShowMunicipioDialog(false);
                  }}
                  className="border-b border-gray-100 py-4 dark:border-gray-800"
                >
                  <Text className="text-base text-brand-ink dark:text-gray-200">
                    {item.nombre}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowMunicipioDialog(false)}>
              Cerrar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Portal>
        <Dialog
          visible={showLocalidadDialog}
          onDismiss={() => setShowLocalidadDialog(false)}
          style={{ maxHeight: DIALOG_MAX_HEIGHT }}
        >
          <Dialog.Title>Seleccionar Localidad</Dialog.Title>
          <Dialog.Content>
            <FlatList
              data={localidades}
              keyExtractor={(item) => String(item.id_localidad)}
              style={{ maxHeight: 300 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    onSelectLocalidad(item.id_localidad, item.nombre);
                    setShowLocalidadDialog(false);
                  }}
                  className="border-b border-gray-100 py-4 dark:border-gray-800"
                >
                  <Text className="text-base text-brand-ink dark:text-gray-200">
                    {item.nombre}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowLocalidadDialog(false)}>
              Cerrar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}
