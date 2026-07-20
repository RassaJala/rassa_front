/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import React from 'react';

import { render } from '@testing-library/react-native';
import '@testing-library/jest-native/extend-expect';

import ChatBubble from '@/features/chat/components/ChatBubble';
import { ATTACHMENT_TYPES } from '@/types/chat';
import type { Message } from '@/types/chat';

jest.mock('@/store/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, nombre: 'Test User' },
  }),
}));

const imageMessage: Message = {
  id: 10,
  conversacion: 1,
  remitente: 1,
  remitente_nombre: 'Test User',
  contenido: '',
  creado_en: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  leido: true,
  adjuntos: [
    {
      id: 100,
      mensaje: 10,
      archivo: 'https://example.com/photo.jpg',
      tipo: ATTACHMENT_TYPES.IMAGEN,
      nombre: 'photo.jpg',
      tamaño: 1024000,
    },
  ],
};

const audioMessage: Message = {
  id: 11,
  conversacion: 1,
  remitente: 2,
  remitente_nombre: 'Other User',
  contenido: '',
  creado_en: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  leido: true,
  adjuntos: [
    {
      id: 101,
      mensaje: 11,
      archivo: 'https://example.com/voice.mp3',
      tipo: ATTACHMENT_TYPES.AUDIO,
      nombre: 'voice.mp3',
      tamaño: 512000,
    },
  ],
};

const videoMessage: Message = {
  id: 12,
  conversacion: 1,
  remitente: 1,
  remitente_nombre: 'Test User',
  contenido: '',
  creado_en: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  leido: true,
  adjuntos: [
    {
      id: 102,
      mensaje: 12,
      archivo: 'https://example.com/clip.mp4',
      tipo: ATTACHMENT_TYPES.VIDEO,
      nombre: 'clip.mp4',
      tamaño: 5120000,
    },
  ],
};

const textWithImageMessage: Message = {
  ...imageMessage,
  id: 13,
  contenido: 'Look at this!',
};

describe('ChatBubble — media', () => {
  it('renders image attachment', () => {
    const { getByLabelText } = render(
      <ChatBubble message={imageMessage} isOwn={true} />,
    );
    expect(getByLabelText('photo.jpg')).toBeTruthy();
  });

  it('renders audio attachment with filename', () => {
    const { getByText } = render(
      <ChatBubble message={audioMessage} isOwn={false} />,
    );
    expect(getByText('voice.mp3')).toBeTruthy();
  });

  it('renders video attachment with play icon', () => {
    const { getByLabelText } = render(
      <ChatBubble message={videoMessage} isOwn={true} />,
    );
    expect(getByLabelText('Reproducir video: clip.mp4')).toBeTruthy();
  });

  it('renders text content alongside attachment', () => {
    const { getByText } = render(
      <ChatBubble message={textWithImageMessage} isOwn={true} />,
    );
    expect(getByText('Look at this!')).toBeTruthy();
  });

  it('renders empty content message without crashing', () => {
    const { getByLabelText } = render(
      <ChatBubble message={imageMessage} isOwn={true} />,
    );
    expect(getByLabelText('photo.jpg')).toBeTruthy();
  });
});
