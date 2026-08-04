import React, { useRef, useState } from 'react';
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
import type { UseMutationResult } from '@tanstack/react-query';

import {
  createIdempotencyKey,
  createPago,
  esEfectivo,
  fetchPagoPorPedido,
  fetchTiposPago,
  ORDER_STATUS_READY,
} from '@/common/payments';
import type { PaymentDetail, TipoPago } from '@/common/payments';
import { colors } from '@/constants/colors';
import { STALE_TIME } from '@/constants/orderTimeline';
import api from '@/services/api';
import * as Storage from '@/services/storage';
import { useTheme } from '@/store/ThemeContext';
import type { OrderDetail, SellerStackParamList } from '@/types';
import { extractApiError } from '@/utils/apiErrors';

// ── Constants ──────────────────────────────────────────────

const INPUT_MAX_LENGTH = 200;

// ── Types ──────────────────────────────────────────────────

type Nav = NativeStackNavigationProp<SellerStackParamList, 'Payment'>;
type Route = RouteProp<SellerStackParamList, 'Payment'>;

// ── Helpers ────────────────────────────────────────────────

// One stable idempotency key per order, persisted so a retry (even after a
// reload) reuses the same key and the backend can dedupe the POST.
async function getIdempotencyKey(orderId: number): Promise<string> {
  const storageKey = `idem_pago_${orderId}`;
  const existing = await Storage.getItemAsync(storageKey);
  if (existing) return existing;
  const fresh = createIdempotencyKey();
  Storage.setItemAsync(storageKey, fresh).catch(() => {});
  return fresh;
}

function ErrorView({
  bg,
  muted,
  brand,
  border,
  refetch,
}: {
  readonly bg: string;
  readonly muted: string;
  readonly brand: string;
  readonly border: string;
  readonly refetch: () => void;
}): React.JSX.Element {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
      }}
    >
      <MaterialCommunityIcons
        name="alert-circle-outline"
        size={48}
        color={muted}
      />
      <Text
        style={{
          marginTop: 12,
          fontSize: 15,
          color: muted,
          textAlign: 'center',
        }}
      >
        Error al cargar el pedido
      </Text>
      <Pressable
        onPress={() => void refetch()}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          marginTop: 16,
          paddingHorizontal: 20,
          paddingVertical: 10,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: border,
        }}
      >
        <MaterialCommunityIcons name="refresh" size={18} color={brand} />
        <Text style={{ fontSize: 14, fontWeight: '600', color: brand }}>
          Reintentar
        </Text>
      </Pressable>
    </View>
  );
}

function LoadingView({
  bg,
  brand,
}: {
  readonly bg: string;
  readonly brand: string;
}): React.JSX.Element {
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

function NotReadyView({
  bg,
  muted,
  brand,
  border,
  estado,
  onGoBack,
}: {
  readonly bg: string;
  readonly muted: string;
  readonly brand: string;
  readonly border: string;
  readonly estado: string;
  readonly onGoBack: () => void;
}): React.JSX.Element {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <MaterialCommunityIcons
        name="alert-circle-outline"
        size={48}
        color={muted}
      />
      <Text
        style={{
          marginTop: 12,
          fontSize: 15,
          color: muted,
          textAlign: 'center',
        }}
      >
        Este pedido no está listo para cobro.{'\n'}Estado actual:{' '}
        {estado.replace(/_/g, ' ')}
      </Text>
      <Pressable
        onPress={onGoBack}
        style={{
          marginTop: 16,
          paddingHorizontal: 20,
          paddingVertical: 10,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: border,
        }}
      >
        <Text style={{ fontWeight: '600', color: brand }}>Volver</Text>
      </Pressable>
    </View>
  );
}

