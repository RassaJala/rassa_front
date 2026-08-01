// Snake_case → domain mappers (D4). `mapMessage` keeps the `conversationId` param.

import type {
  BackendConversation,
  BackendGroupMember,
  BackendMessage,
} from './dtos';
import type { Conversation, GroupMember, Message } from '../domain/types';

export function mapMessage(
  raw: BackendMessage,
  conversationId?: number,
): Message {
  const adjuntos =
    raw.url_documento && raw.tipo && raw.tipo !== 'texto'
      ? [
          {
            id: raw.id_mensaje,
            mensaje: raw.id_mensaje,
            archivo: raw.url_documento,
            tipo: raw.tipo,
            nombre: raw.url_documento.split('/').at(-1) ?? '',
            tamaño: 0,
          },
        ]
      : undefined;

  return {
    id: raw.id_mensaje,
    conversacion: conversationId ?? 0,
    remitente: raw.emisor.id_usuario,
    remitente_nombre: raw.emisor.nombre_completo,
    contenido: raw.contenido,
    creado_en: raw.creado_en,
    leido: raw.leido,
    editado: raw.editado,
    ...(adjuntos ? { adjuntos } : {}),
  };
}

export function mapConversation(raw: BackendConversation): Conversation {
  return {
    id: raw.id_conversacion,
    nombre: raw.nombre,
    tipo: raw.tipo as 'privada' | 'grupal',
    es_familia: raw.es_familia ?? false,
    ultimo_mensaje: raw.ultimo_mensaje,
    ultimo_mensaje_fecha: raw.ultimo_mensaje_creado_en,
    no_leidos: raw.no_leidos ?? 0,
    participante_nombre: raw.tipo === 'grupal' ? '' : raw.nombre,
    participante_avatar: null,
  };
}

export function mapGroupMember(raw: BackendGroupMember): GroupMember {
  return {
    id: raw.id_miembro,
    idUsuario: raw.id_usuario,
    nombre: raw.nombre_completo,
    rol: '',
    avatar: null,
  };
}
