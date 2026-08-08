import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
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

import {
  validateWasteRecord,
  WASTE_DECISION_OPTIONS,
} from '@/common/wasteRegister';
import Toast from '@/components/Toast';
import { colors, themeColors } from '@/constants/colors';
import {
  createWasteRecord,
  fetchCurrentPublications,
  fetchWasteOrders,
} from '@/services/waste';
import { useTheme } from '@/store/ThemeContext';
import type { Order } from '@/types';
import type {
  PublishedProduct,
  PublishedPublication,
  WasteDecisionOption,
  WasteRecordPayload,
} from '@/types/waste';
import { extractApiError } from '@/utils/apiErrors';

import { DecisionModal } from './DecisionModal';
import { PedidoModal } from './PedidoModal';
import { ProductModal } from './ProductModal';

// Shared field label/error text styles (deduplicated from three identical
// definitions); the theme-dependent color is merged at each usage site.
const labelStyle = {
  fontSize: 13,
  fontWeight: '600',
  marginBottom: 6,
} as const;

const errorStyle = {
  fontSize: 12,
  marginTop: 4,
} as const;

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
        No hay publicaciones activas esta semana. Publica un producto para poder
        registrar mermas.
      </Text>
    </View>
  );
}

interface PedidoSelectorProps {
  readonly selected: Order | null;
  readonly error: string | undefined;
  readonly t: ReturnType<typeof themeColors>;
  readonly coral: string;
  readonly onPress: () => void;
}

function PedidoSelector({
  selected,
  error,
  t,
  coral,
  onPress,
}: PedidoSelectorProps): React.JSX.Element {
  return (
    <>
      <Text style={[labelStyle, { marginTop: 24, color: t.fg }]}>Pedido *</Text>
      <Pressable
        onPress={onPress}
        style={{
          borderRadius: 12,
          borderWidth: 1,
          borderColor: error ? coral : t.border,
          backgroundColor: t.input,
          paddingHorizontal: 16,
          paddingVertical: 14,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {selected ? (
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: t.fg }}>
              Pedido #{selected.id_pedido} ·{' '}
              {selected.cliente_nombre ?? 'Cliente'}
            </Text>
            <Text style={{ fontSize: 12, color: t.muted, marginTop: 2 }}>
              Total: ${selected.total} · {selected.estado_actual}
            </Text>
          </View>
        ) : (
          <Text style={{ fontSize: 15, color: t.muted }}>Elige un pedido…</Text>
        )}
        <MaterialCommunityIcons name="chevron-down" size={20} color={t.muted} />
      </Pressable>
      {error ? (
        <Text style={[errorStyle, { color: coral }]}>{error}</Text>
      ) : null}
    </>
  );
}

interface DecisionSelectorProps {
  readonly selected: WasteDecisionOption | null;
  readonly error: string | undefined;
  readonly t: ReturnType<typeof themeColors>;
  readonly coral: string;
  readonly onPress: () => void;
}

