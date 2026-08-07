import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import { ChatListPage } from '../ChatListPage';

let mockData: {
  results: { id: number; nombre: string; tipo: string }[];
} | null;
let mockError: Error | null;
let mockIsLoading: boolean;
let mockIsFetching: boolean;
let mockRefetch: ReturnType<typeof vi.fn>;

vi.mock('~/hooks/chat/useConversations', () => ({
  useConversations: () => ({
    data: mockData,
    isLoading: mockIsLoading,
    error: mockError,
    refetch: mockRefetch,
    isFetching: mockIsFetching,
  }),
}));

vi.mock('~/hooks/useAuth', () => ({
  useAuth: () => ({ user: { rol: 'vendedor' } }),
}));

vi.mock('~/components/chat/ConversationItem', () => ({
  ConversationItem: ({
    conversation,
  }: {
    conversation: { nombre: string };
  }) => <div>{conversation.nombre}</div>,
}));

vi.mock('~/hooks/useAppColors', () => ({
  useAppColors: () => ({
    brand: '#24563C',
    onBrand: '#FFFFFF',
    coral: '#DE393A',
    muted: '#5E6B5E',
    border: '#E2E6DF',
    inputBorder: '#D6DAD4',
    surface: '#FFFFFF',
    bg: '#F5F7F0',
    fg: '#2D3328',
    accentBg: 'rgba(0,0,0,0.05)',
    isDark: false,
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await import('react-router-dom');
  return {
    ...actual,
    MemoryRouter: ({ children }: { children: ReactNode }) => (
      <div>{children}</div>
    ),
    useNavigate: () => vi.fn(),
  };
});

function renderPage() {
  return render(
    <MemoryRouter>
      <ChatListPage />
    </MemoryRouter>,
  );
}

describe('ChatListPage — non-blocking error banner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockData = null;
    mockError = null;
    mockIsLoading = false;
    mockIsFetching = false;
    mockRefetch = vi.fn().mockResolvedValue(undefined);
  });

  it('shows cached conversations plus a non-blocking banner when refetch fails', () => {
    // MAJOR #5 (R3-002): with cached data + error, the list stays visible and an
    // error banner is shown instead of replacing the whole screen.
    mockData = { results: [{ id: 1, nombre: 'Conexión', tipo: 'privada' }] };
    mockError = new Error('Error de red');

    renderPage();

    expect(screen.getByText('Error al cargar conversaciones')).toBeTruthy();
    expect(screen.getByText('Reintentar')).toBeTruthy();
    expect(screen.getByText('Conexión')).toBeTruthy();
  });

  it('disables retry and shows "Reintentando…" while refetching with cached data', () => {
    mockData = { results: [{ id: 2, nombre: 'Grupo', tipo: 'grupal' }] };
    mockError = new Error('Error transitorio');
    mockIsFetching = true;

    renderPage();

    expect(screen.getByText('Reintentando…')).toBeTruthy();
    const retry = screen.getByRole('button', {
      name: 'Reintentar cargar conversaciones',
    });
    expect((retry as HTMLButtonElement).disabled).toBe(true);
  });

  it('hides the banner when a retry succeeds', () => {
    mockData = { results: [{ id: 3, nombre: 'Fam', tipo: 'privada' }] };
    mockError = new Error('Error');

    const { unmount } = renderPage();
    expect(screen.queryByText('Error al cargar conversaciones')).not.toBeNull();

    // Simulate a successful refetch: clear the error on the next render.
    mockError = null;
    unmount();
    renderPage();

    expect(screen.queryByText('Error al cargar conversaciones')).toBeNull();
  });
});
