import { afterEach, describe, expect, it } from 'vitest';

import { resetRecoleccionesMock } from './handlers';

afterEach(() => {
  resetRecoleccionesMock();
});

async function post(url: string, body?: unknown): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe('handlers — contrato de errores del backend', () => {
  it('404 devuelve { id_recoleccion } (forma del backend)', async () => {
    const res = await post('/api/recolecciones/999/estado/', {
      estado: 'cancelado',
    });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      id_recoleccion: 'Recolección no encontrada.',
    });
  });

  it('transición inválida devuelve non_field_errors con mensaje exacto', async () => {
    const res = await post('/api/recolecciones/1/estado/', {
      estado: 'recolectado',
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      non_field_errors: ["No se puede cambiar de 'pendiente' a 'recolectado'."],
    });
  });

  it('mismo estado devuelve mensaje de estado repetido', async () => {
    const res = await post('/api/recolecciones/1/estado/', {
      estado: 'pendiente',
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      non_field_errors: ['La recolección ya está en ese estado.'],
    });
  });

  it('cancelar una recolectada devuelve mensaje exacto', async () => {
    await post('/api/recolecciones/1/estado/', { estado: 'en_ruta' });
    await post('/api/recolecciones/1/estado/', { estado: 'recolectado' });

    const res = await post('/api/recolecciones/1/cancelar/');
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      non_field_errors: ["No se puede cambiar de 'recolectado' a 'cancelado'."],
    });
  });

  it('cancelar una ya cancelada devuelve mensaje de estado repetido', async () => {
    await post('/api/recolecciones/1/cancelar/');

    const res = await post('/api/recolecciones/1/cancelar/');
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      non_field_errors: ['La recolección ya está en ese estado.'],
    });
  });
});
