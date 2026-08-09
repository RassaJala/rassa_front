export type RecoleccionEstado =
  'pendiente' | 'en_ruta' | 'recolectado' | 'cancelado';

export interface Recoleccion {
  readonly id_recoleccion: number;
  readonly fk_agricultor: number | null;
  readonly agricultor_nombre: string | null;
  readonly fecha_recoleccion: string;
  readonly hora_inicio: string | null;
  readonly hora_fin: string | null;
  readonly estado: RecoleccionEstado;
  readonly comentarios: string | null;
  readonly creado_en: string;
}

export interface RecoleccionPayload {
  readonly fk_agricultor: number;
  readonly fecha_recoleccion: string;
  readonly hora_inicio?: string | null;
  readonly hora_fin?: string | null;
  readonly comentarios?: string | null;
}

export interface RecoleccionList {
  readonly count: number;
  readonly next: string | null;
  readonly previous: string | null;
  readonly results: Recoleccion[];
}
