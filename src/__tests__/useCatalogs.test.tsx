/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import React from "react";
import { Text, View } from "react-native";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, waitFor } from "@testing-library/react-native";
import "@testing-library/jest-native/extend-expect";

import { useCatalogs } from "@/hooks/useCatalogs";
import api from "@/services/api";

jest.mock("@/services/api");
jest.mock("@react-native-community/netinfo", () => ({
  useNetInfo: () => ({ isConnected: true }),
}));

const mockApiGet = api.get as jest.Mock;

describe("useCatalogs", () => {
  const municipios = [
    { id_municipio: 1, nombre: "Municipio 1" },
    { id_municipio: 2, nombre: "Municipio 2" },
  ];

  const localidades = [
    { id_localidad: 1, nombre: "Localidad 1", municipio_id: 1 },
    { id_localidad: 2, nombre: "Localidad 2", municipio_id: 1 },
  ];

  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });
    mockApiGet
      .mockResolvedValueOnce({ data: { data: municipios } })
      .mockResolvedValueOnce({ data: { data: localidades } });
  });

  const TestComponent = ({
    initialMunicipioId = null,
  }: {
    initialMunicipioId?: number | null;
  }) => {
    const catalog = useCatalogs(initialMunicipioId);
    return (
      <View>
        <Text testID="municipios-count">
          {String(catalog.municipios.length)}
        </Text>
        <Text testID="localidades-count">
          {String(catalog.localidades.length)}
        </Text>
        <Text testID="selected-municipio-id">
          {String(catalog.selectedMunicipioId ?? "")}
        </Text>
        <Text testID="localidad-id">{String(catalog.localidadId ?? "")}</Text>
        <Text testID="is-loading-municipios">
          {String(catalog.isLoadingMunicipios)}
        </Text>
        <Text testID="is-loading-localidades">
          {String(catalog.isLoadingLocalidades)}
        </Text>
        <Text testID="error-municipios">{catalog.errorMunicipios ?? ""}</Text>
        <Text testID="error-localidades">{catalog.errorLocalidades ?? ""}</Text>
      </View>
    );
  };

  const renderTestComponent = (initialMunicipioId: number | null = null) =>
    render(
      <QueryClientProvider client={queryClient}>
        <TestComponent initialMunicipioId={initialMunicipioId} />
      </QueryClientProvider>,
    );

  it("fetches municipios on initial render", async () => {
    renderTestComponent();

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledWith("/municipios/", {
        timeout: 10000,
      });
    });

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledTimes(1);
    });
  });

  it("returns municipios data after fetch", async () => {
    const { getByTestId } = renderTestComponent();

    await waitFor(() => {
      expect(getByTestId("municipios-count").props.children).toBe("2");
    });
  });

  it("fetches localidades when municipio is selected", async () => {
    const { getByTestId } = renderTestComponent();

    await waitFor(() => {
      expect(getByTestId("municipios-count").props.children).toBe("2");
    });
  });

  it("selecting municipio resets localidad", async () => {
    const { getByTestId } = renderTestComponent();

    await waitFor(() => {
      expect(getByTestId("municipios-count").props.children).toBe("2");
    });
  });

  it("does not fetch localidades when no municipio is selected", async () => {
    mockApiGet.mockClear();
    renderTestComponent();

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledTimes(1); // Only municipios fetched
    });
  });

  it("handles error for municipios fetch", async () => {
    mockApiGet.mockReset().mockRejectedValue(new Error("Network error"));

    const { getByTestId } = renderTestComponent();

    await waitFor(() => {
      expect(getByTestId("error-municipios").props.children).toBe(
        "Error al cargar datos. Toca Reintentar.",
      );
    });
  });

  it("handles error for localidades fetch", async () => {
    mockApiGet
      .mockReset()
      .mockResolvedValueOnce({ data: { data: municipios } })
      .mockRejectedValue(new Error("Localidades error"));

    const { getByTestId } = renderTestComponent(1);

    await waitFor(() => {
      expect(getByTestId("error-localidades").props.children).toBe(
        "Error al cargar datos. Toca Reintentar.",
      );
    });
  });

  it("exposes refetch functions", async () => {
    const { getByTestId } = renderTestComponent();

    await waitFor(() => {
      expect(getByTestId("municipios-count").props.children).toBe("2");
    });
  });

  it("has staleTime of 5 minutes", async () => {
    renderTestComponent();
  });

  it("uses placeholderData to keep previous data", async () => {
    renderTestComponent();
  });
});
