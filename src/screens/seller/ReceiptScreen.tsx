import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { printAsync } from 'expo-print';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';

import { colors } from '@/constants/colors';
import { fetchPayment } from '@/services/pagos';
import { useTheme } from '@/store/ThemeContext';
import type { Payment, SellerStackParamList } from '@/types';

type Nav = NativeStackNavigationProp<SellerStackParamList, 'Receipt'>;
type Route = RouteProp<SellerStackParamList, 'Receipt'>;

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

function reciboHtml(payment: Payment): string {
  const productosRows = payment.productos
    .map(
      (p) =>
        `<tr>
          <td style="padding:6px 0;border-bottom:1px solid #e2e6df">${p.nombre}</td>
          <td style="padding:6px 0;border-bottom:1px solid #e2e6df;text-align:center">${p.cantidad}</td>
          <td style="padding:6px 0;border-bottom:1px solid #e2e6df;text-align:right">$${parseFloat(p.precio).toFixed(2)}</td>
        </tr>`,
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Recibo ${payment.folio}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: 'Courier New', monospace;
    font-size: 13px;
    color: #1d1d1d;
    padding: 30px 20px;
    max-width: 320px;
    margin: 0 auto;
  }
  .header { text-align: center; margin-bottom: 20px; }
  .header h1 { font-size: 22px; font-weight: 700; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 2px; }
  .header h2 { font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; color: #24563c; }
  .folio { text-align: center; font-size: 16px; font-weight: 700; margin: 8px 0 16px; color: #24563c; }
  .line { border: none; border-top: 1px dashed #000; margin: 12px 0; }
  .info-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
  .info-label { color: #6b7280; }
  .info-value { font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  th { text-align: left; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; padding-bottom: 6px; border-bottom: 2px solid #1d1d1d; }
  th:nth-child(2) { text-align: center; }
  th:nth-child(3) { text-align: right; }
  .total { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding-top: 12px; border-top: 2px solid #1d1d1d; }
  .total-label { font-size: 16px; font-weight: 700; }
  .total-value { font-size: 22px; font-weight: 700; color: #24563c; }
  .footer { text-align: center; margin-top: 24px; font-size: 12px; color: #6b7280; }
  @media print {
    body { padding: 0; }
    .no-print { display: none; }
  }
</style>
</head>
<body>
  <div class="header">
    <h1>RASSA</h1>
    <h2>Recibo de pago</h2>
  </div>
  <div class="folio">${payment.folio}</div>
  <hr class="line">
  <div class="info-row"><span class="info-label">Fecha</span><span class="info-value">${formatearFecha(payment.fecha_pago)}</span></div>
  <div class="info-row"><span class="info-label">Cliente</span><span class="info-value">${payment.cliente_nombre ?? '—'}</span></div>
  <div class="info-row"><span class="info-label">Pedido</span><span class="info-value">#${payment.pedido}</span></div>
  <div class="info-row"><span class="info-label">Método</span><span class="info-value">${payment.tipo_pago_nombre}</span></div>
  ${payment.referencia ? `<div class="info-row"><span class="info-label">Referencia</span><span class="info-value">${payment.referencia}</span></div>` : ''}
  <hr class="line">
  <table>
    <thead><tr><th>Producto</th><th>Cant.</th><th>Precio</th></tr></thead>
    <tbody>${productosRows}</tbody>
  </table>
  <div class="total">
    <span class="total-label">Total pagado</span>
    <span class="total-value">$${parseFloat(payment.monto).toFixed(2)}</span>
  </div>
  <div class="footer">Gracias por tu pago</div>
</body>
</html>`;
}

export default function ReceiptScreen(): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { paymentId } = route.params;

  const bg = isDark ? colors.admBgD : colors.admBgL;
  const fg = isDark ? colors.admFgD : colors.admFgL;
  const muted = isDark ? colors.admMutedD : colors.admMutedL;
  const border = isDark ? colors.admBorderD : colors.admBorderL;
  const brand = isDark ? colors.admBrandD : colors.admBrandL;
  const surface = isDark ? colors.admSurfaceD : colors.admSurfaceL;
  const white = colors.iconWhite;

  const {
    data: payment,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['pago', paymentId],
    queryFn: () => fetchPayment(paymentId),
    enabled: paymentId > 0,
  });

  const handlePrint = useCallback(async () => {
    if (!payment) return;
    try {
      await printAsync({ html: reciboHtml(payment) });
    } catch {
      if (Platform.OS === 'web') {
        Alert.alert('Impresión', 'Usa Ctrl+P para imprimir este recibo.');
      }
    }
  }, [payment]);

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

  if (isError || !payment) {
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
          Error al cargar el recibo
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
          paddingBottom: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Pressable
          onPress={() => navigation.navigate('SellerTabs')}
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
          Recibo de pago
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
            padding: 20,
            marginBottom: 16,
            alignItems: 'center',
          }}
        >
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: brand,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 8,
            }}
          >
            <MaterialCommunityIcons
              name="check-circle"
              size={32}
              color={white}
            />
          </View>
          <Text style={{ fontSize: 20, fontWeight: '700', color: fg }}>
            Pago registrado
          </Text>
          <View
            style={{
              backgroundColor: isDark
                ? colors.admActiveBgD
                : colors.admActiveBgL,
              borderRadius: 8,
              paddingHorizontal: 14,
              paddingVertical: 4,
              marginTop: 6,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: '700',
                color: brand,
                letterSpacing: 0.5,
              }}
            >
              {payment.folio}
            </Text>
          </View>
        </View>

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
          <Text
            style={{
              fontSize: 11,
              fontWeight: '600',
              color: muted,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              marginBottom: 8,
            }}
          >
            Datos del pago
          </Text>

          <View style={{ flexDirection: 'row', marginBottom: 6 }}>
            <Text style={{ flex: 1, fontSize: 14, color: muted }}>Fecha</Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: fg }}>
              {formatearFecha(payment.fecha_pago)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', marginBottom: 6 }}>
            <Text style={{ flex: 1, fontSize: 14, color: muted }}>Cliente</Text>
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: fg,
                flex: 1,
                textAlign: 'right',
              }}
            >
              {payment.cliente_nombre ?? '—'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', marginBottom: 6 }}>
            <Text style={{ flex: 1, fontSize: 14, color: muted }}>Pedido</Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: fg }}>
              #{payment.pedido}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', marginBottom: 6 }}>
            <Text style={{ flex: 1, fontSize: 14, color: muted }}>Método</Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: fg }}>
              {payment.tipo_pago_nombre}
            </Text>
          </View>
          {payment.referencia ? (
            <View style={{ flexDirection: 'row' }}>
              <Text style={{ flex: 1, fontSize: 14, color: muted }}>
                Referencia
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: fg }}>
                {payment.referencia}
              </Text>
            </View>
          ) : null}
        </View>

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
          <Text
            style={{
              fontSize: 11,
              fontWeight: '600',
              color: muted,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              marginBottom: 8,
            }}
          >
            Productos
          </Text>

          <View
            style={{
              flexDirection: 'row',
              paddingBottom: 8,
              borderBottomWidth: 1,
              borderBottomColor: border,
              marginBottom: 4,
            }}
          >
            <Text
              style={{
                flex: 2,
                fontSize: 12,
                fontWeight: '600',
                color: muted,
              }}
            >
              Producto
            </Text>
            <Text
              style={{
                flex: 1,
                fontSize: 12,
                fontWeight: '600',
                color: muted,
                textAlign: 'center',
              }}
            >
              Cant.
            </Text>
            <Text
              style={{
                flex: 1,
                fontSize: 12,
                fontWeight: '600',
                color: muted,
                textAlign: 'right',
              }}
            >
              Precio
            </Text>
          </View>

          {payment.productos.map((prod, index) => (
            <View
              key={`${prod.nombre}-${index}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 6,
              }}
            >
              <Text
                style={{
                  flex: 2,
                  fontSize: 14,
                  color: fg,
                }}
                numberOfLines={1}
              >
                {prod.nombre}
              </Text>
              <Text
                style={{
                  flex: 1,
                  fontSize: 14,
                  color: fg,
                  textAlign: 'center',
                }}
              >
                {prod.cantidad}
              </Text>
              <Text
                style={{
                  flex: 1,
                  fontSize: 14,
                  fontWeight: '600',
                  color: fg,
                  textAlign: 'right',
                }}
              >
                ${parseFloat(prod.precio).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

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
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: fg }}>
              Total pagado
            </Text>
            <Text
              style={{
                fontSize: 22,
                fontWeight: '700',
                color: brand,
              }}
            >
              ${parseFloat(payment.monto).toFixed(2)}
            </Text>
          </View>
        </View>

        <Text
          style={{
            textAlign: 'center',
            fontSize: 14,
            color: muted,
            marginBottom: 24,
          }}
        >
          Gracias por tu pago
        </Text>

        <Pressable
          onPress={handlePrint}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            backgroundColor: surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: border,
            paddingVertical: 14,
            marginBottom: 10,
          }}
        >
          <MaterialCommunityIcons name="printer" size={20} color={fg} />
          <Text style={{ fontSize: 16, fontWeight: '600', color: fg }}>
            Imprimir recibo
          </Text>
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate('SellerTabs')}
          style={{
            backgroundColor: brand,
            borderRadius: 12,
            paddingVertical: 16,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontSize: 17,
              fontWeight: '700',
              color: white,
            }}
          >
            Volver a pedidos
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
