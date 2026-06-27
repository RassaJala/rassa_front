import api from "./api";
import { AdminUser, PaginatedResponse } from "../types/auth";

export const adminService = {
  /** Fetch paginated user list (admin only) */
  async getUsers(
    search?: string,
    page?: number
  ): Promise<PaginatedResponse<AdminUser>> {
    const params: Record<string, string | number> = {};
    if (search) params.search = search;
    if (page) params.page = page;
    const { data } = await api.get<PaginatedResponse<AdminUser>>(
      "/auth/users/",
      { params }
    );
    return data;
  },

  /** Update a user's role and/or active status (admin only) */
  async updateUser(
    userId: number,
    payload: { role?: string; is_active?: boolean }
  ): Promise<AdminUser> {
    const { data } = await api.patch<AdminUser>(
      `/auth/users/${userId}/`,
      payload
    );
    return data;
  },
};
