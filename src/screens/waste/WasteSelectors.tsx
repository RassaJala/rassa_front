import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { formatEstado } from '@/common/wasteRegister';
import { colors } from '@/constants/colors';
import type { ThemeColors } from '@/constants/colors';
import type { Order } from '@/types';
import type { PublishedProduct, WasteDecisionOption } from '@/types/waste';

// Shared field label/error text styles: defined once, imported by the screen
// and the three selector components (PedidoSelector, DecisionSelector,
// ProductSelector) so a style change touches a single place.
export const labelStyle = {
  fontSize: 13,
  fontWeight: '600',
  marginBottom: 6,
} as const;

export const errorStyle = {
  fontSize: 12,
  marginTop: 4,
} as const;

interface PedidoSelectorProps {
  readonly selected: Order | null;
  readonly error: string | undefined;
  readonly t: ThemeColors;
  readonly coral: string;
  readonly onPress: () => void;
}

export function PedidoSelector({
  selected,
  error,
  t,
  coral,
  onPress,
}: PedidoSelectorProps): React.JSX.Element {
  return (
    <>
      <Text style={[labelStyle, { marginTop: 24, color: t.fg }]}>Pedido *</Text>
      <Pressable
        onPress={onPress}
        style={{
          borderRadius: 12,
          borderWidth: 1,
          borderColor: error ? coral : t.border,
          backgroundColor: t.input,
          paddingHorizontal: 16,
          paddingVertical: 14,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {selected ? (
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: t.fg }}>
              Pedido #{selected.id_pedido} ·{' '}
              {selected.cliente_nombre ?? 'Cliente'}
            </Text>
            <Text style={{ fontSize: 12, color: t.muted, marginTop: 2 }}>
              Total: ${selected.total} · {formatEstado(selected.estado_actual)}
            </Text>
          </View>
        ) : (
          <Text style={{ fontSize: 15, color: t.muted }}>Elige un pedido…</Text>
        )}
        <MaterialCommunityIcons name="chevron-down" size={20} color={t.muted} />
      </Pressable>
      {error ? (
        <Text style={[errorStyle, { color: coral }]}>{error}</Text>
      ) : null}
    </>
  );
}

interface DecisionSelectorProps {
  readonly selected: WasteDecisionOption | null;
  readonly error: string | undefined;
  readonly t: ThemeColors;
  readonly coral: string;
  readonly onPress: () => void;
}

export function DecisionSelector({
  selected,
  error,
  t,
  coral,
  onPress,
}: DecisionSelectorProps): React.JSX.Element {
  return (
    <>
      <Text style={[labelStyle, { marginTop: 16, color: t.fg }]}>
        Decisión *
      </Text>
      <Pressable
        onPress={onPress}
        style={{
          borderRadius: 12,
          borderWidth: 1,
          borderColor: error ? coral : t.border,
          backgroundColor: t.input,
          paddingHorizontal: 16,
          paddingVertical: 14,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text
          style={{
            flex: 1,
            fontSize: 15,
            color: selected ? t.fg : t.muted,
          }}
        >
          {selected ? selected.decision : 'Elige una decisión…'}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={20} color={t.muted} />
      </Pressable>
      {error ? (
        <Text style={[errorStyle, { color: coral }]}>{error}</Text>
      ) : null}
    </>
  );
}

interface ProductSelectorProps {
  readonly selected: PublishedProduct | null;
  readonly error: string | undefined;
  readonly products: readonly PublishedProduct[];
  readonly loading: boolean;
  readonly t: ThemeColors;
  readonly coral: string;
  readonly onPress: () => void;
}

export function ProductSelector({
  selected,
  error,
  products,
  loading,
  t,
  coral,
  onPress,
}: ProductSelectorProps): React.JSX.Element {
  return (
    <>
      <Text style={[labelStyle, { marginTop: 16, color: t.fg }]}>
        Producto publicado *
      </Text>
      <Pressable
        onPress={onPress}
        style={{
          borderRadius: 12,
          borderWidth: 1,
          borderColor: error ? coral : t.border,
          backgroundColor: t.input,
          paddingHorizontal: 16,
          paddingVertical: 14,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {selected ? (
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: t.fg }}>
              {selected.producto}
            </Text>
            <Text style={{ fontSize: 12, color: t.muted, marginTop: 2 }}>
              Stock: {selected.stock} · {selected.unidad}
            </Text>
          </View>
        ) : (
          <Text style={{ fontSize: 15, color: t.muted }}>
            Elige un producto publicado…
          </Text>
        )}
        <MaterialCommunityIcons name="chevron-down" size={20} color={t.muted} />
      </Pressable>
      {error ? (
        <Text style={[errorStyle, { color: coral }]}>{error}</Text>
      ) : null}
      <ProductEmptyNotice
        products={products}
        loading={loading}
        inputBg={t.input}
        borderColor={t.border}
        muted={t.muted}
      />
    </>
  );
}

interface ProductEmptyNoticeProps {
  readonly products: readonly PublishedProduct[];
  readonly loading: boolean;
  readonly inputBg: string;
  readonly borderColor: string;
  readonly muted: string;
}

function ProductEmptyNotice({
  products,
  loading,
  inputBg,
  borderColor,
  muted,
}: ProductEmptyNoticeProps): React.JSX.Element | null {
  if (loading || products.length > 0) return null;
  return (
    <View
      style={{
        marginTop: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: inputBg,
        borderRadius: 10,
        borderWidth: 1,
        borderColor,
        paddingHorizontal: 12,
        paddingVertical: 10,
      }}
    >
      <MaterialCommunityIcons
        name="alert-circle-outline"
        size={16}
        color={colors.accent}
      />
      <Text style={{ fontSize: 13, color: muted, flex: 1 }}>
        No hay publicaciones activas esta semana. Publica un producto para poder
        registrar mermas.
      </Text>
    </View>
  );
}
