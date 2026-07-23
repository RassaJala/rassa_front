/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import React from "react";

import "@testing-library/jest-native/extend-expect";
import { useNetInfo } from "@react-native-community/netinfo";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { useCatalogs } from "@/hooks/useCatalogs";
import ProfileScreen from "@/screens/common/ProfileScreen";
import { useAuth } from "@/store/AuthContext";

jest.mock("@react-native-community/netinfo");
jest.mock("@/store/AuthContext");
jest.mock("@/store/ThemeContext", () => ({
  useTheme: () => ({ colorScheme: "light", toggleColorScheme: jest.fn() }),
}));
jest.mock("@/hooks/useCatalogs");

const mockUseNetInfo = useNetInfo as jest.Mock;
const mockUseAuth = useAuth as jest.Mock;
const mockUseCatalogs = useCatalogs as jest.Mock;

const mockUser = {
  id: 1,
  email: "test@example.com",
  username: "test@example.com",
  id_usuario: 1,
  telefono: "5551234567",
  role: "buyer",
  nombre: "Juan",
  apellido_paterno: "Pérez",
  apellido_materno: "García",
  fecha_nacimiento: "1990-01-15",
  genero: "M",
  direccion: "Calle 123, Col. Centro",
  localidad: 1,
  localidad_nombre: "Localidad 1",
};

const mockCatalog = {
  selectedMunicipioId: 1,
  selectedMunicipioNombre: "Municipio 1",
  localidadId: 1,
  localidadNombre: "Localidad 1",
  municipios: [{ id_municipio: 1, nombre: "Municipio 1" }],
  localidades: [{ id_localidad: 1, nombre: "Localidad 1", municipio_id: 1 }],
  isLoadingMunicipios: false,
  isLoadingLocalidades: false,
  errorMunicipios: null,
  errorLocalidades: null,
  refetchMunicipios: jest.fn(),
  refetchLocalidades: jest.fn(),
  handleSelectMunicipio: jest.fn(),
  handleSelectLocalidad: jest.fn(),
  setLocalidadId: jest.fn(),
  setLocalidadNombre: jest.fn(),
  setSelectedMunicipioId: jest.fn(),
  setSelectedMunicipioNombre: jest.fn(),
};

const mockAuth = {
  user: mockUser,
  updateProfile: jest.fn(),
  changePassword: jest.fn(),
  logout: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseNetInfo.mockReturnValue({ isConnected: true });
  mockUseAuth.mockReturnValue(mockAuth);
  mockUseCatalogs.mockReturnValue(mockCatalog);
});

