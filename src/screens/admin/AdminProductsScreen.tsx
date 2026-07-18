import React, { useEffect, useMemo, useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { useTheme } from '@/store/ThemeContext';

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
  { id: 1, name: 'Tomate orgánico', price: '45.00', stock: '200 kg', category: 'Hortalizas', estado: true },
  { id: 2, name: 'Zanahoria premium', price: '28.00', stock: '150 kg', category: 'Hortalizas', estado: true },
  { id: 3, name: 'Lechuga iceberg', price: '35.00', stock: '300 unid', category: 'Hortalizas', estado: true },
  { id: 4, name: 'Maíz dulce', price: '60.00', stock: '100 m', category: 'Cereales', estado: true },
  { id: 5, name: 'Frijoles negros', price: '32.00', stock: '500 kg', category: 'Legumbres', estado: true },
];

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

  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [tab, setTab] = useState<'list' | 'form'>('list');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formValues, setFormValues] = useState({ name: '', price: '', stock: '', category: '' });
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [toggleTarget, setToggleTarget] = useState<Product | null>(null);
  const [showTrash, setShowTrash] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const categories = useMemo(() => [...new Set(products.map((p) => p.category))], [products]);
  const navigation = useNavigation<BottomTabNavigationProp<any>>();

  // Resetear al presionar el tab
  useEffect(() => {
    const unsub = navigation.addListener('tabPress', () => {
      setShowTrash(false);
      setTab('list');
    });
    return unsub;
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
    setFormValues({ name: product.name, price: product.price, stock: product.stock, category: product.category });
    setTab('form');
  }

  function switchToList() {
    setTab('list');
    setEditingProduct(null);
  }

  function handleSave() {
    if (!formValues.name.trim() || !formValues.price.trim()) return;

    if (editingProduct) {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === editingProduct.id
            ? { ...p, name: formValues.name.trim(), price: formValues.price.trim(), stock: formValues.stock.trim(), category: formValues.category.trim() }
            : p,
        ),
      );
    } else {
      setProducts((prev) => [
        ...prev,
        { id: nextId++, name: formValues.name.trim(), price: formValues.price.trim(), stock: formValues.stock.trim(), category: formValues.category.trim(), estado: true },
      ]);
    }
    switchToList();
  }

  function toggleStatus(product: Product) {
    setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, estado: !p.estado } : p)));
  }

  function restoreProduct(product: Product) {
    setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, estado: true } : p)));
  }

  function permanentDelete(product: Product) {
    setProducts((prev) => prev.filter((p) => p.id !== product.id));
    setDeleteTarget(null);
  }

  function renderCard(item: Product) {
    const isTrash = !item.estado;
    return (
      <View style={{ backgroundColor: surface, borderRadius: 16, borderWidth: 1, borderColor: border, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: isTrash ? 'rgba(242,169,0,0.1)' : accentBg }}>
          <MaterialCommunityIcons name={isTrash ? 'delete-restore' : 'package-variant'} size={20} color={isTrash ? '#F2A900' : brand} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: fg }} numberOfLines={1}>{item.name}</Text>
          <Text style={{ fontSize: 13, color: muted, marginTop: 2 }} numberOfLines={1}>{item.category} · {item.stock}</Text>
        </View>

        <Text style={{ fontSize: 16, fontWeight: '700', color: brand }}>${item.price}</Text>

        {isTrash ? (
          <>
            <Pressable onPress={() => restoreProduct(item)} style={{ width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: border, alignItems: 'center', justifyContent: 'center' }} hitSlop={6}>
              <MaterialCommunityIcons name="restore" size={16} color={brand} />
            </Pressable>
            <Pressable onPress={() => setDeleteTarget(item)} style={{ width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: border, alignItems: 'center', justifyContent: 'center' }} hitSlop={6}>
              <MaterialCommunityIcons name="delete-forever" size={16} color={errorColor} />
            </Pressable>
          </>
        ) : (
          <>
            <Pressable onPress={() => startEdit(item)} style={{ width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: border, alignItems: 'center', justifyContent: 'center' }} hitSlop={6}>
              <MaterialCommunityIcons name="pencil-outline" size={16} color={brand} />
            </Pressable>
            <Pressable onPress={() => setToggleTarget(item)} style={{ width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: border, alignItems: 'center', justifyContent: 'center' }} hitSlop={6}>
              <MaterialCommunityIcons name={item.estado ? 'pause-circle-outline' : 'play-circle-outline'} size={16} color={muted} />
            </Pressable>
            <Pressable onPress={() => setDeleteTarget(item)} style={{ width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: border, alignItems: 'center', justifyContent: 'center' }} hitSlop={6}>
              <MaterialCommunityIcons name="trash-can-outline" size={16} color={errorColor} />
            </Pressable>
          </>
        )}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 4 }}>
        <Text style={{ fontSize: 28, fontWeight: '700', letterSpacing: -0.02, color: fg }}>Productos</Text>
        {!showTrash && inactiveProducts.length > 0 && (
          <TouchableOpacity onPress={() => setShowTrash(true)} hitSlop={8}>
            <MaterialCommunityIcons name="delete-restore" size={24} color={muted} />
          </TouchableOpacity>
        )}
      </View>
      {showTrash && (
        <Text style={{ fontSize: 16, color: muted, marginTop: 2, paddingHorizontal: 20 }}>Papelera</Text>
      )}

      {/* Segmented control (solo en vista normal) */}
      {!showTrash && (
        <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 }}>
          <View style={{ flexDirection: 'row', backgroundColor: isDark ? '#263028' : '#E8ECE4', borderRadius: 10, padding: 3 }}>
            <TouchableOpacity onPress={() => { if (!isFormActive) return; switchToList(); }}
              style={{ flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: isFormActive ? 'transparent' : surface, alignItems: 'center' }} activeOpacity={0.7}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: isFormActive ? muted : fg, letterSpacing: 0.01 }}>📋 Lista</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { if (isFormActive) return; startNew(); }}
              style={{ flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: isFormActive ? surface : 'transparent', alignItems: 'center' }} activeOpacity={0.7}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: isFormActive ? fg : muted, letterSpacing: 0.01 }}>➕ Nuevo</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Contenido */}
      {isFormActive ? (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 18 }} keyboardShouldPersistTaps="handled">
            <Text style={{ fontSize: 18, fontWeight: '700', color: fg }}>
              {editingProduct ? 'Editar producto' : 'Nuevo producto'}
            </Text>

            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', letterSpacing: 0.08, textTransform: 'uppercase', color: muted }}>Nombre</Text>
              <TextInput value={formValues.name} onChangeText={(t) => setFormValues((p) => ({ ...p, name: t }))} placeholder="ej. Aguacate Hass" placeholderTextColor={muted}
                style={{ borderWidth: 1.5, borderColor: border, borderRadius: 12, backgroundColor: surface, color: fg, fontSize: 15, paddingHorizontal: 14, height: 46 }} />
            </View>

            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', letterSpacing: 0.08, textTransform: 'uppercase', color: muted }}>Categoría</Text>
              <TouchableOpacity onPress={() => setShowPicker(true)} activeOpacity={0.7}
                style={{ borderWidth: 1.5, borderColor: border, borderRadius: 12, backgroundColor: surface, paddingHorizontal: 14, height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 15, color: formValues.category ? fg : muted }}>{formValues.category || 'Seleccionar…'}</Text>
                <MaterialCommunityIcons name="chevron-down" size={20} color={muted} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', letterSpacing: 0.08, textTransform: 'uppercase', color: muted }}>Precio</Text>
              <TextInput value={formValues.price} onChangeText={(t) => setFormValues((p) => ({ ...p, price: t }))} placeholder="0.00" placeholderTextColor={muted} keyboardType="decimal-pad"
                style={{ borderWidth: 1.5, borderColor: border, borderRadius: 12, backgroundColor: surface, color: fg, fontSize: 15, paddingHorizontal: 14, height: 46 }} />
            </View>

            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', letterSpacing: 0.08, textTransform: 'uppercase', color: muted }}>Stock</Text>
              <TextInput value={formValues.stock} onChangeText={(t) => setFormValues((p) => ({ ...p, stock: t }))} placeholder="ej. 200 kg" placeholderTextColor={muted}
                style={{ borderWidth: 1.5, borderColor: border, borderRadius: 12, backgroundColor: surface, color: fg, fontSize: 15, paddingHorizontal: 14, height: 46 }} />
            </View>
          </ScrollView>

          <View style={{ padding: 20, gap: 10, borderTopWidth: 1, borderTopColor: border }}>
            <TouchableOpacity onPress={handleSave} activeOpacity={0.8}
              style={{ height: 50, borderRadius: 14, backgroundColor: errorColor, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: iconWhite }}>Guardar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={switchToList} activeOpacity={0.8}
              style={{ height: 44, borderRadius: 14, borderWidth: 1.5, borderColor: border, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: fg }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      ) : displayProducts.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
          <MaterialCommunityIcons name={showTrash ? 'delete-restore' : 'package-variant'} size={64} color={muted} />
          <Text style={{ marginTop: 16, textAlign: 'center', fontSize: 20, fontWeight: '700', color: muted }}>
            {showTrash ? 'No hay productos en la papelera' : 'No hay productos'}
          </Text>
          <Text style={{ marginTop: 4, textAlign: 'center', fontSize: 14, color: muted }}>
            {showTrash ? 'Los productos desactivados aparecerán aquí.' : 'Agregá un producto para comenzar.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayProducts}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 20, paddingBottom: 32, gap: 10 }}
          renderItem={({ item }) => renderCard(item)}
        />
      )}

      {/* Category picker modal */}
      <Modal visible={showPicker} transparent animationType="fade" onRequestClose={() => setShowPicker(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 40 }} onPress={() => setShowPicker(false)}>
          <View style={{ backgroundColor: surface, borderRadius: 20, padding: 16, gap: 4 }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: fg, marginBottom: 8, paddingHorizontal: 8 }}>Seleccionar categoría</Text>
            {categories.map((cat) => (
              <TouchableOpacity key={cat} onPress={() => { setFormValues((p) => ({ ...p, category: cat })); setShowPicker(false); }} activeOpacity={0.7}
                style={{ paddingVertical: 14, paddingHorizontal: 8, borderRadius: 12, backgroundColor: formValues.category === cat ? accentBg : 'transparent' }}>
                <Text style={{ fontSize: 16, color: fg, fontWeight: formValues.category === cat ? '600' : '400' }}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Toggle confirm bottom sheet */}
      <Modal visible={toggleTarget !== null} transparent animationType="slide" onRequestClose={() => setToggleTarget(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => setToggleTarget(null)} />
        <View style={{ backgroundColor: surface, borderRadius: 24, padding: 24, paddingBottom: 34, marginTop: 'auto' }}>
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? '#3D2023' : '#FDEDEE', marginBottom: 12 }}>
              <MaterialCommunityIcons name={toggleTarget?.estado ? 'pause-circle-outline' : 'play-circle-outline'} size={26} color={errorColor} />
            </View>
            <Text style={{ fontSize: 17, fontWeight: '700', color: fg, textAlign: 'center' }}>
              {toggleTarget?.estado ? `Desactivar "${toggleTarget?.name}"?` : `Activar "${toggleTarget?.name}"?`}
            </Text>
            <Text style={{ fontSize: 14, color: muted, marginTop: 6, textAlign: 'center' }}>
              {toggleTarget?.estado ? 'El producto se moverá a la papelera.' : 'El producto volverá a estar activo.'}
            </Text>
          </View>
          <View style={{ gap: 10 }}>
            <TouchableOpacity onPress={() => { if (toggleTarget) toggleStatus(toggleTarget); setToggleTarget(null); }} activeOpacity={0.8}
              style={{ height: 50, borderRadius: 14, backgroundColor: errorColor, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: iconWhite }}>{toggleTarget?.estado ? 'Desactivar' : 'Activar'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setToggleTarget(null)} activeOpacity={0.8}
              style={{ height: 44, borderRadius: 14, borderWidth: 1.5, borderColor: border, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: fg }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete bottom sheet */}
      <Modal visible={deleteTarget !== null} transparent animationType="slide" onRequestClose={() => setDeleteTarget(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => setDeleteTarget(null)} />
        <View style={{ backgroundColor: surface, borderRadius: 24, padding: 24, paddingBottom: 34, marginTop: 'auto' }}>
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? '#3D2023' : '#FDEDEE', marginBottom: 12 }}>
              <MaterialCommunityIcons name="trash-can-outline" size={26} color={errorColor} />
            </View>
            <Text style={{ fontSize: 17, fontWeight: '700', color: fg, textAlign: 'center' }}>
              {deleteTarget?.estado === false
                ? `¿Eliminar permanentemente "${deleteTarget?.name}"?`
                : `¿Desactivar "${deleteTarget?.name}"?`}
            </Text>
            <Text style={{ fontSize: 14, color: muted, marginTop: 6, textAlign: 'center' }}>
              {deleteTarget?.estado === false
                ? 'Esta acción no se puede deshacer.'
                : 'El producto se moverá a la papelera.'}
            </Text>
          </View>
          <View style={{ gap: 10 }}>
            <TouchableOpacity onPress={() => {
              if (!deleteTarget) return;
              if (deleteTarget.estado === false) {
                permanentDelete(deleteTarget);
              } else {
                toggleStatus(deleteTarget);
                setDeleteTarget(null);
              }
            }} activeOpacity={0.8}
              style={{ height: 50, borderRadius: 14, backgroundColor: errorColor, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: iconWhite }}>
                {deleteTarget?.estado === false ? 'Eliminar permanentemente' : 'Desactivar'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setDeleteTarget(null)} activeOpacity={0.8}
              style={{ height: 44, borderRadius: 14, borderWidth: 1.5, borderColor: border, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: fg }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
