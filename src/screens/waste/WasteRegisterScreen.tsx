import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import Toast from '@/components/Toast';
import { colors, themeColors } from '@/constants/colors';
import {
  createWasteRecord,
  fetchCurrentPublications,
  fetchWasteDecisions,
} from '@/services/waste';
import { useTheme } from '@/store/ThemeContext';
import type {
  PublishedProduct,
  PublishedPublication,
  WasteDecision,
  WasteDecisionOption,
  WasteRecordPayload,
} from '@/types/waste';
import { WASTE_DECISION_OPTIONS } from '@/types/waste';
import { extractApiError } from '@/utils/apiError';

function productModalHint(loading: boolean, productCount: number): string {
  if (loading) return 'Cargando productos…';
  if (productCount === 0) return 'No hay productos publicados con stock.';
  return 'Seleccioná el producto a dar de baja.';
}

interface ProductEmptyNoticeProps {
  readonly products: readonly PublishedProduct[];
  readonly loading: boolean;
  readonly inputBg: string;
  readonly borderColor: string;
  readonly muted: string;
}

function ProductEmptyNotice({
  products,
  loading,
  inputBg,
  borderColor,
  muted,
}: ProductEmptyNoticeProps): React.JSX.Element | null {
  if (loading || products.length > 0) return null;
  return (
    <View
      style={{
        marginTop: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: inputBg,
        borderRadius: 10,
        borderWidth: 1,
        borderColor,
        paddingHorizontal: 12,
        paddingVertical: 10,
      }}
    >
      <MaterialCommunityIcons
        name="alert-circle-outline"
        size={16}
        color={colors.accent}
      />
      <Text style={{ fontSize: 13, color: muted, flex: 1 }}>
        No hay publicaciones activas esta semana. Publicá un producto para poder
        registrar mermas.
      </Text>
    </View>
  );
}

