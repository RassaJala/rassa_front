import { useCallback, useState } from 'react';

import type {
  SettlementEstado,
  SettlementListParams,
} from '@/common/settlements';
import { parseDate } from '@/common/waste';

const EMPTY_FILTERS: SettlementListParams = {};

// Draft date fields (modal) vs applied filters (post-Buscar). Estado and
// agricultor apply immediately; dates only after Buscar (S2). Encapsulates the
// whole filter state machine of SettlementListScreen (R2-2): drafts, applied
// params, pagination page, the date-picker target and the farmer picker
// visibility, plus the derived validity flags and the handlers.
export function useSettlementFilters(): {
  draftDesde: string;
  setDraftDesde: (value: string) => void;
  draftHasta: string;
  setDraftHasta: (value: string) => void;
  applied: SettlementListParams;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  pickerTarget: 'desde' | 'hasta' | null;
  setPickerTarget: React.Dispatch<
    React.SetStateAction<'desde' | 'hasta' | null>
  >;
  showFarmerPicker: boolean;
  setShowFarmerPicker: (value: boolean) => void;
  isDateRangeInvalid: boolean;
  showReset: boolean;
  handleApply: () => void;
  handleReset: () => void;
  handleEstadoChange: (estado: SettlementEstado | '') => void;
  handleFarmerSelect: (farmerId: number | undefined) => void;
} {
  const [draftDesde, setDraftDesde] = useState('');
  const [draftHasta, setDraftHasta] = useState('');
  const [applied, setApplied] = useState<SettlementListParams>(EMPTY_FILTERS);
  const [pickerTarget, setPickerTarget] = useState<'desde' | 'hasta' | null>(
    null,
  );
  const [showFarmerPicker, setShowFarmerPicker] = useState(false);
  const [page, setPage] = useState(1);

  const desdeDate = draftDesde ? parseDate(draftDesde) : null;
  const hastaDate = draftHasta ? parseDate(draftHasta) : null;
  const isDateRangeInvalid =
    desdeDate !== null && hastaDate !== null && desdeDate > hastaDate;

  const showReset =
    draftDesde !== '' ||
    draftHasta !== '' ||
    applied.agricultor !== undefined ||
    applied.estado !== undefined ||
    applied.periodo_inicio !== undefined ||
    applied.periodo_fin !== undefined;

  const handleApply = useCallback(() => {
    if (isDateRangeInvalid) return;
    setPage(1);
    setApplied((prev) => {
      const next: SettlementListParams = { ...prev };
      if (draftDesde) next.periodo_inicio = draftDesde;
      else delete next.periodo_inicio;
      if (draftHasta) next.periodo_fin = draftHasta;
      else delete next.periodo_fin;
      return next;
    });
  }, [isDateRangeInvalid, draftDesde, draftHasta]);

  const handleReset = useCallback(() => {
    setDraftDesde('');
    setDraftHasta('');
    setPage(1);
    setApplied({});
  }, []);

  const handleEstadoChange = useCallback((estado: SettlementEstado | '') => {
    setPage(1);
    setApplied((prev) => {
      const next: SettlementListParams = { ...prev };
      if (estado) next.estado = estado;
      else delete next.estado;
      return next;
    });
  }, []);

  const handleFarmerSelect = useCallback((farmerId: number | undefined) => {
    setShowFarmerPicker(false);
    setPage(1);
    setApplied((prev) => {
      const next: SettlementListParams = { ...prev };
      if (farmerId !== undefined) next.agricultor = farmerId;
      else delete next.agricultor;
      return next;
    });
  }, []);

  return {
    draftDesde,
    setDraftDesde,
    draftHasta,
    setDraftHasta,
    applied,
    page,
    setPage,
    pickerTarget,
    setPickerTarget,
    showFarmerPicker,
    setShowFarmerPicker,
    isDateRangeInvalid,
    showReset,
    handleApply,
    handleReset,
    handleEstadoChange,
    handleFarmerSelect,
  };
}
