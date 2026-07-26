import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import WizardItemCard from '@/components/wizard/WizardItemCard';
import { themeColors } from '@/constants/colors';
import type { WizardItemDraft, WizardItemValidation } from '@/hooks/usePublicationWizard';
import type { Producto, Unidad } from '@/services/productos';

interface ProductosStepProps {
  items: WizardItemDraft[];
  allProductos: Producto[];
  unidades: Unidad[];
  itemValidations: Map<string, WizardItemValidation>;
  onUpdate: (
    tempId: string,
    field: 'fk_unidad' | 'stock' | 'precio' | 'foto',
    value: string | number | null,
  ) => void;
  onRemove: (tempId: string) => void;
  onPickImage: (tempId: string) => void;
  onAddProduct: () => void;
  isDark: boolean;
}

export default function ProductosStep({
  items,
  allProductos,
  unidades,
  itemValidations,
  onUpdate,
  onRemove,
  onPickImage,
  onAddProduct,
  isDark,
}: ProductosStepProps): React.JSX.Element {
  const theme = themeColors(isDark);

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
        <MaterialCommunityIcons
          name="package-variant"
          size={48}
          color={theme.muted}
        />
        <Text
          style={{
            fontSize: 15,
            fontWeight: '500',
            color: theme.fg,
            marginTop: 12,
            textAlign: 'center',
          }}
        >
          No hay productos agregados
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: theme.muted,
            textAlign: 'center',
            marginTop: 4,
          }}
        >
          Tocá el botón para agregar tu primer producto
        </Text>
      </View>
    );
  }

  return (
    <View>
      {items.map((item) => (
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
      ))}

      <Pressable
        onPress={onAddProduct}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          backgroundColor: theme.surface,
          borderRadius: 16,
          borderWidth: 2,
          borderColor: theme.brand,
          borderStyle: 'dashed',
          paddingVertical: 16,
          marginTop: 12,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <MaterialCommunityIcons name="plus" size={20} color={theme.brand} />
        <Text
          style={{ fontSize: 15, fontWeight: '600', color: theme.brand }}
        >
          Agregar producto
        </Text>
      </Pressable>
    </View>
  );
}
