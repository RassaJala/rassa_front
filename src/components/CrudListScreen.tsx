import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import {
  Button,
  Dialog,
  FAB,
  TextInput as PaperInput,
  Portal,
} from 'react-native-paper';

import { useNetInfo } from '@react-native-community/netinfo';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import Toast from '@/components/Toast';
import { colors } from '@/constants/colors';
import api from '@/services/api';
import { useAuth } from '@/store/AuthContext';
import type { AdminStackParamList, ApiResponse } from '@/types';
import { extractApiError } from '@/utils/apiError';

// ── Configuration ──────────────────────────────────────────

interface CrudFieldConfig {
  readonly name: string;
  readonly label: string;
  readonly placeholder?: string;
  readonly multiline?: boolean;
  readonly numberOfLines?: number;
}

interface CrudConfig<T extends { nombre: string; estado: boolean }> {
  readonly queryKey: readonly string[];
  readonly endpoint: string;
  readonly entityName: string;
  readonly entityNamePlural: string;
  readonly entityNamePluralLower: string;
  readonly getId: (item: T) => number;
  readonly fields: readonly CrudFieldConfig[];
  readonly errorFieldKeys: readonly string[];
  readonly emptyIcon: string;
  readonly emptyText: string;
  readonly emptyDescription: string;
  readonly headerTitle: string;
  readonly loadingErrorText: string;
  readonly newDialogTitle: string;
  readonly editDialogTitle: string;
  readonly deleteDialogTitle: string;
  readonly deleteConfirmText: (item: T) => string;
  readonly toastCreated: (name: string) => string;
  readonly toastEdited: (name: string) => string;
  readonly toastDeleted: (name: string) => string;
  readonly toastActivated: (name: string) => string;
  readonly toastDeactivated: (name: string) => string;
  readonly statusLabels: { readonly active: string; readonly inactive: string };
  readonly renderListItem?: (
    item: T,
    actions: {
      readonly onEdit: () => void;
      readonly onToggleStatus: () => void;
      readonly onDelete: () => void;
    },
  ) => React.JSX.Element;
  readonly validate: (formValues: Record<string, string>) => string | null;
}

// ── Navigation type ────────────────────────────────────────

type CrudScreenName = 'CategoryList' | 'UnitList';

interface CrudListScreenProps<T extends { nombre: string; estado: boolean }> {
  readonly config: CrudConfig<T>;
  readonly navigation: NativeStackNavigationProp<
    AdminStackParamList,
    CrudScreenName
  >;
}

// ── Default list item renderer ─────────────────────────────

