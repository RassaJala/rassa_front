import React, { useCallback } from 'react';
import { Platform, View } from 'react-native';

import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import DateTimePicker from '@react-native-community/datetimepicker';

interface DatePickerModalProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly onSelectDate: (dateString: string) => void;
  readonly initialDate?: string; // Expects "YYYY-MM-DD"
}

/**
 * Native date picker that uses the platform's default dialog.
 * On Android it shows a native dialog (no React context issues).
 * On iOS it shows the inline wheel picker or dialog depending on display mode.
 */
export default function DatePickerModal({
  visible,
  onClose,
  onSelectDate,
  initialDate,
}: DatePickerModalProps): React.JSX.Element | null {
  const currentValue = initialDate
    ? new Date(initialDate + 'T00:00:00')
    : new Date();

  const handleChange = useCallback(
    (event: DateTimePickerEvent, selectedDate?: Date) => {
      if (event.type === 'set' && selectedDate) {
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        onSelectDate(`${year}-${month}-${day}`);
      }
      onClose();
    },
    [onSelectDate, onClose],
  );

  if (!visible) {
    // On Android, keep mounted with hidden container to prevent
    // "Unable to add window" crash on rapid show/hide of the native DialogFragment
    if (Platform.OS === 'android') return <View />;
    return null;
  }

  return (
    <DateTimePicker
      value={currentValue}
      mode="date"
      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
      onChange={handleChange}
      maximumDate={(() => {
        const d = new Date();
        d.setFullYear(d.getFullYear() - 18);
        return d;
      })()}
    />
  );
}
