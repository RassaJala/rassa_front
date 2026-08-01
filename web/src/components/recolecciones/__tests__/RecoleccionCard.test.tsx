import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ThemeProvider } from '../../../providers/ThemeProvider';
import type { Recoleccion } from '../../../types/recolecciones';
import { RecoleccionCard } from '../RecoleccionCard';

function recoleccion(overrides: Partial<Recoleccion> = {}): Recoleccion {
  return {
    id_recoleccion: 1,
    fk_agricultor: 10,
    agricultor_nombre: 'Juan Pérez',
    fecha_recoleccion: '2026-08-01',
    hora_inicio: '08:00:00',
    hora_fin: '10:00:00',
    estado: 'pendiente',
    comentarios: null,
    creado_en: '2026-07-31T20:00:00Z',
    ...overrides,
  };
}

function renderCard(
  item: Recoleccion,
  overrides: Partial<{
    busy: boolean;
    canContact: boolean;
    onTransition: (estado: Recoleccion['estado']) => void;
    onCancel: () => void;
    onContact: () => void;
  }> = {},
) {
  const onTransition = vi.fn();
  const onCancel = vi.fn();
  const onContact = vi.fn();
  render(
    <ThemeProvider>
      <RecoleccionCard
        item={item}
        busy={overrides.busy ?? false}
        canContact={overrides.canContact ?? false}
        onTransition={overrides.onTransition ?? onTransition}
        onCancel={overrides.onCancel ?? onCancel}
        onContact={overrides.onContact ?? onContact}
      />
    </ThemeProvider>,
  );
  return { onTransition, onCancel, onContact };
}

describe('RecoleccionCard', () => {
  it('muestra el nombre del agricultor y el estado', () => {
    renderCard(recoleccion());
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
  });

  it('muestra fallback cuando no hay nombre de agricultor', () => {
    renderCard(recoleccion({ agricultor_nombre: null }));
    expect(screen.getByText('Agricultor')).toBeInTheDocument();
  });

  it('muestra el rango horario formateado', () => {
    renderCard(recoleccion());
    expect(screen.getByText('08:00 h – 10:00 h')).toBeInTheDocument();
  });

  it('muestra "Sin hora definida" cuando no hay hora', () => {
    renderCard(recoleccion({ hora_inicio: null, hora_fin: null }));
    expect(screen.getByText('Sin hora definida')).toBeInTheDocument();
  });

  it('muestra los comentarios cuando existen', () => {
    renderCard(recoleccion({ comentarios: 'Llegar por la puerta trasera' }));
    expect(
      screen.getByText('Llegar por la puerta trasera'),
    ).toBeInTheDocument();
  });

  it('pendiente ofrece iniciar ruta y cancelar', () => {
    const { onTransition, onCancel } = renderCard(recoleccion());
    expect(
      screen.getByRole('button', { name: 'Iniciar ruta' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Recolectado' })).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Cancelar' }),
    ).toBeInTheDocument();
    expect(onTransition).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('en_ruta ofrece recolectado y cancelar', async () => {
    const { onTransition } = renderCard(recoleccion({ estado: 'en_ruta' }));
    await userEvent.click(screen.getByRole('button', { name: 'Recolectado' }));
    expect(onTransition).toHaveBeenCalledWith('recolectado');
    expect(screen.queryByRole('button', { name: 'Iniciar ruta' })).toBeNull();
  });

  it('recolectado y cancelado no ofrecen acciones', () => {
    renderCard(recoleccion({ estado: 'recolectado' }));
    expect(screen.queryByRole('button', { name: 'Cancelar' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Recolectado' })).toBeNull();
    renderCard(recoleccion({ estado: 'cancelado' }));
    expect(screen.queryByRole('button', { name: 'Cancelar' })).toBeNull();
  });

  it('muestra Contactar solo cuando canContact', () => {
    const { onContact } = renderCard(recoleccion(), { canContact: true });
    expect(
      screen.getByRole('button', { name: 'Contactar' }),
    ).toBeInTheDocument();
  });

  it('deshabilita las acciones mientras está ocupada', async () => {
    renderCard(recoleccion(), { busy: true, canContact: true });
    expect(screen.getByRole('button', { name: 'Iniciar ruta' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Contactar' })).toBeDisabled();
  });
});
