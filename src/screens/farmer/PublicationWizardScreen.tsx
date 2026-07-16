import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Button } from 'react-native-paper';

import * as ImagePicker from 'expo-image-picker';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import LogoutButton from '@/components/LogoutButton';
import ProductPickerModal from '@/components/wizard/ProductPickerModal';
import WizardItemCard from '@/components/wizard/WizardItemCard';
import { colors } from '@/constants/colors';
import { useProductos, useUnidades } from '@/hooks/useProductos';
import { useProductosSemanales, usePublicacion } from '@/hooks/usePublications';
import {
  usePublicationWizard,
  WIZARD_STEPS,
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
  });

  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const isMutating =
    wizard.isCreating || wizard.isPublishing || isSavingDraft || isPublishing;

  // Block Android back button while mutations are active
  useEffect(() => {
    if (!isMutating) return;

    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      e.preventDefault();
    });

    return unsubscribe;
  }, [isMutating, navigation]);

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
