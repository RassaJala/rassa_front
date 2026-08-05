import React from 'react';

import { Keyboard } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render } from '@testing-library/react-native';
import '@testing-library/jest-native/extend-expect';

import ChatScreen from '@/features/chat/screens/ChatScreen';

jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({
    params: {
      conversationId: 7,
      title: 'Mi chat',
      tipo: 'privada',
      isFamily: false,
    },
  }),
  useNavigation: () => ({ setOptions: jest.fn(), navigate: jest.fn() }),
}));

jest.mock('@/store/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, role: 'agricultor', nombre: 'Yo' } }),
}));

jest.mock('@/store/ThemeContext', () => ({
  useTheme: () => ({ colorScheme: 'light' }),
}));

const mockMarkAsRead = jest.fn();

jest.mock('@/features/chat/hooks/useMarkAsRead', () => ({
  useMarkAsRead: () => ({ mutate: mockMarkAsRead }),
}));

jest.mock('@/features/chat/hooks/useChatMessages', () => ({
  useChatMessages: () => ({
    data: { pages: [{ results: [] }] },
    isLoading: false,
    error: null,
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
  }),
}));

jest.mock('@/features/chat/hooks/useSendMessage', () => ({
  useSendMessage: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock('@/features/chat/hooks/useSendMessageWithMedia', () => ({
  useSendMessageWithMedia: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock('@/features/chat/hooks/useEditMessage', () => ({
  useEditMessage: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock('@/features/chat/hooks/useDeleteMessage', () => ({
  useDeleteMessage: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock('@/features/chat/components/ChatInput', () => () => null);
jest.mock('@/features/chat/components/ChatBubble', () => () => null);
jest.mock('@/features/chat/components/MessageEditModal', () => () => null);

describe('ChatScreen', () => {
  let keyboardSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    keyboardSpy = jest
      .spyOn(Keyboard, 'addListener')
      .mockReturnValue({ remove: jest.fn() } as unknown as ReturnType<
        typeof Keyboard.addListener
      >);
  });

  afterEach(() => {
    keyboardSpy.mockRestore();
    jest.useRealTimers();
  });

  it('marks the conversation as read with the conversation id shortly after opening', () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ChatScreen />
      </QueryClientProvider>,
    );

    expect(mockMarkAsRead).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(mockMarkAsRead).toHaveBeenCalledWith(7);
  });
});
