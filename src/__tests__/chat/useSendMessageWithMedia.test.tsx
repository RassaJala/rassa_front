/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import React from "react";
import { Text, View } from "react-native";

import { messagesKey } from "@rassa/chat";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, waitFor } from "@testing-library/react-native";
import "@testing-library/jest-native/extend-expect";

import { useSendMessageWithMedia } from "@/features/chat/hooks/useSendMessageWithMedia";
import api from "@/services/api";

jest.mock("@/services/api");
jest.mock("@/store/AuthContext", () => ({
  useAuth: () => ({
    user: { id: 1, nombre: "Test User" },
  }),
}));

const mockApiPost = api.post as jest.Mock;

// Backend returns partial response for media: {ok, data: {id_mensaje, id_documento, url_documento}}
const backendMediaResponse = {
  data: {
    ok: true,
    data: {
      id_mensaje: 100,
      id_documento: 200,
      url_documento: "documentos/test.jpg",
    },
  },
};

describe("useSendMessageWithMedia", () => {
  const existingMessages = {
    pages: [
      {
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            id: 1,
            conversacion: 1,
            remitente: 2,
            remitente_nombre: "Other",
            contenido: "Existing",
            creado_en: "2026-01-01T00:00:00Z",
            leido: true,
          },
        ],
      },
    ],
    pageParams: [1],
  };

  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity },
        mutations: { retry: false },
      },
    });
    queryClient.setQueryData(messagesKey(1), existingMessages);
  });

  const TestComponent = () => {
    const mutation = useSendMessageWithMedia(1);
    return (
      <View>
        <Text testID="pending">{String(mutation.isPending)}</Text>
        <Text
          testID="send-media"
          onPress={() =>
            mutation.mutate({
              conversacion: 1,
              contenido: "Check this",
              tipo_documento: "imagen",
              documento: {
                uri: "file:///test.jpg",
                name: "test.jpg",
                type: "image/jpeg",
              },
              remitente: 1,
              remitente_nombre: "Test User",
            })
          }
        >
          Send Media
        </Text>
      </View>
    );
  };

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <TestComponent />
      </QueryClientProvider>,
    );

  it("adds optimistic message immediately on mutate", async () => {
    mockApiPost.mockResolvedValue(backendMediaResponse);

    const { getByTestId } = renderComponent();

    await act(async () => {
      getByTestId("send-media").props.onPress();
    });

    const cached = queryClient.getQueryData<{
      pages: { results: { id: number; contenido: string }[] }[];
    }>(messagesKey(1));

    const allMessages = cached?.pages.flatMap((p) => p.results) ?? [];
    expect(allMessages.some((m) => m.contenido === "Check this")).toBe(true);
  });

  it("calls API with FormData via multipart endpoint", async () => {
    mockApiPost.mockResolvedValue(backendMediaResponse);

    const { getByTestId } = renderComponent();

    await act(async () => {
      getByTestId("send-media").props.onPress();
    });

    expect(mockApiPost).toHaveBeenCalledWith(
      "/chat/mensajes/enviar-con-documento/",
      expect.any(FormData),
      { headers: { "Content-Type": null } },
    );

    const formData = mockApiPost.mock.calls[0]?.[1] as FormData;
    const entries = Array.from(formData.entries());
    expect(entries.some(([key]) => key === "conversacion")).toBe(true);
    expect(entries.some(([key]) => key === "fk_conversacion")).toBe(false);
  });

  it("replaces optimistic id with server id on success", async () => {
    mockApiPost.mockResolvedValue(backendMediaResponse);

    const { getByTestId } = renderComponent();

    await act(async () => {
      getByTestId("send-media").props.onPress();
    });

    await waitFor(() => {
      const cached = queryClient.getQueryData<{
        pages: { results: { id: number; contenido: string }[] }[];
      }>(messagesKey(1));
      const allMessages = cached?.pages.flatMap((p) => p.results) ?? [];
      const msg = allMessages.find((m) => m.contenido === "Check this");
      expect(msg).toBeDefined();
      expect(msg?.id).toBe(100);
    });
  });

  it("rolls back on error", async () => {
    mockApiPost.mockRejectedValue(new Error("Upload failed"));

    const { getByTestId } = renderComponent();

    await act(async () => {
      getByTestId("send-media").props.onPress();
    });

    await waitFor(() => {
      const cached = queryClient.getQueryData<{
        pages: { results: { id: number; contenido: string }[] }[];
      }>(messagesKey(1));
      const allMessages = cached?.pages.flatMap((p) => p.results) ?? [];
      expect(allMessages.some((m) => m.contenido === "Check this")).toBe(false);
    });
  });
});
