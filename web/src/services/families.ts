import type { Family } from '../types';
import api from './api';

export async function createFamilyWithHead(
  payload: { nombre_familia: string; detalle_familia?: string },
  jefeUserId: number,
): Promise<Family> {
  const { data } = await api.post('/familias/grupos/', {
    ...payload,
    estado: true,
  });
  const createdFamily =
    (data as { data?: { id_familia: number } }).data ??
    (data as { id_familia: number });
  const familyId = createdFamily.id_familia;

  let rollbackOk = true;
  try {
    await api.post('/familias/miembros/', {
      fk_usuario: jefeUserId,
      fk_familia: familyId,
    });

    await api.post(`/familias/grupos/${familyId}/asignar-jefe/`, {
      fk_jefe_familia: jefeUserId,
    });
  } catch (err: unknown) {
    try {
      await api.delete(`/familias/grupos/${familyId}/`);
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
    throw err;
  }
  return createdFamily as Family;
}
