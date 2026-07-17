/* globals setTimeout, clearTimeout -- RN timer functions not in ESLint env */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNetInfo } from '@react-native-community/netinfo';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import Toast from '@/components/Toast';
import ConfirmDeactivationDialog from '@/components/UserManagement/ConfirmDeactivationDialog';
import EmptyState from '@/components/UserManagement/EmptyState';
import FilterBar from '@/components/UserManagement/FilterBar';
import RoleDialog from '@/components/UserManagement/RoleDialog';
import UserCard from '@/components/UserManagement/UserCard';
import { colors } from '@/constants/colors';
import api from '@/services/api';
import { useAuth } from '@/store/AuthContext';
import type { AdminStackParamList, ApiResponse } from '@/types';
import type { AdminUser } from '@/types/userManagement';

type Props = NativeStackScreenProps<AdminStackParamList, 'UserManagement'>;

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
  } = useQuery<AdminUser[]>({
    queryKey: ['admin-users', debouncedSearch, roleFilter, statusFilter],
    enabled: netInfo.isConnected ?? true,
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
      setConfirmUser(null);
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

  const openRoleModal = useCallback((targetUser: AdminUser) => {
    setRoleModalUser(targetUser);
    setNewRole(targetUser.role);
  }, []);

  const closeRoleModal = useCallback(() => {
    setRoleModalUser(null);
    setNewRole('');
  }, []);

  const isSelf = useCallback(
    (targetUser: AdminUser): boolean =>
      currentUser?.id_usuario === targetUser.id_usuario,
    [currentUser?.id_usuario],
  );

  const handleRoleSave = useCallback(() => {
    if (!roleModalUser || !newRole) return;
    if (roleMutation.isPending) return;

    // Self role-change protection: admin cannot change own role
    if (isSelf(roleModalUser)) {
      closeRoleModal();
      showToast('No puedes cambiar tu propio rol.', 'info');

      return;
    }

    // Same role — no-op
    if (newRole === roleModalUser.role) {
      closeRoleModal();

      return;
    }

    roleMutation.mutate({ userId: roleModalUser.id_usuario, role: newRole });
  }, [roleModalUser, newRole, roleMutation, closeRoleModal, showToast, isSelf]);

  const handleTogglePress = useCallback(
    (targetUser: AdminUser) => {
      if (toggleMutation.isPending) return;

      // Deactivating → require confirmation
      if (targetUser.estado) {
        setConfirmUser(targetUser);
      } else {
        // Reactivating — go directly
        toggleMutation.mutate(targetUser.id_usuario);
      }
    },
    [toggleMutation],
  );

  const confirmDeactivation = useCallback(() => {
    if (confirmUser) {
      toggleMutation.mutate(confirmUser.id_usuario);
    }
  }, [confirmUser, toggleMutation]);

  // ── Key extractor ──
  const keyExtractor = useCallback(
    (item: AdminUser) => String(item.id_usuario),
    [],
  );

  // ── Render user card ──
  const renderUser = useCallback(
    ({ item }: { item: AdminUser }) => (
      <UserCard
        user={item}
        isSelf={isSelf(item)}
        onTogglePress={handleTogglePress}
        onRolePress={openRoleModal}
      />
    ),
    [handleTogglePress, isSelf, openRoleModal],
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
      <FilterBar
        roleFilter={roleFilter}
        statusFilter={statusFilter}
        onRoleFilterChange={setRoleFilter}
        onStatusFilterChange={setStatusFilter}
      />

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
          ListEmptyComponent={
            <EmptyState
              hasFilters={!!(debouncedSearch || roleFilter || statusFilter)}
            />
          }
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
      <RoleDialog
        user={roleModalUser}
        selectedRole={newRole}
        isPending={roleMutation.isPending}
        onRoleChange={setNewRole}
        onSave={handleRoleSave}
        onDismiss={closeRoleModal}
      />

      {/* ═══ Deactivation Confirmation ═══ */}
      <ConfirmDeactivationDialog
        user={confirmUser}
        isPending={toggleMutation.isPending}
        isSelf={confirmUser !== null ? isSelf(confirmUser) : false}
        onConfirm={confirmDeactivation}
        onDismiss={() => setConfirmUser(null)}
      />

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
