import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TOAST_DISMISS_MS, TOAST_EXIT_MS } from '../../constants/api';
import { Toast, type ToastState } from './Toast';

vi.mock('../../hooks/useAppColors', () => ({
  useAppColors: () => ({
    isDark: false,
    brand: '#24563C',
    coral: '#DE393A',
    muted: '#5E6B5E',
    border: '#E2E6DF',
    inputBorder: '#D6DAD4',
    surface: '#FFFFFF',
    bg: '#F5F7F0',
    fg: '#2D3328',
    accentBg: 'rgba(36,86,60,0.07)',
  }),
}));

function makeToast(overrides: Partial<ToastState> = {}): ToastState {
  return { message: 'Test message', type: 'success', ...overrides };
}

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders message text', () => {
    render(<Toast toast={makeToast()} onDone={vi.fn()} />);
    expect(screen.getByText('Test message')).toBeDefined();
  });

  it('returns null when toast is null', () => {
    const { container } = render(<Toast toast={null} onDone={vi.fn()} />);
    expect(container.innerHTML).toBe('');
  });

  it('auto-dismisses after default time for success type', () => {
    const onDone = vi.fn();
    render(<Toast toast={makeToast()} onDone={onDone} />);
    act(() => { vi.advanceTimersByTime(100); });
    act(() => { vi.advanceTimersByTime(TOAST_DISMISS_MS); });
    act(() => { vi.advanceTimersByTime(TOAST_EXIT_MS); });
    expect(onDone).toHaveBeenCalledOnce();
  });

  it('auto-dismisses after double time for error type', () => {
    const onDone = vi.fn();
    render(<Toast toast={makeToast({ type: 'error' })} onDone={onDone} />);
    act(() => { vi.advanceTimersByTime(100); });
    act(() => { vi.advanceTimersByTime(TOAST_DISMISS_MS * 2); });
    act(() => { vi.advanceTimersByTime(TOAST_EXIT_MS); });
    expect(onDone).toHaveBeenCalledOnce();
  });

  it('dismiss button on error type calls onDone', () => {
    const onDone = vi.fn();
    render(<Toast toast={makeToast({ type: 'error' })} onDone={onDone} />);
    act(() => { vi.advanceTimersByTime(100); });
    act(() => { screen.getByText('✕').click(); });
    act(() => { vi.advanceTimersByTime(TOAST_EXIT_MS); });
    expect(onDone).toHaveBeenCalledOnce();
  });

  it('shows dismiss button only for error type', () => {
    const { rerender } = render(
      <Toast toast={makeToast({ type: 'success' })} onDone={vi.fn()} />,
    );
    expect(screen.queryByText('✕')).toBeNull();
    rerender(<Toast toast={makeToast({ type: 'error' })} onDone={vi.fn()} />);
    expect(screen.getByText('✕')).toBeDefined();
  });

  it('handles toast replacement before dismiss', () => {
    const onDoneA = vi.fn();
    const onDoneB = vi.fn();
    const { rerender } = render(
      <Toast toast={makeToast({ message: 'A' })} onDone={onDoneA} />,
    );
    act(() => { vi.advanceTimersByTime(100); });
    rerender(
      <Toast toast={makeToast({ message: 'B' })} onDone={onDoneB} />,
    );
    act(() => { vi.advanceTimersByTime(TOAST_DISMISS_MS); });
    act(() => { vi.advanceTimersByTime(TOAST_EXIT_MS); });
    expect(onDoneA).not.toHaveBeenCalled();
    expect(onDoneB).toHaveBeenCalledOnce();
  });

  it('handles success type', () => {
    render(<Toast toast={makeToast({ type: 'success' })} onDone={vi.fn()} />);
    expect(screen.getByText('Test message')).toBeDefined();
  });

  it('handles error type', () => {
    render(<Toast toast={makeToast({ type: 'error' })} onDone={vi.fn()} />);
    expect(screen.getByText('Test message')).toBeDefined();
  });
});
