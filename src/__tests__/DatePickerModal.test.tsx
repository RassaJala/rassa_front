/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import React from 'react';
import { Platform } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

import DatePickerModal from '@/components/DatePickerModal';

// ── Mock DateTimePicker ─────────────────────────────
const mockOnValueChange = jest.fn();
let mockDateTimePickerValue = new Date(2000, 0, 15);

jest.mock('@react-native-community/datetimepicker', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: jest.fn(
      ({
        value,
        onChange,
        testID,
      }: {
        readonly value: Date;
        readonly onChange: (e: unknown, d?: Date) => void;
        readonly testID: string;
      }) => {
        mockDateTimePickerValue = value;
        mockOnValueChange.mockImplementation(onChange);
        return <View testID={testID} />;
      },
    ),
  };
});

// ── Helpers ─────────────────────────────────────────
function mockAndroid(): void {
  jest.replaceProperty(Platform, 'OS', 'android');
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function mockIOS(): void {
  jest.replaceProperty(Platform, 'OS', 'ios');
}

// ── Tests ───────────────────────────────────────────
describe('DatePickerModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('on Android', () => {
    beforeEach(() => {
      mockAndroid();
    });

    it('no renderiza nada cuando visible=false', () => {
      const result = render(
        <DatePickerModal
          visible={false}
          onClose={jest.fn()}
          onSelectDate={jest.fn()}
        />,
      );
      expect(result.toJSON()).toBeNull();
    });

    it('renderiza DateTimePicker nativo cuando visible=true', () => {
      const { getByTestId } = render(
        <DatePickerModal
          visible
          onClose={jest.fn()}
          onSelectDate={jest.fn()}
        />,
      );

      expect(getByTestId('dateTimePicker')).toBeTruthy();
    });

    it('llama onSelectDate y onClose al seleccionar fecha', () => {
      const onSelectDate = jest.fn();
      const onClose = jest.fn();

      render(
        <DatePickerModal
          visible
          onClose={onClose}
          onSelectDate={onSelectDate}
        />,
      );

      // Simulate native picker selection
      mockOnValueChange(
        { type: 'set', nativeEvent: { timestamp: 0, utcOffset: 0 } },
        new Date(2000, 0, 15),
      );

      expect(onSelectDate).toHaveBeenCalledWith('2000-01-15');
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('on iOS', () => {
    beforeEach(() => {
      mockIOS();
    });

    it('no renderiza overlay cuando visible=false', () => {
      const { queryByTestId } = render(
        <DatePickerModal
          visible={false}
          onClose={jest.fn()}
          onSelectDate={jest.fn()}
        />,
      );

      expect(queryByTestId('modal-overlay')).toBeNull();
    });

    it('renderiza Modal con picker y botón Hecho cuando visible=true', () => {
      const { getByTestId, getByText } = render(
        <DatePickerModal
          visible
          onClose={jest.fn()}
          onSelectDate={jest.fn()}
        />,
      );

      expect(getByTestId('modal-overlay')).toBeTruthy();
      expect(getByTestId('dateTimePicker')).toBeTruthy();
      expect(getByText('Hecho')).toBeTruthy();
    });

    it('inicializa desde initialDate', () => {
      const { getByTestId } = render(
        <DatePickerModal
          visible
          onClose={jest.fn()}
          onSelectDate={jest.fn()}
          initialDate="1995-06-20"
        />,
      );

      // The picker should receive the parsed initialDate
      const picker = getByTestId('dateTimePicker');
      expect(picker).toBeTruthy();
      // value prop was set from initialDate
      expect(mockDateTimePickerValue.toISOString()).toContain('1995-06-20');
    });

    it('cierra al presionar el overlay', () => {
      const onClose = jest.fn();

      const { getByTestId } = render(
        <DatePickerModal visible onClose={onClose} onSelectDate={jest.fn()} />,
      );

      fireEvent.press(getByTestId('modal-overlay'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('llama onSelectDate y onClose al presionar Hecho', () => {
      const onSelectDate = jest.fn();
      const onClose = jest.fn();

      const { getByText } = render(
        <DatePickerModal
          visible
          onClose={onClose}
          onSelectDate={onSelectDate}
          initialDate="2000-01-15"
        />,
      );

      fireEvent.press(getByText('Hecho'));

      expect(onSelectDate).toHaveBeenCalledWith('2000-01-15');
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
