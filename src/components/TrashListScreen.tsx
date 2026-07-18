import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import Toast from '@/components/Toast';
import api from '@/services/api';
import { colors } from '@/constants/colors';
import { useAuth } from '@/store/AuthContext';
import { useTheme } from '@/store/ThemeContext';
import type { AdminStackParamList, ApiResponse } from '@/types';

// ── Configuration ──────────────────────────────────────────

interface TrashConfig<T extends { nombre: string; estado: boolean }> {
  readonly queryKey: readonly string[];
  readonly endpoint: string;
  readonly entityName: string;
  readonly entityNamePlural: string;
  readonly getId: (item: T) => number;
  readonly getSecondValue: (item: T) => string | null;
  readonly headerTitle: string;
  readonly emptyText: string;
  readonly emptyDescription: string;
  readonly loadingErrorText: string;
  readonly toastRestored: (name: string) => string;
  readonly toastPermanentDeleted: (name: string) => string;
  readonly permanentConfirmText: (item: T) => string;
  readonly queryParams?: Record<string, string>;
  readonly listScreen:
    'CategoryList' | 'UnitList' | 'MunicipioList' | 'LocalidadList';
}

// ── Navigation type ────────────────────────────────────────

type TrashScreenName =
  'CategoryTrash' | 'UnitTrash' | 'MunicipioTrash' | 'LocalidadTrash';

interface TrashListScreenProps<T extends { nombre: string; estado: boolean }> {
  readonly config: TrashConfig<T>;
  readonly navigation: NativeStackNavigationProp<
    AdminStackParamList,
    TrashScreenName
  >;
}

export default function TrashListScreen<
  T extends { nombre: string; estado: boolean },
