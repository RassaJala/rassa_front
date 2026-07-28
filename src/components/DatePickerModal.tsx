import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

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
}

// ── Component ────────────────────────────────────────

type Step = 'year' | 'month' | 'day';

export default function DatePickerModal({
  visible,
  onClose,
  onSelectDate,
  initialDate,
}: DatePickerModalProps): React.JSX.Element | null {
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
          className="rounded-t-2xl bg-white p-5 dark:bg-gray-900"
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Fecha de Nacimiento
            </Text>
            <TouchableOpacity onPress={onClose} className="px-3 py-1">
              <Text className="text-base font-semibold text-brand-red-coral">
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab bar: Año / Mes / Día */}
          <View className="mb-4 flex-row rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
            <TabButton
              label="Año"
              value={selectedYear != null ? String(selectedYear) : '----'}
              active={step === 'year'}
              onPress={() => setStep('year')}
            />
            <TabButton
              label="Mes"
              value={
                selectedMonth != null
                  ? (MONTH_NAMES[selectedMonth] ?? '---')
                  : '---'
              }
              active={step === 'month'}
              disabled={selectedYear == null}
              onPress={() => setStep('month')}
            />
            <TabButton
              label="Día"
              value={selectedDay != null ? String(selectedDay) : '--'}
              active={step === 'day'}
              disabled={selectedMonth == null}
              onPress={() => setStep('day')}
            />
          </View>

          {/* Content */}
          <View className="h-64">
            {step === 'year' && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {years.map((y) => (
                  <TouchableOpacity
                    key={y}
                    activeOpacity={0.6}
                    onPress={() => handleSelectYear(y)}
                    className={`rounded-lg border-b border-gray-100 py-3 dark:border-gray-800 ${
                       selectedYear === y
                        ? 'bg-brand-red-coral/10 dark:bg-brand-red-coral/20'
                        : 'bg-transparent'
                    }`}
                  >
                    <Text
                      className={`text-center text-[15px] font-semibold ${
                        selectedYear === y
                          ? 'text-brand-red-coral'
                          : 'text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      {y}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {step === 'month' && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {MONTH_NAMES.map((name, idx) => (
                  <TouchableOpacity
                    key={name}
                    activeOpacity={0.6}
                    onPress={() => handleSelectMonth(idx)}
                    className={`rounded-lg border-b border-gray-100 py-3 dark:border-gray-800 ${
                       selectedMonth === idx
                        ? 'bg-brand-red-coral/10 dark:bg-brand-red-coral/20'
                        : 'bg-transparent'
                    }`}
                  >
                    <Text
                      className={`text-center text-[15px] font-semibold ${
                        selectedMonth === idx
                          ? 'text-brand-red-coral'
                          : 'text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      {name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {step === 'day' && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View className="flex-row flex-wrap">
                  {daysArray.map((d) => {
                    const isSelected = selectedDay === d;
                    return (
                      <TouchableOpacity
                        key={d}
                        activeOpacity={0.6}
                        onPress={() => handleSelectDay(d)}
                        className={`m-[1%] h-9 w-[17%] items-center justify-center rounded-xl ${
                          isSelected
                            ? 'bg-brand-red-coral'
                            : 'border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
                        }`}
                      >
                        <Text
                          className={`text-sm font-semibold ${
                            isSelected
                              ? 'text-white'
                              : 'text-gray-900 dark:text-gray-100'
                          }`}
                        >
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
          <View className="mt-4 items-end border-t border-gray-100 pt-3 dark:border-gray-800">
            <TouchableOpacity
              testID="btn-done"
              onPress={() => {
                if (
                  selectedYear !== null &&
                  selectedMonth !== null &&
                  selectedDay !== null
                ) {
                  onSelectDate(
                    toDateString(selectedYear, selectedMonth, selectedDay),
                  );
                  onClose();
                }
              }}
              disabled={selectedDay == null}
              className={`rounded-lg px-5 py-2 ${
                selectedDay != null
                  ? 'bg-brand-red-coral'
                  : 'bg-gray-300 dark:bg-gray-700'
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  selectedDay != null
                    ? 'text-white'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
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
}

function TabButton({
  label,
  value,
  active,
  disabled,
  onPress,
}: TabButtonProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.6}
      onPress={onPress}
      disabled={disabled}
      className={`flex-1 items-center rounded-lg py-2 ${
        active ? 'bg-white dark:bg-gray-700' : 'bg-transparent'
      } ${disabled ? 'opacity-40' : ''}`}
    >
      <Text className="text-[11px] text-gray-400 dark:text-gray-500">
        {label}
      </Text>
      <Text
        className={`text-xs font-semibold ${
          active ? 'text-brand-red-coral' : 'text-gray-900 dark:text-gray-100'
        }`}
      >
        {value}
      </Text>
    </TouchableOpacity>
  );
}
