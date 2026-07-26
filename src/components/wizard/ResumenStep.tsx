import React from 'react';
import { Text, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors, themeColors } from '@/constants/colors';
import type { WizardItemDraft, WizardItemValidation } from '@/hooks/usePublicationWizard';
import type { Producto, Unidad } from '@/services/productos';

interface ResumenStepProps {
  items: WizardItemDraft[];
  allProductos: Producto[];
  unidades: Unidad[];
  itemValidations: Map<string, WizardItemValidation>;
  isDark: boolean;
}

export default function ResumenStep({
  items,
  allProductos,
  unidades,
  itemValidations,
  isDark,
}: ResumenStepProps): React.JSX.Element {
  const theme = themeColors(isDark);
  const coral = colors.brandRedCoral;

  if (items.length === 0) {
    return (
      <View
        style={{
          backgroundColor: theme.surface,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: theme.border,
          padding: 32,
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            fontSize: 15,
            fontWeight: '500',
            color: theme.fg,
            textAlign: 'center',
          }}
        >
          No hay productos para revisar
        </Text>
      </View>
    );
  }

  return (
    <View>
      {items.map((item) => {
        const producto = allProductos.find(
          (p) => p.id_producto === item.fk_producto,
        );
        const nombre =
          producto?.nombre_producto ?? `Producto #${String(item.fk_producto)}`;
        const unidad = unidades.find((u) => u.id_unidad === item.fk_unidad);
        const hasErrors = itemValidations.has(item.tempId);

        return (
          <View
            key={item.tempId}
            style={{
              backgroundColor: theme.surface,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: hasErrors ? coral : theme.border,
              padding: 16,
              marginBottom: 10,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: '600',
                  color: theme.fg,
                  flex: 1,
                }}
              >
                {nombre}
              </Text>
              {hasErrors ? (
                <MaterialCommunityIcons
                  name="alert-circle"
                  size={18}
                  color={coral}
                />
              ) : (
                <MaterialCommunityIcons
                  name="check-circle"
                  size={18}
                  color={theme.brand}
                />
              )}
            </View>

            <View style={{ flexDirection: 'row', gap: 16 }}>
              <Text style={{ fontSize: 13, color: theme.muted }}>
                Stock:{' '}
                <Text style={{ color: theme.fg, fontWeight: '500' }}>
                  {item.stock || '—'}
                </Text>
              </Text>
              <Text style={{ fontSize: 13, color: theme.muted }}>
                Precio:{' '}
                <Text style={{ color: theme.fg, fontWeight: '500' }}>
                  ${item.precio || '0'}
                </Text>
              </Text>
              <Text style={{ fontSize: 13, color: theme.muted }}>
                Unidad:{' '}
                <Text style={{ color: theme.fg, fontWeight: '500' }}>
                  {unidad?.tipo ?? '—'}
                </Text>
              </Text>
            </View>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                marginTop: 8,
              }}
            >
              <MaterialCommunityIcons
                name={item.foto ? 'image' : 'image-off'}
                size={14}
                color={item.foto ? theme.brand : coral}
              />
              <Text
                style={{
                  fontSize: 12,
                  color: item.foto ? theme.brand : coral,
                  fontWeight: '500',
                }}
              >
                {item.foto ? 'Foto adjunta' : 'Sin foto'}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
