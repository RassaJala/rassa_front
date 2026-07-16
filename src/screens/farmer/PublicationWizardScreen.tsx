import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button } from 'react-native-paper';

import * as ImagePicker from 'expo-image-picker';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import LogoutButton from '@/components/LogoutButton';
import { colors } from '@/constants/colors';
import { useProductos, useUnidades } from '@/hooks/useProductos';
import { useProductosSemanales, usePublicacion } from '@/hooks/usePublications';
import {
  usePublicationWizard,
  WIZARD_STEPS,
} from '@/hooks/usePublicationWizard';
import type {
  WizardItemDraft,
  WizardItemField,
} from '@/hooks/usePublicationWizard';
import type { FarmerStackParamList } from '@/navigation/AppNavigator';
import type { Producto } from '@/services/productos';
import type { Publicacion } from '@/services/publications';

type Props = NativeStackScreenProps<FarmerStackParamList, 'PublicationWizard'>;

const STEP_LABELS: Record<string, string> = {
  fecha: 'Fecha',
  productos: 'Productos',
  resumen: 'Resumen',
  publicar: 'Publicar',
};

const PLACEHOLDER_COLOR = colors.iconMuted;

export default function PublicationWizardScreen({
  route,
  navigation,
}: Props): React.JSX.Element {
  const publicationId = route.params?.publicationId;

  const { data: pubResponse, isLoading: isLoadingPub } = usePublicacion(
    publicationId ?? 0,
  );
  const { data: itemsResponse, isLoading: isLoadingItems } =
    useProductosSemanales(publicationId ?? 0);
  const { data: allProductosResponse, isLoading: isLoadingProducts } =
    useProductos();
  const { data: unidadesResponse, isLoading: isLoadingUnidades } =
    useUnidades();

  const publicacion = pubResponse?.data;
  const productos = itemsResponse?.data ?? [];
  const allProductos = allProductosResponse?.data ?? [];
  const unidades = unidadesResponse?.data ?? [];

  const wizard = usePublicationWizard({
    publicacion,
    productos,
    allProductos,
  });

  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const isMutating =
    wizard.isCreating || wizard.isPublishing || isSavingDraft || isPublishing;

  const handleSaveDraft = useCallback(async () => {
    setIsSavingDraft(true);
    try {
      await wizard.saveDraft();
      Alert.alert('Guardado', 'Publicación guardada como borrador.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Error', 'No se pudo guardar el borrador.');
    } finally {
      setIsSavingDraft(false);
    }
  }, [wizard, navigation]);

  const handlePublish = useCallback(async () => {
    if (!wizard.validateItems()) {
      Alert.alert(
        'Error de validación',
        'Corrige los errores en los productos antes de publicar.',
      );
      return;
    }

    setIsPublishing(true);
    try {
      await wizard.publish();
      Alert.alert('Éxito', 'Publicación publicada correctamente.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert(
        'Error',
        'No se pudo publicar. Verifica que todos los productos tengan foto, stock, precio y unidad.',
      );
    } finally {
      setIsPublishing(false);
    }
  }, [wizard, navigation]);

  // Show combined loading state when editing an existing publication
  const isLoadingData = publicationId && (isLoadingPub || isLoadingItems);
  if (isLoadingData) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-950">
        <ActivityIndicator color={colors.brandRedCoral} size="large" />
        <Text className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          Cargando publicación...
        </Text>
      </View>
    );
  }

  // Loading state for new publication (need products and units)
  if (isLoadingProducts || isLoadingUnidades) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-950">
        <ActivityIndicator color={colors.brandRedCoral} size="large" />
        <Text className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          Cargando datos...
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-gray-950">
      {/* Header — Forest green */}
      <View className="flex-row items-center justify-between border-b border-gray-200 bg-brand-green-forest px-4 pb-3 pt-12 dark:border-gray-800">
        <Text className="text-lg font-semibold text-white">
          {publicationId ? 'Editar Publicación' : 'Nueva Publicación'}
        </Text>
        <LogoutButton mode="text" />
      </View>

      {/* Step indicator */}
      <View className="flex-row border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
        {WIZARD_STEPS.map((step, index) => {
          const isActive = index === wizard.stepIndex;
          const isDone = index < wizard.stepIndex;
          return (
            <React.Fragment key={step}>
              {index > 0 && (
                <View
                  className={`mx-1 mt-3 h-0.5 flex-1 ${
                    isDone ? 'bg-brand-coral' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              )}
              <Pressable
                onPress={() => wizard.goToStep(step)}
                className="items-center"
                accessibilityRole="button"
                accessibilityLabel={`Paso ${String(index + 1)}: ${STEP_LABELS[step]}`}
              >
                <View
                  className={`h-7 w-7 items-center justify-center rounded-full ${
                    isActive
                      ? 'bg-brand-coral'
                      : isDone
                        ? 'bg-brand-coral'
                        : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      isActive || isDone
                        ? 'text-white'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {isDone ? '✓' : String(index + 1)}
                  </Text>
                </View>
                <Text
                  className={`mt-1 text-[10px] ${
                    isActive
                      ? 'text-brand-coral font-medium'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {STEP_LABELS[step]}
                </Text>
              </Pressable>
            </React.Fragment>
          );
        })}
      </View>

      {/* Step content */}
      <View className="flex-1">
        {wizard.currentStep === 'fecha' && (
          <StepFecha publicacion={publicacion} />
        )}
        {wizard.currentStep === 'productos' && (
          <StepProductos
            wizard={wizard}
            allProductos={allProductos}
            unidades={unidades}
          />
        )}
        {wizard.currentStep === 'resumen' && (
          <StepResumen
            wizard={wizard}
            allProductos={allProductos}
            unidades={unidades}
          />
        )}
        {wizard.currentStep === 'publicar' && (
          <StepPublicar
            wizard={wizard}
            isSavingDraft={isSavingDraft}
            isPublishing={isPublishing}
            onSaveDraft={handleSaveDraft}
            onPublish={handlePublish}
          />
        )}
      </View>

      {/* Navigation buttons */}
      <View className="flex-row gap-3 border-t border-gray-200 px-4 py-3 dark:border-gray-800">
        {wizard.stepIndex > 0 && (
          <Button
            mode="outlined"
            textColor={colors.textSecondary}
            onPress={wizard.prevStep}
            disabled={isMutating}
            style={{ flex: 1 }}
            labelStyle={{ fontSize: 14 }}
          >
            Anterior
          </Button>
        )}
        {wizard.stepIndex < WIZARD_STEPS.length - 1 && (
          <Button
            mode="contained"
            buttonColor={colors.brandRedCoral}
            disabled={isMutating}
            onPress={() => {
              if (
                wizard.currentStep === 'productos' &&
                !wizard.validateItems()
              ) {
                Alert.alert('Error', 'Corrige los errores antes de continuar.');
                return;
              }
              wizard.nextStep();
            }}
            style={{ flex: 1 }}
            labelStyle={{ fontSize: 14, fontWeight: '600' }}
          >
            Siguiente
          </Button>
        )}
      </View>
    </View>
  );
}

// ── Step 1: Fecha ──────────────────────────────────────────

function StepFecha({
  publicacion,
}: {
  publicacion: Publicacion | undefined;
}): React.JSX.Element {
  const fecha = publicacion?.fecha_publicacion ?? 'Calculando...';
  const semana = publicacion?.semana ?? '---';

  return (
    <ScrollView className="flex-1 px-4 py-4">
      <Text className="mb-2 text-sm text-gray-500 dark:text-gray-400">
        La fecha se asigna automáticamente al próximo lunes.
      </Text>

      <View className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-sm text-gray-600 dark:text-gray-400">
            Fecha de publicación
          </Text>
          <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {fecha}
          </Text>
        </View>

        <View className="flex-row items-center justify-between">
          <Text className="text-sm text-gray-600 dark:text-gray-400">
            Número de semana
          </Text>
          <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Semana {String(semana)}
          </Text>
        </View>
      </View>

      <Text className="mt-4 text-xs text-gray-400 dark:text-gray-500">
        La fecha se calcula automáticamente para el próximo lunes. Si hoy es
        lunes, se asigna al lunes siguiente para que tengas tiempo de preparar
        la publicación.
      </Text>
    </ScrollView>
  );
}

// ── Step 2: Productos ──────────────────────────────────────

function StepProductos({
  wizard,
  allProductos,
  unidades,
}: {
  wizard: ReturnType<typeof usePublicationWizard>;
  allProductos: Producto[];
  unidades: { id_unidad: number; tipo: string }[];
}): React.JSX.Element {
  const [showProductPicker, setShowProductPicker] = useState(false);

  const addedIds = new Set(wizard.items.map((i) => i.fk_producto));
  const availableProducts = allProductos.filter(
    (p) => !addedIds.has(p.id_producto),
  );

  const handleAddProduct = useCallback(
    (producto: Producto) => {
      wizard.addItem(producto);
      setShowProductPicker(false);
    },
    [wizard],
  );

  const handlePickImage = useCallback(
    async (tempId: string): Promise<void> => {
      try {
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería.');
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
          wizard.updateItem(tempId, 'foto', result.assets[0].uri);
        }
      } catch {
        Alert.alert('Error', 'No se pudo abrir el selector de imágenes.');
      }
    },
    [wizard],
  );

  return (
    <View className="flex-1">
      <ScrollView className="flex-1 px-4 py-4">
        <Text className="mb-3 text-sm text-gray-500 dark:text-gray-400">
          Agrega los productos que ofrecerás esta semana. Cada producto necesita
          stock, precio, unidad y foto.
        </Text>

        {wizard.items.length === 0 ? (
          <View className="items-center py-8">
            <Text className="text-sm text-gray-400 dark:text-gray-500">
              No hay productos agregados.
            </Text>
          </View>
        ) : (
          wizard.items.map((item) => (
            <WizardItemCard
              key={item.tempId}
              item={item}
              allProductos={allProductos}
              unidades={unidades}
              validation={wizard.itemValidations.get(item.tempId)}
              onUpdate={wizard.updateItem}
              onRemove={wizard.removeItem}
              onPickImage={handlePickImage}
            />
          ))
        )}
      </ScrollView>

      <View className="px-4 py-3">
        <Button
          mode="outlined"
          textColor={colors.brandRedCoral}
          onPress={() => setShowProductPicker(true)}
          disabled={availableProducts.length === 0}
          labelStyle={{ fontSize: 14 }}
          contentStyle={{ paddingVertical: 4 }}
          style={{ borderColor: colors.brandRedCoral, borderStyle: 'dashed' }}
        >
          + Agregar Producto
        </Button>
      </View>

      {showProductPicker ? (
        <ProductPickerModal
          allProductos={availableProducts}
          onSelect={handleAddProduct}
          onClose={() => setShowProductPicker(false)}
        />
      ) : null}
    </View>
  );
}

// ── Wizard Item Card ───────────────────────────────────────

function WizardItemCard({
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
    producto?.nombre_producto ?? `Producto #${String(item.fk_producto)}`;

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

// ── Product Picker Modal ───────────────────────────────────

function ProductPickerModal({
  allProductos,
  onSelect,
  onClose,
}: {
  allProductos: Producto[];
  onSelect: (producto: Producto) => void;
  onClose: () => void;
}): React.JSX.Element {
  return (
    <View
      className="absolute inset-0 z-50 bg-black/50"
      accessibilityViewIsModal
      accessibilityLabel="Seleccionar producto"
    >
      <View className="mx-4 mt-20 max-h-[70vh] rounded-2xl bg-white p-4 dark:bg-gray-900">
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Seleccionar producto
          </Text>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Cerrar selector"
          >
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              Cancelar
            </Text>
          </Pressable>
        </View>

        <FlatList
          data={allProductos}
          keyExtractor={(item) => String(item.id_producto)}
          renderItem={({ item: producto }) => (
            <Pressable
              onPress={() => onSelect(producto)}
              className="flex-row items-center border-b border-gray-100 py-3 dark:border-gray-800"
              accessibilityRole="button"
              accessibilityLabel={`Agregar ${producto.nombre_producto}`}
            >
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {producto.nombre_producto}
                </Text>
                {producto.categoria ? (
                  <Text className="text-xs text-gray-500 dark:text-gray-400">
                    {producto.categoria.nombre}
                  </Text>
                ) : null}
              </View>
              <Text className="text-brand-coral text-xs">Agregar</Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <Text className="py-4 text-center text-sm text-gray-400 dark:text-gray-500">
              No hay productos disponibles.
            </Text>
          }
        />
      </View>
    </View>
  );
}

// ── Step 3: Resumen ────────────────────────────────────────

function StepResumen({
  wizard,
  allProductos,
  unidades,
}: {
  wizard: ReturnType<typeof usePublicationWizard>;
  allProductos: Producto[];
  unidades: { id_unidad: number; tipo: string }[];
}): React.JSX.Element {
  return (
    <ScrollView className="flex-1 px-4 py-4">
      <Text className="mb-3 text-sm text-gray-500 dark:text-gray-400">
        Revisa los productos antes de publicar.
      </Text>

      {wizard.items.length === 0 ? (
        <View className="items-center py-8">
          <Text className="text-sm text-gray-400 dark:text-gray-500">
            No hay productos para revisar.
          </Text>
        </View>
      ) : (
        wizard.items.map((item) => {
          const producto = allProductos.find(
            (p) => p.id_producto === item.fk_producto,
          );
          const nombre =
            producto?.nombre_producto ??
            `Producto #${String(item.fk_producto)}`;
          const unidad = unidades.find((u) => u.id_unidad === item.fk_unidad);
          const hasErrors = wizard.itemValidations.has(item.tempId);

          return (
            <View
              key={item.tempId}
              className={`mb-3 flex-row items-center rounded-xl border p-3 ${
                hasErrors
                  ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950'
                  : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'
              }`}
            >
              {item.foto ? (
                <Image
                  source={{ uri: item.foto }}
                  className="h-12 w-12 rounded-lg"
                  resizeMode="cover"
                />
              ) : (
                <View className="h-12 w-12 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                  <Text className="text-xs text-gray-400">📷</Text>
                </View>
              )}

              <View className="ml-3 flex-1">
                <Text className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {nombre}
                </Text>
                <Text className="text-xs text-gray-500 dark:text-gray-400">
                  {item.stock} {unidad?.tipo ?? '?'} · ${item.precio}
                </Text>
              </View>

              {hasErrors ? (
                <Text className="text-xs text-red-500">⚠</Text>
              ) : (
                <Text className="text-brand-coral text-xs">✓</Text>
              )}
            </View>
          );
        })
      )}

      {wizard.hasItemErrors ? (
        <View className="mt-2 rounded-lg bg-red-50 p-3 dark:bg-red-950">
          <Text className="text-sm text-red-600">
            Hay productos con errores. Corrígelos en el paso anterior antes de
            continuar.
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

// ── Step 4: Publicar ───────────────────────────────────────

function StepPublicar({
  wizard,
  isSavingDraft,
  isPublishing,
  onSaveDraft,
  onPublish,
}: {
  wizard: ReturnType<typeof usePublicationWizard>;
  isSavingDraft: boolean;
  isPublishing: boolean;
  onSaveDraft: () => void;
  onPublish: () => void;
}): React.JSX.Element {
  const productCount = wizard.items.length;
  const hasErrors = wizard.hasItemErrors;
  const isDisabled = isPublishing || productCount === 0 || hasErrors;

  return (
    <ScrollView className="flex-1 px-4 py-4">
      <Text className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        ¿Qué deseas hacer con esta publicación?
      </Text>

      <View className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
        <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Resumen
        </Text>
        <Text className="text-sm text-gray-600 dark:text-gray-400">
          {productCount === 0
            ? 'Sin productos'
            : `${String(productCount)} producto${productCount === 1 ? '' : 's'}`}
        </Text>
        {hasErrors ? (
          <Text className="mt-1 text-xs text-red-500">
            Hay productos con errores — no se puede publicar hasta corregirlos.
          </Text>
        ) : null}
      </View>

      <Button
        mode="contained"
        buttonColor={colors.brandRedCoral}
        onPress={onPublish}
        disabled={isDisabled}
        labelStyle={{ fontSize: 16, fontWeight: '600' }}
        contentStyle={{ paddingVertical: 8 }}
      >
        {isPublishing ? 'Publicando...' : 'Publicar'}
      </Button>

      <View className="mt-3">
        <Button
          mode="outlined"
          textColor={colors.textSecondary}
          onPress={onSaveDraft}
          disabled={isSavingDraft}
          labelStyle={{ fontSize: 16 }}
          contentStyle={{ paddingVertical: 8 }}
        >
          {isSavingDraft ? 'Guardando...' : 'Guardar Borrador'}
        </Button>
      </View>
    </ScrollView>
  );
}
