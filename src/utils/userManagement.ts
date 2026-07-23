import { ROLE_COLOR_MAP } from "@/constants/roles";
import type { AdminUser } from "@/types/userManagement";

export function getRoleBadgeBg(role: string): string {
  const color = ROLE_COLOR_MAP[role] ?? "#6b7280";

  return `${color}1A`; // ~10% opacity hex
}

export function getFullName(user: AdminUser): string {
  return [user.nombre, user.apellido_paterno, user.apellido_materno]
    .filter(Boolean)
    .join(" ");
}
