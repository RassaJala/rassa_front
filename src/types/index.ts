export type UserRole = 'admin' | 'seller' | 'farmer' | 'buyer';

export interface User {
  id: number;
  email: string;
  /** @deprecated Siempre es igual a email */
  username?: string;
  /** @deprecated Siempre es igual a id */
  id_usuario?: number;
  telefono?: string | null;
  role: UserRole;
  /** @deprecated Usar nombre completo en su lugar */
  first_name: string;
  /** @deprecated Usar apellido_paterno/apellido_materno en su lugar */
  last_name: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno?: string | null;
  fecha_nacimiento: string;
  genero: string;
  direccion: string;
  localidad: number;
  localidad_nombre?: string | null;
}

export type RegisterRole = 'buyer' | 'farmer' | 'seller';

export interface RegisterPayload {
  email: string;
  password?: string;
  telefono: string;
  role: RegisterRole;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string | null;
  fecha_nacimiento: string;
  sexo: 'M' | 'F' | 'O';
  domicilio: string;
  fk_localidad: number;
}

export interface UpdateProfilePayload {
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string | null;
  telefono: string;
  fecha_nacimiento: string;
  sexo: 'M' | 'F' | 'O';
  domicilio: string;
  fk_localidad: number;
}

export interface ChangePasswordPayload {
  old_password: string;
  new_password: string;
}

export interface Municipio {
  id_municipio: number;
  nombre: string;
}

export interface Localidad {
  id_localidad: number;
  nombre: string;
  municipio_id: number;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  stock: number;
  image: string;
  farmer: number;
  category: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: number;
  buyer: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  total: string;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: number;
  order: number;
  product: number | null;
  quantity: number;
  price: string;
}

export interface Category {
  id_categoria: number;
  nombre: string;
  descripcion: string;
  estado: boolean;
  creado_en: string;
}

export interface Unit {
  id_unidad: number;
  nombre: string;
  abreviatura: string;
  estado: boolean;
  creado_en: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

// ── Familias ──────────────────────────────────────────────

export interface Family {
  id_familia: number;
  fk_jefe_familia: number | null;
  jefe_nombre: string | null;
  nombre_familia: string;
  nombre: string;
  detalle_familia: string | null;
  creado_en: string;
  estado: boolean;
}

export interface FamilyMember {
  id_familia_usuario: number;
  fk_usuario: number;
  usuario_nombre: string;
  usuario_correo: string;
  fk_familia: number;
  estado: boolean;
  creado_en: string;
}

export interface CreditLimit {
  id_limite: number;
  fk_usuario: number;
  monto: string;
  creado_en: string;
}

// ── Navigation param lists ────────────────────────────────

export type AdminStackParamList = {
  AdminPanel: undefined;
  CategoryList: undefined;
  UnitList: undefined;
  CategoryTrash: undefined;
  UnitTrash: undefined;
  Notificaciones: undefined;
  FamilyList: undefined;
  FamilyDetail: { readonly familyId: number };
  FamilyForm: { readonly familyId?: number } | undefined;
  Profile: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type BuyerTabsParamList = {
  Home: undefined;
  ProductDetail: undefined;
};

export type BuyerStackParamList = {
  BuyerTabs: undefined;
  Profile: undefined;
};

export type FarmerTabsParamList = {
  MyProducts: undefined;
  AddProduct: undefined;
};

export type FarmerStackParamList = {
  FarmerTabs: undefined;
  Profile: undefined;
};

export interface SearchUserResult {
  id_usuario: number;
  email: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string | null;
}
