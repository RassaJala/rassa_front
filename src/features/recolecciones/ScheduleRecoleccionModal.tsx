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
  TouchableOpacity,
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
  isValidFecha,
  isValidHora,
  normalizeHora,
  recoleccionDuplicateKey,
  todayString,
} from './utils';

function getFullName(a: AgricultorAgricultorItem): string {
  return [a.nombre, a.apellido_paterno, a.apellido_materno]
    .filter(Boolean)
    .join(' ');
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function toDateString(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

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

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState<'inicio' | 'fin' | null>(
    null,
  );

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

  const duplicateKeys = useMemo(() => {
    const set = new Set<string>();
    for (const r of existing) {
      if (r.estado !== 'cancelado' && r.fk_agricultor != null) {
        set.add(recoleccionDuplicateKey(r.fk_agricultor, r.fecha_recoleccion));
      }
    }
    return set;
  }, [existing]);

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
    if (!agricultor) {
      setError('Selecciona un agricultor.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      setError('La fecha debe tener el formato AAAA-MM-DD.');
      return;
    }
    if (!isValidFecha(fecha)) {
      setError('La fecha ingresada no es válida.');
      return;
    }
    if (fecha < todayString()) {
      setError('La fecha no puede ser anterior a hoy.');
      return;
    }
    if (horaInicio && !isValidHora(horaInicio)) {
      setError('La hora de inicio debe tener el formato HH:MM.');
      return;
    }
    if (horaFin && !isValidHora(horaFin)) {
      setError('La hora de fin debe tener el formato HH:MM.');
      return;
    }
    if (horaInicio && horaFin && horaFin <= horaInicio) {
      setError('La hora de fin debe ser posterior a la de inicio.');
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

  const today = new Date();
  const todayParts = todayString().split('-').map(Number);
  const currentYear = today.getFullYear();
  const futureYears = Array.from({ length: 3 }, (_, i) => currentYear + i);
  const months = Array.from({ length: 12 }, (_, i) => i);
  const MONTHS = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutesList = ['00', '15', '30', '45'];

  function parseDate(dateStr: string): { year: number; month: number; day: number } | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
    const [y, m, d] = dateStr.split('-').map(Number) as [number, number, number];
    return { year: y, month: m - 1, day: d };
  }

  function formatDateDisplay(dateStr: string): string {
    const parsed = parseDate(dateStr);
    if (!parsed) return 'Seleccionar fecha';
    return `${parsed.day} ${MONTHS[parsed.month]!} ${parsed.year}`;
  }

  if (!visible) return null;

  const fieldBg = { backgroundColor: surface, borderRadius: 10, borderWidth: 1, borderColor: border, paddingHorizontal: 12, paddingVertical: 10 };
  const fieldLabel = { fontSize: 13, fontWeight: '700' as const, color: fg, marginBottom: 6 };

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
            <Text style={fieldLabel}>Fecha</Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
              style={[fieldBg, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
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
                  onPress={() => setShowTimePicker('inicio')}
                  activeOpacity={0.7}
                  style={[fieldBg, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <MaterialCommunityIcons name="clock-outline" size={20} color={brand} />
                    <Text style={{ fontSize: 15, color: horaInicio ? fg : muted }}>
                      {horaInicio ? normalizeHora(horaInicio) : 'Opcional'}
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-down" size={20} color={muted} />
                </TouchableOpacity>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={fieldLabel}>Hora fin</Text>
                <TouchableOpacity
                  onPress={() => setShowTimePicker('fin')}
                  activeOpacity={0.7}
                  style={[fieldBg, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <MaterialCommunityIcons name="clock-outline" size={20} color={brand} />
                    <Text style={{ fontSize: 15, color: horaFin ? fg : muted }}>
                      {horaFin ? normalizeHora(horaFin) : 'Opcional'}
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-down" size={20} color={muted} />
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
              style={[fieldBg, { fontSize: 15, color: fg, minHeight: 76, textAlignVertical: 'top' }]}
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

      {/* Date Picker Modal */}
      <Modal
        transparent
        animationType="slide"
        visible={showDatePicker}
        onRequestClose={() => setShowDatePicker(false)}
      >
        <Pressable
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}
          onPress={() => setShowDatePicker(false)}
        >
          <Pressable
            style={{ backgroundColor: surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, maxHeight: '75%' }}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: fg }}>Seleccionar fecha</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: redCoral }}>Cancelar</Text>
              </TouchableOpacity>
            </View>

            <DatePickerContent
              fecha={fecha}
              todayParts={todayParts}
              futureYears={futureYears}
              months={months}
              MONTHS={MONTHS}
              isDark={isDark}
              fg={fg}
              border={border}
              surface={surface}
              brand={brand}
              onSelect={(dateStr) => {
                setFecha(dateStr);
                setShowDatePicker(false);
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Time Picker Modal */}
      <Modal
        transparent
        animationType="slide"
        visible={showTimePicker !== null}
        onRequestClose={() => setShowTimePicker(null)}
      >
        <Pressable
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}
          onPress={() => setShowTimePicker(null)}
        >
          <Pressable
            style={{ backgroundColor: surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, maxHeight: '60%' }}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: fg }}>
                {showTimePicker === 'inicio' ? 'Hora de inicio' : 'Hora de fin'}
              </Text>
              <TouchableOpacity onPress={() => setShowTimePicker(null)}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: redCoral }}>Cancelar</Text>
              </TouchableOpacity>
            </View>

            <TimePickerContent
              currentValue={showTimePicker === 'inicio' ? horaInicio : horaFin}
              hours={hours}
              minutesList={minutesList}
              fg={fg}
              muted={muted}
              border={border}
              brand={brand}
              white={white}
              onSelect={(timeStr) => {
                if (showTimePicker === 'inicio') {
                  setHoraInicio(timeStr);
                } else {
                  setHoraFin(timeStr);
                }
                setShowTimePicker(null);
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </Modal>
  );
}