function DecisionSelector({
  selected,
  error,
  t,
  coral,
  onPress,
}: DecisionSelectorProps): React.JSX.Element {
  return (
    <>
      <Text style={[labelStyle, { marginTop: 16, color: t.fg }]}>
        Decisión *
      </Text>
      <Pressable
        onPress={onPress}
        style={{
          borderRadius: 12,
          borderWidth: 1,
          borderColor: error ? coral : t.border,
          backgroundColor: t.input,
          paddingHorizontal: 16,
          paddingVertical: 14,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text
          style={{
            flex: 1,
            fontSize: 15,
            color: selected ? t.fg : t.muted,
          }}
        >
          {selected ? selected.decision : 'Elige una decisión…'}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={20} color={t.muted} />
      </Pressable>
      {error ? (
        <Text style={[errorStyle, { color: coral }]}>{error}</Text>
      ) : null}
    </>
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
  const [selectedPedido, setSelectedPedido] = useState<Order | null>(null);
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('');
  const [comentarios, setComentarios] = useState('');
  const [decisionId, setDecisionId] = useState<number | null>(null);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [pedidoModalOpen, setPedidoModalOpen] = useState(false);
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  // Decisiones de merma: catálogo fijo (ids 1-4 sincronizados con el seed del
  // backend). El endpoint /decisiones-merma/ es solo-admin y el vendedor que
  // registra mermas recibiría 403; usar el fallback evita el error en LogBox.
  const decisionOptions = WASTE_DECISION_OPTIONS;

  const selectedDecision = useMemo<WasteDecisionOption | null>(
    () =>
      decisionOptions.find((option) => option.id_decision === decisionId) ??
      null,
    [decisionId, decisionOptions],
  );

  const {
    data: publications = [],
    isLoading: loadingProducts,
    isError: productsError,
    refetch: refetchProducts,
  } = useQuery<PublishedPublication[]>({
    queryKey: ['publicaciones-current'],
    queryFn: fetchCurrentPublications,
    staleTime: 60_000,
    // Retry storm guard: axios-retry (3x) + TanStack retry (3x) would send up
    // to 9 attempts per endpoint on a degraded backend; the form has a manual
    // "Reintentar" button instead.
    retry: false,
  });

  const {
    data: orders = [],
    isLoading: loadingOrders,
    isError: ordersError,
    refetch: refetchOrders,
  } = useQuery<Order[]>({
    queryKey: ['waste-pedidos'],
    queryFn: fetchWasteOrders,
    staleTime: 60_000,
    retry: false,
  });

  useEffect(() => {
    if (productsError) {
      console.error('[waste] publications query failed', productsError);
    }
    if (ordersError) {
      console.error('[waste] orders query failed', ordersError);
    }
  }, [productsError, ordersError]);

  const products = useMemo<PublishedProduct[]>(
    () =>
      publications
        .flatMap((publication) => publication.productos)
        .filter((product) => product.stock > 0),
    [publications],
  );

  const createMutation = useMutation({
    mutationFn: createWasteRecord,
    onSuccess: async () => {
      // Refresh product stock BEFORE resetting the form so the next payload is
      // validated against the real stock, not the stale pre-merma value.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['waste-records'] }),
        queryClient.invalidateQueries({ queryKey: ['publicaciones-current'] }),
      ]);
      setToast({ message: 'Merma registrada correctamente.', type: 'success' });
      setSelectedProduct(null);
      setSelectedPedido(null);
      setCantidad('');
      setMotivo('');
      setComentarios('');
      setDecisionId(null);
      setFieldErrors({});
    },
  });

  const handleSubmit = (): void => {
    const errors: Record<string, string> = {
      ...validateWasteRecord({
        pedido: selectedPedido,
        producto: selectedProduct,
        cantidad,
        motivo,
        stock: selectedProduct?.stock,
      }),
    };

    if (!decisionId) {
      errors.decision = 'Elige una decisión.';
    }

    setFieldErrors(errors);
    if (
      Object.keys(errors).length > 0 ||
      !selectedPedido ||
      !selectedProduct ||
      !decisionId
    ) {
      return;
    }

    const payload: WasteRecordPayload = {
      fk_producto_semanal: selectedProduct.id_producto_semanal,
      fk_pedido: selectedPedido.id_pedido,
      cantidad: Number(cantidad),
      motivo: motivo.trim(),
      fk_decision: decisionId,
      ...(comentarios.trim() ? { comentarios: comentarios.trim() } : {}),
    };

    createMutation.mutate(payload, {
      onError: (err) => {
        setToast({
          message: extractApiError(err, [
            'fk_producto_semanal',
            'fk_pedido',
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

  const handleSelectPedido = (pedido: Order): void => {
    setSelectedPedido(pedido);
    setPedidoModalOpen(false);
  };

  const handleSelectDecision = (option: WasteDecisionOption): void => {
    setDecisionId(option.id_decision);
    setDecisionModalOpen(false);
  };

  // Wait for the initial queries (orders + publications) before
  // rendering the form, so the user cannot submit without available options.
  if (loadingOrders || loadingProducts) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: t.bg,
        }}
      >
        <ActivityIndicator size="large" color={t.brand} />
      </View>
    );
  }

  if (productsError || ordersError) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 24,
          backgroundColor: t.bg,
        }}
      >
        <MaterialCommunityIcons
          name="cloud-alert-outline"
          size={48}
          color={t.fg}
        />
        <Text
          style={{
            marginTop: 12,
            fontSize: 16,
            fontWeight: '600',
            color: t.fg,
            textAlign: 'center',
          }}
        >
          No se pudieron cargar los datos.
        </Text>
        <Text
          style={{
            marginTop: 4,
            fontSize: 13,
            color: t.fg,
            opacity: 0.7,
            textAlign: 'center',
          }}
        >
          Revisa tu conexión e inténtalo de nuevo.
        </Text>
        <Pressable
          onPress={() => {
            void refetchProducts();
            void refetchOrders();
          }}
          style={{
            marginTop: 20,
            borderRadius: 12,
            paddingVertical: 12,
            paddingHorizontal: 24,
            backgroundColor: t.brand,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: '700', color: white }}>
            Reintentar
          </Text>
        </Pressable>
        <Pressable
          onPress={() => navigation.goBack()}
          style={{ marginTop: 16, paddingVertical: 8, paddingHorizontal: 16 }}
        >
          <Text style={{ fontSize: 14, color: t.fg, opacity: 0.8 }}>
            ← Volver
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top + 8,
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 24,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={{
              backgroundColor: t.surface,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: t.border,
              padding: 16,
              shadowColor: colors.shadow,
              shadowOpacity: 0.06,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 2,
            }}
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
                <MaterialCommunityIcons
                  name="arrow-left"
                  size={20}
                  color={t.fg}
                />
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

            {/* Pedido */}
            <PedidoSelector
              selected={selectedPedido}
              error={fieldErrors.pedido}
              t={t}
              coral={coral}
              onPress={() => setPedidoModalOpen(true)}
            />

            {/* Producto publicado */}
            <Text style={[labelStyle, { marginTop: 16, color: t.fg }]}>
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
                  <Text
                    style={{ fontSize: 15, fontWeight: '600', color: t.fg }}
                  >
                    {selectedProduct.producto}
                  </Text>
                  <Text style={{ fontSize: 12, color: t.muted, marginTop: 2 }}>
                    Stock: {selectedProduct.stock} · {selectedProduct.unidad}
                  </Text>
                </View>
              ) : (
                <Text style={{ fontSize: 15, color: t.muted }}>
                  Elige un producto publicado…
                </Text>
              )}
              <MaterialCommunityIcons
                name="chevron-down"
                size={20}
                color={t.muted}
              />
            </Pressable>
            {fieldErrors.producto ? (
              <Text style={[errorStyle, { color: coral }]}>
                {fieldErrors.producto}
              </Text>
            ) : null}
            <ProductEmptyNotice
              products={products}
              loading={loadingProducts}
              inputBg={t.input}
              borderColor={t.border}
              muted={t.muted}
            />

            {/* Cantidad */}
            <Text style={[labelStyle, { marginTop: 16, color: t.fg }]}>
              Cantidad *
            </Text>
            <TextInput
              value={cantidad}
              onChangeText={(text) => setCantidad(text.replace(/[^\d]/g, ''))}
              keyboardType="number-pad"
              maxLength={10}
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
              <Text style={[errorStyle, { color: coral }]}>
                {fieldErrors.cantidad}
              </Text>
            ) : null}

            {/* Motivo */}
            <Text style={[labelStyle, { marginTop: 16, color: t.fg }]}>
              Motivo *
            </Text>
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
              <Text style={[errorStyle, { color: coral }]}>
                {fieldErrors.motivo}
              </Text>
            ) : null}

            {/* Comentarios (opcional) */}
            <Text style={[labelStyle, { marginTop: 16, color: t.fg }]}>
              Comentarios (opcional)
            </Text>
            <TextInput
              value={comentarios}
              onChangeText={setComentarios}
              multiline
              numberOfLines={4}
              maxLength={500}
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
            <DecisionSelector
              selected={selectedDecision}
              error={fieldErrors.decision}
              t={t}
              coral={coral}
              onPress={() => setDecisionModalOpen(true)}
            />

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
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Selector de producto */}
      <ProductModal
        visible={productModalOpen}
        loading={loadingProducts}
        products={products}
        selectedId={selectedProduct?.id_producto_semanal ?? null}
        bottomInset={insets.bottom}
        t={t}
        onClose={() => setProductModalOpen(false)}
        onSelect={handleSelectProduct}
      />

      {/* Selector de pedido */}
      <PedidoModal
        visible={pedidoModalOpen}
        loading={loadingOrders}
        orders={orders}
        selectedId={selectedPedido?.id_pedido ?? null}
        bottomInset={insets.bottom}
        t={t}
        onClose={() => setPedidoModalOpen(false)}
        onSelect={handleSelectPedido}
      />

      {/* Selector de decisión */}
      <DecisionModal
        visible={decisionModalOpen}
        options={decisionOptions}
        selectedId={decisionId}
        bottomInset={insets.bottom}
        t={t}
        onClose={() => setDecisionModalOpen(false)}
        onSelect={handleSelectDecision}
      />

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
