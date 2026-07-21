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
import { colors } from '@/constants/colors';
import api from '@/services/api';
import { useAuth } from '@/store/AuthContext';
import { useTheme } from '@/store/ThemeContext';
import type { AdminStackParamList, ApiResponse } from '@/types';
import { parseApiList } from '@/utils/apiResponse';

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

// ── Helper API fetcher ─────────────────────────────────────

async function fetchTrashItems<T extends { nombre: string; estado: boolean }>(
  endpoint: string,
  queryParams?: Record<string, string>,
): Promise<T[]> {
  const baseUri = `${endpoint}trash/`;
  const url = queryParams
    ? `${baseUri}?${new URLSearchParams(queryParams).toString()}`
    : baseUri;
  const { data } = await api.get<T[]>(url);

  return parseApiList<T>(data);
}

// ── State components for complexity reduction ──────────────

interface GuardProps {
  readonly bg: string;
  readonly muted: string;
}

function AdminGuard({ bg, muted }: GuardProps): React.JSX.Element {
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

interface LoadingProps {
  readonly bg: string;
  readonly brand: string;
}

function LoadingView({ bg, brand }: LoadingProps): React.JSX.Element {
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

interface ErrorProps {
  readonly bg: string;
  readonly muted: string;
  readonly brand: string;
  readonly iconWhite: string;
  readonly errorText: string;
  readonly onRetry: () => void;
}

function ErrorView({
  bg,
  muted,
  brand,
  iconWhite,
  errorText,
  onRetry,
}: ErrorProps): React.JSX.Element {
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
        {errorText}
      </Text>
      <TouchableOpacity
        onPress={onRetry}
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
        <Text style={{ fontWeight: '600', color: iconWhite }}>Reintentar</Text>
      </TouchableOpacity>
    </View>
  );
}

interface TrashItemCardProps<T extends { nombre: string; estado: boolean }> {
  readonly item: T;
  readonly config: TrashConfig<T>;
  readonly onRestore: (item: T) => void;
  readonly onDeletePermanent: (item: T) => void;
  readonly navigation: NativeStackNavigationProp<
    AdminStackParamList,
    TrashScreenName
  >;
}

function TrashItemCard<T extends { nombre: string; estado: boolean }>({
  item,
  config,
  onRestore,
  onDeletePermanent,
  navigation,
}: TrashItemCardProps<T>): React.JSX.Element {
  const secondValue = config.getSecondValue(item);

  return (
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
          {secondValue ? (
            <Text className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              {secondValue}
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
          onPress={() => onRestore(item)}
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
          onPress={() => onDeletePermanent(item)}
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
          onPress={() => navigation.navigate(config.listScreen as never)}
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
  );
}

interface PermanentDeleteModalProps<
  T extends { nombre: string; estado: boolean },
> {
  readonly visible: boolean;
  readonly item: T | null;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
  readonly isPending: boolean;
  readonly config: TrashConfig<T>;
  readonly colors: {
    readonly surface: string;
    readonly fg: string;
    readonly border: string;
    readonly brand: string;
    readonly iconWhite: string;
    readonly errorColor: string;
    readonly modalOverlay: string;
    readonly errorBg: string;
  };
}

function PermanentDeleteModal<T extends { nombre: string; estado: boolean }>({
  visible,
  item,
  onCancel,
  onConfirm,
  isPending,
  config,
  colors: themeColors,
}: PermanentDeleteModalProps<T>): React.JSX.Element {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: themeColors.modalOverlay,
          justifyContent: 'center',
          alignItems: 'center',
        }}
        onPress={onCancel}
      >
        <View
          style={{
            width: '85%',
            backgroundColor: themeColors.surface,
            borderRadius: 24,
            padding: 24,
            paddingBottom: 34,
            marginTop: 'auto',
          }}
          onStartShouldSetResponder={() => true}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: themeColors.errorBg,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              <MaterialCommunityIcons
                name="alert-outline"
                size={28}
                color={themeColors.errorColor}
              />
            </View>
            <Text
              style={{
                fontSize: 17,
                fontWeight: '700',
                textAlign: 'center',
                color: themeColors.fg,
              }}
            >
              Confirmar eliminación
            </Text>
            <Text
              style={{
                fontSize: 14,
                marginTop: 6,
                textAlign: 'center',
                color: themeColors.fg,
              }}
            >
              {item ? config.permanentConfirmText(item) : ''}
            </Text>
          </View>

          <View style={{ gap: 10 }}>
            <TouchableOpacity
              onPress={onConfirm}
              disabled={isPending}
              activeOpacity={0.8}
              style={{
                height: 50,
                borderRadius: 14,
                backgroundColor: themeColors.errorColor,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 6,
                opacity: isPending ? 0.6 : 1,
              }}
            >
              {isPending ? (
                <ActivityIndicator size="small" color={themeColors.iconWhite} />
              ) : (
                <MaterialCommunityIcons
                  name="trash-can-outline"
                  size={20}
                  color={themeColors.iconWhite}
                />
              )}
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: themeColors.iconWhite,
                }}
              >
                Eliminar permanentemente
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onCancel}
              disabled={isPending}
              activeOpacity={0.8}
              style={{
                height: 44,
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: themeColors.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: '600',
                  color: themeColors.fg,
                }}
              >
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