export default function WasteRegisterScreen(): React.JSX.Element {
  const { colorScheme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const isDark = colorScheme === 'dark';
  const t = themeColors(isDark);
  const coral = colors.brandRedCoral;
  const white = colors.iconWhite;

  const [selectedProduct, setSelectedProduct] =
    useState<PublishedProduct | null>(null);
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('');
  const [comentarios, setComentarios] = useState('');
  const [decisionId, setDecisionId] = useState<number | null>(null);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  const labelStyle = {
    fontSize: 13,
    fontWeight: '600',
    color: t.fg,
    marginBottom: 6,
  } as const;

  const errorStyle = {
    fontSize: 12,
    color: coral,
    marginTop: 4,
  } as const;

  const { data: decisions = [] } = useQuery<WasteDecision[]>({
    queryKey: ['waste-decisions'],
    queryFn: fetchWasteDecisions,
    staleTime: 60_000,
  });

  const decisionOptions = useMemo<WasteDecisionOption[]>(() => {
    const active = decisions.filter((decision) => decision.estado);
    if (active.length === 0) return [...WASTE_DECISION_OPTIONS];
    return active.map((decision) => ({
      id_decision: decision.id_decision,
      decision: decision.decision,
    }));
  }, [decisions]);

  const { data: publications = [], isLoading: loadingProducts } = useQuery<
    PublishedPublication[]
  >({
    queryKey: ['publicaciones-current'],
    queryFn: fetchCurrentPublications,
    staleTime: 60_000,
  });

  const products = useMemo<PublishedProduct[]>(
    () =>
      publications
        .flatMap((publication) => publication.productos)
        .filter((product) => product.stock > 0),
    [publications],
  );

  const createMutation = useMutation({
    mutationFn: createWasteRecord,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['waste-records'] });
      setToast({ message: 'Merma registrada correctamente.', type: 'success' });
      setSelectedProduct(null);
      setCantidad('');
      setMotivo('');
      setComentarios('');
      setDecisionId(null);
      setFieldErrors({});
    },
  });

  const handleSubmit = (): void => {
    const errors: Record<string, string> = {};
    const cantidadNum = Number(cantidad);

    if (!selectedProduct) {
      errors.producto = 'Seleccioná un producto publicado.';
    }
    if (!cantidad || !Number.isInteger(cantidadNum) || cantidadNum <= 0) {
      errors.cantidad = 'La cantidad debe ser un número entero mayor a 0.';
    } else if (selectedProduct && cantidadNum > selectedProduct.stock) {
      errors.cantidad = `Stock disponible: ${selectedProduct.stock}.`;
    }
    if (!motivo.trim()) {
      errors.motivo = 'El motivo es obligatorio.';
    } else if (motivo.trim().length > 300) {
      errors.motivo = 'El motivo no puede superar los 300 caracteres.';
    }
    if (!decisionId) {
      errors.decision = 'Elegí una decisión.';
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0 || !selectedProduct || !decisionId) {
      return;
    }

    const payload: WasteRecordPayload = {
      fk_producto_semanal: selectedProduct.id_producto_semanal,
      cantidad: cantidadNum,
      motivo: motivo.trim(),
      fk_decision: decisionId,
      ...(comentarios.trim() ? { comentarios: comentarios.trim() } : {}),
    };

    createMutation.mutate(payload, {
      onError: (err) => {
        setToast({
          message: extractApiError(err, [
            'fk_producto_semanal',
            'cantidad',
            'motivo',
            'fk_decision',
            'comentarios',
            'detail',
          ]),
          type: 'error',
        });
      },
    });
  };

  const handleSelectProduct = (product: PublishedProduct): void => {
    setSelectedProduct(product);
    setProductModalOpen(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={12}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: t.surface,
              borderWidth: 1,
              borderColor: t.border,
            }}
          >
            <MaterialCommunityIcons name="arrow-left" size={20} color={t.fg} />
          </Pressable>
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: t.fg }}>
              Registrar merma
            </Text>
            <Text style={{ fontSize: 13, color: t.muted, marginTop: 2 }}>
              Descuenta stock del producto publicado.
            </Text>
          </View>
        </View>

        {/* Producto publicado */}
        <Text style={[labelStyle, { marginTop: 24 }]}>
          Producto publicado *
        </Text>
        <Pressable
          onPress={() => setProductModalOpen(true)}
          style={{
            borderRadius: 12,
            borderWidth: 1,
            borderColor: fieldErrors.producto ? coral : t.border,
            backgroundColor: t.input,
            paddingHorizontal: 16,
            paddingVertical: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {selectedProduct ? (
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: t.fg }}>
                {selectedProduct.producto}
              </Text>
              <Text style={{ fontSize: 12, color: t.muted, marginTop: 2 }}>
                Stock: {selectedProduct.stock} · {selectedProduct.unidad}
              </Text>
            </View>
          ) : (
            <Text style={{ fontSize: 15, color: t.muted }}>
              Elegí un producto publicado…
            </Text>
          )}
          <MaterialCommunityIcons
            name="chevron-down"
            size={20}
            color={t.muted}
          />
        </Pressable>
        {fieldErrors.producto ? (
          <Text style={errorStyle}>{fieldErrors.producto}</Text>
        ) : null}
        <ProductEmptyNotice
          products={products}
          loading={loadingProducts}
          inputBg={t.input}
          borderColor={t.border}
          muted={t.muted}
        />

        {/* Cantidad */}
        <Text style={[labelStyle, { marginTop: 16 }]}>Cantidad *</Text>
        <TextInput
          value={cantidad}
          onChangeText={(text) => setCantidad(text.replace(/[^\d]/g, ''))}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor={t.muted}
          style={{
            borderRadius: 12,
            borderWidth: 1,
            borderColor: fieldErrors.cantidad ? coral : t.border,
            backgroundColor: t.input,
            paddingHorizontal: 16,
            paddingVertical: 14,
            fontSize: 15,
            color: t.fg,
          }}
        />
        {fieldErrors.cantidad ? (
          <Text style={errorStyle}>{fieldErrors.cantidad}</Text>
        ) : null}

        {/* Motivo */}
        <Text style={[labelStyle, { marginTop: 16 }]}>Motivo *</Text>
        <TextInput
          value={motivo}
          onChangeText={setMotivo}
          maxLength={300}
          placeholder="Ej.: se venció la fecha de caducidad"
          placeholderTextColor={t.muted}
          style={{
            borderRadius: 12,
            borderWidth: 1,
            borderColor: fieldErrors.motivo ? coral : t.border,
            backgroundColor: t.input,
            paddingHorizontal: 16,
            paddingVertical: 14,
            fontSize: 15,
            color: t.fg,
          }}
        />
        {fieldErrors.motivo ? (
          <Text style={errorStyle}>{fieldErrors.motivo}</Text>
        ) : null}

        {/* Comentarios (opcional) */}
        <Text style={[labelStyle, { marginTop: 16 }]}>
          Comentarios (opcional)
        </Text>
        <TextInput
          value={comentarios}
          onChangeText={setComentarios}
          multiline
          numberOfLines={4}
          placeholder="Notas adicionales…"
          placeholderTextColor={t.muted}
          style={{
            borderRadius: 12,
            borderWidth: 1,
            borderColor: t.border,
            backgroundColor: t.input,
            paddingHorizontal: 16,
            paddingVertical: 14,
            fontSize: 15,
            color: t.fg,
            minHeight: 96,
            textAlignVertical: 'top',
          }}
        />

        {/* Decisión */}
        <Text style={[labelStyle, { marginTop: 16 }]}>Decisión *</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {decisionOptions.map((option) => {
            const isSelected = option.id_decision === decisionId;
            return (
              <Pressable
                key={option.id_decision}
                onPress={() => setDecisionId(option.id_decision)}
                style={{
                  borderRadius: 20,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderWidth: 1,
                  borderColor: isSelected ? t.brand : t.border,
                  backgroundColor: isSelected ? t.brand : t.surface,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: isSelected ? white : t.fg,
                  }}
                >
                  {option.decision}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {fieldErrors.decision ? (
          <Text style={errorStyle}>{fieldErrors.decision}</Text>
        ) : null}

        {/* Submit */}
        <Pressable
          onPress={handleSubmit}
          disabled={createMutation.isPending}
          style={{
            marginTop: 28,
            borderRadius: 14,
            backgroundColor: t.brand,
            paddingVertical: 15,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: createMutation.isPending ? 0.6 : 1,
          }}
        >
          {createMutation.isPending ? (
            <ActivityIndicator color={white} />
          ) : (
            <Text style={{ fontSize: 15, fontWeight: '700', color: white }}>
              Registrar merma
            </Text>
          )}
        </Pressable>
      </ScrollView>

      {/* Selector de producto */}
      <Modal
        visible={productModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setProductModalOpen(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            backgroundColor: colors.modalOverlayBg,
          }}
        >
          <Pressable
            style={{ flex: 1 }}
            onPress={() => setProductModalOpen(false)}
          />
          <View
            style={{
              backgroundColor: t.surface,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: insets.bottom + 16,
              maxHeight: '70%',
            }}
          >
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <View
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: t.border,
                }}
              />
            </View>
            <Text
              style={{
                fontSize: 16,
                fontWeight: '700',
                color: t.fg,
                marginBottom: 4,
              }}
            >
              Producto publicado
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: t.muted,
                marginBottom: 12,
              }}
            >
              {productModalHint(loadingProducts, products.length)}
            </Text>
            {loadingProducts ? (
              <ActivityIndicator
                color={t.brand}
                style={{ marginVertical: 24 }}
              />
            ) : (
              <FlatList
                data={products}
                keyExtractor={(item) => String(item.id_producto_semanal)}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => handleSelectProduct(item)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 12,
                      paddingHorizontal: 12,
                      borderRadius: 12,
                      backgroundColor: t.surface,
                      borderBottomWidth: 1,
                      borderBottomColor: t.border,
                    }}
                  >
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '600',
                          color: t.fg,
                        }}
                      >
                        {item.producto}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: t.muted,
                          marginTop: 2,
                        }}
                      >
                        Unidad: {item.unidad}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '700',
                          color: t.brand,
                        }}
                      >
                        ${item.precio}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: t.muted,
                          marginTop: 2,
                        }}
                      >
                        Stock: {item.stock}
                      </Text>
                    </View>
                  </Pressable>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Toast */}
      {toast ? (
        <Toast
          visible
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      ) : null}
    </View>
  );
}
