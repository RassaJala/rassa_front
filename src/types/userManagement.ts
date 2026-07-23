export interface AdminUser {
  id_usuario: number;
  email: string;
  role: "buyer" | "farmer" | "admin" | "seller";
  nombre: string;
  apellido_paterno: string | null;
  apellido_materno: string | null;
  localidad: number | null;
  localidad_nombre: string | null;
  estado: boolean;
  creado_en: string;
}