function PaymentFormView({
  bg,
  fg,
  muted,
  brand,
  border,
  surface,
  white,
  error: errorColor,
  order,
  tipoEfectivo,
  referencia,
  setReferencia,
  fieldErrors,
  setFieldErrors,
  navigation,
  pagoMutation,
  onSubmit,
}: {
  readonly bg: string;
  readonly fg: string;
  readonly muted: string;
  readonly brand: string;
  readonly border: string;
  readonly surface: string;
  readonly white: string;
  readonly error: string;
  readonly order: OrderDetail;
  readonly tipoEfectivo: TipoPago | null;
  readonly referencia: string;
  readonly setReferencia: (v: string) => void;
  readonly fieldErrors: Record<string, string>;
  readonly setFieldErrors: (v: Record<string, string>) => void;
  readonly navigation: Nav;
  readonly pagoMutation: UseMutationResult<
    PaymentDetail,
    unknown,
    void,
    unknown
  >;
  readonly onSubmit: () => void;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {/* Header */}
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
        {/* Order info card */}
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
          <Text style={{ fontSize: 13, color: muted }}>
            Pedido #{order.id_pedido}
          </Text>
          <Text
            style={{ fontSize: 17, fontWeight: '700', color: fg, marginTop: 2 }}
          >
            {order.cliente_nombre ?? 'Cliente'}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 10,
            }}
          >
            <Text style={{ fontSize: 14, color: muted }}>Total a cobrar</Text>
            <Text style={{ fontSize: 24, fontWeight: '700', color: brand }}>
              ${Number(order.total).toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Payment method */}
        <Text
          style={{
            fontSize: 16,
            fontWeight: '700',
            color: fg,
            marginBottom: 10,
          }}
        >
          Método de pago
        </Text>
        <View
          style={{
            backgroundColor: surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: fieldErrors.tipo_pago ? errorColor : border,
            padding: 14,
            marginBottom: 20,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <MaterialCommunityIcons name="cash" size={22} color={brand} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: fg }}>
              {tipoEfectivo?.nombre ?? 'Efectivo'}
            </Text>
          </View>
          {fieldErrors.tipo_pago ? (
            <Text
              style={{
                fontSize: 13,
                color: errorColor,
                marginTop: 6,
                marginLeft: 4,
              }}
            >
              {fieldErrors.tipo_pago}
            </Text>
          ) : null}
        </View>

        {/* Reference field */}
        <Text
          style={{
            fontSize: 16,
            fontWeight: '700',
            color: fg,
            marginBottom: 6,
          }}
        >
          Referencia{' '}
          <Text style={{ color: muted, fontWeight: '400', fontSize: 13 }}>
            (opcional)
          </Text>
        </Text>
        <TextInput
          value={referencia}
          onChangeText={(t) => {
            setReferencia(t);
            setFieldErrors({});
          }}
          placeholder="Nota o referencia"
          placeholderTextColor={muted}
          maxLength={INPUT_MAX_LENGTH}
          style={{
            backgroundColor: surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: fieldErrors.referencia ? errorColor : border,
            padding: 14,
            fontSize: 15,
            color: fg,
            marginBottom: 24,
          }}
        />

        {/* Submit button */}
        <Pressable
          testID="submit-payment-button"
          onPress={onSubmit}
          disabled={pagoMutation.isPending || !tipoEfectivo}
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

// ── Component ──────────────────────────────────────────────

