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

const DIALOG_MAX_HEIGHT = 400;

export interface CatalogColors {
  readonly muted: string;
  readonly border: string;
  readonly surface: string;
  readonly fg: string;
  readonly errorBg: string;
  readonly errorBorder: string;
  readonly errorText: string;
  readonly errorAction: string;
}

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
  readonly catalogColors: CatalogColors;
}

interface MunicipioSelectorProps {
  readonly errorMunicipios: string | null;
  readonly isLoadingMunicipios: boolean;
  readonly selectedMunicipioNombre: string;
  readonly refetchMunicipios: () => void;
  readonly onPress: () => void;
  readonly catalogColors: CatalogColors;
}

function MunicipioSelector({
  errorMunicipios,
  isLoadingMunicipios,
  selectedMunicipioNombre,
  refetchMunicipios,
  onPress,
  catalogColors,
}: MunicipioSelectorProps): React.JSX.Element {
  const c = catalogColors;
  return (
    <>
      <Text
        style={{
          marginBottom: 4,
          fontSize: 14,
          fontWeight: '500',
          color: c.muted,
        }}
      >
        Municipio *
      </Text>
      {errorMunicipios ? (
        <View
          style={{
            marginBottom: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: c.errorBorder,
            backgroundColor: c.errorBg,
            paddingHorizontal: 16,
            paddingVertical: 8,
          }}
        >
          <Text style={{ fontSize: 14, color: c.errorText }}>
            {errorMunicipios !== 'API Error'
              ? errorMunicipios
              : 'Error al cargar municipios'}
          </Text>
          <TouchableOpacity onPress={() => void refetchMunicipios()}>
            <Text style={{ fontWeight: '600', color: c.errorAction }}>
              Reintentar
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          onPress={onPress}
          disabled={isLoadingMunicipios}
          style={{
            marginBottom: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: c.border,
            backgroundColor: c.surface,
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}
        >
          {isLoadingMunicipios ? (
            <ActivityIndicator
              testID="loading-municipios"
              size="small"
              color={colors.brand.redCoral}
            />
          ) : (
            <Text
              style={{
                fontSize: 16,
                color: selectedMunicipioNombre ? c.fg : c.muted,
              }}
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
  readonly catalogColors: CatalogColors;
}

function LocalidadSelector({
  selectedMunicipioId,
  errorLocalidades,
  isLoadingLocalidades,
  localidadNombre,
  refetchLocalidades,
  onPress,
  catalogColors,
}: LocalidadSelectorProps): React.JSX.Element {
  const c = catalogColors;
  return (
    <>
      <Text
        style={{
          marginBottom: 4,
          fontSize: 14,
          fontWeight: '500',
          color: c.muted,
        }}
      >
        Localidad *
      </Text>
      {selectedMunicipioId && errorLocalidades ? (
        <View
          style={{
            marginBottom: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: c.errorBorder,
            backgroundColor: c.errorBg,
            paddingHorizontal: 16,
            paddingVertical: 8,
          }}
        >
          <Text style={{ fontSize: 14, color: c.errorText }}>
            {errorLocalidades !== 'API Error'
              ? errorLocalidades
              : 'Error al cargar localidades'}
          </Text>
          <TouchableOpacity onPress={() => void refetchLocalidades()}>
            <Text style={{ fontWeight: '600', color: c.errorAction }}>
              Reintentar
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          onPress={onPress}
          disabled={isLoadingLocalidades}
          style={{
            marginBottom: 16,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: c.border,
            backgroundColor: c.surface,
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}
        >
          {isLoadingLocalidades ? (
            <ActivityIndicator
              testID="loading-localidades"
              size="small"
              color={colors.brand.redCoral}
            />
          ) : (
            <Text
              style={{
                fontSize: 16,
                color: localidadNombre ? c.fg : c.muted,
              }}
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
  catalogColors,
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
        catalogColors={catalogColors}
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
        catalogColors={catalogColors}
      />

      <Modal
        visible={showMunicipioDialog}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMunicipioDialog(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: colors.modalOverlayBg,
            justifyContent: 'center',
            padding: 32,
          }}
          onPress={() => setShowMunicipioDialog(false)}
        >
          <Pressable
            style={{
              backgroundColor: catalogColors.surface,
              borderRadius: 12,
              maxHeight: DIALOG_MAX_HEIGHT,
              overflow: 'hidden',
            }}
            onPress={() => {}}
          >
            <View
              style={{
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: catalogColors.border,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '700',
                  color: catalogColors.fg,
                }}
              >
                Seleccionar Municipio
              </Text>
            </View>
            <FlatList
              data={municipios}
              keyExtractor={(item) => String(item.id_municipio)}
              style={{ maxHeight: DIALOG_MAX_HEIGHT - 100 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    onSelectMunicipio(item.id_municipio, item.nombre);
                    setShowMunicipioDialog(false);
                  }}
                  style={{
                    borderBottomWidth: 1,
                    borderBottomColor: catalogColors.border,
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                  }}
                >
                  <Text style={{ fontSize: 15, color: catalogColors.fg }}>
                    {item.nombre}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <View
              style={{
                padding: 10,
                alignItems: 'flex-end',
                borderTopWidth: 1,
                borderTopColor: catalogColors.border,
              }}
            >
              <TouchableOpacity onPress={() => setShowMunicipioDialog(false)}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: catalogColors.errorAction,
                  }}
                >
                  Cerrar
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showLocalidadDialog}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLocalidadDialog(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: colors.modalOverlayBg,
            justifyContent: 'center',
            padding: 32,
          }}
          onPress={() => setShowLocalidadDialog(false)}
        >
          <Pressable
            style={{
              backgroundColor: catalogColors.surface,
              borderRadius: 12,
              maxHeight: DIALOG_MAX_HEIGHT,
              overflow: 'hidden',
            }}
            onPress={() => {}}
          >
            <View
              style={{
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: catalogColors.border,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '700',
                  color: catalogColors.fg,
                }}
              >
                Seleccionar Localidad
              </Text>
            </View>
            <FlatList
              data={localidades}
              keyExtractor={(item) => String(item.id_localidad)}
              style={{ maxHeight: DIALOG_MAX_HEIGHT - 100 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    onSelectLocalidad(item.id_localidad, item.nombre);
                    setShowLocalidadDialog(false);
                  }}
                  style={{
                    borderBottomWidth: 1,
                    borderBottomColor: catalogColors.border,
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                  }}
                >
                  <Text style={{ fontSize: 15, color: catalogColors.fg }}>
                    {item.nombre}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <View
              style={{
                padding: 10,
                alignItems: 'flex-end',
                borderTopWidth: 1,
                borderTopColor: catalogColors.border,
              }}
            >
              <TouchableOpacity onPress={() => setShowLocalidadDialog(false)}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: catalogColors.errorAction,
                  }}
                >
                  Cerrar
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
