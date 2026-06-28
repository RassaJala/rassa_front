import { useState, useCallback } from "react";
import { authService } from "../services/authService";
import { UpdateProfilePayload, ChangePasswordPayload } from "../types/auth";
import { User } from "../types";

/**
 * Hook for profile management (update profile & change password).
 * Works independently of AuthContext — no modifications needed.
 */
export function useProfile() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateProfile = useCallback(
    async (data: UpdateProfilePayload): Promise<User | null> => {
      setLoading(true);
      setError(null);
      try {
        const user = await authService.updateProfile(data);
        return user;
      } catch (err: any) {
        const detail = err.response?.data?.detail;
        const msg =
          typeof detail === "string"
            ? detail
            : "Error al actualizar el perfil";
        setError(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const changePassword = useCallback(
    async (data: ChangePasswordPayload): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        await authService.changePassword(data);
        return true;
      } catch (err: any) {
        const detail = err.response?.data?.detail;
        const msg =
          typeof detail === "string"
            ? detail
            : "Error al cambiar la contraseña";
        setError(msg);
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const clearError = useCallback(() => setError(null), []);

  return { updateProfile, changePassword, loading, error, clearError };
}
