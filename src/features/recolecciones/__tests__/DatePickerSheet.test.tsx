/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import React from 'react';

import { fireEvent, render } from '@testing-library/react-native';

import DatePickerSheet from '@/features/recolecciones/DatePickerSheet';

// Fija "hoy" al 15 de julio de 2026 para que la navegación
// año → mes → día y los días/meses deshabilitados sean deterministas.
beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 6, 15, 12, 0, 0));
});

afterAll(() => {
  jest.useRealTimers();
});

function renderPicker(
  props: Partial<React.ComponentProps<typeof DatePickerSheet>> = {},
) {
  const onSelect = jest.fn();
  const utils = render(
    <DatePickerSheet
      fecha={props.fecha ?? ''}
      isDark={false}
      fg="#000000"
      border="#dddddd"
      surface="#ffffff"
      brand="#cc0000"
      redCoral="#cc0000"
      onClose={jest.fn()}
      onSelect={onSelect}
      {...props}
    />,
  );
  return { ...utils, onSelect };
}

describe('DatePickerSheet', () => {
  it('muestra el título y los tabs con el día actual preseleccionado', () => {
    const { getByText } = renderPicker();

    expect(getByText('Seleccionar fecha')).toBeTruthy();
    expect(getByText('Año')).toBeTruthy();
    expect(getByText('Mes')).toBeTruthy();
    expect(getByText('Día')).toBeTruthy();
    // El tab de mes muestra el mes actual y el de día el día actual.
    expect(getByText('Julio')).toBeTruthy();
    expect(getByText('15')).toBeTruthy();
  });

  it('navega año → mes → día y entrega la fecha completa en onSelect', () => {
    const { getByText, onSelect } = renderPicker();

    fireEvent.press(getByText('2027'));
    fireEvent.press(getByText('Agosto'));
    fireEvent.press(getByText('20'));

    expect(onSelect).toHaveBeenCalledWith('2027-08-20');
  });

  it('ignora los meses anteriores al actual y sí pasa a los posteriores', () => {
    const { getByText, onSelect } = renderPicker();

    fireEvent.press(getByText('Mes'));
    fireEvent.press(getByText('Enero'));

    expect(onSelect).not.toHaveBeenCalled();
    // Sigue en el paso de mes tras presionar uno deshabilitado.
    expect(getByText('Febrero')).toBeTruthy();
    expect(getByText('Agosto')).toBeTruthy();

    fireEvent.press(getByText('Agosto'));
    fireEvent.press(getByText('20'));

    expect(onSelect).toHaveBeenCalledWith('2026-08-20');
  });

  it('no selecciona días anteriores a hoy pero sí los posteriores', () => {
    const { getByText, onSelect } = renderPicker();

    fireEvent.press(getByText('Día'));
    fireEvent.press(getByText('10'));

    expect(onSelect).not.toHaveBeenCalled();

    fireEvent.press(getByText('20'));

    expect(onSelect).toHaveBeenCalledWith('2026-07-20');
  });

  it('inicializa la selección desde la fecha recibida', () => {
    const { getByText, onSelect } = renderPicker({ fecha: '2025-12-24' });

    // La fecha inicial solo aparece en el tab de año, no en la lista.
    expect(getByText('2025')).toBeTruthy();

    fireEvent.press(getByText('Día'));
    fireEvent.press(getByText('24'));

    expect(onSelect).toHaveBeenCalledWith('2025-12-24');
  });
});
