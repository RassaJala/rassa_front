import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import LogoutButton from '@/components/LogoutButton';
import { useProductForm } from '@/hooks/useProductForm';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import type { Unidad } from '@/services/productos';

type Props = NativeStackScreenProps<RootStackParamList, 'AddProduct'>;

const INPUT_CLASS =
  'rounded-xl border bg-slate-50 px-4 py-3 text-base text-slate-900';

export default function AddProductScreen({
  route,
  navigation,
}: Props): React.JSX.Element {
  const productoId = route.params?.productoId;

  const {
    form,
    errors,
    categorias,
    unidades,
    isEditing,
    isLoadingProducto,
    isSaving,
    updateField,
    handleSubmit,
  } = useProductForm(productoId);

  const pickImage = async (): Promise<void> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permiso requerido',
        'Necesitamos acceso a tu galería para seleccionar una imagen.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      updateField('imagenUri', result.assets[0].uri);
    }
  };

  const onSubmit = () => {
    handleSubmit(
      () => {
        Alert.alert(
          'Éxito',
          `Producto ${isEditing ? 'actualizado' : 'creado'} correctamente.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }],
        );
      },
      () => {
        Alert.alert(
          'Error',
          `No se pudo ${isEditing ? 'actualizar' : 'crear'} el producto.`,
        );
      },
    );
  };

  if (isEditing && isLoadingProducto) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#059669" size="large" />
      </View>
    );
  }

  const inputClass = (hasError: boolean) =>
    `${INPUT_CLASS} ${hasError ? 'border-red-500' : 'border-slate-300'}`;

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row items-center justify-between border-b border-slate-200 px-4 pb-3 pt-12">
        <Text className="text-lg font-semibold text-slate-900">
          {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
        </Text>
        <LogoutButton mode="text" />
      </View>

      <ScrollView
        className="flex-1 px-4 py-4"
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          onPress={pickImage}
          className="mb-4 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50"
          style={{ height: 180 }}
          accessibilityRole="button"
          accessibilityLabel="Seleccionar imagen"
        >
          {form.imagenUri ? (
            <Image
              source={{ uri: form.imagenUri }}
              className="h-full w-full rounded-xl"
              resizeMode="cover"
            />
          ) : (
            <View className="items-center">
              <Text className="text-4xl text-slate-400">📷</Text>
              <Text className="mt-2 text-sm text-slate-500">
                Toca para seleccionar imagen
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <View className="mb-4">
          <Text className="mb-1 text-sm font-medium text-slate-700">
            Nombre del producto *
          </Text>
          <TextInput
            className={inputClass(!!errors.nombre_producto)}
            placeholder="Ej: Tomate rojo"
            placeholderTextColor="#94a3b8"
            value={form.nombre}
            onChangeText={(v) => updateField('nombre', v)}
          />
          {errors.nombre_producto ? (
            <Text className="mt-1 text-xs text-red-500">
              {errors.nombre_producto}
            </Text>
          ) : null}
        </View>

        <View className="mb-4">
          <Text className="mb-1 text-sm font-medium text-slate-700">
            Descripción
          </Text>
          <TextInput
            className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-base text-slate-900"
            placeholder="Descripción del producto..."
            placeholderTextColor="#94a3b8"
            value={form.descripcion}
            onChangeText={(v) => updateField('descripcion', v)}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <View className="mb-4 flex-row gap-3">
          <View className="flex-1">
            <Text className="mb-1 text-sm font-medium text-slate-700">
              Precio ($) *
            </Text>
            <TextInput
              className={inputClass(!!errors.precio)}
              placeholder="0.00"
              placeholderTextColor="#94a3b8"
              value={form.precio}
              onChangeText={(v) => updateField('precio', v)}
              keyboardType="decimal-pad"
            />
            {errors.precio ? (
              <Text className="mt-1 text-xs text-red-500">{errors.precio}</Text>
            ) : null}
          </View>

          <View className="flex-1">
            <Text className="mb-1 text-sm font-medium text-slate-700">
              Stock *
            </Text>
            <TextInput
              className={inputClass(!!errors.stock)}
              placeholder="0"
              placeholderTextColor="#94a3b8"
              value={form.stock}
              onChangeText={(v) => updateField('stock', v)}
              keyboardType="number-pad"
            />
            {errors.stock ? (
              <Text className="mt-1 text-xs text-red-500">{errors.stock}</Text>
            ) : null}
          </View>
        </View>

        <View className="mb-4">
          <Text className="mb-1 text-sm font-medium text-slate-700">
            Categoría *
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {categorias.map((cat) => (
              <TouchableOpacity
                key={cat.id_categoria}
                onPress={() => updateField('fkCategoria', cat.id_categoria)}
                className={`rounded-full border px-3 py-2 ${
                  form.fkCategoria === cat.id_categoria
                    ? 'border-emerald-600 bg-emerald-600'
                    : 'border-slate-300 bg-white'
                }`}
                accessibilityRole="button"
                accessibilityState={{
                  selected: form.fkCategoria === cat.id_categoria,
                }}
              >
                <Text
                  className={`text-sm font-medium ${
                    form.fkCategoria === cat.id_categoria
                      ? 'text-white'
                      : 'text-slate-700'
                  }`}
                >
                  {cat.nombre}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {errors.fk_categoria ? (
            <Text className="mt-1 text-xs text-red-500">
              {errors.fk_categoria}
            </Text>
          ) : null}
        </View>

        <View className="mb-4">
          <Text className="mb-1 text-sm font-medium text-slate-700">
            Unidad de medida *
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {unidades.map((u: Unidad) => (
              <TouchableOpacity
                key={u.id_unidad}
                onPress={() => updateField('fkUnidad', u.id_unidad)}
                className={`rounded-full border px-3 py-2 ${
                  form.fkUnidad === u.id_unidad
                    ? 'border-emerald-600 bg-emerald-600'
                    : 'border-slate-300 bg-white'
                }`}
                accessibilityRole="button"
                accessibilityState={{
                  selected: form.fkUnidad === u.id_unidad,
                }}
              >
                <Text
                  className={`text-sm font-medium ${
                    form.fkUnidad === u.id_unidad
                      ? 'text-white'
                      : 'text-slate-700'
                  }`}
                >
                  {u.tipo}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {errors.fk_unidad ? (
            <Text className="mt-1 text-xs text-red-500">
              {errors.fk_unidad}
            </Text>
          ) : null}
        </View>

        <View className="mb-6 flex-row items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <View>
            <Text className="text-sm font-medium text-slate-700">
              ¿Es perecedero?
            </Text>
            <Text className="text-xs text-slate-500">
              Producto con fecha de caducidad
            </Text>
          </View>
          <Switch
            value={form.esPerecedero}
            onValueChange={(v) => updateField('esPerecedero', v)}
            trackColor={{ false: '#d1d5db', true: '#86efac' }}
            thumbColor={form.esPerecedero ? '#16a34a' : '#f3f4f6'}
          />
        </View>

        <TouchableOpacity
          onPress={onSubmit}
          disabled={isSaving}
          className={`items-center rounded-xl py-4 ${
            isSaving ? 'bg-emerald-400' : 'bg-emerald-600'
          }`}
          accessibilityRole="button"
          accessibilityLabel={
            isEditing ? 'Actualizar producto' : 'Crear producto'
          }
        >
          {isSaving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-base font-semibold text-white">
              {isEditing ? 'Actualizar Producto' : 'Crear Producto'}
            </Text>
          )}
        </TouchableOpacity>

        <View className="h-8" />
      </ScrollView>
    </View>
  );
}
