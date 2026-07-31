// createChatApi(http) — the 12 chat operations over an injected AxiosInstance (D1).
// Behavior mirrors the pre-refactor src/services/chat.ts exactly (PR-B1: no-op refactor).

import type { AxiosInstance } from 'axios';

import type {
  AddGroupMemberPayload,
  Conversation,
  CreateConversationPayload,
  CreateGroupPayload,
  GroupMember,
  Message,
  PaginatedResponse,
  RenameGroupPayload,
  SearchUser,
  SearchUserResult,
  SendMessagePayload,
  SendMessageWithMediaPayload,
} from '../domain/types';

function mapSearchUser(raw: SearchUserResult): SearchUser {
  return {
    idUsuario: raw.id_usuario,
    nombreCompleto: raw.nombre_completo,
    correo: raw.correo,
    rol: raw.rol,
  };
}
import { appendDocument } from './adapters';
import type {
  BackendConversation,
  BackendGroupMember,
  BackendMessage,
  ChatApiEnvelope,
} from './dtos';
import {
  CONVERSATIONS_PATH,
  CREATE_GROUP_PATH,
  CREATE_PRIVATE_PATH,
  SEND_MEDIA_PATH,
  SEND_MESSAGE_PATH,
  addGroupMemberPath,
  conversationReadPath,
  groupMembersPath,
  messageDeletePath,
  messageEditPath,
  messagesPath,
  renameGroupPath,
  searchUsersPath,
} from './endpoints';

import { mapConversation, mapGroupMember, mapMessage } from './mappers';

// Unwrap the {ok, data, mensaje} envelope. Throws on ok === false.
function unwrap<T>(response: { data: unknown }): T {
  const body = response.data as ChatApiEnvelope<T>;
  if (body.ok === false) {
    throw new Error(
      body.mensaje ?? body.message ?? 'Error en la respuesta del servidor',
    );
  }
  return body.data;
}

export interface ChatApi {
  getConversations(): Promise<PaginatedResponse<Conversation>>;
  getMessages(
    conversationId: number,
    page: number,
  ): Promise<PaginatedResponse<Message>>;
  sendMessage(payload: SendMessagePayload): Promise<Message>;
  createPrivateConversation(
    payload: CreateConversationPayload,
  ): Promise<Conversation>;
  markConversationAsRead(conversationId: number): Promise<void>;
  editMessage(
    messageId: number,
    contenido: string,
    conversationId?: number,
  ): Promise<Message>;
  deleteMessage(messageId: number): Promise<void>;
  sendMessageWithMedia(payload: SendMessageWithMediaPayload): Promise<Message>;
  getGroupMembers(conversationId: number): Promise<GroupMember[]>;
  createGroup(payload: CreateGroupPayload): Promise<Conversation>;
  renameGroup(
    conversationId: number,
    payload: RenameGroupPayload,
  ): Promise<Conversation>;
  addGroupMember(
    conversationId: number,
    payload: AddGroupMemberPayload,
  ): Promise<void>;
  searchUsers(q: string, signal?: AbortSignal): Promise<SearchUser[]>;
}

