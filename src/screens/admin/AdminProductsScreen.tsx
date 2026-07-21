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

const overlayBg = 'rgba(0,0,0,0.4)';
const transparentBg = 'transparent';
const trashBg = 'rgba(242,169,0,0.1)';

function CategoryPickerModal({
  visible,
  categories,
  selected,
  onSelect,
  onClose,
  surface,
  fg,
  accentBg,
}: {
  visible: boolean;
  categories: string[];
  selected: string;
  onSelect: (c: string) => void;
  onClose: () => void;
  surface: string;
  fg: string;
  accentBg: string;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: overlayBg,
          justifyContent: 'center',
          padding: 40,
        }}
        onPress={onClose}
      >
        <View
          style={{
            backgroundColor: surface,
            borderRadius: 20,
            padding: 16,
            gap: 4,
          }}
        >
          <Text
            style={{
              fontSize: 17,
              fontWeight: '700',
              color: fg,
              marginBottom: 8,
              paddingHorizontal: 8,
            }}
          >
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
              style={{
                paddingVertical: 14,
                paddingHorizontal: 8,
                borderRadius: 12,
                backgroundColor: selected === cat ? accentBg : transparentBg,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  color: fg,
                  fontWeight: selected === cat ? '600' : '400',
                }}
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
  surface,
  fg,
  muted,
  iconWhite,
  errorColor,
  border,
  iconBg,
}: {
  target: Product | null;
  onConfirm: (product: Product) => void;
  onClose: () => void;
  surface: string;
  fg: string;
  muted: string;
  iconWhite: string;
  errorColor: string;
  border: string;
  iconBg: string;
}) {
  return (
    <Modal
      visible={target !== null}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        style={{ flex: 1, backgroundColor: overlayBg }}
        onPress={onClose}
      />
      <View
        style={{
          backgroundColor: surface,
          borderRadius: 24,
          padding: 24,
          paddingBottom: 34,
          marginTop: 'auto',
        }}
      >
        <View style={{ alignItems: 'center', marginBottom: 16 }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: iconBg,
              marginBottom: 12,
            }}
          >
            <MaterialCommunityIcons
              name={
                target?.estado ? 'pause-circle-outline' : 'play-circle-outline'
              }
              size={26}
              color={errorColor}
            />
          </View>
          <Text
            style={{
              fontSize: 17,
              fontWeight: '700',
              color: fg,
              textAlign: 'center',
            }}
          >
            {target?.estado
              ? `Desactivar "${target?.name}"?`
              : `Activar "${target?.name}"?`}
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: muted,
              marginTop: 6,
              textAlign: 'center',
            }}
          >
            {target?.estado
              ? 'El producto se moverá a la papelera.'
              : 'El producto volverá a estar activo.'}
          </Text>
        </View>
        <View style={{ gap: 10 }}>
          <TouchableOpacity
            onPress={() => {
              if (target) onConfirm(target);
              onClose();
            }}
            activeOpacity={0.8}
            style={{
              height: 50,
              borderRadius: 14,
              backgroundColor: errorColor,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '600', color: iconWhite }}>
              {target?.estado ? 'Desactivar' : 'Activar'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.8}
            style={{
              height: 44,
              borderRadius: 14,
              borderWidth: 1.5,
              borderColor: border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '600', color: fg }}>
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
  surface,
  fg,
  muted,
  iconWhite,
  errorColor,
  border,
  iconBg,
}: {
  target: Product | null;
  onPermanentDelete: (t: Product) => void;
  onToggleStatus: (t: Product) => void;
  onClose: () => void;
  surface: string;
  fg: string;
  muted: string;
  iconWhite: string;
  errorColor: string;
  border: string;
  iconBg: string;
}) {
  return (
    <Modal
      visible={target !== null}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        style={{ flex: 1, backgroundColor: overlayBg }}
        onPress={onClose}
      />
      <View
        style={{
          backgroundColor: surface,
          borderRadius: 24,
          padding: 24,
          paddingBottom: 34,
          marginTop: 'auto',
        }}
      >
        <View style={{ alignItems: 'center', marginBottom: 16 }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: iconBg,
              marginBottom: 12,
            }}
          >
            <MaterialCommunityIcons
              name="trash-can-outline"
              size={26}
              color={errorColor}
            />
          </View>
          <Text
            style={{
              fontSize: 17,
              fontWeight: '700',
              color: fg,
              textAlign: 'center',
            }}
          >
            {target?.estado === false
              ? `¿Eliminar permanentemente "${target?.name}"?`
              : `¿Desactivar "${target?.name}"?`}
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: muted,
              marginTop: 6,
              textAlign: 'center',
            }}
          >
            {target?.estado === false
              ? 'Esta acción no se puede deshacer.'
              : 'El producto se moverá a la papelera.'}
          </Text>
        </View>
        <View style={{ gap: 10 }}>
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
            style={{
              height: 50,
              borderRadius: 14,
              backgroundColor: errorColor,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '600', color: iconWhite }}>
              {target?.estado === false
                ? 'Eliminar permanentemente'
                : 'Desactivar'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.8}
            style={{
              height: 44,
              borderRadius: 14,
              borderWidth: 1.5,
              borderColor: border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '600', color: fg }}>
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
  const bg = isDark ? '#1A211B' : '#F5F7F0';
  const surface = isDark ? '#263028' : '#FFFFFF';
  const fg = isDark ? '#E8EAE4' : '#2D3328';
  const muted = isDark ? '#9DA89D' : '#5E6B5E';
  const border = isDark ? '#353D35' : '#E2E6DF';
  const brand = isDark ? '#4A8A63' : '#24563C';
  const iconWhite = '#FFFFFF';
  const errorColor = '#DE393A';
  const accentBg = isDark ? 'rgba(74,138,99,0.12)' : 'rgba(36,86,60,0.07)';
  const iconBg = isDark ? '#3D2023' : '#FDEDEE';
  const segBg = isDark ? '#263028' : '#E8ECE4';

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
      <View
        style={{
          backgroundColor: surface,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: border,
          padding: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isTrash ? trashBg : accentBg,
          }}
        >
          <MaterialCommunityIcons name={iconName} size={20} color={iconColor} />
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{ fontSize: 16, fontWeight: '600', color: fg }}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <Text
            style={{ fontSize: 13, color: muted, marginTop: 2 }}
            numberOfLines={1}
          >
            {item.category} · {item.stock}
          </Text>
        </View>

        <Text style={{ fontSize: 16, fontWeight: '700', color: brand }}>
          ${item.price}
        </Text>

        {isTrash ? (
          <>
            <Pressable
              onPress={() => restoreProduct(item)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              hitSlop={6}
            >
              <MaterialCommunityIcons name="restore" size={16} color={brand} />
            </Pressable>
            <Pressable
              onPress={() => setDeleteTarget(item)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              hitSlop={6}
            >
              <MaterialCommunityIcons
                name="delete-forever"
                size={16}
                color={errorColor}
              />
            </Pressable>
          </>
        ) : (
          <>
            <Pressable
              onPress={() => startEdit(item)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
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
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
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
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              hitSlop={6}
            >
              <MaterialCommunityIcons
                name="trash-can-outline"
                size={16}
                color={errorColor}
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
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingTop: 60,
          paddingBottom: 4,
        }}
      >
        <Text
          style={{
            fontSize: 28,
            fontWeight: '700',
            letterSpacing: -0.02,
            color: fg,
          }}
        >
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
      <View
        style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 }}
      >
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: segBg,
            borderRadius: 10,
            padding: 3,
          }}
        >
          <TouchableOpacity
            onPress={() => {
              if (!isFormActive) return;
              switchToList();
            }}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: isFormActive ? transparentBg : surface,
              alignItems: 'center',
            }}
            activeOpacity={0.7}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: isFormActive ? muted : fg,
                letterSpacing: 0.01,
              }}
            >
              📋 Lista
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              if (isFormActive) return;
              startNew();
            }}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: isFormActive ? surface : transparentBg,
              alignItems: 'center',
            }}
            activeOpacity={0.7}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: isFormActive ? fg : muted,
                letterSpacing: 0.01,
              }}
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
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ padding: 20, gap: 18 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={{ fontSize: 18, fontWeight: '700', color: fg }}>
            {editingProduct ? 'Editar producto' : 'Nuevo producto'}
          </Text>

          <View style={{ gap: 6 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                letterSpacing: 0.08,
                textTransform: 'uppercase',
                color: muted,
              }}
            >
              Nombre
            </Text>
            <TextInput
              value={formValues.name}
              onChangeText={(t) => setFormValues((p) => ({ ...p, name: t }))}
              placeholder="ej. Aguacate Hass"
              placeholderTextColor={muted}
              style={{
                borderWidth: 1.5,
                borderColor: border,
                borderRadius: 12,
                backgroundColor: surface,
                color: fg,
                fontSize: 15,
                paddingHorizontal: 14,
                height: 46,
              }}
            />
          </View>

          <View style={{ gap: 6 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                letterSpacing: 0.08,
                textTransform: 'uppercase',
                color: muted,
              }}
            >
              Categoría
            </Text>
            <TouchableOpacity
              onPress={() => setShowPicker(true)}
              activeOpacity={0.7}
              style={{
                borderWidth: 1.5,
                borderColor: border,
                borderRadius: 12,
                backgroundColor: surface,
                paddingHorizontal: 14,
                height: 46,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text
                style={{
                  fontSize: 15,
                  color: formValues.category ? fg : muted,
                }}
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

          <View style={{ gap: 6 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                letterSpacing: 0.08,
                textTransform: 'uppercase',
                color: muted,
              }}
            >
              Precio
            </Text>
            <TextInput
              value={formValues.price}
              onChangeText={(t) => setFormValues((p) => ({ ...p, price: t }))}
              placeholder="0.00"
              placeholderTextColor={muted}
              keyboardType="decimal-pad"
              style={{
                borderWidth: 1.5,
                borderColor: border,
                borderRadius: 12,
                backgroundColor: surface,
                color: fg,
                fontSize: 15,
                paddingHorizontal: 14,
                height: 46,
              }}
            />
          </View>

          <View style={{ gap: 6 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                letterSpacing: 0.08,
                textTransform: 'uppercase',
                color: muted,
              }}
            >
              Stock
            </Text>
            <TextInput
              value={formValues.stock}
              onChangeText={(t) => setFormValues((p) => ({ ...p, stock: t }))}
              placeholder="ej. 200 kg"
              placeholderTextColor={muted}
              style={{
                borderWidth: 1.5,
                borderColor: border,
                borderRadius: 12,
                backgroundColor: surface,
                color: fg,
                fontSize: 15,
                paddingHorizontal: 14,
                height: 46,
              }}
            />
          </View>
        </ScrollView>

        <View
          style={{
            padding: 20,
            gap: 10,
            borderTopWidth: 1,
            borderTopColor: border,
          }}
        >
          <TouchableOpacity
            onPress={handleSave}
            activeOpacity={0.8}
            style={{
              height: 50,
              borderRadius: 14,
              backgroundColor: errorColor,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '600', color: iconWhite }}>
              Guardar
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={switchToList}
            activeOpacity={0.8}
            style={{
              height: 44,
              borderRadius: 14,
              borderWidth: 1.5,
              borderColor: border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '600', color: fg }}>
              Cancelar
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  function renderEmpty() {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 24,
        }}
      >
        <MaterialCommunityIcons
          name={showTrash ? 'delete-restore' : 'package-variant'}
          size={64}
          color={muted}
        />
        <Text
          style={{
            marginTop: 16,
            textAlign: 'center',
            fontSize: 20,
            fontWeight: '700',
            color: muted,
          }}
        >
          {showTrash ? 'No hay productos en la papelera' : 'No hay productos'}
        </Text>
        <Text
          style={{
            marginTop: 4,
            textAlign: 'center',
            fontSize: 14,
            color: muted,
          }}
        >
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
    <View style={{ flex: 1, backgroundColor: bg }}>
      {renderHeader()}
      {showTrash ? (
        <Text
          style={{
            fontSize: 16,
            color: muted,
            marginTop: 2,
            paddingHorizontal: 20,
          }}
        >
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
        surface={surface}
        fg={fg}
        accentBg={accentBg}
      />

      <ToggleConfirmModal
        target={toggleTarget}
        onConfirm={toggleStatus}
        onClose={() => setToggleTarget(null)}
        surface={surface}
        fg={fg}
        muted={muted}
        iconWhite={iconWhite}
        errorColor={errorColor}
        border={border}
        iconBg={iconBg}
      />

      <DeleteConfirmModal
        target={deleteTarget}
        onPermanentDelete={permanentDelete}
        onToggleStatus={toggleStatus}
        onClose={() => setDeleteTarget(null)}
        surface={surface}
        fg={fg}
        muted={muted}
        iconWhite={iconWhite}
        errorColor={errorColor}
        border={border}
        iconBg={iconBg}
      />
    </View>
  );
}
