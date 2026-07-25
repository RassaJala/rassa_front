/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import DatePickerModal from '@/components/DatePickerModal';

describe('DatePickerModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('no renderiza contenido cuando no es visible', () => {
    const { queryByTestId } = render(
      <DatePickerModal
        visible={false}
        onClose={jest.fn()}
        onSelectDate={jest.fn()}
      />,
    );

    expect(queryByTestId('modal-overlay')).toBeNull();
  });

  it('renderiza el modal cuando es visible', () => {
    const { getByTestId } = render(
      <DatePickerModal
        visible
        onClose={jest.fn()}
        onSelectDate={jest.fn()}
      />,
    );

    expect(getByTestId('modal-overlay')).toBeTruthy();
    expect(getByTestId('tab-year-selector')).toBeTruthy();
    expect(getByTestId('tab-month-selector')).toBeTruthy();
    expect(getByTestId('tab-day-selector')).toBeTruthy();
  });

  it('comienza en el paso de año cuando no hay initialDate', () => {
    const { getByTestId } = render(
      <DatePickerModal
        visible
        onClose={jest.fn()}
        onSelectDate={jest.fn()}
      />,
    );

    expect(getByTestId('years-list')).toBeTruthy();
  });

  it('navega año → mes → día y llama a onSelectDate al completar', async () => {
    const onSelectDate = jest.fn();
    const onClose = jest.fn();

    const { getByTestId } = render(
      <DatePickerModal
        visible
        onClose={onClose}
        onSelectDate={onSelectDate}
      />,
    );

    // Step 1: Select year
    fireEvent.press(getByTestId('year-option-2000'));
    await waitFor(() => {
      expect(getByTestId('months-list')).toBeTruthy();
    });

    // Step 2: Select month (Enero = index 0)
    fireEvent.press(getByTestId('month-option-0'));
    await waitFor(() => {
      expect(getByTestId('days-grid')).toBeTruthy();
    });

    // Step 3: Select day
    fireEvent.press(getByTestId('day-option-15'));

    expect(onSelectDate).toHaveBeenCalledWith('2000-01-15');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('inicializa desde initialDate cuando se provee', () => {
    const { getByTestId } = render(
      <DatePickerModal
        visible
        onClose={jest.fn()}
        onSelectDate={jest.fn()}
        initialDate="1995-06-20"
      />,
    );

    // Should start at 'day' step since full date was provided
    expect(getByTestId('days-grid')).toBeTruthy();
  });

  it('cierra al presionar el overlay', () => {
    const onClose = jest.fn();

    const { getByTestId } = render(
      <DatePickerModal
        visible
        onClose={onClose}
        onSelectDate={jest.fn()}
      />,
    );

    fireEvent.press(getByTestId('modal-overlay'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('cierra al presionar Cancelar', () => {
    const onClose = jest.fn();

    const { getByTestId } = render(
      <DatePickerModal
        visible
        onClose={onClose}
        onSelectDate={jest.fn()}
      />,
    );

    fireEvent.press(getByTestId('btn-cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
