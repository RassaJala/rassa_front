import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ChatBubble } from '../ChatBubble';
import type { Message } from '@rassa/chat';

vi.mock('~/hooks/useAppColors', () => ({
  useAppColors: () => ({
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
});
