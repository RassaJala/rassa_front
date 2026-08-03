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

import { colors } from '@/constants/colors';
import api from '@/services/api';
import { useTheme } from '@/store/ThemeContext';
import type { BuyerStackParamList, Order } from '@/types';

type Nav = NativeStackNavigationProp<BuyerStackParamList>;

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

export default function OrderHistoryScreen(): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const navigation = useNavigation<Nav>();

  const bg = isDark ? colors.admBgD : colors.admBgL;
  const fg = isDark ? colors.admFgD : colors.admFgL;
  const muted = isDark ? colors.admMutedD : colors.admMutedL;
  const border = isDark ? colors.admBorderD : colors.admBorderL;
  const brand = isDark ? colors.admBrandD : colors.admBrandL;
  const surface = isDark ? colors.admSurfaceD : colors.admSurfaceL;
  const activeBg = isDark ? colors.admActiveBgD : colors.admActiveBgL;

  const {
    data: orders = [],
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery<Order[]>({
    queryKey: ['pedidos-cliente'],
    queryFn: async () => {
      const response = await api.get<{ results?: Order[] }>('/pedidos/');
      return response.data.results ?? [];
    },
  });

  const keyExtractor = useCallback((item: Order) => String(item.id_pedido), []);

  const renderOrder = useCallback(
    ({ item }: { readonly item: Order }) => (
      <View
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
              #{item.id_pedido}
            </Text>
            <Text style={{ fontSize: 13, color: muted, marginTop: 2 }}>
              {formatearFecha(item.creado_en)}
            </Text>
          </View>
          <Text style={{ fontSize: 17, fontWeight: '700', color: fg }}>
            ${parseFloat(item.total).toFixed(2)}
          </Text>
        </View>

        {item.productos && item.productos.length > 0 ? (
          <Text
            style={{ fontSize: 13, color: muted, marginTop: 8 }}
            numberOfLines={2}
          >
            {item.productos.join(', ')}
            {item.has_more_productos ? '...' : ''}
          </Text>
        ) : null}

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 10,
            gap: 6,
          }}
        >
          <View
            style={{
              backgroundColor: activeBg,
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: brand,
                textTransform: 'capitalize',
              }}
            >
              {item.estado_actual.replace(/_/g, ' ')}
            </Text>
          </View>
          {item.expirado === true ? (
            <View
              style={{
                backgroundColor: colors.error,
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: colors.iconWhite,
                }}
              >
                Expirado
              </Text>
            </View>
          ) : null}
        </View>

        <Pressable
          onPress={() =>
            navigation.navigate('OrderDetail', { orderId: item.id_pedido })
          }
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            marginTop: 12,
            backgroundColor: brand,
            borderRadius: 10,
            paddingVertical: 10,
          }}
        >
          <MaterialCommunityIcons
            name="eye-outline"
            size={18}
            color={colors.iconWhite}
          />
          <Text
            style={{
              fontSize: 14,
              fontWeight: '700',
              color: colors.iconWhite,
            }}
          >
            Ver estatus
          </Text>
        </Pressable>
      </View>
    ),
    [surface, border, fg, muted, activeBg, brand, navigation],
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
          Error al cargar pedidos
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

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <View style={{ paddingTop: 60, paddingHorizontal: 20, paddingBottom: 8 }}>
        <Text
          style={{
            fontSize: 28,
            fontWeight: '700',
            letterSpacing: -0.02,
            color: fg,
          }}
        >
          Mis Pedidos
        </Text>
      </View>

      <FlatList
        data={orders}
        renderItem={renderOrder}
        keyExtractor={keyExtractor}
        ListEmptyComponent={
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingTop: 60,
            }}
          >
            <MaterialCommunityIcons
              name="package-variant"
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
              No tienes pedidos aún
            </Text>
          </View>
        }
        contentContainerStyle={{ padding: 20, paddingBottom: 40, flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            tintColor={brand}
            colors={[brand]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
