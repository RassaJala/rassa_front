import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { toLocalDate } from '@/common/waste';
import { formatEstado } from '@/common/wasteRegister';
import type { ThemeColors } from '@/constants/colors';
import { colors } from '@/constants/colors';
import type { Order } from '@/types';

function orderModalHint(loading: boolean, orderCount: number): string {
  if (loading) return 'Cargando pedidos…';
  if (orderCount === 0) return 'No hay pedidos para este vendedor.';
  return 'Selecciona el pedido afectado por la merma.';
}

// toLocalDate slices the ISO date part and builds a local Date, avoiding the
// UTC off-by-one that `new Date()` introduces for date-only strings.
function formatFecha(iso: string): string {
  const date = toLocalDate(iso);
  if (date === null) return '';
  return date.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
  });
}

interface PedidoModalProps {
  readonly visible: boolean;
  readonly loading: boolean;
  readonly orders: readonly Order[];
  readonly selectedId: number | null;
  readonly bottomInset: number;
  readonly t: ThemeColors;
  readonly onClose: () => void;
  readonly onSelect: (pedido: Order) => void;
}

export function PedidoModal({
  visible,
  loading,
  orders,
  selectedId,
  bottomInset,
  t,
  onClose,
  onSelect,
}: PedidoModalProps): React.JSX.Element {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          justifyContent: 'flex-end',
          backgroundColor: colors.modalOverlayBg,
        }}
      >
        <View
          style={{
            backgroundColor: t.surface,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: bottomInset + 16,
            maxHeight: '70%',
          }}
        >
          <View style={{ alignItems: 'center', marginBottom: 12 }}>
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: t.border,
              }}
            />
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 4,
            }}
          >
            <Text
              style={{
                flex: 1,
                fontSize: 16,
                fontWeight: '700',
                color: t.fg,
                marginRight: 12,
              }}
            >
              Seleccionar pedido
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: t.input,
                borderWidth: 1,
                borderColor: t.border,
              }}
              accessibilityLabel="Cerrar selector de pedido"
            >
              <MaterialCommunityIcons name="close" size={18} color={t.fg} />
            </Pressable>
          </View>
          <Text
            style={{
              fontSize: 13,
              color: t.muted,
              marginBottom: 12,
            }}
          >
            {orderModalHint(loading, orders.length)}
          </Text>
          {loading ? (
            <ActivityIndicator color={t.brand} style={{ marginVertical: 24 }} />
          ) : (
            <FlatList
              data={orders}
              keyExtractor={(item) => String(item.id_pedido)}
              showsVerticalScrollIndicator={false}
              style={{ flexShrink: 1 }}
              renderItem={({ item }) => {
                const isSelected = item.id_pedido === selectedId;
                return (
                  <Pressable
                    onPress={() => onSelect(item)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 12,
                      paddingHorizontal: 12,
                      borderRadius: 12,
                      backgroundColor: isSelected ? t.input : t.surface,
                      borderWidth: 1,
                      borderColor: isSelected ? t.brand : t.border,
                      marginBottom: 8,
                    }}
                  >
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '600',
                          color: t.fg,
                        }}
                      >
                        Pedido #{item.id_pedido}
                        {formatFecha(item.creado_en) !== ''
                          ? ` · ${formatFecha(item.creado_en)}`
                          : ''}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: t.muted,
                          marginTop: 2,
                        }}
                      >
                        {item.cliente_nombre ?? 'Cliente'} · ${item.total}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '600',
                          color: isSelected ? t.brand : t.muted,
                        }}
                      >
                        {formatEstado(item.estado_actual)}
                      </Text>
                      {isSelected ? (
                        <MaterialCommunityIcons
                          name="check-circle"
                          size={18}
                          color={t.brand}
                        />
                      ) : null}
                    </View>
                  </Pressable>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}
