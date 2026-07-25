/* globals console */
import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../providers/ThemeProvider';
import { useCatalogs } from '../hooks/useCatalogs';
import api from '../services/api';
import { Toast } from '../components/ui/Toast';
import type { ToastState } from '../components/ui/Toast';
import WebDatePickerModal from '../components/WebDatePickerModal';

// ── Types ────────────────────────────────────────────────

type UserRole = 'admin' | 'farmer' | 'seller' | 'buyer';

interface User {
  id: number;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string | null;
  email: string;
  role: UserRole;
  estado: boolean;
  creado_en: string;
}

const roleLabels: Record<UserRole, string> = {
  admin: 'Admin',
  farmer: 'Agricultor',
  seller: 'Vendedor',
  buyer: 'Cliente',
};

const roleColors: Record<UserRole, string> = {
  admin: '#DE393A',
  farmer: '#16a34a',
  seller: '#f59e0b',
  buyer: '#3b82f6',
};

const ROLE_FILTERS = [
  { label: 'Todos', value: '' },
  { label: 'Admin', value: 'Admin' },
  { label: 'Agricultor', value: 'Agricultor' },
  { label: 'Vendedor', value: 'Vendedor' },
  { label: 'Cliente', value: 'Cliente' },
] as const;

const STATUS_FILTERS = [
  { label: 'Todos', value: '' },
  { label: 'Activos', value: 'true' },
  { label: 'Inactivos', value: 'false' },
] as const;

const ROLE_OPTIONS: { label: string; value: UserRole; color: string }[] = [
  { label: 'Agricultor', value: 'farmer', color: '#16a34a' },
  { label: 'Vendedor', value: 'seller', color: '#f59e0b' },
  { label: 'Cliente', value: 'buyer', color: '#3b82f6' },
];

function getFullName(u: User): string {
  return [u.nombre, u.apellido_paterno, u.apellido_materno]
    .filter(Boolean)
    .join(' ');
}

// ponytail: single fetch wrapper, no service layer for now
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

const MAX_PAGES = 20;

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

// ── Role Pill ────────────────────────────────────────────

function RolePill({ role }: { role: UserRole }) {
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 600,
        padding: '3px 10px',
        borderRadius: 999,
        background: `${roleColors[role]}1A`,
        color: roleColors[role],
      }}
    >
      {roleLabels[role]}
    </span>
  );
}

// ── Status badge ─────────────────────────────────────────

function StatusBadge({
  active,
  brand,
  isDark,
}: {
  active: boolean;
  brand: string;
  isDark: boolean;
}) {
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 600,
        padding: '3px 10px',
        borderRadius: 6,
        background: active
          ? isDark
            ? 'rgba(74,138,99,0.15)'
            : 'rgba(36,86,60,0.07)'
          : isDark
            ? 'rgba(212,160,32,0.12)'
            : 'rgba(242,169,0,0.1)',
        color: active ? brand : '#F2A900',
      }}
    >
      {active ? 'Activo' : 'Inactivo'}
    </span>
  );
}

// ── Nuevo usuario form (lazy catalogs) ───────────────────

interface NuevoUsuarioFormProps {
  readonly fg: string;
  readonly muted: string;
  readonly border: string;
  readonly bg: string;
  readonly brand: string;
  readonly coral: string;
  readonly surface: string;
  readonly isDark: boolean;
  readonly onCreated: () => void;
  readonly showToast: (message: string, type: 'success' | 'error') => void;
}

