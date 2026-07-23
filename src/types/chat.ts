// Chat domain types — Slice 1 (MVP Private Text Chat)

// --- Backend response shapes (raw from API) ---

export interface BackendMessage {
  id_mensaje: number;
  emisor: { id_usuario: number; nombre_completo: string };
  contenido: string;
  leido: boolean;
  editado: boolean;
  creado_en: string;
}

export interface BackendConversation {
  id_conversacion: number;
  tipo: boolean;
  nombre: string;
  ultimo_mensaje: string | null;
  ultimo_mensaje_creado_en: string | null;
  no_leidos?: number;
  es_familia?: boolean;
}

export interface BackendGroupMember {
  id_miembro: number;
  id_usuario: number;
  nombre_completo: string;
  correo: string;
  creado_en: string;
}

// --- Frontend types (normalized for UI) ---

export interface Conversation {
  id: number;
  nombre: string;
  tipo: 'privada' | 'grupal';
  es_familia?: boolean;
  ultimo_mensaje: string | null;
  ultimo_mensaje_fecha: string | null;
  no_leidos: number;
  participante_nombre: string;
  participante_avatar: string | null;
}

export const ATTACHMENT_TYPES = {
  IMAGEN: 'imagen',
  AUDIO: 'audio',
  VIDEO: 'video',
} as const;

export type AttachmentType =
  (typeof ATTACHMENT_TYPES)[keyof typeof ATTACHMENT_TYPES];

export interface Attachment {
  id: number;
  mensaje: number;
  archivo: string;
  tipo: AttachmentType;
  nombre: string;
  tamaño: number;
}

export interface Message {
  id: number;
  conversacion: number;
  remitente: number;
  remitente_nombre: string;
  contenido: string;
  creado_en: string;
  leido: boolean;
  editado?: boolean;
  activo?: boolean;
  adjuntos?: Attachment[];
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface CreateConversationPayload {
  fk_usuario: number;
}

export interface SendMessagePayload {
  conversacion: number;
  contenido: string;
}

export interface SendMessageWithMediaPayload {
  conversacion: number;
  contenido?: string;
  tipo_documento: AttachmentType;
  documento: File | { uri: string; name: string; type: string };
}

export interface GroupMember {
  id: number;
  nombre: string;
  rol: string;
  avatar: string | null;
}

export interface CreateGroupPayload {
  nombre: string;
  fk_usuarios: number[];
}

export interface RenameGroupPayload {
  nombre: string;
}

export interface AddGroupMemberPayload {
  fk_usuario: number;
}

export type ChatStackParamList = {
  ChatList: undefined;
  Chat: {
    conversationId: number;
    title: string;
    tipo: 'privada' | 'grupal';
    isFamily?: boolean | undefined;
  };
  GroupDetail: {
    conversationId: number;
    title: string;
    isFamily?: boolean | undefined;
  };
  CreateGroup: undefined;
  StartChat: undefined;
};
