// Waste registration domain shared by the mobile app (WasteRegisterScreen,
// src/services/waste.ts) and the web app (web/src/routes/WasteRegister.tsx).

export interface WasteDecision {
  readonly id_decision: number;
  decision: string;
  readonly creado_en: string;
  estado: boolean;
}

export interface WasteDecisionOption {
  readonly id_decision: number;
  readonly decision: string;
}

// Initial options (backend seed: id 1-4). Keep in sync with the backend
// migration that inserts the DecisionMerma rows.
export const WASTE_DECISION_OPTIONS: readonly WasteDecisionOption[] = [
  { id_decision: 1, decision: 'Donar' },
  { id_decision: 2, decision: 'Desechar' },
  { id_decision: 3, decision: 'Vender más barato' },
  { id_decision: 4, decision: 'Compostar' },
];

export interface WasteProductInfo {
  readonly id: number;
  readonly producto: string;
  readonly publicacion: number;
  readonly stock_restante: number;
}

export interface WasteDecisionInfo {
  readonly id: number;
  readonly nombre: string;
}

export interface WasteRecord {
  readonly id_merma: number;
  readonly fk_producto_semanal: number | null;
  readonly cantidad: number;
  readonly motivo: string;
  readonly comentarios: string | null;
  readonly fk_decision: number;
  readonly creado_en: string;
  readonly estado: boolean;
  readonly producto_info: WasteProductInfo | null;
  readonly decision_info: WasteDecisionInfo | null;
}

// Payload para crear un registro de merma (POST /api/mermas/).
export interface WasteRecordPayload {
  fk_producto_semanal: number;
  cantidad: number;
  motivo: string;
  comentarios?: string;
  fk_decision: number;
}

// Producto publicado (ProductoSemanal) para el selector de la pantalla.
export interface PublishedProduct {
  readonly id_producto_semanal: number;
  producto: string;
  unidad: string;
  stock: number;
  precio: string;
  foto: string;
}

export interface PublishedPublication {
  readonly id_publicacion: number;
  agricultor: { id_usuario: number; nombre: string; apellido: string } | null;
  fecha_publicacion: string;
  semana: string;
  productos: PublishedProduct[];
}
