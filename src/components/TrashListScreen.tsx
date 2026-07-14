import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { Button, Dialog, Portal } from 'react-native-paper';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import Toast from '@/components/Toast';
import { colors } from '@/constants/colors';
import api from '@/services/api';
import { useAuth } from '@/store/AuthContext';
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
  readonly listScreen: 'CategoryList' | 'UnitList';
}

// ── Navigation type ────────────────────────────────────────

type TrashScreenName = 'CategoryTrash' | 'UnitTrash';

interface TrashListScreenProps<T extends { nombre: string; estado: boolean }> {
  readonly config: TrashConfig<T>;
  readonly navigation: NativeStackNavigationProp<
    AdminStackParamList,
    TrashScreenName
  >;
}

// ── Component ──────────────────────────────────────────────

export default function TrashListScreen<
  T extends { nombre: string; estado: boolean },
>({ config, navigation }: TrashListScreenProps<T>): React.JSX.Element | null {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // ── List data ──────────────────────────────────────────────
  const {
    data: items,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery<T[]>({
    queryKey: [...config.queryKey, 'trash'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<{ results: T[] }>>(
        `${config.endpoint}trash/`,
      );

      return data.data.results;
    },
    staleTime: 10_000,
    retry: 2,
  });

  // ── Toast state ────────────────────────────────────────────
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // ── Permanent delete dialog state ──────────────────────────
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- config is stable
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
      <View className="flex-1 items-center justify-center bg-gray-50 px-6 dark:bg-gray-950">
        <MaterialCommunityIcons
          name="lock-outline"
          size={48}
          color={colors.iconMuted}
        />
        <Text className="mt-4 text-center text-base text-gray-500 dark:text-gray-400">
          No tienes permisos para acceder a esta sección.
        </Text>
      </View>
    );
  }

  // ── Loading ────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-950">
        <ActivityIndicator size="large" color={colors.brandRedCoral} />
      </View>
    );
  }

  // ── Error ──────────────────────────────────────────────────
  if (isError) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-6 dark:bg-gray-950">
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={48}
          color={colors.textSecondary}
        />
        <Text className="mt-4 text-center text-base text-gray-500 dark:text-gray-400">
          {config.loadingErrorText}
        </Text>
        <Pressable
          onPress={() => void refetch()}
          className="mt-4 flex-row items-center gap-2 rounded-lg bg-brand-red-coral px-6 py-3"
        >
          <MaterialCommunityIcons
            name="refresh"
            size={18}
            color={colors.iconWhite}
          />
          <Text className="font-semibold text-white">Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  const isEmpty = !items || items.length === 0;

  // ── Render ─────────────────────────────────────────────────
  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <View className="bg-brand-green-forest px-4 pb-5 pt-14 shadow-sm">
        <View className="flex-row items-center">
          <Pressable
            onPress={() => navigation.goBack()}
            className="mr-3 h-11 w-11 items-center justify-center rounded-full active:opacity-80"
            hitSlop={12}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color={colors.iconWhite}
            />
          </Pressable>
          <View className="flex-1">
            <Text className="text-2xl font-bold tracking-tight text-white">
              Papelera
            </Text>
            <Text className="mt-0.5 text-sm text-white/80">
              {config.headerTitle}
            </Text>
          </View>
        </View>
      </View>

      {/* Empty state */}
      {isEmpty ? (
        <View className="flex-1 items-center justify-center px-6">
          <MaterialCommunityIcons
            name="delete-restore"
            size={64}
            color={colors.iconMuted}
          />
          <Text className="mt-4 text-center text-2xl font-bold text-gray-500 dark:text-gray-400">
            {config.emptyText}
          </Text>
          <Text className="mt-1 text-center text-sm text-gray-400 dark:text-gray-500">
            {config.emptyDescription}
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(config.getId(item))}
          contentContainerClassName="p-4 pb-24 gap-3"
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
              tintColor={colors.brandRedCoral}
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
                  onPress={() => navigation.navigate(config.listScreen)}
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

      {/* ── Permanent delete confirmation ─────────────────────── */}
      <Portal>
        <Dialog
          visible={permanentTarget !== null}
          onDismiss={() => setPermanentTarget(null)}
        >
          <Dialog.Title className="text-xl font-bold text-brand-ink dark:text-gray-100">
            Eliminar permanentemente
          </Dialog.Title>

          <Dialog.Content>
            <View className="mb-4 items-center">
              <View className="mb-3 h-16 w-16 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20">
                <MaterialCommunityIcons
                  name="delete-forever"
                  size={28}
                  color={colors.error}
                />
              </View>
              <Text className="text-base leading-6 text-gray-700 dark:text-gray-300">
                {permanentTarget
                  ? config.permanentConfirmText(permanentTarget)
                  : ''}
              </Text>
            </View>
            <View className="rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
              <Text className="text-sm leading-5 text-red-600 dark:text-red-400">
                Esta acción no se puede deshacer. El registro se eliminará de la
                base de datos permanentemente.
              </Text>
            </View>
          </Dialog.Content>

          <Dialog.Actions>
            <Button
              onPress={() => setPermanentTarget(null)}
              textColor={colors.textSecondary}
              compact
            >
              Cancelar
            </Button>
            <Button
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
              mode="contained"
              buttonColor={colors.error}
              loading={permanentMutation.isPending}
              disabled={permanentMutation.isPending}
              compact
            >
              Eliminar permanentemente
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* ── Toast notifications ─────────────────────────────── */}
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