function defaultRenderListItem<T extends { nombre: string; estado: boolean }>(
  item: T,
  _getSecondValue: (item: T) => string | null,
  config: CrudConfig<T>,
  actions: {
    readonly onEdit: () => void;
    readonly onToggleStatus: () => void;
    readonly onDelete: () => void;
  },
): React.JSX.Element {
  const secondField = config.fields[1];
  const secondValue = secondField ? _getSecondValue(item) : null;

  return (
    <View className="rounded-xl bg-white p-4 shadow-sm dark:border dark:border-gray-800 dark:bg-gray-900 dark:shadow-none">
      <View className="flex-row items-center">
        <View className="flex-1">
          <Text className="text-base font-semibold text-brand-ink dark:text-gray-100">
            {item.nombre}
          </Text>
          {secondValue ? (
            <Text className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              {secondValue}
            </Text>
          ) : null}
          <View
            className={`mt-1.5 self-start rounded-full px-2.5 py-0.5 ${
              item.estado
                ? 'bg-green-100'
                : 'bg-gray-100 dark:bg-gray-800'
            }`}
          >
            <Text
              className={`text-xs font-medium ${
                item.estado
                  ? 'text-green-700'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {item.estado
                ? config.statusLabels.active
                : config.statusLabels.inactive}
            </Text>
          </View>
        </View>
      </View>

      <View className="mt-3 flex-row items-center gap-4 border-t border-gray-100 pt-3 dark:border-gray-800">
        <Pressable
          onPress={actions.onEdit}
          className="rounded-md border border-gray-300 px-3 py-1.5 dark:border-gray-600"
          hitSlop={4}
        >
          <Text className="text-brand-coral text-xs font-medium">Editar</Text>
        </Pressable>
        <Pressable
          onPress={actions.onToggleStatus}
          className="rounded-md border border-gray-300 px-3 py-1.5 dark:border-gray-600"
          hitSlop={4}
        >
          <Text className="text-xs font-medium text-gray-600 dark:text-gray-400">
            {item.estado ? 'Desactivar' : 'Activar'}
          </Text>
        </Pressable>
        <Pressable
          onPress={actions.onDelete}
          className="rounded-md border border-red-300 px-3 py-1.5 dark:border-red-800"
          hitSlop={4}
        >
          <Text className="text-xs font-medium text-red-600 dark:text-red-400">
            Eliminar
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Component ──────────────────────────────────────────────

export default function CrudListScreen<
  T extends { nombre: string; estado: boolean },
>({
  config,
  navigation,
}: CrudListScreenProps<T>): React.JSX.Element | null {
  // ── Hooks must be called unconditionally, in same order every render ──
  const { user } = useAuth();
  const netInfo = useNetInfo();
  const queryClient = useQueryClient();

  // ── List data ──────────────────────────────────────────────
  const {
    data: items,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery<T[]>({
    queryKey: [...config.queryKey],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<T[]>>(config.endpoint);

      return data.data;
    },
    staleTime: 30_000,
    retry: 2,
  });

  // ── Modal state ────────────────────────────────────────────
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<T | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  // ── Toast state ────────────────────────────────────────────
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ── Delete dialog state ────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);

  // ── Helpers ────────────────────────────────────────────────
  const toast = useCallback((message: string) => {
    setToastMessage(message);
  }, []);

  const invalidateAndClose = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: [...config.queryKey] });
    setModalVisible(false);
    setEditingItem(null);
    setFormValues({});
    setFormError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- config is stable, navigation is only used for type param
  }, [queryClient]);

  // ── Mutations ──────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.post<ApiResponse<T>>(
        config.endpoint,
        payload,
      );

      return data;
    },
    onError: (error: unknown) => {
      setFormError(extractApiError(error, [...config.errorFieldKeys]));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: {
      id: number;
    } & Record<string, unknown>) => {
      const { data } = await api.patch<ApiResponse<T>>(
        `${config.endpoint}${id}/`,
        payload,
      );

      return data;
    },
    onError: (error: unknown) => {
      setFormError(extractApiError(error, [...config.errorFieldKeys]));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`${config.endpoint}${id}/`);
    },
    onError: () => {
      // Try soft-delete if hard delete fails (protected by FK)
      if (deleteTarget) {
        const id = config.getId(deleteTarget);

        updateMutation.mutate(
          { id, estado: false },
          {
            onSuccess: () => {
              void queryClient.invalidateQueries({
                queryKey: [...config.queryKey],
              });
              toast(
                `Se desactivó ${config.entityName} "${deleteTarget?.nombre ?? ''}"`,
              );
            },
          },
        );
      }
      setDeleteTarget(null);
    },
  });

  // ── Handlers ───────────────────────────────────────────────
  const openCreateModal = useCallback(() => {
    const initial: Record<string, string> = {};

    for (const field of config.fields) {
      initial[field.name] = '';
    }
    setEditingItem(null);
    setFormValues(initial);
    setFormError(null);
    setModalVisible(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- config is stable reference; navigation is stable screen
  }, []);

  const openEditModal = useCallback((item: T) => {
    const initial: Record<string, string> = {};

    for (const field of config.fields) {
      initial[field.name] = field.name === 'nombre'
        ? item.nombre
        : field.name === 'descripcion' && 'descripcion' in item
          ? String((item as Record<string, unknown>).descripcion ?? '')
          : field.name === 'abreviatura' && 'abreviatura' in item
            ? String((item as Record<string, unknown>).abreviatura ?? '')
            : '';
    }
    setEditingItem(item);
    setFormValues(initial);
    setFormError(null);
    setModalVisible(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- item is the active argument; stable screen refs
  }, []);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setEditingItem(null);
    const empty: Record<string, string> = {};

    for (const field of config.fields) {
      empty[field.name] = '';
    }
    setFormValues(empty);
    setFormError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- config.fields shape is stable; closeModal ref is stable
  }, []);

  const handleSave = useCallback(() => {
    // Per-field validation
    const validationError = config.validate(formValues);

    if (validationError) {
      setFormError(validationError);

      return;
    }

    // Duplicate name check
    const trimmedName = (formValues.nombre ?? '').trim();
    const nameLower = trimmedName.toLocaleLowerCase();
    const isDuplicate = (items ?? []).some(
      (item) =>
        item.nombre.toLocaleLowerCase() === nameLower &&
        (!editingItem || config.getId(item) !== config.getId(editingItem)),
    );

    if (isDuplicate) {
      setFormError(
        `Ya existe ${config.entityName} con el nombre "${trimmedName}".`,
      );

      return;
    }

    // Build payload
    const payload: Record<string, unknown> = {};

    for (const field of config.fields) {
      payload[field.name] = (formValues[field.name] ?? '').trim();
    }
    payload.estado = true;

    if (editingItem) {
      const { estado: _e, ...updatePayload } = payload;

      void _e; // suppress unused
      updateMutation.mutate(
        {
          id: config.getId(editingItem),
          ...updatePayload,
        },
        {
          onSuccess: () => {
            invalidateAndClose();
            toast(config.toastEdited(trimmedName));
          },
        },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          invalidateAndClose();
          toast(config.toastCreated(trimmedName));
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- config, navigation, toast, setForm* are stable refs
  }, [formValues, editingItem, items]);

  const handleToggleStatus = useCallback(
    (item: T) => {
      const newStatus = !item.estado;
      const action = newStatus ? 'activó' : 'desactivó';
      const name = item.nombre;

      updateMutation.mutate(
        {
          id: config.getId(item),
          estado: newStatus,
        },
        {
          onSuccess: () => {
            void queryClient.invalidateQueries({
              queryKey: [...config.queryKey],
            });
            toast(
              newStatus
                ? config.toastActivated(name)
                : config.toastDeactivated(name),
            );
          },
          onError: () => {
            toast(
              `Error al ${action} ${config.entityName} "${name}". Intenta de nuevo.`,
            );
          },
        },
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- createMutation is intentionally excluded to avoid circular dep; config/navigation are stable
    [updateMutation, queryClient],
  );

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ── Role guard ──────────────────────────────────────────────
  if (user?.role !== 'admin') {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-6 dark:bg-gray-950">
        <Text className="text-center text-base text-gray-600 dark:text-gray-400">
          No tienes permisos para acceder a esta sección.
        </Text>
      </View>
    );
  }

  // ── Loading ────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-950">
        <ActivityIndicator size="large" color={colors.error} />
      </View>
    );
  }

  // ── Error ──────────────────────────────────────────────────
  if (isError) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-6 dark:bg-gray-950">
        <Text className="text-4xl">⚠️</Text>
        <Text className="mt-4 text-center text-base text-gray-600 dark:text-gray-400">
          {netInfo.isConnected === false
            ? 'Sin conexión a Internet. Verifica tu conexión.'
            : config.loadingErrorText}
        </Text>
        <Pressable
          onPress={() => void refetch()}
          className="mt-4 rounded-lg bg-brand-red-coral px-6 py-3"
        >
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
      <View className="bg-brand-green-forest px-4 pb-4 pt-12">
        <View className="flex-row items-center">
          <Pressable
            onPress={() => navigation.goBack()}
            className="mr-3 h-10 w-10 items-center justify-center rounded-full"
            hitSlop={8}
          >
            <Text className="text-2xl text-white">←</Text>
          </Pressable>
          <Text className="text-xl font-bold text-white">
            {config.headerTitle}
          </Text>
        </View>
      </View>

      {/* Empty state */}
      {isEmpty ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-5xl">{config.emptyIcon}</Text>
          <Text className="mt-4 text-center text-lg font-semibold text-gray-500 dark:text-gray-400">
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
              tintColor={colors.error}
            />
          }
          renderItem={({ item }) => (
            <>
              {config.renderListItem
                ? config.renderListItem(item, {
                    onEdit: () => openEditModal(item),
                    onToggleStatus: () => handleToggleStatus(item),
                    onDelete: () => setDeleteTarget(item),
                  })
                : defaultRenderListItem(item, (i) => {
                    const second = config.fields[1];

                    if (!second) return null;
                    const val = (i as Record<string, unknown>)[second.name];

                    return val != null ? String(val) : null;
                  }, config, {
                    onEdit: () => openEditModal(item),
                    onToggleStatus: () => handleToggleStatus(item),
                    onDelete: () => setDeleteTarget(item),
                  })}
            </>
          )}
          ItemSeparatorComponent={() => (
            <View className="h-px bg-gray-200 dark:bg-gray-800" />
          )}
        />
      )}

      {/* ── FAB ─────────────────────────────────────────────── */}
      <FAB
        icon="plus"
        color="white"
        className="absolute bottom-6 right-4 bg-brand-red-coral"
        onPress={openCreateModal}
      />

      {/* ── Create / Edit modal ──────────────────────────────── */}
      <Portal>
        <Dialog visible={modalVisible} onDismiss={closeModal}>
          <Dialog.Title>
            {editingItem ? config.editDialogTitle : config.newDialogTitle}
          </Dialog.Title>
          <Dialog.Content>
            {formError ? (
              <Text className="mb-3 text-sm text-red-500">{formError}</Text>
            ) : null}

            {config.fields.map((field) => (
              <PaperInput
                key={field.name}
                label={field.label}
                mode="outlined"
                value={formValues[field.name] ?? ''}
                onChangeText={(text: string) => {
                  setFormValues((prev) => ({ ...prev, [field.name]: text }));
                  setFormError(null);
                }}
                {...(field.placeholder ? { placeholder: field.placeholder } : {})}
                {...(field.multiline ? { multiline: true } : {})}
                {...(field.numberOfLines ? { numberOfLines: field.numberOfLines } : {})}
                className={field.multiline ? '' : 'mb-3'}
              />
            ))}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={closeModal} textColor={colors.textSecondary}>
              Cancelar
            </Button>
            <Button
              onPress={handleSave}
              loading={isSaving}
              disabled={isSaving}
              textColor={colors.error}
            >
              Guardar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* ── Delete confirmation ──────────────────────────────── */}
      <Portal>
        <Dialog
          visible={deleteTarget !== null}
          onDismiss={() => setDeleteTarget(null)}
        >
          <Dialog.Title>{config.deleteDialogTitle}</Dialog.Title>
          <Dialog.Content>
            <Text className="text-base text-gray-600 dark:text-gray-400">
              {deleteTarget
                ? config.deleteConfirmText(deleteTarget)
                : ''}
            </Text>
            <Text className="mt-2 text-sm text-gray-400 dark:text-gray-500">
              Si {config.entityNamePluralLower} tiene productos asociados, se
              desactivará en lugar de eliminarse.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => setDeleteTarget(null)}
              textColor={colors.textSecondary}
            >
              Cancelar
            </Button>
            <Button
              onPress={() => {
                if (!deleteTarget) return;
                const name = deleteTarget.nombre;

                deleteMutation.mutate(config.getId(deleteTarget), {
                  onSuccess: () => {
                    void queryClient.invalidateQueries({
                      queryKey: [...config.queryKey],
                    });
                    setDeleteTarget(null);
                    toast(config.toastDeleted(name));
                  },
                });
              }}
              loading={deleteMutation.isPending}
              disabled={deleteMutation.isPending}
              textColor={colors.error}
            >
              Eliminar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* ── Toast notifications ─────────────────────────────── */}
      <Toast
        visible={toastMessage !== null}
        message={toastMessage ?? ''}
        onDismiss={() => setToastMessage(null)}
      />
    </View>
  );
}
