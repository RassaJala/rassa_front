import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useQuery } from '@tanstack/react-query';

import { fetchTiposPago } from '@/common/payments';
import type { TipoPago } from '@/common/payments';
import type { MarcarPagadaParams } from '@/common/settlements';
import { colors } from '@/constants/colors';
import api from '@/services/api';
import { parseApiError } from '@/utils/apiErrors';

import type { AdminPalette } from '../merma/colors';

interface Props {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly onConfirm: (params: MarcarPagadaParams) => Promise<unknown>;
  readonly palette: AdminPalette;
}

export default function PagarModal({
  visible,
  onClose,
  onConfirm,
  palette,
}: Props): React.JSX.Element | null {
  const { surface, fg, muted, border, brand, bg, segBg, coral } = palette;

  const {
    data: tiposPago = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<TipoPago[]>({
    queryKey: ['tipos-pago'],
    queryFn: () => fetchTiposPago(api),
    enabled: visible,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1,
  });

  const [selectedTipo, setSelectedTipo] = useState<number | null>(null);
  const [referencia, setReferencia] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  // Synchronous submit lock (R4-3): React state updates are async, so two taps
  // in the same frame can both observe isSubmitting === false. The ref closes
  // that window — it is read/written synchronously inside handleConfirm.
  const submitLockRef = useRef(false);

  // Reset draft state every time the modal reopens.
  useEffect(() => {
    if (visible) {
      setSelectedTipo(null);
      setReferencia('');
      setSubmitError('');
      setIsSubmitting(false);
      submitLockRef.current = false;
    }
  }, [visible]);

  // Default to the first payment type once the list arrives.
  useEffect(() => {
    if (tiposPago.length > 0 && selectedTipo === null) {
      setSelectedTipo(tiposPago[0]?.id_tipo_pago ?? null);
    }
  }, [tiposPago, selectedTipo]);

  const handleConfirm = useCallback(async () => {
    if (submitLockRef.current || isSubmitting) return;
    if (selectedTipo === null) return;
    submitLockRef.current = true;
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const trimmed = referencia.trim();
      await onConfirm(
        trimmed
          ? { tipo_pago: selectedTipo, referencia: trimmed }
          : { tipo_pago: selectedTipo },
      );
    } catch (e) {
      setSubmitError(parseApiError(e, 'No se pudo registrar el pago'));
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  }, [selectedTipo, isSubmitting, referencia, onConfirm]);

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          onPress={(e) => e?.stopPropagation()}
          style={[styles.sheet, { backgroundColor: surface }]}
        >
          <Text style={[styles.title, { color: fg }]}>Registrar pago</Text>

          <Text style={[styles.sectionLabel, { color: muted }]}>
            Tipo de pago
          </Text>
          {isLoading ? (
            <ActivityIndicator color={brand} style={styles.loader} />
          ) : isError ? (
            <Pressable onPress={() => void refetch()} style={styles.loader}>
              <Text style={{ color: coral }}>
                {parseApiError(
                  error,
                  'No se pudieron cargar los tipos de pago',
                )}
              </Text>
            </Pressable>
          ) : (
            <View style={styles.tipoList}>
              {tiposPago.map((tipo) => {
                const selected = tipo.id_tipo_pago === selectedTipo;
                return (
                  <Pressable
                    key={tipo.id_tipo_pago}
                    onPress={() => setSelectedTipo(tipo.id_tipo_pago)}
                    style={[
                      styles.tipoRow,
                      {
                        backgroundColor: selected ? segBg : bg,
                        borderColor: selected ? brand : border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.radio,
                        { borderColor: selected ? brand : muted },
                      ]}
                    >
                      {selected ? (
                        <View
                          style={[styles.radioDot, { backgroundColor: brand }]}
                        />
                      ) : null}
                    </View>
                    <Text style={[styles.tipoName, { color: fg }]}>
                      {tipo.nombre}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          <Text style={[styles.sectionLabel, { color: muted }]}>
            Referencia (opcional)
          </Text>
          <TextInput
            value={referencia}
            onChangeText={setReferencia}
            placeholder="Nº de transferencia o efectivo"
            placeholderTextColor={muted}
            accessibilityLabel="Referencia (opcional)"
            style={[
              styles.input,
              { backgroundColor: bg, borderColor: border, color: fg },
            ]}
          />

          {submitError ? (
            <Text style={[styles.error, { color: coral }]}>{submitError}</Text>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              onPress={onClose}
              disabled={isSubmitting}
              style={[styles.btn, styles.cancelBtn, { borderColor: border }]}
            >
              <Text style={[styles.cancelText, { color: fg }]}>Cancelar</Text>
            </Pressable>
            <Pressable
              onPress={() => void handleConfirm()}
              testID="pagar-confirm"
              disabled={isSubmitting || selectedTipo === null}
              style={[styles.btn, { backgroundColor: brand }]}
            >
              <Text style={styles.confirmText}>
                {isSubmitting ? 'Registrando…' : 'Confirmar pago'}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.modalOverlayBg,
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 32,
    gap: 8,
  },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 8,
    marginBottom: 4,
  },
  loader: { paddingVertical: 16 },
  tipoList: { gap: 8 },
  tipoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  tipoName: { fontSize: 15, fontWeight: '600' },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  error: { fontSize: 13, marginTop: 4 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
  },
  btn: {
    minWidth: 130,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  cancelBtn: { borderWidth: 1 },
  cancelText: { fontSize: 15, fontWeight: '600' },
  confirmText: { fontSize: 15, fontWeight: '700', color: colors.iconWhite },
});
