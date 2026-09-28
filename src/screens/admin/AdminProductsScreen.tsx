import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import api, { mediaUrl } from '@/services/api';
import type { Producto } from '@/services/productos';
import type { Publicacion } from '@/services/publications';
import { useTheme } from '@/store/ThemeContext';
import type { ApiResponse, Category } from '@/types';
import { parseApiList } from '@/utils/apiResponse';

type AdminTabParamList = {
  AdminProducts: undefined;
  AdminInicio: undefined;
};

interface WeeklyRow {
  readonly key: string;
  readonly agricultor: string;
  readonly nombre: string;
  readonly unidad: string;
  readonly precio: string;
  readonly stock: number;
  readonly foto: string | null;
}

type ListItem =
  | { readonly kind: 'catalogo'; readonly producto: Producto }
  | { readonly kind: 'publicacion'; readonly row: WeeklyRow };

const MAX_PAGES = 500;

async function fetchAllPages<T>(endpoint: string): Promise<T[]> {
  const all: T[] = [];
  let page = 1;
  while (true) {
    const sep = endpoint.includes('?') ? '&' : '?';
    const suffix = page === 1 ? '' : `${sep}page=${page}`;
    const { data } = await api.get<
      ApiResponse<{ next: string | null; results: T[] }>
    >(`${endpoint}${suffix}`);
    const payload = data.data;
    const results = payload.results ?? [];
    all.push(...results);
    if (!payload.next || results.length === 0 || page >= MAX_PAGES) break;
    page += 1;
  }
  return all;
}

