import api from '@/services/api';
import type {
  AddGroupMemberPayload,
  BackendConversation,
  BackendGroupMember,
  BackendMessage,
  Conversation,
  CreateConversationPayload,
  CreateGroupPayload,
  GroupMember,
  Message,
  PaginatedResponse,
  RenameGroupPayload,
  SendMessagePayload,
  SendMessageWithMediaPayload,
} from '@/types/chat';

interface ApiResponseWrapper<T> {
  ok: boolean;
  data: T;
  message: string;
}

// Unwrap helper: backend wraps responses in {ok, data, message}
function unwrap<T>(response: { data: unknown }): T {
  const body = response.data as ApiResponseWrapper<T>;
  return body.data;
}

// --- Field mappers ---

function mapMessage(raw: BackendMessage): Message {
  return {
    id: raw.id_mensaje,
    conversacion: 0, // not in serializer; filled by caller if needed
    remitente: raw.emisor.id_usuario,
    remitente_nombre: raw.emisor.nombre_completo,
    contenido: raw.contenido,
    creado_en: raw.creado_en,
    leido: raw.leido,
    editado: raw.editado,
  };
}

function mapConversation(raw: BackendConversation): Conversation {
  return {
    id: raw.id_conversacion,
    nombre: raw.nombre,
    tipo: raw.tipo ? 'grupal' : 'privada',
    es_familia: raw.es_familia ?? false,
    ultimo_mensaje: raw.ultimo_mensaje,
    ultimo_mensaje_fecha: raw.ultimo_mensaje_creado_en,
    no_leidos: raw.no_leidos ?? 0,
    participante_nombre: raw.nombre,
    participante_avatar: null,
  };
}

function mapGroupMember(raw: BackendGroupMember): GroupMember {
  return {
    id: raw.id_miembro,
    nombre: raw.nombre_completo,
    rol: '', // backend doesn't return role
    avatar: null,
  };
}

// --- API functions ---

export async function getConversations(): Promise<
  PaginatedResponse<Conversation>
> {
  const res = await api.get('/chat/usuarios/conversaciones/');
  const rawList: BackendConversation[] = unwrap<BackendConversation[]>(res);
  return {
    count: rawList.length,
    next: null,
    previous: null,
    results: rawList.map(mapConversation),
  };
}

export async function getMessages(
  conversationId: number,
  page: number,
): Promise<PaginatedResponse<Message>> {
  const res = await api.get(
    `/chat/conversaciones/${conversationId}/mensajes/?page=${page}`,
  );
  const rawPaginated: PaginatedResponse<BackendMessage> =
    unwrap<PaginatedResponse<BackendMessage>>(res);
  return {
    count: rawPaginated.count,
    next: rawPaginated.next,
    previous: rawPaginated.previous,
    results: rawPaginated.results.map((m) => ({
      ...mapMessage(m),
      conversacion: conversationId,
    })),
  };
}

export async function sendMessage(
  payload: SendMessagePayload,
): Promise<Message> {
  const res = await api.post('/chat/mensajes/enviar/', {
    fk_conversacion: payload.conversacion,
    contenido: payload.contenido,
  });
  const raw: BackendMessage = unwrap<BackendMessage>(res);
  return { ...mapMessage(raw), conversacion: payload.conversacion };
}

export async function createPrivateConversation(
  payload: CreateConversationPayload,
): Promise<Conversation> {
  const res = await api.post('/chat/conversaciones/crear-privada/', payload);
  const data = unwrap<{ id_conversacion: number } | Conversation>(res);
  const id =
    typeof data === 'object' && 'id_conversacion' in data
      ? data.id_conversacion
      : data.id;
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
}

export async function markMessageAsRead(messageId: number): Promise<Message> {
  const res = await api.patch(`/chat/mensajes/${messageId}/leer/`);
  // Backend returns {ok: true, mensaje: "..."} — not a full message
  void unwrap(res);
  return {
    id: messageId,
    conversacion: 0,
    remitente: 0,
    remitente_nombre: '',
    contenido: '',
    creado_en: '',
    leido: true,
  };
}

export async function editMessage(
  messageId: number,
  contenido: string,
): Promise<Message> {
  const res = await api.patch(`/chat/mensajes/${messageId}/editar/`, {
    contenido,
  });
  const raw: BackendMessage = unwrap<BackendMessage>(res);
  return mapMessage(raw);
}

export async function deleteMessage(messageId: number): Promise<Message> {
  const res = await api.patch(`/chat/mensajes/${messageId}/inactivar/`);
  // Backend returns {ok: true, mensaje: "..."} — not a full message
  void unwrap(res);
  return {
    id: messageId,
    conversacion: 0,
    remitente: 0,
    remitente_nombre: '',
    contenido: '',
    creado_en: '',
    leido: false,
    activo: false,
  };
}

export async function sendMessageWithMedia(
  payload: SendMessageWithMediaPayload,
): Promise<Message> {
  const formData = new FormData();
  formData.append('conversacion', String(payload.conversacion));
  formData.append('tipo_documento', payload.tipo_documento);
  if (payload.contenido) {
    formData.append('contenido', payload.contenido);
  }
  formData.append('archivo', payload.documento as Blob);

  const res = await api.post('/chat/mensajes/enviar-con-documento/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  // Backend returns partial: {ok, data: {id_mensaje, id_documento, url_documento}}
  void unwrap<{
    id_mensaje: number;
    id_documento: number;
    url_documento: string;
  }>(res);
  // Return a placeholder — hooks invalidate queries instead of using this
  return {
    id: Date.now(),
    conversacion: payload.conversacion,
    remitente: 0,
    remitente_nombre: '',
    contenido: payload.contenido ?? '',
    creado_en: new Date().toISOString(),
    leido: false,
  };
}

export async function getGroupMembers(
  conversationId: number,
): Promise<GroupMember[]> {
  const res = await api.get(
    `/chat/conversaciones/${conversationId}/integrantes/`,
  );
  const rawList: BackendGroupMember[] = unwrap<BackendGroupMember[]>(res);
  return rawList.map(mapGroupMember);
}

export async function createGroup(
  payload: CreateGroupPayload,
): Promise<Conversation> {
  const res = await api.post('/chat/conversaciones/crear-grupal/', payload);
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
}

export async function renameGroup(
  conversationId: number,
  payload: RenameGroupPayload,
): Promise<Conversation> {
  const res = await api.patch(
    `/chat/conversaciones/${conversationId}/renombrar/`,
    payload,
  );
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
}

export async function addGroupMember(
  conversationId: number,
  payload: AddGroupMemberPayload,
): Promise<GroupMember> {
  const res = await api.post(
    `/chat/conversaciones/${conversationId}/agregar-integrante/`,
    payload,
  );
  // Backend returns {ok, data: {id_conversacion}} — not a full member
  void unwrap<unknown>(res);
  return {
    id: 0,
    nombre: '',
    rol: '',
    avatar: null,
  };
}
