import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
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

import { useTheme } from '@/store/ThemeContext';

type AdminTabParamList = {
  AdminProducts: undefined;
  AdminPanel: undefined;
};

interface Product {
  id: number;
  name: string;
  price: string;
  stock: string;
  category: string;
  estado: boolean;
}

let nextId = 6;

const initialProducts: Product[] = [
  {
    id: 1,
    name: 'Tomate orgánico',
    price: '45.00',
    stock: '200 kg',
    category: 'Hortalizas',
    estado: true,
  },
  {
    id: 2,
    name: 'Zanahoria premium',
    price: '28.00',
    stock: '150 kg',
    category: 'Hortalizas',
    estado: true,
  },
  {
    id: 3,
    name: 'Lechuga iceberg',
    price: '35.00',
    stock: '300 unid',
    category: 'Hortalizas',
    estado: true,
  },
  {
    id: 4,
    name: 'Maíz dulce',
    price: '60.00',
    stock: '100 m',
    category: 'Cereales',
    estado: true,
  },
  {
    id: 5,
    name: 'Frijoles negros',
    price: '32.00',
    stock: '500 kg',
    category: 'Legumbres',
    estado: true,
  },
];

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
          <Text className="mb-2 px-2 text-[17px] font-bold text-brand-ink dark:text-gray-100">
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
                className={`text-base text-brand-ink dark:text-gray-100 ${
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
  target: Product | null;
  onConfirm: (product: Product) => void;
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
          <Text className="text-center text-[17px] font-bold text-brand-ink dark:text-gray-100">
            {target?.estado
              ? `Desactivar "${target?.name}"?`
              : `Activar "${target?.name}"?`}
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
            className="h-[50px] items-center justify-center rounded-[14px] bg-brand-red-coral"
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
            <Text className="text-[15px] font-semibold text-brand-ink dark:text-gray-100">
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
  target: Product | null;
  onPermanentDelete: (t: Product) => void;
  onToggleStatus: (t: Product) => void;
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
          <Text className="text-center text-[17px] font-bold text-brand-ink dark:text-gray-100">
            {target?.estado === false
              ? `¿Eliminar permanentemente "${target?.name}"?`
              : `¿Desactivar "${target?.name}"?`}
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
            className="h-[50px] items-center justify-center rounded-[14px] bg-brand-red-coral"
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
            <Text className="text-[15px] font-semibold text-brand-ink dark:text-gray-100">
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

  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [tab, setTab] = useState<'list' | 'form'>('list');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formValues, setFormValues] = useState({
    name: '',
    price: '',
    stock: '',
    category: '',
  });
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [toggleTarget, setToggleTarget] = useState<Product | null>(null);
  const [showTrash, setShowTrash] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const savingRef = useRef(false);

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category))],
    [products],
  );
  const navigation =
    useNavigation<BottomTabNavigationProp<AdminTabParamList>>();

  useEffect(() => {
    return navigation.addListener('tabPress', () => {
      setShowTrash(false);
      setTab('list');
    });
  }, [navigation]);

  const activeProducts = products.filter((p) => p.estado);
  const inactiveProducts = products.filter((p) => !p.estado);
  const displayProducts = showTrash ? inactiveProducts : activeProducts;

  const isFormActive = tab === 'form';

  function startNew() {
    setEditingProduct(null);
    setFormValues({ name: '', price: '', stock: '', category: '' });
    setTab('form');
  }

  function startEdit(product: Product) {
    setEditingProduct(product);
    setFormValues({
      name: product.name,
      price: product.price,
      stock: product.stock,
      category: product.category,
    });
    setTab('form');
  }

  function switchToList() {
    setTab('list');
    setEditingProduct(null);
  }

  function handleSave() {
    if (!formValues.name.trim() || !formValues.price.trim()) return;
    if (savingRef.current) return;
    savingRef.current = true;

    if (editingProduct) {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === editingProduct.id
            ? {
                ...p,
                name: formValues.name.trim(),
                price: formValues.price.trim(),
                stock: formValues.stock.trim(),
                category: formValues.category.trim(),
              }
            : p,
        ),
      );
    } else {
      setProducts((prev) => [
        ...prev,
        {
          id: nextId++,
          name: formValues.name.trim(),
          price: formValues.price.trim(),
          stock: formValues.stock.trim(),
          category: formValues.category.trim(),
          estado: true,
        },
      ]);
    }
    savingRef.current = false;
    switchToList();
  }

  function toggleStatus(product: Product) {
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, estado: !p.estado } : p)),
    );
  }

  function restoreProduct(product: Product) {
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, estado: true } : p)),
    );
  }

  function permanentDelete(product: Product) {
    setProducts((prev) => prev.filter((p) => p.id !== product.id));
    setDeleteTarget(null);
  }

  function renderCard(item: Product) {
    const isTrash = !item.estado;
    const iconName = isTrash
      ? ('delete-restore' as const)
      : ('package-variant' as const);
    const iconColor = isTrash ? '#F2A900' : brand;
    return (
      <View className="flex-row items-center gap-3.5 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <View
          className={`h-10 w-10 items-center justify-center rounded-full ${
            isTrash
              ? 'bg-brand-orange/10'
              : 'bg-brand-green-forest/7 dark:bg-brand-green-forest/12'
          }`}
        >
          <MaterialCommunityIcons name={iconName} size={20} color={iconColor} />
        </View>

        <View className="flex-1">
          <Text
            className="text-base font-semibold text-brand-ink dark:text-gray-100"
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <Text
            className="mt-0.5 text-[13px] text-gray-400 dark:text-gray-500"
            numberOfLines={1}
          >
            {item.category} · {item.stock}
          </Text>
        </View>

        <Text className="text-base font-bold text-brand-green-forest dark:text-brand-green-forest">
          ${item.price}
        </Text>

        {isTrash ? (
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
                name={
                  item.estado ? 'pause-circle-outline' : 'play-circle-outline'
                }
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
        )}
      </View>
    );
  }

  function renderHeader() {
    return (
      <View
        className="flex-row items-center justify-between px-5 pb-1"
        style={{ paddingTop: 60 }}
      >
        <Text className="text-[28px] font-bold tracking-tight text-brand-ink dark:text-gray-100">
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
      <View className="px-5 pb-4 pt-3">
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
          <Text className="text-lg font-bold text-brand-ink dark:text-gray-100">
            {editingProduct ? 'Editar producto' : 'Nuevo producto'}
          </Text>

          <View className="gap-1.5">
            <Text className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Nombre
            </Text>
            <TextInput
              value={formValues.name}
              onChangeText={(t) => setFormValues((p) => ({ ...p, name: t }))}
              placeholder="ej. Aguacate Hass"
              placeholderTextColor={muted}
              className="h-[46px] rounded-xl border-[1.5px] border-gray-200 bg-white px-3.5 text-[15px] text-brand-ink dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
          </View>

          <View className="gap-1.5">
            <Text className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
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
            <Text className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Precio
            </Text>
            <TextInput
              value={formValues.price}
              onChangeText={(t) => setFormValues((p) => ({ ...p, price: t }))}
              placeholder="0.00"
              placeholderTextColor={muted}
              keyboardType="decimal-pad"
              className="h-[46px] rounded-xl border-[1.5px] border-gray-200 bg-white px-3.5 text-[15px] text-brand-ink dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
          </View>

          <View className="gap-1.5">
            <Text className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Stock
            </Text>
            <TextInput
              value={formValues.stock}
              onChangeText={(t) => setFormValues((p) => ({ ...p, stock: t }))}
              placeholder="ej. 200 kg"
              placeholderTextColor={muted}
              className="h-[46px] rounded-xl border-[1.5px] border-gray-200 bg-white px-3.5 text-[15px] text-brand-ink dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
          </View>
        </ScrollView>

        <View className="gap-2.5 border-t border-gray-200 p-5 dark:border-gray-700">
          <TouchableOpacity
            onPress={handleSave}
            activeOpacity={0.8}
            className="h-[50px] items-center justify-center rounded-[14px] bg-brand-red-coral"
          >
            <Text className="text-base font-semibold text-white">Guardar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={switchToList}
            activeOpacity={0.8}
            className="h-[44px] items-center justify-center rounded-[14px] border-[1.5px] border-gray-200 dark:border-gray-700"
          >
            <Text className="text-[15px] font-semibold text-brand-ink dark:text-gray-100">
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
            : 'Agregá un producto para comenzar.'}
        </Text>
      </View>
    );
  }

  function renderList() {
    return (
      <FlatList
        data={displayProducts}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 20, paddingBottom: 32, gap: 10 }}
        renderItem={({ item }) => renderCard(item)}
      />
    );
  }

  function renderContent() {
    if (isFormActive) return renderForm();
    if (displayProducts.length === 0) return renderEmpty();
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
        categories={categories}
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