>({ config, navigation }: TrashListScreenProps<T>): React.JSX.Element | null {
  const { user } = useAuth();
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
  const modalOverlay = 'rgba(0,0,0,0.4)';
  const errorBg = isDark ? '#3D2023' : '#FDEDEE';
  const queryClient = useQueryClient();

  // ── List data ──────────────────────────────────────────────
  const {
    data: items,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery<T[]>({
    queryKey: config.queryParams
      ? [...config.queryKey, 'trash', JSON.stringify(config.queryParams)]
      : [...config.queryKey, 'trash'],
    queryFn: async () => {
      const baseUri = `${config.endpoint}trash/`;
      const url = config.queryParams
        ? `${baseUri}?${new URLSearchParams(config.queryParams).toString()}`
        : baseUri;
      const { data } = await api.get<
        T[] | { results: T[] } | ApiResponse<{ results: T[] }>
      >(url);

      if (Array.isArray(data)) return data;
      if (
        'data' in data &&
        typeof data.data === 'object' &&
        data.data !== null
      ) {
        if (Array.isArray(data.data)) return data.data;
        const inner = data.data as { results?: T[] };
        if (Array.isArray(inner.results)) return inner.results;
      }
      if ('results' in data && Array.isArray(data.results)) return data.results;
      return [];
    },
    staleTime: 10_000,
    retry: 2,
  });

  // ── Toast state ────────────────────────────────────────────
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // ── Permanent delete state ─────────────────────────────────
  const [permanentTarget, setPermanentTarget] = useState<T | null>(null);

  // ── Helpers ────────────────────────────────────────────────
  const toast = useCallback(
    (message: string, type: 'success' | 'error' = 'success') => {
      setToastMessage(message);
      setToastType(type);
    },
    [],
  );

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: [...config.queryKey, 'trash'],
    });
    void queryClient.invalidateQueries({ queryKey: [...config.queryKey] });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- config.queryKey is stable from parent
  }, [queryClient]);

  // ── Mutations ──────────────────────────────────────────────
  const restoreMutation = useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post<ApiResponse<T>>(
        `${config.endpoint}${id}/restore/`,
      );
      return data;
    },
  });

  const permanentMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.post(`${config.endpoint}${id}/permanent/`);
    },
  });

  // ── Role guard ──────────────────────────────────────────────
  if (user?.role !== 'admin') {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: bg,
          paddingHorizontal: 24,
        }}
      >
        <MaterialCommunityIcons name="lock-outline" size={48} color={muted} />
        <Text
          style={{
            marginTop: 16,
            textAlign: 'center',
            fontSize: 16,
            color: muted,
          }}
        >
          No tienes permisos para acceder a esta sección.
        </Text>
      </View>
    );
  }

  // ── Loading ────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: bg,
        }}
      >
        <ActivityIndicator size="large" color={brand} />
      </View>
    );
  }

  // ── Error ──────────────────────────────────────────────────
  if (isError) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: bg,
          paddingHorizontal: 24,
        }}
      >
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={48}
          color={muted}
        />
        <Text
          style={{
            marginTop: 16,
            textAlign: 'center',
            fontSize: 16,
            color: muted,
          }}
        >
          {config.loadingErrorText}
        </Text>
        <TouchableOpacity
          onPress={() => void refetch()}
          activeOpacity={0.8}
          style={{
            marginTop: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: brand,
            borderRadius: 12,
            paddingHorizontal: 24,
            paddingVertical: 12,
          }}
        >
          <MaterialCommunityIcons name="refresh" size={18} color={iconWhite} />
          <Text style={{ fontWeight: '600', color: iconWhite }}>
            Reintentar
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isEmpty = !items || items.length === 0;

  // ── Render ─────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 60, paddingBottom: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {navigation.canGoBack() ? (
            <Pressable
              onPress={() => navigation.goBack()}
              hitSlop={8}
              style={{ marginRight: 4 }}
            >
              <MaterialCommunityIcons name="arrow-left" size={28} color={fg} />
            </Pressable>
          ) : null}
          <Text
            style={{
              fontSize: 28,
              fontWeight: '700',
              letterSpacing: -0.02,
              color: fg,
            }}
          >
            {config.headerTitle}
          </Text>
        </View>
        <Text
          style={{
            fontSize: 16,
            color: muted,
            marginTop: 2,
            marginLeft: navigation.canGoBack() ? 36 : 0,
          }}
        >
          Papelera
        </Text>
      </View>

      {isEmpty ? (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 24,
          }}
        >
          <MaterialCommunityIcons
            name="delete-restore"
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
            {config.emptyText}
          </Text>
          <Text
            style={{
              marginTop: 4,
              textAlign: 'center',
              fontSize: 14,
              color: muted,
            }}
          >
            {config.emptyDescription}
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(config.getId(item))}
          contentContainerStyle={{ padding: 20, paddingBottom: 32, gap: 10 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
              tintColor={brand}
            />
          }
          renderItem={({ item }) => (
            <View className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
              <View className="flex-row items-start">
                <View className="mr-3 mt-0.5 h-10 w-10 items-center justify-center rounded-full bg-orange-50 dark:bg-orange-900/20">
                  <MaterialCommunityIcons
                    name="delete-restore"
                    size={20}
                    color={colors.warning}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-medium text-brand-ink dark:text-gray-100">
                    {item.nombre}
                  </Text>
                  {config.getSecondValue(item) ? (
                    <Text className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                      {config.getSecondValue(item)}
                    </Text>
                  ) : null}
                  <View className="mt-2 self-start rounded-full bg-orange-100 px-2.5 py-0.5 dark:bg-orange-900/30">
                    <Text className="text-xs font-medium text-amber-700 dark:text-amber-400">
                      Inactivo
                    </Text>
                  </View>
                </View>
              </View>

              <View className="mt-3 flex-row items-center justify-end gap-4 border-t border-gray-100 pt-3 dark:border-gray-700">
                <Pressable
                  onPress={() => {
                    const id = config.getId(item);
                    const name = item.nombre;

                    restoreMutation.mutate(id, {
                      onSuccess: () => {
                        invalidate();
                        toast(config.toastRestored(name));
                      },
                      onError: () => {
                        toast(
                          `Error al restaurar ${config.entityName} "${name}".`,
                          'error',
                        );
                      },
                    });
                  }}
                  className="flex-row items-center gap-1 rounded-md px-2 py-1"
                  hitSlop={8}
                >
                  <MaterialCommunityIcons
                    name="restore"
                    size={14}
                    color={colors.brandGreenForest}
                  />
                  <Text className="text-xs font-medium text-brand-green-forest">
                    Restaurar
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setPermanentTarget(item)}
                  className="flex-row items-center gap-1 rounded-md px-2 py-1"
                  hitSlop={8}
                >
                  <MaterialCommunityIcons
                    name="delete-forever"
                    size={14}
                    color={colors.error}
                  />
                  <Text className="text-xs font-medium text-red-500">
                    Eliminar permanentemente
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    navigation.navigate(config.listScreen as never)
                  }
                  className="flex-row items-center gap-1 rounded-md px-2 py-1"
                  hitSlop={8}
                >
                  <MaterialCommunityIcons
                    name="arrow-left-circle-outline"
                    size={14}
                    color={colors.textSecondary}
                  />
                  <Text className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Volver
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
          ItemSeparatorComponent={() => (
            <View className="h-px bg-gray-200 dark:bg-gray-800" />
          )}
        />
      )}

      {/* Permanent delete bottom sheet */}
      <Modal
        visible={permanentTarget !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setPermanentTarget(null)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: modalOverlay }}
          onPress={() => setPermanentTarget(null)}
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
                backgroundColor: errorBg,
                marginBottom: 12,
              }}
            >
              <MaterialCommunityIcons
                name="delete-forever"
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
              {permanentTarget
                ? config.permanentConfirmText(permanentTarget)
                : ''}
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: muted,
                marginTop: 6,
                textAlign: 'center',
              }}
            >
              Esta acción no se puede deshacer.
            </Text>
          </View>
          <View style={{ gap: 10 }}>
            <TouchableOpacity
              onPress={() => {
                if (!permanentTarget) return;
                const id = config.getId(permanentTarget);
                const name = permanentTarget.nombre;
                permanentMutation.mutate(id, {
                  onSuccess: () => {
                    invalidate();
                    setPermanentTarget(null);
                    toast(config.toastPermanentDeleted(name));
                  },
                  onError: () => {
                    setPermanentTarget(null);
                    toast(
                      `Error al eliminar permanentemente ${config.entityName} "${name}".`,
                      'error',
                    );
                  },
                });
              }}
              disabled={permanentMutation.isPending}
              activeOpacity={0.8}
              style={{
                height: 50,
                borderRadius: 14,
                backgroundColor: errorColor,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 6,
                opacity: permanentMutation.isPending ? 0.6 : 1,
              }}
            >
              {permanentMutation.isPending ? (
                <ActivityIndicator size={16} color={iconWhite} />
              ) : null}
              <Text
                style={{ fontSize: 16, fontWeight: '600', color: iconWhite }}
              >
                Eliminar permanentemente
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setPermanentTarget(null)}
              disabled={permanentMutation.isPending}
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

      {/* Toast */}
      <Toast
        visible={toastMessage !== null}
        message={toastMessage ?? ''}
        type={toastType}
        onDismiss={() => {
          setToastMessage(null);
          setToastType('success');
        }}
      />
    </View>
  );
}
