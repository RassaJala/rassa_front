import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { colors } from '@/constants/colors';
import { useTheme } from '../providers/ThemeProvider';
import api from '../services/api';
import type { FamilyMember, SearchUserResult } from '../types';
import { extractApiError } from '../utils/apiError';

export function AdminFamilyDetail() {
  const { resolved } = useTheme();
  const isDark = resolved === 'dark';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const familyIdStr = searchParams.get('familyId') ?? '';
  const familyName = searchParams.get('familyName') ?? 'Detalle de familia';
  const familyId = parseInt(familyIdStr, 10);

  const fg = isDark ? colors.background : colors.text;
  const muted = isDark ? colors.mutedDark : colors.textSecondary;
  const border = isDark ? colors.brandInk : colors.border;
  const surface = isDark ? colors.brandInk : colors.surface;
  const bg = isDark ? colors.iconDark : colors.background;
  const brand = isDark ? colors.brandPrimaryDark : colors.brandPrimary;
  const coral = colors.brandRedCoral;

  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jefeId, setJefeId] = useState<number | null>(null);

  // Add member modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUserResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<SearchUserResult | null>(
    null,
  );
  const [searchLoading, setSearchLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return members;
    const q = memberSearch.trim().toLowerCase();
    return members.filter(
      (m) =>
        m.usuario_nombre.toLowerCase().includes(q) ||
        m.usuario_correo.toLowerCase().includes(q),
    );
  }, [members, memberSearch]);

  useEffect(() => {
    if (!isNaN(familyId)) {
      fetchFamilyAndMembers();
    } else {
      setError('ID de familia no válido.');
      setLoading(false);
    }
  }, [familyId]);

  async function fetchFamilyAndMembers() {
    try {
      setLoading(true);
      setError(null);

      // Fetch family detail to know the head of family
      const familyRes = await api.get<{
        fk_jefe_familia?: number | null;
        jefe_nombre?: string | null;
      }>(`/familias/grupos/${familyId}/`);
      if (familyRes.data) {
        setJefeId(familyRes.data.fk_jefe_familia ?? null);
      }

      // Fetch members
      const membersRes = await api.get(
        `/familias/miembros/?fk_familia=${familyId}`,
      );
      const data = membersRes.data;

      if (Array.isArray(data)) {
        setMembers(data);
      } else if (data && typeof data === 'object') {
        const payload = (data as { data?: unknown }).data ?? data;
        if (Array.isArray(payload)) {
          setMembers(payload);
        } else if (
          payload &&
          typeof payload === 'object' &&
          Array.isArray((payload as { results?: unknown }).results)
        ) {
          setMembers((payload as { results: FamilyMember[] }).results);
        } else {
          setMembers([]);
        }
      } else {
        setMembers([]);
      }
    } catch (err: unknown) {
      console.error(err);
      setError('Error al cargar la familia y sus miembros.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = searchQuery.trim();
    if (trimmed.length < 2 || selectedUser) {
      setSearchResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const { data } = await api.get<{ data: SearchUserResult[] }>(
          `/auth/search-users/?q=${encodeURIComponent(trimmed)}`,
        );
        setSearchResults(data.data);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, selectedUser]);

  function handleSelectUser(user: SearchUserResult) {
    setSelectedUser(user);
    setSearchQuery(`${user.nombre} ${user.apellido_paterno} (${user.email})`);
    setSearchResults([]);
  }

  function handleClearSearch() {
    setSearchQuery('');
    setSelectedUser(null);
    setSearchResults([]);
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) {
      setModalError('Seleccioná un usuario de la lista.');
      return;
    }

    setModalLoading(true);
    setModalError(null);
    try {
      await api.post('/familias/miembros/', {
        fk_usuario: selectedUser.id_usuario,
        fk_familia: familyId,
      });
      await fetchFamilyAndMembers();
      setModalVisible(false);
      handleClearSearch();
    } catch (err: unknown) {
      console.error(err);
      const apiErr = extractApiError(err, [
        'fk_usuario',
        'fk_familia',
        'detail',
      ]);
      setModalError(apiErr || 'Error al agregar miembro.');
    } finally {
      setModalLoading(false);
    }
  }

  async function handleRemoveMember(member: FamilyMember) {
    if (jefeId === member.fk_usuario) {
      setError(
        'No puedes remover al jefe de familia. Primero asigna otro jefe.',
      );
      return;
    }

    if (
      !window.confirm(
        `¿Seguro que quieres remover a ${member.usuario_nombre} de la familia?`,
      )
    ) {
      return;
    }
    setError(null);
    try {
      await api.delete(`/familias/miembros/${member.id_familia_usuario}/`);
      await fetchFamilyAndMembers();
    } catch (err: unknown) {
      console.error(err);
      setError('Error al remover al miembro de la familia.');
    }
  }

  async function handleAssignHead(member: FamilyMember) {
    setError(null);
    try {
      await api.post(`/familias/grupos/${familyId}/asignar-jefe/`, {
        fk_jefe_familia: member.fk_usuario,
      });
      await fetchFamilyAndMembers();
    } catch (err: unknown) {
      console.error(err);
      setError('Error al asignar el jefe de familia.');
    }
  }

  const btnStyle = {
    height: 38,
    padding: '0 16px',
    borderRadius: 8,
    border: 'none',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  } as const;

  return (
    <div>
      {/* Navigation header */}
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={() => navigate('/admin/familias')}
          style={{
            background: 'transparent',
            border: 'none',
            color: brand,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
            marginBottom: 8,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          ⬅️ Volver a familias
        </button>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <h2
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: fg,
            }}
          >
            Miembros de {familyName}
          </h2>
          <button
            onClick={() => {
              setModalError(null);
              setModalVisible(true);
            }}
            style={{ ...btnStyle, background: coral, color: colors.iconWhite }}
          >
            ＋ Agregar integrante
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 10,
            background: isDark
              ? 'rgba(222,57,58,0.15)'
              : 'rgba(222,57,58,0.07)',
            color: coral,
            fontSize: 14,
            marginBottom: 20,
            border: `1px solid ${coral}`,
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Members list block */}
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
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontWeight: 600, fontSize: 14, color: fg }}>
            {loading
              ? 'Cargando miembros...'
              : `${filteredMembers.length} miembros`}
          </span>
          <input
            type="search"
            placeholder="Buscar miembro..."
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            style={{
              height: 36,
              border: `1.5px solid ${border}`,
              borderRadius: 8,
              padding: '0 12px',
              fontSize: 13,
              fontFamily: 'inherit',
              width: 220,
              background: bg,
              color: fg,
              outline: 'none',
            }}
          />
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {[
                  'Nombre del Miembro',
                  'Correo Electrónico',
                  'Rol Familia',
                  'Acciones',
                ].map((h) => (
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
              {loading ? (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      textAlign: 'center',
                      padding: '48px 24px',
                      color: muted,
                      fontSize: 14,
                    }}
                  >
                    Cargando miembros...
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      textAlign: 'center',
                      padding: '48px 24px',
                      color: muted,
                      fontSize: 14,
                    }}
                  >
                    {members.length === 0
                      ? 'No hay miembros en esta familia.'
                      : 'No se encontraron miembros.'}
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => {
                  const isHead = jefeId === member.fk_usuario;
                  return (
                    <tr
                      key={member.id_familia_usuario}
                      style={{ background: surface }}
                    >
                      <td
                        style={{
                          padding: '14px 20px',
                          fontSize: 14,
                          borderBottom: `1px solid ${border}`,
                          fontWeight: 600,
                          color: fg,
                        }}
                      >
                        {member.usuario_nombre}
                      </td>
                      <td
                        style={{
                          padding: '14px 20px',
                          fontSize: 14,
                          borderBottom: `1px solid ${border}`,
                          color: muted,
                        }}
                      >
                        {member.usuario_correo}
                      </td>
                      <td
                        style={{
                          padding: '14px 20px',
                          borderBottom: `1px solid ${border}`,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            padding: '3px 10px',
                            borderRadius: 6,
                            background: isHead
                              ? isDark
                                ? 'rgba(74,138,99,0.15)'
                                : 'rgba(36,86,60,0.07)'
                              : border,
                            color: isHead ? brand : muted,
                          }}
                        >
                          {isHead ? '👑 Jefe de Familia' : 'Integrante'}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: '14px 20px',
                          borderBottom: `1px solid ${border}`,
                        }}
                      >
                        <div style={{ display: 'flex', gap: 8 }}>
                          {!isHead && (
                            <button
                              onClick={() => handleAssignHead(member)}
                              style={{
                                background: 'transparent',
                                border: `1px solid ${border}`,
                                borderRadius: 8,
                                padding: '6px 12px',
                                fontSize: 13,
                                color: brand,
                                cursor: 'pointer',
                                fontWeight: 600,
                              }}
                            >
                              ⭐ Hacer Jefe
                            </button>
                          )}
                          <button
                            onClick={() => handleRemoveMember(member)}
                            style={{
                              background: 'transparent',
                              border: `1px solid ${border}`,
                              borderRadius: 8,
                              padding: '6px 12px',
                              fontSize: 13,
                              color: coral,
                              cursor: 'pointer',
                              fontWeight: 600,
                            }}
                          >
                            ❌ Remover
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

      {/* Add member modal */}
      {modalVisible && (
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
          onClick={() => {
            setModalVisible(false);
            handleClearSearch();
          }}
        >
          <form
            onSubmit={handleAddMember}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: surface,
              borderRadius: 20,
              padding: 28,
              maxWidth: 400,
              width: '90%',
              border: `1px solid ${border}`,
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div>
              <h3
                style={{ fontSize: 18, fontWeight: 700, color: fg, margin: 0 }}
              >
                Agregar integrante
              </h3>
              <p style={{ fontSize: 13, color: muted, margin: '4px 0 0 0' }}>
                Buscá un usuario por su nombre o correo.
              </p>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 5,
                position: 'relative',
              }}
            >
              <input
                type="text"
                placeholder="Nombre o correo..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (selectedUser) setSelectedUser(null);
                }}
                required
                style={{
                  width: '100%',
                  height: 44,
                  border: `1.5px solid ${border}`,
                  borderRadius: 10,
                  padding: '0 14px',
                  fontSize: 15,
                  fontFamily: 'inherit',
                  background: bg,
                  color: fg,
                  outline: 'none',
                }}
              />
              {searchResults.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: 48,
                    left: 0,
                    right: 0,
                    background: surface,
                    border: `1px solid ${border}`,
                    borderRadius: 10,
                    maxHeight: 180,
                    overflowY: 'auto',
                    zIndex: 10,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                  }}
                >
                  {searchResults.map((user) => (
                    <div
                      key={user.id_usuario}
                      onClick={() => handleSelectUser(user)}
                      style={{
                        padding: '10px 14px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        borderBottom: `1px solid ${border}`,
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLDivElement).style.background =
                          isDark ? border : bg;
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLDivElement).style.background =
                          'transparent';
                      }}
                    >
                      <span
                        style={{ fontSize: 14, fontWeight: 600, color: fg }}
                      >
                        {user.nombre} {user.apellido_paterno}
                      </span>
                      <span style={{ fontSize: 12, color: muted }}>
                        {user.email}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {searchLoading && (
                <span style={{ fontSize: 12, color: muted, marginTop: 2 }}>
                  Buscando...
                </span>
              )}
            </div>

            {modalError && (
              <div
                style={{
                  fontSize: 13,
                  color: coral,
                  background: isDark
                    ? 'rgba(222,57,58,0.15)'
                    : 'rgba(222,57,58,0.07)',
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: `1px solid ${coral}`,
                }}
              >
                ⚠️ {modalError}
              </div>
            )}

            <div
              style={{
                display: 'flex',
                gap: 10,
                justifyContent: 'flex-end',
                marginTop: 8,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setModalVisible(false);
                  handleClearSearch();
                }}
                style={{
                  height: 32,
                  padding: '0 12px',
                  borderRadius: 8,
                  border: `1.5px solid ${border}`,
                  background: 'transparent',
                  color: fg,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={modalLoading || !selectedUser}
                style={{
                  height: 32,
                  padding: '0 12px',
                  borderRadius: 8,
                  border: 'none',
                  background: coral,
                  color: colors.iconWhite,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  opacity: modalLoading || !selectedUser ? 0.6 : 1,
                }}
              >
                {modalLoading ? 'Agregando...' : 'Agregar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