function NuevoUsuarioForm({
  fg, muted, border, bg, brand, coral, surface, isDark, onCreated, showToast,
}: NuevoUsuarioFormProps) {
  const queryClient = useQueryClient();
  const catalogs = useCatalogs();
  const [formNombre, setFormNombre] = useState('');
  const [formApePat, setFormApePat] = useState('');
  const [formApeMat, setFormApeMat] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formTelefono, setFormTelefono] = useState('');
  const [formFechaNac, setFormFechaNac] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [formSexo, setFormSexo] = useState<'M' | 'F' | 'O'>('M');
  const [formDomicilio, setFormDomicilio] = useState('');
  const [formRole, setFormRole] = useState<'farmer' | 'seller' | 'buyer'>('buyer');
  const [formError, setFormError] = useState<string | null>(null);
  const [formFocused, setFormFocused] = useState<string | null>(null);

  function cleanName(v: string): string {
    return v.replace(/[^\sA-Za-zÁÉÍÑÓÚÜáéíñóúü]/g, '');
  }
  function cleanPhoneNumber(v: string): string {
    const digits = v.replace(/\D/g, '');
    return v.trim().startsWith('+') ? digits.slice(0, 12) : digits.slice(0, 10);
  }
  function cleanAddress(v: string): string {
    return v.replace(/[^\s#,\-./0-9A-Za-zÁÉÍÑÓÚÜáéíñóúü]/g, '');
  }
  function isAdult(dateStr: string): boolean {
    if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(dateStr)) return false;
    const [y, m, d] = dateStr.split('-').map(Number);
    const today = new Date();
    let age = today.getFullYear() - y;
    if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age--;
    return age >= 18;
  }

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api.post(formRole === 'farmer' ? '/auth/create-farmer/' : '/auth/register/', payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      showToast('Usuario creado correctamente', 'success');
      onCreated();
    },
    onError: (err: unknown) => {
      const respData = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
      let msg = (err as Error)?.message ?? 'Error al crear el usuario.';
      if (respData?.detail && typeof respData.detail === 'string') {
        msg = respData.detail;
      } else if (respData && typeof respData === 'object') {
        const fieldErrors: string[] = [];
        for (const [key, val] of Object.entries(respData)) {
          if (key === 'non_field_errors') {
            const arr = Array.isArray(val) ? val : [val];
            fieldErrors.push(...arr.map(String));
          } else if (Array.isArray(val)) {
            fieldErrors.push(`${key}: ${val.map(String).join(', ')}`);
          }
        }
        if (fieldErrors.length > 0) msg = fieldErrors.join('\n');
      }
      setFormError(msg);
    },
  });

  function handleCreateUser() {
    setFormError(null);

    if (!formEmail.trim()) return setFormError('El email es obligatorio.');
    if (!/^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/.test(formEmail.trim()))
      return setFormError('Ingresa un correo electrónico válido.');
    if (!formPassword) return setFormError('La contraseña es obligatoria.');
    if (formPassword.length < 6) return setFormError('La contraseña debe tener al menos 6 caracteres.');
    if (!formTelefono.trim()) return setFormError('El teléfono es obligatorio.');
    const cleanedPhone = cleanPhoneNumber(formTelefono);
    if (cleanedPhone.length !== 10 && cleanedPhone.length !== 12)
      return setFormError('El teléfono debe tener 10 dígitos (nacional) o 12 dígitos (internacional).');
    if (!formNombre.trim()) return setFormError('El nombre es obligatorio.');
    if (!formApePat.trim()) return setFormError('El apellido paterno es obligatorio.');
    if (!formFechaNac.trim()) return setFormError('La fecha de nacimiento es obligatoria.');
    if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(formFechaNac))
      return setFormError('La fecha de nacimiento debe tener el formato AAAA-MM-DD.');
    if (!isAdult(formFechaNac)) return setFormError('Debes ser mayor de 18 años para registrarte.');
    if (!formDomicilio.trim()) return setFormError('La dirección es obligatoria.');
    if (!formSexo) return setFormError('Seleccioná un género.');
    if (catalogs.localidadId === null) return setFormError('Seleccioná una localidad.');

    const basePayload: Record<string, unknown> = {
      email: formEmail.trim(),
      password: formPassword,
      nombre: cleanName(formNombre),
      apellido_paterno: cleanName(formApePat),
      apellido_materno: formApeMat.trim() ? cleanName(formApeMat) : null,
      telefono: cleanPhoneNumber(formTelefono),
      fecha_nacimiento: formFechaNac,
      sexo: formSexo,
      domicilio: cleanAddress(formDomicilio),
      fk_localidad: catalogs.localidadId,
    };
    if (formRole !== 'farmer') basePayload.role = formRole;
    createMutation.mutate(basePayload);
  }

  const formLabel: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: muted,
  };
  function formInputStyle(field: string): React.CSSProperties {
    return {
      width: '100%', height: 38, border: `1.5px solid ${formFocused === field ? brand : border}`,
      borderRadius: 8, padding: '0 12px', fontSize: 14, fontFamily: 'inherit',
      background: bg, color: fg, outline: 'none', boxSizing: 'border-box',
    };
  }

  return (
    <div style={{ background: surface, borderRadius: 16, border: `1px solid ${border}`, padding: 20 }}>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: fg, marginBottom: 16 }}>Nuevo usuario</h3>

      {formError && (
        <div style={{
          padding: '10px 14px', borderRadius: 10,
          background: isDark ? 'rgba(222,57,58,0.12)' : '#FEF2F2',
          border: `1px solid ${isDark ? 'rgba(222,57,58,0.3)' : '#FECACA'}`,
          color: coral, fontSize: 13, fontWeight: 500, marginBottom: 16,
        }}>
          {formError}
        </div>
      )}

      {/* Role selector */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ ...formLabel, marginBottom: 6, display: 'block' }}>Rol</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['farmer', 'seller', 'buyer'] as const).map((r) => {
            const labels = { farmer: 'Agricultor', seller: 'Vendedor', buyer: 'Cliente' };
            const colors = { farmer: '#16a34a', seller: '#f59e0b', buyer: '#3b82f6' };
            const active = formRole === r;
            return (
              <button key={r} type="button" onClick={() => setFormRole(r)} style={{
                flex: 1, height: 38, borderRadius: 8, border: `1.5px solid ${active ? colors[r] : border}`,
                background: active ? `${colors[r]}12` : 'transparent', color: active ? colors[r] : muted,
                fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
              }}>
                {labels[r]}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <label style={formLabel}>Nombre *</label>
          <input type="text" placeholder="Juan" value={formNombre} onChange={(e) => setFormNombre(e.target.value)}
            style={formInputStyle('nombre')} onFocus={() => setFormFocused('nombre')} onBlur={() => setFormFocused(null)} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <label style={formLabel}>Apellido Paterno *</label>
          <input type="text" placeholder="Pérez" value={formApePat} onChange={(e) => setFormApePat(e.target.value)}
            style={formInputStyle('apePat')} onFocus={() => setFormFocused('apePat')} onBlur={() => setFormFocused(null)} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <label style={formLabel}>Apellido Materno</label>
          <input type="text" placeholder="Opcional" value={formApeMat} onChange={(e) => setFormApeMat(e.target.value)}
            style={formInputStyle('apeMat')} onFocus={() => setFormFocused('apeMat')} onBlur={() => setFormFocused(null)} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <label style={formLabel}>Correo electrónico *</label>
          <input type="email" placeholder="tu@correo.com" value={formEmail} onChange={(e) => setFormEmail(e.target.value)}
            style={formInputStyle('email')} onFocus={() => setFormFocused('email')} onBlur={() => setFormFocused(null)} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <label style={formLabel}>Contraseña *</label>
          <div style={{ position: 'relative' }}>
            <input type={showPassword ? 'text' : 'password'} placeholder="Mínimo 6 caracteres" value={formPassword}
              onChange={(e) => setFormPassword(e.target.value)} style={{ ...formInputStyle('password'), paddingRight: 36 }}
              onFocus={() => setFormFocused('password')} onBlur={() => setFormFocused(null)} />
            <button type="button" onClick={() => setShowPassword((v) => !v)} style={{
              position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 4, color: muted,
            }} title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
              {showPassword ? '🙈' : '👁'}
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <label style={formLabel}>Teléfono *</label>
          <input type="tel" placeholder="10 dígitos" value={formTelefono} onChange={(e) => setFormTelefono(e.target.value)}
            style={formInputStyle('telefono')} onFocus={() => setFormFocused('telefono')} onBlur={() => setFormFocused(null)} />
          <span style={{ fontSize: 10, color: muted, lineHeight: '1.2' }}>
            Para números extranjeros inicia con + (ej. +1...)
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <label style={formLabel}>Fecha de nacimiento *</label>
          <button type="button" onClick={() => setShowDatePicker(true)} style={{
            ...formInputStyle('fechaNac'), textAlign: 'left', cursor: 'pointer', color: formFechaNac ? fg : muted,
          }}>
            {formFechaNac || 'AAAA-MM-DD'}
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <label style={formLabel}>Género *</label>
          <select value={formSexo} onChange={(e) => { const v = e.target.value; if (v === 'M' || v === 'F' || v === 'O') setFormSexo(v); }}
            style={formInputStyle('sexo')}>
            <option value="" disabled>Seleccionar</option>
            <option value="M">Masculino</option>
            <option value="F">Femenino</option>
            <option value="O">Otro</option>
          </select>
        </div>
      </div>

      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <label style={formLabel}>Dirección *</label>
        <input type="text" placeholder="Calle, número, colonia" value={formDomicilio}
          onChange={(e) => setFormDomicilio(e.target.value)}
          style={formInputStyle('domicilio')} onFocus={() => setFormFocused('domicilio')} onBlur={() => setFormFocused(null)} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <label style={formLabel}>Municipio *</label>
          <select value={catalogs.selectedMunicipioId ?? ''}
            onChange={(e) => { const id = e.target.value ? Number(e.target.value) : null; if (id) catalogs.handleSelectMunicipio(id); }}
            style={formInputStyle('municipio')}>
            <option value="">{catalogs.isLoadingMunicipios ? 'Cargando...' : 'Seleccionar'}</option>
            {catalogs.municipios.map((m) => <option key={m.id_municipio} value={m.id_municipio}>{m.nombre}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <label style={formLabel}>Localidad *</label>
          <select value={catalogs.localidadId ?? ''} disabled={!catalogs.selectedMunicipioId}
            onChange={(e) => { const id = e.target.value ? Number(e.target.value) : null; if (id) catalogs.setLocalidadId(id); }}
            style={formInputStyle('localidad')}>
            <option value="">
              {catalogs.isLoadingLocalidades ? 'Cargando...' : !catalogs.selectedMunicipioId ? 'Elegí un municipio' : 'Seleccionar'}
            </option>
            {catalogs.localidades.map((l) => <option key={l.id_localidad} value={l.id_localidad}>{l.nombre}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button type="button" onClick={handleCreateUser} disabled={createMutation.isPending} style={{
          flex: 1, height: 38, borderRadius: 8, border: 'none',
          background: createMutation.isPending ? `${coral}99` : coral, color: '#fff',
          fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
          cursor: createMutation.isPending ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          Guardar
        </button>
        <button type="button" onClick={onCreated} style={{
          height: 38, padding: '0 18px', borderRadius: 8, border: `1.5px solid ${border}`,
          background: 'transparent', color: fg, fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
        }}>
          Cancelar
        </button>
      </div>

      <WebDatePickerModal visible={showDatePicker} onClose={() => setShowDatePicker(false)}
        onSelectDate={(date) => setFormFechaNac(date)} initialDate={formFechaNac} />
    </div>
  );
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
  const coral = '#DE393A';
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
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ??
        (err as Error)?.message ??
        'Error al cambiar estado';
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
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ??
        (err as Error)?.message ??
        'Error al cambiar rol';
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
  const prevFilterKey = useMemo(
    () => ({ search, roleFilter, statusFilter }),
    [search, roleFilter, statusFilter],
  );
  const filterKey = JSON.stringify(prevFilterKey);
  const prevKeyRef = useRef(filterKey);
  if (prevKeyRef.current !== filterKey) {
    prevKeyRef.current = filterKey;
    setPage(1);
  }

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

  const btnStyle = {
    height: 40,
    padding: '0 18px',
    borderRadius: 10,
    border: 'none',
    fontSize: 14,
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer',
    letterSpacing: '0.01em',
    display: 'inline-flex' as const,
    alignItems: 'center',
    gap: 6,
  };

  const inputStyle = (focused: boolean) => ({
    width: '100%',
    height: 44,
    border: `1.5px solid ${focused ? brand : border}`,
    borderRadius: 10,
    padding: '0 14px',
    fontSize: 15,
    fontFamily: 'inherit' as const,
    background: bg,
    color: fg,
    outline: 'none',
    boxSizing: 'border-box' as const,
  });

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
              boxShadow:
                tab === t ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            {t === 'lista' ? '📋 Lista de usuarios' : '➕ Nuevo usuario'}
          </button>
        ))}
      </div>

      {/* ═══ Lista tab ═══ */}
      {tab === 'lista' && (
        <>
      {/* ═══ Search + Filters ═══ */}
      <div
        style={{
          background: surface,
          borderRadius: 16,
          border: `1px solid ${border}`,
          padding: 16,
          marginBottom: 20,
        }}
      >
        {/* Search */}
        <input
          type="search"
          placeholder="Buscar por nombre o correo…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            ...inputStyle(false),
            marginBottom: 14,
          }}
        />

        {/* Role filters */}
        <div style={{ marginBottom: 8 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: muted,
              display: 'block',
              marginBottom: 6,
            }}
          >
            Rol
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {ROLE_FILTERS.map((opt) => (
              <button
                key={String(opt.value)}
                onClick={() => setRoleFilter(opt.value)}
                style={{
                  ...btnStyle,
                  height: 32,
                  padding: '0 14px',
                  borderRadius: 999,
                  background:
                    roleFilter === opt.value ? brand : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                  color: roleFilter === opt.value ? '#fff' : muted,
                  border: 'none',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ height: 1, background: border, margin: '12px 0' }} />

        {/* Status filters */}
        <div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: muted,
              display: 'block',
              marginBottom: 6,
            }}
          >
            Estado
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {STATUS_FILTERS.map((opt) => (
              <button
                key={String(opt.value)}
                onClick={() => setStatusFilter(opt.value)}
                style={{
                  ...btnStyle,
                  height: 32,
                  padding: '0 14px',
                  borderRadius: 999,
                  background:
                    statusFilter === opt.value ? brand : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                  color: statusFilter === opt.value ? '#fff' : muted,
                  border: 'none',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

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

      {/* ═══ User table ═══ */}
      <div
        style={{
          background: surface,
          borderRadius: 16,
          border: `1px solid ${border}`,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            borderBottom: `1px solid ${border}`,
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: fg }}>
            {filtered.length} usuarios
          </span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Usuario', 'Email', 'Rol', 'Estado', 'Acciones'].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: 'left',
                      fontSize: 11,
                      color: muted,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      fontWeight: 600,
                      padding: '12px 20px',
                      background: bg,
                      borderBottom: `1px solid ${border}`,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      textAlign: 'center',
                      padding: '48px 24px',
                      color: muted,
                      fontSize: 14,
                    }}
                  >
                    No hay usuarios
                  </td>
                </tr>
              ) : (
                paginated.map((user) => {
                  const isSelf = user.id === currentUserId;
                  return (
                    <tr key={user.id} style={{ background: surface }}>
                      <td
                        style={{
                          padding: '14px 20px',
                          borderBottom: `1px solid ${border}`,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                          }}
                        >
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 10,
                              background: isDark ? '#1C2D22' : '#E2F0E6',
                              display: 'grid',
                              placeItems: 'center',
                              fontWeight: 600,
                              fontSize: 13,
                              color: brand,
                              flexShrink: 0,
                            }}
                          >
                            {user.nombre[0]}
                            {user.apellido_paterno[0]}
                          </div>
                          <div>
                            <div
                              style={{
                                fontSize: 14,
                                fontWeight: 600,
                                color: fg,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                              }}
                            >
                              {getFullName(user)}
                              {isSelf ? (
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 600,
                                    padding: '1px 6px',
                                    borderRadius: 4,
                                    background: isDark
                                      ? 'rgba(212,160,32,0.2)'
                                      : '#FEF3C7',
                                    color: isDark ? '#F2A900' : '#D97706',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                  }}
                                >
                                  tú
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td
                        style={{
                          padding: '14px 20px',
                          fontSize: 13,
                          color: muted,
                          borderBottom: `1px solid ${border}`,
                        }}
                      >
                        {user.email}
                      </td>
                      <td
                        style={{
                          padding: '14px 20px',
                          borderBottom: `1px solid ${border}`,
                        }}
                      >
                        <RolePill role={user.role} />
                      </td>
                      <td
                        style={{
                          padding: '14px 20px',
                          borderBottom: `1px solid ${border}`,
                        }}
                      >
                        <StatusBadge
                          active={user.estado}
                          brand={brand}
                          isDark={isDark}
                        />
                      </td>
                      <td
                        style={{
                          padding: '14px 20px',
                          borderBottom: `1px solid ${border}`,
                        }}
                      >
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            onClick={() => toggleStatus(user)}
                            disabled={isSelf || toggleMutation.isPending}
                            aria-label={user.estado ? 'Desactivar' : 'Activar'}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              border: `1px solid ${border}`,
                              background: surface,
                              cursor:
                                isSelf || toggleMutation.isPending
                                  ? 'not-allowed'
                                  : 'pointer',
                              fontSize: 14,
                              display: 'grid',
                              placeItems: 'center',
                              color:
                                isSelf || toggleMutation.isPending ? muted : fg,
                              opacity:
                                isSelf || toggleMutation.isPending ? 0.5 : 1,
                            }}
                          >
                            {user.estado ? '⏸' : '▶️'}
                          </button>
                          <button
                            onClick={() => openRoleModal(user)}
                            disabled={isSelf || roleMutation.isPending}
                            aria-label="Cambiar rol"
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              border: `1px solid ${border}`,
                              background: surface,
                              cursor:
                                isSelf || roleMutation.isPending
                                  ? 'not-allowed'
                                  : 'pointer',
                              fontSize: 14,
                              display: 'grid',
                              placeItems: 'center',
                              color:
                                isSelf || roleMutation.isPending
                                  ? muted
                                  : brand,
                              opacity:
                                isSelf || roleMutation.isPending ? 0.5 : 1,
                            }}
                          >
                            👤
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══ Pagination ═══ */}
      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 6,
            marginTop: 16,
          }}
        >
          <button
            disabled={safePage <= 1}
            onClick={() => setPage((p) => p - 1)}
            style={{
              ...btnStyle,
              height: 36,
              padding: '0 14px',
              borderRadius: 8,
              background: safePage <= 1 ? 'transparent' : surface,
              border: `1.5px solid ${border}`,
              color: safePage <= 1 ? muted : fg,
              cursor: safePage <= 1 ? 'not-allowed' : 'pointer',
              opacity: safePage <= 1 ? 0.5 : 1,
              fontSize: 13,
            }}
          >
            ← Anterior
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              style={{
                ...btnStyle,
                width: 36,
                height: 36,
                borderRadius: 8,
                border: 'none',
                background: p === safePage ? brand : 'transparent',
                color: p === safePage ? '#fff' : fg,
                fontWeight: p === safePage ? 700 : 500,
                cursor: 'pointer',
                fontSize: 13,
                justifyContent: 'center',
              }}
            >
              {p}
            </button>
          ))}

          <button
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            style={{
              ...btnStyle,
              height: 36,
              padding: '0 14px',
              borderRadius: 8,
              background: safePage >= totalPages ? 'transparent' : surface,
              border: `1.5px solid ${border}`,
              color: safePage >= totalPages ? muted : fg,
              cursor: safePage >= totalPages ? 'not-allowed' : 'pointer',
              opacity: safePage >= totalPages ? 0.5 : 1,
              fontSize: 13,
            }}
          >
            Siguiente →
          </button>
        </div>
      )}

        </>
      )}

      {/* ═══ Nuevo tab ═══ */}
      {tab === 'nuevo' && (
        <NuevoUsuarioForm
          fg={fg} muted={muted} border={border} bg={bg} brand={brand}
          coral={coral} surface={surface} isDark={isDark}
          onCreated={() => setTab('lista')}
          showToast={showToast}
        />
      )}

      {/* ═══ Role Change Modal ═══ */}
      {roleTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            backdropFilter: 'blur(4px)',
          }}
          onClick={closeRoleModal}
        >
          <div
            style={{
              background: surface,
              borderRadius: 20,
              padding: 28,
              maxWidth: 400,
              width: '90%',
              border: `1px solid ${border}`,
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: fg,
                marginBottom: 4,
              }}
            >
              Cambiar Rol
            </h3>
            <p style={{ fontSize: 13, color: muted, marginBottom: 20 }}>
              Usuario:{' '}
              <strong style={{ color: fg }}>{getFullName(roleTarget)}</strong>
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ROLE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    borderRadius: 10,
                    background:
                      selectedRole === opt.value
                        ? `${opt.color}12`
                        : 'transparent',
                    border: `1.5px solid ${selectedRole === opt.value ? opt.color : 'transparent'}`,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="role"
                    value={opt.value}
                    checked={selectedRole === opt.value}
                    onChange={() => setSelectedRole(opt.value)}
                    style={{ accentColor: opt.color }}
                  />
                  <span
                    style={{ fontSize: 15, fontWeight: 500, color: opt.color }}
                  >
                    {opt.label}
                  </span>
                </label>
              ))}
            </div>

            <div
              style={{
                display: 'flex',
                gap: 10,
                justifyContent: 'flex-end',
                marginTop: 24,
              }}
            >
              <button
                onClick={closeRoleModal}
                style={{
                  height: 36,
                  padding: '0 16px',
                  borderRadius: 8,
                  border: `1.5px solid ${border}`,
                  background: 'transparent',
                  color: fg,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={saveRole}
                style={{
                  height: 36,
                  padding: '0 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: brand,
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Deactivation confirmation ═══ */}
      {deactTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setDeactTarget(null)}
        >
          <div
            style={{
              background: surface,
              borderRadius: 20,
              padding: 28,
              maxWidth: 440,
              width: '90%',
              border: `1px solid ${border}`,
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: fg,
                marginBottom: 8,
              }}
            >
              Confirmar desactivación
            </h3>
            <p style={{ fontSize: 14, color: muted, marginBottom: 8 }}>
              ¿Estás seguro de desactivar a{' '}
              <strong style={{ color: fg }}>{getFullName(deactTarget)}</strong>?
            </p>
            <p style={{ fontSize: 13, color: muted, marginBottom: 20 }}>
              El usuario perderá acceso al sistema hasta que sea reactivado.
            </p>
            <div
              style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}
            >
              <button
                onClick={() => setDeactTarget(null)}
                style={{
                  height: 36,
                  padding: '0 16px',
                  borderRadius: 8,
                  border: `1.5px solid ${border}`,
                  background: 'transparent',
                  color: fg,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeactivation}
                style={{
                  height: 36,
                  padding: '0 16px',
                  borderRadius: 8,
                  border: '1.5px solid #DE393A',
                  background: 'transparent',
                  color: '#DE393A',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Desactivar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
