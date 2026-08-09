/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import React from 'react';

import { render } from '@testing-library/react-native';
import '@testing-library/jest-native/extend-expect';

import ConversationItem from '@/features/chat/components/ConversationItem';
import type { Conversation } from '@/types/chat';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('@/store/ThemeContext', () => ({
  useTheme: () => ({ colorScheme: 'light' }),
}));

const emptyNameConversation: Conversation = {
  id: 1,
  nombre: '',
  tipo: 'privada',
  es_familia: false,
  ultimo_mensaje: null,
  ultimo_mensaje_fecha: null,
  no_leidos: 0,
  participante_nombre: '',
  participante_avatar: null,
};

describe('ConversationItem', () => {
  it('renders ? initials when participante_nombre is empty', () => {
    const { getByText } = render(
      <ConversationItem conversation={emptyNameConversation} />,
    );
    expect(getByText('?')).toBeTruthy();
  });
});
