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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import Toast from '@/components/Toast';
import ConfirmDeactivationDialog from '@/components/UserManagement/ConfirmDeactivationDialog';
import EmptyState from '@/components/UserManagement/EmptyState';
import FilterBar from '@/components/UserManagement/FilterBar';
import RoleDialog from '@/components/UserManagement/RoleDialog';
import UserCard from '@/components/UserManagement/UserCard';
import api from '@/services/api';
import { useAuth } from '@/store/AuthContext';
import { useTheme } from '@/store/ThemeContext';
import type { ApiResponse } from '@/types';
import type { AdminUser } from '@/types/userManagement';

export default function UserManagementScreen(): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const bg = isDark ? '#1A211B' : '#F5F7F0';
  const fg = isDark ? '#E8EAE4' : '#2D3328';
  const muted = isDark ? '#9DA89D' : '#5E6B5E';
  const border = isDark ? '#353D35' : '#E2E6DF';
  const brand = isDark ? '#4A8A63' : '#24563C';
  const inputBg = isDark ? '#263028' : '#F5F7F0';

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
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
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

      // Self-deactivation protection
      if (isSelf(targetUser)) {
        showToast('No puedes desactivar tu propia cuenta.', 'info');
        return;
      }

      // Deactivating → require confirmation
      if (targetUser.estado) {
        setConfirmUser(targetUser);
      } else {
        // Reactivating — go directly
        toggleMutation.mutate(targetUser.id_usuario);
      }
    },
    [toggleMutation, isSelf, showToast],
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
      <View
        style={{
          flex: 1,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
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
            marginTop: 12,
            textAlign: 'center',
            fontSize: 15,
            color: muted,
          }}
        >
          {!netInfo.isConnected
            ? 'Sin conexión a Internet. Verifica tu conexión.'
            : 'Error al cargar usuarios.'}
        </Text>
      </View>
    );
  }

  // ── Main render ──
  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {/* ═══ Header ═══ */}
      <View
        style={{
          paddingTop: 60,
          paddingHorizontal: 20,
          paddingBottom: 4,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text
            style={{
              fontSize: 28,
              fontWeight: '700',
              letterSpacing: -0.02,
              color: fg,
            }}
          >
            Usuarios
          </Text>
        </View>
      </View>

      {/* ═══ Search bar ═══ */}
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: inputBg,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: border,
            paddingHorizontal: 14,
            height: 46,
          }}
        >
          <MaterialCommunityIcons name="magnify" size={20} color={muted} />
          <TextInput
            style={{
              flex: 1,
              marginLeft: 8,
              fontSize: 15,
              color: fg,
              paddingVertical: 0,
            }}
            placeholder="Buscar por nombre o correo..."
            placeholderTextColor={muted}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <Pressable
              onPress={() => setSearch('')}
              style={{ padding: 4 }}
              hitSlop={6}
            >
              <MaterialCommunityIcons
                name="close-circle"
                size={18}
                color={muted}
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
        <View style={{ flex: 1, alignItems: 'center', paddingTop: 60 }}>
          <ActivityIndicator size="large" color={brand} />
        </View>
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
            padding: 20,
            paddingBottom: 40,
            flexGrow: 1,
            gap: 10,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
              tintColor={brand}
              colors={[brand]}
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