// ── Component ──────────────────────────────────────────────

export default function TrashListScreen<
  T extends { nombre: string; estado: boolean },
>({ config, navigation }: TrashListScreenProps<T>): React.JSX.Element | null {
  const { user } = useAuth();
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const bg = isDark ? colors.admlBgD : colors.admlBgL;
  const surface = isDark ? colors.admSurfaceD : colors.admSurfaceL;
  const fg = isDark ? colors.admlFgD : colors.admlFgL;
  const muted = isDark ? colors.admlMutedD : colors.admlMutedL;
  const border = isDark ? colors.admlBorderD : colors.admlBorderL;
  const brand = isDark ? colors.admlBrandD : colors.admlBrandL;
  const iconWhite = colors.iconWhite;
  const errorColor = colors.brandRedCoral;
  const modalOverlay = 'rgba(0,0,0,0.4)';
  const errorBg = isDark ? colors.admCoralBgD : colors.admCoralBgL;
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
    queryFn: () => fetchTrashItems<T>(config.endpoint, config.queryParams),
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

  const handleRestore = useCallback(
    (item: T) => {
      const id = config.getId(item);
      const name = item.nombre;
      restoreMutation.mutate(id, {
        onSuccess: () => {
          invalidate();
          toast(config.toastRestored(name));
        },
        onError: () => {
          toast(`Error al restaurar ${config.entityName} "${name}".`, 'error');
        },
      });
    },
    [config, restoreMutation, invalidate, toast],
  );

  const handlePermanentDelete = useCallback(() => {
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
  }, [permanentTarget, config, permanentMutation, invalidate, toast]);

  // ── Role guard ──────────────────────────────────────────────
  if (user?.role !== 'admin') {
    return <AdminGuard bg={bg} muted={muted} />;
  }

  // ── Loading ────────────────────────────────────────────────
  if (isLoading) {
    return <LoadingView bg={bg} brand={brand} />;
  }

  // ── Error ──────────────────────────────────────────────────
  if (isError) {
    return (
      <ErrorView
        bg={bg}
        muted={muted}
        brand={brand}
        iconWhite={iconWhite}
        errorText={config.loadingErrorText}
        onRetry={() => void refetch()}
      />
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
            <TrashItemCard
              item={item}
              config={config}
              onRestore={handleRestore}
              onDeletePermanent={setPermanentTarget}
              navigation={navigation}
            />
          )}
          ItemSeparatorComponent={() => (
            <View className="h-px bg-gray-200 dark:bg-gray-800" />
          )}
        />
      )}

      {/* Permanent delete bottom sheet */}
      <PermanentDeleteModal
        visible={permanentTarget !== null}
        item={permanentTarget}
        onCancel={() => setPermanentTarget(null)}
        onConfirm={handlePermanentDelete}
        isPending={permanentMutation.isPending}
        config={config}
        colors={{
          surface,
          fg,
          border,
          brand,
          iconWhite,
          errorColor,
          modalOverlay,
          errorBg,
        }}
      />

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
