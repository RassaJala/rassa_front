/* global window */
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
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

import Toast from '@/components/Toast';
import { colors } from '@/constants/colors';
import api from '@/services/api';
import { getPaymentTypes, registerPayment } from '@/services/payments';
import { useTheme } from '@/store/ThemeContext';
import type {
  OrderDetail,
  PaymentMethod,
  PaymentPayload,
  SellerStackParamList,
} from '@/types';
import { extractApiError } from '@/utils/apiError';

type Nav = NativeStackNavigationProp<SellerStackParamList, 'Payment'>;
type Route = RouteProp<SellerStackParamList, 'Payment'>;

const METODOS_PAGO: { label: string; value: PaymentMethod }[] = [
  { label: 'Efectivo', value: 'efectivo' },
  { label: 'Tarjeta', value: 'tarjeta' },
  { label: 'Transferencia', value: 'transferencia' },
  { label: 'Otros', value: 'otros' },
];

function formatearFecha(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function PaymentScreen(): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { orderId } = route.params;
  const queryClient = useQueryClient();

  const bg = isDark ? colors.admBgD : colors.admBgL;
  const fg = isDark ? colors.admFgD : colors.admFgL;
  const muted = isDark ? colors.admMutedD : colors.admMutedL;
  const border = isDark ? colors.admBorderD : colors.admBorderL;
  const brand = isDark ? colors.admBrandD : colors.admBrandL;
  const surface = isDark ? colors.admSurfaceD : colors.admSurfaceL;
  const white = colors.iconWhite;

  const [monto, setMonto] = useState('');
  const [metodo, setMetodo] = useState<PaymentMethod>('efectivo');
  const [tipoPagoId, setTipoPagoId] = useState<number | null>(null);
  const [referencia, setReferencia] = useState('');
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({ visible: false, message: '', type: 'info' });

  const { data: order, isLoading: orderLoading } = useQuery<OrderDetail>({
    queryKey: ['pedido', orderId],
    queryFn: async () => {
      const response = await api.get<OrderDetail>(`/pedidos/${orderId}/`);
      return response.data;
    },
    enabled: orderId > 0,
  });

  const { data: tiposPago = [], isLoading: tiposLoading } = useQuery({
    queryKey: ['tipos-pago'],
    queryFn: getPaymentTypes,
  });

  const isReady = order?.estado_actual === 'listo_para_retirar';
  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info') => {
      setToast({ visible: true, message, type });
    },
    [],
  );

  const paymentMutation = useMutation({
    mutationFn: registerPayment,
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      showToast('Pago registrado correctamente', 'success');
      navigation.replace('Receipt', { paymentId: data.id_pago });
    },
    onError: (error: unknown) => {
      const detail = extractApiError(error, ['monto', 'metodo_pago', 'pedido']);
      showToast(detail, 'error');
    },
  });

  // ponytail: usamos el primer tipo de pago como default si no se seleccionó
  const selectedTipoPago = tipoPagoId ?? tiposPago[0]?.id_tipo_pago ?? 0;

  const handleSubmit = useCallback(() => {
    if (!monto || Number.parseFloat(monto) <= 0) {
      showToast('Ingresa un monto válido', 'error');
      return;
    }

    const confirmMsg = `¿Registrar pago de $${Number.parseFloat(monto).toFixed(2)} para el pedido #${orderId}?`;

    if (Platform.OS === 'web') {
      if (!window.confirm(confirmMsg)) return;
    }
    // ponytail: nativeAlert no necesario hasta que alguien lo pida en mobile

    const payload: PaymentPayload = {
      pedido: orderId,
      tipo_pago: selectedTipoPago,
      monto,
      metodo_pago: metodo,
    };
    if (referencia.trim()) {
      payload.referencia = referencia.trim();
    }
    paymentMutation.mutate(payload);
  }, [
    monto,
    metodo,
    selectedTipoPago,
    referencia,
    orderId,
    paymentMutation,
    showToast,
  ]);

  if (orderLoading || tiposLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator size="large" color={brand} />
      </View>
    );
  }

  if (!order) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 15, color: muted }}>Pedido no encontrado</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <View
        style={{
          paddingTop: 60,
          paddingHorizontal: 20,
          paddingBottom: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: surface,
            borderWidth: 1,
            borderColor: border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={fg} />
        </Pressable>
        <Text style={{ fontSize: 22, fontWeight: '700', color: fg }}>
          Registrar Pago
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Orden info */}
        <View
          style={{
            backgroundColor: surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: border,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between' }}
          >
            <View>
              <Text style={{ fontSize: 13, color: muted }}>Pedido</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: fg }}>
                #{order.id_pedido}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 13, color: muted }}>Total</Text>
              <Text style={{ fontSize: 18, fontWeight: '700', color: fg }}>
                ${Number.parseFloat(order.total).toFixed(2)}
              </Text>
            </View>
          </View>
          <Text style={{ fontSize: 13, color: muted, marginTop: 4 }}>
            {formatearFecha(order.creado_en)}
          </Text>

          {!isReady ? (
            <View
              style={{
                backgroundColor: colors.error,
                borderRadius: 10,
                padding: 12,
                marginTop: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <MaterialCommunityIcons
                name="alert-circle"
                size={20}
                color={white}
              />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: white,
                  flex: 1,
                }}
              >
                El pedido debe estar en estado "listo para retirar" para
                registrar un pago
              </Text>
            </View>
          ) : (
            <View
              style={{
                backgroundColor: colors.success,
                borderRadius: 10,
                padding: 12,
                marginTop: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <MaterialCommunityIcons
                name="check-circle"
                size={20}
                color={white}
              />
              <Text style={{ fontSize: 13, fontWeight: '600', color: white }}>
                Listo para cobrar
              </Text>
            </View>
          )}
        </View>

        {/* Productos del pedido */}
        <Text
          style={{
            fontSize: 16,
            fontWeight: '700',
            color: fg,
            marginBottom: 8,
          }}
        >
          Productos
        </Text>
        <View
          style={{
            backgroundColor: surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: border,
            padding: 16,
            marginBottom: 20,
          }}
        >
          {order.detalles.map((detalle, index) => (
            <View
              key={detalle.id_detalle}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: 6,
                ...(index < order.detalles.length - 1
                  ? { borderBottomWidth: 1, borderBottomColor: border }
                  : {}),
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: fg }}>
                  {detalle.nombre_producto}
                </Text>
                <Text style={{ fontSize: 12, color: muted }}>
                  {detalle.cantidad}x $
                  {Number.parseFloat(detalle.precio_unitario).toFixed(2)}
                </Text>
              </View>
              <Text style={{ fontSize: 14, fontWeight: '700', color: fg }}>
                ${Number.parseFloat(detalle.importe).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

        {/* Formulario de pago */}
        <Text
          style={{
            fontSize: 16,
            fontWeight: '700',
            color: fg,
            marginBottom: 8,
          }}
        >
          Datos del pago
        </Text>
        <View
          style={{
            backgroundColor: surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: border,
            padding: 16,
            marginBottom: 20,
          }}
        >
          {/* Monto */}
          <Text
            style={{
              fontSize: 13,
              fontWeight: '600',
              color: muted,
              marginBottom: 6,
            }}
          >
            Monto *
          </Text>
          <TextInput
            value={monto}
            onChangeText={setMonto}
            placeholder="0.00"
            placeholderTextColor={colors.placeholder}
            keyboardType="decimal-pad"
            style={{
              backgroundColor: bg,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: border,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontSize: 18,
              fontWeight: '700',
              color: fg,
              marginBottom: 16,
            }}
          />

          {/* Tipo de pago */}
          <Text
            style={{
              fontSize: 13,
              fontWeight: '600',
              color: muted,
              marginBottom: 6,
            }}
          >
            Tipo de pago
          </Text>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 6,
              marginBottom: 16,
            }}
          >
            {tiposPago.map((tipo) => {
              const selected = tipo.id_tipo_pago === selectedTipoPago;
              return (
                <Pressable
                  key={tipo.id_tipo_pago}
                  onPress={() => setTipoPagoId(tipo.id_tipo_pago)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: selected ? brand : colors.transparent,
                    borderWidth: 1.5,
                    borderColor: selected ? brand : border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '600',
                      color: selected ? white : fg,
                    }}
                  >
                    {tipo.nombre}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Método de pago */}
          <Text
            style={{
              fontSize: 13,
              fontWeight: '600',
              color: muted,
              marginBottom: 6,
            }}
          >
            Método de pago *
          </Text>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 6,
              marginBottom: 16,
            }}
          >
            {METODOS_PAGO.map((m) => {
              const selected = metodo === m.value;
              return (
                <Pressable
                  key={m.value}
                  onPress={() => setMetodo(m.value)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: selected ? brand : colors.transparent,
                    borderWidth: 1.5,
                    borderColor: selected ? brand : border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '600',
                      color: selected ? white : fg,
                    }}
                  >
                    {m.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Referencia */}
          <Text
            style={{
              fontSize: 13,
              fontWeight: '600',
              color: muted,
              marginBottom: 6,
            }}
          >
            Referencia (opcional)
          </Text>
          <TextInput
            value={referencia}
            onChangeText={setReferencia}
            placeholder="Número de cheque, voucher, etc."
            placeholderTextColor={colors.placeholder}
            style={{
              backgroundColor: bg,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: border,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontSize: 15,
              color: fg,
            }}
          />
        </View>

        <Pressable
          onPress={handleSubmit}
          disabled={!isReady || paymentMutation.isPending}
          style={{
            backgroundColor: isReady ? brand : muted,
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: 'center',
            opacity: paymentMutation.isPending ? 0.6 : 1,
          }}
        >
          {paymentMutation.isPending ? (
            <ActivityIndicator size="small" color={white} />
          ) : (
            <Text style={{ fontSize: 17, fontWeight: '700', color: white }}>
              Registrar Pago
            </Text>
          )}
        </Pressable>
      </ScrollView>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast((prev) => ({ ...prev, visible: false }))}
      />
    </View>
  );
}
