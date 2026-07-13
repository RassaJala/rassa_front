import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { colors } from '@/constants/colors';
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
  const [showMunicipioModal, setShowMunicipioModal] = useState(false);
  const [showLocalidadModal, setShowLocalidadModal] = useState(false);

  return (
    <View>
      {/* Selector de Municipio */}
      <Text className="mb-1 text-sm font-medium text-slate-700">
        Municipio *
      </Text>
      {errorMunicipios ? (
        <View className="mb-3 flex-row items-center justify-between rounded-xl border border-red-300 bg-red-50 px-4 py-2">
          <Text className="text-sm text-red-600">
            Error al cargar municipios
          </Text>
          <TouchableOpacity onPress={() => void refetchMunicipios()}>
            <Text className="font-semibold text-red-700">Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          onPress={() => setShowMunicipioModal(true)}
          disabled={isLoadingMunicipios}
          className="mb-3 rounded-xl border border-slate-300 bg-white px-4 py-3"
        >
          {isLoadingMunicipios ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text
              className={`text-base ${
                selectedMunicipioNombre ? 'text-slate-900' : 'text-slate-400'
              }`}
            >
              {selectedMunicipioNombre || 'Seleccionar Municipio'}
            </Text>
          )}
        </TouchableOpacity>
      )}

      {/* Selector de Localidad */}
      <Text className="mb-1 text-sm font-medium text-slate-700">
        Localidad *
      </Text>
      {selectedMunicipioId && errorLocalidades ? (
        <View className="mb-4 flex-row items-center justify-between rounded-xl border border-red-300 bg-red-50 px-4 py-2">
          <Text className="text-sm text-red-600">No se pudieron cargar</Text>
          <TouchableOpacity onPress={() => void refetchLocalidades()}>
            <Text className="font-semibold text-red-700">Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          onPress={() => {
            if (!selectedMunicipioId) {
              setErrorMessage('Selecciona primero un municipio.');
              return;
            }
            setShowLocalidadModal(true);
          }}
          disabled={isLoadingLocalidades}
          className="mb-4 rounded-xl border border-slate-300 bg-white px-4 py-3"
        >
          {isLoadingLocalidades ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text
              className={`text-base ${
                localidadNombre ? 'text-slate-900' : 'text-slate-400'
              }`}
            >
              {localidadNombre || 'Seleccionar Localidad'}
            </Text>
          )}
        </TouchableOpacity>
      )}

      {/* Modal Municipio */}
      <Modal visible={showMunicipioModal} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/50">
          <View className="h-2/3 rounded-t-3xl bg-white p-6">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-slate-900">
                Seleccionar Municipio
              </Text>
              <Pressable onPress={() => setShowMunicipioModal(false)}>
                <Text className="font-semibold text-emerald-600">Cerrar</Text>
              </Pressable>
            </View>

            <FlatList
              data={municipios}
              keyExtractor={(item) => String(item.id_municipio)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    onSelectMunicipio(item.id_municipio, item.nombre);
                    setShowMunicipioModal(false);
                  }}
                  className="border-b border-slate-100 py-4"
                >
                  <Text className="text-base text-slate-800">
                    {item.nombre}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Modal Localidad */}
      <Modal visible={showLocalidadModal} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/50">
          <View className="h-2/3 rounded-t-3xl bg-white p-6">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-slate-900">
                Seleccionar Localidad
              </Text>
              <Pressable onPress={() => setShowLocalidadModal(false)}>
                <Text className="font-semibold text-emerald-600">Cerrar</Text>
              </Pressable>
            </View>

            <FlatList
              data={localidades}
              keyExtractor={(item) => String(item.id_localidad)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    onSelectLocalidad(item.id_localidad, item.nombre);
                    setShowLocalidadModal(false);
                  }}
                  className="border-b border-slate-100 py-4"
                >
                  <Text className="text-base text-slate-800">
                    {item.nombre}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
