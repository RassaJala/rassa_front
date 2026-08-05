import { Text, View } from 'react-native';

import { formatearFecha } from '@/common/dates';
import { colors } from '@/constants/colors';
import { useTheme } from '@/store/ThemeContext';
import type { MermaDePedido } from '@/types';

interface OrderMermasSectionProps {
  readonly mermas: readonly MermaDePedido[];
}

/** Renders the per-order mermas (none when the list is empty/undefined). */
export default function OrderMermasSection({
  mermas,
}: OrderMermasSectionProps): React.JSX.Element | null {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';

  if (mermas.length === 0) {
    return null;
  }

  const fg = isDark ? colors.admFgD : colors.admFgL;
  const muted = isDark ? colors.admMutedD : colors.admMutedL;
  const border = isDark ? colors.admBorderD : colors.admBorderL;
  const surface = isDark ? colors.admSurfaceD : colors.admSurfaceL;

  return (
    <>
      <Text
        style={{
          fontSize: 18,
          fontWeight: '700',
          color: fg,
          marginBottom: 10,
          marginTop: 4,
        }}
      >
        Mermas
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
        {mermas.map((merma, index) => (
          <View
            key={merma.id_merma}
            style={{
              paddingVertical: 8,
              ...(index < mermas.length - 1
                ? { borderBottomWidth: 1, borderBottomColor: border }
                : {}),
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text
                style={{ fontSize: 15, fontWeight: '600', color: fg, flex: 1 }}
              >
                {merma.producto_nombre ?? 'Producto'}
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: fg }}>
                {merma.cantidad}x
              </Text>
            </View>
            <Text style={{ fontSize: 13, color: muted, marginTop: 2 }}>
              {merma.motivo}
              {merma.decision_nombre ? ` · ${merma.decision_nombre}` : ''}
            </Text>
            <Text style={{ fontSize: 12, color: muted, marginTop: 2 }}>
              {formatearFecha(merma.creado_en)}
            </Text>
            {merma.comentarios ? (
              <Text style={{ fontSize: 12, color: muted, marginTop: 2 }}>
                {merma.comentarios}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
    </>
  );
}
