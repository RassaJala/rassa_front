import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as ImagePicker from 'expo-image-picker';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { usePreventRemove } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import ProductPickerModal from '@/components/wizard/ProductPickerModal';
import StepFecha from '@/components/wizard/StepFecha';
import StepIndicator from '@/components/wizard/StepIndicator';
import StepProductos from '@/components/wizard/StepProductos';
import StepPublicar from '@/components/wizard/StepPublicar';
import StepResumen from '@/components/wizard/StepResumen';
import WizardBottomActions from '@/components/wizard/WizardBottomActions';
import WizardHeader from '@/components/wizard/WizardHeader';
import { colors, themeColors } from '@/constants/colors';
import { useFormattedDate } from '@/hooks/useFormattedDate';
import { useProductos, useUnidades } from '@/hooks/useProductos';
import { useProductosSemanales, usePublicacion } from '@/hooks/usePublications';
import { usePublicationWizard } from '@/hooks/usePublicationWizard';
import type { WizardStep } from '@/hooks/usePublicationWizard';
import { useTheme } from '@/store/ThemeContext';
import type { FarmerStackParamList } from '@/types';
import { parseApiError } from '@/utils/apiErrors';
import { isMondayToday, parseLocalDate } from '@/utils/date';

type Nav = NativeStackNavigationProp<FarmerStackParamList, 'PublicationWizard'>;

interface Props {
  readonly navigation: Nav;
  readonly route: {
    params: { publicacionId?: number };
  };
}

const STEP_META: Record<
  WizardStep,
  { title: string; icon: string; description: string }
> = {
  fecha: {
    title: 'Fecha',
    icon: 'calendar',
    description: 'Fecha de publicación automática',
  },
  productos: {
    title: 'Productos',
    icon: 'package-variant',
    description: 'Agregá y configurá tus productos',
  },
  resumen: {
    title: 'Resumen',
    icon: 'clipboard-text-outline',
    description: 'Revisá antes de publicar',
  },
  publicar: {
    title: 'Publicar',
    icon: 'send-check',
    description: 'Publicá o guardá como borrador',
  },
};