export default function PaymentScreen(): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const queryClient = useQueryClient();
  const { orderId } = route.params;
  const orderIdValid = Number.isInteger(orderId) && orderId > 0;

  const bg = isDark ? colors.admBgD : colors.admBgL;
  const fg = isDark ? colors.admFgD : colors.admFgL;
  const muted = isDark ? colors.admMutedD : colors.admMutedL;
  const border = isDark ? colors.admBorderD : colors.admBorderL;
  const brand = isDark ? colors.admBrandD : colors.admBrandL;
  const surface = isDark ? colors.admSurfaceD : colors.admSurfaceL;
  const white = colors.iconWhite;
  const error = colors.error;

  const [referencia, setReferencia] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  // Synchronous guard: closes the same-frame gap between press and the
  // mutation's isPending render, which would otherwise allow a double POST.
  const paymentInFlight = useRef(false);

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
    enabled: orderIdValid,
    staleTime: STALE_TIME,
  });

  // Fetch payment types
  const {
    data: tiposPago = [],
    isLoading: tiposLoading,
    isError: tiposError,
    refetch: refetchTipos,
  } = useQuery({
    queryKey: ['tipos-pago'],
    queryFn: () => fetchTiposPago(api),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1,
  });

  // Cash is the only accepted payment method: resolve its id without a picker.
  const tipoEfectivo = tiposPago.find(esEfectivo) ?? tiposPago[0] ?? null;

  const pagoMutation = useMutation({
    mutationFn: async () => {
      if (!tipoEfectivo || !order) throw new Error('Datos incompletos');
      // Reconcile before POST: if a payment already exists for this order, a
      // previous request actually succeeded — reuse it instead of charging
      // twice. Idempotency-Key then dedupes any race that slips through.
      const existing = await fetchPagoPorPedido(api, orderId);
      if (existing) return existing;
      const trimmedRef = referencia.trim();
      return createPago(
        api,
        {
          pedido: orderId,
          tipo_pago: tipoEfectivo.id_tipo_pago,
          monto: order.total,
          ...(trimmedRef ? { referencia: trimmedRef } : {}),
        },
        await getIdempotencyKey(orderId),
      );
    },
    onSuccess: (data) => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pedidos'] }),
        queryClient.invalidateQueries({ queryKey: ['pedido', orderId] }),
      ]).catch(() => {});
      navigation.replace('Receipt', { paymentId: data.id_pago });
      paymentInFlight.current = false;
    },
    onError: async (error: unknown) => {
      try {
        // The POST may have succeeded server-side with the response lost:
        // reconcile before showing an error so the seller is not told the
        // payment failed (and re-submits, charging twice).
        const pago = await fetchPagoPorPedido(api, orderId);
        if (pago) {
          void Promise.all([
            queryClient.invalidateQueries({ queryKey: ['pedidos'] }),
            queryClient.invalidateQueries({ queryKey: ['pedido', orderId] }),
          ]).catch(() => {});
          navigation.replace('Receipt', { paymentId: pago.id_pago });
          paymentInFlight.current = false;
          return;
        }
      } catch {
        // Reconciliation failed: fall through to the real error message
      }
      const detail = extractApiError(error, [
        'pedido',
        'tipo_pago',
        'monto',
        'referencia',
      ]);
      Alert.alert('Error', detail);
      paymentInFlight.current = false;
    },
  });

  const isLoading = orderLoading || tiposLoading;
  const isReady = order?.estado_actual === ORDER_STATUS_READY;

  if (isLoading) {
    return <LoadingView bg={bg} brand={brand} />;
  }

  if (tiposError) {
    return (
      <ErrorView
        bg={bg}
        muted={muted}
        brand={brand}
        border={border}
        refetch={refetchTipos}
      />
    );
  }

  if (orderError || !order) {
    return (
      <ErrorView
        bg={bg}
        muted={muted}
        brand={brand}
        border={border}
        refetch={refetchOrder}
      />
    );
  }

  if (!isReady) {
    return (
      <NotReadyView
        bg={bg}
        muted={muted}
        brand={brand}
        border={border}
        estado={order.estado_actual}
        onGoBack={() => navigation.goBack()}
      />
    );
  }

  return (
    <PaymentFormView
      bg={bg}
      fg={fg}
      muted={muted}
      brand={brand}
      border={border}
      surface={surface}
      white={white}
      error={error}
      order={order}
      tipoEfectivo={tipoEfectivo}
      referencia={referencia}
      setReferencia={setReferencia}
      fieldErrors={fieldErrors}
      setFieldErrors={setFieldErrors}
      navigation={navigation}
      pagoMutation={pagoMutation}
      onSubmit={() => {
        if (paymentInFlight.current) return;
        paymentInFlight.current = true;
        pagoMutation.mutate();
      }}
    />
  );
}
