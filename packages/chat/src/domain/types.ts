// Chat domain types — shared core (D4). Navigation (ChatStackParamList) stays per-platform.

import type { AttachmentType } from '../domain/enums';

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

export interface GroupMember {
  id: number;
  nombre: string;
  rol: string;
  avatar: string | null;
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
