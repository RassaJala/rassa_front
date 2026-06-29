// M3 — Extended types for Users and Roles
// This file does NOT modify the existing types/index.ts

import { User } from "./index";

export interface LoginResponse {
  success: boolean;
  message: string;
  remember: boolean;
  access: string;
  refresh: string;
  user: User;
}

/** User with active status (returned by admin endpoints) */
export interface AdminUser extends User {
  is_active: boolean;
}

/** Paginated response from Django REST Framework */
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/** Payload for updating user profile */
export interface UpdateProfilePayload {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
}

/** Payload for changing password */
export interface ChangePasswordPayload {
  old_password?: string;
  new_password?: string;
  confirm_new_password?: string;
}
