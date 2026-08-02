import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../providers/ThemeProvider';
import { getColors } from '../constants/colors';
import api from '../services/api';
import { parseApiError } from '~/utils/apiErrors';
import { Toast } from '../components/ui/Toast';
import type { ToastState } from '../components/ui/Toast';

import {
  User,
  UserRole,
  roleLabels,
  getFullName,
} from '../components/admin-users/types';
import NuevoUsuarioForm from '../components/admin-users/NuevoUsuarioForm';
import UserFilters from '../components/admin-users/UserFilters';
import UserTable from '../components/admin-users/UserTable';
import RoleChangeModal from '../components/admin-users/RoleChangeModal';
import DeactivationModal from '../components/admin-users/DeactivationModal';

const MAX_PAGES = 20;

function mapUser(raw: Record<string, unknown>): User {
  return {
    id: raw.id_usuario as number,
    nombre: raw.nombre as string,
    apellido_paterno: (raw.apellido_paterno as string) ?? '',
    apellido_materno: (raw.apellido_materno as string | null) ?? null,
    email: raw.email as string,
    role: raw.role as UserRole,
    estado: raw.estado as boolean,
    creado_en: raw.creado_en as string,
  };
}

async function fetchAllPages(
  url: string,
  accumulated: User[],
  depth: number = 0,
): Promise<User[]> {
  if (depth >= MAX_PAGES) {
    console.warn(
      `[AdminUsers] max pages (${MAX_PAGES}) reached, stopping fetch`,
    );
    return accumulated;
  }
  try {
    const response = await api.get<unknown>(url);
    const body = response.data;
    const payload =
      body &&
      typeof body === 'object' &&
      'data' in (body as Record<string, unknown>)
        ? (body as Record<string, unknown>).data
        : body;

    const results: Record<string, unknown>[] =
      payload &&
      typeof payload === 'object' &&
      'results' in (payload as Record<string, unknown>)
        ? (payload as { results: Record<string, unknown>[] }).results
        : Array.isArray(payload)
          ? (payload as Record<string, unknown>[])
          : [];

    const page = results.map(mapUser);
    const all = [...accumulated, ...page];
    const next =
      payload && typeof payload === 'object'
        ? ((payload as Record<string, unknown>).next as string | null)
        : null;

    if (next) return fetchAllPages(next, all, depth + 1);
    return all;
  } catch (error) {
    console.warn(`[AdminUsers] error fetching page at depth ${depth}:`, error);
    if (accumulated.length > 0) {
      return accumulated;
    }
    throw error;
  }
}

async function fetchUsers(): Promise<User[]> {
  return fetchAllPages('/admin/usuarios/', []);
}

async function fetchCurrentUser(): Promise<User> {
  const response = await api.get<{ data: Record<string, unknown> }>(
    '/auth/me/',
  );
  const raw = response.data.data;
  return {
    id: raw.id_usuario as number,
    nombre: raw.nombre as string,
    apellido_paterno: (raw.apellido_paterno as string) ?? '',
    apellido_materno: (raw.apellido_materno as string | null) ?? null,
    email: raw.email as string,
    role: raw.role as UserRole,
    estado: raw.estado as boolean,
    creado_en: raw.creado_en as string,
  };
}

// ── Page ─────────────────────────────────────────────────

