import React, { useCallback, useState } from 'react';
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
import { colors } from '@/constants/colors';
import api from '@/services/api';
import { useTheme } from '@/store/ThemeContext';
import type { BuyerStackParamList, Order } from '@/types';

type Nav = NativeStackNavigationProp<BuyerStackParamList>;

interface OrderBadgesProps {
  readonly item: Order;
  readonly brand: string;
  readonly activeBg: string;
}

function OrderBadges({
  item,
  brand,
  activeBg,
}: OrderBadgesProps): React.JSX.Element {
  return (
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
      {item.tiene_mermas === true ? (
        <View
          style={{
            backgroundColor: colors.warning,
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
            Con mermas
          </Text>
        </View>
      ) : null}
    </View>
  );
}

interface OrderCardProps {
  readonly item: Order;
  readonly surface: string;
  readonly border: string;
  readonly fg: string;
  readonly muted: string;
  readonly brand: string;
  readonly activeBg: string;
  readonly navigation: Nav;
}

function OrderCard({
  item,
  surface,
  border,
  fg,
  muted,
  brand,
  activeBg,
  navigation,
}: OrderCardProps): React.JSX.Element {
  return (
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

      <OrderBadges item={item} brand={brand} activeBg={activeBg} />

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
  );
}

interface MermasFilterToggleProps {
  readonly active: boolean;
  readonly onToggle: () => void;
  readonly brand: string;
  readonly muted: string;
  readonly border: string;
  readonly activeBg: string;
  readonly surface: string;
}

function MermasFilterToggle({
  active,
  onToggle,
  brand,
  muted,
  border,
  activeBg,
  surface,
}: MermasFilterToggleProps): React.JSX.Element {
  return (
    <Pressable
      onPress={onToggle}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 8,
        marginTop: 12,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: active ? brand : border,
        backgroundColor: active ? activeBg : surface,
      }}
    >
      <View
        style={{
          width: 18,
          height: 18,
          borderRadius: 5,
          borderWidth: 2,
          borderColor: active ? brand : muted,
          backgroundColor: active ? brand : colors.transparent,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {active ? (
          <MaterialCommunityIcons
            name="check"
            size={14}
            color={colors.iconWhite}
          />
        ) : null}
      </View>
      <Text
        style={{
          fontSize: 13,
          fontWeight: '600',
          color: active ? brand : muted,
        }}
      >
        Solo con mermas
      </Text>
    </Pressable>
  );
}

export default function OrderHistoryScreen(): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const navigation = useNavigation<Nav>();
  const [onlyWithMermas, setOnlyWithMermas] = useState(false);

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

  const visibleOrders = onlyWithMermas
    ? orders.filter((item) => item.tiene_mermas === true)
    : orders;

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
      <View
        style={{
          paddingTop: 60,
          paddingHorizontal: 20,
          paddingBottom: 8,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
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
        <View
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
        >
          <MermasFilterToggle
            active={onlyWithMermas}
            onToggle={() => setOnlyWithMermas((prev) => !prev)}
            brand={brand}
            muted={muted}
            border={border}
            activeBg={activeBg}
            surface={surface}
          />
          <Pressable
            onPress={() => navigation.navigate('ReceiptList')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: brand,
              borderRadius: 10,
              paddingVertical: 8,
              paddingHorizontal: 12,
            }}
          >
            <MaterialCommunityIcons
              name="receipt"
              size={16}
              color={colors.iconWhite}
            />
            <Text
              style={{ fontSize: 13, fontWeight: '700', color: colors.iconWhite }}
            >
              Mis Recibos
            </Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={visibleOrders}
        keyExtractor={keyExtractor}
        renderItem={({ item }: { readonly item: Order }) => (
          <OrderCard
            item={item}
            surface={surface}
            border={border}
            fg={fg}
            muted={muted}
            brand={brand}
            activeBg={activeBg}
            navigation={navigation}
          />
        )}
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
              {onlyWithMermas
                ? 'No hay pedidos con mermas'
                : 'No tienes pedidos aún'}
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
