import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import WizardItemCard from '@/components/wizard/WizardItemCard';
import type {
  WizardItemDraft,
  WizardItemField,
  WizardItemValidation,
} from '@/hooks/usePublicationWizard';
import type { Producto } from '@/services/productos';

interface StepProductosProps {
  items: WizardItemDraft[];
  allProductos: Producto[];
  unidades: { id_unidad: number; tipo: string }[];
  itemValidations: Map<string, WizardItemValidation>;
  onUpdate: (
    tempId: string,
    field: WizardItemField,
    value: string | number | null,
  ) => void;
  onRemove: (tempId: string) => void;
  onPickImage: (tempId: string) => void;
  onAddProduct: () => void;
  surface: string;
  border: string;
  fg: string;
  muted: string;
  brand: string;
}

export default function StepProductos({
  items,
  allProductos,
  unidades,
  itemValidations,
  onUpdate,
  onRemove,
  onPickImage,
  onAddProduct,
  surface,
  border,
  fg,
  muted,
  brand,
}: StepProductosProps): React.JSX.Element {
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
          <MaterialCommunityIcons
            name="package-variant"
            size={48}
            color={muted}
          />
          <Text
            style={{
              fontSize: 15,
              fontWeight: '500',
              color: fg,
              marginTop: 12,
              textAlign: 'center',
            }}
          >
            No hay productos agregados
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: muted,
              textAlign: 'center',
              marginTop: 4,
            }}
          >
            Tocá el botón para agregar tu primer producto
          </Text>
        </View>
      ) : (
        items.map((item) => (
          <WizardItemCard
            key={item.tempId}
            item={item}
            allProductos={allProductos}
            unidades={unidades}
            validation={itemValidations.get(item.tempId)}
            onUpdate={onUpdate}
            onRemove={onRemove}
            onPickImage={onPickImage}
          />
        ))
      )}

      <Pressable
        onPress={onAddProduct}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          backgroundColor: surface,
          borderRadius: 16,
          borderWidth: 2,
          borderColor: brand,
          borderStyle: 'dashed',
          paddingVertical: 16,
          marginTop: 12,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <MaterialCommunityIcons name="plus" size={20} color={brand} />
        <Text style={{ fontSize: 15, fontWeight: '600', color: brand }}>
          Agregar producto
        </Text>
      </Pressable>
    </View>
  );
}
