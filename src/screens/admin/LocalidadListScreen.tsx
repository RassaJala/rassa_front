import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { Button, Dialog, FAB, Portal, TextInput } from 'react-native-paper';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import Toast from '@/components/Toast';
import { colors } from '@/constants/colors';
import api from '@/services/api';
import type { Localidad, Municipio } from '@/types';
import { extractApiError } from '@/utils/apiError';

export default function LocalidadListScreen(): React.JSX.Element {
  const queryClient = useQueryClient();
  const isMounted = useRef(true);

  const [selectedMunicipio, setSelectedMunicipio] = useState<Municipio | null>(
    null,
  );
  const [showMunicipioPicker, setShowMunicipioPicker] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<Localidad | null>(null);
  const [formNombre, setFormNombre] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const toast = useCallback(
    (message: string, type: 'success' | 'error' = 'success') => {
      setToastMessage(message);
      setToastType(type);
    },
    [],
  );

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const { data: municipios = [] } = useQuery({
    queryKey: ['municipios'],
    queryFn: async () => {
      const { data } = await api.get<{ data: Municipio[] | Municipio[] }>(
        '/municipios/',
      );
      const raw = data?.data;
      return Array.isArray(raw) ? raw : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: localidades = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['localidades', selectedMunicipio?.id_municipio],
    queryFn: async () => {
      const { data } = await api.get<{
        data: Localidad[] | { results: Localidad[] };
      }>(`/localidades/?municipio_id=${selectedMunicipio?.id_municipio}`);
      const raw = data?.data;
      return Array.isArray(raw) ? raw : (raw?.results ?? []);
    },
    enabled: selectedMunicipio !== null,
  });

  const createMutation = useMutation({
    mutationFn: async (nombre: string) => {
      await api.post(
        `/localidades/?municipio_id=${selectedMunicipio?.id_municipio}`,
        { nombre },
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['localidades', selectedMunicipio?.id_municipio],
      });
      toast(`Se creó la localidad "${formNombre}"`);
      if (isMounted.current) {
        setShowCreateDialog(false);
        setFormNombre('');
      }
    },
    onError: (error: unknown) => {
      if (isMounted.current) {
        setErrorMessage(extractApiError(error, ['nombre']));
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, nombre }: { id: number; nombre: string }) => {
      await api.patch(`/localidades/${id}/`, { nombre });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['localidades', selectedMunicipio?.id_municipio],
      });
      toast(`Se editó la localidad "${formNombre}"`);
      if (isMounted.current) {
        setShowEditDialog(false);
        setEditingItem(null);
        setFormNombre('');
      }
    },
    onError: (error: unknown) => {
      if (isMounted.current) {
        setErrorMessage(extractApiError(error, ['nombre']));
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/localidades/${id}/`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['localidades', selectedMunicipio?.id_municipio],
      });
      toast(`Se eliminó la localidad "${editingItem?.nombre ?? ''}"`);
      if (isMounted.current) {
        setShowDeleteDialog(false);
        setEditingItem(null);
      }
    },
    onError: () => {
      if (isMounted.current) {
        toast('No se pudo eliminar. Puede tener registros asociados.', 'error');
        setShowDeleteDialog(false);
        setEditingItem(null);
      }
    },
  });

  const handleCreate = useCallback(() => {
    const nombre = formNombre.trim();
    if (!nombre) {
      setErrorMessage('El nombre es obligatorio.');
      return;
    }
    const duplicate = localidades.some(
      (l) => l.nombre.toLocaleLowerCase() === nombre.toLocaleLowerCase(),
    );
    if (duplicate) {
      setErrorMessage('Ya existe una localidad con ese nombre.');
      return;
    }
    setErrorMessage(null);
    createMutation.mutate(nombre);
  }, [formNombre, localidades, createMutation]);

  const handleEdit = useCallback(() => {
    const nombre = formNombre.trim();
    if (!nombre) {
      setErrorMessage('El nombre es obligatorio.');
      return;
    }
    if (!editingItem) return;
    const duplicate = localidades.some(
      (l) =>
        l.nombre.toLocaleLowerCase() === nombre.toLocaleLowerCase() &&
        l.id_localidad !== editingItem.id_localidad,
    );
    if (duplicate) {
      setErrorMessage('Ya existe una localidad con ese nombre.');
      return;
    }
    setErrorMessage(null);
    updateMutation.mutate({ id: editingItem.id_localidad, nombre });
  }, [formNombre, editingItem, localidades, updateMutation]);

  const openCreateDialog = useCallback(() => {
    setFormNombre('');
    setErrorMessage(null);
    setShowCreateDialog(true);
  }, []);

  const openEditDialog = useCallback((item: Localidad) => {
    setEditingItem(item);
    setFormNombre(item.nombre);
    setErrorMessage(null);
    setShowEditDialog(true);
  }, []);

  const openDeleteDialog = useCallback((item: Localidad) => {
    setEditingItem(item);
    setShowDeleteDialog(true);
  }, []);

  if (!selectedMunicipio) {
    return (
      <View className="flex-1 bg-gray-50 p-4 dark:bg-gray-950">
        <View className="rounded-xl bg-white p-4 shadow-sm dark:border dark:border-gray-800 dark:bg-gray-900">
          <Text className="mb-3 text-base font-semibold text-brand-ink dark:text-gray-100">
            Selecciona un municipio
          </Text>
          <Text className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            Elige un municipio para ver y administrar sus localidades.
          </Text>
          <Pressable
            onPress={() => setShowMunicipioPicker(true)}
            className="flex-row items-center justify-between rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-700"
          >
            <Text className="text-gray-400 dark:text-gray-500">
              Elegir municipio...
            </Text>
            <MaterialCommunityIcons
              name="chevron-down"
              size={20}
              color={colors.textSecondary}
            />
          </Pressable>
        </View>

        <MunicipioPickerDialog
          visible={showMunicipioPicker}
          municipios={municipios}
          onSelect={(m) => {
            setSelectedMunicipio(m);
            setShowMunicipioPicker(false);
          }}
          onDismiss={() => setShowMunicipioPicker(false)}
        />

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

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-950">
      <View className="border-b border-gray-200 bg-brand-green-forest px-4 pb-4 pt-14 dark:bg-brand-green-forest">
        <Text className="text-xl font-bold text-white">Localidades</Text>
        <Text className="mt-1 text-sm text-white/80">
          {selectedMunicipio.nombre}
        </Text>
        <Pressable
          onPress={() => {
            setSelectedMunicipio(null);
            setShowMunicipioPicker(true);
          }}
          className="mt-2 flex-row items-center"
        >
          <MaterialCommunityIcons
            name="swap-horizontal"
            size={16}
            color="#fff"
          />
          <Text className="ml-1 text-xs text-white/90">Cambiar municipio</Text>
        </Pressable>
      </View>

      <FlatList
        data={localidades}
        keyExtractor={(item) => String(item.id_localidad)}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
          />
        }
        ListEmptyComponent={
          isLoading ? (
            <View className="items-center py-12">
              <ActivityIndicator size="large" color={colors.brandGreenForest} />
            </View>
          ) : (
            <View className="items-center py-12">
              <MaterialCommunityIcons
                name="map-marker-off-outline"
                size={48}
                color={colors.iconMuted}
              />
              <Text className="mt-3 text-base font-semibold text-gray-500 dark:text-gray-400">
                No hay localidades
              </Text>
              <Text className="mt-1 text-sm text-gray-400 dark:text-gray-500">
                Agrega una localidad para comenzar.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View className="mb-3 rounded-xl bg-white p-4 shadow-sm dark:border dark:border-gray-800 dark:bg-gray-900">
            <View className="flex-row items-center">
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                <MaterialCommunityIcons
                  name="map-marker"
                  size={20}
                  color={colors.brandGreenForest}
                />
              </View>
              <Text className="flex-1 text-base font-medium text-brand-ink dark:text-gray-100">
                {item.nombre}
              </Text>
              <Pressable
                onPress={() => openEditDialog(item)}
                className="mr-2 p-2"
              >
                <MaterialCommunityIcons
                  name="pencil-outline"
                  size={20}
                  color={colors.textSecondary}
                />
              </Pressable>
              <Pressable onPress={() => openDeleteDialog(item)} className="p-2">
                <MaterialCommunityIcons
                  name="delete-outline"
                  size={20}
                  color={colors.brandRedCoral}
                />
              </Pressable>
            </View>
          </View>
        )}
      />

      <FAB
        icon="plus"
        color="#fff"
        style={{
          position: 'absolute',
          right: 16,
          bottom: 16,
          backgroundColor: colors.brandGreenForest,
        }}
        onPress={openCreateDialog}
      />

      <MunicipioPickerDialog
        visible={showMunicipioPicker}
        municipios={municipios}
        onSelect={(m) => {
          setSelectedMunicipio(m);
          setShowMunicipioPicker(false);
        }}
        onDismiss={() => setShowMunicipioPicker(false)}
      />

      <LocalidadDialog
        visible={showCreateDialog}
        title="Nueva localidad"
        nombre={formNombre}
        errorMessage={errorMessage}
        isLoading={createMutation.isPending}
        onChangeNombre={setFormNombre}
        onConfirm={handleCreate}
        onDismiss={() => {
          setShowCreateDialog(false);
          setFormNombre('');
          setErrorMessage(null);
        }}
      />

      <LocalidadDialog
        visible={showEditDialog}
        title="Editar localidad"
        nombre={formNombre}
        errorMessage={errorMessage}
        isLoading={updateMutation.isPending}
        onChangeNombre={setFormNombre}
        onConfirm={handleEdit}
        onDismiss={() => {
          setShowEditDialog(false);
          setEditingItem(null);
          setFormNombre('');
          setErrorMessage(null);
        }}
      />

      <Portal>
        <Dialog
          visible={showDeleteDialog}
          onDismiss={() => {
            setShowDeleteDialog(false);
            setEditingItem(null);
          }}
        >
          <Dialog.Title>Eliminar localidad</Dialog.Title>
          <Dialog.Content>
            <Text>
              ¿Estás seguro de eliminar &quot;{editingItem?.nombre}&quot;?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => {
                setShowDeleteDialog(false);
                setEditingItem(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              textColor={colors.brandRedCoral}
              onPress={() => {
                if (editingItem) {
                  deleteMutation.mutate(editingItem.id_localidad);
                }
              }}
            >
              Eliminar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

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

// ── Municipio Picker Dialog ──────────────────────────────

interface MunicipioPickerDialogProps {
  readonly visible: boolean;
  readonly municipios: Municipio[];
  readonly onSelect: (municipio: Municipio) => void;
  readonly onDismiss: () => void;
}

function MunicipioPickerDialog({
  visible,
  municipios,
  onSelect,
  onDismiss,
}: MunicipioPickerDialogProps): React.JSX.Element {
  const [search, setSearch] = useState('');

  const filtered = municipios.filter((m) =>
    m.nombre.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );

  return (
    <Portal>
      <Dialog
        visible={visible}
        onDismiss={onDismiss}
        style={{ maxHeight: '70%' }}
      >
        <Dialog.Title>Seleccionar municipio</Dialog.Title>
        <Dialog.Content>
          <TextInput
            placeholder="Buscar municipio..."
            value={search}
            onChangeText={setSearch}
            mode="outlined"
            dense
            style={{ marginBottom: 8 }}
          />
          <FlatList
            data={filtered}
            keyExtractor={(item) => String(item.id_municipio)}
            style={{ maxHeight: 300 }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  setSearch('');
                  onSelect(item);
                }}
                className="flex-row items-center rounded-lg px-3 py-3"
              >
                <MaterialCommunityIcons
                  name="map-marker"
                  size={18}
                  color={colors.brandGreenForest}
                />
                <Text className="ml-3 text-base text-brand-ink dark:text-gray-100">
                  {item.nombre}
                </Text>
              </Pressable>
            )}
          />
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancelar</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

// ── Localidad Create/Edit Dialog ─────────────────────────

interface LocalidadDialogProps {
  readonly visible: boolean;
  readonly title: string;
  readonly nombre: string;
  readonly errorMessage: string | null;
  readonly isLoading: boolean;
  readonly onChangeNombre: (value: string) => void;
  readonly onConfirm: () => void;
  readonly onDismiss: () => void;
}

function LocalidadDialog({
  visible,
  title,
  nombre,
  errorMessage,
  isLoading,
  onChangeNombre,
  onConfirm,
  onDismiss,
}: LocalidadDialogProps): React.JSX.Element {
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Content>
          <TextInput
            label="Nombre"
            value={nombre}
            onChangeText={onChangeNombre}
            mode="outlined"
          />
          {errorMessage ? (
            <Text className="mt-2 text-sm text-red-500">{errorMessage}</Text>
          ) : null}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancelar</Button>
          <Button onPress={onConfirm} loading={isLoading} disabled={isLoading}>
            Guardar
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
