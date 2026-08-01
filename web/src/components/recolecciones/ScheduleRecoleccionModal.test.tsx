import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ThemeProvider } from '../../providers/ThemeProvider';
import type { Recoleccion } from '../../types/recolecciones';
import {
  addDays,
  parseFecha,
  toDateString,
  todayString,
} from '../../utils/recolecciones';
import { ScheduleRecoleccionModal } from './ScheduleRecoleccionModal';

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

    const fechaInput = screen.getByPlaceholderText('AAAA-MM-DD');
    await userEvent.clear(fechaInput);
    await userEvent.type(fechaInput, ayer);

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

    const horas = screen.getAllByPlaceholderText('HH:MM (opcional)');
    await userEvent.type(horas[0] as HTMLInputElement, '09:00');
    await userEvent.type(horas[1] as HTMLInputElement, '09:00');

    await userEvent.click(
      screen.getByRole('button', { name: /Programar recolección/ }),
    );

    expect(
      await screen.findByText(
        'La hora de fin debe ser posterior a la de inicio.',
      ),
    ).toBeInTheDocument();
  });

  it('rechaza un formato de hora inválido', async () => {
    renderModal();
    await seleccionarJuan();

    const horas = screen.getAllByPlaceholderText('HH:MM (opcional)');
    await userEvent.type(horas[0] as HTMLInputElement, '25:00');

    await userEvent.click(
      screen.getByRole('button', { name: /Programar recolección/ }),
    );

    expect(
      await screen.findByText('La hora de inicio debe tener el formato HH:MM.'),
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
});
