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
  estado: boolean;
}

export interface Localidad {
  id_localidad: number;
  nombre: string;
  municipio_id: number;
  estado: boolean;
}

export interface Producto {
  id_producto: number;
  nombre_producto: string;
  descripcion: string;
  precio: string;
  stock: number;
  es_perecedero: boolean;
  imagen: string | null;
  estado: boolean;
  categoria: Category;
  unidad: Unidad | null;
  imagenes?: { id_imagen: number; url: string; es_principal: boolean }[];
  imagen_principal: string | null;
  creado_en: string;
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

export interface Unidad {
  id_unidad: number;
  tipo: string;
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

export type AdminStackParamList = {
  AdminPanel: undefined;
  UserManagement: undefined;
  CategoryList: undefined;
  UnitList: undefined;
  CategoryTrash: undefined;
  UnitTrash: undefined;
  Notificaciones: undefined;
  MunicipioList: undefined;
  MunicipioTrash: undefined;
  LocalidadList: {
    readonly municipioId: number;
    readonly municipioNombre: string;
  };
  LocalidadTrash: {
    readonly municipioId: number;
    readonly municipioNombre: string;
  };
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
  HomeFarmer: undefined;
  MyProducts: undefined;
  AddProduct: undefined;
};

export type FarmerStackParamList = {
  FarmerHome: undefined;
  Profile: undefined;
  ProductList: undefined;
  ProductForm: { productoId?: number };
  FarmerDashboard: undefined;
  PublicationWizard: { publicacionId?: number };
};

export type SellerTabsParamList = {
  HomeSeller: undefined;
  Sales: undefined;
  Notificaciones: undefined;
  Perfil: undefined;
};
