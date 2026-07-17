import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button, Dialog, Portal } from 'react-native-paper';

import * as ImagePicker from 'expo-image-picker';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import Toast from '@/components/Toast';
import { colors } from '@/constants/colors';
import api, { mediaUrl } from '@/services/api';
import * as Storage from '@/services/storage';
import type {
  ApiResponse,
  Category,
  FarmerStackParamList,
  Producto,
  Unidad,
} from '@/types';
import { extractApiError } from '@/utils/apiError';

type NavigationProp = NativeStackNavigationProp<
  FarmerStackParamList,
  'ProductForm'
>;

interface Props {
  readonly navigation: NavigationProp;
  readonly route: { params: { productoId?: number } };
}

interface FormErrors {
  nombre_producto?: string | undefined;
  precio?: string | undefined;
  fk_categoria?: string | undefined;
}

interface ProductImageState {
  id?: number | undefined;
  uri: string;
  base64?: string | undefined;
  isPrimary: boolean;
  markedForDeletion?: boolean | undefined;
}

export default function ProductFormScreen({
  navigation,
  route,
}: Props): React.JSX.Element {
  const { productoId } = route.params;
  const isEditing = Boolean(productoId);
  const queryClient = useQueryClient();

  const [nombreProducto, setNombreProducto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [stock, setStock] = useState('0');
  const [esPerecedero, setEsPerecedero] = useState(false);
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [unidadId, setUnidadId] = useState<number | null>(null);
  const [images, setImages] = useState<ProductImageState[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const [categoriaModalVisible, setCategoriaModalVisible] = useState(false);
  const [unidadModalVisible, setUnidadModalVisible] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const { data: categories } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Category[]>>('/categorias/');
      return data.data;
    },
    staleTime: 60_000,
  });

  const { data: units } = useQuery<Unidad[]>({
    queryKey: ['units'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Unidad[]>>('/unidades/');
      return data.data;
    },
    staleTime: 60_000,
  });

  const { data: existingProduct, isLoading: loadingProduct } = useQuery<Producto>({
    queryKey: ['producto', productoId],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Producto>>(
        `/productos/${productoId}/`,
      );
      return data.data;
    },
    enabled: isEditing,
  });

  useEffect(() => {
    if (existingProduct) {
      setNombreProducto(existingProduct.nombre_producto);
      setDescripcion(existingProduct.descripcion ?? '');
      setPrecio(existingProduct.precio);
      setStock(String(existingProduct.stock));
      setEsPerecedero(existingProduct.es_perecedero);
      setCategoriaId(existingProduct.categoria.id_categoria);
      setUnidadId(existingProduct.unidad?.id_unidad ?? null);
      if (existingProduct.imagenes && existingProduct.imagenes.length > 0) {
        setImages(
          existingProduct.imagenes.map((img) => ({
            id: img.id_imagen,
            uri: mediaUrl(img.url) ?? img.url,
            base64: undefined,
            isPrimary: img.es_principal,
          }))
        );
      } else {
        const fallbackImage = existingProduct.imagen_principal ?? existingProduct.imagen;
        if (fallbackImage) {
          setImages([{
            uri: mediaUrl(fallbackImage) ?? fallbackImage,
            isPrimary: true,
            base64: undefined,
          }]);
        }
      }
    }
  }, [existingProduct]);

  const validate = useCallback((): FormErrors => {
    const newErrors: FormErrors = {};
    if (!nombreProducto.trim()) {
      newErrors.nombre_producto = 'El nombre es obligatorio.';
    }
    const precioNum = parseFloat(precio);
    if (!precio || isNaN(precioNum) || precioNum <= 0) {
      newErrors.precio = 'El precio debe ser mayor a 0.';
    }
    if (!categoriaId) {
      newErrors.fk_categoria = 'Seleccioná una categoría.';
    }
    return newErrors;
  }, [nombreProducto, precio, categoriaId]);

  const pickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setToastMessage('Se necesita permiso para acceder a la galería.');
      setToastType('error');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setImages((prev) => [
        ...prev,
        {
          uri: asset.uri,
          base64: asset.base64 ?? undefined,
          isPrimary: prev.filter((img) => !img.markedForDeletion).length === 0,
        },
      ]);
    }
  }, []);

  const handleSetPrimaryImage = useCallback((indexToSet: number) => {
    setImages((prev) =>
      prev.map((img, index) => ({
        ...img,
        isPrimary: index === indexToSet,
      }))
    );
  }, []);

  const handleRemoveImage = useCallback((indexToRemove: number) => {
    setImages((prev) => {
      const next = [...prev];
      const target = next[indexToRemove];
      if (!target) return next;

      if (target.id) {
        target.markedForDeletion = true;
        target.isPrimary = false;
      } else {
        next.splice(indexToRemove, 1);
      }

      if (!next.some((img) => img.isPrimary && !img.markedForDeletion)) {
        const firstAvailable = next.find((img) => !img.markedForDeletion);
        if (firstAvailable) firstAvailable.isPrimary = true;
      }
      return next;
    });
  }, []);

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.post<ApiResponse<Producto>>(
        '/productos/',
        payload,
      );
      return data.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.patch<ApiResponse<Producto>>(
        `/productos/${productoId}/`,
        payload,
      );
      return data.data;
    },
  });

  const uploadImage = useCallback(
    async (productId: number, base64: string, isPrimary: boolean) => {
      await api.post(`/productos/${productId}/imagen/`, {
        imagen_base64: base64,
        es_principal: isPrimary,
      });
    },
    [],
  );

  const deleteImage = useCallback(async (productId: number, imageId: number) => {
    await api.delete(`/productos/${productId}/imagen/${imageId}/`);
  }, []);

  const updateImagePrimary = useCallback(async (productId: number, imageId: number, isPrimary: boolean) => {
    await api.patch(`/productos/${productId}/imagen/${imageId}/`, { es_principal: isPrimary });
  }, []);

  const handleSave = useCallback(async () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setGeneralError(null);

    const payload: Record<string, unknown> = {
      nombre_producto: nombreProducto.trim(),
      descripcion: descripcion.trim(),
      precio: parseFloat(precio),
      stock: parseInt(stock, 10) || 0,
      es_perecedero: esPerecedero,
      fk_categoria: categoriaId,
      fk_unidad: unidadId,
      estado: true,
    };

    try {
      let savedProduct: Producto;
      if (isEditing) {
        savedProduct = await updateMutation.mutateAsync(payload);
      } else {
        savedProduct = await createMutation.mutateAsync(payload);
      }

      for (const img of images) {
        if (img.markedForDeletion && img.id) {
          await deleteImage(savedProduct.id_producto, img.id);
        } else if (!img.id && !img.markedForDeletion && img.base64) {
          await uploadImage(savedProduct.id_producto, img.base64, img.isPrimary);
        } else if (img.id && !img.markedForDeletion && img.isPrimary) {
          await updateImagePrimary(savedProduct.id_producto, img.id, true);
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['productos'] });
      setToastMessage(
        isEditing ? 'Producto actualizado.' : 'Producto creado.',
      );
      setToastType('success');
      globalThis.setTimeout(() => navigation.goBack(), 800);
    } catch (error) {
      setGeneralError(extractApiError(error, ['nombre_producto', 'precio', 'fk_categoria', 'detail']));
    }
  }, [
    validate,
    nombreProducto,
    descripcion,
    precio,
    stock,
    esPerecedero,
    categoriaId,
    unidadId,
    images,
    isEditing,
    createMutation,
    updateMutation,
    uploadImage,
    deleteImage,
    updateImagePrimary,
    queryClient,
    navigation,
  ]);

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const selectedCategoryName =
    categories?.find((c) => c.id_categoria === categoriaId)?.nombre ?? '';
  const selectedUnitName =
    units?.find((u) => u.id_unidad === unidadId)?.tipo ?? '';

  if (loadingProduct) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color={colors.brandGreenForest} />
      </View>
    );
  }

  return (
    <View className="flex-1 justify-center bg-black/50 py-4">
      <View className="w-[50%] self-center max-h-[95%] overflow-hidden rounded-md bg-white shadow-xl">
        {/* Header */}
        <View className="bg-brand-green-forest px-4 py-4 shadow-sm">
          <View className="flex-row items-center">
            <Pressable
              onPress={() => navigation.goBack()}
              className="mr-3 h-10 w-10 items-center justify-center rounded-full active:opacity-80"
              hitSlop={12}
            >
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={colors.iconWhite}
              />
            </Pressable>
            <Text className="text-xl font-bold tracking-tight text-white">
              {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
            </Text>
          </View>
        </View>

      <ScrollView
        contentContainerClassName="p-4 pb-6 gap-4"
        keyboardShouldPersistTaps="handled"
      >
        {/* General error */}
        {generalError ? (
          <View className="flex-row items-start gap-2 rounded-lg bg-red-50 p-3">
            <MaterialCommunityIcons
              name="alert-circle"
              size={18}
              color={colors.error}
            />
            <Text className="flex-1 text-sm leading-5 text-red-600">
              {generalError}
            </Text>
          </View>
        ) : null}

        {/* Image picker */}
        <View>
          <Text className="mb-2 ml-1 text-sm font-medium text-gray-700">
            Fotos del producto
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 flex-grow justify-center">
            {images
              .map((img, index) => ({ img, index }))
              .filter(({ img }) => !img.markedForDeletion)
              .map(({ img, index }) => (
                <View key={img.id ?? img.uri} className="relative">
                  <Image
                    source={{ uri: img.uri }}
                    className="h-48 w-48 rounded-md"
                    resizeMode="cover"
                  />
                  <View className="absolute inset-x-0 bottom-0 flex-row justify-between rounded-b-md bg-black/50 px-2 py-1">
                    <Pressable onPress={() => handleSetPrimaryImage(index)} hitSlop={8}>
                      <MaterialCommunityIcons
                        name={img.isPrimary ? "star" : "star-outline"}
                        size={20}
                        color={img.isPrimary ? "#fbbf24" : "white"}
                      />
                    </Pressable>
                    <Pressable onPress={() => handleRemoveImage(index)} hitSlop={8}>
                      <MaterialCommunityIcons name="delete-outline" size={20} color="white" />
                    </Pressable>
                  </View>
                </View>
              ))}
            <Pressable
              onPress={() => void pickImage()}
              className="h-48 w-48 items-center justify-center rounded-md border-2 border-dashed border-gray-300 bg-gray-100 active:opacity-80"
            >
              <MaterialCommunityIcons name="camera-plus-outline" size={32} color={colors.iconMuted} />
              <Text className="mt-1 px-2 text-center text-xs text-gray-500">Agregar imagen</Text>
            </Pressable>
          </ScrollView>
        </View>

        {/* Nombre */}
        <View>
          <Text className="mb-1 ml-1 text-sm font-medium text-gray-700">
            Nombre del producto <Text className="text-red-500">*</Text>
          </Text>
          <TextInput
            className="rounded-md border border-gray-300 bg-white px-4 py-3 text-base text-brand-ink outline-none"
            style={{ outlineStyle: 'none' } as any}
            placeholder="Ej. Tomates frescos"
            placeholderTextColor={colors.iconMuted}
            cursorColor={colors.brandGreenForest}
            value={nombreProducto}
            onChangeText={(text) => {
              setNombreProducto(text);
              setErrors((prev) => {
                const next = { ...prev };
                delete next.nombre_producto;
                return next;
              });
            }}
          />
          {errors.nombre_producto ? (
            <Text className="mt-1 ml-1 text-xs text-red-500">
              {errors.nombre_producto}
            </Text>
          ) : null}
        </View>

        {/* Descripción */}
        <View>
          <Text className="mb-1 ml-1 text-sm font-medium text-gray-700">
            Descripción
          </Text>
          <TextInput
            className="rounded-md border border-gray-300 bg-white px-4 py-3 text-base text-brand-ink outline-none"
            style={{ outlineStyle: 'none' } as any}
            placeholder="Ej. Detalles sobre tu producto..."
          placeholderTextColor={colors.iconMuted}
          cursorColor={colors.brandGreenForest}
          value={descripcion}
          onChangeText={setDescripcion}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
        </View>

        {/* Precio */}
        <View>
          <Text className="mb-1 ml-1 text-sm font-medium text-gray-700">
            Precio <Text className="text-red-500">*</Text>
          </Text>
          <TextInput
            className="rounded-md border border-gray-300 bg-white px-4 py-3 text-base text-brand-ink outline-none"
            style={{ outlineStyle: 'none' } as any}
            placeholder="0.00"
            placeholderTextColor={colors.iconMuted}
            cursorColor={colors.brandGreenForest}
            value={precio}
            onChangeText={(text) => {
              setPrecio(text.replace(/[^.0-9]/g, ''));
              setErrors((prev) => {
                const next = { ...prev };
                delete next.precio;
                return next;
              });
            }}
            keyboardType="decimal-pad"
          />
          {errors.precio ? (
            <Text className="mt-1 ml-1 text-xs text-red-500">
              {errors.precio}
            </Text>
          ) : null}
        </View>

        {/* Stock */}
        <View>
          <Text className="mb-1 ml-1 text-sm font-medium text-gray-700">
            Stock disponible
          </Text>
          <TextInput
            className="rounded-md border border-gray-300 bg-white px-4 py-3 text-base text-brand-ink outline-none"
            style={{ outlineStyle: 'none' } as any}
            placeholder="0"
            placeholderTextColor={colors.iconMuted}
            cursorColor={colors.brandGreenForest}
            value={stock}
            onChangeText={(text) => setStock(text.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
          />
        </View>

        {/* Perecedero */}
        <View className="flex-row items-center justify-between rounded-md bg-white px-4 py-3 border border-gray-300">
          <Text className="text-base text-brand-ink">
            Producto perecedero
          </Text>
          <Switch
            value={esPerecedero}
            onValueChange={setEsPerecedero}
            trackColor={{ true: colors.brandGreenForest }}
          />
        </View>

        {/* Categoría selector */}
        <View>
          <Pressable
            onPress={() => setCategoriaModalVisible(true)}
            className="flex-row items-center justify-between rounded-md border border-gray-300 bg-white px-4 py-3"
          >
            <Text
              className={`text-base ${selectedCategoryName ? 'text-brand-ink' : 'text-gray-400'}`}
            >
              {selectedCategoryName || 'Categoría *'}
            </Text>
            <MaterialCommunityIcons
              name="chevron-down"
              size={20}
              color={colors.iconMuted}
            />
          </Pressable>
          {errors.fk_categoria ? (
            <Text className="mt-1 ml-1 text-xs text-red-500">
              {errors.fk_categoria}
            </Text>
          ) : null}
        </View>

        {/* Unidad selector */}
        <Pressable
          onPress={() => setUnidadModalVisible(true)}
          className="flex-row items-center justify-between rounded-md border border-gray-300 bg-white px-4 py-3"
        >
          <Text
            className={`text-base ${selectedUnitName ? 'text-brand-ink' : 'text-gray-400'}`}
          >
            {selectedUnitName || 'Unidad de medida'}
          </Text>
          <MaterialCommunityIcons
            name="chevron-down"
            size={20}
            color={colors.iconMuted}
          />
        </Pressable>

        {/* Save button */}
        <Button
          mode="contained"
          buttonColor={colors.brandGreenForest}
          onPress={handleSave}
          loading={isSaving}
          disabled={isSaving}
          className="mt-2"
        >
          {isEditing ? 'Guardar cambios' : 'Crear producto'}
        </Button>
      </ScrollView>
      </View>

      {/* Category modal */}
      <Portal>
        <Dialog
          visible={categoriaModalVisible}
          onDismiss={() => setCategoriaModalVisible(false)}
        >
          <Dialog.Title className="text-xl font-bold text-brand-ink">
            Seleccionar categoría
          </Dialog.Title>
          <Dialog.Content>
            <FlatList
              data={categories}
              keyExtractor={(item) => String(item.id_categoria)}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setCategoriaId(item.id_categoria);
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.fk_categoria;
                      return next;
                    });
                    setCategoriaModalVisible(false);
                  }}
                  className={`flex-row items-center justify-between rounded-lg px-4 py-3 ${
                    categoriaId === item.id_categoria
                      ? 'bg-brand-green-forest/10'
                      : ''
                  }`}
                >
                  <Text className="text-base text-brand-ink">
                    {item.nombre}
                  </Text>
                  {categoriaId === item.id_categoria ? (
                    <MaterialCommunityIcons
                      name="check"
                      size={20}
                      color={colors.brandGreenForest}
                    />
                  ) : null}
                </Pressable>
              )}
              ItemSeparatorComponent={() => (
                <View className="h-px bg-gray-100" />
              )}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => setCategoriaModalVisible(false)}
              textColor={colors.textSecondary}
            >
              Cancelar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Unit modal */}
      <Portal>
        <Dialog
          visible={unidadModalVisible}
          onDismiss={() => setUnidadModalVisible(false)}
        >
          <Dialog.Title className="text-xl font-bold text-brand-ink">
            Seleccionar unidad
          </Dialog.Title>
          <Dialog.Content>
            <FlatList
              data={units}
              keyExtractor={(item) => String(item.id_unidad)}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setUnidadId(item.id_unidad);
                    setUnidadModalVisible(false);
                  }}
                  className={`flex-row items-center justify-between rounded-lg px-4 py-3 ${
                    unidadId === item.id_unidad
                      ? 'bg-brand-green-forest/10'
                      : ''
                  }`}
                >
                  <Text className="text-base text-brand-ink">
                    {item.tipo}
                  </Text>
                  {unidadId === item.id_unidad ? (
                    <MaterialCommunityIcons
                      name="check"
                      size={20}
                      color={colors.brandGreenForest}
                    />
                  ) : null}
                </Pressable>
              )}
              ItemSeparatorComponent={() => (
                <View className="h-px bg-gray-100" />
              )}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => setUnidadModalVisible(false)}
              textColor={colors.textSecondary}
            >
              Cancelar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Toast */}
      <Toast
        visible={toastMessage !== null}
        message={toastMessage ?? ''}
        type={toastType}
        onDismiss={() => {
          setToastMessage(null);
          setToastType('success');
        }}
      />
    </View>
  );
}
