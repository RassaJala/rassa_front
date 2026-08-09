import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ThemeProvider } from '../../../providers/ThemeProvider';
import {
  type AgricultorListItem,
  type AgricultorUbicacion,
} from '../../../hooks/useAgricultoresUbicacion';
import { recoleccionDuplicateKey } from '../../../utils/recolecciones';
import { AgricultorSelector } from '../AgricultorSelector';

const juan: AgricultorListItem = {
  id_usuario: 10,
  nombre: 'Juan',
  apellido_paterno: 'Pérez',
  apellido_materno: 'López',
  role: 'farmer',
  localidad: 1,
};

const ana: AgricultorListItem = {
  id_usuario: 11,
  nombre: 'Ana',
  apellido_paterno: 'Ramírez',
  apellido_materno: null,
  role: 'farmer',
  localidad: 1,
};

const grupos: AgricultorUbicacion[] = [
  {
    municipioNombre: 'Jalisco',
    localidades: [
      {
        localidadNombre: 'Guadalajara',
        agricultores: [juan, ana],
      },
    ],
  },
];

const FECHA = '2026-08-01';

function renderSelector(
  overrides: Partial<Parameters<typeof AgricultorSelector>[0]> = {},
) {
  const onRetry = vi.fn();
  const onSelect = vi.fn();
  const view = render(
    <ThemeProvider>
      <AgricultorSelector
        grupos={grupos}
        isLoading={false}
        isError={false}
        truncated={false}
        errores={0}
        selectedId={null}
        duplicateKeys={new Set()}
        fecha={FECHA}
        onRetry={onRetry}
        onSelect={onSelect}
        {...overrides}
      />
    </ThemeProvider>,
  );
  return { onRetry, onSelect, container: view.container };
}

describe('AgricultorSelector', () => {
  it('muestra el spinner mientras carga', () => {
    const { container } = renderSelector({ isLoading: true, grupos: [] });
    expect(container.querySelector('.animate-spin')).not.toBeNull();
    expect(
      screen.queryByText('No se encontraron agricultores.'),
    ).not.toBeInTheDocument();
  });

  it('muestra error y botón Reintentar cuando falla la carga', async () => {
    const { onRetry } = renderSelector({ isError: true, grupos: [] });
    expect(
      screen.getByText('Error al cargar agricultores.'),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('avisa cuando la lista está truncada', async () => {
    const { onRetry } = renderSelector({ truncated: true });
    expect(
      screen.getByText('Solo se muestran los primeros agricultores.'),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('avisa cuando hubo errores parciales', () => {
    renderSelector({ errores: 2 });
    expect(
      screen.getByText('Algunos agricultores no se pudieron cargar.'),
    ).toBeInTheDocument();
  });

  it('muestra mensaje cuando no hay agricultores', () => {
    renderSelector({ grupos: [] });
    expect(
      screen.getByText('No se encontraron agricultores.'),
    ).toBeInTheDocument();
  });

  it('agrupa agricultores por municipio y localidad', () => {
    renderSelector();
    expect(screen.getByText('Jalisco')).toBeInTheDocument();
    expect(screen.getByText('Guadalajara')).toBeInTheDocument();
    expect(screen.getByText('Juan Pérez López')).toBeInTheDocument();
    expect(screen.getByText('Ana Ramírez')).toBeInTheDocument();
  });

  it('notifica la selección con el agricultor completo', async () => {
    const { onSelect } = renderSelector();
    await userEvent.click(
      screen.getByRole('button', { name: /Juan Pérez López/ }),
    );
    expect(onSelect).toHaveBeenCalledWith(juan);
  });

  it('marca a los agricultores con recolección duplicada', () => {
    renderSelector({
      duplicateKeys: new Set([recoleccionDuplicateKey(10, FECHA)]),
    });
    const juanRow = screen.getByRole('button', { name: /Juan Pérez López/ });
    expect(juanRow).toHaveTextContent('Ya tiene recolección');
    const anaRow = screen.getByRole('button', { name: /Ana Ramírez/ });
    expect(anaRow).not.toHaveTextContent('Ya tiene recolección');
  });
});