function CategoryPickerModal({
  visible,
  categories,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  categories: string[];
  selected: string;
  onSelect: (c: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 items-center justify-center bg-black/40 p-10"
        onPress={onClose}
      >
        <View className="gap-1 rounded-2xl bg-white p-4 dark:bg-gray-900">
          <Text className="text-brand-ink mb-2 px-2 text-[17px] font-bold dark:text-gray-100">
            Seleccionar categoría
          </Text>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => {
                onSelect(cat);
                onClose();
              }}
              activeOpacity={0.7}
              className={`rounded-xl px-2 py-3.5 ${
                selected === cat
                  ? 'bg-brand-green-forest/7 dark:bg-brand-green-forest/12'
                  : 'bg-transparent'
              }`}
            >
              <Text
                className={`text-brand-ink text-base dark:text-gray-100 ${
                  selected === cat ? 'font-semibold' : 'font-normal'
                }`}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}

function ToggleConfirmModal({
  target,
  onConfirm,
  onClose,
}: {
  target: Producto | null;
  onConfirm: (product: Producto) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={target !== null}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 bg-black/40" onPress={onClose} />
      <View
        className="rounded-3xl bg-white p-6 pb-[34px] dark:bg-gray-900"
        style={{ marginTop: 'auto' }}
      >
        <View className="mb-4 items-center">
          <View className="mb-3 h-14 w-14 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/30">
            <MaterialCommunityIcons
              name={
                target?.estado ? 'pause-circle-outline' : 'play-circle-outline'
              }
              size={26}
              color="#DE393A"
            />
          </View>
          <Text className="text-brand-ink text-center text-[17px] font-bold dark:text-gray-100">
            {target?.estado
              ? `Desactivar "${target?.nombre_producto}"?`
              : `Activar "${target?.nombre_producto}"?`}
          </Text>
          <Text className="mt-1.5 text-center text-sm text-gray-400 dark:text-gray-500">
            {target?.estado
              ? 'El producto se moverá a la papelera.'
              : 'El producto volverá a estar activo.'}
          </Text>
        </View>
        <View className="gap-2.5">
          <TouchableOpacity
            onPress={() => {
              if (target) onConfirm(target);
              onClose();
            }}
            activeOpacity={0.8}
            className="bg-brand-red-coral h-[50px] items-center justify-center rounded-[14px]"
          >
            <Text className="text-base font-semibold text-white">
              {target?.estado ? 'Desactivar' : 'Activar'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.8}
            className="h-[44px] items-center justify-center rounded-[14px] border-[1.5px] border-gray-200 dark:border-gray-700"
          >
            <Text className="text-brand-ink text-[15px] font-semibold dark:text-gray-100">
              Cancelar
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function DeleteConfirmModal({
  target,
  onPermanentDelete,
  onToggleStatus,
  onClose,
}: {
  target: Producto | null;
  onPermanentDelete: (t: Producto) => void;
  onToggleStatus: (t: Producto) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={target !== null}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 bg-black/40" onPress={onClose} />
      <View
        className="rounded-3xl bg-white p-6 pb-[34px] dark:bg-gray-900"
        style={{ marginTop: 'auto' }}
      >
        <View className="mb-4 items-center">
          <View className="mb-3 h-14 w-14 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/30">
            <MaterialCommunityIcons
              name="trash-can-outline"
              size={26}
              color="#DE393A"
            />
          </View>
          <Text className="text-brand-ink text-center text-[17px] font-bold dark:text-gray-100">
            {target?.estado === false
              ? `¿Eliminar permanentemente "${target?.nombre_producto}"?`
              : `¿Desactivar "${target?.nombre_producto}"?`}
          </Text>
          <Text className="mt-1.5 text-center text-sm text-gray-400 dark:text-gray-500">
            {target?.estado === false
              ? 'Esta acción no se puede deshacer.'
              : 'El producto se moverá a la papelera.'}
          </Text>
        </View>
        <View className="gap-2.5">
          <TouchableOpacity
            onPress={() => {
              if (!target) return;
              if (target.estado === false) {
                onPermanentDelete(target);
              } else {
                onToggleStatus(target);
                onClose();
              }
            }}
            activeOpacity={0.8}
            className="bg-brand-red-coral h-[50px] items-center justify-center rounded-[14px]"
          >
            <Text className="text-base font-semibold text-white">
              {target?.estado === false
                ? 'Eliminar permanentemente'
                : 'Desactivar'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.8}
            className="h-[44px] items-center justify-center rounded-[14px] border-[1.5px] border-gray-200 dark:border-gray-700"
          >
            <Text className="text-brand-ink text-[15px] font-semibold dark:text-gray-100">
              Cancelar
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function AdminProductsScreen(): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const brand = isDark ? '#4A8A63' : '#24563C';
  const muted = isDark ? '#9DA89D' : '#5E6B5E';

  const [tab, setTab] = useState<'list' | 'form'>('list');
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null);
  const [formValues, setFormValues] = useState({
    name: '',
    price: '',
    stock: '',
    category: '',
  });
  const [deleteTarget, setDeleteTarget] = useState<Producto | null>(null);
  const [toggleTarget, setToggleTarget] = useState<Producto | null>(null);
  const [showTrash, setShowTrash] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const savingRef = useRef(false);

  const queryClient = useQueryClient();
  const navigation =
    useNavigation<BottomTabNavigationProp<AdminTabParamList>>();

  useEffect(() => {
    return navigation.addListener('tabPress', () => {
      setShowTrash(false);
      setTab('list');
    });
  }, [navigation]);

  const { data: rawCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get('/categorias/');
      return parseApiList<Category>(response.data);
    },
    staleTime: 60_000,
  });

  const categories = useMemo(
    () => (Array.isArray(rawCategories) ? rawCategories : []),
    [rawCategories],
  );

  const {
    data: productData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['admin-productos'],
    queryFn: async () => {
      const [catalog, inactive, publications] = await Promise.all([
        fetchAllPages<Producto>('/productos/'),
        fetchAllPages<Producto>('/productos/?estado=false'),
        fetchAllPages<Publicacion>('/publicaciones/'),
      ]);

      const weekRows: WeeklyRow[] = [];
      for (const pub of publications) {
        const agricultor = pub.agricultor_nombre ?? 'Agricultor';
        for (const item of pub.productos ?? []) {
          weekRows.push({
            key: `pub-${pub.id_publicacion}-${item.id_producto_semanal}`,
            agricultor,
            nombre: item.producto_nombre ?? 'Producto',
            unidad: item.unidad_abreviatura ?? '',
            precio: item.precio,
            stock: item.stock,
            foto: item.foto,
          });
        }
      }

      return { catalog: [...catalog, ...inactive], weekRows };
    },
    staleTime: 30_000,
    retry: 2,
  });

  const invalidateAdminProducts = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['admin-productos'] });
  }, [queryClient]);

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      await api.post('/productos/', payload);
    },
    onSuccess: invalidateAdminProducts,
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: number;
      payload: Record<string, unknown>;
    }) => {
      await api.patch(`/productos/${String(id)}/`, payload);
    },
    onSuccess: invalidateAdminProducts,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, estado }: { id: number; estado: boolean }) => {
      await api.patch(`/productos/${String(id)}/`, { estado });
    },
    onSuccess: invalidateAdminProducts,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      // Solo se invoca desde la papelera: borrado definitivo (POST /permanent/)
      await api.post(`/productos/${String(id)}/permanent/`);
    },
    onSuccess: invalidateAdminProducts,
  });

  const catalog = productData?.catalog ?? [];
  const weekRows = productData?.weekRows ?? [];

  const activeProducts = catalog.filter((p) => p.estado);
  const inactiveProducts = catalog.filter((p) => !p.estado);

  const displayList: ListItem[] = showTrash
    ? inactiveProducts.map(
        (producto): ListItem => ({ kind: 'catalogo', producto }),
      )
    : [
        ...activeProducts.map(
          (producto): ListItem => ({ kind: 'catalogo', producto }),
        ),
        ...weekRows.map((row): ListItem => ({ kind: 'publicacion', row })),
      ];

  const categoryNames = useMemo(
    () => [...new Set(categories.map((c) => c.nombre))],
    [categories],
  );

  const isFormActive = tab === 'form';

  function startNew() {
    setEditingProduct(null);
    setFormValues({ name: '', price: '', stock: '', category: '' });
    setTab('form');
  }

  function startEdit(product: Producto) {
    setEditingProduct(product);
    setFormValues({
      name: product.nombre_producto,
      price: product.precio,
      stock: String(product.stock),
      category: product.categoria?.nombre ?? '',
    });
    setTab('form');
  }

  function switchToList() {
    setTab('list');
    setEditingProduct(null);
  }

  async function handleSave() {
    if (!formValues.name.trim() || !formValues.price.trim()) return;
    const category = categories.find((c) => c.nombre === formValues.category);
    if (!category) return;
    if (savingRef.current) return;
    savingRef.current = true;

    const payload: Record<string, unknown> = {
      nombre_producto: formValues.name.trim(),
      descripcion: '',
      precio: parseFloat(formValues.price),
      stock: Number.isFinite(parseInt(formValues.stock, 10))
        ? parseInt(formValues.stock, 10)
        : 0,
      es_perecedero: false,
      fk_categoria: category.id_categoria,
      fk_unidad: null,
      estado: true,
    };

    try {
      if (editingProduct) {
        await updateMutation.mutateAsync({
          id: editingProduct.id_producto,
          payload,
        });
      } else {
        await createMutation.mutateAsync(payload);
      }
      switchToList();
    } catch {
      // Backend errors leave the form open so the admin can retry.
    } finally {
      savingRef.current = false;
    }
  }

  function toggleStatus(product: Producto) {
    toggleMutation.mutate({ id: product.id_producto, estado: !product.estado });
  }

  function restoreProduct(product: Producto) {
    toggleMutation.mutate({ id: product.id_producto, estado: true });
  }

  function permanentDelete(product: Producto) {
    deleteMutation.mutate(product.id_producto);
    setDeleteTarget(null);
  }

  function renderThumbnail(item: Producto) {
    const uri = mediaUrl(item.imagen_principal ?? item.imagen);
    if (uri) {
      return (
        <Image
          source={{ uri }}
          className="h-10 w-10 rounded-full"
          resizeMode="cover"
        />
      );
    }
    return (
      <View className="h-10 w-10 items-center justify-center rounded-full bg-brand-green-forest/7 dark:bg-brand-green-forest/12">
        <MaterialCommunityIcons
          name="package-variant"
          size={20}
          color={brand}
        />
      </View>
    );
  }

  function renderCatalogCard(item: Producto, isTrash: boolean) {
    const handleActions = isTrash ? (
      <>
        <Pressable
          onPress={() => restoreProduct(item)}
          className="h-9 w-9 items-center justify-center rounded-[10px] border border-gray-200 dark:border-gray-700"
          hitSlop={6}
        >
          <MaterialCommunityIcons name="restore" size={16} color={brand} />
        </Pressable>
        <Pressable
          onPress={() => setDeleteTarget(item)}
          className="h-9 w-9 items-center justify-center rounded-[10px] border border-gray-200 dark:border-gray-700"
          hitSlop={6}
        >
          <MaterialCommunityIcons
            name="delete-forever"
            size={16}
            color="#DE393A"
          />
        </Pressable>
      </>
    ) : (
      <>
        <Pressable
          onPress={() => startEdit(item)}
          className="h-9 w-9 items-center justify-center rounded-[10px] border border-gray-200 dark:border-gray-700"
          hitSlop={6}
        >
          <MaterialCommunityIcons
            name="pencil-outline"
            size={16}
            color={brand}
          />
        </Pressable>
        <Pressable
          onPress={() => setToggleTarget(item)}
          className="h-9 w-9 items-center justify-center rounded-[10px] border border-gray-200 dark:border-gray-700"
          hitSlop={6}
        >
          <MaterialCommunityIcons
            name={item.estado ? 'pause-circle-outline' : 'play-circle-outline'}
            size={16}
            color={muted}
          />
        </Pressable>
        <Pressable
          onPress={() => setDeleteTarget(item)}
          className="h-9 w-9 items-center justify-center rounded-[10px] border border-gray-200 dark:border-gray-700"
          hitSlop={6}
        >
          <MaterialCommunityIcons
            name="trash-can-outline"
            size={16}
            color="#DE393A"
          />
        </Pressable>
      </>
    );

    return (
      <View className="flex-row items-center gap-3.5 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <View className="h-10 w-10 items-center justify-center overflow-hidden rounded-full">
          {renderThumbnail(item)}
        </View>

        <View className="flex-1">
          <View className="mb-1 flex-row items-center gap-1.5">
            <View className="rounded-md bg-brand-green-forest/7 px-2 py-0.5 dark:bg-brand-green-forest/12">
              <Text className="text-brand-green-forest text-[10px] font-semibold">
                Catálogo
              </Text>
            </View>
          </View>
          <Text
            className="text-brand-ink text-base font-semibold dark:text-gray-100"
            numberOfLines={1}
          >
            {item.nombre_producto}
          </Text>
          <Text
            className="mt-0.5 text-[13px] text-gray-400 dark:text-gray-500"
            numberOfLines={1}
          >
            {item.categoria?.nombre ?? ''}
            {item.unidad?.nombre
              ? ` · ${item.unidad.nombre}`
              : item.unidad?.tipo
                ? ` · ${item.unidad.tipo}`
                : ''}
            {' · Stock '}
            {item.stock}
          </Text>
        </View>

        <Text className="text-brand-green-forest text-base font-bold dark:text-brand-green-forest">
          ${item.precio}
        </Text>

        {handleActions}
      </View>
    );
  }

  function renderFarmerCard(item: WeeklyRow) {
    return (
      <View className="flex-row items-center gap-3.5 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <View className="h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-brand-orange/10">
          {item.foto ? (
            <Image
              source={{ uri: mediaUrl(item.foto) ?? undefined }}
              className="h-10 w-10 rounded-full"
              resizeMode="cover"
            />
          ) : (
            <MaterialCommunityIcons name="store-outline" size={20} color="#E46C38" />
          )}
        </View>

        <View className="flex-1">
          <View className="mb-1 flex-row items-center gap-1.5">
            <View className="max-w-full rounded-md px-2 py-0.5 bg-brand-orange/10">
              <Text
                className="text-brand-orange text-[10px] font-semibold"
                numberOfLines={1}
              >
                {item.agricultor}
              </Text>
            </View>
          </View>
          <Text
            className="text-brand-ink text-base font-semibold dark:text-gray-100"
            numberOfLines={1}
          >
            {item.nombre}
          </Text>
          <Text
            className="mt-0.5 text-[13px] text-gray-400 dark:text-gray-500"
            numberOfLines={1}
          >
            {item.unidad ? `Unidad: ${item.unidad}` : ''} · Stock {item.stock}
          </Text>
        </View>

        <Text className="text-brand-green-forest text-base font-bold dark:text-brand-green-forest">
          ${item.precio}
        </Text>

        <MaterialCommunityIcons name="lock-outline" size={18} color={muted} />
      </View>
    );
  }

  function renderCard(item: ListItem) {
    if (item.kind === 'catalogo') {
      return renderCatalogCard(item.producto, showTrash);
    }
    return renderFarmerCard(item.row);
  }

  function renderHeader() {
    return (
      <View
        className="flex-row items-center justify-between px-5 pb-1"
        style={{ paddingTop: 60 }}
      >
        <Text className="text-brand-ink text-[28px] font-bold tracking-tight dark:text-gray-100">
          Productos
        </Text>
        {!showTrash && inactiveProducts.length > 0 ? (
          <TouchableOpacity onPress={() => setShowTrash(true)} hitSlop={8}>
            <MaterialCommunityIcons
              name="delete-restore"
              size={24}
              color={muted}
            />
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  function renderSegmentedControl() {
    if (showTrash) return null;
    return (
      <View className="px-5 pt-3 pb-4">
        <View className="flex-row rounded-[10px] bg-gray-100 p-[3px] dark:bg-gray-800">
          <TouchableOpacity
            onPress={() => {
              if (!isFormActive) return;
              switchToList();
            }}
            className={`flex-1 items-center rounded-lg py-2 ${
              isFormActive ? 'bg-transparent' : 'bg-white dark:bg-gray-900'
            }`}
            activeOpacity={0.7}
          >
            <Text
              className={`text-[13px] font-semibold tracking-wide ${
                isFormActive
                  ? 'text-gray-400 dark:text-gray-500'
                  : 'text-brand-ink dark:text-gray-100'
              }`}
            >
              📋 Lista
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              if (isFormActive) return;
              startNew();
            }}
            className={`flex-1 items-center rounded-lg py-2 ${
              isFormActive ? 'bg-white dark:bg-gray-900' : 'bg-transparent'
            }`}
            activeOpacity={0.7}
          >
            <Text
              className={`text-[13px] font-semibold tracking-wide ${
                isFormActive
                  ? 'text-brand-ink dark:text-gray-100'
                  : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              ➕ Nuevo
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function renderForm() {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ padding: 20, gap: 18 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text className="text-brand-ink text-lg font-bold dark:text-gray-100">
            {editingProduct ? 'Editar producto' : 'Nuevo producto'}
          </Text>

          <View className="gap-1.5">
            <Text className="text-xs font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-500">
              Nombre
            </Text>
            <TextInput
              value={formValues.name}
              onChangeText={(t) => setFormValues((p) => ({ ...p, name: t }))}
              placeholder="ej. Aguacate Hass"
              placeholderTextColor={muted}
              className="text-brand-ink h-[46px] rounded-xl border-[1.5px] border-gray-200 bg-white px-3.5 text-[15px] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
          </View>

          <View className="gap-1.5">
            <Text className="text-xs font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-500">
              Categoría
            </Text>
            <TouchableOpacity
              onPress={() => setShowPicker(true)}
              activeOpacity={0.7}
              className="flex-row items-center justify-between rounded-xl border-[1.5px] border-gray-200 bg-white px-3.5 dark:border-gray-700 dark:bg-gray-900"
              style={{ height: 46 }}
            >
              <Text
                className={`text-[15px] ${
                  formValues.category
                    ? 'text-brand-ink dark:text-gray-100'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {formValues.category || 'Seleccionar…'}
              </Text>
              <MaterialCommunityIcons
                name="chevron-down"
                size={20}
                color={muted}
              />
            </TouchableOpacity>
          </View>

          <View className="gap-1.5">
            <Text className="text-xs font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-500">
              Precio
            </Text>
            <TextInput
              value={formValues.price}
              onChangeText={(t) => setFormValues((p) => ({ ...p, price: t }))}
              placeholder="0.00"
              placeholderTextColor={muted}
              keyboardType="decimal-pad"
              className="text-brand-ink h-[46px] rounded-xl border-[1.5px] border-gray-200 bg-white px-3.5 text-[15px] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
          </View>

          <View className="gap-1.5">
            <Text className="text-xs font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-500">
              Stock
            </Text>
            <TextInput
              value={formValues.stock}
              onChangeText={(t) => setFormValues((p) => ({ ...p, stock: t }))}
              placeholder="ej. 200"
              placeholderTextColor={muted}
              keyboardType="number-pad"
              className="text-brand-ink h-[46px] rounded-xl border-[1.5px] border-gray-200 bg-white px-3.5 text-[15px] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
          </View>
        </ScrollView>

        <View className="gap-2.5 border-t border-gray-200 p-5 dark:border-gray-700">
          <TouchableOpacity
            onPress={() => void handleSave()}
            activeOpacity={0.8}
            className="bg-brand-red-coral h-[50px] items-center justify-center rounded-[14px]"
          >
            <Text className="text-base font-semibold text-white">Guardar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={switchToList}
            activeOpacity={0.8}
            className="h-[44px] items-center justify-center rounded-[14px] border-[1.5px] border-gray-200 dark:border-gray-700"
          >
            <Text className="text-brand-ink text-[15px] font-semibold dark:text-gray-100">
              Cancelar
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  function renderEmpty() {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <MaterialCommunityIcons
          name={showTrash ? 'delete-restore' : 'package-variant'}
          size={64}
          color={muted}
        />
        <Text className="mt-4 text-center text-xl font-bold text-gray-400 dark:text-gray-500">
          {showTrash ? 'No hay productos en la papelera' : 'No hay productos'}
        </Text>
        <Text className="mt-1 text-center text-sm text-gray-400 dark:text-gray-500">
          {showTrash
            ? 'Los productos desactivados aparecerán aquí.'
            : 'Los productos del catálogo y las publicaciones de los agricultores aparecerán aquí.'}
        </Text>
      </View>
    );
  }

  function renderLoading() {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={brand} />
      </View>
    );
  }

  function renderError() {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={64}
          color={muted}
        />
        <Text className="mt-4 text-center text-xl font-bold text-gray-400 dark:text-gray-500">
          Error al cargar productos
        </Text>
        <Text className="mt-1 text-center text-sm text-gray-400 dark:text-gray-500">
          Ocurrió un problema inesperado. Intenta de nuevo más tarde.
        </Text>
        <TouchableOpacity
          onPress={() => void refetch()}
          activeOpacity={0.8}
          className="mt-5 rounded-[12px] border-[1.5px] border-gray-200 bg-white px-6 py-3 dark:border-gray-700 dark:bg-gray-900"
        >
          <Text className="text-brand-ink text-[15px] font-semibold dark:text-gray-100">
            Reintentar
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderList() {
    return (
      <FlatList
        data={displayList}
        keyExtractor={(item) =>
          item.kind === 'catalogo'
            ? `c-${item.producto.id_producto}`
            : item.row.key
        }
        contentContainerStyle={{ padding: 20, paddingBottom: 32, gap: 10 }}
        renderItem={({ item }) => renderCard(item)}
      />
    );
  }

  function renderContent() {
    if (isFormActive) return renderForm();
    if (isLoading) return renderLoading();
    if (isError) return renderError();
    if (displayList.length === 0) return renderEmpty();
    return renderList();
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-950">
      {renderHeader()}
      {showTrash ? (
        <Text className="mt-0.5 px-5 text-base text-gray-400 dark:text-gray-500">
          Papelera
        </Text>
      ) : null}
      {renderSegmentedControl()}
      {renderContent()}

      <CategoryPickerModal
        visible={showPicker}
        categories={categoryNames}
        selected={formValues.category}
        onSelect={(cat) => setFormValues((p) => ({ ...p, category: cat }))}
        onClose={() => setShowPicker(false)}
      />

      <ToggleConfirmModal
        target={toggleTarget}
        onConfirm={toggleStatus}
        onClose={() => setToggleTarget(null)}
      />

      <DeleteConfirmModal
        target={deleteTarget}
        onPermanentDelete={permanentDelete}
        onToggleStatus={toggleStatus}
        onClose={() => setDeleteTarget(null)}
      />
    </View>
  );
}