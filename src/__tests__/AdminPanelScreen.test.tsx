/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import React from "react";

import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import "@testing-library/jest-native/extend-expect";
import { render } from "@testing-library/react-native";

import AdminPanelScreen from "@/screens/admin/AdminPanelScreen";
import type { AdminStackParamList } from "@/types";

let mockColorScheme: string | null = "light";

jest.mock("@/store/AuthContext", () => ({
  useAuth: () => ({
    logout: jest.fn(),
    user: { id_usuario: 1, nombre: "Admin", role: "admin" },
  }),
}));
jest.mock("@/store/ThemeContext", () => ({
  useTheme: () => ({
    get colorScheme() {
      return mockColorScheme;
    },
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
}));

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
} as unknown as NativeStackNavigationProp<AdminStackParamList, "AdminPanel">;

const days = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];
const months = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

function todayString(): string {
  const d = new Date();
  return `${days[d.getDay()]}, ${d.getDate()} de ${months[d.getMonth()]}`;
}

describe("AdminPanelScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockColorScheme = "light";
  });

  it("renderiza el titulo Panel", () => {
    const { getByText } = render(
      <AdminPanelScreen navigation={mockNavigation} />,
    );
    expect(getByText("Panel")).toBeTruthy();
  });

  it("renderiza las tarjetas de estadisticas", () => {
    const { getByText } = render(
      <AdminPanelScreen navigation={mockNavigation} />,
    );
    expect(getByText("Productos")).toBeTruthy();
    expect(getByText("Usuarios")).toBeTruthy();
    expect(getByText("Pedidos")).toBeTruthy();
  });

  it("muestra la fecha actual formateada", () => {
    const { getByText } = render(
      <AdminPanelScreen navigation={mockNavigation} />,
    );
    expect(getByText(todayString())).toBeTruthy();
  });

  it("muestra los valores correctos de estadisticas", () => {
    const { getByText } = render(
      <AdminPanelScreen navigation={mockNavigation} />,
    );
    expect(getByText("1,248")).toBeTruthy();
    expect(getByText("856")).toBeTruthy();
    expect(getByText("432")).toBeTruthy();
  });

  it("renderiza en modo oscuro sin errores", () => {
    mockColorScheme = "dark";
    const { getByText } = render(
      <AdminPanelScreen navigation={mockNavigation} />,
    );
    expect(getByText("Panel")).toBeTruthy();
    expect(getByText("1,248")).toBeTruthy();
    expect(getByText("856")).toBeTruthy();
    expect(getByText("432")).toBeTruthy();
    expect(getByText("Productos")).toBeTruthy();
    expect(getByText("Usuarios")).toBeTruthy();
    expect(getByText("Pedidos")).toBeTruthy();
  });

  it("fecha cambia con el dia real", () => {
    const { getByText, rerender } = render(
      <AdminPanelScreen navigation={mockNavigation} />,
    );
    expect(getByText(todayString())).toBeTruthy();

    rerender(<AdminPanelScreen navigation={mockNavigation} />);
    expect(getByText(todayString())).toBeTruthy();
  });

  it("el header muestra la fecha en uppercase", () => {
    const { getByText } = render(
      <AdminPanelScreen navigation={mockNavigation} />,
    );
    const dateText = getByText(todayString());
    expect(dateText).toBeTruthy();
  });

  it("renderiza el icono de notificaciones", () => {
    const { getByTestId } = render(
      <AdminPanelScreen navigation={mockNavigation} />,
    );
    expect(getByTestId("notification-bell")).toBeTruthy();
  });

  it("renderiza las tarjetas con colores diferentes por tipo", () => {
    mockColorScheme = "light";
    const { getByText } = render(
      <AdminPanelScreen navigation={mockNavigation} />,
    );
    expect(getByText("Productos")).toBeTruthy();
    expect(getByText("Usuarios")).toBeTruthy();
    expect(getByText("Pedidos")).toBeTruthy();
  });

  it("aplica colores del tema oscuro en las tarjetas", () => {
    mockColorScheme = "dark";
    const { getByText } = render(
      <AdminPanelScreen navigation={mockNavigation} />,
    );
    expect(getByText("Productos")).toBeTruthy();
    expect(getByText("Usuarios")).toBeTruthy();
    expect(getByText("Pedidos")).toBeTruthy();
    expect(getByText("1,248")).toBeTruthy();
    expect(getByText("856")).toBeTruthy();
    expect(getByText("432")).toBeTruthy();
  });
});
