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
import type { AxiosError } from 'axios';
import axios from 'axios';

import Toast from '@/components/Toast';
import api from '@/services/api';
import type { AdminStackParamList, ApiResponse, Category } from '@/types';

type NavigationProp = NativeStackNavigationProp<
  AdminStackParamList,
  'CategoryList'
>;

interface Props {
  navigation: NavigationProp;
}

const QUERY_KEY = ['categories'];

function extractApiError(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : 'Error desconocido.';
  }

  const axiosErr = error as AxiosError<Record<string, unknown> | string>;
  const data = axiosErr.response?.data;

  if (!data) return 'Error del servidor. Intenta de nuevo.';

  // ── HTML error page (e.g. Django DEBUG=True 500 page) ──────
  if (typeof data === 'string') {
    const trimmed = data.trim();
    if (
      trimmed.startsWith('<!DOCTYPE') ||
      trimmed.startsWith('<html') ||
      trimmed.includes('Traceback (most recent call last)')
    ) {
      global.console.error(
        '[API Error] Backend returned HTML instead of JSON — check backend logs. Status:',
        axiosErr.response?.status,
      );
      return 'Error interno del servidor. Revisa los logs del backend.';
    }
    return trimmed;
  }

  if (typeof data.message === 'string') return data.message;

  for (const key of ['nombre', 'descripcion', 'detail']) {
    const value = data[key];
    if (Array.isArray(value) && value[0]) return String(value[0]);
  }

  return 'Error del servidor. Intenta de nuevo.';
}

