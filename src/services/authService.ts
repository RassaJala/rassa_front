import api from "./api";
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
    const { data } = await api.put<User>("/auth/me/", payload);
    return data;
  },

  /** Change current user password */
  async changePassword(payload: ChangePasswordPayload): Promise<void> {
    await api.post("/auth/change-password/", payload);
  },
};
