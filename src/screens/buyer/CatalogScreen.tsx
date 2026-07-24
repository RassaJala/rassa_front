import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import CategoryFilter from '@/components/catalog/CategoryFilter';
import ProductCard from '@/components/catalog/ProductCard';
import SearchBar from '@/components/catalog/SearchBar';
import Toast from '@/components/Toast';
import { colors } from '@/constants/colors';
import type { CatalogProduct, Categoria } from '@/services/catalog';
import { getCategorias, getCurrentPublications } from '@/services/catalog';
import { useCartStore } from '@/store/cartStore';
import { useTheme } from '@/store/ThemeContext';

interface FlatProduct extends CatalogProduct {
  id_publicacion: number;
  agricultor: string;
}

export default function CatalogScreen(): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const addItem = useCartStore((s) => s.addItem);

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [products, setProducts] = useState<FlatProduct[]>([]);
  const [categories, setCategories] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [pubs, cats] = await Promise.all([
          getCurrentPublications(),
          getCategorias(),
        ]);
        if (cancelled) return;
        const flat: FlatProduct[] = pubs.flatMap((p) =>
          p.productos.map((prod) => ({
            ...prod,
            id_publicacion: p.id_publicacion,
            agricultor: `${p.agricultor.nombre} ${p.agricultor.apellido}`,
          })),
        );
        setProducts(flat);
        setCategories(cats);
      } catch {
        if (!cancelled) setError('No se pudieron cargar los productos.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter((p) => {
      const matchesSearch = !q || p.producto.toLowerCase().includes(q);
      // ponytail: category filtering needs backend to include id_categoria on products
      // for now, selectedCategory is stored but not applied until backend provides it
      return matchesSearch;
    });
  }, [products, search]);

  const handleAddToCart = useCallback(
    (producto: CatalogProduct) => {
      const prod = products.find(
        (p) => p.id_producto_semanal === producto.id_producto_semanal,
      );
      addItem({
        id_producto_semanal: producto.id_producto_semanal,
        producto: producto.producto,
        unidad: producto.unidad,
        precio: Number(producto.precio),
        foto: producto.foto,
        agricultor: prod?.agricultor ?? '',
        stock: producto.stock,
      });
      setToast({ message: `${producto.producto} agregado al carrito`, type: 'success' });
    },
    [addItem, products],
  );

  const bg = isDark ? colors.admBgD : colors.admBgL;
  const fg = isDark ? colors.admFgD : colors.admFgL;
  const muted = isDark ? colors.admMutedD : colors.admMutedL;

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="mt-3 text-sm" style={{ color: muted }}>
            Cargando productos...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
        <View className="flex-1 items-center justify-center px-6">
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={48}
            color={colors.error}
          />
          <Text
            className="mt-3 text-center text-base font-semibold"
            style={{ color: fg }}
          >
            {error}
          </Text>
          <Pressable
            onPress={() => {
              setLoading(true);
              setError(null);
              void (async () => {
                try {
                  const [pubs, cats] = await Promise.all([
                    getCurrentPublications(),
                    getCategorias(),
                  ]);
                  const flat: FlatProduct[] = pubs.flatMap((p) =>
                    p.productos.map((prod) => ({
                      ...prod,
                      id_publicacion: p.id_publicacion,
                      agricultor: `${p.agricultor.nombre} ${p.agricultor.apellido}`,
                    })),
                  );
                  setProducts(flat);
                  setCategories(cats);
                } catch {
                  setError('No se pudieron cargar los productos.');
                } finally {
                  setLoading(false);
                }
              })();
            }}
            className="mt-4 rounded-xl px-5 py-3"
            style={{ backgroundColor: colors.primary }}
          >
            <Text className="font-semibold" style={{ color: colors.iconWhite }}>
              Reintentar
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['top']}>
      <View style={{ flex: 1, paddingTop: 8, paddingHorizontal: 16 }}>
        {/* Header */}
        <Text
          className="mb-4 text-2xl font-bold"
          style={{ color: fg, paddingTop: 12 }}
        >
          Catálogo
        </Text>

        {/* Search */}
        <View className="mb-3">
          <SearchBar value={search} onChangeText={setSearch} />
        </View>

        {/* Categories */}
        {categories.length > 0 ? (
          <View className="mb-4">
            <CategoryFilter
              categories={categories}
              selected={selectedCategory}
              onSelect={setSelectedCategory}
            />
          </View>
        ) : null}

        {/* Products grid */}
        {filtered.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <MaterialCommunityIcons
              name="package-variant-closed"
              size={48}
              color={muted}
            />
            <Text className="mt-3 text-sm" style={{ color: muted }}>
              No se encontraron productos
            </Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id_producto_semanal.toString()}
            numColumns={2}
            columnWrapperStyle={{ gap: 12 }}
            contentContainerStyle={{ paddingBottom: 24, gap: 12 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={{ flex: 1 }}>
                <ProductCard
                  producto={item}
                  agricultor={item.agricultor}
                  onAddToCart={handleAddToCart}
                />
              </View>
            )}
          />
        )}
      </View>

      <Toast
        visible={toast !== null}
        message={toast?.message ?? ''}
        type={toast?.type ?? 'success'}
        onDismiss={() => setToast(null)}
      />
    </SafeAreaView>
  );
}
