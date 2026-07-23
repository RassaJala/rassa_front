/* globals console */

import type { Family, FamilyMember, SearchUserResult } from '@/types';

import api from './api';

const FAMILIAS_URL = '/familias/grupos/';
const MIEMBROS_URL = '/familias/miembros/';

// ── Families CRUD ──────────────────────────────────────

export async function fetchFamilies(): Promise<Family[]> {
  const { data } = await api.get<Family[] | { results: Family[] }>(
    FAMILIAS_URL,
  );
  return Array.isArray(data) ? data : data.results;
}

export async function fetchFamily(id: number): Promise<Family> {
  const { data } = await api.get<Family>(`${FAMILIAS_URL}${id}/`);
  return data;
}

export async function createFamily(payload: {
  nombre_familia: string;
  detalle_familia?: string;
}): Promise<Family> {
  const { data } = await api.post<Family>(FAMILIAS_URL, payload);
  return data;
}

export async function updateFamily(
  id: number,
  payload: { nombre_familia: string; detalle_familia?: string },
): Promise<Family> {
  const { data } = await api.patch<Family>(`${FAMILIAS_URL}${id}/`, payload);
  return data;
}

export async function deleteFamily(id: number): Promise<void> {
  await api.delete(`${FAMILIAS_URL}${id}/`);
}

// ── Trash & Restore ────────────────────────────────────

export async function fetchFamiliesTrash(): Promise<Family[]> {
  const { data } = await api.get<
    Family[] | { results?: Family[]; data?: Family[] }
  >(`${FAMILIAS_URL}trash/`);
  if (Array.isArray(data)) return data;
  return data.results ?? (data as { data?: Family[] }).data ?? [];
}

export async function restoreFamily(
  id: number,
  jefeUserId: number,
): Promise<Family> {
  const { data } = await api.post<{ data?: Family } | Family>(
    `${FAMILIAS_URL}${id}/restore/`,
    { fk_jefe_familia: jefeUserId },
  );
  return ('data' in data && data.data ? data.data : data) as Family;
}

export async function deleteFamilyPermanent(id: number): Promise<void> {
  await api.post(`${FAMILIAS_URL}${id}/permanent/`);
}

// ── Composite: create + add member + assign head ───────

export async function createFamilyWithHead(
  payload: { nombre_familia: string; detalle_familia?: string },
  jefeUserId: number,
): Promise<Family> {
  const family = await createFamily(payload);
  let rollbackOk = true;
  try {
    await addFamilyMember(jefeUserId, family.id_familia);
    await assignFamilyHead(family.id_familia, jefeUserId);
  } catch (err) {
    try {
      await deleteFamily(family.id_familia);
    } catch (rollbackErr) {
      rollbackOk = false;
      console.error(
        '[Rollback Error] Failed to delete empty family:',
        rollbackErr,
      );
    }
    if (!rollbackOk) {
      throw new Error(
        'Error al asignar el jefe de familia. La familia fue creada pero el rollback falló — contactá al administrador.',
      );
    }
    throw new Error('Error al asignar el jefe de familia.');
  }
  return family;
}

// ── Family head assignment ─────────────────────────────

export async function assignFamilyHead(
  familyId: number,
  userId: number,
): Promise<Family> {
  const { data } = await api.post<Family>(
    `${FAMILIAS_URL}${familyId}/asignar-jefe/`,
    { fk_jefe_familia: userId },
  );
  return data;
}

// ── Members CRUD ───────────────────────────────────────

export async function fetchFamilyMembers(
  familyId: number,
): Promise<FamilyMember[]> {
  const { data } = await api.get<
    FamilyMember[] | { results: FamilyMember[] }
  >(`${MIEMBROS_URL}?fk_familia=${familyId}`);
  return Array.isArray(data) ? data : data.results;
}

export async function addFamilyMember(
  fk_usuario: number,
  fk_familia: number,
): Promise<FamilyMember> {
  const { data } = await api.post<FamilyMember>(MIEMBROS_URL, {
    fk_usuario,
    fk_familia,
  });
  return data;
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
