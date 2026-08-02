import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { server } from '../../mocks/server';
import { ThemeProvider } from '../../providers/ThemeProvider';
import type { Recoleccion } from '../../types/recolecciones';
import {
  addDays,
  parseFecha,
  toDateString,
  todayString,
} from '../../utils/recolecciones';
import { ScheduleRecoleccionModal } from './ScheduleRecoleccionModal';

const BASE = '/api';

const hoy = todayString();
const ayer = toDateString(addDays(parseFecha(hoy) as Date, -1));

function recoleccion(overrides: Partial<Recoleccion> = {}): Recoleccion {
  return {
    id_recoleccion: 1,
    fk_agricultor: 10,
    agricultor_nombre: 'Juan Pérez',
    fecha_recoleccion: hoy,
    hora_inicio: null,
    hora_fin: null,
    estado: 'pendiente',
    comentarios: null,
    creado_en: `${hoy}T00:00:00Z`,
    ...overrides,
  };
}

function renderModal(
  existing: readonly Recoleccion[] = [],
  options: { readonly duplicateCheckFailed?: boolean } = {},
) {
  const onClose = vi.fn();
  const onSaved = vi.fn();
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <ThemeProvider>
      <QueryClientProvider client={qc}>
        <ScheduleRecoleccionModal
          visible
          onClose={onClose}
          onSaved={onSaved}
          existing={existing}
          duplicateCheckFailed={options.duplicateCheckFailed}
        />
      </QueryClientProvider>
    </ThemeProvider>,
  );
  return { onClose, onSaved };
}

async function seleccionarJuan() {
  const row = await screen.findByRole('button', { name: /Juan P\u00e9rez/ });
  await userEvent.click(row);
}

describe('ScheduleRecoleccionModal — validación', () => {
  it('muestra aviso cuando falla la carga de todas las recolecciones', async () => {
    renderModal([], { duplicateCheckFailed: true });

    expect(
      await screen.findByText(/No se pudieron cargar todas las recolecciones/),
    ).toBeInTheDocument();
  });

  it('muestra el marcador de duplicado para agricultores con recolección', async () => {
    renderModal([recoleccion({ fk_agricultor: 10, fecha_recoleccion: hoy })]);

    await seleccionarJuan();
    expect(screen.getByText('Ya tiene recolección')).toBeInTheDocument();
  });

  it('rechaza una fecha anterior a hoy', async () => {
    renderModal();
    await seleccionarJuan();

    fireEvent.change(screen.getByLabelText('Fecha'), {
      target: { value: ayer },
    });

    await userEvent.click(
      screen.getByRole('button', { name: /Programar recolección/ }),
    );

    expect(
      await screen.findByText('La fecha no puede ser anterior a hoy.'),
    ).toBeInTheDocument();
  });

  it('rechaza hora de fin menor o igual a la de inicio', async () => {
    renderModal();
    await seleccionarJuan();

    fireEvent.change(screen.getByLabelText('Hora inicio'), {
      target: { value: '09:00' },
    });
    fireEvent.change(screen.getByLabelText('Hora fin'), {
      target: { value: '09:00' },
    });

    await userEvent.click(
      screen.getByRole('button', { name: /Programar recolección/ }),
    );

    expect(
      await screen.findByText(
        'La hora de fin debe ser posterior a la de inicio.',
      ),
    ).toBeInTheDocument();
  });

  it('muestra el error del servidor al programar un duplicado', async () => {
    renderModal();
    await seleccionarJuan();

    await userEvent.click(
      screen.getByRole('button', { name: /Programar recolección/ }),
    );

    expect(
      await screen.findByText(
        'El agricultor ya tiene una recolección programada para esta fecha.',
      ),
    ).toBeInTheDocument();
  });

  it('cierra con éxito al programar para un agricultor libre', async () => {
    const { onClose, onSaved } = renderModal();
    const ana = await screen.findByRole('button', {
      name: /Ana Ram\u00edrez/,
    });
    await userEvent.click(ana);

    await userEvent.click(
      screen.getByRole('button', { name: /Programar recolección/ }),
    );

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('bloquea el guardado sin seleccionar agricultor', async () => {
    renderModal();

    await userEvent.click(
      screen.getByRole('button', { name: /Programar recolección/ }),
    );

    expect(
      await screen.findByText('Selecciona un agricultor.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Guardando…')).not.toBeInTheDocument();
  });

  it('ignora el doble clic mientras el POST está pendiente', async () => {
    let postCalls = 0;
    let release!: () => void;
    server.use(
      http.post(`${BASE}/recolecciones/`, async () => {
        postCalls += 1;
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return HttpResponse.json(
          { data: { id_recoleccion: 99 } },
          { status: 201 },
        );
      }),
    );

    const { onSaved } = renderModal();
    await seleccionarJuan();

    await userEvent.click(
      screen.getByRole('button', { name: /Programar recolección/ }),
    );
    await screen.findByText('Guardando…');
    expect(screen.getByRole('button', { name: /Guardando/ })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: /Guardando/ }));
    expect(postCalls).toBe(1);

    release();
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  });

  it('envía el payload con horas normalizadas al servidor', async () => {
    let capturedBody: unknown;
    server.use(
      http.post(`${BASE}/recolecciones/`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json(
          { data: { id_recoleccion: 42 } },
          { status: 201 },
        );
      }),
    );

    const { onSaved } = renderModal();
    await seleccionarJuan();

    fireEvent.change(screen.getByLabelText('Hora inicio'), {
      target: { value: '08:30' },
    });
    fireEvent.change(screen.getByLabelText('Hora fin'), {
      target: { value: '10:00' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Notas/), {
      target: { value: '  Entrega en puerta  ' },
    });

    await userEvent.click(
      screen.getByRole('button', { name: /Programar recolección/ }),
    );

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(capturedBody).toEqual({
      fk_agricultor: 10,
      fecha_recoleccion: hoy,
      hora_inicio: '08:30:00',
      hora_fin: '10:00:00',
      comentarios: 'Entrega en puerta',
    });
  });

  it('muestra el mensaje de un 400 del servidor al guardar', async () => {
    server.use(
      http.post(`${BASE}/recolecciones/`, () =>
        HttpResponse.json(
          { detail: 'No autorizado para programar recolecciones.' },
          { status: 400 },
        ),
      ),
    );

    renderModal();
    await seleccionarJuan();

    await userEvent.click(
      screen.getByRole('button', { name: /Programar recolección/ }),
    );

    expect(
      await screen.findByText('No autorizado para programar recolecciones.'),
    ).toBeInTheDocument();
  });
});
