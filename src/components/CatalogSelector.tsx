import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, Dialog } from 'react-native-paper';

import { BRAND_RED_CORAL } from '@/constants/brandColors';
import type { Localidad, Municipio } from '@/types';

interface CatalogSelectorProps {
  readonly selectedMunicipioId: number | null;
  readonly selectedMunicipioNombre: string;
  readonly onSelectMunicipio: (id: number, nombre: string) => void;
  readonly localidadId: number | null;
  readonly localidadNombre: string;
  readonly onSelectLocalidad: (id: number, nombre: string) => void;
  readonly municipios: Municipio[];
  readonly localidades: Localidad[];
  readonly isLoadingMunicipios: boolean;
  readonly isLoadingLocalidades: boolean;
  readonly errorMunicipios: string | null;
  readonly errorLocalidades: string | null;
  readonly refetchMunicipios: () => void;
  readonly refetchLocalidades: () => void;
  readonly setErrorMessage: (msg: string | null) => void;
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
      {/* Selector de Municipio */}
      <Text className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
        Municipio *
      </Text>
      {errorMunicipios ? (
        <View className="mb-3 flex-row items-center justify-between rounded-xl border border-red-300 bg-red-50 px-4 py-2 dark:border-red-900/50 dark:bg-red-950/20">
          <Text className="text-sm text-red-600 dark:text-red-400">
            Error al cargar municipios
          </Text>
          <TouchableOpacity onPress={() => void refetchMunicipios()}>
            <Text className="font-semibold text-red-700 dark:text-red-300">
              Reintentar
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          onPress={() => setShowMunicipioDialog(true)}
          disabled={isLoadingMunicipios}
          className="mb-3 rounded-xl border border-gray-300 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900"
        >
          {isLoadingMunicipios ? (
            <ActivityIndicator size="small" color={BRAND_RED_CORAL} />
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

      {/* Selector de Localidad */}
      <Text className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
        Localidad *
      </Text>
      {selectedMunicipioId && errorLocalidades ? (
        <View className="mb-4 flex-row items-center justify-between rounded-xl border border-red-300 bg-red-50 px-4 py-2 dark:border-red-900/50 dark:bg-red-950/20">
          <Text className="text-sm text-red-600 dark:text-red-400">
            No se pudieron cargar
          </Text>
          <TouchableOpacity onPress={() => void refetchLocalidades()}>
            <Text className="font-semibold text-red-700 dark:text-red-300">
              Reintentar
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          onPress={() => {
            if (!selectedMunicipioId) {
              setErrorMessage('Selecciona primero un municipio.');
              return;
            }
            setShowLocalidadDialog(true);
          }}
          disabled={isLoadingLocalidades}
          className="mb-4 rounded-xl border border-gray-300 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900"
        >
          {isLoadingLocalidades ? (
            <ActivityIndicator size="small" color={BRAND_RED_CORAL} />
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

      {/* Dialog Municipio */}
      <Dialog
        visible={showMunicipioDialog}
        onDismiss={() => setShowMunicipioDialog(false)}
      >
        <Dialog.Title>Seleccionar Municipio</Dialog.Title>
        <Dialog.Content>
          <FlatList
            data={municipios}
            keyExtractor={(item) => String(item.id_municipio)}
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
          <Button onPress={() => setShowMunicipioDialog(false)}>Cerrar</Button>
        </Dialog.Actions>
      </Dialog>

      {/* Dialog Localidad */}
      <Dialog
        visible={showLocalidadDialog}
        onDismiss={() => setShowLocalidadDialog(false)}
      >
        <Dialog.Title>Seleccionar Localidad</Dialog.Title>
        <Dialog.Content>
          <FlatList
            data={localidades}
            keyExtractor={(item) => String(item.id_localidad)}
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
          <Button onPress={() => setShowLocalidadDialog(false)}>Cerrar</Button>
        </Dialog.Actions>
      </Dialog>
    </View>
  );
}
