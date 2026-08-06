import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { colors } from '@/constants/colors';
import { useAgricultoresUbicacion } from '@/hooks/useAgricultoresUbicacion';
import type { AgricultorAgricultorItem } from '@/hooks/useAgricultoresUbicacion';
import { createRecoleccion } from '@/services/recolecciones';
import { useTheme } from '@/store/ThemeContext';
import type { Recoleccion, RecoleccionPayload } from '@/types/recolecciones';
import { extractApiError } from '@/utils/apiErrors';

import AgricultorSelector from './AgricultorSelector';
import {
  buildDuplicateKeys,
  getFullName,
  normalizeHora,
  recoleccionDuplicateKey,
  todayString,
  validateProgramarForm,
} from './utils';

interface ScheduleRecoleccionModalProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly onSaved: (message: string) => void;
  readonly existing: readonly Recoleccion[];
}

export default function ScheduleRecoleccionModal({
  visible,
  onClose,
  onSaved,
  existing,
}: ScheduleRecoleccionModalProps): React.JSX.Element | null {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';

  const bg = isDark ? colors.admBgD : colors.admBgL;
  const fg = isDark ? colors.admFgD : colors.admFgL;
  const muted = isDark ? colors.admMutedD : colors.admMutedL;
  const border = isDark ? colors.admBorderD : colors.admBorderL;
  const brand = isDark ? colors.admBrandD : colors.admBrandL;
  const surface = isDark ? colors.admSurfaceD : colors.admSurfaceL;
  const activeBg = isDark ? colors.admActiveBgD : colors.admActiveBgL;
  const white = colors.iconWhite;
  const redCoral = colors.brandRedCoral;

  const {
    agricultores,
    isLoading: isLoadingAgricultores,
    isError: isErrorAgricultores,
    truncated: agricultoresTruncados,
    errores: erroresAgricultores,
    refetch: refetchAgricultores,
  } = useAgricultoresUbicacion({ enabled: visible });

  const [agricultor, setAgricultor] = useState<AgricultorAgricultorItem | null>(
    null,
  );
  const [fecha, setFecha] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [comentarios, setComentarios] = useState('');
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    if (visible) {
      setAgricultor(null);
      setFecha(todayString());
      setHoraInicio('');
      setHoraFin('');
      setComentarios('');
      setQuery('');
      setError(null);
    }
  }, [visible]);

  const mutation = useMutation({
    mutationFn: (payload: RecoleccionPayload) => createRecoleccion(payload),
    onSuccess: () => {
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['recolecciones'] });
      onSaved('Recolección programada correctamente.');
      onClose();
    },
    onError: (err: unknown) => {
      const detail = extractApiError(err, [
        'fk_agricultor',
        'fecha_recoleccion',
        'hora_inicio',
        'hora_fin',
        'comentarios',
      ]);
      setError(detail);
    },
  });

  const duplicateKeys = useMemo(() => buildDuplicateKeys(existing), [existing]);

  const gruposFiltrados = useMemo(() => {
    const termino = query.trim().toLowerCase();
    return agricultores
      .map((municipio) => ({
        municipioNombre: municipio.municipioNombre,
        localidades: municipio.localidades
          .map((localidad) => ({
            localidadNombre: localidad.localidadNombre,
            agricultores: localidad.agricultores.filter((a) => {
              if (!termino) return true;
              return getFullName(a).toLowerCase().includes(termino);
            }),
          }))
          .filter((localidad) => localidad.agricultores.length > 0),
      }))
      .filter((municipio) => municipio.localidades.length > 0);
  }, [agricultores, query]);

  function handleSubmit() {
    if (mutation.isPending) return;
    const validationError = validateProgramarForm({
      agricultorSeleccionado: agricultor !== null,
      fecha,
      horaInicio,
      horaFin,
    });
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!agricultor) return;
    if (
      duplicateKeys.has(recoleccionDuplicateKey(agricultor.id_usuario, fecha))
    ) {
      setError('Este agricultor ya tiene una recolección para esta fecha.');
      return;
    }
    setError(null);
    mutation.mutate({
      fk_agricultor: agricultor.id_usuario,
      fecha_recoleccion: fecha,
      hora_inicio: horaInicio ? normalizeHora(horaInicio) : null,
      hora_fin: horaFin ? normalizeHora(horaFin) : null,
      comentarios: comentarios.trim() || null,
    });
  }

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: bg }}>
        <View
          style={{
            paddingTop: 60,
            paddingHorizontal: 20,
            paddingBottom: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text style={{ fontSize: 22, fontWeight: '700', color: fg }}>
            Programar recolección
          </Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: redCoral }}>
              Cancelar
            </Text>
          </Pressable>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: fg }}>
              Fecha (AAAA-MM-DD)
            </Text>
            <TextInput
              value={fecha}
              onChangeText={setFecha}
              placeholder="AAAA-MM-DD"
              placeholderTextColor={muted}
              autoCapitalize="none"
              style={{
                marginTop: 6,
                backgroundColor: surface,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: border,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 15,
                color: fg,
              }}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: fg }}>
                  Hora inicio
                </Text>
                <TextInput
                  value={horaInicio}
                  onChangeText={setHoraInicio}
                  placeholder="HH:MM (opcional)"
                  placeholderTextColor={muted}
                  keyboardType="numbers-and-punctuation"
                  style={{
                    marginTop: 6,
                    backgroundColor: surface,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: border,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 15,
                    color: fg,
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: fg }}>
                  Hora fin
                </Text>
                <TextInput
                  value={horaFin}
                  onChangeText={setHoraFin}
                  placeholder="HH:MM (opcional)"
                  placeholderTextColor={muted}
                  keyboardType="numbers-and-punctuation"
                  style={{
                    marginTop: 6,
                    backgroundColor: surface,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: border,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 15,
                    color: fg,
                  }}
                />
              </View>
            </View>

            <Text
              style={{
                fontSize: 13,
                fontWeight: '700',
                color: fg,
                marginTop: 14,
              }}
            >
              Comentarios
            </Text>
            <TextInput
              value={comentarios}
              onChangeText={setComentarios}
              placeholder="Notas para la recolección (opcional)"
              placeholderTextColor={muted}
              multiline
              numberOfLines={3}
              style={{
                marginTop: 6,
                backgroundColor: surface,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: border,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 15,
                color: fg,
                minHeight: 76,
                textAlignVertical: 'top',
              }}
            />

            <Text
              style={{
                fontSize: 13,
                fontWeight: '700',
                color: fg,
                marginTop: 18,
              }}
            >
              Agricultor
            </Text>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar por nombre…"
              placeholderTextColor={muted}
              style={{
                marginTop: 6,
                backgroundColor: surface,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: border,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 15,
                color: fg,
              }}
            />

            {agricultor ? (
              <View
                style={{
                  marginTop: 10,
                  backgroundColor: activeBg,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: brand }}>
                  Seleccionado: {getFullName(agricultor)}
                </Text>
              </View>
            ) : null}

            <AgricultorSelector
              grupos={gruposFiltrados}
              isLoading={isLoadingAgricultores}
              isError={isErrorAgricultores}
              truncated={agricultoresTruncados}
              errores={erroresAgricultores}
              selectedId={agricultor?.id_usuario ?? null}
              duplicateKeys={duplicateKeys}
              fecha={fecha}
              onRetry={() => refetchAgricultores()}
              onSelect={setAgricultor}
            />

            {error ? (
              <Text
                style={{
                  marginTop: 14,
                  fontSize: 13,
                  fontWeight: '600',
                  color: redCoral,
                  textAlign: 'center',
                }}
              >
                {error}
              </Text>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>

        <View
          style={{
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderTopWidth: 1,
            borderTopColor: border,
            backgroundColor: surface,
          }}
        >
          <Pressable
            onPress={handleSubmit}
            disabled={mutation.isPending}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              backgroundColor: brand,
              borderRadius: 12,
              paddingVertical: 14,
              opacity: mutation.isPending ? 0.6 : 1,
            }}
          >
            {mutation.isPending ? (
              <ActivityIndicator size="small" color={white} />
            ) : (
              <MaterialCommunityIcons
                name="calendar-check"
                size={20}
                color={white}
              />
            )}
            <Text style={{ fontSize: 15, fontWeight: '700', color: white }}>
              {mutation.isPending ? 'Guardando…' : 'Programar recolección'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
