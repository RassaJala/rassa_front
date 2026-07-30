import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ChatInput } from '../ChatInput';

vi.mock('~/hooks/useAppColors', () => ({
  useAppColors: () => ({
    brand: '#24563C',
    border: '#E2E6DF',
    inputBorder: '#D6DAD4',
    bg: '#F5F7F0',
    surface: '#FFFFFF',
    muted: '#5E6B5E',
    fg: '#2D3328',
  }),
}));

describe('ChatInput', () => {
  it('renders input and send button', () => {
    render(<ChatInput onSend={vi.fn()} />);
    expect(screen.getByPlaceholderText('Escribí un mensaje...')).toBeDefined();
    expect(screen.getByLabelText('Enviar mensaje')).toBeDefined();
  });

  it('calls onSend with trimmed text on Enter', () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);
    const input = screen.getByPlaceholderText('Escribí un mensaje...');
    fireEvent.change(input, { target: { value: 'Hola' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSend).toHaveBeenCalledWith('Hola');
  });

  it('does not call onSend when text is empty', () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);
    const input = screen.getByPlaceholderText('Escribí un mensaje...');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSend).not.toHaveBeenCalled();
  });

  it('does not call onSend when text is only whitespace', () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);
    const input = screen.getByPlaceholderText('Escribí un mensaje...');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSend).not.toHaveBeenCalled();
  });

  it('does not call onSend on Shift+Enter', () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);
    const input = screen.getByPlaceholderText('Escribí un mensaje...');
    fireEvent.change(input, { target: { value: 'Hola' } });
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();
  });

  it('disables input and button when disabled prop is true', () => {
    render(<ChatInput onSend={vi.fn()} disabled />);
    expect(screen.getByPlaceholderText('Escribí un mensaje...')).toBeDisabled();
    expect(screen.getByLabelText('Enviar mensaje')).toBeDisabled();
  });

  it('send button is disabled when text is empty', () => {
    render(<ChatInput onSend={vi.fn()} />);
    expect(screen.getByLabelText('Enviar mensaje')).toBeDisabled();
  });

  it('send button is enabled when text is not empty', () => {
    render(<ChatInput onSend={vi.fn()} />);
    const input = screen.getByPlaceholderText('Escribí un mensaje...');
    fireEvent.change(input, { target: { value: 'Hola' } });
    expect(screen.getByLabelText('Enviar mensaje')).toBeEnabled();
  });

  it('clears input after sending', () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);
    const input = screen.getByPlaceholderText('Escribí un mensaje...');
    fireEvent.change(input, { target: { value: 'Hola' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(input).toHaveValue('');
  });
});
