import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import DateTimePicker from '@react-native-community/datetimepicker';
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';

// ── Helpers ──────────────────────────────────────────

function parseInitialDate(dateStr?: string): Date {
  if (!dateStr) return new Date();
  // Force local-time parsing so getFullYear/getMonth/getDate are correct
  const d = new Date(dateStr + 'T00:00:00');
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getBounds(): { min: Date; max: Date } {
  const now = new Date();
  const maxAdultYear = now.getFullYear() - 18;
  const maxAdult = new Date(maxAdultYear, now.getMonth(), now.getDate());
  // 103 years back from the max adult date → allows ages ~18 to ~121
  const min = new Date(maxAdult);
  min.setFullYear(min.getFullYear() - 103);
  return { min, max: maxAdult };
}

// ── Props ────────────────────────────────────────────

interface DatePickerModalProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly onSelectDate: (dateString: string) => void;
  readonly initialDate?: string;
}

// ── Component ────────────────────────────────────────

export default function DatePickerModal({
  visible,
  onClose,
  onSelectDate,
  initialDate,
}: DatePickerModalProps): React.JSX.Element | null {
  const [internalDate, setInternalDate] = useState(() =>
    parseInitialDate(initialDate),
  );
  const bounds = getBounds();

  // Sync internal date when modal opens with a new initialDate
  useEffect(() => {
    if (visible) {
      setInternalDate(parseInitialDate(initialDate));
    }
  }, [visible, initialDate]);

  const handleChange = useCallback(
    (event: DateTimePickerEvent, selectedDate?: Date) => {
      if (selectedDate) {
        setInternalDate(selectedDate);
      }
      if (Platform.OS === 'android') {
        // Android dialog closes automatically after selection or dismiss
        if (selectedDate && event.type !== 'dismissed') {
          onSelectDate(toDateString(selectedDate));
        }
        onClose();
      }
      // iOS: just update the internal date, user taps "Hecho" to confirm
    },
    [onSelectDate, onClose],
  );

  const handleDone = useCallback(() => {
    onSelectDate(toDateString(internalDate));
    onClose();
  }, [internalDate, onSelectDate, onClose]);

  // ── Android: native dialog ─────────────────────────
  if (Platform.OS === 'android') {
    // Render nothing when not visible so the dialog lifecycle is clean
    if (!visible) return null;

    return (
      <DateTimePicker
        testID="dateTimePicker"
        value={internalDate}
        mode="date"
        display="default"
        minimumDate={bounds.min}
        maximumDate={bounds.max}
        onChange={handleChange}
      />
    );
  }

  // ── iOS: spinner inside a Modal ────────────────────
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
          className="rounded-t-2xl bg-white p-6 dark:bg-gray-900"
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-brand-ink dark:text-gray-100">
              Fecha de Nacimiento
            </Text>
            <TouchableOpacity
              testID="btn-done"
              onPress={handleDone}
              className="px-3 py-1"
            >
              <Text className="text-base font-semibold text-brand-red-coral">
                Hecho
              </Text>
            </TouchableOpacity>
          </View>

          <DateTimePicker
            testID="dateTimePicker"
            value={internalDate}
            mode="date"
            display="spinner"
            minimumDate={bounds.min}
            maximumDate={bounds.max}
            onChange={handleChange}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
