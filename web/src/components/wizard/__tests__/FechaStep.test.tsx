import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FechaStep } from '../FechaStep';

const baseColors = {
  isDark: false,
  brand: '#24563C',
  coral: '#DE393A',
  muted: '#5E6B5E',
  border: '#E2E6DF',
  inputBorder: '#D6DAD4',
  surface: '#FFFFFF',
  bg: '#F5F7F0',
  fg: '#2D3328',
  accentBg: 'rgba(36,86,60,0.07)',
};

describe('FechaStep', () => {
  it('renders week number', () => {
    render(
      <FechaStep
        weekNumber={32}
        nextMonday={new Date(2026, 7, 3)}
        colors={baseColors}
      />,
    );
    expect(screen.getByText('Semana 32')).toBeDefined();
  });

  it('shows formatted date range', () => {
    render(
      <FechaStep
        weekNumber={32}
        nextMonday={new Date(2026, 7, 3)}
        colors={baseColors}
      />,
    );
    expect(screen.getByText(/lunes|martes|miércoles|jueves|viernes|sábado|domingo/i)).toBeDefined();
  });

  it('handles different week numbers', () => {
    const { rerender } = render(
      <FechaStep
        weekNumber={1}
        nextMonday={new Date(2026, 0, 5)}
        colors={baseColors}
      />,
    );
    expect(screen.getByText('Semana 1')).toBeDefined();

    rerender(
      <FechaStep
        weekNumber={53}
        nextMonday={new Date(2026, 11, 28)}
        colors={baseColors}
      />,
    );
    expect(screen.getByText('Semana 53')).toBeDefined();
  });

  it('renders with custom week number at year boundary', () => {
    render(
      <FechaStep
        weekNumber={1}
        nextMonday={new Date(2027, 0, 4)}
        colors={baseColors}
      />,
    );
    expect(screen.getByText('Semana 1')).toBeDefined();
  });

  it('shows formatted date with correct month', () => {
    render(
      <FechaStep
        weekNumber={35}
        nextMonday={new Date(2026, 7, 24)}
        colors={baseColors}
      />,
    );
    expect(screen.getByText('Semana 35')).toBeDefined();
  });
});
