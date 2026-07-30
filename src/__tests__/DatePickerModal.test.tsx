/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import DatePickerModal from '@/components/DatePickerModal';

// ── Tests ───────────────────────────────────────────
describe('DatePickerModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it('muestra paso de años al abrir sin initialDate', () => {
    const { getByText } = render(
      <DatePickerModal visible onClose={jest.fn()} onSelectDate={jest.fn()} />,
    );

    expect(getByText('Fecha de Nacimiento')).toBeTruthy();
    expect(getByText('Cancelar')).toBeTruthy();
    // Should show recent years
    expect(getByText(String(new Date().getFullYear() - 18))).toBeTruthy();
    expect(getByText(String(new Date().getFullYear() - 19))).toBeTruthy();
  });

  it('inicializa desde initialDate y muestra día seleccionado', () => {
    const { getAllByText } = render(
      <DatePickerModal
        visible
        onClose={jest.fn()}
        onSelectDate={jest.fn()}
        initialDate="1995-06-20"
      />,
    );

    // Should show the year list with 1995 highlighted
    expect(getAllByText('1995').length).toBeGreaterThan(0);
    // Month tab should show the selected month
    expect(getAllByText('Junio').length).toBeGreaterThan(0);
    // Day tab should show the selected day (appears in both tab and grid)
    expect(getAllByText('20').length).toBeGreaterThan(0);
  });

  it('flujo completo: Año → Mes → Día llama onSelectDate y onClose', () => {
    const onSelectDate = jest.fn();
    const onClose = jest.fn();

    const { getByText } = render(
      <DatePickerModal visible onClose={onClose} onSelectDate={onSelectDate} />,
    );

    // Step 1: Select year
    fireEvent.press(getByText('1995'));
    // Step 2: Select month
    fireEvent.press(getByText('Junio'));
    // Step 3: Select day
    fireEvent.press(getByText('20'));

    expect(onSelectDate).toHaveBeenCalledWith('1995-06-20');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('botón Hecho funciona cuando hay día seleccionado', () => {
    const onSelectDate = jest.fn();
    const onClose = jest.fn();

    const { getByText } = render(
      <DatePickerModal
        visible
        onClose={onClose}
        onSelectDate={onSelectDate}
        initialDate="1995-06-20"
      />,
    );

    fireEvent.press(getByText('Hecho'));

    expect(onSelectDate).toHaveBeenCalledWith('1995-06-20');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('cierra al presionar el overlay', () => {
    const onClose = jest.fn();

    const { getByTestId } = render(
      <DatePickerModal visible onClose={onClose} onSelectDate={jest.fn()} />,
    );

    fireEvent.press(getByTestId('modal-overlay'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('puede navegar entre pasos con el tab bar', () => {
    const { getByText, getAllByText } = render(
      <DatePickerModal
        visible
        onClose={jest.fn()}
        onSelectDate={jest.fn()}
        initialDate="1995-06-20"
      />,
    );

    // "20" appears in both tab bar and day grid
    expect(getAllByText('20').length).toBeGreaterThan(1);

    // Go back to year step
    fireEvent.press(getByText('Año'));
    expect(getAllByText('1995').length).toBeGreaterThan(0);

    // Go to month step
    fireEvent.press(getByText('Mes'));
    expect(getAllByText('Junio').length).toBeGreaterThan(0);
  });

  it('cambia día y Hecho confirma el nuevo valor', () => {
    const onSelectDate = jest.fn();
    const onClose = jest.fn();

    const { getByText } = render(
      <DatePickerModal
        visible
        onClose={onClose}
        onSelectDate={onSelectDate}
        initialDate="1995-06-15"
      />,
    );

    // Day 15 is pre-selected, tap day 10 instead
    fireEvent.press(getByText('10'));
    // Auto-confirms on day selection
    expect(onSelectDate).toHaveBeenCalledWith('1995-06-10');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('muestra años en rango correcto (18-120 años atrás)', () => {
    const { getByText, queryByText } = render(
      <DatePickerModal visible onClose={jest.fn()} onSelectDate={jest.fn()} />,
    );

    const currentYear = new Date().getFullYear();
    // Max adult year (18 years ago)
    expect(getByText(String(currentYear - 18))).toBeTruthy();
    // Min year (121 years ago from max — YEARS_BACK=103 items, last index=102)
    expect(getByText(String(currentYear - 18 - 102))).toBeTruthy();
    // Future years should NOT appear
    expect(queryByText(String(currentYear))).toBeNull();
  });

  it('meses están en español', () => {
    const { getByText } = render(
      <DatePickerModal visible onClose={jest.fn()} onSelectDate={jest.fn()} />,
    );

    // Select any year to advance to month step
    fireEvent.press(getByText(String(new Date().getFullYear() - 18)));

    // All 12 months in Spanish
    const months = [
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
    for (const m of months) {
      expect(getByText(m)).toBeTruthy();
    }
  });

  it('días correctos para febrero en año bisiesto', () => {
    const { getByText, queryByText } = render(
      <DatePickerModal visible onClose={jest.fn()} onSelectDate={jest.fn()} />,
    );

    // Select a known leap year
    fireEvent.press(getByText('2004'));
    fireEvent.press(getByText('Febrero'));

    // Feb 2004 has 29 days
    expect(getByText('29')).toBeTruthy();
    // Day 30 should NOT exist
    expect(queryByText('30')).toBeNull();
  });
});
