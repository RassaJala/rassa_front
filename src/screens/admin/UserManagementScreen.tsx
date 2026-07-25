/* globals console -- RN metro bundler provides console */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import DatePickerModal from '@/components/DatePickerModal';
import RegistrationFormFields from '@/components/RegistrationFormFields';
import Toast from '@/components/Toast';
import ConfirmDeactivationDialog from '@/components/UserManagement/ConfirmDeactivationDialog';
import EmptyState from '@/components/UserManagement/EmptyState';
import FilterBar from '@/components/UserManagement/FilterBar';
import RoleDialog from '@/components/UserManagement/RoleDialog';
import UserCard from '@/components/UserManagement/UserCard';
import { colors } from '@/constants/colors';
import { useRegistrationForm } from '@/hooks/useRegistrationForm';
import api from '@/services/api';
import { useAuth } from '@/store/AuthContext';
import { useTheme } from '@/store/ThemeContext';
import type { ApiResponse, RegisterRole } from '@/types';
import type { AdminUser } from '@/types/userManagement';
import { cleanPhoneNumber, validateRegistrationForm } from '@/utils/validation';

const TRANSPARENT = 'transparent';
const WHITE = '#FFFFFF';

const ROLE_OPTIONS: { value: RegisterRole; label: string }[] = [
  { value: 'buyer', label: 'Cliente' },
  { value: 'seller', label: 'Vendedor' },
  { value: 'farmer', label: 'Agricultor' },
];

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  farmer: 'Agricultor',
  seller: 'Vendedor',
  buyer: 'Cliente',
};

function getFullName(u: AdminUser): string {
  return [u.nombre, u.apellido_paterno, u.apellido_materno]
    .filter(Boolean)
    .join(' ');
}

// ── Multi-page fetch (like web) ──
const MAX_PAGES = 20;

async function fetchAllPages(
  url: string,
  accumulated: AdminUser[],
  depth: number = 0,
): Promise<AdminUser[]> {
  if (depth >= MAX_PAGES) {
    console.warn(
      `[UserManagement] max pages (${MAX_PAGES}) reached, stopping fetch`,
    );
    return accumulated;
  }
  const response = await api.get<unknown>(url);
  const body = response.data;
  const payload: unknown =
    body &&
    typeof body === 'object' &&
    'data' in (body as Record<string, unknown>)
      ? (body as Record<string, unknown>).data
      : body;

  const results: AdminUser[] =
    payload &&
    typeof payload === 'object' &&
    'results' in (payload as Record<string, unknown>)
      ? (payload as { results: AdminUser[] }).results
      : Array.isArray(payload)
        ? (payload as AdminUser[])
        : [];

  const all = [...accumulated, ...results];
  const next: string | null =
    payload && typeof payload === 'object'
      ? (((payload as Record<string, unknown>).next as string | null) ?? null)
      : null;

  if (next) return fetchAllPages(next, all, depth + 1);
  return all;
}

