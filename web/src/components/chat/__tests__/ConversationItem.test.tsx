import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConversationItem } from '../ConversationItem';
import type { Conversation } from '@rassa/chat';
import { BrowserRouter } from 'react-router-dom';

vi.mock('~/hooks/useAppColors', () => ({
  useAppColors: () => ({
    brand: '#24563C',
    onBrand: '#FFFFFF',
    coral: '#DE393A',
    muted: '#5E6B5E',
    border: '#E2E6DF',
    surface: '#FFFFFF',
    fg: '#2D3328',
    bg: '#F5F7F0',
  }),
}));

vi.mock('~/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 1, nombre: 'Test', rol: 'comprador' } }),
}));

vi.mock('@rassa/chat', () => ({
  formatConversationTime: () => '12:00',
}));

const groupConversation: Conversation = {
  id: 1,
  tipo: 'grupal',
  nombre: 'Mi Grupo',
  participante_nombre: null,
  ultimo_mensaje: 'Último mensaje',
  ultimo_mensaje_fecha: '2026-07-30T12:00:00Z',
  no_leidos: 3,
};

const privateConversation: Conversation = {
  id: 2,
  tipo: 'privada',
  nombre: null,
  participante_nombre: 'Juan Pérez',
  ultimo_mensaje: 'Hola',
  ultimo_mensaje_fecha: '2026-07-29T10:00:00Z',
  no_leidos: 0,
};

function renderWithRouter(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

describe('ConversationItem', () => {
  it('renders group name for group conversations', () => {
    renderWithRouter(<ConversationItem conversation={groupConversation} />);
    expect(screen.getByText('Mi Grupo')).toBeDefined();
  });

  it('renders participant name for private conversations', () => {
    renderWithRouter(<ConversationItem conversation={privateConversation} />);
    expect(screen.getByText('Juan Pérez')).toBeDefined();
  });

  it('shows default name when group name is missing', () => {
    const noNameGroup: Conversation = { ...groupConversation, nombre: '' };
    renderWithRouter(<ConversationItem conversation={noNameGroup} />);
    expect(screen.getByText('Grupo')).toBeDefined();
  });

  it('shows default name when participant name is missing', () => {
    const noNamePrivate: Conversation = {
      ...privateConversation,
      participante_nombre: '',
    };
    renderWithRouter(<ConversationItem conversation={noNamePrivate} />);
    expect(screen.getByText('Sin nombre')).toBeDefined();
  });

  it('shows unread badge when no_leidos > 0', () => {
    renderWithRouter(<ConversationItem conversation={groupConversation} />);
    expect(screen.getByText('3')).toBeDefined();
  });

  it('does not show unread badge when no_leidos is 0', () => {
    renderWithRouter(<ConversationItem conversation={privateConversation} />);
    expect(screen.queryByText('0')).toBeNull();
  });

  it('renders the last message text', () => {
    renderWithRouter(<ConversationItem conversation={groupConversation} />);
    expect(screen.getByText('Último mensaje')).toBeDefined();
  });

  it('shows avatar initials', () => {
    renderWithRouter(<ConversationItem conversation={groupConversation} />);
    expect(screen.getByText('MI')).toBeDefined();
  });
});
