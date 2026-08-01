import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ChatListPage } from '../chat/ChatListPage';
import { StartChatPage } from '../chat/StartChatPage';
import { GroupDetailPage } from '../chat/GroupDetailPage';

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

const mockUseAuth = vi.fn();
vi.mock('~/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('~/hooks/chat/useConversations', () => ({
  useConversations: () => ({
    data: {
      results: [
        {
          id: 1,
          nombre: 'Mi grupo',
          tipo: 'grupal',
          es_familia: false,
          ultimo_mensaje: null,
          ultimo_mensaje_fecha: null,
          no_leidos: 0,
          participante_nombre: '',
          participante_avatar: null,
        },
      ],
    },
    isLoading: false,
    error: null,
  }),
}));

vi.mock('~/hooks/chat/useGroupMembers', () => ({
  useGroupMembers: () => ({ data: [], isLoading: false }),
}));

vi.mock('~/hooks/chat/useRenameGroup', () => ({
  useRenameGroup: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('~/hooks/chat/useAddGroupMember', () => ({
  useAddGroupMember: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('~/hooks/chat/useCreatePrivateConversation', () => ({
  useCreatePrivateConversation: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('~/hooks/chat/useSearchUsers', () => ({
  useSearchUsers: () => ({ results: [], loading: false, error: null }),
}));

describe('chat role gates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hides the "Nuevo chat" button for cliente users', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, rol: 'cliente' },
    });
    render(
      <MemoryRouter>
        <ChatListPage />
      </MemoryRouter>,
    );
    expect(screen.queryByText('Nuevo chat')).not.toBeInTheDocument();
  });

  it('shows the "Nuevo chat" button for agricultor users', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, rol: 'agricultor' },
    });
    render(
      <MemoryRouter>
        <ChatListPage />
      </MemoryRouter>,
    );
    expect(screen.getByText('Nuevo chat')).toBeInTheDocument();
  });

  it('blocks cliente users from the private chat form', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, rol: 'cliente' },
    });
    render(
      <MemoryRouter>
        <StartChatPage />
      </MemoryRouter>,
    );
    expect(
      screen.getByText(
        'Los clientes solo participan en conversaciones existentes.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('Iniciar chat')).not.toBeInTheDocument();
  });

  it('shows the private chat form for non-client users', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, rol: 'vendedor' },
    });
    render(
      <MemoryRouter>
        <StartChatPage />
      </MemoryRouter>,
    );
    expect(
      screen.getByText('Iniciar conversación privada'),
    ).toBeInTheDocument();
    expect(screen.getByText('Iniciar chat')).toBeInTheDocument();
  });

  it('hides rename and add-member buttons for cliente users', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, rol: 'cliente' },
    });
    render(
      <MemoryRouter initialEntries={['/chat/1/grupo']}>
        <GroupDetailPage />
      </MemoryRouter>,
    );
    expect(screen.queryByText('Renombrar')).not.toBeInTheDocument();
    expect(screen.queryByText('+ Miembro')).not.toBeInTheDocument();
  });

  it('shows rename and add-member buttons for non-client users', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, rol: 'admin' },
    });
    render(
      <MemoryRouter initialEntries={['/chat/1/grupo']}>
        <GroupDetailPage />
      </MemoryRouter>,
    );
    expect(screen.getByText('Renombrar')).toBeInTheDocument();
    expect(screen.getByText('+ Miembro')).toBeInTheDocument();
  });
});
