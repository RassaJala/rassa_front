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
import { WASTE_DECISION_OPTIONS } from '@/types/waste';
import { extractApiError } from '@/utils/apiErrors';

function productModalHint(loading: boolean, productCount: number): string {
  if (loading) return 'Cargando productos…';
  if (productCount === 0) return 'No hay productos publicados con stock.';
  return 'Selecciona el producto a dar de baja.';
}

function orderModalHint(loading: boolean, orderCount: number): string {
  if (loading) return 'Cargando pedidos…';
  if (orderCount === 0) return 'No hay pedidos para este vendedor.';
  return 'Selecciona el pedido afectado por la merma.';
}

function formatEstado(estado: string): string {
  return estado.replaceAll('_', ' ');
}

function formatFecha(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
  });
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

  return (
    <>
      <Text style={[labelStyle, { marginTop: 24 }]}>Pedido *</Text>
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
      {error ? <Text style={errorStyle}>{error}</Text> : null}
    </>
  );
}

interface PedidoModalProps {
  readonly visible: boolean;
  readonly loading: boolean;
  readonly orders: readonly Order[];
  readonly selectedId: number | null;
  readonly overlay: string;
  readonly bottomInset: number;
  readonly t: ReturnType<typeof themeColors>;
  readonly onClose: () => void;
  readonly onSelect: (pedido: Order) => void;
}

