import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { SearchUser } from '@rassa/chat';
import { CreateGroupPage } from '../chat/CreateGroupPage';

vi.mock('~/hooks/useAppColors', () => ({
  useAppColors: () => ({
    brand: '#24563C',
    coral: '#DE393A',
    muted: '#5E6B5E',
    border: '#E2E6DF',
    inputBorder: '#D6DAD4',
    surface: '#FFFFFF',
    fg: '#2D3328',
    bg: '#F5F7F0',
  }),
}));

vi.mock('~/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 1, rol: 'agricultor' } }),
}));

const mockCreateGroup = vi.fn();
vi.mock('~/hooks/chat/useCreateGroup', () => ({
  useCreateGroup: () => ({ mutate: mockCreateGroup, isPending: false }),
}));

const mockSearchUsers = vi.fn();
vi.mock('~/hooks/chat/useSearchUsers', () => ({
  useSearchUsers: (query: string) => mockSearchUsers(query),
}));

const jane: SearchUser = {
  idUsuario: 2,
  nombreCompleto: 'Jane Doe',
  correo: 'jane@test.com',
  rol: 'Agricultor',
};

const john: SearchUser = {
  idUsuario: 3,
  nombreCompleto: 'John Smith',
  correo: 'john@test.com',
  rol: 'Vendedor',
};

function renderPage() {
  return render(
    <MemoryRouter>
      <CreateGroupPage />
    </MemoryRouter>,
  );
}

describe('CreateGroupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchUsers.mockReturnValue({
      results: [jane, john],
      loading: false,
      error: null,
    });
  });

  it('disables create button without name or members', () => {
    renderPage();
    expect(screen.getByText('Crear grupo')).toBeDisabled();
  });

  it('creates group with selected members', () => {
    renderPage();

    fireEvent.change(screen.getByLabelText('Nombre del grupo'), {
      target: { value: 'Mi grupo' },
    });

    const input = screen.getByLabelText('Buscar usuario');
    fireEvent.change(input, { target: { value: 'jane' } });
    fireEvent.click(screen.getByLabelText('Seleccionar Jane Doe'));

    fireEvent.change(input, { target: { value: 'john' } });
    fireEvent.click(screen.getByLabelText('Seleccionar John Smith'));

    fireEvent.click(screen.getByText('Crear grupo'));

    expect(mockCreateGroup).toHaveBeenCalledWith(
      { nombre: 'Mi grupo', fk_usuarios: [2, 3] },
      expect.objectContaining({ onError: expect.any(Function) }),
    );
  });

  it('removes a member chip when toggled again', () => {
    renderPage();

    const input = screen.getByLabelText('Buscar usuario');
    fireEvent.change(input, { target: { value: 'jane' } });
    fireEvent.click(screen.getByLabelText('Seleccionar Jane Doe'));

    expect(screen.getByLabelText('Quitar Jane Doe')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Quitar Jane Doe'));
    expect(screen.queryByLabelText('Quitar Jane Doe')).not.toBeInTheDocument();
  });
});