export function AdminUsers() {
  const { resolved } = useTheme();
  const isDark = resolved === 'dark';
  const fg = isDark ? '#E8EAE4' : '#2D3328';
  const muted = isDark ? '#9DA89D' : '#5E6B5E';
  const border = isDark ? '#2A332A' : '#D6DAD4';
  const surface = isDark ? '#263028' : '#FFFFFF';
  const bg = isDark ? '#1A211B' : '#F5F7F0';
  const brand = isDark ? '#4A8A63' : '#24563C';
  const coral = getColors(isDark).coral;
  const queryClient = useQueryClient();

  // ── Queries ──
  const {
    data: users = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<User[]>({
    queryKey: ['admin-users'],
    queryFn: fetchUsers,
  });
  const { data: currentUser } = useQuery<User>({
    queryKey: ['current-user'],
    queryFn: fetchCurrentUser,
    retry: false,
  });
  const currentUserId = currentUser?.id;

  // ── Toast ──
  const [toast, setToast] = useState<ToastState | null>(null);

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type });
  }

  // ── Mutations ──
  const [errorMessage, setErrorMessage] = useState('');

  const toggleMutation = useMutation({
    mutationFn: (userId: number) =>
      api.patch(`/admin/usuarios/${userId}/toggle-estado/`),
    onSuccess: (_data, userId) => {
      setDeactTarget(null);
      const u = users.find((x) => x.id === userId);
      const name = u ? getFullName(u) : `#${userId}`;
      const newState = u ? !u.estado : 'desconocido';
      const label = newState ? 'activado' : 'desactivado';
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      showToast(`${name} fue ${label} correctamente`, 'success');
      setErrorMessage('');
    },
    onError: (err: unknown) => {
      const detail = parseApiError(err, 'Error al cambiar estado.');
      showToast(detail, 'error');
      setErrorMessage(detail);
    },
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: UserRole }) =>
      api.patch(`/admin/usuarios/${userId}/`, { role }),
    onSuccess: (_data, { userId, role }) => {
      const u = users.find((x) => x.id === userId);
      const name = u ? getFullName(u) : `#${userId}`;
      const oldRole = u ? roleLabels[u.role] : '?';
      const newRole = roleLabels[role];
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      showToast(`${name} cambió de ${oldRole} a ${newRole}`, 'success');
      setErrorMessage('');
    },
    onError: (err: unknown) => {
      const detail = parseApiError(err, 'Error al cambiar rol.');
      showToast(detail, 'error');
      setErrorMessage(detail);
    },
  });

  const PAGE_SIZE = 10;

  // ── State ──
  const [tab, setTab] = useState<'lista' | 'nuevo'>('lista');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  // Role change modal
  const [roleTarget, setRoleTarget] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole | ''>('');

  // Deactivation confirm
  const [deactTarget, setDeactTarget] = useState<User | null>(null);

  // ── Reset page when filters change ──
  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, statusFilter]);

  // ── Filtered + paginated list ──
  const filtered = useMemo(() => {
    return users.filter((u) => {
      const fullName = getFullName(u).toLowerCase();
      const email = u.email.toLowerCase();
      const q = search.toLowerCase();
      if (search && !fullName.includes(q) && !email.includes(q)) return false;

      if (roleFilter) {
        const roleLabel = roleLabels[u.role];
        if (roleLabel !== roleFilter) return false;
      }

      if (statusFilter === 'true' && !u.estado) return false;
      if (statusFilter === 'false' && u.estado) return false;

      return true;
    });
  }, [users, search, roleFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  // ── Handlers ──

  function toggleStatus(user: User) {
    if (user.id === currentUserId) {
      showToast('No puedes desactivar tu propia cuenta.', 'error');
      return;
    }
    setErrorMessage('');
    if (user.estado) {
      setDeactTarget(user);
    } else {
      toggleMutation.mutate(user.id);
    }
  }

  function confirmDeactivation() {
    if (!deactTarget) return;
    setErrorMessage('');
    toggleMutation.mutate(deactTarget.id);
  }

  function openRoleModal(user: User) {
    setRoleTarget(user);
    setSelectedRole(user.role);
  }

  function saveRole() {
    if (!roleTarget || !selectedRole) return;
    if (roleTarget.id === currentUserId) {
      showToast('No puedes cambiar tu propio rol.', 'error');
      closeRoleModal();
      return;
    }
    if (selectedRole === roleTarget.role) {
      closeRoleModal();
      return;
    }
    setErrorMessage('');
    roleMutation.mutate({
      userId: roleTarget.id,
      role: selectedRole as UserRole,
    });
    closeRoleModal();
  }

  function closeRoleModal() {
    setRoleTarget(null);
    setSelectedRole('');
  }

  // ── Loading / Error ──
  if (isLoading) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: muted }}>
        Cargando usuarios…
      </div>
    );
  }

  if (isError) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <p style={{ color: muted, marginBottom: 12 }}>
          Error al cargar usuarios.
        </p>
        <button
          onClick={() => refetch()}
          style={{
            padding: '10px 20px',
            borderRadius: 8,
            border: 'none',
            background: brand,
            color: '#fff',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div>
      <Toast toast={toast} onDone={() => setToast(null)} />

      {/* ═══ Header ═══ */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <h2
          style={{
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: '-0.01em',
            color: fg,
          }}
        >
          Gestión de usuarios
        </h2>
      </div>

      {/* ═══ Tab bar ═══ */}
      <div
        style={{
          display: 'flex',
          gap: 2,
          background: border,
          borderRadius: 12,
          padding: 3,
          marginBottom: 20,
          width: 'fit-content',
        }}
      >
        {(['lista', 'nuevo'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '8px 20px',
              borderRadius: 10,
              border: 'none',
              background: tab === t ? surface : 'transparent',
              color: tab === t ? fg : muted,
              fontSize: 14,
              fontWeight: 600,
              fontFamily: 'inherit',
              cursor: 'pointer',
              boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            {t === 'lista' ? '📋 Lista de usuarios' : '➕ Nuevo usuario'}
          </button>
        ))}
      </div>

      {/* ═══ Lista tab ═══ */}
      {tab === 'lista' && (
        <>
          <UserFilters
            search={search}
            onSearchChange={setSearch}
            roleFilter={roleFilter}
            onRoleFilterChange={setRoleFilter}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            theme={{ fg, muted, border, surface, bg, brand }}
            isDark={isDark}
          />

          {/* ═══ Error message ═══ */}
          {errorMessage && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 10,
                background: isDark ? 'rgba(222,57,58,0.12)' : '#FEF2F2',
                border: `1px solid ${isDark ? 'rgba(222,57,58,0.3)' : '#FECACA'}`,
                color: coral,
                fontSize: 13,
                fontWeight: 500,
                marginBottom: 16,
              }}
            >
              {errorMessage}
            </div>
          )}

          <UserTable
            users={users}
            filteredCount={filtered.length}
            paginatedUsers={paginated}
            currentUserId={currentUserId}
            isTogglePending={toggleMutation.isPending}
            isRolePending={roleMutation.isPending}
            onToggleStatus={toggleStatus}
            onOpenRoleModal={openRoleModal}
            theme={{ fg, muted, border, surface, bg, brand }}
            isDark={isDark}
            totalPages={totalPages}
            currentPage={safePage}
            onPageChange={setPage}
          />
        </>
      )}

      {/* ═══ Nuevo tab ═══ */}
      {tab === 'nuevo' && (
        <NuevoUsuarioForm
          colors={{ fg, muted, border, bg, brand, coral, surface }}
          isDark={isDark}
          onCreated={() => setTab('lista')}
          showToast={showToast}
        />
      )}

      {/* ═══ Role Change Modal ═══ */}
      {roleTarget && (
        <RoleChangeModal
          user={roleTarget}
          selectedRole={selectedRole}
          onRoleChange={setSelectedRole}
          onSave={saveRole}
          onClose={closeRoleModal}
          theme={{ fg, muted, border, surface, brand }}
        />
      )}

      {/* ═══ Deactivation confirmation ═══ */}
      {deactTarget && (
        <DeactivationModal
          user={deactTarget}
          onConfirm={confirmDeactivation}
          onClose={() => setDeactTarget(null)}
          theme={{ fg, muted, border, surface, coral }}
        />
      )}
    </div>
  );
}
