/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import React from "react";

import "@testing-library/jest-native/extend-expect";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import MunicipioListScreen from "@/screens/admin/MunicipioListScreen";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { AdminStackParamList } from "@/types";

const mockNavigate = jest.fn();

const mockNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
  reset: jest.fn(),
  setParams: jest.fn(),
  dispatch: jest.fn(),
  setOptions: jest.fn(),
  isFocused: jest.fn(),
  canGoBack: jest.fn(),
  getId: jest.fn(),
  getState: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
  navigateDeprecated: jest.fn(),
  preload: jest.fn(),
} as unknown as NativeStackNavigationProp<AdminStackParamList, "MunicipioList">;

const mockMutate = jest.fn();
const mockQueryClient = { invalidateQueries: jest.fn() };

jest.mock("@/store/AuthContext", () => ({
  useAuth: () => ({
    logout: jest.fn(),
    user: { id_usuario: 1, nombre: "Admin", role: "admin" },
  }),
}));
jest.mock("@/store/ThemeContext", () => ({
  useTheme: () => ({
    colorScheme: "light",
    toggleColorScheme: jest.fn(),
    isLoaded: true,
  }),
}));
jest.mock("@react-native-community/netinfo", () => ({
  useNetInfo: () => ({ isConnected: true }),
}));
jest.mock("react-native/Libraries/Components/Keyboard/Keyboard", () => ({
  addListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  removeListener: jest.fn(),
  removeAllListeners: jest.fn(),
  dismiss: jest.fn(),
  isVisible: jest.fn().mockReturnValue(false),
}));
jest.mock("@tanstack/react-query", () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  useQueryClient: jest.fn(),
}));
jest.mock("@/services/api", () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockResolvedValue({ data: { data: [] } }),
    post: jest.fn().mockResolvedValue({ data: { data: {} } }),
    patch: jest.fn().mockResolvedValue({ data: { data: {} } }),
    delete: jest.fn().mockResolvedValue({ data: { data: {} } }),
  },
}));

describe("MunicipioListScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useQuery as unknown as jest.Mock).mockReturnValue({
      data: [{ id_municipio: 1, nombre: "Test", estado: true }],
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    (useMutation as unknown as jest.Mock).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });
    (useQueryClient as unknown as jest.Mock).mockReturnValue(mockQueryClient);
  });

  it("se importa correctamente", () => {
    expect(MunicipioListScreen).toBeDefined();
  });

  it("renderiza sin errores", () => {
    expect(() =>
      render(<MunicipioListScreen navigation={mockNavigation} />),
    ).not.toThrow();
  });

  it('renderiza el header con el titulo "Municipios"', () => {
    const { getByText } = render(
      <MunicipioListScreen navigation={mockNavigation} />,
    );
    expect(getByText("Municipios")).toBeTruthy();
  });

  it("renderiza el estado vacio cuando no hay municipios", () => {
    (useQuery as unknown as jest.Mock).mockReturnValueOnce({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    const { getByText } = render(
      <MunicipioListScreen navigation={mockNavigation} />,
    );
    expect(getByText("No hay municipios")).toBeTruthy();
    expect(getByText("Agrega un municipio para comenzar.")).toBeTruthy();
  });

  it('abre el formulario al presionar "➕ Nuevo"', () => {
    const { getByTestId, getByText } = render(
      <MunicipioListScreen navigation={mockNavigation} />,
    );
    fireEvent.press(getByTestId("add-new-btn"));
    expect(getByText("Nueva municipio")).toBeTruthy();
  });

  it("muestra error de validacion al guardar con nombre vacio", async () => {
    const { getByTestId, getByText } = render(
      <MunicipioListScreen navigation={mockNavigation} />,
    );
    fireEvent.press(getByTestId("add-new-btn"));
    expect(getByText("Nueva municipio")).toBeTruthy();
    fireEvent.press(getByText("Guardar"));
    await waitFor(() => {
      expect(getByText("El nombre es obligatorio.")).toBeTruthy();
    });
  });

  it("llama a mutate al guardar con nombre valido", async () => {
    const { getByTestId, getByText, getByDisplayValue } = render(
      <MunicipioListScreen navigation={mockNavigation} />,
    );
    fireEvent.press(getByTestId("add-new-btn"));
    const input = getByDisplayValue("");
    fireEvent.changeText(input, "Nuevo Municipio");
    fireEvent.press(getByText("Guardar"));
    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({ nombre: "Nuevo Municipio" }),
        expect.any(Object),
      );
    });
  });

  it("cancela la creacion al presionar Cancelar", () => {
    const { getByTestId, getByText, queryByText } = render(
      <MunicipioListScreen navigation={mockNavigation} />,
    );
    fireEvent.press(getByTestId("add-new-btn"));
    expect(getByText("Nueva municipio")).toBeTruthy();
    fireEvent.press(getByText("Cancelar"));
    expect(queryByText("Nueva municipio")).toBeNull();
  });

  it("abre el modal de confirmacion al presionar toggle", () => {
    const { getByTestId, getByText } = render(
      <MunicipioListScreen navigation={mockNavigation} />,
    );
    fireEvent.press(getByTestId("toggle-status-btn"));
    expect(getByText('Desactivar "Test"?')).toBeTruthy();
    expect(getByText("Desactivar")).toBeTruthy();
  });

  it("confirma el toggle de estado y llama mutate", () => {
    const { getByTestId, getByText } = render(
      <MunicipioListScreen navigation={mockNavigation} />,
    );
    fireEvent.press(getByTestId("toggle-status-btn"));
    fireEvent.press(getByText("Desactivar"));
    expect(mockMutate).toHaveBeenCalled();
  });

  it("abre el modal de confirmacion al presionar eliminar", () => {
    const { getByTestId, getByText } = render(
      <MunicipioListScreen navigation={mockNavigation} />,
    );
    fireEvent.press(getByTestId("delete-btn"));
    expect(getByText('¿Estás seguro de eliminar "Test"?')).toBeTruthy();
    expect(getByText("Eliminar")).toBeTruthy();
  });

  it("confirma la eliminacion y llama mutate", () => {
    const { getByTestId, getByText } = render(
      <MunicipioListScreen navigation={mockNavigation} />,
    );
    fireEvent.press(getByTestId("delete-btn"));
    fireEvent.press(getByText("Eliminar"));
    expect(mockMutate).toHaveBeenCalled();
  });

  it('renderiza el boton "Ver localidades" en cada item', () => {
    const { getByText } = render(
      <MunicipioListScreen navigation={mockNavigation} />,
    );
    expect(getByText("Ver localidades")).toBeTruthy();
  });

  it('navega a LocalidadList al presionar "Ver localidades"', () => {
    const { getByText } = render(
      <MunicipioListScreen navigation={mockNavigation} />,
    );
    fireEvent.press(getByText("Ver localidades"));
    expect(mockNavigate).toHaveBeenCalledWith("LocalidadList", {
      municipioId: 1,
      municipioNombre: "Test",
    });
  });
});
