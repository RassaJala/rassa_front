import api from "./api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { User } from "../types";
import { UpdateProfilePayload, ChangePasswordPayload } from "../types/auth";

export const authService = {
  /** Fetch current user profile */
  async getProfile(): Promise<User> {
    const { data } = await api.get<User>("/auth/me/");
    return data;
  },

  /** Update current user profile */
  async updateProfile(payload: UpdateProfilePayload): Promise<User> {
    try {
      const { data } = await api.patch<User>("/auth/me/", payload);
      return data;
    } catch (err: any) {
      console.error("authService.updateProfile error:", {
        status: err.response?.status,
        data: err.response?.data,
      });
      throw err;
    }
  },

  /** Change current user password */
  async changePassword(payload: ChangePasswordPayload): Promise<void> {
    const token = await AsyncStorage.getItem("access_token");
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

    const body = {
      current_password: payload.old_password,
      new_password: payload.new_password,
      confirm_new_password: payload.confirm_new_password,
    };

    await api.post("/auth/me/change-password/", body, { headers });
  },
};