export default function CategoryListScreen({
  navigation,
}: Props): React.JSX.Element {
  const netInfo = useNetInfo();
  const queryClient = useQueryClient();

  // ── List data ──────────────────────────────────────────────
  const {
    data: categories,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery<Category[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Category[]>>('/categorias/');
      return data.data;
    },
  });

  // ── Modal state ────────────────────────────────────────────
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formNombre, setFormNombre] = useState('');
  const [formDescripcion, setFormDescripcion] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // ── Toast state ────────────────────────────────────────────
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ── Delete dialog state ────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  // ── Mutations ──────────────────────────────────────────────
  const invalidateAndClose = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    setModalVisible(false);
    setEditingCategory(null);
    setFormNombre('');
    setFormDescripcion('');
    setFormError(null);
  }, [queryClient]);

  const createMutation = useMutation({
    mutationFn: async (payload: {
      nombre: string;
      descripcion: string;
      estado: boolean;
    }) => {
      const { data } = await api.post<ApiResponse<Category>>(
        '/categorias/',
        payload,
      );
      return data;
    },
    onError: (error: unknown) => {
      setFormError(extractApiError(error));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: {
      id: number;
      nombre?: string;
      descripcion?: string;
      estado?: boolean;
    }) => {
      const { data } = await api.patch<ApiResponse<Category>>(
        `/categorias/${id}/`,
        payload,
      );
      return data;
    },
    onError: (error: unknown) => {
      setFormError(extractApiError(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/categorias/${id}/`);
    },
    onError: () => {
      // Try soft-delete if hard delete fails (protected by FK)
      if (deleteTarget) {
        updateMutation.mutate(
          { id: deleteTarget.id_categoria, estado: false },
          {
            onSuccess: () => {
              void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
              setToastMessage(
                `Se desactivó la categoría "${deleteTarget?.nombre ?? ''}"`,
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
    setEditingCategory(null);
    setFormNombre('');
    setFormDescripcion('');
    setFormError(null);
    setModalVisible(true);
  }, []);

  const openEditModal = useCallback((cat: Category) => {
    setEditingCategory(cat);
    setFormNombre(cat.nombre);
    setFormDescripcion(cat.descripcion);
    setFormError(null);
    setModalVisible(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setEditingCategory(null);
    setFormNombre('');
    setFormDescripcion('');
    setFormError(null);
  }, []);

  const handleSave = useCallback(() => {
    if (!formNombre.trim()) {
      setFormError('El nombre es obligatorio.');
      return;
    }

    const trimmedName = formNombre.trim();
    const nameLower = trimmedName.toLocaleLowerCase();
    const isDuplicate = (categories ?? []).some(
      (c) =>
        c.nombre.toLocaleLowerCase() === nameLower &&
        c.id_categoria !== editingCategory?.id_categoria,
    );
    if (isDuplicate) {
      setFormError(`Ya existe una categoría con el nombre "${trimmedName}".`);
      return;
    }

    if (editingCategory) {
      updateMutation.mutate(
        {
          id: editingCategory.id_categoria,
          nombre: trimmedName,
          descripcion: formDescripcion.trim(),
        },
        {
          onSuccess: () => {
            invalidateAndClose();
            setToastMessage(`Se editó la categoría "${trimmedName}"`);
          },
        },
      );
    } else {
      createMutation.mutate(
        {
          nombre: trimmedName,
          descripcion: formDescripcion.trim(),
          estado: true,
        },
        {
          onSuccess: () => {
            invalidateAndClose();
            setToastMessage(`Se creó la categoría "${trimmedName}"`);
          },
        },
      );
    }
  }, [
    formNombre,
    formDescripcion,
    editingCategory,
    categories,
    invalidateAndClose,
    createMutation,
    updateMutation,
  ]);

  const handleToggleStatus = useCallback(
    (cat: Category) => {
      const newStatus = !cat.estado;
      const action = newStatus ? 'activó' : 'desactivó';
      const name = cat.nombre;

      updateMutation.mutate(
        { id: cat.id_categoria, estado: newStatus },
        {
          onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
            setToastMessage(`Se ${action} la categoría "${name}"`);
          },
        },
      );
    },
    [updateMutation, queryClient],
  );

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ── Loading ────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-950">
        <ActivityIndicator size="large" color="#DE393A" />
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
            : 'Error al cargar categorías.'}
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

  const isEmpty = !categories || categories.length === 0;

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
          <Text className="text-xl font-bold text-white">Categorías</Text>
        </View>
      </View>

      {/* Empty state */}
      {isEmpty ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-5xl">📂</Text>
          <Text className="mt-4 text-center text-lg font-semibold text-gray-500 dark:text-gray-400">
            No hay categorías
          </Text>
          <Text className="mt-1 text-center text-sm text-gray-400 dark:text-gray-500">
            Agrega una categoría para comenzar.
          </Text>
        </View>
      ) : (
        <FlatList
          data={categories}
          keyExtractor={(item) => String(item.id_categoria)}
          contentContainerClassName="p-4 pb-24 gap-3"
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
              tintColor="#DE393A"
            />
          }
          renderItem={({ item }) => (
            <View className="rounded-xl bg-white p-4 shadow-sm dark:border dark:border-gray-800 dark:bg-gray-900 dark:shadow-none">
              <View className="flex-row items-center">
                <View className="flex-1">
                  <Text className="text-base font-semibold text-brand-ink dark:text-gray-100">
                    {item.nombre}
                  </Text>
                  {item.descripcion ? (
                    <Text className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                      {item.descripcion}
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
                      {item.estado ? 'Activo' : 'Inactivo'}
                    </Text>
                  </View>
                </View>
              </View>

              <View className="mt-3 flex-row items-center gap-4 border-t border-gray-100 pt-3 dark:border-gray-800">
                <Pressable
                  onPress={() => openEditModal(item)}
                  className="rounded-md border border-gray-300 px-3 py-1.5 dark:border-gray-600"
                  hitSlop={4}
                >
                  <Text className="text-brand-coral text-xs font-medium">
                    Editar
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => handleToggleStatus(item)}
                  className="rounded-md border border-gray-300 px-3 py-1.5 dark:border-gray-600"
                  hitSlop={4}
                >
                  <Text className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    {item.estado ? 'Desactivar' : 'Activar'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setDeleteTarget(item)}
                  className="rounded-md border border-red-300 px-3 py-1.5 dark:border-red-800"
                  hitSlop={4}
                >
                  <Text className="text-xs font-medium text-red-600 dark:text-red-400">
                    Eliminar
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
            {editingCategory ? 'Editar categoría' : 'Nueva categoría'}
          </Dialog.Title>
          <Dialog.Content>
            {formError ? (
              <Text className="mb-3 text-sm text-red-500">{formError}</Text>
            ) : null}

            <PaperInput
              label="Nombre"
              mode="outlined"
              value={formNombre}
              onChangeText={setFormNombre}
              className="mb-3"
            />

            <PaperInput
              label="Descripción"
              mode="outlined"
              value={formDescripcion}
              onChangeText={setFormDescripcion}
              multiline
              numberOfLines={3}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={closeModal} textColor="#6b7280">
              Cancelar
            </Button>
            <Button
              onPress={handleSave}
              loading={isSaving}
              disabled={isSaving}
              textColor="#DE393A"
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
          <Dialog.Title>Eliminar categoría</Dialog.Title>
          <Dialog.Content>
            <Text className="text-base text-gray-600 dark:text-gray-400">
              {deleteTarget
                ? `¿Estás seguro de eliminar "${deleteTarget.nombre}"?`
                : ''}
            </Text>
            <Text className="mt-2 text-sm text-gray-400 dark:text-gray-500">
              Si la categoría tiene productos asociados, se desactivará en lugar
              de eliminarse.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteTarget(null)} textColor="#6b7280">
              Cancelar
            </Button>
            <Button
              onPress={() => {
                if (!deleteTarget) return;
                const name = deleteTarget.nombre;
                deleteMutation.mutate(deleteTarget.id_categoria, {
                  onSuccess: () => {
                    void queryClient.invalidateQueries({
                      queryKey: QUERY_KEY,
                    });
                    setDeleteTarget(null);
                    setToastMessage(`Se eliminó la categoría "${name}"`);
                  },
                });
              }}
              loading={deleteMutation.isPending}
              disabled={deleteMutation.isPending}
              textColor="#ef4444"
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
