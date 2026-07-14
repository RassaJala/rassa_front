import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

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
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 120 }, (_, i) => currentYear - i); // Up to 120 years back

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
        className="flex-1 items-center justify-center bg-black/50"
      >
        <Pressable
          className="w-[88%] max-w-sm rounded-3xl bg-white p-6 shadow-xl"
          onPress={(e) => e.stopPropagation()} // Prevent closing when tapping card
        >
          {/* Modal Header */}
          <Text className="mb-4 text-center text-xl font-bold text-slate-800">
            Fecha de Nacimiento
          </Text>

          {/* Current Selection Indicators */}
          <View className="mb-4 flex-row justify-between rounded-xl bg-slate-100 p-2">
            <TouchableOpacity
              testID="tab-year-selector"
              onPress={() => setStep('year')}
              className={`flex-1 items-center rounded-lg py-2 ${
                step === 'year' ? 'bg-white shadow-sm' : ''
              }`}
            >
              <Text className="text-xs font-medium text-slate-500">Año</Text>
              <Text className="text-sm font-semibold text-emerald-700">
                {selectedYear ?? '----'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              testID="tab-month-selector"
              disabled={selectedYear === null}
              onPress={() => setStep('month')}
              className={`flex-1 items-center rounded-lg py-2 ${
                step === 'month' ? 'bg-white shadow-sm' : ''
              }`}
            >
              <Text className="text-xs font-medium text-slate-500">Mes</Text>
              <Text className="text-sm font-semibold text-emerald-700">
                {selectedMonth !== null ? MONTH_NAMES[selectedMonth] : '---'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              testID="tab-day-selector"
              disabled={selectedMonth === null}
              onPress={() => setStep('day')}
              className={`flex-1 items-center rounded-lg py-2 ${
                step === 'day' ? 'bg-white shadow-sm' : ''
              }`}
            >
              <Text className="text-xs font-medium text-slate-500">Día</Text>
              <Text className="text-sm font-semibold text-emerald-700">
                {selectedDay ?? '--'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Selector Content based on Step */}
          <View className="h-60 justify-center">
            {step === 'year' && (
              <ScrollView testID="years-list">
                {years.map((item) => (
                  <TouchableOpacity
                    key={item}
                    testID={`year-option-${item}`}
                    onPress={() => handleSelectYear(item)}
                    className={`items-center border-b border-slate-100 py-3 ${
                      selectedYear === item ? 'bg-emerald-50' : ''
                    }`}
                  >
                    <Text
                      className={`text-base font-semibold ${
                        selectedYear === item
                          ? 'text-emerald-700'
                          : 'text-slate-700'
                      }`}
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
                    className={`items-center border-b border-slate-100 py-3 ${
                      selectedMonth === index ? 'bg-emerald-50' : ''
                    }`}
                  >
                    <Text
                      className={`text-base font-semibold ${
                        selectedMonth === index
                          ? 'text-emerald-700'
                          : 'text-slate-700'
                      }`}
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
                contentContainerStyle={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  justifyContent: 'flex-start',
                }}
              >
                {daysArray.map((item) => (
                  <TouchableOpacity
                    key={item}
                    testID={`day-option-${item}`}
                    onPress={() => handleSelectDay(item)}
                    className={`m-[1%] aspect-square w-[18%] items-center justify-center rounded-xl border border-slate-100 ${
                      selectedDay === item
                        ? 'border-emerald-600 bg-emerald-600'
                        : 'bg-white'
                    }`}
                  >
                    <Text
                      className={`text-base font-semibold ${
                        selectedDay === item ? 'text-white' : 'text-slate-700'
                      }`}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Action Buttons */}
          <View className="mt-4 flex-row justify-end space-x-3 border-t border-slate-100 pt-3">
            <TouchableOpacity
              testID="btn-cancel"
              onPress={onClose}
              className="px-4 py-2"
            >
              <Text className="text-base font-medium text-slate-500">
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
