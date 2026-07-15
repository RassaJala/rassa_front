/* globals setTimeout, clearTimeout -- RN timer functions not in ESLint env */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button, Dialog, Portal, RadioButton } from 'react-native-paper';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNetInfo } from '@react-native-community/netinfo';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import Toast from '@/components/Toast';
import { colors } from '@/constants/colors';
import api from '@/services/api';
import { useAuth } from '@/store/AuthContext';
import type { AdminStackParamList, ApiResponse } from '@/types';

// ── Types ──────────────────────────────────────────────────

interface AdminUser {
  id_usuario: number;
  email: string;
  telefono: string | null;
  role: 'buyer' | 'farmer' | 'admin' | 'seller';
  nombre: string;
  apellido_paterno: string | null;
  apellido_materno: string | null;
  fecha_nacimiento: string | null;
  genero: string | null;
  direccion: string | null;
  localidad: number | null;
  localidad_nombre: string | null;
  estado: boolean;
  creado_en: string;
}

// ── Constants ──────────────────────────────────────────────

const ROLE_FILTERS = [
  { label: 'Todos', value: null as string | null },
  { label: 'Admin', value: 'Admin' },
  { label: 'Agricultor', value: 'Agricultor' },
  { label: 'Vendedor', value: 'Vendedor' },
  { label: 'Cliente', value: 'Cliente' },
] as const;

const STATUS_FILTERS = [
  { label: 'Todos', value: null as string | null },
  { label: 'Activos', value: 'true' },
  { label: 'Inactivos', value: 'false' },
] as const;

const ROLE_OPTIONS = [
  { label: 'Admin', value: 'admin', color: '#ef4444' },
  { label: 'Agricultor', value: 'farmer', color: colors.primary },
  { label: 'Vendedor', value: 'seller', color: colors.accent },
  { label: 'Cliente', value: 'buyer', color: '#3b82f6' },
] as const;

const ROLE_LABEL_MAP: Record<string, string> = {
  admin: 'Admin',
  farmer: 'Agricultor',
  seller: 'Vendedor',
  buyer: 'Cliente',
};

const ROLE_COLOR_MAP: Record<string, string> = {
  admin: '#ef4444',
  farmer: colors.primary,
  seller: colors.accent,
  buyer: '#3b82f6',
};

// ── Helpers ────────────────────────────────────────────────

function getRoleLabel(role: string): string {
  return ROLE_LABEL_MAP[role] ?? role;
}

function getRoleBadgeBg(role: string): string {
  const color = ROLE_COLOR_MAP[role] ?? '#6b7280';
  return `${color}1A`; // ~10% opacity hex
}

function getFullName(user: AdminUser): string {
  return [user.nombre, user.apellido_paterno, user.apellido_materno]
    .filter(Boolean)
    .join(' ');
}

type Props = NativeStackScreenProps<AdminStackParamList, 'UserManagement'>;

// ── Component ──────────────────────────────────────────────

