// Chat endpoint paths — internal to @rassa/chat (not re-exported).

export const CONVERSATIONS_PATH = '/chat/usuarios/conversaciones/';
export const SEND_MESSAGE_PATH = '/chat/mensajes/enviar/';
export const CREATE_PRIVATE_PATH = '/chat/conversaciones/crear-privada/';
export const SEND_MEDIA_PATH = '/chat/mensajes/enviar-con-documento/';
export const CREATE_GROUP_PATH = '/chat/conversaciones/crear-grupal/';

export const messagesPath = (conversationId: number, page: number): string =>
  `/chat/conversaciones/${conversationId}/mensajes/?page=${page}`;

export const messageReadPath = (messageId: number): string =>
  `/chat/mensajes/${messageId}/leer/`;

export const messageEditPath = (messageId: number): string =>
  `/chat/mensajes/${messageId}/editar/`;

export const messageDeletePath = (messageId: number): string =>
  `/chat/mensajes/${messageId}/inactivar/`;

export const groupMembersPath = (conversationId: number): string =>
  `/chat/conversaciones/${conversationId}/integrantes/`;

export const renameGroupPath = (conversationId: number): string =>
  `/chat/conversaciones/${conversationId}/renombrar/`;

export const addGroupMemberPath = (conversationId: number): string =>
  `/chat/conversaciones/${conversationId}/agregar-integrante/`;

export const conversationReadPath = (conversationId: number): string =>
  `/chat/conversaciones/${conversationId}/leer/`;

export const searchUsersPath = (q: string): string =>
  `/chat/usuarios/buscar/?q=${encodeURIComponent(q)}`;
