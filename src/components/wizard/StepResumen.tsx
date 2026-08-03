import React from 'react';
import { Text, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import {
  DELETED_PRODUCT_LABEL,
  DELETED_PRODUCT_SUMMARY_WARNING,
} from '@/common/publicationLabels';
import { colors } from '@/constants/colors';
import type {
  WizardItemDraft,
  WizardItemValidation,
} from '@/hooks/usePublicationWizard';
import type { Producto } from '@/services/productos';

interface StepResumenProps {
  items: WizardItemDraft[];
  allProductos: Producto[];
  unidades: { id_unidad: number; tipo: string }[];
  itemValidations: Map<string, WizardItemValidation>;
  surface: string;
  border: string;
  fg: string;
  muted: string;
  brand: string;
}

export default function StepResumen({
  items,
  allProductos,
  unidades,
  itemValidations,
  surface,
  border,
  fg,
  muted,
  brand,
}: StepResumenProps): React.JSX.Element {
  const coral = colors.brandRedCoral;

  return (
    <View>
      {items.length === 0 ? (
        <View
          style={{
            backgroundColor: surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: border,
            padding: 32,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontSize: 15,
              fontWeight: '500',
              color: fg,
              textAlign: 'center',
            }}
          >
            No hay productos para revisar
          </Text>
        </View>
      ) : (
        items.map((item) => {
          const producto = allProductos.find(
            (p) => p.id_producto === item.fk_producto,
          );
          const nombre = producto?.nombre_producto ?? DELETED_PRODUCT_LABEL;
          const unidad = unidades.find((u) => u.id_unidad === item.fk_unidad);
          const hasErrors = itemValidations.has(item.tempId);

          return (
            <View
              key={item.tempId}
              style={{
                backgroundColor: surface,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: hasErrors ? coral : border,
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
                    color: fg,
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
                    color={brand}
                  />
                )}
              </View>

              {!producto ? (
                <Text style={{ fontSize: 13, color: coral, marginBottom: 6 }}>
                  {DELETED_PRODUCT_SUMMARY_WARNING}
                </Text>
              ) : null}

              <View style={{ flexDirection: 'row', gap: 16 }}>
                <Text style={{ fontSize: 13, color: muted }}>
                  Stock:{' '}
                  <Text style={{ color: fg, fontWeight: '500' }}>
                    {item.stock || '\u2014'}
                  </Text>
                </Text>
                <Text style={{ fontSize: 13, color: muted }}>
                  Precio:{' '}
                  <Text style={{ color: fg, fontWeight: '500' }}>
                    ${item.precio || '0'}
                  </Text>
                </Text>
                <Text style={{ fontSize: 13, color: muted }}>
                  Unidad:{' '}
                  <Text style={{ color: fg, fontWeight: '500' }}>
                    {unidad?.tipo ?? '\u2014'}
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
                  color={item.foto ? brand : coral}
                />
                <Text
                  style={{
                    fontSize: 12,
                    color: item.foto ? brand : coral,
                    fontWeight: '500',
                  }}
                >
                  {item.foto ? 'Foto adjunta' : 'Sin foto'}
                </Text>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}