export default function UserManagementScreen(): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const bg = isDark ? colors.admBgD : colors.admBgL;
  const fg = isDark ? colors.admFgD : colors.admFgL;
  const muted = isDark ? colors.admMutedD : colors.admMutedL;
  const border = isDark ? colors.admBorderD : colors.admBorderL;
  const brand = isDark ? colors.admBrandD : colors.admBrandL;
  const inputBg = isDark ? colors.admSurfaceD : colors.admBgL;
  const surface = isDark ? colors.admSurfaceD : colors.admSurfaceL;
  const accentBg = isDark ? colors.admActiveBgD : colors.admActiveBgL;
  const coralBg = isDark ? colors.admCoralBgD : colors.admCoralBgL;

  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  // ── Tab state (Lista / Nuevo) ──
  const [tab, setTab] = useState<'list' | 'form'>('list');
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [formServerError, setFormServerError] = useState('');
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useRegistrationForm({ initialRole: 'buyer' });
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // ── Search & filter state ──
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // Reset page when filters change
  const filterKey = `${search}|${roleFilter}|${statusFilter}`;
  const prevKeyRef = useRef(filterKey);
  if (prevKeyRef.current !== filterKey) {
    prevKeyRef.current = filterKey;
    // Don't setState during render — use effect
  }

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, statusFilter]);

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

  // ── Users query (multi-page, like web) ──
  const {
    data: users = [],
    isLoading,
    isError,
    error: queryError,
    refetch,
    isRefetching,
  } = useQuery<AdminUser[]>({
    queryKey: ['admin-users'],
    queryFn: () => fetchAllPages('/admin/usuarios/', []),
  });

  const errorMessage =
    (queryError as { response?: { data?: { detail?: string } } })?.response
      ?.data?.detail ??
    (queryError as Error)?.message ??
    'Error al cargar usuarios';

  // ── Client-side filtering (like web) ──
  const filtered = useMemo(() => {
    return users.filter((u) => {
      const fullName = getFullName(u).toLowerCase();
      const email = u.email.toLowerCase();
      const q = search.toLowerCase();
      if (search && !fullName.includes(q) && !email.includes(q)) return false;

      if (roleFilter) {
        const roleLabel = ROLE_LABELS[u.role] ?? u.role;
        if (roleLabel !== roleFilter) return false;
      }

      if (statusFilter === 'true' && !u.estado) return false;
      if (statusFilter === 'false' && u.estado) return false;

      return true;
    });
  }, [users, search, roleFilter, statusFilter]);

  // ── Client-side pagination (like web) ──
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage],
  );

  // ── Toggle estado mutation ──
  const toggleMutation = useMutation({
    mutationFn: async (userId: number) => {
      const { data } = await api.patch<ApiResponse<AdminUser>>(
        `/admin/usuarios/${userId}/toggle-estado/`,
      );

      return data;
    },
    onSuccess: (_data, userId) => {
      const u = users.find((x) => x.id_usuario === userId);
      const name = u ? getFullName(u) : `#${userId}`;
      const newState = u ? !u.estado : false;
      const label = newState ? 'activado' : 'desactivado';
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setConfirmUser(null);
      showToast(`${name} fue ${label} correctamente`, 'success');
    },
    onError: (error: unknown) => {
      const detail =
        (error as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? 'Error al cambiar estado';

      showToast(detail, 'error');
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
    onSuccess: (_data, { userId, role }) => {
      const u = users.find((x) => x.id_usuario === userId);
      const name = u ? getFullName(u) : `#${userId}`;
      const oldRole = u ? (ROLE_LABELS[u.role] ?? u.role) : '?';
      const newRole = ROLE_LABELS[role] ?? role;
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      closeRoleModal();
      showToast(`${name} cambió de ${oldRole} a ${newRole}`, 'success');
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

  const switchToList = useCallback(() => {
    setTab('list');
    setFormErrorMessage(null);
    setFormServerError('');
    form.resetForm();
  }, [form]);

  const handleCreateUser = useCallback(async () => {
    if (isSubmitting) return;
    setFormErrorMessage(null);
    setFormServerError('');

    const validationError = validateRegistrationForm({
      email: form.email,
      password: form.password,
      telefono: form.telefono,
      nombre: form.nombre,
      apellidoPaterno: form.apellidoPaterno,
      fechaNacimiento: form.fechaNacimiento,
      domicilio: form.domicilio,
      localidadId: form.catalog.localidadId,
    });

    if (validationError) {
      setFormErrorMessage(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        email: form.email.trim(),
        password: form.password,
        telefono: cleanPhoneNumber(form.telefono),
        role: form.role,
        nombre: form.nombre.trim(),
        apellido_paterno: form.apellidoPaterno.trim(),
        apellido_materno: form.apellidoMaterno.trim() || null,
        fecha_nacimiento: form.fechaNacimiento,
        sexo: form.sexo,
        domicilio: form.domicilio.trim(),
        fk_localidad: form.catalog.localidadId as number,
      };

      const endpoint =
        form.role === 'farmer' ? '/auth/create-farmer/' : '/auth/register/';

      await api.post(endpoint, payload);

      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      showToast('Usuario creado correctamente', 'success');
      switchToList();
    } catch (error) {
      if (isMounted.current) {
        const detail =
          (error as { response?: { data?: { detail?: string } } })?.response
            ?.data?.detail ??
          (error as Error)?.message ??
          'Error al crear el usuario.';
        setFormServerError(detail);
      }
    } finally {
      if (isMounted.current) {
        setIsSubmitting(false);
      }
    }
  }, [form, isSubmitting, queryClient, showToast, switchToList]);

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

    if (isSelf(roleModalUser)) {
      closeRoleModal();
      showToast('No puedes cambiar tu propio rol.', 'info');
      return;
    }

    if (newRole === roleModalUser.role) {
      closeRoleModal();
      return;
    }

    roleMutation.mutate({ userId: roleModalUser.id_usuario, role: newRole });
  }, [roleModalUser, newRole, roleMutation, closeRoleModal, showToast, isSelf]);

  const handleTogglePress = useCallback(
    (targetUser: AdminUser) => {
      if (toggleMutation.isPending) return;

      if (isSelf(targetUser)) {
        showToast('No puedes desactivar tu propia cuenta.', 'info');
        return;
      }

      if (targetUser.estado) {
        setConfirmUser(targetUser);
      } else {
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

  // ── Paginator ──
  const renderPaginator = useCallback(() => {
    if (totalPages <= 1) return null;

    const pages: number[] = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }

    return (
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 6,
          paddingVertical: 20,
        }}
      >
        {/* Prev */}
        <Pressable
          onPress={() => setPage((p) => Math.max(1, p - 1))}
          disabled={safePage <= 1}
          style={{
            height: 36,
            paddingHorizontal: 12,
            borderRadius: 8,
            borderWidth: 1.5,
            borderColor: border,
            justifyContent: 'center',
            alignItems: 'center',
            opacity: safePage <= 1 ? 0.4 : 1,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: '600',
              color: safePage <= 1 ? muted : fg,
            }}
          >
            ← Anterior
          </Text>
        </Pressable>

        {/* Page numbers */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 4 }}
        >
          {pages.map((p) => (
            <Pressable
              key={p}
              onPress={() => setPage(p)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: p === safePage ? brand : TRANSPARENT,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: p === safePage ? '700' : '500',
                  color: p === safePage ? WHITE : fg,
                }}
              >
                {p}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Next */}
        <Pressable
          onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={safePage >= totalPages}
          style={{
            height: 36,
            paddingHorizontal: 12,
            borderRadius: 8,
            borderWidth: 1.5,
            borderColor: border,
            justifyContent: 'center',
            alignItems: 'center',
            opacity: safePage >= totalPages ? 0.4 : 1,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: '600',
              color: safePage >= totalPages ? muted : fg,
            }}
          >
            Siguiente →
          </Text>
        </Pressable>
      </View>
    );
  }, [totalPages, safePage, border, fg, muted, brand]);

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
            marginBottom: 8,
            textAlign: 'center',
            fontSize: 15,
            color: muted,
          }}
        >
          {errorMessage}
        </Text>
        <Pressable
          onPress={() => void refetch()}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            marginTop: 8,
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: border,
          }}
        >
          <MaterialCommunityIcons name="refresh" size={18} color={brand} />
          <Text style={{ fontSize: 14, fontWeight: '600', color: brand }}>
            Reintentar
          </Text>
        </Pressable>
      </View>
    );
  }

  // ── Main render ──
  const isFormActive = tab === 'form';

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {/* ═══ Header ═══ */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingTop: 60,
          paddingBottom: 4,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text
            style={{
              fontSize: 28,
              fontWeight: '700',
              letterSpacing: -0.02,
              color: fg,
            }}
          >
            Gestión de usuarios
          </Text>
        </View>
      </View>

      {/* ═══ Segmented tab bar ═══ */}
      <View
        style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 }}
      >
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: isDark ? colors.admSegBgD : colors.admSegBgL,
            borderRadius: 10,
            padding: 3,
          }}
        >
          <TouchableOpacity
            onPress={() => {
              if (!isFormActive) return;
              switchToList();
            }}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: isFormActive ? TRANSPARENT : surface,
              alignItems: 'center',
            }}
            activeOpacity={0.7}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: isFormActive ? muted : fg,
                letterSpacing: 0.01,
              }}
            >
              Lista
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              if (isFormActive) return;
              setTab('form');
              setFormErrorMessage(null);
              setFormServerError('');
            }}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: isFormActive ? surface : TRANSPARENT,
              alignItems: 'center',
            }}
            activeOpacity={0.7}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: isFormActive ? fg : muted,
                letterSpacing: 0.01,
              }}
            >
              Nuevo
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ═══ Content ═══ */}
      {!isFormActive ? (
        /* ── List tab ── */
        isLoading ? (
          <View style={{ flex: 1, alignItems: 'center', paddingTop: 60 }}>
            <ActivityIndicator size="large" color={brand} />
          </View>
        ) : (
          <FlatList
            data={paginated}
            renderItem={renderUser}
            keyExtractor={keyExtractor}
            ListHeaderComponent={
              <View style={{ paddingHorizontal: 20, paddingTop: 4, gap: 12 }}>
                {/* Search + Filters card */}
                <View
                  style={{
                    backgroundColor: surface,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: border,
                    padding: 16,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: inputBg,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: border,
                      paddingHorizontal: 14,
                      height: 44,
                      marginBottom: 14,
                    }}
                  >
                    <MaterialCommunityIcons
                      name="magnify"
                      size={20}
                      color={muted}
                    />
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

                  <FilterBar
                    roleFilter={roleFilter}
                    statusFilter={statusFilter}
                    onRoleFilterChange={setRoleFilter}
                    onStatusFilterChange={setStatusFilter}
                  />
                </View>

                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: fg,
                    paddingBottom: 4,
                  }}
                >
                  {filtered.length} usuarios
                </Text>
              </View>
            }
            ListEmptyComponent={
              <EmptyState
                hasFilters={!!(search || roleFilter || statusFilter)}
              />
            }
            ListFooterComponent={renderPaginator}
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
        )
      ) : (
        /* ── Form tab (Nuevo) ── */
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{ padding: 20, gap: 18 }}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={{ fontSize: 18, fontWeight: '700', color: fg }}>
              Nuevo usuario
            </Text>

            {formErrorMessage || formServerError ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 8,
                  backgroundColor: coralBg,
                  borderRadius: 12,
                  padding: 12,
                }}
              >
                <MaterialCommunityIcons
                  name="alert-circle"
                  size={18}
                  color={colors.brandRedCoral}
                />
                <Text
                  style={{
                    flex: 1,
                    fontSize: 14,
                    lineHeight: 20,
                    color: colors.brandRedCoral,
                  }}
                >
                  {formServerError || formErrorMessage}
                </Text>
              </View>
            ) : null}

            {/* Role selector */}
            <View style={{ gap: 6 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  letterSpacing: 0.08,
                  textTransform: 'uppercase',
                  color: muted,
                }}
              >
                Rol
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {ROLE_OPTIONS.map((opt) => {
                  const isActive = form.role === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      activeOpacity={0.7}
                      onPress={() => form.setRole(opt.value)}
                      disabled={isSubmitting}
                      style={{
                        flex: 1,
                        height: 46,
                        borderRadius: 12,
                        borderWidth: 1.5,
                        borderColor: isActive ? brand : border,
                        backgroundColor: isActive ? accentBg : surface,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '600',
                          color: isActive ? brand : muted,
                        }}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <RegistrationFormFields
              form={form}
              t={{
                surface,
                fg,
                muted,
                border,
                brand,
                accentBg,
                segBg: isDark ? colors.admSegBgD : colors.admSegBgL,
                errorBg: isDark ? colors.admErrorBgD : colors.admErrorBgL,
                errorBorder: isDark
                  ? colors.admErrorBorderD
                  : colors.admErrorBorderL,
                errorText: isDark ? colors.admErrorTextD : colors.admErrorTextL,
                errorAction: isDark
                  ? colors.admErrorActionD
                  : colors.admErrorActionL,
              }}
              setErrorMessage={setFormErrorMessage}
              onOpenDatePicker={() => setIsDatePickerVisible(true)}
              disabled={isSubmitting}
            />
          </ScrollView>

          <View
            style={{
              padding: 20,
              gap: 10,
              borderTopWidth: 1,
              borderTopColor: border,
            }}
          >
            <TouchableOpacity
              onPress={() => void handleCreateUser()}
              disabled={isSubmitting}
              activeOpacity={0.8}
              style={{
                height: 50,
                borderRadius: 14,
                backgroundColor: colors.brandRedCoral,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 6,
                opacity: isSubmitting ? 0.6 : 1,
              }}
            >
              {isSubmitting ? (
                <ActivityIndicator size={16} color={colors.iconWhite} />
              ) : null}
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: colors.iconWhite,
                }}
              >
                Guardar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={switchToList}
              disabled={isSubmitting}
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
        </KeyboardAvoidingView>
      )}

      {/* ═══ Date Picker ═══ */}
      <DatePickerModal
        visible={isDatePickerVisible}
        onClose={() => setIsDatePickerVisible(false)}
        onSelectDate={form.setFechaNacimiento}
        initialDate={form.fechaNacimiento}
      />

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
