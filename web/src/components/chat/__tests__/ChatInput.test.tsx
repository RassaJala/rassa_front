import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatInput } from '../ChatInput';

const { recorderState } = vi.hoisted(() => ({
  recorderState: {
    isSupported: true,
    isRecording: false,
    elapsed: 0,
    error: null as string | null,
    startRecording: vi.fn(async () => undefined),
    stopRecording: vi.fn(
      async () => new File(['chunk'], 'grabacion.webm', { type: 'audio/webm' }),
    ),
    cancelRecording: vi.fn(),
  },
}));

vi.mock('~/hooks/chat/useAudioRecorder', () => ({
  useAudioRecorder: () => recorderState,
}));

vi.mock('~/hooks/useAppColors', () => ({
  useAppColors: () => ({
    brand: '#24563C',
    border: '#E2E6DF',
    inputBorder: '#D6DAD4',
    bg: '#F5F7F0',
    surface: '#FFFFFF',
    muted: '#5E6B5E',
    fg: '#2D3328',
    coral: '#DE393A',
  }),
}));

describe('ChatInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    recorderState.isSupported = true;
    recorderState.isRecording = false;
    recorderState.error = null;
    recorderState.elapsed = 0;
  });

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

  it('renders mic button when onSendMedia is provided', () => {
    render(<ChatInput onSend={vi.fn()} onSendMedia={vi.fn()} />);
    expect(screen.getByLabelText('Grabar audio')).toBeDefined();
  });

  it('does not render mic button without onSendMedia', () => {
    render(<ChatInput onSend={vi.fn()} />);
    expect(screen.queryByLabelText('Grabar audio')).toBeNull();
  });

  it('starts recording when mic button is clicked', () => {
    render(<ChatInput onSend={vi.fn()} onSendMedia={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Grabar audio'));
    expect(recorderState.startRecording).toHaveBeenCalledTimes(1);
  });

  it('sends recorded audio without text on stop', async () => {
    recorderState.isRecording = true;
    const onSendMedia = vi.fn();
    render(<ChatInput onSend={vi.fn()} onSendMedia={onSendMedia} />);
    fireEvent.click(screen.getByLabelText('Detener y enviar audio'));
    await waitFor(() => expect(onSendMedia).toHaveBeenCalledTimes(1));
    expect(onSendMedia).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'audio/webm' }),
      'audio',
    );
  });

  it('cancels recording without sending', () => {
    recorderState.isRecording = true;
    const onSendMedia = vi.fn();
    render(<ChatInput onSend={vi.fn()} onSendMedia={onSendMedia} />);
    fireEvent.click(screen.getByLabelText('Cancelar grabación'));
    expect(recorderState.cancelRecording).toHaveBeenCalledTimes(1);
    expect(onSendMedia).not.toHaveBeenCalled();
  });

  it('shows recording error message', () => {
    recorderState.error = 'Permiso de micrófono denegado.';
    render(<ChatInput onSend={vi.fn()} />);
    expect(screen.getByText('Permiso de micrófono denegado.')).toBeDefined();
  });
});
