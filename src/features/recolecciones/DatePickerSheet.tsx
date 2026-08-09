import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '@/constants/colors';

import BottomSheetModal from './BottomSheetModal';
import {
  getDaysInMonth,
  hexWithAlpha,
  MONTHS,
  parseFecha,
  todayString,
  toLocalDateString,
} from './utils';

interface DatePickerSheetProps {
  readonly fecha: string;
  readonly isDark: boolean;
  readonly fg: string;
  readonly border: string;
  readonly surface: string;
  readonly brand: string;
  readonly redCoral: string;
  readonly onClose: () => void;
  readonly onSelect: (dateStr: string) => void;
}

export default function DatePickerSheet({
  fecha,
  isDark,
  fg,
  border,
  surface,
  brand,
  redCoral,
  onClose,
  onSelect,
}: DatePickerSheetProps): React.JSX.Element {
  const today = new Date();
  const todayParts = todayString().split('-').map(Number);
  const currentYear = today.getFullYear();
  const futureYears = Array.from({ length: 3 }, (_, i) => currentYear + i);
  const months = Array.from({ length: 12 }, (_, i) => i);

  const parsedDate = parseFecha(fecha);
  const [selectedYear, setSelectedYear] = useState(
    parsedDate?.getFullYear() ?? todayParts[0] ?? currentYear,
  );
  const [selectedMonth, setSelectedMonth] = useState(
    parsedDate?.getMonth() ?? (todayParts[1] ?? 1) - 1,
  );
  const [selectedDay, setSelectedDay] = useState(
    parsedDate?.getDate() ?? todayParts[2] ?? 1,
  );
  const [step, setStep] = useState<'year' | 'month' | 'day'>('year');

  const brandAlpha = hexWithAlpha(brand, 0.1);

  const daysCount = getDaysInMonth(selectedYear, selectedMonth);
  const daysArray = Array.from({ length: daysCount }, (_, i) => i + 1);
  const minDay =
    selectedYear === todayParts[0] && selectedMonth === (todayParts[1] ?? 0) - 1
      ? (todayParts[2] ?? 1)
      : 1;
  const tabBg = isDark ? colors.admSegBgD : colors.inactiveGrayBg;

  const labelColor = isDark ? colors.mutedDark : colors.textSecondary;
  const valueColor = colors.brandRedCoral;

  return (
    <BottomSheetModal
      title="Seleccionar fecha"
      maxHeight="75%"
      fg={fg}
      redCoral={redCoral}
      surface={surface}
      onClose={onClose}
    >
      <View
        style={{
          flexDirection: 'row',
          borderRadius: 12,
          backgroundColor: tabBg,
          padding: 4,
          marginBottom: 16,
        }}
      >
        <TabBtn
          label="Año"
          value={String(selectedYear)}
          active={step === 'year'}
          onPress={() => setStep('year')}
          isDark={isDark}
          fg={fg}
          labelColor={labelColor}
          valueColor={valueColor}
        />
        <TabBtn
          label="Mes"
          value={MONTHS[selectedMonth] ?? '---'}
          active={step === 'month'}
          onPress={() => setStep('month')}
          isDark={isDark}
          fg={fg}
          labelColor={labelColor}
          valueColor={valueColor}
        />
        <TabBtn
          label="Día"
          value={String(selectedDay)}
          active={step === 'day'}
          onPress={() => setStep('day')}
          isDark={isDark}
          fg={fg}
          labelColor={labelColor}
          valueColor={valueColor}
        />
      </View>

      <View style={{ height: 220 }}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {step === 'year' &&
            futureYears.map((y) => (
              <TouchableOpacity
                key={y}
                onPress={() => {
                  setSelectedYear(y);
                  setStep('month');
                }}
                style={{
                  borderRadius: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: border,
                  paddingVertical: 12,
                  backgroundColor:
                    selectedYear === y ? brandAlpha : colors.transparent,
                }}
              >
                <Text
                  style={{
                    textAlign: 'center',
                    fontSize: 15,
                    fontWeight: '600',
                    color: selectedYear === y ? brand : fg,
                  }}
                >
                  {y}
                </Text>
              </TouchableOpacity>
            ))}
          {step === 'month' &&
            months.map((m) => {
              const isDisabled =
                selectedYear === futureYears[0] && m < (todayParts[1] ?? 1) - 1;
              return (
                <TouchableOpacity
                  key={m}
                  onPress={() => {
                    if (!isDisabled) {
                      setSelectedMonth(m);
                      const daysInMonth = getDaysInMonth(selectedYear, m);
                      setSelectedDay((prev) => Math.min(prev, daysInMonth));
                      setStep('day');
                    }
                  }}
                  style={{
                    borderRadius: 8,
                    borderBottomWidth: 1,
                    borderBottomColor: border,
                    paddingVertical: 12,
                    backgroundColor:
                      selectedMonth === m ? brandAlpha : colors.transparent,
                    opacity: isDisabled ? 0.4 : 1,
                  }}
                >
                  <Text
                    style={{
                      textAlign: 'center',
                      fontSize: 15,
                      fontWeight: '600',
                      color: selectedMonth === m ? brand : fg,
                    }}
                  >
                    {MONTHS[m]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          {step === 'day' && (
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'space-evenly',
              }}
            >
              {daysArray.map((d) => {
                const isDisabled = d < minDay;
                const isToday =
                  d === todayParts[2] &&
                  selectedMonth === (todayParts[1] ?? 0) - 1 &&
                  selectedYear === todayParts[0];
                return (
                  <TouchableOpacity
                    key={d}
                    onPress={() => {
                      if (!isDisabled) {
                        setSelectedDay(d);
                        onSelect(
                          toLocalDateString(selectedYear, selectedMonth, d),
                        );
                      }
                    }}
                    style={{
                      margin: 4,
                      width: '13%',
                      aspectRatio: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 12,
                      backgroundColor: isToday
                        ? brandAlpha
                        : isDark
                          ? colors.admSurfaceD
                          : surface,
                      borderWidth: 1,
                      borderColor: isToday ? brand : border,
                      opacity: isDisabled ? 0.3 : 1,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: isToday ? '700' : '500',
                        color: isToday ? brand : fg,
                      }}
                    >
                      {d}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>
    </BottomSheetModal>
  );
}

interface TabBtnProps {
  readonly label: string;
  readonly value: string;
  readonly active: boolean;
  readonly onPress: () => void;
  readonly isDark: boolean;
  readonly fg: string;
  readonly labelColor: string;
  readonly valueColor: string;
}

function TabBtn({
  label,
  value,
  active,
  onPress,
  isDark,
  fg,
  labelColor,
  valueColor,
}: TabBtnProps): React.JSX.Element {
  const tabActiveBg = isDark ? colors.admSurfaceD : colors.surface;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flex: 1,
        alignItems: 'center',
        borderRadius: 8,
        paddingVertical: 8,
        backgroundColor: active ? tabActiveBg : colors.transparent,
      }}
    >
      <Text
        style={{
          fontSize: 11,
          color: labelColor,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontSize: 12,
          fontWeight: '600',
          color: active ? valueColor : fg,
        }}
      >
        {value}
      </Text>
    </TouchableOpacity>
  );
}
