import { useCallback, useState } from 'react';

export interface ToastState {
  visible: boolean;
  message: string;
  type: 'success' | 'error' | 'info';
}

// Shared toast state + handlers used by every screen that surfaces transient
// messages (R2-3): keeps the show/hide logic and the state shape in one place
// instead of duplicating them per screen.
export function useToast(): {
  toast: ToastState;
  showToast: (message: string, type: ToastState['type']) => void;
  hideToast: () => void;
} {
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: '',
    type: 'info',
  });

  const showToast = useCallback((message: string, type: ToastState['type']) => {
    setToast({ visible: true, message, type });
  }, []);

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  return { toast, showToast, hideToast };
}
