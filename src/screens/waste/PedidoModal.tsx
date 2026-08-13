import React from 'react';
import { Text, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { toLocalDate } from '@/common/waste';
import { formatEstado } from '@/common/wasteRegister';
import { BottomSheetListModal } from '@/components/ui';
import type { ThemeColors } from '@/constants/colors';
import type { Order } from '@/types';

function orderModalHint(orderCount: number): string {
  if (orderCount === 0) return 'No hay pedidos para este vendedor.';
  return 'Selecciona el pedido afectado por la merma.';
}

// Locale estándar del repo (mismo que StepFecha/FarmerDashboard) para las
// fechas del selector de pedidos; evita mezclar es-MX/es-AR entre pantallas.
export const PEDIDO_FECHA_LOCALE = 'es-AR';

// toLocalDate slices the ISO date part and builds a local Date, avoiding the
// UTC off-by-one that `new Date()` introduces for date-only strings.
function formatFecha(iso: string): string {
  const date = toLocalDate(iso);
  if (date === null) return '';
  return date.toLocaleDateString(PEDIDO_FECHA_LOCALE, {
    day: '2-digit',
    month: 'short',
  });
}

interface PedidoModalProps {
  readonly visible: boolean;
  readonly orders: readonly Order[];
  readonly selectedId: number | null;
  readonly bottomInset: number;
  readonly t: ThemeColors;
  readonly onClose: () => void;
  readonly onSelect: (pedido: Order) => void;
}

export function PedidoModal({
  visible,
  orders,
  selectedId,
  bottomInset,
  t,
  onClose,
  onSelect,
}: PedidoModalProps): React.JSX.Element {
  return (
    <BottomSheetListModal
      visible={visible}
      title="Seleccionar pedido"
      hint={orderModalHint(orders.length)}
      closeLabel="Cerrar selector de pedido"
      items={orders}
      keyExtractor={(item) => String(item.id_pedido)}
      isSelected={(item) => item.id_pedido === selectedId}
      bottomInset={bottomInset}
      t={t}
      onClose={onClose}
      onSelect={onSelect}
      renderRowContent={(item, isSelected) => {
        const fecha = formatFecha(item.creado_en);
        return (
          <>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: t.fg,
                }}
              >
                Pedido #{item.id_pedido}
                {fecha !== '' ? ` · ${fecha}` : ''}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: t.muted,
                  marginTop: 2,
                }}
              >
                {item.cliente_nombre ?? 'Cliente'} · ${item.total ?? '—'}
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
          </>
        );
      }}
    />
  );
}
