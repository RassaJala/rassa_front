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
import WizardItemCard from '@/components/wizard/WizardItemCard';
import { colors, themeColors } from '@/constants/colors';
import { useFormattedDate } from '@/hooks/useFormattedDate';
import { useProductos, useUnidades } from '@/hooks/useProductos';
import { useProductosSemanales, usePublicacion } from '@/hooks/usePublications';
import {
  usePublicationWizard,
  WIZARD_STEPS,
} from '@/hooks/usePublicationWizard';
import type { WizardStep } from '@/hooks/usePublicationWizard';
import { useTheme } from '@/store/ThemeContext';
import type { FarmerStackParamList } from '@/types';

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

// eslint-disable-next-line sonarjs/cognitive-complexity
export default function PublicationWizardScreen({
  navigation,
  route,
}: Props): React.JSX.Element {
  const { publicacionId } = route.params;
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

  const [showProductPicker, setShowProductPicker] = useState(false);

  const { data: pubData } = usePublicacion(publicacionId ?? 0);
  const { data: semanalData } = useProductosSemanales(publicacionId ?? 0);
  const { data: allProducts } = useProductos();
  const { data: unidadesData } = useUnidades();

  const publicacion = pubData?.data;
  const productos = semanalData?.data ?? [];
  const allProductos = allProducts?.data ?? [];
  const unidades = unidadesData?.data ?? [];

  const wizard = usePublicationWizard({ publicacion, productos });

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
  const shadowBg = theme.shadowBg;
  const subtleBg = theme.subtleBg;

  const isMutating = wizard.isPublishing || wizard.isCreating;

  usePreventRemove(isMutating, ({ data: { action: _action } }) => {
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
      Alert.alert('Error', 'No se pudo publicar. Intentá de nuevo.');
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
      Alert.alert('Error', 'No se pudo guardar. Intentá de nuevo.');
    }
  }, [wizard, navigation]);

  const { nextMondayDate } = useFormattedDate();

  const weekNumber = getWeekNumber(nextMondayDate);

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
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 24,
                fontWeight: '700',
                letterSpacing: -0.3,
                color: fg,
              }}
            >
              {STEP_META[wizard.currentStep].title}
            </Text>
            <Text style={{ fontSize: 13, color: muted, marginTop: 2 }}>
              {STEP_META[wizard.currentStep].description}
            </Text>
          </View>
          <Pressable
            onPress={() => navigation.goBack()}
            disabled={isMutating}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: surface,
              borderWidth: 1,
              borderColor: border,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: isMutating ? 0.3 : pressed ? 0.6 : 1,
            })}
          >
            <MaterialCommunityIcons name="close" size={22} color={fg} />
          </Pressable>
        </View>

        {/* Step indicator */}
        <View
          style={{
            flexDirection: 'row',
            marginBottom: 24,
            gap: 6,
          }}
        >
          {WIZARD_STEPS.map((step, i) => {
            const isActive = i === wizard.stepIndex;
            const isDone = i < wizard.stepIndex;
            return (
              <Pressable
                key={step}
                onPress={() => wizard.goToStep(step)}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: isActive
                    ? brand
                    : isDone
                      ? brand
                      : isDark
                        ? shadowBg
                        : colors.transparent,
                  opacity: isDone && !isActive ? 0.5 : 1,
                }}
              />
            );
          })}
        </View>

        {/* Step content */}
        {wizard.currentStep === 'fecha' && (
          <View
            style={{
              backgroundColor: surface,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: border,
              padding: 20,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                marginBottom: 16,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  backgroundColor: accentBg,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MaterialCommunityIcons
                  name="calendar"
                  size={24}
                  color={brand}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: fg }}>
                  Fecha de publicación
                </Text>
                <Text style={{ fontSize: 13, color: muted }}>
                  Se asigna automáticamente
                </Text>
              </View>
            </View>

            <View
              style={{
                backgroundColor: subtleBg,
                borderRadius: 12,
                padding: 16,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '500',
                  color: fg,
                  marginBottom: 4,
                }}
              >
                {nextMondayDate.toLocaleDateString('es-AR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
              <Text style={{ fontSize: 13, color: muted }}>
                Semana {weekNumber}
              </Text>
            </View>
          </View>
        )}

        {wizard.currentStep === 'productos' && (
          <View>
            {wizard.items.length === 0 ? (
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

            <Pressable
              onPress={() => setShowProductPicker(true)}
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
        )}

        {wizard.currentStep === 'resumen' && (
          <View>
            {wizard.items.length === 0 ? (
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
              wizard.items.map((item) => {
                const producto = allProductos.find(
                  (p) => p.id_producto === item.fk_producto,
                );
                const nombre =
                  producto?.nombre_producto ??
                  `Producto #${String(item.fk_producto)}`;
                const unidad = unidades.find(
                  (u) => u.id_unidad === item.fk_unidad,
                );
                const hasErrors = wizard.itemValidations.has(item.tempId);

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

                    <View style={{ flexDirection: 'row', gap: 16 }}>
                      <Text style={{ fontSize: 13, color: muted }}>
                        Stock:{' '}
                        <Text style={{ color: fg, fontWeight: '500' }}>
                          {item.stock || '—'}
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
                          {unidad?.tipo ?? '—'}
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
        )}

        {wizard.currentStep === 'publicar' && (
          <View>
            <View
              style={{
                backgroundColor: surface,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: border,
                padding: 20,
                marginBottom: 16,
                alignItems: 'center',
              }}
            >
              <MaterialCommunityIcons
                name="send-check"
                size={48}
                color={brand}
              />
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '700',
                  color: fg,
                  marginTop: 12,
                  textAlign: 'center',
                }}
              >
                ¿Listo para publicar?
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: muted,
                  textAlign: 'center',
                  marginTop: 4,
                }}
              >
                {wizard.items.length}{' '}
                {wizard.items.length === 1 ? 'producto' : 'productos'} en esta
                publicación
              </Text>

              {wizard.hasItemErrors ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    marginTop: 12,
                    backgroundColor: errorBg,
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                  }}
                >
                  <MaterialCommunityIcons
                    name="alert-circle-outline"
                    size={16}
                    color={coral}
                  />
                  <Text style={{ fontSize: 13, color: coral }}>
                    Hay errores de validación
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom actions */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingBottom: Math.max(insets.bottom, 16),
          paddingTop: 12,
          backgroundColor: bg,
          borderTopWidth: 1,
          borderTopColor: border,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          {wizard.stepIndex > 0 ? (
            <Pressable
              onPress={wizard.prevStep}
              style={({ pressed }) => ({
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                backgroundColor: surface,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: border,
                paddingVertical: 14,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <MaterialCommunityIcons name="arrow-left" size={18} color={fg} />
              <Text style={{ fontSize: 15, fontWeight: '600', color: fg }}>
                Anterior
              </Text>
            </Pressable>
          ) : null}

          {wizard.stepIndex < WIZARD_STEPS.length - 1 ? (
            <Pressable
              onPress={() => {
                if (
                  wizard.currentStep === 'productos' &&
                  !wizard.validateItems()
                ) {
                  return;
                }
                wizard.nextStep();
              }}
              style={({ pressed }) => ({
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                backgroundColor: brand,
                borderRadius: 14,
                paddingVertical: 14,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: white }}>
                Siguiente
              </Text>
              <MaterialCommunityIcons
                name="arrow-right"
                size={18}
                color={white}
              />
            </Pressable>
          ) : (
            <>
              <Pressable
                onPress={() => void handleSaveDraft()}
                disabled={wizard.isPublishing || wizard.isCreating}
                style={({ pressed }) => ({
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: surface,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: border,
                  paddingVertical: 14,
                  opacity:
                    pressed || wizard.isPublishing || wizard.isCreating
                      ? 0.5
                      : 1,
                })}
              >
                {wizard.isCreating ? (
                  <ActivityIndicator size="small" color={fg} />
                ) : (
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: '600',
                      color: fg,
                    }}
                  >
                    Borrador
                  </Text>
                )}
              </Pressable>
              <Pressable
                onPress={() => void handlePublish()}
                disabled={
                  wizard.isPublishing ||
                  wizard.isCreating ||
                  wizard.hasItemErrors
                }
                style={({ pressed }) => ({
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: coral,
                  borderRadius: 14,
                  paddingVertical: 14,
                  opacity:
                    pressed ||
                    wizard.isPublishing ||
                    wizard.isCreating ||
                    wizard.hasItemErrors
                      ? 0.5
                      : 1,
                })}
              >
                {wizard.isPublishing ? (
                  <ActivityIndicator size="small" color={white} />
                ) : (
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: '600',
                      color: white,
                    }}
                  >
                    Publicar
                  </Text>
                )}
              </Pressable>
            </>
          )}
        </View>
      </View>

      {/* Product picker modal */}
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

function getWeekNumber(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}
