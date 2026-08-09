/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import React from 'react';

import { render } from '@testing-library/react-native';
import '@testing-library/jest-native/extend-expect';

import ChatBubble from '@/features/chat/components/ChatBubble';
import type { Message } from '@/types/chat';

jest.mock('@/store/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, nombre: 'Test User' },
  }),
}));

jest.mock('@/store/ThemeContext', () => ({
  useTheme: () => ({
    colorScheme: 'light',
    themePreference: 'system',
    isLoaded: true,
    toggleColorScheme: jest.fn(),
    setThemePreference: jest.fn(),
  }),
}));

const ownMessage: Message = {
  id: 1,
  conversacion: 1,
  remitente: 1,
  remitente_nombre: 'Test User',
  contenido: 'Hello',
  creado_en: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  leido: true,
};

const otherMessage: Message = {
  id: 2,
  conversacion: 1,
  remitente: 2,
  remitente_nombre: 'Other User',
  contenido: 'Hi there',
  creado_en: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  leido: true,
};

const deletedMessage: Message = {
  ...ownMessage,
  id: 3,
  activo: false,
};

const editedMessage: Message = {
  ...ownMessage,
  id: 4,
  editado: true,
};

const oldMessage: Message = {
  ...ownMessage,
  id: 5,
  creado_en: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
};

describe('ChatBubble', () => {
  it('renders message content', () => {
    const { getByText } = render(
      <ChatBubble message={ownMessage} isOwn={true} />,
    );
    expect(getByText('Hello')).toBeTruthy();
  });

  it('shows "editado" label when message.editado is true', () => {
    const { getByText } = render(
      <ChatBubble message={editedMessage} isOwn={true} />,
    );
    expect(getByText(/editado/)).toBeTruthy();
  });

  it('does not show "editado" when message.editado is false', () => {
    const { queryByText } = render(
      <ChatBubble message={ownMessage} isOwn={true} />,
    );
    expect(queryByText(/editado/)).toBeNull();
  });

  it('shows "Mensaje eliminado" for deleted messages', () => {
    const { getByText } = render(
      <ChatBubble message={deletedMessage} isOwn={true} />,
    );
    expect(getByText('Mensaje eliminado')).toBeTruthy();
  });

  it('does not show content for deleted messages', () => {
    const { queryByText } = render(
      <ChatBubble message={deletedMessage} isOwn={true} />,
    );
    expect(queryByText('Hello')).toBeNull();
  });

  it('shows sender name for other user messages', () => {
    const { getByText } = render(
      <ChatBubble message={otherMessage} isOwn={false} />,
    );
    expect(getByText('Other User')).toBeTruthy();
  });

  it('does not show sender name for own messages', () => {
    const { queryByText } = render(
      <ChatBubble message={ownMessage} isOwn={true} />,
    );
    expect(queryByText('Test User')).toBeNull();
  });

  it('renders old message without crashing', () => {
    const { getByText } = render(
      <ChatBubble message={oldMessage} isOwn={true} />,
    );
    expect(getByText('Hello')).toBeTruthy();
  });
});