describe("ProfileScreen", () => {
  const renderScreen = () => render(<ProfileScreen />);

  it("renders profile header with user info", () => {
    const { getByText } = renderScreen();
    expect(getByText("Juan Pérez")).toBeTruthy();
    expect(getByText("test@example.com")).toBeTruthy();
    expect(getByText("Comprador")).toBeTruthy();
  });

  it("renders three tabs: Ver, Editar, Seguridad", () => {
    const { getByText } = renderScreen();
    expect(getByText("Ver")).toBeTruthy();
    expect(getByText("Editar")).toBeTruthy();
    expect(getByText("Seguridad")).toBeTruthy();
  });

  describe("Ver tab", () => {
    it("displays user details", () => {
      const { getByText } = renderScreen();
      expect(getByText("Juan Pérez García")).toBeTruthy();
      expect(getByText("5551234567")).toBeTruthy();
      expect(getByText("1990-01-15")).toBeTruthy();
      expect(getByText("Masculino")).toBeTruthy();
      expect(getByText("Calle 123, Col. Centro")).toBeTruthy();
      expect(getByText("Localidad 1")).toBeTruthy();
    });
  });

  describe("Editar tab", () => {
    beforeEach(() => {
      const { getByText } = renderScreen();
      fireEvent.press(getByText("Editar"));
    });

    it("shows form fields pre-filled with user data", () => {
      const { getByPlaceholderText, getByText } = renderScreen();
      fireEvent.press(getByText("Editar"));
      expect(getByPlaceholderText("Nombre")).toBeTruthy();
      expect(getByPlaceholderText("Apellido Paterno")).toBeTruthy();
      expect(getByPlaceholderText("Apellido Materno")).toBeTruthy();
      expect(getByPlaceholderText("xxx-xxx-xx-xx")).toBeTruthy();
      expect(getByPlaceholderText("AAAA-MM-DD")).toBeTruthy();
      expect(getByPlaceholderText("Calle, número, colonia")).toBeTruthy();
    });

    it("validates required fields", async () => {
      const { getByText, getByPlaceholderText } = renderScreen();
      fireEvent.press(getByText("Editar"));
      fireEvent.changeText(getByPlaceholderText("Nombre"), "");
      fireEvent.press(getByText("Guardar Cambios"));
      await waitFor(() => {
        expect(
          getByText("Por favor, completa todos los campos obligatorios."),
        ).toBeTruthy();
      });
    });

    it("validates phone length", async () => {
      const { getByText, getByPlaceholderText } = renderScreen();
      fireEvent.press(getByText("Editar"));
      fireEvent.changeText(getByPlaceholderText("xxx-xxx-xx-xx"), "555");
      fireEvent.press(getByText("Guardar Cambios"));
      await waitFor(() => {
        expect(
          getByText(
            "El teléfono debe tener 10 dígitos (nacional) o 12 dígitos (internacional).",
          ),
        ).toBeTruthy();
      });
    });

    it("validates date format", async () => {
      const { getByText, getByPlaceholderText } = renderScreen();
      fireEvent.press(getByText("Editar"));
      fireEvent.changeText(getByPlaceholderText("AAAA-MM-DD"), "invalid");
      fireEvent.press(getByText("Guardar Cambios"));
      await waitFor(() => {
        expect(
          getByText("La fecha de nacimiento debe tener el formato AAAA-MM-DD."),
        ).toBeTruthy();
      });
    });

    it("validates age >= 18 years", async () => {
      const today = new Date();
      const recentDate = `${today.getFullYear() - 17}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      const { getByText, getByPlaceholderText } = renderScreen();
      fireEvent.press(getByText("Editar"));
      fireEvent.changeText(getByPlaceholderText("AAAA-MM-DD"), recentDate);
      fireEvent.press(getByText("Guardar Cambios"));
      await waitFor(() => {
        expect(getByText("Debes ser mayor de 18 años.")).toBeTruthy();
      });
    });

    it("shows success message on successful update", async () => {
      mockAuth.updateProfile.mockResolvedValueOnce(undefined);
      const { getByText, getByPlaceholderText } = renderScreen();
      fireEvent.press(getByText("Editar"));
      const today = new Date();
      const eighteenYearsAgo = `${today.getFullYear() - 18}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      fireEvent.changeText(
        getByPlaceholderText("AAAA-MM-DD"),
        eighteenYearsAgo,
      );
      fireEvent.press(getByText("Guardar Cambios"));
      await waitFor(() => {
        expect(getByText("Perfil actualizado exitosamente.")).toBeTruthy();
      });
    });

    it("shows error message on API failure", async () => {
      mockAuth.updateProfile.mockRejectedValueOnce(
        new Error("Error al actualizar perfil."),
      );
      const { getByText, getByPlaceholderText } = renderScreen();
      fireEvent.press(getByText("Editar"));
      const today = new Date();
      const eighteenYearsAgo = `${today.getFullYear() - 18}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      fireEvent.changeText(
        getByPlaceholderText("AAAA-MM-DD"),
        eighteenYearsAgo,
      );
      fireEvent.press(getByText("Guardar Cambios"));
      await waitFor(() => {
        expect(getByText("Error al actualizar perfil.")).toBeTruthy();
      });
    });

    it("shows offline error when no connection", async () => {
      mockUseNetInfo.mockReturnValue({ isConnected: false });
      const { getByText } = renderScreen();
      fireEvent.press(getByText("Editar"));
      fireEvent.press(getByText("Guardar Cambios"));
      await waitFor(() => {
        expect(getByText("Sin conexión a Internet.")).toBeTruthy();
      });
    });
  });

  describe("Seguridad tab", () => {
    beforeEach(() => {
      const { getByText } = renderScreen();
      fireEvent.press(getByText("Seguridad"));
    });

    it("shows password change form", () => {
      const { getByText, getByTestId } = renderScreen();
      fireEvent.press(getByText("Seguridad"));
      expect(getByTestId("old-password-input")).toBeTruthy();
      expect(getByTestId("new-password-input")).toBeTruthy();
      expect(getByTestId("confirm-password-input")).toBeTruthy();
    });

    it("validates all fields required", async () => {
      const { getByText, getByTestId } = renderScreen();
      fireEvent.press(getByText("Seguridad"));
      fireEvent.press(getByTestId("change-password-button"));
      await waitFor(() => {
        expect(getByText("Por favor, completa todos los campos.")).toBeTruthy();
      });
    });

    it("validates new password length", async () => {
      const { getByText, getByTestId } = renderScreen();
      fireEvent.press(getByText("Seguridad"));
      fireEvent.changeText(getByTestId("old-password-input"), "oldpass");
      fireEvent.changeText(getByTestId("new-password-input"), "123");
      fireEvent.changeText(getByTestId("confirm-password-input"), "123");
      fireEvent.press(getByTestId("change-password-button"));
      await waitFor(() => {
        expect(
          getByText("La nueva contraseña debe tener al menos 6 caracteres."),
        ).toBeTruthy();
      });
    });

    it("validates password confirmation matches", async () => {
      const { getByText, getByTestId } = renderScreen();
      fireEvent.press(getByText("Seguridad"));
      fireEvent.changeText(getByTestId("old-password-input"), "oldpassword");
      fireEvent.changeText(getByTestId("new-password-input"), "newpassword1");
      fireEvent.changeText(getByTestId("confirm-password-input"), "different");
      fireEvent.press(getByTestId("change-password-button"));
      await waitFor(() => {
        expect(
          getByText("La confirmación de la contraseña no coincide."),
        ).toBeTruthy();
      });
    });

    it("validates new password different from old", async () => {
      const { getByText, getByTestId } = renderScreen();
      fireEvent.press(getByText("Seguridad"));
      fireEvent.changeText(getByTestId("old-password-input"), "samepassword");
      fireEvent.changeText(getByTestId("new-password-input"), "samepassword");
      fireEvent.changeText(
        getByTestId("confirm-password-input"),
        "samepassword",
      );
      fireEvent.press(getByTestId("change-password-button"));
      await waitFor(() => {
        expect(
          getByText("La nueva contraseña debe ser diferente a la actual."),
        ).toBeTruthy();
      });
    });

    it("shows success message and logs out on successful change", async () => {
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = ((fn: () => void) => {
        fn();
        return 0 as unknown as NodeJS.Timeout;
      }) as unknown as typeof global.setTimeout;

      try {
        mockAuth.changePassword.mockResolvedValueOnce(undefined);
        mockAuth.logout.mockResolvedValueOnce(undefined);
        const { getByText, getByTestId } = renderScreen();
        fireEvent.press(getByText("Seguridad"));
        fireEvent.changeText(getByTestId("old-password-input"), "oldpassword");
        fireEvent.changeText(getByTestId("new-password-input"), "newpassword1");
        fireEvent.changeText(
          getByTestId("confirm-password-input"),
          "newpassword1",
        );
        fireEvent.press(getByTestId("change-password-button"));
        await waitFor(() => {
          expect(
            getByText("Contraseña cambiada exitosamente. Cerrando sesión..."),
          ).toBeTruthy();
        });
        await waitFor(() => {
          expect(mockAuth.logout).toHaveBeenCalled();
        });
      } finally {
        global.setTimeout = originalSetTimeout;
      }
    });

    it("shows error on API failure", async () => {
      mockAuth.changePassword.mockRejectedValueOnce(
        new Error("Contraseña actual incorrecta."),
      );
      const { getByText, getByTestId } = renderScreen();
      fireEvent.press(getByText("Seguridad"));
      fireEvent.changeText(getByTestId("old-password-input"), "oldpassword");
      fireEvent.changeText(getByTestId("new-password-input"), "newpassword1");
      fireEvent.changeText(
        getByTestId("confirm-password-input"),
        "newpassword1",
      );
      fireEvent.press(getByTestId("change-password-button"));
      await waitFor(() => {
        expect(getByText("Contraseña actual incorrecta.")).toBeTruthy();
      });
    });

    it("shows 401 error for wrong old password", async () => {
      mockAuth.changePassword.mockRejectedValueOnce({
        isAxiosError: true,
        response: { status: 401, data: { detail: "Unauthorized" } },
      });
      const { getByText, getByTestId } = renderScreen();
      fireEvent.press(getByText("Seguridad"));
      fireEvent.changeText(getByTestId("old-password-input"), "wrongpassword");
      fireEvent.changeText(getByTestId("new-password-input"), "newpassword1");
      fireEvent.changeText(
        getByTestId("confirm-password-input"),
        "newpassword1",
      );
      fireEvent.press(getByTestId("change-password-button"));
      await waitFor(() => {
        expect(getByText("Sesión expirada o no autorizada.")).toBeTruthy();
      });
    });
  });

  describe("offline handling", () => {
    it("shows offline error when submitting edit without connection", async () => {
      mockUseNetInfo.mockReturnValue({ isConnected: false });
      const { getByText, getByPlaceholderText } = renderScreen();
      fireEvent.press(getByText("Editar"));
      const today = new Date();
      const eighteenYearsAgo = `${today.getFullYear() - 18}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      fireEvent.changeText(
        getByPlaceholderText("AAAA-MM-DD"),
        eighteenYearsAgo,
      );
      fireEvent.press(getByText("Guardar Cambios"));
      await waitFor(() => {
        expect(getByText("Sin conexión a Internet.")).toBeTruthy();
      });
    });

    it("shows offline error when changing password without connection", async () => {
      mockUseNetInfo.mockReturnValue({ isConnected: false });
      const { getByText, getByTestId } = renderScreen();
      fireEvent.press(getByText("Seguridad"));
      fireEvent.press(getByTestId("change-password-button"));
      await waitFor(() => {
        expect(getByText("Sin conexión a Internet.")).toBeTruthy();
      });
    });
  });

  describe("user null handling", () => {
    it("renders without crashing when user is null", () => {
      mockUseAuth.mockReturnValueOnce({ ...mockAuth, user: null });
      const { getByText } = render(<ProfileScreen />);
      expect(getByText("Ver")).toBeTruthy();
    });
  });

  describe("cleanup on unmount", () => {
    it("clears logout timeout on unmount", async () => {
      const { unmount, getByText, getByTestId } = renderScreen();
      fireEvent.press(getByText("Seguridad"));
      fireEvent.changeText(getByTestId("old-password-input"), "oldpass");
      fireEvent.changeText(getByTestId("new-password-input"), "newpassword1");
      fireEvent.changeText(
        getByTestId("confirm-password-input"),
        "newpassword1",
      );
      fireEvent.press(getByTestId("change-password-button"));

      await waitFor(() => {
        expect(mockAuth.changePassword).toHaveBeenCalled();
      });

      unmount();
      expect(mockAuth.logout).toHaveBeenCalled();
    });
  });
});
