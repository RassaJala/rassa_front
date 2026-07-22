/* globals console */

import type { Family, FamilyMember, SearchUserResult } from '@/types';

import api from './api';

const FAMILIAS_URL = '/familias/grupos/';
const MIEMBROS_URL = '/familias/miembros/';

// ── Normalizers ─────────────────────────────────────────

function normalizeFamily(raw: Record<string, unknown>): Family {
  return {
    id_familia: raw.id_familia as number,
    fk_jefe_familia: (raw.fk_jefe_familia as number) ?? null,
    jefe_nombre: (raw.jefe_nombre as string) ?? null,
    nombre_familia: raw.nombre_familia as string,
    nombre: raw.nombre_familia as string,
    detalle_familia: (raw.detalle_familia as string) ?? null,
    creado_en: raw.creado_en as string,
    estado: raw.estado as boolean,
  };
}

function normalizeMember(raw: Record<string, unknown>): FamilyMember {
  return {
    id_familia_usuario: raw.id_familia_usuario as number,
    fk_usuario: raw.fk_usuario as number,
    usuario_nombre: raw.usuario_nombre as string,
    usuario_correo: raw.usuario_correo as string,
    fk_familia: raw.fk_familia as number,
    estado: raw.estado as boolean,
    creado_en: raw.creado_en as string,
  };
}

// ── Families CRUD ──────────────────────────────────────

export async function fetchFamilies(): Promise<Family[]> {
  const { data } = await api.get<
    Record<string, unknown>[] | { results: Record<string, unknown>[] }
  >(FAMILIAS_URL);
  const list = Array.isArray(data) ? data : data.results;
  return list.map(normalizeFamily);
}

export async function fetchFamily(id: number): Promise<Family> {
  const { data } = await api.get<Record<string, unknown>>(
    `${FAMILIAS_URL}${id}/`,
  );
  return normalizeFamily(data);
}

export async function createFamily(payload: {
  nombre_familia: string;
  detalle_familia?: string;
}): Promise<Family> {
  const { data } = await api.post<Record<string, unknown>>(
    FAMILIAS_URL,
    payload,
  );
  return normalizeFamily(data);
}

export async function updateFamily(
  id: number,
  payload: { nombre_familia: string; detalle_familia?: string },
): Promise<Family> {
  const { data } = await api.patch<Record<string, unknown>>(
    `${FAMILIAS_URL}${id}/`,
    payload,
  );
  return normalizeFamily(data);
}

export async function deleteFamily(id: number): Promise<void> {
  await api.delete(`${FAMILIAS_URL}${id}/`);
}

// ── Trash & Restore ────────────────────────────────────

export async function fetchFamiliesTrash(): Promise<Family[]> {
  const { data } = await api.get<
    Record<string, unknown>[] | { data: Record<string, unknown>[] }
  >(`${FAMILIAS_URL}trash/`);
  const list = Array.isArray(data)
    ? data
    : ((data as { results?: Record<string, unknown>[] }).results ?? []);
  return list.map(normalizeFamily);
}

export async function restoreFamily(
  id: number,
  jefeUserId: number,
): Promise<Family> {
  const { data } = await api.post<Record<string, unknown>>(
    `${FAMILIAS_URL}${id}/restore/`,
    { fk_jefe_familia: jefeUserId },
  );
  const payload = (data.data as Record<string, unknown>) ?? data;
  return normalizeFamily(payload);
}

export async function deleteFamilyPermanent(id: number): Promise<void> {
  await api.post(`${FAMILIAS_URL}${id}/permanent/`);
}

// ── Family head assignment ─────────────────────────────

export async function assignFamilyHead(
  familyId: number,
  userId: number,
): Promise<Family> {
  const { data } = await api.post<Record<string, unknown>>(
    `${FAMILIAS_URL}${familyId}/asignar-jefe/`,
    { fk_jefe_familia: userId },
  );
  return normalizeFamily(data);
}

// ── Members CRUD ───────────────────────────────────────

export async function fetchFamilyMembers(
  familyId: number,
): Promise<FamilyMember[]> {
  const { data } = await api.get<
    Record<string, unknown>[] | { results: Record<string, unknown>[] }
  >(`${MIEMBROS_URL}?fk_familia=${familyId}`);
  const list = Array.isArray(data) ? data : data.results;
  return list.map(normalizeMember);
}

export async function addFamilyMember(
  fk_usuario: number,
  fk_familia: number,
): Promise<FamilyMember> {
  const { data } = await api.post<Record<string, unknown>>(MIEMBROS_URL, {
    fk_usuario,
    fk_familia,
  });
  return normalizeMember(data);
}

export async function removeFamilyMember(memberId: number): Promise<void> {
  await api.delete(`${MIEMBROS_URL}${memberId}/`);
}

export async function searchUsers(
  query: string,
  includeAssigned = false,
): Promise<SearchUserResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 1) return [];
  try {
    const url = `/auth/search-users/?q=${encodeURIComponent(trimmed)}${includeAssigned ? '&include_assigned=true' : ''}`;
    const { data } = await api.get<
      { data?: SearchUserResult[] } | SearchUserResult[]
    >(url);
    if (Array.isArray(data)) return data;
    return data.data ?? [];
  } catch (err) {
    console.error('searchUsers error:', err);
    return [];
  }
}
