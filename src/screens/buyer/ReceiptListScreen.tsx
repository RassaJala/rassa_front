import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';

import { formatearFecha } from '@/common/dates';
import {
  esPropietarioPago,
  fetchPagos,
  formatearMonto,
  PAGOS_CLIENTE_QUERY_KEY,
} from '@/common/payments';
import type { PaymentDetail } from '@/common/payments';
import { colors } from '@/constants/colors';
import api from '@/services/api';
import { useAuth } from '@/store/AuthContext';
import { useTheme } from '@/store/ThemeContext';
import type { BuyerStackParamList } from '@/types';

type Nav = NativeStackNavigationProp<BuyerStackParamList>;

export default function ReceiptListScreen(): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();

  const bg = isDark ? colors.admBgD : colors.admBgL;
  const fg = isDark ? colors.admFgD : colors.admFgL;
  const muted = isDark ? colors.admMutedD : colors.admMutedL;
  const border = isDark ? colors.admBorderD : colors.admBorderL;
  const brand = isDark ? colors.admBrandD : colors.admBrandL;
  const surface = isDark ? colors.admSurfaceD : colors.admSurfaceL;

  const {
    data: pagos = [],
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery<PaymentDetail[]>({
    queryKey: [PAGOS_CLIENTE_QUERY_KEY, user?.id],
    queryFn: () => fetchPagos(api),
    enabled: !!user?.id,
  });

  // Defensa en profundidad: el backend ya filtra los pagos por propietario
  // (IDOR mitigado), pero nunca renderizamos un recibo ajeno.
  const pagosPropios = pagos.filter((pago) =>
    esPropietarioPago(pago, user?.id),
  );

  const keyExtractor = useCallback(
    (item: PaymentDetail) => String(item.id_pago),
    [],
  );

  const renderReceipt = useCallback(
    ({ item }: { readonly item: PaymentDetail }) => (
      <Pressable
        onPress={() =>
          navigation.navigate('ReceiptDetail', { paymentId: item.id_pago })
        }
        style={{
          backgroundColor: surface,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: border,
          padding: 16,
          marginBottom: 10,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: fg }}>
              {item.folio}
            </Text>
            <Text style={{ fontSize: 13, color: muted, marginTop: 2 }}>
              {formatearFecha(item.fecha_pago)}
            </Text>
          </View>
          <Text style={{ fontSize: 17, fontWeight: '700', color: fg }}>
            {formatearMonto(item.monto)}
          </Text>
        </View>

        {item.pedido ? (
          <Text style={{ fontSize: 13, color: muted, marginTop: 8 }}>
            Pedido #{item.pedido}
          </Text>
        ) : null}
      </Pressable>
    ),
    [surface, border, fg, muted, navigation],
  );

  if (isLoading) {
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

  if (isError) {
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
          Error al cargar recibos
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
        <Pressable
          onPress={() => navigation.goBack()}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            marginTop: 12,
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: muted,
          }}
        >
          <MaterialCommunityIcons name="arrow-left" size={18} color={muted} />
          <Text style={{ fontSize: 14, fontWeight: '600', color: muted }}>
            Volver
          </Text>
        </Pressable>
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
          Mis Recibos
        </Text>
      </View>

      <FlatList
        data={pagosPropios}
        renderItem={renderReceipt}
        keyExtractor={keyExtractor}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
          />
        }
        ListEmptyComponent={
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingTop: 60,
            }}
          >
            <MaterialCommunityIcons name="receipt" size={48} color={muted} />
            <Text
              style={{
                marginTop: 12,
                fontSize: 15,
                color: muted,
                textAlign: 'center',
              }}
            >
              No tienes recibos aún
            </Text>
          </View>
        }
        contentContainerStyle={{ padding: 20, paddingBottom: 40, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
