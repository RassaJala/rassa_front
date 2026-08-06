import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { TextStyle, ViewStyle } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';

import { colors } from '@/constants/colors';
import { useAgricultoresUbicacion } from '@/hooks/useAgricultoresUbicacion';
import type {
  AgricultorAgricultorItem,
  AgricultorUbicacion,
} from '@/hooks/useAgricultoresUbicacion';
import { createRecoleccion } from '@/services/recolecciones';
import { useTheme } from '@/store/ThemeContext';
import type { Recoleccion, RecoleccionPayload } from '@/types/recolecciones';
import { extractApiError } from '@/utils/apiErrors';

import AgricultorSelector from './AgricultorSelector';
import DatePickerSheet from './DatePickerSheet';
import TimePickerSheet from './TimePickerSheet';
import {
  buildDuplicateKeys,
  formatHora,
  getFullName,
  MONTHS,
  normalizeHora,
  parseFecha,
  recoleccionDuplicateKey,
  todayString,
  validateProgramarForm,
} from './utils';

function formatDateDisplay(dateStr: string): string {
  const parsed = parseFecha(dateStr);
  if (!parsed) return 'Seleccionar fecha';
  const monthName = MONTHS[parsed.getMonth()] ?? '';
  return `${parsed.getDate()} ${monthName} ${parsed.getFullYear()}`;
}

interface ScheduleRecoleccionModalProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly onSaved: (message: string) => void;
  readonly existing: readonly Recoleccion[];
  readonly duplicateCheckFailed?: boolean;
}

function resolveColors(isDark: boolean) {
  return {
    bg: isDark ? colors.admBgD : colors.admBgL,
    fg: isDark ? colors.admFgD : colors.admFgL,
    muted: isDark ? colors.admMutedD : colors.admMutedL,
    border: isDark ? colors.admBorderD : colors.admBorderL,
    brand: isDark ? colors.admBrandD : colors.admBrandL,
    surface: isDark ? colors.admSurfaceD : colors.admSurfaceL,
    activeBg: isDark ? colors.admActiveBgD : colors.admActiveBgL,
    white: colors.iconWhite,
    redCoral: colors.brandRedCoral,
  } as const;
}

export default function ScheduleRecoleccionModal({
  visible,
  onClose,
  onSaved,
  existing,
  duplicateCheckFailed = false,
}: ScheduleRecoleccionModalProps): React.JSX.Element | null {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';

  const { bg, fg, muted, border, brand, surface, activeBg, white, redCoral } =
    resolveColors(isDark);

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

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState<'inicio' | 'fin' | null>(
    null,
  );

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  function handleClose() {
    if (mutation.isPending) {
      Alert.alert(
        'Descartar cambios',
        'La recolección se está guardando. ¿Descartar de todas formas?',
        [
          { text: 'Esperar', style: 'cancel' },
          { text: 'Descartar', style: 'destructive', onPress: onClose },
        ],
      );
      return;
    }
    onClose();
  }
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
      if (isMounted.current) {
        setError(null);
        onClose();
      }
      onSaved('Recolección programada correctamente.');
    },
    onError: (err: unknown) => {
      if (!isMounted.current) return;
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

  if (!visible) return null;

  const fieldBg: ViewStyle = {
    backgroundColor: surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  };

  const fieldLabel: TextStyle = {
    fontSize: 13,
    fontWeight: '700',
    color: fg,
    marginBottom: 6,
  };

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

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
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
          <Pressable onPress={handleClose} hitSlop={12}>
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
            <RecoleccionFormFields
              fecha={fecha}
              horaInicio={horaInicio}
              horaFin={horaFin}
              comentarios={comentarios}
              query={query}
              agricultor={agricultor}
              error={error}
              fieldBg={fieldBg}
              fieldLabel={fieldLabel}
              fg={fg}
              muted={muted}
              brand={brand}
              activeBg={activeBg}
              redCoral={redCoral}
              gruposFiltrados={gruposFiltrados}
              isLoadingAgricultores={isLoadingAgricultores}
              isErrorAgricultores={isErrorAgricultores}
              agricultoresTruncados={agricultoresTruncados}
              erroresAgricultores={erroresAgricultores}
              duplicateKeys={duplicateKeys}
              duplicateCheckFailed={duplicateCheckFailed}
              formatDateDisplay={formatDateDisplay}
              onFechaPress={() => setShowDatePicker(true)}
              onHoraInicioPress={() => setShowTimePicker('inicio')}
              onHoraFinPress={() => setShowTimePicker('fin')}
              setComentarios={setComentarios}
              setQuery={setQuery}
              refetchAgricultores={refetchAgricultores}
              setAgricultor={setAgricultor}
            />
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

      {showDatePicker ? (
        <DatePickerSheet
          fecha={fecha}
          isDark={isDark}
          fg={fg}
          border={border}
          surface={surface}
          brand={brand}
          redCoral={redCoral}
          onClose={() => setShowDatePicker(false)}
          onSelect={(dateStr) => {
            setFecha(dateStr);
            setShowDatePicker(false);
          }}
        />
      ) : null}

      {showTimePicker !== null ? (
        <TimePickerSheet
          currentValue={showTimePicker === 'inicio' ? horaInicio : horaFin}
          title={showTimePicker === 'inicio' ? 'Hora de inicio' : 'Hora de fin'}
          fg={fg}
          muted={muted}
          border={border}
          surface={surface}
          brand={brand}
          white={white}
          redCoral={redCoral}
          onClose={() => setShowTimePicker(null)}
          onSelect={(timeStr) => {
            if (showTimePicker === 'inicio') setHoraInicio(timeStr);
            else setHoraFin(timeStr);
            setShowTimePicker(null);
          }}
        />
      ) : null}
    </Modal>
  );
}

