import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

const mockNavigate = jest.fn();

jest.mock("@/store/ThemeContext", () => ({
  useTheme: () => ({ colorScheme: "light" }),
}));

jest.mock("@/hooks/useFormattedDate", () => ({
  useFormattedDate: () => ({ today: "Test date" }),
}));

jest.mock("@/services/mock/dashboard", () => ({
  getAdminStats: () => ({ totalProducts: 10, totalUsers: 20, totalOrders: 30 }),
}));

jest.mock("@/components/ProfileDrawer", () => ({
  ProfileDrawerProvider: ({ children }: any) => children,
  ProfileDrawerTrigger: () => null,
}));

jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: "MaterialCommunityIcons",
}));

jest.mock("@/hooks/useAdminColors", () => ({
  useAdminColors: () => ({
    bg: "#fff",
    surface: "#f5f5f5",
    fg: "#000",
    muted: "#666",
    border: "#ddd",
    brand: "#007AFF",
  }),
}));

import AdminPanelScreen from "../AdminPanelScreen";

describe("AdminPanelScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows lookup form when order card is pressed", () => {
    const { getByText, queryByText } = render(
      <AdminPanelScreen navigation={{ navigate: mockNavigate } as any} />,
    );
    expect(queryByText("Buscar historial de pedido")).toBeNull();
    fireEvent.press(getByText("Pedidos"));
    expect(getByText("Buscar historial de pedido")).toBeTruthy();
  });

  it("navigates to OrderDetail on valid lookup submit", () => {
    const { getByText, getByPlaceholderText } = render(
      <AdminPanelScreen navigation={{ navigate: mockNavigate } as any} />,
    );
    fireEvent.press(getByText("Pedidos"));

    const input = getByPlaceholderText("ID del pedido");
    fireEvent.changeText(input, "42");
    fireEvent.press(getByText("Ver historial"));

    expect(mockNavigate).toHaveBeenCalledWith("OrderDetail", { orderId: 42 });
  });

  it("shows validation error for invalid lookup ID", () => {
    const { getByText, getByPlaceholderText, queryByText } = render(
      <AdminPanelScreen navigation={{ navigate: mockNavigate } as any} />,
    );
    fireEvent.press(getByText("Pedidos"));

    expect(
      queryByText("Ingresá un ID de pedido válido (número positivo)"),
    ).toBeNull();
    fireEvent.changeText(getByPlaceholderText("ID del pedido"), "abc");
    expect(
      getByText("Ingresá un ID de pedido válido (número positivo)"),
    ).toBeTruthy();
  });
});