export default function PublicationWizardScreen({
  navigation,
  route,
}: Props): React.JSX.Element {
  const { publicacionId } = route.params;
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

  const [showProductPicker, setShowProductPicker] = useState(false);

  const {
    data: pubData,
    isLoading: isPubLoading,
    isError: isPubError,
    refetch: refetchPub,
  } = usePublicacion(publicacionId ?? 0);
  const { data: semanalData, isLoading: isSemanalLoading } =
    useProductosSemanales(publicacionId ?? 0);
  const { data: allProducts, isLoading: isProductsLoading } = useProductos();
  const { data: unidadesData, isLoading: isUnidadesLoading } = useUnidades();

  const publicacion = pubData?.data;
  const productos = semanalData?.data?.results ?? [];
  const allProductos = allProducts?.data?.results ?? [];
  const unidades = unidadesData?.data ?? [];

  const wizard = usePublicationWizard({
    publicacion,
    productos,
    productosCatalogo: allProductos,
  });

  const theme = themeColors(isDark);
  const bg = theme.bg;
  const fg = theme.fg;
  const muted = theme.muted;
  const surface = theme.surface;
  const border = theme.border;
  const brand = theme.brand;
  const coral = colors.brandRedCoral;
  const white = colors.iconWhite;
  const accentBg = theme.accentBg;
  const errorBg = theme.errorBg;
  const subtleBg = theme.subtleBg;

  const isMutating = wizard.isPublishing || wizard.isCreating;
  const isLoadingData =
    isPubLoading || isSemanalLoading || isProductsLoading || isUnidadesLoading;

  // Backend rule: publications can only be created/edited on Mondays, and an
  // existing publication can only be edited while in 'borrador' state.
  const isEditableWeekday = isMondayToday();
  const isNewPublication = publicacionId == null;
  const isBorrador = isNewPublication || publicacion?.estado === 'borrador';
  const canEdit = isEditableWeekday && isBorrador;

  usePreventRemove(isMutating, () => {
    Alert.alert(
      'Operación en curso',
      'Esperá a que termine la operación actual.',
      [{ text: 'OK' }],
    );
  });

  const handlePickImage = useCallback(
    async (tempId: string) => {
      try {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
          wizard.updateItem(tempId, 'foto', result.assets[0].uri);
        }
      } catch (error) {
        console.error('[PublicationWizard] ImagePicker failed:', error);
        Alert.alert('Error', 'No se pudo seleccionar la imagen.');
      }
    },
    [wizard],
  );

  const handlePublish = useCallback(async () => {
    if (!wizard.validateItems()) {
      Alert.alert(
        'Error de validación',
        'Revisá que todos los productos tengan stock, precio, unidad y foto.',
      );
      return;
    }
    try {
      await wizard.publish();
      Alert.alert('Publicado', 'Tu publicación está activa.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error('[PublicationWizard] publish failed:', error);
      Alert.alert('No se pudo publicar', parseApiError(error));
    }
  }, [wizard, navigation]);

  const handleSaveDraft = useCallback(async () => {
    try {
      await wizard.saveDraft();
      Alert.alert('Borrador guardado', 'Tu publicación se guardó.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error('[PublicationWizard] saveDraft failed:', error);
      Alert.alert('No se pudo guardar', parseApiError(error));
    }
  }, [wizard, navigation]);

  const handleNext = useCallback(() => {
    if (wizard.currentStep === 'productos' && !wizard.validateItems()) {
      return;
    }
    wizard.nextStep();
  }, [wizard]);

  const { nextMondayDate } = useFormattedDate();

  // When editing, the step must show the stored publication date, not the
  // date computed from today.
  const displayedFecha = publicacion
    ? parseLocalDate(publicacion.fecha_publicacion)
    : nextMondayDate;

  if (isLoadingData) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: bg,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator size="large" color={brand} />
        <Text style={{ color: muted, marginTop: 12, fontSize: 14 }}>
          Cargando publicación...
        </Text>
      </View>
    );
  }

  // Connectivity failure must never be masked as a business rule ("solo los
  // lunes"). Check the query error BEFORE the canEdit gate so retry is offered.
  if (isPubError) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: bg,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 28,
        }}
      >
        <MaterialCommunityIcons
          name="cloud-alert-outline"
          size={48}
          color={colors.brandRedCoral}
        />
        <Text
          style={{
            color: fg,
            fontSize: 16,
            fontWeight: '600',
            textAlign: 'center',
            marginTop: 16,
          }}
        >
          No se pudo cargar la publicación
        </Text>
        <Text
          style={{
            color: muted,
            fontSize: 14,
            textAlign: 'center',
            marginTop: 8,
          }}
        >
          Revisá tu conexión a internet e intentá de nuevo.
        </Text>
        <Pressable
          onPress={() => void refetchPub()}
          style={({ pressed }) => ({
            marginTop: 24,
            paddingVertical: 12,
            paddingHorizontal: 32,
            borderRadius: 12,
            backgroundColor: brand,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={{ color: white, fontWeight: '600', fontSize: 15 }}>
            Reintentar
          </Text>
        </Pressable>
      </View>
    );
  }

  if (!canEdit) {
    const reason = isEditableWeekday
      ? 'Solo se puede editar una publicación en estado borrador. Las publicadas o cerradas no se pueden modificar.'
      : isNewPublication
        ? 'Solo se pueden crear publicaciones los lunes.'
        : 'Solo puedes editar publicaciones los lunes.';
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: bg,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 28,
        }}
      >
        <MaterialCommunityIcons
          name="calendar-lock-outline"
          size={48}
          color={muted}
        />
        <Text
          style={{
            color: fg,
            fontSize: 16,
            fontWeight: '600',
            textAlign: 'center',
            marginTop: 16,
          }}
        >
          Publicación bloqueada
        </Text>
        <Text
          style={{
            color: muted,
            fontSize: 14,
            textAlign: 'center',
            marginTop: 8,
          }}
        >
          {reason}
        </Text>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => ({
            marginTop: 24,
            paddingVertical: 12,
            paddingHorizontal: 32,
            borderRadius: 12,
            backgroundColor: brand,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={{ color: white, fontWeight: '600', fontSize: 15 }}>
            Volver
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: Math.max(insets.bottom, 24),
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        <WizardHeader
          currentStep={wizard.currentStep}
          isMutating={isMutating}
          fg={fg}
          muted={muted}
          surface={surface}
          border={border}
          onBack={() => navigation.goBack()}
          stepMeta={STEP_META}
        />

        <StepIndicator
          stepIndex={wizard.stepIndex}
          isDark={isDark}
          brand={brand}
          onStepPress={wizard.goToStep}
        />

        {wizard.currentStep === 'fecha' && (
          <StepFecha
            nextMondayDate={displayedFecha}
            accentBg={accentBg}
            brand={brand}
            fg={fg}
            muted={muted}
            surface={surface}
            border={border}
            subtleBg={subtleBg}
          />
        )}

        {wizard.currentStep === 'productos' && (
          <StepProductos
            items={wizard.items}
            allProductos={allProductos}
            unidades={unidades}
            itemValidations={wizard.itemValidations}
            onUpdate={wizard.updateItem}
            onRemove={wizard.removeItem}
            onPickImage={handlePickImage}
            onAddProduct={() => setShowProductPicker(true)}
            surface={surface}
            border={border}
            fg={fg}
            muted={muted}
            brand={brand}
          />
        )}

        {wizard.currentStep === 'resumen' && (
          <StepResumen
            items={wizard.items}
            allProductos={allProductos}
            unidades={unidades}
            itemValidations={wizard.itemValidations}
            surface={surface}
            border={border}
            fg={fg}
            muted={muted}
            brand={brand}
          />
        )}

        {wizard.currentStep === 'publicar' && (
          <StepPublicar
            items={wizard.items}
            hasItemErrors={wizard.hasItemErrors}
            surface={surface}
            border={border}
            fg={fg}
            muted={muted}
            brand={brand}
            errorBg={errorBg}
            coral={coral}
          />
        )}
      </ScrollView>

      <WizardBottomActions
        stepIndex={wizard.stepIndex}
        isPublishing={wizard.isPublishing}
        isCreating={wizard.isCreating}
        hasItemErrors={wizard.hasItemErrors}
        bg={bg}
        surface={surface}
        border={border}
        fg={fg}
        white={white}
        onPrev={wizard.prevStep}
        onNext={handleNext}
        onSaveDraft={() => void handleSaveDraft()}
        onPublish={() => void handlePublish()}
      />

      {showProductPicker ? (
        <ProductPickerModal
          allProductos={allProductos}
          onSelect={(producto) => {
            wizard.addItem(producto);
            setShowProductPicker(false);
          }}
          onClose={() => setShowProductPicker(false)}
        />
      ) : null}
    </View>
  );
}