export function createChatApi(http: AxiosInstance): ChatApi {
  const api: ChatApi = {
    async getConversations() {
      const res = await http.get(CONVERSATIONS_PATH);
      const raw = unwrap<
        BackendConversation[] | PaginatedResponse<BackendConversation>
      >(res);
      const rawList = Array.isArray(raw) ? raw : raw.results;
      return {
        count: rawList.length,
        next: null,
        previous: null,
        results: rawList.map(mapConversation),
      };
    },

    async getMessages(conversationId, page) {
      const res = await http.get(messagesPath(conversationId, page));
      const raw = unwrap<BackendMessage[] | PaginatedResponse<BackendMessage>>(
        res,
      );
      if (Array.isArray(raw)) {
        return {
          count: raw.length,
          next: null,
          previous: null,
          results: raw.map((m) => mapMessage(m, conversationId)),
        };
      }
      return {
        count: raw.count,
        next: raw.next,
        previous: raw.previous,
        results: (raw.results ?? []).map((m) => mapMessage(m, conversationId)),
      };
    },

    async sendMessage(payload) {
      const res = await http.post(SEND_MESSAGE_PATH, {
        fk_conversacion: payload.conversacion,
        contenido: payload.contenido,
      });
      const raw = unwrap<BackendMessage>(res);
      return mapMessage(raw, payload.conversacion);
    },

    async createPrivateConversation(payload) {
      const res = await http.post(CREATE_PRIVATE_PATH, payload);
      const data = unwrap<{ id_conversacion: number } | Conversation>(res);
      const id =
        typeof data === 'object' && 'id_conversacion' in data
          ? data.id_conversacion
          : data.id;

      // Return minimal Conversation; onSuccess invalidates queries and refetch completes it.
      return {
        id,
        nombre: '',
        tipo: 'privada',
        es_familia: false,
        ultimo_mensaje: null,
        ultimo_mensaje_fecha: null,
        no_leidos: 0,
        participante_nombre: '',
        participante_avatar: null,
      };
    },

    async markConversationAsRead(conversationId) {
      const res = await http.patch(conversationReadPath(conversationId));
      unwrap(res);
    },

    async editMessage(messageId, contenido, conversationId) {
      const res = await http.patch(messageEditPath(messageId), { contenido });
      const raw = unwrap<BackendMessage>(res);
      return mapMessage(raw, conversationId);
    },

    async deleteMessage(messageId) {
      const res = await http.patch(messageDeletePath(messageId));
      unwrap(res);
    },

    async sendMessageWithMedia(payload) {
      const formData = new FormData();
      formData.append('conversacion', String(payload.conversacion));
      formData.append('tipo_documento', payload.tipo_documento);
      if (payload.contenido) {
        formData.append('contenido', payload.contenido);
      }
      appendDocument(formData, payload.documento);

      const res = await http.post(SEND_MEDIA_PATH, formData, {
        headers: { 'Content-Type': null },
      });
      const data = unwrap<{
        id_mensaje: number;
        id_documento: number;
        url_documento: string;
      }>(res);
      return {
        id: data.id_mensaje,
        conversacion: payload.conversacion,
        remitente: payload.remitente,
        remitente_nombre: payload.remitente_nombre,
        contenido: payload.contenido ?? '',
        creado_en: new Date().toISOString(),
        leido: false,
        adjuntos: [
          {
            id: data.id_documento,
            mensaje: data.id_mensaje,
            archivo: data.url_documento,
            tipo: payload.tipo_documento,
            nombre: '',
            tamaño: 0,
          },
        ],
      };
    },

    async getGroupMembers(conversationId) {
      const res = await http.get(groupMembersPath(conversationId));
      const rawList = unwrap<BackendGroupMember[]>(res);
      return rawList.map(mapGroupMember);
    },

    async createGroup(payload) {
      const res = await http.post(CREATE_GROUP_PATH, payload);
      const data = unwrap<{ id_conversacion: number } | Conversation>(res);
      const id =
        typeof data === 'object' && 'id_conversacion' in data
          ? data.id_conversacion
          : data.id;
      return {
        id,
        nombre: payload.nombre,
        tipo: 'grupal',
        es_familia: false,
        ultimo_mensaje: null,
        ultimo_mensaje_fecha: null,
        no_leidos: 0,
        participante_nombre: payload.nombre,
        participante_avatar: null,
      };
    },

    async renameGroup(conversationId, payload) {
      const res = await http.patch(renameGroupPath(conversationId), payload);
      const data = unwrap<
        { id_conversacion: number; nombre: string } | Conversation
      >(res);
      if (typeof data === 'object' && 'id_conversacion' in data) {
        return {
          id: data.id_conversacion,
          nombre: data.nombre,
          tipo: 'grupal',
          es_familia: false,
          ultimo_mensaje: null,
          ultimo_mensaje_fecha: null,
          no_leidos: 0,
          participante_nombre: data.nombre,
          participante_avatar: null,
        };
      }
      return data;
    },

    async addGroupMember(conversationId, payload) {
      const res = await http.post(addGroupMemberPath(conversationId), payload);
      unwrap(res);
    },

    async searchUsers(q, signal) {
      if (q.length < 3) return [];
      const res = await http.get(searchUsersPath(q), signal ? { signal } : {});
      const data = unwrap<SearchUserResult[]>(res);
      return data.map(mapSearchUser);
    },
  };

  return api;
}