interface RecoleccionFormFieldsProps {
  readonly fecha: string;
  readonly horaInicio: string;
  readonly horaFin: string;
  readonly comentarios: string;
  readonly query: string;
  readonly agricultor: AgricultorAgricultorItem | null;
  readonly error: string | null;
  readonly fieldBg: ViewStyle;
  readonly fieldLabel: TextStyle;
  readonly fg: string;
  readonly muted: string;
  readonly brand: string;
  readonly activeBg: string;
  readonly redCoral: string;
  readonly gruposFiltrados: readonly AgricultorUbicacion[];
  readonly isLoadingAgricultores: boolean;
  readonly isErrorAgricultores: boolean;
  readonly agricultoresTruncados: boolean;
  readonly erroresAgricultores: number;
  readonly duplicateKeys: Set<string>;
  readonly duplicateCheckFailed: boolean;
  readonly formatDateDisplay: (dateStr: string) => string;
  readonly onFechaPress: () => void;
  readonly onHoraInicioPress: () => void;
  readonly onHoraFinPress: () => void;
  readonly setComentarios: (v: string) => void;
  readonly setQuery: (v: string) => void;
  readonly refetchAgricultores: () => void;
  readonly setAgricultor: (a: AgricultorAgricultorItem) => void;
}

function RecoleccionFormFields({
  fecha,
  horaInicio,
  horaFin,
  comentarios,
  query,
  agricultor,
  error,
  fieldBg,
  fieldLabel,
  fg,
  muted,
  brand,
  activeBg,
  redCoral,
  gruposFiltrados,
  isLoadingAgricultores,
  isErrorAgricultores,
  agricultoresTruncados,
  erroresAgricultores,
  duplicateKeys,
  duplicateCheckFailed,
  formatDateDisplay,
  onFechaPress,
  onHoraInicioPress,
  onHoraFinPress,
  setComentarios,
  setQuery,
  refetchAgricultores,
  setAgricultor,
}: RecoleccionFormFieldsProps): React.JSX.Element {
  return (
    <>
      <Text style={fieldLabel}>Fecha</Text>
      <TouchableOpacity
        onPress={onFechaPress}
        activeOpacity={0.7}
        style={[
          fieldBg,
          {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          },
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <MaterialCommunityIcons name="calendar" size={20} color={brand} />
          <Text style={{ fontSize: 15, color: fg }}>
            {formatDateDisplay(fecha)}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-down" size={20} color={muted} />
      </TouchableOpacity>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        <View style={{ flex: 1 }}>
          <Text style={fieldLabel}>Hora inicio</Text>
          <TouchableOpacity
            onPress={onHoraInicioPress}
            activeOpacity={0.7}
            style={[
              fieldBg,
              {
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              },
            ]}
          >
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
            >
              <MaterialCommunityIcons
                name="clock-outline"
                size={20}
                color={brand}
              />
              <Text style={{ fontSize: 15, color: horaInicio ? fg : muted }}>
                {horaInicio ? formatHora(horaInicio) : 'Opcional'}
              </Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-down"
              size={20}
              color={muted}
            />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={fieldLabel}>Hora fin</Text>
          <TouchableOpacity
            onPress={onHoraFinPress}
            activeOpacity={0.7}
            style={[
              fieldBg,
              {
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              },
            ]}
          >
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
            >
              <MaterialCommunityIcons
                name="clock-outline"
                size={20}
                color={brand}
              />
              <Text style={{ fontSize: 15, color: horaFin ? fg : muted }}>
                {horaFin ? formatHora(horaFin) : 'Opcional'}
              </Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-down"
              size={20}
              color={muted}
            />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={[fieldLabel, { marginTop: 14 }]}>Comentarios</Text>
      <TextInput
        value={comentarios}
        onChangeText={setComentarios}
        placeholder="Notas para la recolección (opcional)"
        placeholderTextColor={muted}
        multiline
        numberOfLines={3}
        maxLength={500}
        style={[
          fieldBg,
          { fontSize: 15, color: fg, minHeight: 76, textAlignVertical: 'top' },
        ]}
      />

      <Text style={[fieldLabel, { marginTop: 18 }]}>Agricultor</Text>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Buscar por nombre…"
        placeholderTextColor={muted}
        style={[fieldBg, { fontSize: 15, color: fg }]}
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

      {duplicateCheckFailed ? (
        <Text
          style={{
            marginTop: 12,
            fontSize: 13,
            fontWeight: '600',
            color: redCoral,
            backgroundColor: activeBg,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            overflow: 'hidden',
          }}
        >
          No se pudieron cargar todas las recolecciones. El servidor validará
          duplicados al programar.
        </Text>
      ) : null}

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
    </>
  );
}
