import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ChatBubble } from '../ChatBubble';
import type { Message } from '@rassa/chat';

vi.mock('~/hooks/useAppColors', () => ({
  useAppColors: () => ({
    isDark: false,
    brand: '#24563C',
    onBrand: '#FFFFFF',
    coral: '#DE393A',
    muted: '#5E6B5E',
    border: '#E2E6DF',
    surface: '#FFFFFF',
    fg: '#2D3328',
  }),
}));

vi.mock('~/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 1, nombre: 'Test', rol: 'comprador' } }),
}));

vi.mock('~/hooks/chat/useCanModifyMessage', () => ({
  useCanModifyMessage: () => ({ canEdit: true, canDelete: true }),
}));

vi.mock('@rassa/chat', () => ({
  formatMessageTime: () => '12:00',
}));

const baseMessage: Message = {
  id: 1,
  conversacion: 1,
  remitente: 1,
  remitente_nombre: 'Test User',
  contenido: 'Hello world',
  creado_en: '2026-07-30T12:00:00Z',
  leido: true,
};

describe('ChatBubble', () => {
  it('renders message content', () => {
    render(
      <ChatBubble message={baseMessage} onEdit={vi.fn()} onDelete={vi.fn()} />,
    );
    expect(screen.getByText('Hello world')).toBeDefined();
  });

  it('applies white gradient background with shadow to own bubble in light mode', () => {
    render(
      <ChatBubble message={baseMessage} onEdit={vi.fn()} onDelete={vi.fn()} />,
    );
    const bubble = screen.getByText('Hello world').parentElement as HTMLElement;
    expect(bubble.style.background).toContain('linear-gradient');
    expect(bubble.style.background).toContain('rgb(255, 255, 255)');
    expect(bubble.style.boxShadow).toContain('rgba');
    expect(bubble.style.border).toContain('2px solid');
  });

  it('applies shadow to other bubble in light mode', () => {
    const otherMessage: Message = { ...baseMessage, remitente: 2 };
    render(
      <ChatBubble message={otherMessage} onEdit={vi.fn()} onDelete={vi.fn()} />,
    );
    const bubble = screen.getByText('Hello world').parentElement as HTMLElement;
    expect(bubble.style.boxShadow).toContain('rgba');
  });

  it('shows own message with justify-end alignment', () => {
    const { container } = render(
      <ChatBubble message={baseMessage} onEdit={vi.fn()} onDelete={vi.fn()} />,
    );
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv.className).toContain('justify-end');
  });

  it('shows other message with justify-start alignment', () => {
    const otherMessage: Message = { ...baseMessage, remitente: 2 };
    const { container } = render(
      <ChatBubble message={otherMessage} onEdit={vi.fn()} onDelete={vi.fn()} />,
    );
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv.className).toContain('justify-start');
  });

  it('shows sender name for other messages', () => {
    const otherMessage: Message = { ...baseMessage, remitente: 2 };
    render(
      <ChatBubble message={otherMessage} onEdit={vi.fn()} onDelete={vi.fn()} />,
    );
    expect(screen.getByText('Test User')).toBeDefined();
  });

  it('does not show sender name for own messages', () => {
    render(
      <ChatBubble message={baseMessage} onEdit={vi.fn()} onDelete={vi.fn()} />,
    );
    expect(screen.queryByText('Test User')).toBeNull();
  });

  it('shows editado label when message.editado is true', () => {
    const editedMessage: Message = { ...baseMessage, editado: true };
    render(
      <ChatBubble
        message={editedMessage}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText('(editado)')).toBeDefined();
  });

  it('renders nothing when activo is false', () => {
    const inactiveMessage: Message = { ...baseMessage, activo: false };
    const { container } = render(
      <ChatBubble
        message={inactiveMessage}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('shows context menu button only for own editable messages', () => {
    render(
      <ChatBubble message={baseMessage} onEdit={vi.fn()} onDelete={vi.fn()} />,
    );
    expect(screen.getByLabelText('Opciones de mensaje')).toBeDefined();
  });

  it('does not show context menu for other messages', () => {
    const otherMessage: Message = { ...baseMessage, remitente: 2 };
    render(
      <ChatBubble message={otherMessage} onEdit={vi.fn()} onDelete={vi.fn()} />,
    );
    expect(screen.queryByLabelText('Opciones de mensaje')).toBeNull();
  });

  it('shows Editar and Eliminar in context menu', () => {
    render(
      <ChatBubble message={baseMessage} onEdit={vi.fn()} onDelete={vi.fn()} />,
    );
    fireEvent.click(screen.getByLabelText('Opciones de mensaje'));
    expect(screen.getByText('Editar')).toBeDefined();
    expect(screen.getByText('Eliminar')).toBeDefined();
  });

  it('calls onEdit when Editar is clicked', () => {
    const onEdit = vi.fn();
    render(
      <ChatBubble message={baseMessage} onEdit={onEdit} onDelete={vi.fn()} />,
    );
    fireEvent.click(screen.getByLabelText('Opciones de mensaje'));
    fireEvent.click(screen.getByText('Editar'));
    expect(onEdit).toHaveBeenCalledWith(baseMessage);
  });

  it('calls onDelete when Eliminar is clicked', () => {
    const onDelete = vi.fn();
    render(
      <ChatBubble message={baseMessage} onEdit={vi.fn()} onDelete={onDelete} />,
    );
    fireEvent.click(screen.getByLabelText('Opciones de mensaje'));
    fireEvent.click(screen.getByText('Eliminar'));
    expect(onDelete).toHaveBeenCalledWith(baseMessage.id);
  });

  it('renders image attachment with download button', () => {
    const message: Message = {
      ...baseMessage,
      adjuntos: [
        {
          id: 1,
          mensaje: 1,
          archivo: '/documentos/foto.jpg',
          tipo: 'imagen',
          nombre: 'foto.jpg',
          tamaño: 0,
        },
      ],
    };
    render(
      <ChatBubble message={message} onEdit={vi.fn()} onDelete={vi.fn()} />,
    );
    expect(screen.getByAltText('foto.jpg')).toBeDefined();
    expect(screen.getByLabelText('Descargar imagen')).toBeDefined();
  });

  it('reserves fixed height for image attachments to avoid layout shift', () => {
    const message: Message = {
      ...baseMessage,
      adjuntos: [
        {
          id: 6,
          mensaje: 1,
          archivo: '/documentos/foto.jpg',
          tipo: 'imagen',
          nombre: 'foto.jpg',
          tamaño: 0,
        },
      ],
    };
    const { container } = render(
      <ChatBubble message={message} onEdit={vi.fn()} onDelete={vi.fn()} />,
    );
    const img = container.querySelector('img') as HTMLImageElement;
    const wrapper = img.parentElement as HTMLElement;
    expect(wrapper.style.height).toBe('240px');
  });

  it('calls onMediaLoad when an image finishes loading', () => {
    const onMediaLoad = vi.fn();
    const message: Message = {
      ...baseMessage,
      adjuntos: [
        {
          id: 7,
          mensaje: 1,
          archivo: '/documentos/foto.jpg',
          tipo: 'imagen',
          nombre: 'foto.jpg',
          tamaño: 0,
        },
      ],
    };
    const { container } = render(
      <ChatBubble
        message={message}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onMediaLoad={onMediaLoad}
      />,
    );
    const img = container.querySelector('img') as HTMLImageElement;
    fireEvent.load(img);
    expect(onMediaLoad).toHaveBeenCalledTimes(1);
  });

  it('calls onMediaLoad when an image fails to load', () => {
    const onMediaLoad = vi.fn();
    const message: Message = {
      ...baseMessage,
      adjuntos: [
        {
          id: 8,
          mensaje: 1,
          archivo: '/documentos/foto.jpg',
          tipo: 'imagen',
          nombre: 'foto.jpg',
          tamaño: 0,
        },
      ],
    };
    const { container } = render(
      <ChatBubble
        message={message}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onMediaLoad={onMediaLoad}
      />,
    );
    const img = container.querySelector('img') as HTMLImageElement;
    fireEvent.error(img);
    expect(onMediaLoad).toHaveBeenCalledTimes(1);
  });

  it('opens image modal when image is clicked', () => {
    const message: Message = {
      ...baseMessage,
      adjuntos: [
        {
          id: 4,
          mensaje: 1,
          archivo: '/documentos/foto.jpg',
          tipo: 'imagen',
          nombre: 'foto.jpg',
          tamaño: 0,
        },
      ],
    };
    render(
      <ChatBubble message={message} onEdit={vi.fn()} onDelete={vi.fn()} />,
    );
    fireEvent.click(screen.getByAltText('foto.jpg'));
    expect(screen.getByAltText('Imagen ampliada: foto.jpg')).toBeDefined();
  });

  it('shows message text in image modal', () => {
    const message: Message = {
      ...baseMessage,
      adjuntos: [
        {
          id: 5,
          mensaje: 1,
          archivo: '/documentos/foto.jpg',
          tipo: 'imagen',
          nombre: 'foto.jpg',
          tamaño: 0,
        },
      ],
    };
    render(
      <ChatBubble message={message} onEdit={vi.fn()} onDelete={vi.fn()} />,
    );
    fireEvent.click(screen.getByAltText('foto.jpg'));
    expect(screen.getAllByText('Hello world').length).toBeGreaterThanOrEqual(2);
  });

  it('renders video attachment with player and download button', () => {
    const message: Message = {
      ...baseMessage,
      adjuntos: [
        {
          id: 2,
          mensaje: 1,
          archivo: '/documentos/clip.mp4',
          tipo: 'video',
          nombre: 'clip.mp4',
          tamaño: 0,
        },
      ],
    };
    const { container } = render(
      <ChatBubble message={message} onEdit={vi.fn()} onDelete={vi.fn()} />,
    );
    expect(container.querySelector('video')).toBeDefined();
    expect(screen.getByLabelText('Descargar video')).toBeDefined();
  });

  it('calls onMediaLoad when video metadata loads', () => {
    const onMediaLoad = vi.fn();
    const message: Message = {
      ...baseMessage,
      adjuntos: [
        {
          id: 9,
          mensaje: 1,
          archivo: '/documentos/clip.mp4',
          tipo: 'video',
          nombre: 'clip.mp4',
          tamaño: 0,
        },
      ],
    };
    const { container } = render(
      <ChatBubble
        message={message}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onMediaLoad={onMediaLoad}
      />,
    );
    const video = container.querySelector('video') as HTMLVideoElement;
    fireEvent(video, new Event('loadedmetadata'));
    expect(onMediaLoad).toHaveBeenCalledTimes(1);
  });

  it('renders audio attachment with download button', () => {
    const message: Message = {
      ...baseMessage,
      adjuntos: [
        {
          id: 3,
          mensaje: 1,
          archivo: '/documentos/audio.mp3',
          tipo: 'audio',
          nombre: 'audio.mp3',
          tamaño: 0,
        },
      ],
    };
    const { container } = render(
      <ChatBubble message={message} onEdit={vi.fn()} onDelete={vi.fn()} />,
    );
    expect(screen.getByLabelText('Descargar audio')).toBeDefined();
    const audio = container.querySelector('audio') as HTMLAudioElement;
    expect(audio.className).toContain('msg-audio');
    expect(audio.style.getPropertyValue('--msg-audio-accent')).toBeTruthy();
  });
});
