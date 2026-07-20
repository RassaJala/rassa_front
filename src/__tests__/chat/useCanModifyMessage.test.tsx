/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import { renderHook } from '@testing-library/react-native';

import { useCanModifyMessage } from '@/features/chat/hooks/useCanModifyMessage';
import type { Message } from '@/types/chat';

const baseMessage: Message = {
  id: 1,
  conversacion: 1,
  remitente: 1,
  remitente_nombre: 'Test',
  contenido: 'Hello',
  creado_en: new Date().toISOString(),
  leido: true,
};

describe('useCanModifyMessage', () => {
  it('allows edit/delete for recent messages', () => {
    const { result } = renderHook(() =>
      useCanModifyMessage({
        ...baseMessage,
        creado_en: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 min ago
      }),
    );

    expect(result.current.canEdit).toBe(true);
    expect(result.current.canDelete).toBe(true);
    expect(result.current.timeRemainingMs).toBeGreaterThan(0);
  });

  it('disables edit/delete for old messages', () => {
    const { result } = renderHook(() =>
      useCanModifyMessage({
        ...baseMessage,
        creado_en: new Date(Date.now() - 20 * 60 * 1000).toISOString(), // 20 min ago
      }),
    );

    expect(result.current.canEdit).toBe(false);
    expect(result.current.canDelete).toBe(false);
    expect(result.current.timeRemainingMs).toBe(0);
  });

  it('allows edit/delete at exactly 14 minutes', () => {
    const { result } = renderHook(() =>
      useCanModifyMessage({
        ...baseMessage,
        creado_en: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
      }),
    );

    expect(result.current.canEdit).toBe(true);
    expect(result.current.canDelete).toBe(true);
  });

  it('disables at exactly 15 minutes', () => {
    const { result } = renderHook(() =>
      useCanModifyMessage({
        ...baseMessage,
        creado_en: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      }),
    );

    expect(result.current.canEdit).toBe(false);
    expect(result.current.canDelete).toBe(false);
  });
});
