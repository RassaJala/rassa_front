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

import { MaterialCommunityIcons } from '@expo/vector-icons';
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
  readonly extraDuplicateCheck?: (
    formValues: Record<string, string>,
    items: T[] | undefined,
    editingItem: T | null,
  ) => string | null;
  readonly trashScreenName?: 'CategoryTrash' | 'UnitTrash';
  readonly comingSoon?: boolean;
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
      <View className="flex-row items-start">
        <View className="mr-3 mt-0.5 h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
          <MaterialCommunityIcons
            name={item.estado ? 'check-circle-outline' : 'circle-outline'}
            size={20}
            color={item.estado ? colors.brandGreenForest : colors.iconMuted}
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
          <View
            className={`mt-2 self-start rounded-full px-2.5 py-0.5 ${
              item.estado
                ? 'bg-gray-100 dark:bg-gray-800'
                : 'bg-gray-100 dark:bg-gray-800'
            }`}
          >
            <Text
              className={`text-xs font-medium ${
                item.estado
                  ? 'text-brand-green-forest'
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

      <View className="mt-3 flex-row items-center justify-end gap-4 border-t border-gray-100 pt-3 dark:border-gray-800">
        <Pressable
          onPress={actions.onEdit}
          className="flex-row items-center gap-1 rounded-md px-2 py-1"
          hitSlop={8}
        >
          <MaterialCommunityIcons
            name="pencil-outline"
            size={14}
            color={colors.brandRedCoral}
          />
          <Text className="text-xs font-medium text-brand-red-coral">
            Editar
          </Text>
        </Pressable>
        <Pressable
          onPress={actions.onToggleStatus}
          className="flex-row items-center gap-1 rounded-md px-2 py-1"
          hitSlop={8}
        >
          <MaterialCommunityIcons
            name={item.estado ? 'close-circle-outline' : 'check-circle-outline'}
            size={14}
            color={colors.textSecondary}
          />
          <Text className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {item.estado ? 'Desactivar' : 'Activar'}
          </Text>
        </Pressable>
        <Pressable
          onPress={actions.onDelete}
          className="flex-row items-center gap-1 rounded-md px-2 py-1"
          hitSlop={8}
        >
          <MaterialCommunityIcons
            name="trash-can-outline"
            size={14}
            color={colors.error}
          />
          <Text className="text-xs font-medium text-red-500">Eliminar</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Component ──────────────────────────────────────────────

export default function CrudListScreen<
  T extends { nombre: string; estado: boolean },
>({ config, navigation }: CrudListScreenProps<T>): React.JSX.Element | null {
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
      const { data } = await api.get<
        T[] | { results: T[] } | ApiResponse<{ results: T[] }>
      >(config.endpoint);

      if (Array.isArray(data)) return data;
      if (
        'data' in data &&
        typeof data.data === 'object' &&
        data.data !== null
      ) {
        const inner = data.data as { results?: T[] };
        if (Array.isArray(inner.results)) return inner.results;
      }
      if ('results' in data && Array.isArray(data.results)) return data.results;

      return [];
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
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // ── Delete dialog state ────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);

  // ── Helpers ────────────────────────────────────────────────
  const toast = useCallback(
    (message: string, type: 'success' | 'error' = 'success') => {
      setToastMessage(message);
      setToastType(type);
    },
    [],
  );

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
      const { data } = await api.post<ApiResponse<T>>(config.endpoint, payload);

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

  function fieldValueFor(name: string, item: T): string {
    if (name === 'descripcion' && 'descripcion' in item) {
      return String((item as Record<string, unknown>).descripcion ?? '');
    }
    if (name === 'abreviatura' && 'abreviatura' in item) {
      return String((item as Record<string, unknown>).abreviatura ?? '');
    }
    return '';
  }

  const openEditModal = useCallback((item: T) => {
    const initial: Record<string, string> = {};

    for (const field of config.fields) {
      initial[field.name] =
        field.name === 'nombre' ? item.nombre : fieldValueFor(field.name, item);
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
        (item.nombre ?? '').toLocaleLowerCase() === nameLower &&
        (!editingItem || config.getId(item) !== config.getId(editingItem)),
    );

    if (isDuplicate) {
      setFormError(
        `Ya existe ${config.entityName} con el nombre "${trimmedName}".`,
      );

      return;
    }

    // Extra duplicate check (e.g. abbreviation for units)
    if (config.extraDuplicateCheck) {
      const extraError = config.extraDuplicateCheck(
        formValues,
        items,
        editingItem,
      );

      if (extraError) {
        setFormError(extraError);

        return;
      }
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

  // ── Coming soon placeholder ────────────────────────────────
  if (config.comingSoon) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-6 dark:bg-gray-950">
        <MaterialCommunityIcons
          name="wrench-clock-outline"
          size={64}
          color={colors.iconMuted}
        />
        <Text className="mt-4 text-center text-2xl font-bold text-gray-500 dark:text-gray-400">
          Funcionalidad en desarrollo
        </Text>
        <Text className="mt-2 text-center text-sm text-gray-400 dark:text-gray-500">
          Esta sección estará disponible próximamente.
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
          {netInfo.isConnected === false
            ? 'Sin conexión a Internet. Verifica tu conexión.'
            : config.loadingErrorText}
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
  const trashScreen = config.trashScreenName;

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
          <Text className="text-2xl font-bold tracking-tight text-white">
            {config.headerTitle}
          </Text>
          {trashScreen ? (
            <Pressable
              onPress={() => navigation.navigate(trashScreen)}
              className="ml-auto h-11 w-11 items-center justify-center rounded-full active:opacity-80"
              hitSlop={12}
            >
              <MaterialCommunityIcons
                name="delete-restore"
                size={22}
                color={colors.iconWhite}
              />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Empty state */}
      {isEmpty ? (
        <View className="flex-1 items-center justify-center px-6">
          <MaterialCommunityIcons
            name={config.emptyIcon as 'folder-open-outline' | 'ruler'}
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
          renderItem={({ item }) =>
            config.renderListItem
              ? config.renderListItem(item, {
                  onEdit: () => openEditModal(item),
                  onToggleStatus: () => handleToggleStatus(item),
                  onDelete: () => setDeleteTarget(item),
                })
              : defaultRenderListItem(
                  item,
                  (i) => {
                    const second = config.fields[1];
                    if (!second) return null;
                    const val = (i as Record<string, unknown>)[second.name];
                    return val != null ? String(val) : null;
                  },
                  config,
                  {
                    onEdit: () => openEditModal(item),
                    onToggleStatus: () => handleToggleStatus(item),
                    onDelete: () => setDeleteTarget(item),
                  },
                )
          }
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
          <Dialog.Title className="text-xl font-bold text-brand-ink dark:text-gray-100">
            {editingItem ? config.editDialogTitle : config.newDialogTitle}
          </Dialog.Title>

          <Dialog.Content>
            {formError ? (
              <View className="mb-4 flex-row items-start gap-2 rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
                <MaterialCommunityIcons
                  name="alert-circle"
                  size={18}
                  color={colors.error}
                />
                <Text className="flex-1 text-sm leading-5 text-red-600 dark:text-red-400">
                  {formError}
                </Text>
              </View>
            ) : null}

            {config.fields.map((field, idx) => (
              <PaperInput
                key={field.name}
                label={field.label}
                mode="outlined"
                value={formValues[field.name] ?? ''}
                onChangeText={(text: string) => {
                  setFormValues((prev) => ({ ...prev, [field.name]: text }));
                  setFormError(null);
                }}
                {...(field.placeholder
                  ? { placeholder: field.placeholder }
                  : {})}
                {...(field.multiline ? { multiline: true } : {})}
                {...(field.numberOfLines
                  ? { numberOfLines: field.numberOfLines }
                  : {})}
                className={idx < config.fields.length - 1 ? 'mb-3' : ''}
              />
            ))}
          </Dialog.Content>

          <Dialog.Actions>
            <Button
              onPress={closeModal}
              textColor={colors.textSecondary}
              compact
            >
              Cancelar
            </Button>
            <Button
              onPress={handleSave}
              mode="contained"
              buttonColor={colors.brandRedCoral}
              loading={isSaving}
              disabled={isSaving}
              compact
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
          <Dialog.Title className="text-xl font-bold text-brand-ink dark:text-gray-100">
            {config.deleteDialogTitle}
          </Dialog.Title>

          <Dialog.Content>
            <View className="mb-4 items-center">
              <View className="mb-3 h-16 w-16 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20">
                <MaterialCommunityIcons
                  name="trash-can-outline"
                  size={28}
                  color={colors.error}
                />
              </View>
              <Text className="text-base leading-6 text-gray-700 dark:text-gray-300">
                {deleteTarget ? config.deleteConfirmText(deleteTarget) : ''}
              </Text>
            </View>
            <View className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50">
              <Text className="text-sm leading-5 text-gray-500 dark:text-gray-400">
                Si {config.entityNamePluralLower} tiene productos asociados, se
                desactivará en lugar de eliminarse.
              </Text>
            </View>
          </Dialog.Content>

          <Dialog.Actions>
            <Button
              onPress={() => setDeleteTarget(null)}
              textColor={colors.textSecondary}
              compact
            >
              Cancelar
            </Button>
            <Button
              onPress={() => {
                if (!deleteTarget) return;
                const id = config.getId(deleteTarget);
                const name = deleteTarget.nombre;

                deleteMutation.mutate(id, {
                  onSuccess: () => {
                    void queryClient.invalidateQueries({
                      queryKey: [...config.queryKey],
                    });
                    setDeleteTarget(null);
                    toast(config.toastDeleted(name));
                  },
                  onError: () => {
                    // Soft-delete fallback if hard delete fails (FK protection)
                    updateMutation.mutate(
                      { id, estado: false },
                      {
                        onSuccess: () => {
                          void queryClient.invalidateQueries({
                            queryKey: [...config.queryKey],
                          });
                          toast(`Se desactivó ${config.entityName} "${name}"`);
                        },
                        onError: () => {
                          toast(
                            `Error al eliminar ${config.entityName} "${name}". Intenta de nuevo.`,
                            'error',
                          );
                        },
                      },
                    );
                    setDeleteTarget(null);
                  },
                });
              }}
              mode="contained"
              buttonColor={colors.error}
              loading={deleteMutation.isPending}
              disabled={deleteMutation.isPending}
              compact
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
        type={toastType}
        onDismiss={() => {
          setToastMessage(null);
          setToastType('success');
        }}
      />
    </View>
  );
}
