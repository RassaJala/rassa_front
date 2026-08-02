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
  municipio_id?: number | null;
  municipio_nombre?: string | null;
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
  fk_localidad: number | null;
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

export interface Order {
  id_pedido: number;
  cliente_nombre: string | null;
  vendedor_nombre: string | null;
  total: string;
  estado_actual: PedidoEstado;
  creado_en: string;
  productos?: string[];
  has_more_productos?: boolean;
}

export interface OrderDetail extends Order {
  subtotal: string;
  iva: string;
  fecha_expiracion: string | null;
  detalles: OrderItem[];
  historial: OrderHistoryEntry[];
}

export interface OrderItem {
  id_detalle: number;
  nombre_producto: string;
  precio_unitario: string;
  cantidad: number;
  importe: string;
}

/** @deprecated Usar OrderStatusHistory en su lugar */
export interface OrderHistoryEntry {
  id_historial: number;
  estado_anterior: string | null;
  estado_nuevo: string;
  cambiado_por_nombre: string | null;
  creado_en: string;
}

export type PedidoEstado =
  | 'pendiente'
  | 'confirmado'
  | 'en_preparacion'
  | 'listo_para_retirar'
  | 'entregado'
  | 'cancelado';

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

export interface OrderStatusHistory {
  readonly id_historial: number;
  readonly estado_anterior: string | null;
  readonly estado_nuevo: string;
  readonly creado_en: string; // ISO datetime
  readonly cambiado_por_nombre: string | null;
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
  AdminProfile: undefined;
  OrderDetail: { readonly orderId: number };
  UserManagement: undefined;
  UserForm: undefined;
  Chat: {
    conversationId: number;
    title: string;
    tipo?: 'privada' | 'grupal';
    isFamily?: boolean | undefined;
  };
  GroupDetail: {
    conversationId: number;
    title: string;
    isFamily?: boolean | undefined;
  };
  CreateGroup: undefined;
  StartChat: undefined;
  CategoryList: undefined;
  UnitList: undefined;
  CategoryTrash: undefined;
  UnitTrash: undefined;
  Notificaciones: undefined;
  FamilyList: undefined;
  FamilyDetail: { readonly familyId: number };
  FamilyForm: { readonly familyId?: number } | undefined;
  Profile: undefined;
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
  Pedidos: undefined;
  ChatList: undefined;
};

export type BuyerStackParamList = {
  BuyerTabs: undefined;
  Catalog: undefined;
  OrderDetail: { orderId: number };
  Profile: undefined;
  ProductDetail: { productId: number; farmerId: number };
  Chat: {
    conversationId: number;
    title: string;
    tipo?: 'privada' | 'grupal';
    isFamily?: boolean | undefined;
  };
  GroupDetail: {
    conversationId: number;
    title: string;
    isFamily?: boolean | undefined;
  };
};

export type AdminTabsParamList = {
  AdminPanel: undefined;
  AdminProducts: undefined;
  CategoryList: undefined;
  UnitList: undefined;
  CategoryTrash: undefined;
  UnitTrash: undefined;
  ChatList: undefined;
};

export type FarmerStackParamList = {
  FarmerHome: undefined;
  Profile: undefined;
  ProductList: undefined;
  ProductForm: { productoId?: number };
  FarmerDashboard: undefined;
  PublicationWizard: { publicacionId?: number };
  ChatList: undefined;
  Chat: {
    conversationId: number;
    title: string;
    tipo?: 'privada' | 'grupal';
    isFamily?: boolean | undefined;
  };
  GroupDetail: {
    conversationId: number;
    title: string;
    isFamily?: boolean | undefined;
  };
};

export interface SearchUserResult {
  id_usuario: number;
  email: string;
  correo?: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string | null;
}
export type SellerTabsParamList = {
  HomeSeller: undefined;
  Sales: undefined;
  Recolecciones: undefined;
  Notificaciones: undefined;
  Perfil: undefined;
  ChatList: undefined;
};

export type SellerStackParamList = {
  SellerTabs: undefined;
  Payment: { readonly orderId: number };
  Receipt: { readonly paymentId: number };
  Chat: {
    conversationId: number;
    title: string;
    tipo?: 'privada' | 'grupal';
    isFamily?: boolean | undefined;
  };
  GroupDetail: {
    conversationId: number;
    title: string;
    isFamily?: boolean | undefined;
  };
};
