/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import React from 'react';
import { render } from '@testing-library/react-native';
import { Platform } from 'react-native';

import DatePickerModal from '@/components/DatePickerModal';

jest.mock('@react-native-community/datetimepicker', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

function getDatePickerProps(): Record<string, unknown> {
  const MockDatePicker = jest.requireMock(
    '@react-native-community/datetimepicker',
  ).default as jest.Mock;
  const calls = MockDatePicker.mock.calls;
  return (calls[calls.length - 1]?.[0] as Record<string, unknown>) ?? {};
}

const ORIGINAL_OS = Platform.OS;

describe('DatePickerModal', () => {
  beforeAll(() => {
    Object.defineProperty(Platform, 'OS', { get: () => 'android', configurable: true });
  });

  afterAll(() => {
    Object.defineProperty(Platform, 'OS', { get: () => ORIGINAL_OS, configurable: true });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devuelve un View en Android cuando no es visible (no null, evita crash DialogFragment)', () => {
    const { toJSON } = render(
      <DatePickerModal
        visible={false}
        onClose={jest.fn()}
        onSelectDate={jest.fn()}
      />,
    );

    // On Android we keep mounted with <View /> to prevent native dialog crash
    expect(toJSON()).not.toBeNull();
    // Ensure no DateTimePicker was rendered
    const MockDatePicker = jest.requireMock(
      '@react-native-community/datetimepicker',
    ).default as jest.Mock;
    expect(MockDatePicker).not.toHaveBeenCalled();
  });

  it('renderiza DateTimePicker cuando es visible', () => {
    render(
      <DatePickerModal
        visible
        onClose={jest.fn()}
        onSelectDate={jest.fn()}
      />,
    );

    const props = getDatePickerProps();
    expect(props.mode).toBe('date');
    expect(props.display).toBe('default');
  });

  it('llama a onSelectDate con la fecha formateada al seleccionar', () => {
    const onSelectDate = jest.fn();
    const onClose = jest.fn();

    render(
      <DatePickerModal
        visible
        onClose={onClose}
        onSelectDate={onSelectDate}
      />,
    );

    const props = getDatePickerProps();
    (props.onChange as (event: { type: string }, date?: Date) => void)(
      { type: 'set' },
      new Date(2000, 0, 15),
    );

    expect(onSelectDate).toHaveBeenCalledWith('2000-01-15');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('llama a onClose al descartar', () => {
    const onClose = jest.fn();
    const onSelectDate = jest.fn();

    render(
      <DatePickerModal
        visible
        onClose={onClose}
        onSelectDate={onSelectDate}
      />,
    );

    const props = getDatePickerProps();
    (props.onChange as (event: { type: string }) => void)({
      type: 'dismissed',
    });

    expect(onSelectDate).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('usa initialDate como valor cuando se proporciona', () => {
    render(
      <DatePickerModal
        visible
        onClose={jest.fn()}
        onSelectDate={jest.fn()}
        initialDate="2000-01-15"
      />,
    );

    const props = getDatePickerProps();
    expect(props.value).toEqual(new Date('2000-01-15T00:00:00'));
  });

  it('usa la fecha actual cuando no hay initialDate', () => {
    render(
      <DatePickerModal
        visible
        onClose={jest.fn()}
        onSelectDate={jest.fn()}
      />,
    );

    const props = getDatePickerProps();
    expect(props.value).toBeInstanceOf(Date);
  });

  it('establece maximumDate a 18 años atrás', () => {
    render(
      <DatePickerModal
        visible
        onClose={jest.fn()}
        onSelectDate={jest.fn()}
      />,
    );

    const props = getDatePickerProps();
    expect(props.maximumDate).toBeInstanceOf(Date);
    expect(props.maximumDate.getFullYear()).toBe(
      new Date().getFullYear() - 18,
    );
  });
});