interface DatePickerContentProps {
  readonly fecha: string;
  readonly todayParts: number[];
  readonly futureYears: number[];
  readonly months: number[];
  readonly MONTHS: string[];
  readonly isDark: boolean;
  readonly fg: string;
  readonly border: string;
  readonly surface: string;
  readonly brand: string;
  readonly onSelect: (dateStr: string) => void;
}

function DatePickerContent({
  fecha,
  todayParts,
  futureYears,
  months,
  MONTHS,
  isDark,
  fg,
  border,
  surface,
  brand,
  onSelect,
}: DatePickerContentProps) {
  const parsed = parseDateSafe(fecha, todayParts);
  const [selectedYear, setSelectedYear] = useState(parsed.year);
  const [selectedMonth, setSelectedMonth] = useState(parsed.month);
  const [step, setStep] = useState<'year' | 'month' | 'day'>('year');

  const daysCount = getDaysInMonth(selectedYear, selectedMonth);
  const daysArray = Array.from({ length: daysCount }, (_, i) => i + 1);

  const minDay = selectedYear === todayParts[0] && selectedMonth === (todayParts[1] ?? 0) - 1 ? todayParts[2] ?? 1 : 1;

  const tabBg = isDark ? colors.admSegBgD : colors.inactiveGrayBg;

  return (
    <View>
      <View style={{ flexDirection: 'row', borderRadius: 12, backgroundColor: tabBg, padding: 4, marginBottom: 16 }}>
        <TabBtn label="Año" value={String(selectedYear)} active={step === 'year'} onPress={() => setStep('year')} isDark={isDark} fg={fg} />
        <TabBtn label="Mes" value={MONTHS[selectedMonth] ?? '---'} active={step === 'month'} onPress={() => setStep('month')} isDark={isDark} fg={fg} />
        <TabBtn label="Día" value="---" active={step === 'day'} onPress={() => setStep('day')} isDark={isDark} fg={fg} />
      </View>

      <View style={{ height: 220 }}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {step === 'year' && futureYears.map((y) => (
            <TouchableOpacity key={y} onPress={() => { setSelectedYear(y); setStep('month'); }}
              style={{ borderRadius: 8, borderBottomWidth: 1, borderBottomColor: border, paddingVertical: 12, backgroundColor: selectedYear === y ? `${brand}1A` : 'transparent' }}>
              <Text style={{ textAlign: 'center', fontSize: 15, fontWeight: '600', color: selectedYear === y ? brand : fg }}>{y}</Text>
            </TouchableOpacity>
          ))}
          {step === 'month' && months.map((m) => {
            const isDisabled = selectedYear === futureYears[0] && m < (todayParts[1] ?? 1) - 1;
            return (
              <TouchableOpacity key={m} onPress={() => { if (!isDisabled) { setSelectedMonth(m); setStep('day'); } }}
                style={{ borderRadius: 8, borderBottomWidth: 1, borderBottomColor: border, paddingVertical: 12, backgroundColor: selectedMonth === m ? `${brand}1A` : 'transparent', opacity: isDisabled ? 0.4 : 1 }}>
                <Text style={{ textAlign: 'center', fontSize: 15, fontWeight: '600', color: selectedMonth === m ? brand : fg }}>{MONTHS[m]}</Text>
              </TouchableOpacity>
            );
          })}
          {step === 'day' && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-evenly' }}>
              {daysArray.map((d) => {
                const isDisabled = d < minDay;
                const isToday = d === todayParts[2] && selectedMonth === (todayParts[1] ?? 0) - 1 && selectedYear === todayParts[0];
                return (
                  <TouchableOpacity key={d} onPress={() => { if (!isDisabled) onSelect(toDateString(selectedYear, selectedMonth, d)); }}
                    style={{
                      margin: 4, width: '13%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12,
                      backgroundColor: isToday ? `${brand}33` : isDark ? colors.admSurfaceD : surface,
                      borderWidth: 1, borderColor: isToday ? brand : border, opacity: isDisabled ? 0.3 : 1,
                    }}>
                    <Text style={{ fontSize: 13, fontWeight: isToday ? '700' : '500', color: isToday ? brand : fg }}>{d}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

function parseDateSafe(dateStr: string, todayParts: number[]): { year: number; month: number; day: number } {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-').map(Number) as [number, number, number];
    return { year: y, month: m - 1, day: d };
  }
  return { year: todayParts[0] ?? new Date().getFullYear(), month: (todayParts[1] ?? 1) - 1, day: todayParts[2] ?? 1 };
}

interface TimePickerContentProps {
  readonly currentValue: string;
  readonly hours: number[];
  readonly minutesList: string[];
  readonly fg: string;
  readonly muted: string;
  readonly border: string;
  readonly brand: string;
  readonly white: string;
  readonly onSelect: (timeStr: string) => void;
}

function TimePickerContent({
  currentValue,
  hours,
  minutesList,
  fg,
  muted,
  border,
  brand,
  white,
  onSelect,
}: TimePickerContentProps) {
  const [selectedHour, setSelectedHour] = useState(currentValue ? parseInt(currentValue.split(':')[0] ?? '0', 10) : 8);
  const [selectedMinute, setSelectedMinute] = useState(currentValue ? currentValue.split(':')[1] ?? '00' : '00');

  return (
    <View>
      <View style={{ flexDirection: 'row', height: 200 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ textAlign: 'center', fontSize: 12, fontWeight: '600', color: muted, marginBottom: 8 }}>Hora</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {hours.map((h) => (
              <TouchableOpacity key={h} onPress={() => setSelectedHour(h)}
                style={{
                  paddingVertical: 10, alignItems: 'center', borderRadius: 8, marginVertical: 2,
                  backgroundColor: selectedHour === h ? `${brand}1A` : 'transparent',
                }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: selectedHour === h ? brand : fg }}>
                  {String(h).padStart(2, '0')}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ textAlign: 'center', fontSize: 12, fontWeight: '600', color: muted, marginBottom: 8 }}>Minutos</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {minutesList.map((m) => (
              <TouchableOpacity key={m} onPress={() => setSelectedMinute(m)}
                style={{
                  paddingVertical: 10, alignItems: 'center', borderRadius: 8, marginVertical: 2,
                  backgroundColor: selectedMinute === m ? `${brand}1A` : 'transparent',
                }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: selectedMinute === m ? brand : fg }}>
                  {m}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
      <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: border, paddingTop: 12, alignItems: 'flex-end' }}>
        <TouchableOpacity
          onPress={() => {
            const h = String(selectedHour).padStart(2, '0');
            onSelect(`${h}:${selectedMinute}`);
          }}
          style={{ borderRadius: 8, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: brand }}
        >
          <Text style={{ fontSize: 14, fontWeight: '700', color: white }}>Seleccionar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

interface TabBtnProps {
  readonly label: string;
  readonly value: string;
  readonly active: boolean;
  readonly onPress: () => void;
  readonly isDark: boolean;
  readonly fg: string;
}

function TabBtn({ label, value, active, onPress, isDark, fg }: TabBtnProps) {
  const tabActiveBg = isDark ? colors.admSurfaceD : colors.surface;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ flex: 1, alignItems: 'center', borderRadius: 8, paddingVertical: 8, backgroundColor: active ? tabActiveBg : 'transparent' }}
    >
      <Text style={{ fontSize: 11, color: isDark ? colors.mutedDark : colors.textSecondary }}>{label}</Text>
      <Text style={{ fontSize: 12, fontWeight: '600', color: active ? colors.brandRedCoral : fg }}>{value}</Text>
    </TouchableOpacity>
  );
}
