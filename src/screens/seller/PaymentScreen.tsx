import React, { useState } from 'react';
import {
  ActivityIndicator,
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
import { createPayment, fetchTiposPago } from '@/services/pagos';
import { useTheme } from '@/store/ThemeContext';
import type { SellerStackParamList } from '@/types';
import { extractApiError } from '@/utils/apiError';

type Nav = NativeStackNavigationProp<SellerStackParamList, 'Payment'>;
type Route = RouteProp<SellerStackParamList, 'Payment'>;

const EFECTIVO_ID = 1;
const TRANSFERENCIA_ID = 2;

export default function PaymentScreen(): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const queryClient = useQueryClient();
  const { orderId, clientName, total } = route.params;

  const bg = isDark ? colors.admBgD : colors.admBgL;
  const fg = isDark ? colors.admFgD : colors.admFgL;
  const muted = isDark ? colors.admMutedD : colors.admMutedL;
  const border = isDark ? colors.admBorderD : colors.admBorderL;
  const brand = isDark ? colors.admBrandD : colors.admBrandL;
  const surface = isDark ? colors.admSurfaceD : colors.admSurfaceL;
  const white = colors.iconWhite;
  const inputBg = isDark ? colors.admBgD : colors.admBgL;

  const [metodoId, setMetodoId] = useState<number>(EFECTIVO_ID);
  const [monto, setMonto] = useState(total);
  const [referencia, setReferencia] = useState('');
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({ visible: false, message: '', type: 'info' });

  const { data: tipos = [], isLoading: loadingTipos } = useQuery({
    queryKey: ['tipos-pago'],
    queryFn: fetchTiposPago,
  });

  const paymentMutation = useMutation({
    mutationFn: createPayment,
    onSuccess: (payment) => {
      void queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      navigation.replace('Receipt', { paymentId: payment.id_pago });
    },
    onError: (error: unknown) => {
      if (__DEV__) {
        console.error('[PaymentScreen] Error al registrar pago:', error);
      }
      const detail = extractApiError(error, ['pedido', 'monto', 'tipo_pago']);
      showToast(detail, 'error');
    },
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast((prev) => ({ ...prev, visible: false }));
  };

  const handleSubmit = () => {
    const montoNum = parseFloat(monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      showToast('Ingresa un monto válido', 'error');
      return;
    }
    paymentMutation.mutate({
      pedido: orderId,
      tipo_pago: metodoId,
      monto: montoNum.toFixed(2),
      ...(metodoId === TRANSFERENCIA_ID && referencia ? { referencia } : {}),
    });
  };

  if (loadingTipos) {
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
          Registrar pago
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
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
          <Text style={{ fontSize: 13, color: muted }}>Cliente</Text>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '700',
              color: fg,
              marginTop: 2,
            }}
          >
            {clientName || 'Cliente'}
          </Text>
          <Text style={{ fontSize: 13, color: muted, marginTop: 8 }}>
            Pedido
          </Text>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '700',
              color: fg,
              marginTop: 2,
            }}
          >
            #{orderId}
          </Text>
          <Text style={{ fontSize: 13, color: muted, marginTop: 8 }}>
            Total del pedido
          </Text>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '700',
              color: fg,
              marginTop: 2,
            }}
          >
            ${parseFloat(total).toFixed(2)}
          </Text>
        </View>

        <Text
          style={{
            fontSize: 15,
            fontWeight: '600',
            color: fg,
            marginBottom: 10,
          }}
        >
          Método de pago
        </Text>
        <View
          style={{
            flexDirection: 'row',
            gap: 10,
            marginBottom: 20,
          }}
        >
          {tipos
            .filter(
              (t) =>
                t.id_tipo_pago === EFECTIVO_ID ||
                t.id_tipo_pago === TRANSFERENCIA_ID,
            )
            .map((t) => {
              const selected = metodoId === t.id_tipo_pago;
              return (
                <Pressable
                  key={t.id_tipo_pago}
                  onPress={() => {
                    setMetodoId(t.id_tipo_pago);
                    if (t.id_tipo_pago === EFECTIVO_ID) {
                      setReferencia('');
                    }
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    borderRadius: 12,
                    backgroundColor: selected ? brand : surface,
                    borderWidth: 1.5,
                    borderColor: selected ? brand : border,
                    alignItems: 'center',
                  }}
                >
                  <MaterialCommunityIcons
                    name={
                      t.id_tipo_pago === EFECTIVO_ID ? 'cash' : 'bank-transfer'
                    }
                    size={24}
                    color={selected ? white : muted}
                  />
                  <Text
                    style={{
                      marginTop: 4,
                      fontSize: 13,
                      fontWeight: '600',
                      color: selected ? white : fg,
                    }}
                  >
                    {t.nombre}
                  </Text>
                </Pressable>
              );
            })}
        </View>

        <Text
          style={{
            fontSize: 15,
            fontWeight: '600',
            color: fg,
            marginBottom: 6,
          }}
        >
          Monto
        </Text>
        <TextInput
          value={monto}
          onChangeText={setMonto}
          keyboardType="decimal-pad"
          style={{
            backgroundColor: inputBg,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: border,
            paddingHorizontal: 16,
            paddingVertical: 14,
            fontSize: 18,
            fontWeight: '700',
            color: fg,
            marginBottom: 20,
          }}
        />

        {metodoId === TRANSFERENCIA_ID ? (
          <>
            <Text
              style={{
                fontSize: 15,
                fontWeight: '600',
                color: fg,
                marginBottom: 6,
              }}
            >
              Referencia (opcional)
            </Text>
            <TextInput
              value={referencia}
              onChangeText={setReferencia}
              placeholder="Número de referencia"
              placeholderTextColor={muted}
              style={{
                backgroundColor: inputBg,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: border,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 16,
                color: fg,
                marginBottom: 20,
              }}
            />
          </>
        ) : null}

        <Pressable
          onPress={handleSubmit}
          disabled={paymentMutation.isPending}
          style={{
            backgroundColor: brand,
            borderRadius: 12,
            paddingVertical: 16,
            alignItems: 'center',
            opacity: paymentMutation.isPending ? 0.6 : 1,
          }}
        >
          {paymentMutation.isPending ? (
            <ActivityIndicator size="small" color={white} />
          ) : (
            <Text
              style={{
                fontSize: 17,
                fontWeight: '700',
                color: white,
              }}
            >
              Registrar pago
            </Text>
          )}
        </Pressable>
      </ScrollView>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={hideToast}
      />
    </View>
  );
}
