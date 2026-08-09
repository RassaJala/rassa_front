/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import React from 'react';

import { fireEvent, render } from '@testing-library/react-native';

import TimePickerSheet from '@/features/recolecciones/TimePickerSheet';

function renderPicker(
  props: Partial<React.ComponentProps<typeof TimePickerSheet>> = {},
) {
  const onSelect = jest.fn();
  const utils = render(
    <TimePickerSheet
      currentValue={props.currentValue ?? ''}
      title="Hora de inicio"
      fg="#000000"
      muted="#888888"
      border="#dddddd"
      surface="#ffffff"
      brand="#cc0000"
      white="#ffffff"
      redCoral="#cc0000"
      onClose={jest.fn()}
      onSelect={onSelect}
      {...props}
    />,
  );
  return { ...utils, onSelect };
}

describe('TimePickerSheet', () => {
  it('muestra el título y conserva el valor actual al confirmar', () => {
    const { getByText, onSelect } = renderPicker({ currentValue: '09:30' });

    expect(getByText('Hora de inicio')).toBeTruthy();
    expect(getByText('Hora')).toBeTruthy();
    expect(getByText('Minutos')).toBeTruthy();

    fireEvent.press(getByText('Seleccionar'));

    expect(onSelect).toHaveBeenCalledWith('09:30');
  });

  it('usa 08:00 como valor por defecto sin currentValue', () => {
    const { getByText, onSelect } = renderPicker();

    fireEvent.press(getByText('Seleccionar'));

    expect(onSelect).toHaveBeenCalledWith('08:00');
  });

  it('permite elegir solo la hora', () => {
    const { getByText, onSelect } = renderPicker();

    fireEvent.press(getByText('14'));
    fireEvent.press(getByText('Seleccionar'));

    expect(onSelect).toHaveBeenCalledWith('14:00');
  });

  it('permite elegir hora y minutos', () => {
    const { getByText, onSelect } = renderPicker();

    fireEvent.press(getByText('08'));
    fireEvent.press(getByText('45'));
    fireEvent.press(getByText('Seleccionar'));

    expect(onSelect).toHaveBeenCalledWith('08:45');
  });
});
