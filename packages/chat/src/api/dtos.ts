// Chat backend response shapes (raw from API) — shared core (D4).

export interface BackendMessage {
  id_mensaje: number;
  emisor: { id_usuario: number; nombre_completo: string };
  contenido: string;
  leido: boolean;
  editado: boolean;
  creado_en: string;
  tipo?: 'texto' | 'imagen' | 'audio' | 'video';
  url_documento?: string | null;
}

export interface BackendConversation {
  id_conversacion: number;
  tipo: string;
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

// Backend envelope: { ok, data, mensaje } — `message` kept as alias for legacy/mock parity.
export interface ChatApiEnvelope<T> {
  ok: boolean;
  data: T;
  mensaje?: string;
  message?: string;
}
