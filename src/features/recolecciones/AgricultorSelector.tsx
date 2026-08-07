import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import type {
  AgricultorAgricultorItem,
  AgricultorUbicacion,
} from '@/hooks/useAgricultoresUbicacion';
import { useTheme } from '@/store/ThemeContext';

import { getFullName, recoleccionDuplicateKey } from './utils';

interface AgricultorSelectorProps {
  readonly grupos: readonly AgricultorUbicacion[];
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly truncated: boolean;
  readonly errores: number;
  readonly selectedId: number | null;
  readonly duplicateKeys: ReadonlySet<string>;
  readonly fecha: string;
  readonly onRetry: () => void;
  readonly onSelect: (agricultor: AgricultorAgricultorItem) => void;
}

interface CuerpoAgricultoresProps {
  readonly isDark: boolean;
  readonly grupos: readonly AgricultorUbicacion[];
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly selectedId: number | null;
  readonly duplicateKeys: ReadonlySet<string>;
  readonly fecha: string;
  readonly onRetry: () => void;
  readonly onSelect: (agricultor: AgricultorAgricultorItem) => void;
}

interface FilaAgricultorProps {
  readonly isDark: boolean;
  readonly agricultor: AgricultorAgricultorItem;
  readonly selectedId: number | null;
  readonly duplicateKeys: ReadonlySet<string>;
  readonly fecha: string;
  readonly onSelect: (agricultor: AgricultorAgricultorItem) => void;
}

function NoticeAgricultores({
  isDark,
  truncated,
  errores,
  onRetry,
}: {
  readonly isDark: boolean;
  readonly truncated: boolean;
  readonly errores: number;
  readonly onRetry: () => void;
}): React.JSX.Element | null {
  const muted = isDark ? colors.admMutedD : colors.admMutedL;
  const brand = isDark ? colors.admBrandD : colors.admBrandL;

  if (!truncated && errores === 0) {
    return null;
  }

  const mensaje =
    truncated && errores > 0
      ? 'Solo se muestran los primeros agricultores y algunos no se pudieron cargar.'
      : truncated
        ? 'Solo se muestran los primeros agricultores.'
        : 'Algunos agricultores no se pudieron cargar.';

  return (
    <View
      style={{
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderRadius: 8,
        backgroundColor: isDark ? colors.admPumpkinBgD : colors.admPumpkinBgL,
      }}
    >
      <Text style={{ fontSize: 12, color: muted, textAlign: 'center' }}>
        {mensaje}
      </Text>
      <Pressable onPress={onRetry} style={{ marginTop: 6 }}>
        <Text
          style={{
            fontSize: 13,
            fontWeight: '700',
            color: brand,
            textAlign: 'center',
          }}
        >
          Reintentar
        </Text>
      </Pressable>
    </View>
  );
}

function CuerpoAgricultores({
  isDark,
  grupos,
  isLoading,
  isError,
  selectedId,
  duplicateKeys,
  fecha,
  onRetry,
  onSelect,
}: CuerpoAgricultoresProps): React.JSX.Element {
  const brand = isDark ? colors.admBrandD : colors.admBrandL;
  const muted = isDark ? colors.admMutedD : colors.admMutedL;

  if (isLoading) {
    return (
      <View style={{ paddingVertical: 24, alignItems: 'center' }}>
        <ActivityIndicator size="large" color={brand} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={{ paddingVertical: 24, alignItems: 'center' }}>
        <Text style={{ fontSize: 14, color: muted, textAlign: 'center' }}>
          Error al cargar agricultores.
        </Text>
        <Pressable onPress={onRetry} style={{ marginTop: 12 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: brand }}>
            Reintentar
          </Text>
        </Pressable>
      </View>
    );
  }

  if (grupos.length === 0) {
    return (
      <View style={{ paddingVertical: 24, alignItems: 'center' }}>
        <Text style={{ fontSize: 14, color: muted, textAlign: 'center' }}>
          No se encontraron agricultores.
        </Text>
      </View>
    );
  }

  return (
    <>
      {grupos.map((municipio, idxM) => (
        <View
          key={`${municipio.municipioNombre}-${idxM}`}
          style={{ marginBottom: 6 }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: '800',
              color: brand,
              marginTop: 8,
            }}
          >
            {municipio.municipioNombre}
          </Text>
          {municipio.localidades.map((localidad, idxL) => (
            <View
              key={`${localidad.localidadNombre}-${idxL}`}
              style={{ marginLeft: 8 }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: muted,
                  marginTop: 6,
                }}
              >
                {localidad.localidadNombre}
              </Text>
              {localidad.agricultores.map((a) => (
                <FilaAgricultor
                  key={a.id_usuario}
                  isDark={isDark}
                  agricultor={a}
                  selectedId={selectedId}
                  duplicateKeys={duplicateKeys}
                  fecha={fecha}
                  onSelect={onSelect}
                />
              ))}
            </View>
          ))}
        </View>
      ))}
    </>
  );
}

function FilaAgricultor({
  isDark,
  agricultor,
  selectedId,
  duplicateKeys,
  fecha,
  onSelect,
}: FilaAgricultorProps): React.JSX.Element {
  const activeBg = isDark ? colors.admActiveBgD : colors.admActiveBgL;
  const fg = isDark ? colors.admFgD : colors.admFgL;
  const redCoral = colors.brandRedCoral;
  const selected = selectedId === agricultor.id_usuario;
  const duplicado = duplicateKeys.has(
    recoleccionDuplicateKey(agricultor.id_usuario, fecha),
  );

  return (
    <Pressable
      onPress={() => onSelect(agricultor)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        backgroundColor: selected ? activeBg : colors.transparent,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 9,
        marginTop: 4,
      }}
    >
      <Text
        style={{
          fontSize: 14,
          fontWeight: selected ? '700' : '500',
          color: fg,
          flexShrink: 1,
        }}
      >
        {getFullName(agricultor)}
      </Text>
      {duplicado ? (
        <Text
          style={{
            fontSize: 11,
            fontWeight: '600',
            color: redCoral,
            flexShrink: 0,
          }}
        >
          Ya tiene recolección
        </Text>
      ) : null}
    </Pressable>
  );
}

export default function AgricultorSelector({
  grupos,
  isLoading,
  isError,
  truncated,
  errores,
  selectedId,
  duplicateKeys,
  fecha,
  onRetry,
  onSelect,
}: AgricultorSelectorProps): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';

  return (
    <View
      style={{
        marginTop: 10,
        backgroundColor: isDark ? colors.admSurfaceD : colors.admSurfaceL,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: isDark ? colors.admBorderD : colors.admBorderL,
        padding: 12,
      }}
    >
      <NoticeAgricultores
        isDark={isDark}
        truncated={truncated}
        errores={errores}
        onRetry={onRetry}
      />
      <CuerpoAgricultores
        isDark={isDark}
        grupos={grupos}
        isLoading={isLoading}
        isError={isError}
        selectedId={selectedId}
        duplicateKeys={duplicateKeys}
        fecha={fecha}
        onRetry={onRetry}
        onSelect={onSelect}
      />
    </View>
  );
}