function PedidoModal({
  visible,
  loading,
  orders,
  selectedId,
  overlay,
  bottomInset,
  t,
  onClose,
  onSelect,
}: PedidoModalProps): React.JSX.Element {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
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
            backgroundColor: t.surface,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: bottomInset + 16,
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
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 4,
            }}
          >
            <Text
              style={{
                flex: 1,
                fontSize: 16,
                fontWeight: '700',
                color: t.fg,
                marginRight: 12,
              }}
            >
              Seleccionar pedido
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: t.input,
                borderWidth: 1,
                borderColor: t.border,
              }}
              accessibilityLabel="Cerrar selector de pedido"
            >
              <MaterialCommunityIcons name="close" size={18} color={t.fg} />
            </Pressable>
          </View>
          <Text
            style={{
              fontSize: 13,
              color: t.muted,
              marginBottom: 12,
            }}
          >
            {orderModalHint(loading, orders.length)}
          </Text>
          {loading ? (
            <ActivityIndicator color={t.brand} style={{ marginVertical: 24 }} />
          ) : (
            <FlatList
              data={orders}
              keyExtractor={(item) => String(item.id_pedido)}
              showsVerticalScrollIndicator={false}
              style={{ flexShrink: 1 }}
              renderItem={({ item }) => {
                const isSelected = item.id_pedido === selectedId;
                return (
                  <Pressable
                    onPress={() => onSelect(item)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 12,
                      paddingHorizontal: 12,
                      borderRadius: 12,
                      backgroundColor: isSelected ? t.input : t.surface,
                      borderWidth: 1,
                      borderColor: isSelected ? t.brand : t.border,
                      marginBottom: 8,
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
                        Pedido #{item.id_pedido}
                        {formatFecha(item.creado_en) !== ''
                          ? ` · ${formatFecha(item.creado_en)}`
                          : ''}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: t.muted,
                          marginTop: 2,
                        }}
                      >
                        {item.cliente_nombre ?? 'Cliente'} · ${item.total}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '600',
                          color: isSelected ? t.brand : t.muted,
                        }}
                      >
                        {formatEstado(item.estado_actual)}
                      </Text>
                      {isSelected ? (
                        <MaterialCommunityIcons
                          name="check-circle"
                          size={18}
                          color={t.brand}
                        />
                      ) : null}
                    </View>
                  </Pressable>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
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

  return (
    <>
      <Text style={[labelStyle, { marginTop: 16 }]}>Decisión *</Text>
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
      {error ? <Text style={errorStyle}>{error}</Text> : null}
    </>
  );
}

interface DecisionModalProps {
  readonly visible: boolean;
  readonly options: readonly WasteDecisionOption[];
  readonly selectedId: number | null;
  readonly overlay: string;
  readonly bottomInset: number;
  readonly t: ReturnType<typeof themeColors>;
  readonly onClose: () => void;
  readonly onSelect: (option: WasteDecisionOption) => void;
}

function DecisionModal({
  visible,
  options,
  selectedId,
  overlay,
  bottomInset,
  t,
  onClose,
  onSelect,
}: DecisionModalProps): React.JSX.Element {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
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
            backgroundColor: t.surface,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: bottomInset + 16,
            maxHeight: '60%',
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
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 4,
            }}
          >
            <Text
              style={{
                flex: 1,
                fontSize: 16,
                fontWeight: '700',
                color: t.fg,
                marginRight: 12,
              }}
            >
              Seleccionar decisión
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: t.input,
                borderWidth: 1,
                borderColor: t.border,
              }}
              accessibilityLabel="Cerrar selector de decisión"
            >
              <MaterialCommunityIcons name="close" size={18} color={t.fg} />
            </Pressable>
          </View>
          <Text
            style={{
              fontSize: 13,
              color: t.muted,
              marginBottom: 12,
            }}
          >
            Elige qué hacer con el producto.
          </Text>
          <FlatList
            data={options}
            keyExtractor={(item) => String(item.id_decision)}
            showsVerticalScrollIndicator={false}
            style={{ flexShrink: 1 }}
            renderItem={({ item }) => {
              const isSelected = item.id_decision === selectedId;
              return (
                <Pressable
                  onPress={() => onSelect(item)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 12,
                    paddingHorizontal: 12,
                    borderRadius: 12,
                    backgroundColor: isSelected ? t.input : t.surface,
                    borderWidth: 1,
                    borderColor: isSelected ? t.brand : t.border,
                    marginBottom: 8,
                  }}
                >
                  <Text
                    style={{
                      flex: 1,
                      marginRight: 12,
                      fontSize: 14,
                      fontWeight: '600',
                      color: t.fg,
                    }}
                  >
                    {item.decision}
                  </Text>
                  {isSelected ? (
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={18}
                      color={t.brand}
                    />
                  ) : null}
                </Pressable>
              );
            }}
          />
        </View>
      </View>
    </Modal>
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

  const { data: publications = [], isLoading: loadingProducts } = useQuery<
    PublishedPublication[]
  >({
    queryKey: ['publicaciones-current'],
    queryFn: fetchCurrentPublications,
    staleTime: 60_000,
  });

  const { data: orders = [], isLoading: loadingOrders } = useQuery<Order[]>({
    queryKey: ['waste-pedidos'],
    queryFn: fetchWasteOrders,
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
      void queryClient.invalidateQueries({
        queryKey: ['publicaciones-current'],
      });
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
    const errors: Record<string, string> = {};
    const cantidadNum = Number(cantidad);

    if (!selectedPedido) {
      errors.pedido = 'Selecciona un pedido.';
    }
    if (!selectedProduct) {
      errors.producto = 'Selecciona un producto publicado.';
    }
    if (!cantidad || !Number.isInteger(cantidadNum) || cantidadNum <= 0) {
      errors.cantidad = 'La cantidad debe ser un número entero mayor a 0.';
    } else if (cantidadNum > 999_999_999) {
      errors.cantidad = 'La cantidad es demasiado grande.';
    } else if (selectedProduct && cantidadNum > selectedProduct.stock) {
      errors.cantidad = `Stock disponible: ${selectedProduct.stock}.`;
    }
    if (!motivo.trim()) {
      errors.motivo = 'El motivo es obligatorio.';
    } else if (motivo.trim().length > 300) {
      errors.motivo = 'El motivo no puede superar los 300 caracteres.';
    }
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
          <Text style={[labelStyle, { marginTop: 16 }]}>
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
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 4,
              }}
            >
              <Text
                style={{
                  flex: 1,
                  fontSize: 16,
                  fontWeight: '700',
                  color: t.fg,
                  marginRight: 12,
                }}
              >
                Producto publicado
              </Text>
              <Pressable
                onPress={() => setProductModalOpen(false)}
                hitSlop={8}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: t.input,
                  borderWidth: 1,
                  borderColor: t.border,
                }}
                accessibilityLabel="Cerrar selector de producto"
              >
                <MaterialCommunityIcons name="close" size={18} color={t.fg} />
              </Pressable>
            </View>
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

      {/* Selector de pedido */}
      <PedidoModal
        visible={pedidoModalOpen}
        loading={loadingOrders}
        orders={orders}
        selectedId={selectedPedido?.id_pedido ?? null}
        overlay="rgba(0, 0, 0, 0.7)"
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
        overlay="rgba(0, 0, 0, 0.7)"
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
