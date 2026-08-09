import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { SearchUser } from '@rassa/chat';
import { UserSearchSelect } from '../UserSearchSelect';

vi.mock('~/hooks/useAppColors', () => ({
  useAppColors: () => ({
    brand: '#24563C',
    coral: '#DE393A',
    muted: '#5E6B5E',
    border: '#E2E6DF',
    inputBorder: '#D6DAD4',
    surface: '#FFFFFF',
    accentBg: 'rgba(36,86,60,0.07)',
    fg: '#2D3328',
    bg: '#F5F7F0',
  }),
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

describe('UserSearchSelect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchUsers.mockReturnValue({
      results: [jane, john],
      loading: false,
      error: null,
    });
  });

  it('renders selected users as removable chips', () => {
    render(<UserSearchSelect selected={[jane]} onToggle={vi.fn()} />);
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Quitar Jane Doe'));
  });

  it('calls onToggle with the user when a chip is removed', () => {
    const onToggle = vi.fn();
    render(<UserSearchSelect selected={[jane]} onToggle={onToggle} />);
    fireEvent.click(screen.getByLabelText('Quitar Jane Doe'));
    expect(onToggle).toHaveBeenCalledWith(jane);
  });

  it('filters out already-selected users from results', () => {
    render(<UserSearchSelect selected={[jane]} onToggle={vi.fn()} />);
    const input = screen.getByLabelText('Buscar usuario');
    fireEvent.change(input, { target: { value: 'test' } });

    expect(
      screen.queryByLabelText('Seleccionar Jane Doe'),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText('Seleccionar John Smith')).toBeInTheDocument();
  });

  it('selects a user from the dropdown and clears the query', () => {
    const onToggle = vi.fn();
    render(<UserSearchSelect selected={[]} onToggle={onToggle} />);
    const input = screen.getByLabelText('Buscar usuario') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'test' } });

    fireEvent.click(screen.getByLabelText('Seleccionar John Smith'));
    expect(onToggle).toHaveBeenCalledWith(john);
    expect(input.value).toBe('');
  });

  it('does not show the dropdown for short queries', () => {
    render(<UserSearchSelect selected={[]} onToggle={vi.fn()} />);
    const input = screen.getByLabelText('Buscar usuario');
    fireEvent.change(input, { target: { value: 'ab' } });
    expect(
      screen.queryByLabelText('Seleccionar Jane Doe'),
    ).not.toBeInTheDocument();
  });

  it('shows the loading state', () => {
    mockSearchUsers.mockReturnValue({
      results: [],
      loading: true,
      error: null,
    });
    render(<UserSearchSelect selected={[]} onToggle={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Buscar usuario'), {
      target: { value: 'test' },
    });
    expect(screen.getByText('Buscando…')).toBeInTheDocument();
  });

  it('shows an error state', () => {
    mockSearchUsers.mockReturnValue({
      results: [],
      loading: false,
      error: 'Error al buscar usuarios',
    });
    render(<UserSearchSelect selected={[]} onToggle={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Buscar usuario'), {
      target: { value: 'test' },
    });
    expect(screen.getByText('Error al buscar usuarios')).toBeInTheDocument();
  });

  it('shows empty state when there are no results', () => {
    mockSearchUsers.mockReturnValue({
      results: [],
      loading: false,
      error: null,
    });
    render(<UserSearchSelect selected={[]} onToggle={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Buscar usuario'), {
      target: { value: 'test' },
    });
    expect(screen.getByText('Sin resultados')).toBeInTheDocument();
  });
});
