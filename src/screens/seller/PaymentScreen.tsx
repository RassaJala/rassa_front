import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { colors } from '@/constants/colors';
import api from '@/services/api';
import { createPago, fetchTiposPago } from '@/services/payments';
import { useTheme } from '@/store/ThemeContext';
import type { OrderDetail, SellerStackParamList, TipoPago } from '@/types';
import { extractApiError } from '@/utils/apiErrors';

// ── Types ──────────────────────────────────────────────────

type Nav = NativeStackNavigationProp<SellerStackParamList, 'Payment'>;
type Route = RouteProp<SellerStackParamList, 'Payment'>;

// ── Helpers ────────────────────────────────────────────────

function PaymentMethodOption({
  tipo,
  selected,
  onSelect,
  brand,
  border,
  muted,
  fg,
  activeBg,
  tiposCount,
}: {
  readonly tipo: TipoPago;
  readonly selected: boolean;
  readonly onSelect: () => void;
  readonly brand: string;
  readonly border: string;
  readonly muted: string;
  readonly fg: string;
  readonly activeBg: string;
  readonly tiposCount: number;
}): React.JSX.Element {
  return (
    <Pressable
      onPress={onSelect}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 12,
        backgroundColor: selected ? activeBg : colors.transparent,
        marginBottom: tiposCount > 1 ? 8 : 0,
      }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: 2,
          borderColor: selected ? brand : border,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 14,
        }}
      >
        {selected ? (
          <View
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: brand,
            }}
          />
        ) : null}
      </View>
      <MaterialCommunityIcons
        name={tipo.nombre === 'Efectivo' ? 'cash' : 'bank-transfer'}
        size={22}
        color={selected ? brand : muted}
      />
      <Text
        style={{
          fontSize: 16,
          fontWeight: selected ? '700' : '500',
          color: selected ? brand : fg,
          marginLeft: 12,
          flex: 1,
        }}
      >
        {tipo.nombre}
      </Text>
    </Pressable>
  );
}

// ── Component ──────────────────────────────────────────────

