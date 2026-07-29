/* eslint-disable react-native/no-color-literals, sonarjs/cognitive-complexity */
import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';

import { colors } from '@/constants/colors';
import { MONTH_NAMES, YEARS_BACK } from '@/constants/dates';

// ── Helpers ──────────────────────────────────────────

function parseInitialDate(
  dateStr?: string,
): { year: number; month: number; day: number } | null {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const parts = dateStr.split('-').map(Number);
  const year = parts[0] ?? 2000;
  const month = parts[1] !== undefined ? parts[1] - 1 : 0;
  const day = parts[2] ?? 1;
  return { year, month, day };
}

function toDateString(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getMaxYear(): number {
  return new Date().getFullYear() - 18;
}

// ── Props ────────────────────────────────────────────

interface DatePickerModalProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly onSelectDate: (dateString: string) => void;
  readonly initialDate?: string;
  readonly isDark?: boolean;
}

// ── Component ────────────────────────────────────────

type Step = 'year' | 'month' | 'day';

export default function DatePickerModal({
  visible,
  onClose,
  onSelectDate,
  initialDate,
  isDark: isDarkProp,
}: DatePickerModalProps): React.JSX.Element | null {
  const osScheme = useColorScheme();
  const isDark = isDarkProp ?? osScheme === 'dark';
  const [step, setStep] = useState<Step>('year');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const maxYear = getMaxYear();
  const years = Array.from({ length: YEARS_BACK }, (_, i) => maxYear - i);

  // Sync state when modal opens
  useEffect(() => {
    if (visible) {
      const parsed = parseInitialDate(initialDate);
      if (parsed) {
        setSelectedYear(parsed.year);
        setSelectedMonth(parsed.month);
        setSelectedDay(parsed.day);
        setStep('day');
      } else {
        setSelectedYear(null);
        setSelectedMonth(null);
        setSelectedDay(null);
        setStep('year');
      }
    }
  }, [visible, initialDate]);

  if (!visible) return null;

  function handleSelectYear(year: number) {
    setSelectedYear(year);
    setSelectedMonth(null);
    setSelectedDay(null);
    setStep('month');
  }

  function handleSelectMonth(month: number) {
    setSelectedMonth(month);
    setSelectedDay(null);
    setStep('day');
  }

  function handleSelectDay(day: number) {
    setSelectedDay(day);
    if (selectedYear !== null && selectedMonth !== null) {
      onSelectDate(toDateString(selectedYear, selectedMonth, day));
      onClose();
    }
  }

  const daysCount =
    selectedYear !== null && selectedMonth !== null
      ? getDaysInMonth(selectedYear, selectedMonth)
      : 31;
  const daysArray = Array.from({ length: daysCount }, (_, i) => i + 1);

  const surface = isDark ? colors.admSurfaceD : colors.surface;
  const fg = isDark ? colors.admFgD : colors.text;
  const muted = isDark ? colors.mutedDark : colors.textSecondary;
  const border = isDark ? colors.admBorderD : colors.border;
  const tabBg = isDark ? colors.admSegBgD : colors.inactiveGrayBg;
  const selectedBg = `${colors.brandRedCoral}1A`;
  const tabActiveBg = isDark ? colors.admSurfaceD : colors.surface;

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable
        testID="modal-overlay"
        className="flex-1 justify-end bg-black/50"
        onPress={onClose}
      >
        <Pressable
          style={{ backgroundColor: surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20 }}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={{ marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: fg }}>
              Fecha de Nacimiento
            </Text>
            <TouchableOpacity onPress={onClose} style={{ paddingHorizontal: 12, paddingVertical: 4 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.brandRedCoral }}>
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab bar */}
          <View style={{ marginBottom: 16, flexDirection: 'row', borderRadius: 12, backgroundColor: tabBg, padding: 4 }}>
            <TabButton
              label="Año"
              value={selectedYear != null ? String(selectedYear) : '----'}
              active={step === 'year'}
              onPress={() => setStep('year')}
              isDark={isDark}
              fg={fg}
              tabActiveBg={tabActiveBg}
            />
            <TabButton
              label="Mes"
              value={selectedMonth != null ? (MONTH_NAMES[selectedMonth] ?? '---') : '---'}
              active={step === 'month'}
              disabled={selectedYear == null}
              onPress={() => setStep('month')}
              isDark={isDark}
              fg={fg}
              tabActiveBg={tabActiveBg}
            />
            <TabButton
              label="Día"
              value={selectedDay != null ? String(selectedDay) : '--'}
              active={step === 'day'}
              disabled={selectedMonth == null}
              onPress={() => setStep('day')}
              isDark={isDark}
              fg={fg}
              tabActiveBg={tabActiveBg}
            />
          </View>

          {/* Content */}
          <View style={{ height: 256 }}>
            {step === 'year' && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {years.map((y) => (
                  <TouchableOpacity key={y} activeOpacity={0.6} onPress={() => handleSelectYear(y)}
                    style={{ borderRadius: 8, borderBottomWidth: 1, borderBottomColor: border, paddingVertical: 12,
                      backgroundColor: selectedYear === y ? selectedBg : 'transparent' }}>
                    <Text style={{ textAlign: 'center', fontSize: 15, fontWeight: '600',
                      color: selectedYear === y ? colors.brandRedCoral : fg }}>
                      {y}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {step === 'month' && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {MONTH_NAMES.map((name, idx) => (
                  <TouchableOpacity key={name} activeOpacity={0.6} onPress={() => handleSelectMonth(idx)}
                    style={{ borderRadius: 8, borderBottomWidth: 1, borderBottomColor: border, paddingVertical: 12,
                      backgroundColor: selectedMonth === idx ? selectedBg : 'transparent' }}>
                    <Text style={{ textAlign: 'center', fontSize: 15, fontWeight: '600',
                      color: selectedMonth === idx ? colors.brandRedCoral : fg }}>
                      {name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {step === 'day' && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {daysArray.map((d) => {
                    const isSelected = selectedDay === d;
                    return (
                      <TouchableOpacity key={d} activeOpacity={0.6} onPress={() => handleSelectDay(d)}
                        style={{ margin: '1%', width: '17%', height: 36, alignItems: 'center', justifyContent: 'center',
                          borderRadius: 12,
                          backgroundColor: isSelected ? colors.brandRedCoral : (isDark ? colors.admSurfaceD : colors.surface),
                          borderWidth: isSelected ? 0 : 1,
                          borderColor: isDark ? colors.admBorderD : colors.border }}>
                        <Text style={{ fontSize: 13, fontWeight: '600',
                          color: isSelected ? colors.iconWhite : fg }}>
                          {d}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            )}
          </View>

          {/* Confirm button */}
          <View style={{ marginTop: 16, alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: border, paddingTop: 12 }}>
            <TouchableOpacity testID="btn-done"
              onPress={() => { if (selectedYear !== null && selectedMonth !== null && selectedDay !== null) { onSelectDate(toDateString(selectedYear, selectedMonth, selectedDay)); onClose(); } }}
              disabled={selectedDay == null}
              style={{ borderRadius: 8, paddingHorizontal: 20, paddingVertical: 8,
                backgroundColor: selectedDay != null ? colors.brandRedCoral : muted }}>
              <Text style={{ fontSize: 13, fontWeight: '600',
                color: selectedDay != null ? colors.iconWhite : (isDark ? colors.mutedDark : colors.textSecondary) }}>
                Hecho
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Tab Button ───────────────────────────────────────

interface TabButtonProps {
  readonly label: string;
  readonly value: string;
  readonly active: boolean;
  readonly disabled?: boolean;
  readonly onPress: () => void;
  readonly isDark: boolean;
  readonly fg: string;
  readonly tabActiveBg: string;
}

function TabButton({
  label,
  value,
  active,
  disabled,
  onPress,
  isDark,
  fg,
  tabActiveBg,
}: TabButtonProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.6}
      onPress={onPress}
      disabled={disabled}
      style={{
        flex: 1,
        alignItems: 'center',
        borderRadius: 8,
        paddingVertical: 8,
        backgroundColor: active ? tabActiveBg : 'transparent',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Text style={{ fontSize: 11, color: isDark ? colors.mutedDark : colors.textSecondary }}>
        {label}
      </Text>
      <Text
        style={{
          fontSize: 12,
          fontWeight: '600',
          color: active ? colors.brandRedCoral : fg,
        }}
      >
        {value}
      </Text>
    </TouchableOpacity>
  );
}