export default function UserManagementScreen({
  navigation,
}: Props): React.JSX.Element {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const netInfo = useNetInfo();

  // ── Search & filter state ──
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Debounce search input — 400ms after last keystroke
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // ── Role change modal state ──
  const [roleModalUser, setRoleModalUser] = useState<AdminUser | null>(null);
  const [newRole, setNewRole] = useState<string>('');

  // ── Deactivation confirmation state ──
  const [confirmUser, setConfirmUser] = useState<AdminUser | null>(null);

  // ── Toast state ──
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({ visible: false, message: '', type: 'info' });

  // ── Build query params ──
  const params: string[] = [];

  if (debouncedSearch) {
    params.push(`search=${encodeURIComponent(debouncedSearch)}`);
  }

  if (roleFilter) {
    params.push(`rol=${encodeURIComponent(roleFilter)}`);
  }

  if (statusFilter) {
    params.push(`estado=${statusFilter}`);
  }

  const queryString = params.length > 0 ? `?${params.join('&')}` : '';

  // ── Users query ──
  const {
    data: users,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['admin-users', debouncedSearch, roleFilter, statusFilter],
    queryFn: async () => {
      const { data: response } = await api.get<ApiResponse<AdminUser[]>>(
        `/admin/usuarios/${queryString}`,
      );

      return response.data;
    },
  });

  // ── Toggle estado mutation ──
  const toggleMutation = useMutation({
    mutationFn: async (userId: number) => {
      const { data } = await api.patch<ApiResponse<AdminUser>>(
        `/admin/usuarios/${userId}/toggle-estado/`,
      );

      return data;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      showToast(data.message ?? 'Estado actualizado', 'success');
    },
    onError: (error: unknown) => {
      const detail =
        (error as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? 'Error al cambiar estado';

      showToast(detail, 'error');
      // Refresh in case backend rejected a self-deactivation
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  // ── Role change mutation ──
  const roleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      const { data } = await api.patch<ApiResponse<AdminUser>>(
        `/admin/usuarios/${userId}/`,
        { role },
      );

      return data;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      closeRoleModal();
      showToast(data.message ?? 'Rol actualizado', 'success');
    },
    onError: (error: unknown) => {
      const detail =
        (error as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? 'Error al cambiar rol';

      showToast(detail, 'error');
    },
  });

  // ── Handlers ──
  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info') => {
      setToast({ visible: true, message, type });
    },
    [],
  );

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  const openRoleModal = useCallback((user: AdminUser) => {
    setRoleModalUser(user);
    setNewRole(user.role);
  }, []);

  const closeRoleModal = useCallback(() => {
    setRoleModalUser(null);
    setNewRole('');
  }, []);

  const handleRoleSave = useCallback(() => {
    if (!roleModalUser || !newRole) return;

    // Same role — no-op
    if (newRole === roleModalUser.role) {
      closeRoleModal();
      return;
    }

    roleMutation.mutate({ userId: roleModalUser.id_usuario, role: newRole });
  }, [roleModalUser, newRole, roleMutation, closeRoleModal]);

  const handleTogglePress = useCallback(
    (user: AdminUser) => {
      // Deactivating → require confirmation
      if (user.estado) {
        setConfirmUser(user);
      } else {
        // Reactivating — go directly
        toggleMutation.mutate(user.id_usuario);
      }
    },
    [toggleMutation],
  );

  const confirmDeactivation = useCallback(() => {
    if (confirmUser) {
      toggleMutation.mutate(confirmUser.id_usuario);
    }

    setConfirmUser(null);
  }, [confirmUser, toggleMutation]);

  const isSelf = useCallback(
    (user: AdminUser): boolean => currentUser?.id_usuario === user.id_usuario,
    [currentUser?.id_usuario],
  );

  // ── Key extractor ──
  const keyExtractor = useCallback(
    (item: AdminUser) => String(item.id_usuario),
    [],
  );

  // ── Render user card ──
  const renderUser = useCallback(
    ({ item }: { item: AdminUser }) => {
      const self = isSelf(item);

      return (
        <View className="mx-4 mb-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          {/* Top row: name + role badge */}
          <View className="mb-3 flex-row items-center justify-between">
            <View className="mr-2 flex-1">
              <Text
                className="text-base font-semibold text-brand-ink dark:text-gray-100"
                numberOfLines={1}
              >
                {getFullName(item)}
              </Text>
              <Text
                className="text-sm text-gray-500 dark:text-gray-400"
                numberOfLines={1}
              >
                {item.email}
              </Text>
            </View>

            <Pressable
              onPress={() => openRoleModal(item)}
              className="rounded-full px-3 py-1"
              style={{ backgroundColor: getRoleBadgeBg(item.role) }}
            >
              <Text
                className="text-xs font-semibold"
                style={{ color: ROLE_COLOR_MAP[item.role] ?? '#6b7280' }}
              >
                {getRoleLabel(item.role)}
              </Text>
            </Pressable>
          </View>

          {/* Bottom row: toggle + change role button */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Switch
                value={item.estado}
                onValueChange={() => handleTogglePress(item)}
                disabled={self}
                trackColor={{
                  false: colors.border,
                  true: colors.success,
                }}
                thumbColor={
                  self
                    ? colors.iconMuted
                    : item.estado
                      ? colors.primary
                      : colors.iconMuted
                }
              />
              <Text className="text-sm text-gray-600 dark:text-gray-400">
                {item.estado ? 'Activo' : 'Inactivo'}
              </Text>
              {self ? (
                <View className="rounded bg-amber-100 px-1.5 py-0.5 dark:bg-amber-900">
                  <Text className="text-xs text-amber-700 dark:text-amber-300">
                    tú
                  </Text>
                </View>
              ) : null}
            </View>

            <Pressable
              onPress={() => openRoleModal(item)}
              className="flex-row items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 dark:bg-gray-800"
            >
              <MaterialCommunityIcons
                name="account-cog-outline"
                size={16}
                color={colors.textSecondary}
              />
              <Text className="text-sm text-gray-600 dark:text-gray-400">
                Rol
              </Text>
            </Pressable>
          </View>
        </View>
      );
    },
    [handleTogglePress, isSelf, openRoleModal],
  );

  // ── Empty state ──
  const ListEmptyComponent = useCallback(
    () => (
      <View className="items-center justify-center px-8 py-20">
        <MaterialCommunityIcons
          name="account-search-outline"
          size={64}
          color={colors.iconMuted}
        />
        <Text className="mt-4 text-center text-base text-gray-500 dark:text-gray-400">
          {debouncedSearch || roleFilter || statusFilter
            ? 'No se encontraron usuarios con esos filtros.'
            : 'No hay usuarios registrados.'}
        </Text>
      </View>
    ),
    [debouncedSearch, roleFilter, statusFilter],
  );

  // ── Error state ──
  if (isError) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-6 dark:bg-gray-950">
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={48}
          color={colors.iconMuted}
        />
        <Text className="mt-3 text-center text-base text-gray-500 dark:text-gray-400">
          {!netInfo.isConnected
            ? 'Sin conexión a Internet. Verifica tu conexión.'
            : 'Error al cargar usuarios.'}
        </Text>

        <Button
          mode="contained"
          onPress={() => void refetch()}
          className="mt-4"
          buttonColor={colors.primary}
        >
          Reintentar
        </Button>
      </View>
    );
  }

  // ── Main render ──
  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-950">
      {/* ═══ Header ═══ */}
      <View className="bg-brand-green-forest px-4 pb-5 pt-14">
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => navigation.goBack()}
            className="h-9 w-9 items-center justify-center rounded-full bg-white/20"
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={22}
              color={colors.iconWhite}
            />
          </Pressable>
          <Text className="text-xl font-bold text-white">
            Gestión de Usuarios
          </Text>
        </View>
      </View>

      {/* ═══ Search bar ═══ */}
      <View className="px-4 pb-2 pt-3">
        <View className="flex-row items-center rounded-xl border border-gray-300 bg-white px-3 dark:border-gray-600 dark:bg-gray-900">
          <MaterialCommunityIcons
            name="magnify"
            size={20}
            color={colors.iconMuted}
          />
          <TextInput
            className="ml-2 flex-1 py-2.5 text-base text-brand-ink dark:text-gray-100"
            placeholder="Buscar por nombre o correo..."
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} className="p-1">
              <MaterialCommunityIcons
                name="close-circle"
                size={18}
                color={colors.iconMuted}
              />
            </Pressable>
          )}
        </View>
      </View>

      {/* ═══ Filters ═══ */}
      <View className="px-4 pb-2">
        {/* Rol filter chips */}
        <View className="mb-2 flex-row flex-wrap gap-2">
          {ROLE_FILTERS.map((opt) => (
            <Pressable
              key={String(opt.value)}
              onPress={() => setRoleFilter(opt.value)}
              className={`rounded-full px-3.5 py-1.5 ${
                roleFilter === opt.value
                  ? 'bg-brand-green-forest'
                  : 'bg-white dark:bg-gray-800'
              }`}
            >
              <Text
                className={`text-xs font-medium ${
                  roleFilter === opt.value
                    ? 'text-white'
                    : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Status filter chips */}
        <View className="flex-row flex-wrap gap-2">
          {STATUS_FILTERS.map((opt) => (
            <Pressable
              key={String(opt.value)}
              onPress={() => setStatusFilter(opt.value)}
              className={`rounded-full px-3.5 py-1.5 ${
                statusFilter === opt.value
                  ? 'bg-brand-green-forest'
                  : 'bg-white dark:bg-gray-800'
              }`}
            >
              <Text
                className={`text-xs font-medium ${
                  statusFilter === opt.value
                    ? 'text-white'
                    : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* ═══ User list ═══ */}
      {isLoading ? (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          className="pb-20 pt-20"
        />
      ) : (
        <FlatList
          data={users}
          renderItem={renderUser}
          keyExtractor={keyExtractor}
          ListEmptyComponent={ListEmptyComponent}
          contentContainerStyle={{
            paddingTop: 8,
            paddingBottom: 40,
            flexGrow: 1,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ═══ Role Change Modal ═══ */}
      <Portal>
        <Dialog visible={roleModalUser !== null} onDismiss={closeRoleModal}>
          <Dialog.Title>Cambiar Rol</Dialog.Title>

          <Dialog.Content>
            {roleModalUser !== null && (
              <>
                <Text className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                  Usuario:{' '}
                  <Text className="font-medium text-gray-800 dark:text-gray-200">
                    {getFullName(roleModalUser)}
                  </Text>
                </Text>

                <RadioButton.Group
                  onValueChange={(value: string) => setNewRole(value)}
                  value={newRole}
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <Pressable
                      key={opt.value}
                      onPress={() => setNewRole(opt.value)}
                      className="flex-row items-center py-1.5"
                    >
                      <RadioButton
                        value={opt.value}
                        color={colors.primary}
                        status={newRole === opt.value ? 'checked' : 'unchecked'}
                      />
                      <Text
                        className="ml-2 text-base font-medium"
                        style={{ color: opt.color }}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  ))}
                </RadioButton.Group>
              </>
            )}
          </Dialog.Content>

          <Dialog.Actions>
            <Button onPress={closeRoleModal} textColor={colors.textSecondary}>
              Cancelar
            </Button>
            <Button
              onPress={handleRoleSave}
              textColor={colors.primary}
              loading={roleMutation.isPending}
            >
              Guardar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* ═══ Deactivation Confirmation Dialog ═══ */}
      <Portal>
        <Dialog
          visible={confirmUser !== null}
          onDismiss={() => setConfirmUser(null)}
        >
          <Dialog.Title>Confirmar desactivación</Dialog.Title>

          <Dialog.Content>
            {confirmUser !== null && (
              <>
                <Text className="text-base text-gray-700 dark:text-gray-300">
                  {isSelf(confirmUser)
                    ? 'No puedes desactivar tu propia cuenta.'
                    : `¿Estás seguro de desactivar a ${confirmUser.nombre}?\n\nEl usuario perderá acceso al sistema hasta que sea reactivado.`}
                </Text>

                {isSelf(confirmUser) && (
                  <View className="mt-3 rounded-lg bg-red-50 p-3 dark:bg-red-900/30">
                    <Text className="text-sm text-red-600 dark:text-red-400">
                      Para desactivar tu cuenta necesitarías que otro
                      administrador lo haga.
                    </Text>
                  </View>
                )}
              </>
            )}
          </Dialog.Content>

          <Dialog.Actions>
            <Button
              onPress={() => setConfirmUser(null)}
              textColor={colors.textSecondary}
            >
              Cancelar
            </Button>
            <Button
              onPress={confirmDeactivation}
              textColor={colors.error}
              disabled={confirmUser !== null ? isSelf(confirmUser) : true}
              loading={toggleMutation.isPending}
            >
              Desactivar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* ═══ Toast ═══ */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={hideToast}
      />
    </View>
  );
}
