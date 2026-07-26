import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as ImagePicker from 'expo-image-picker';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import Toast from '@/components/Toast';
import api, { mediaUrl } from '@/services/api';
import { useTheme } from '@/store/ThemeContext';
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

// eslint-disable-next-line sonarjs/cognitive-complexity -- product form with image/upload/validation logic
export default function ProductFormScreen({
  navigation,
  route,
}: Props): React.JSX.Element {
  const { colorScheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: SCREEN_WIDTH } = Dimensions.get('window');
  const isSmallScreen = SCREEN_WIDTH < 600;

  const isDark = colorScheme === 'dark';
  const brand = isDark ? '#4A8A63' : '#24563C';
  const coral = '#DE393A';
  const white = '#FFFFFF';
  const black = '#000';
  const bg = isDark ? '#1A211B' : '#F5F7F0';
  const surface = isDark ? '#263028' : '#FFFFFF';
  const fg = isDark ? '#E8EAE4' : '#2D3328';
  const muted = isDark ? '#9DA89D' : '#5E6B5E';
  const border = isDark ? '#353D35' : '#E2E6DF';
  const inputBorder = isDark ? '#4A5C4F' : '#D6DAD4';
  const accentBg = isDark ? 'rgba(74,138,99,0.12)' : 'rgba(36,86,60,0.07)';
  const coralBg = isDark ? 'rgba(232,74,74,0.12)' : 'rgba(222,57,58,0.07)';
  const overlay = 'rgba(0,0,0,0.5)';
  const separatorColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';

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
  const setTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (setTimeoutRef.current) clearTimeout(setTimeoutRef.current);
    };
  }, []);

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

  const { data: existingProduct, isLoading: loadingProduct } =
    useQuery<Producto>({
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
      setCategoriaId(existingProduct.categoria?.id_categoria);
      setUnidadId(existingProduct.unidad?.id_unidad ?? null);
      if (existingProduct.imagenes && existingProduct.imagenes.length > 0) {
        setImages(
          existingProduct.imagenes.map((img) => ({
            id: img.id_imagen,
            uri: mediaUrl(img.url) ?? img.url,
            base64: undefined,
            isPrimary: img.es_principal,
          })),
        );
      } else {
        const fallbackImage =
          existingProduct.imagen_principal ?? existingProduct.imagen;
        if (fallbackImage) {
          setImages([
            {
              uri: mediaUrl(fallbackImage) ?? fallbackImage,
              isPrimary: true,
              base64: undefined,
            },
          ]);
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
    const { status } =
      (await ImagePicker.requestMediaLibraryPermissionsAsync()) as {
        status: string;
      };
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
      setImages([
        {
          uri: asset.uri,
          base64: asset.base64 ?? undefined,
          isPrimary: true,
        },
      ]);
    }
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

  const deleteImage = useCallback(
    async (productId: number, imageId: number) => {
      await api.delete(`/productos/${productId}/imagen/${imageId}/`);
    },
    [],
  );

  const updateImagePrimary = useCallback(
    async (productId: number, imageId: number, isPrimary: boolean) => {
      await api.patch(`/productos/${productId}/imagen/${imageId}/`, {
        es_principal: isPrimary,
      });
    },
    [],
  );

  const processImages = useCallback(
    async (productId: number) => {
      for (const img of images) {
        try {
          if (img.markedForDeletion && img.id) {
            await deleteImage(productId, img.id);
          } else if (!img.id && !img.markedForDeletion && img.base64) {
            await uploadImage(productId, img.base64, img.isPrimary);
          } else if (img.id && !img.markedForDeletion && img.isPrimary) {
            await updateImagePrimary(productId, img.id, true);
          }
        } catch (imgError) {
          console.warn('Image operation failed, continuing:', imgError);
        }
      }
    },
    [images, deleteImage, uploadImage, updateImagePrimary],
  );

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
      stock: Number.isFinite(parseInt(stock, 10)) ? parseInt(stock, 10) : 0,
      es_perecedero: esPerecedero,
      fk_categoria: categoriaId,
      fk_unidad: unidadId,
      estado: true,
    };

    try {
      const savedProduct = isEditing
        ? await updateMutation.mutateAsync(payload)
        : await createMutation.mutateAsync(payload);

      await processImages(savedProduct.id_producto);
      await queryClient.invalidateQueries({ queryKey: ['productos'] });
      setToastMessage(isEditing ? 'Producto actualizado.' : 'Producto creado.');
      setToastType('success');
      setTimeoutRef.current = globalThis.setTimeout(
        () => navigation.goBack(),
        800,
      );
    } catch (error) {
      setGeneralError(
        extractApiError(error, [
          'nombre_producto',
          'precio',
          'fk_categoria',
          'detail',
        ]),
      );
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
    isEditing,
    createMutation,
    updateMutation,
    processImages,
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
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: bg,
        }}
      >
        <ActivityIndicator size="large" color={brand} />
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        justifyContent: isSmallScreen ? 'flex-start' : 'center',
        backgroundColor: isSmallScreen ? bg : overlay,
        paddingVertical: isSmallScreen ? 0 : 16,
        zIndex: 1,
      }}
    >
      <View
        style={
          isSmallScreen
            ? { flex: 1, backgroundColor: bg }
            : {
                maxHeight: '95%',
                width: '50%',
                alignSelf: 'center',
                overflow: 'hidden',
                borderRadius: 12,
                backgroundColor: surface,
                shadowColor: black,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 10,
                elevation: 10,
                zIndex: 10,
              }
        }
      >
        {/* Header */}
        <View
          style={{
            backgroundColor: brand,
            paddingTop: isSmallScreen ? insets.top + 8 : 16,
            paddingBottom: 16,
            paddingHorizontal: 16,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={({ pressed }) => ({
                marginRight: 12,
                height: 40,
                width: 40,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 20,
                backgroundColor: 'rgba(255,255,255,0.15)',
                opacity: pressed ? 0.8 : 1,
              })}
              hitSlop={12}
            >
              <MaterialCommunityIcons name="close" size={24} color={white} />
            </Pressable>
            <Text
              style={{
                fontSize: 20,
                fontWeight: '700',
                color: white,
                letterSpacing: -0.2,
              }}
            >
              {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 24, gap: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* General error */}
          {generalError ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 8,
                borderRadius: 8,
                backgroundColor: coralBg,
                padding: 12,
              }}
            >
              <MaterialCommunityIcons
                name="alert-circle"
                size={18}
                color={coral}
              />
              <Text
                style={{ flex: 1, fontSize: 14, lineHeight: 20, color: coral }}
              >
                {generalError}
              </Text>
            </View>
          ) : null}

          {/* Image picker */}
          <View>
            <Text
              style={{
                marginBottom: 8,
                marginLeft: 4,
                fontSize: 14,
                fontWeight: '600',
                color: fg,
              }}
            >
              Foto del producto
            </Text>
            <View className="items-center">
              {(() => {
                const activeImage = images.find(
                  (img) => !img.markedForDeletion,
                );
                if (activeImage) {
                  const activeIndex = images.indexOf(activeImage);
                  return (
                    <View className="relative">
                      <Image
                        source={{ uri: activeImage.uri }}
                        className="h-48 w-48 rounded-xl"
                        resizeMode="cover"
                      />
                      <View className="absolute right-0 bottom-0 flex-row justify-end rounded-b-xl bg-black/50 px-2 py-1">
                        <Pressable
                          onPress={() => handleRemoveImage(activeIndex)}
                          hitSlop={8}
                        >
                          <MaterialCommunityIcons
                            name="delete-outline"
                            size={20}
                            color={white}
                          />
                        </Pressable>
                      </View>
                    </View>
                  );
                }
                return (
                  <Pressable
                    onPress={() => void pickImage()}
                    style={({ pressed }) => ({
                      height: 192,
                      width: 192,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 12,
                      borderWidth: 2,
                      borderStyle: 'dashed',
                      borderColor: inputBorder,
                      backgroundColor: surface,
                      opacity: pressed ? 0.8 : 1,
                    })}
                  >
                    <MaterialCommunityIcons
                      name="camera-plus-outline"
                      size={32}
                      color={muted}
                    />
                    <Text
                      style={{
                        marginTop: 8,
                        paddingHorizontal: 8,
                        textAlign: 'center',
                        fontSize: 12,
                        color: muted,
                      }}
                    >
                      Agregar imagen
                    </Text>
                  </Pressable>
                );
              })()}
            </View>
          </View>

          {/* Nombre */}
          <View>
            <Text
              style={{
                marginBottom: 4,
                marginLeft: 4,
                fontSize: 14,
                fontWeight: '600',
                color: fg,
              }}
            >
              Nombre del producto <Text style={{ color: coral }}>*</Text>
            </Text>
            <TextInput
              // @ts-expect-error -- outlineStyle is web-only CSS, absent from React Native types
              style={{
                borderRadius: 8,
                borderWidth: 1,
                borderColor: inputBorder,
                backgroundColor: surface,
                paddingHorizontal: 16,
                paddingVertical: 12,
                fontSize: 16,
                color: fg,
                outlineStyle: 'none',
              }}
              placeholder="Ej. Tomates frescos"
              placeholderTextColor={muted}
              cursorColor={brand}
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
              <Text
                style={{
                  marginLeft: 4,
                  marginTop: 4,
                  fontSize: 12,
                  color: coral,
                }}
              >
                {errors.nombre_producto}
              </Text>
            ) : null}
          </View>

          {/* Descripción */}
          <View>
            <Text
              style={{
                marginBottom: 4,
                marginLeft: 4,
                fontSize: 14,
                fontWeight: '600',
                color: fg,
              }}
            >
              Descripción
            </Text>
            <TextInput
              // @ts-expect-error -- outlineStyle is web-only CSS, absent from React Native types
              style={{
                borderRadius: 8,
                borderWidth: 1,
                borderColor: inputBorder,
                backgroundColor: surface,
                paddingHorizontal: 16,
                paddingVertical: 12,
                fontSize: 16,
                color: fg,
                outlineStyle: 'none',
              }}
              placeholder="Ej. Detalles sobre tu producto..."
              placeholderTextColor={muted}
              cursorColor={brand}
              value={descripcion}
              onChangeText={setDescripcion}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Precio */}
          <View>
            <Text
              style={{
                marginBottom: 4,
                marginLeft: 4,
                fontSize: 14,
                fontWeight: '600',
                color: fg,
              }}
            >
              Precio <Text style={{ color: coral }}>*</Text>
            </Text>
            <TextInput
              // @ts-expect-error -- outlineStyle is web-only CSS, absent from React Native types
              style={{
                borderRadius: 8,
                borderWidth: 1,
                borderColor: inputBorder,
                backgroundColor: surface,
                paddingHorizontal: 16,
                paddingVertical: 12,
                fontSize: 16,
                color: fg,
                outlineStyle: 'none',
              }}
              placeholder="0.00"
              placeholderTextColor={muted}
              cursorColor={brand}
              value={precio}
              onChangeText={(text) => {
                setPrecio(
                  text.replace(/[^.0-9]/g, '').replace(/(\..*)\./g, '$1'),
                );
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.precio;
                  return next;
                });
              }}
              keyboardType="decimal-pad"
            />
            {errors.precio ? (
              <Text
                style={{
                  marginLeft: 4,
                  marginTop: 4,
                  fontSize: 12,
                  color: coral,
                }}
              >
                {errors.precio}
              </Text>
            ) : null}
          </View>

          {/* Stock */}
          <View>
            <Text
              style={{
                marginBottom: 4,
                marginLeft: 4,
                fontSize: 14,
                fontWeight: '600',
                color: fg,
              }}
            >
              Stock disponible
            </Text>
            <TextInput
              // @ts-expect-error -- outlineStyle is web-only CSS, absent from React Native types
              style={{
                borderRadius: 8,
                borderWidth: 1,
                borderColor: inputBorder,
                backgroundColor: surface,
                paddingHorizontal: 16,
                paddingVertical: 12,
                fontSize: 16,
                color: fg,
                outlineStyle: 'none',
              }}
              placeholder="0"
              placeholderTextColor={muted}
              cursorColor={brand}
              value={stock}
              onChangeText={(text) => setStock(text.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
            />
          </View>

          {/* Perecedero */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderRadius: 8,
              borderWidth: 1,
              borderColor: inputBorder,
              backgroundColor: surface,
              paddingHorizontal: 16,
              paddingVertical: 12,
            }}
          >
            <Text style={{ fontSize: 16, color: fg }}>Producto perecedero</Text>
            <Switch
              value={esPerecedero}
              onValueChange={setEsPerecedero}
              trackColor={{
                true: brand,
                false: isDark ? '#353D35' : '#E2E6DF',
              }}
            />
          </View>

          {/* Categoría selector */}
          <View>
            <Pressable
              onPress={() => setCategoriaModalVisible(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: inputBorder,
                backgroundColor: surface,
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  color: selectedCategoryName ? fg : muted,
                }}
              >
                {selectedCategoryName || 'Categoría *'}
              </Text>
              <MaterialCommunityIcons
                name="chevron-down"
                size={20}
                color={muted}
              />
            </Pressable>
            {errors.fk_categoria ? (
              <Text
                style={{
                  marginLeft: 4,
                  marginTop: 4,
                  fontSize: 12,
                  color: coral,
                }}
              >
                {errors.fk_categoria}
              </Text>
            ) : null}
          </View>

          {/* Unidad selector */}
          <Pressable
            onPress={() => setUnidadModalVisible(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderRadius: 8,
              borderWidth: 1,
              borderColor: inputBorder,
              backgroundColor: surface,
              paddingHorizontal: 16,
              paddingVertical: 12,
            }}
          >
            <Text
              style={{ fontSize: 16, color: selectedUnitName ? fg : muted }}
            >
              {selectedUnitName || 'Unidad de medida'}
            </Text>
            <MaterialCommunityIcons
              name="chevron-down"
              size={20}
              color={muted}
            />
          </Pressable>

          {/* Save button */}
          <Button
            mode="contained"
            buttonColor={brand}
            onPress={handleSave}
            loading={isSaving}
            disabled={isSaving}
            className="mt-2 rounded-lg"
          >
            {isEditing ? 'Guardar cambios' : 'Crear producto'}
          </Button>
        </ScrollView>
      </View>

      {/* Category modal */}
      <Modal
        visible={categoriaModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCategoriaModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            backgroundColor: overlay,
          }}
        >
          <View
            style={{
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              backgroundColor: bg,
              maxHeight: '70%',
              paddingBottom: insets.bottom,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 20,
                paddingBottom: 12,
                paddingTop: 20,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: '700', color: fg }}>
                Seleccionar categoría
              </Text>
              <Pressable
                onPress={() => setCategoriaModalVisible(false)}
                hitSlop={8}
              >
                <MaterialCommunityIcons name="close" size={24} color={muted} />
              </Pressable>
            </View>
            <View
              style={{
                marginHorizontal: 20,
                height: 1,
                backgroundColor: border,
              }}
            />
            <FlatList
              data={categories}
              keyExtractor={(item) => String(item.id_categoria)}
              contentContainerStyle={{ paddingTop: 12, paddingBottom: 8 }}
              renderItem={({ item }) => {
                const isSelected = categoriaId === item.id_categoria;
                return (
                  <Pressable
                    key={item.id_categoria}
                    onPress={() => {
                      setCategoriaId(item.id_categoria);
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.fk_categoria;
                        return next;
                      });
                      setCategoriaModalVisible(false);
                    }}
                    style={({ pressed }) => ({
                      marginHorizontal: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderRadius: 12,
                      paddingHorizontal: 20,
                      paddingVertical: 16,
                      backgroundColor: isSelected ? accentBg : 'transparent',
                      opacity: pressed ? 0.6 : 1,
                    })}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: isSelected ? '600' : '400',
                        color: isSelected ? brand : fg,
                      }}
                    >
                      {item.nombre}
                    </Text>
                    {isSelected ? (
                      <MaterialCommunityIcons
                        name="check"
                        size={20}
                        color={brand}
                      />
                    ) : null}
                  </Pressable>
                );
              }}
              ItemSeparatorComponent={() => (
                <View
                  style={{
                    marginHorizontal: 20,
                    height: 1,
                    backgroundColor: separatorColor,
                  }}
                />
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Unit modal */}
      <Modal
        visible={unidadModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setUnidadModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            backgroundColor: overlay,
          }}
        >
          <View
            style={{
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              backgroundColor: bg,
              maxHeight: '70%',
              paddingBottom: insets.bottom,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 20,
                paddingBottom: 12,
                paddingTop: 20,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: '700', color: fg }}>
                Seleccionar unidad
              </Text>
              <Pressable
                onPress={() => setUnidadModalVisible(false)}
                hitSlop={8}
              >
                <MaterialCommunityIcons name="close" size={24} color={muted} />
              </Pressable>
            </View>
            <View
              style={{
                marginHorizontal: 20,
                height: 1,
                backgroundColor: border,
              }}
            />
            <FlatList
              data={units}
              keyExtractor={(item) => String(item.id_unidad)}
              contentContainerStyle={{ paddingTop: 12, paddingBottom: 8 }}
              renderItem={({ item }) => {
                const isSelected = unidadId === item.id_unidad;
                return (
                  <Pressable
                    onPress={() => {
                      setUnidadId(item.id_unidad);
                      setUnidadModalVisible(false);
                    }}
                    style={({ pressed }) => ({
                      marginHorizontal: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderRadius: 12,
                      paddingHorizontal: 20,
                      paddingVertical: 16,
                      backgroundColor: isSelected ? accentBg : 'transparent',
                      opacity: pressed ? 0.6 : 1,
                    })}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: isSelected ? '600' : '400',
                        color: isSelected ? brand : fg,
                      }}
                    >
                      {item.tipo}
                    </Text>
                    {isSelected ? (
                      <MaterialCommunityIcons
                        name="check"
                        size={20}
                        color={brand}
                      />
                    ) : null}
                  </Pressable>
                );
              }}
              ItemSeparatorComponent={() => (
                <View
                  style={{
                    marginHorizontal: 20,
                    height: 1,
                    backgroundColor: separatorColor,
                  }}
                />
              )}
            />
          </View>
        </View>
      </Modal>

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
