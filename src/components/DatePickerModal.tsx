import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { colors } from '@/constants/colors';
import { useTheme } from '@/store/ThemeContext';

const OVERLAY_BG = 'rgba(0,0,0,0.5)';
const SELECTED_DAY_TEXT = colors.iconWhite;

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

// Years back from 18 years ago (allows ages 18 to ~121)
const YEARS_BACK = 103;

interface DatePickerModalProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly onSelectDate: (dateString: string) => void;
  readonly initialDate?: string; // Expects "YYYY-MM-DD"
}

export default function DatePickerModal({
  visible,
  onClose,
  onSelectDate,
  initialDate,
}: DatePickerModalProps): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';

  const surface = isDark ? colors.admSurfaceD : colors.admSurfaceL;
  const fg = isDark ? colors.admFgD : colors.admFgL;
  const muted = isDark ? colors.admMutedD : colors.admMutedL;
  const border = isDark ? colors.admBorderD : colors.admBorderL;
  const bg = isDark ? colors.admBgD : colors.admBgL;
  const coral = colors.brand.redCoral;

  const currentYear = new Date().getFullYear();
  // Only allow birth years that correspond to age >= 18
  const maxAdultYear = currentYear - 18;
  const years = Array.from({ length: YEARS_BACK }, (_, i) => maxAdultYear - i);

  const [step, setStep] = useState<'year' | 'month' | 'day'>('year');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null); // 0-indexed: 0 = Enero, 11 = Diciembre
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Initialize from initialDate if provided
  useEffect(() => {
    if (visible) {
      if (initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate)) {
        const parts = initialDate.split('-').map(Number);
        if (parts.length === 3) {
          const y = parts[0] ?? currentYear;
          const m = parts[1] ?? 1;
          const d = parts[2] ?? 1;
          setSelectedYear(y);
          setSelectedMonth(m - 1);
          setSelectedDay(d);
          setStep('day'); // Jump to day selection if we have full date
        }
      } else {
        setSelectedYear(null);
        setSelectedMonth(null);
        setSelectedDay(null);
        setStep('year');
      }
    }
  }, [visible, initialDate, currentYear]);

  const handleSelectYear = (year: number) => {
    setSelectedYear(year);
    setStep('month');
  };

  const handleSelectMonth = (monthIndex: number) => {
    setSelectedMonth(monthIndex);
    setStep('day');
  };

  const handleSelectDay = (day: number) => {
    setSelectedDay(day);
    if (selectedYear !== null && selectedMonth !== null) {
      const monthStr = String(selectedMonth + 1).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      onSelectDate(`${selectedYear}-${monthStr}-${dayStr}`);
      onClose();
    }
  };

  // Get number of days in selected month & year
  const getDaysInMonth = (): number => {
    if (selectedYear === null || selectedMonth === null) return 31;
    // selectedMonth + 1 gives the next month, day 0 gives the last day of the current month
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  };

  const daysCount = getDaysInMonth();
  const daysArray = Array.from({ length: daysCount }, (_, i) => i + 1);

  const tabBtnBase = (active: boolean): { flex: number; alignItems: 'center'; paddingVertical: number; borderRadius: number; backgroundColor: string } => ({
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: active ? surface : 'transparent',
  });

  const listItemStyle = (selected: boolean): { alignItems: 'center'; borderBottomWidth: number; borderBottomColor: string; paddingVertical: number; backgroundColor: string } => ({
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: border,
    paddingVertical: 12,
    backgroundColor: selected ? (isDark ? `${coral}33` : `${coral}1A`) : 'transparent',
  });

  const dayBoxStyle = (selected: boolean) => ({
    width: 48,
    height: 48,
    margin: 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: selected ? coral : border,
    backgroundColor: selected ? coral : bg,
  });

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable
        testID="modal-overlay"
        onPress={onClose}
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: OVERLAY_BG,
        }}
      >
        <Pressable
          style={{
            width: '88%',
            maxWidth: 380,
            borderRadius: 16,
            backgroundColor: surface,
            padding: 24,
            borderWidth: 1,
            borderColor: border,
          }}
          onPress={(e) => e.stopPropagation()} // Prevent closing when tapping card
        >
          {/* Modal Header */}
          <Text style={{ marginBottom: 16, textAlign: 'center', fontSize: 20, fontWeight: '700', color: fg }}>
            Fecha de Nacimiento
          </Text>

          {/* Current Selection Indicators */}
          <View style={{ marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', borderRadius: 12, backgroundColor: bg, padding: 8 }}>
            <TouchableOpacity
              testID="tab-year-selector"
              onPress={() => setStep('year')}
              style={tabBtnBase(step === 'year')}
            >
              <Text style={{ fontSize: 12, fontWeight: '500', color: muted }}>
                Año
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: coral }}>
                {selectedYear ?? '----'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              testID="tab-month-selector"
              disabled={selectedYear === null}
              onPress={() => setStep('month')}
              style={tabBtnBase(step === 'month')}
            >
              <Text style={{ fontSize: 12, fontWeight: '500', color: muted }}>
                Mes
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: coral }}>
                {selectedMonth !== null ? MONTH_NAMES[selectedMonth] : '---'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              testID="tab-day-selector"
              disabled={selectedMonth === null}
              onPress={() => setStep('day')}
              style={tabBtnBase(step === 'day')}
            >
              <Text style={{ fontSize: 12, fontWeight: '500', color: muted }}>
                Día
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: coral }}>
                {selectedDay ?? '--'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Selector Content based on Step */}
          <View style={{ height: 240, justifyContent: 'center' }}>
            {step === 'year' && (
              <ScrollView testID="years-list">
                {years.map((item) => (
                  <TouchableOpacity
                    key={item}
                    testID={`year-option-${item}`}
                    onPress={() => handleSelectYear(item)}
                    style={listItemStyle(selectedYear === item)}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: '600',
                        color: selectedYear === item ? coral : fg,
                      }}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {step === 'month' && (
              <ScrollView testID="months-list">
                {MONTH_NAMES.map((item, index) => (
                  <TouchableOpacity
                    key={item}
                    testID={`month-option-${index}`}
                    onPress={() => handleSelectMonth(index)}
                    style={listItemStyle(selectedMonth === index)}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: '600',
                        color: selectedMonth === index ? coral : fg,
                      }}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {step === 'day' && (
              <ScrollView
                testID="days-grid"
                contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' }}
              >
                {daysArray.map((item) => (
                  <TouchableOpacity
                    key={item}
                    testID={`day-option-${item}`}
                    onPress={() => handleSelectDay(item)}
                    style={dayBoxStyle(selectedDay === item)}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: '600',
                        color: selectedDay === item ? SELECTED_DAY_TEXT : fg,
                      }}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Action Buttons */}
          <View style={{ marginTop: 16, flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 1, borderTopColor: border, paddingTop: 12 }}>
            <TouchableOpacity
              testID="btn-cancel"
              onPress={onClose}
              style={{ paddingHorizontal: 16, paddingVertical: 8 }}
            >
              <Text style={{ fontSize: 16, fontWeight: '500', color: muted }}>
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
