import React from 'react';
import { Image, Pressable, Text, TextInput, View } from 'react-native';

import { colors } from '@/constants/colors';
import type {
  WizardItemDraft,
  WizardItemField,
} from '@/hooks/usePublicationWizard';
import type { Producto } from '@/services/productos';

const PLACEHOLDER_COLOR = colors.iconMuted;

export default function WizardItemCard({
  item,
  allProductos,
  unidades,
  validation,
  onUpdate,
  onRemove,
  onPickImage,
}: {
  item: WizardItemDraft;
  allProductos: Producto[];
  unidades: { id_unidad: number; tipo: string }[];
  validation:
    | { stock?: string; precio?: string; fk_unidad?: string; foto?: string }
    | undefined;
  onUpdate: (
    tempId: string,
    field: WizardItemField,
    value: string | number | null,
  ) => void;
  onRemove: (tempId: string) => void;
  onPickImage: (tempId: string) => void;
}): React.JSX.Element {
  const producto = allProductos.find((p) => p.id_producto === item.fk_producto);
  const nombre =
    producto?.nombre_producto ??
    'Producto no disponible (eliminado del catálogo)';

  return (
    <View className="mb-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {nombre}
        </Text>
        <Pressable
          onPress={() => onRemove(item.tempId)}
          accessibilityRole="button"
          accessibilityLabel={`Eliminar ${nombre}`}
        >
          <Text className="text-xs text-red-500">Eliminar</Text>
        </Pressable>
      </View>

      {!producto ? (
        <Text className="mb-2 text-xs text-red-500">
          Este producto fue eliminado del catálogo y ya no se puede publicar.
          Quitalo de la publicación para continuar.
        </Text>
      ) : null}

      {/* Photo */}
      <Pressable
        onPress={() => onPickImage(item.tempId)}
        className={`mb-3 h-24 items-center justify-center rounded-lg border-2 border-dashed ${
          validation?.foto
            ? 'border-red-400 bg-red-50 dark:bg-red-950'
            : 'border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800'
        }`}
        accessibilityRole="button"
        accessibilityLabel="Seleccionar imagen"
      >
        {item.foto ? (
          <Image
            source={{ uri: item.foto }}
            className="h-full w-full rounded-lg"
            resizeMode="cover"
          />
        ) : (
          <Text className="text-xs text-gray-400 dark:text-gray-500">
            Toca para foto
          </Text>
        )}
      </Pressable>
      {validation?.foto ? (
        <Text className="mb-2 text-xs text-red-500">{validation.foto}</Text>
      ) : null}

      {/* Stock and Price */}
      <View className="mb-2 flex-row gap-2">
        <View className="flex-1">
          <TextInput
            className={`rounded-lg border bg-gray-50 px-3 py-2 text-sm text-gray-900 dark:bg-gray-800 dark:text-gray-100 ${
              validation?.stock
                ? 'border-red-500'
                : 'border-gray-300 dark:border-gray-600'
            }`}
            placeholder="Stock"
            placeholderTextColor={PLACEHOLDER_COLOR}
            value={item.stock}
            onChangeText={(v) => onUpdate(item.tempId, 'stock', v)}
            keyboardType="number-pad"
          />
          {validation?.stock ? (
            <Text className="mt-0.5 text-xs text-red-500">
              {validation.stock}
            </Text>
          ) : null}
        </View>

        <View className="flex-1">
          <TextInput
            className={`rounded-lg border bg-gray-50 px-3 py-2 text-sm text-gray-900 dark:bg-gray-800 dark:text-gray-100 ${
              validation?.precio
                ? 'border-red-500'
                : 'border-gray-300 dark:border-gray-600'
            }`}
            placeholder="Precio ($)"
            placeholderTextColor={PLACEHOLDER_COLOR}
            value={item.precio}
            onChangeText={(v) => onUpdate(item.tempId, 'precio', v)}
            keyboardType="decimal-pad"
          />
          {validation?.precio ? (
            <Text className="mt-0.5 text-xs text-red-500">
              {validation.precio}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Unidad — loaded from API */}
      <View>
        <Text className="mb-1 text-xs text-gray-500 dark:text-gray-400">
          Unidad
        </Text>
        <View className="flex-row flex-wrap gap-1.5">
          {unidades.map((u) => (
            <Pressable
              key={u.id_unidad}
              onPress={() => onUpdate(item.tempId, 'fk_unidad', u.id_unidad)}
              className={`rounded-full border px-2.5 py-1 ${
                item.fk_unidad === u.id_unidad
                  ? 'border-brand-coral bg-brand-coral'
                  : 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800'
              }`}
              accessibilityRole="button"
              accessibilityState={{ selected: item.fk_unidad === u.id_unidad }}
            >
              <Text
                className={`text-xs font-medium ${
                  item.fk_unidad === u.id_unidad
                    ? 'text-white'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                {u.tipo}
              </Text>
            </Pressable>
          ))}
        </View>
        {validation?.fk_unidad ? (
          <Text className="mt-0.5 text-xs text-red-500">
            {validation.fk_unidad}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