export default function PaymentScreen(): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const queryClient = useQueryClient();
  const { orderId } = route.params;

  const bg = isDark ? colors.admBgD : colors.admBgL;
  const fg = isDark ? colors.admFgD : colors.admFgL;
  const muted = isDark ? colors.admMutedD : colors.admMutedL;
  const border = isDark ? colors.admBorderD : colors.admBorderL;
  const brand = isDark ? colors.admBrandD : colors.admBrandL;
  const surface = isDark ? colors.admSurfaceD : colors.admSurfaceL;
  const activeBg = isDark ? colors.admActiveBgD : colors.admActiveBgL;
  const white = colors.iconWhite;
  const error = colors.error;

  const [selectedTipo, setSelectedTipo] = useState<number | null>(null);
  const [referencia, setReferencia] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Fetch order detail
  const {
    data: order,
    isLoading: orderLoading,
    isError: orderError,
    refetch: refetchOrder,
  } = useQuery<OrderDetail>({
    queryKey: ['pedido', orderId],
    queryFn: async () => {
      const res = await api.get<OrderDetail>(`/pedidos/${orderId}/`);
      return res.data;
    },
  });

  // Fetch payment types
  const { data: tiposPago = [], isLoading: tiposLoading } = useQuery({
    queryKey: ['tipos-pago'],
    queryFn: fetchTiposPago,
  });

  const pagoMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTipo || !order) throw new Error('Datos incompletos');
      const trimmedRef = referencia.trim();
      return createPago({
        pedido: orderId,
        tipo_pago: selectedTipo,
        monto: order.total,
        ...(trimmedRef ? { referencia: trimmedRef } : {}),
      });
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      void queryClient.invalidateQueries({ queryKey: ['pedido', orderId] });
      navigation.replace('Receipt', { paymentId: data.id_pago });
    },
    onError: (error: unknown) => {
      const detail = extractApiError(error, ['pedido', 'tipo_pago', 'monto', 'referencia']);
      Alert.alert('Error', detail);
    },
  });

  const isLoading = orderLoading || tiposLoading;
  const isReady = order?.estado_actual === 'listo_para_retirar';

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={brand} />
      </View>
    );
  }

  if (orderError || !order) {
    return (
      <View style={{ flex: 1, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color={muted} />
        <Text style={{ marginTop: 12, fontSize: 15, color: muted, textAlign: 'center' }}>
          Error al cargar el pedido
        </Text>
        <Pressable
          onPress={() => void refetchOrder()}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: border }}
        >
          <MaterialCommunityIcons name="refresh" size={18} color={brand} />
          <Text style={{ fontSize: 14, fontWeight: '600', color: brand }}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={{ flex: 1, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color={muted} />
        <Text style={{ marginTop: 12, fontSize: 15, color: muted, textAlign: 'center' }}>
          Este pedido no está listo para cobro.{'\n'}Estado actual: {order.estado_actual.replace(/_/g, ' ')}
        </Text>
        <Pressable
          onPress={() => navigation.goBack()}
          style={{ marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: border }}
        >
          <Text style={{ fontWeight: '600', color: brand }}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {/* Header */}
      <View style={{ paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: surface, borderWidth: 1, borderColor: border, alignItems: 'center', justifyContent: 'center' }}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={fg} />
        </Pressable>
        <Text style={{ fontSize: 22, fontWeight: '700', color: fg }}>Registrar Pago</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Order info card */}
        <View style={{ backgroundColor: surface, borderRadius: 14, borderWidth: 1, borderColor: border, padding: 16, marginBottom: 20 }}>
          <Text style={{ fontSize: 13, color: muted }}>Pedido #{order.id_pedido}</Text>
          <Text style={{ fontSize: 17, fontWeight: '700', color: fg, marginTop: 2 }}>
            {order.cliente_nombre ?? 'Cliente'}
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
            <Text style={{ fontSize: 14, color: muted }}>Total a cobrar</Text>
            <Text style={{ fontSize: 24, fontWeight: '700', color: brand }}>
              ${Number(order.total).toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Payment method */}
        <Text style={{ fontSize: 16, fontWeight: '700', color: fg, marginBottom: 10 }}>Método de pago</Text>
        <View style={{ backgroundColor: surface, borderRadius: 14, borderWidth: 1, borderColor: fieldErrors.tipo_pago ? error : border, padding: 12, marginBottom: 20 }}>
          {tiposPago.map((tipo) => (
            <PaymentMethodOption
              key={tipo.id_tipo_pago}
              tipo={tipo}
              selected={selectedTipo === tipo.id_tipo_pago}
              onSelect={() => {
                setSelectedTipo(tipo.id_tipo_pago);
                setFieldErrors({});
              }}
              brand={brand}
              border={border}
              muted={muted}
              fg={fg}
              activeBg={activeBg}
              tiposCount={tiposPago.length}
            />
          ))}
          {fieldErrors.tipo_pago ? (
            <Text style={{ fontSize: 13, color: error, marginTop: 6, marginLeft: 4 }}>{fieldErrors.tipo_pago}</Text>
          ) : null}
        </View>

        {/* Reference field */}
        <Text style={{ fontSize: 16, fontWeight: '700', color: fg, marginBottom: 6 }}>
          Referencia <Text style={{ color: muted, fontWeight: '400', fontSize: 13 }}>(opcional)</Text>
        </Text>
        <TextInput
          value={referencia}
          onChangeText={(t) => {
            setReferencia(t);
            setFieldErrors({});
          }}
          placeholder={selectedTipo
            ? (tiposPago.find((t) => t.id_tipo_pago === selectedTipo)?.nombre === 'Transferencia'
              ? 'Número de transferencia'
              : 'Nota o referencia')
            : 'Selecciona un método de pago primero'}
          placeholderTextColor={muted}
          editable={selectedTipo !== null}
          style={{
            backgroundColor: surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: fieldErrors.referencia ? error : border,
            padding: 14,
            fontSize: 15,
            color: fg,
            marginBottom: 24,
            opacity: selectedTipo ? 1 : 0.5,
          }}
        />

        {/* Submit button */}
        <Pressable
          onPress={() => {
            if (!selectedTipo) {
              setFieldErrors({ tipo_pago: 'Selecciona un método de pago' });
              return;
            }
            pagoMutation.mutate();
          }}
          disabled={pagoMutation.isPending || !selectedTipo}
          style={{
            backgroundColor: pagoMutation.isPending ? muted : brand,
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pagoMutation.isPending ? 0.6 : 1,
            flexDirection: 'row',
            gap: 8,
          }}
        >
          {pagoMutation.isPending ? (
            <ActivityIndicator size="small" color={white} />
          ) : (
            <MaterialCommunityIcons name="cash-check" size={22} color={white} />
          )}
          <Text style={{ fontSize: 17, fontWeight: '700', color: white }}>
            {pagoMutation.isPending ? 'Registrando...' : 'Registrar Pago'}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
