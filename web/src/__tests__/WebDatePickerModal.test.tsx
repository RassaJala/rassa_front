import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import { render, fireEvent, screen } from '@testing-library/react';
import WebDatePickerModal from '../components/WebDatePickerModal';

vi.mock('../providers/ThemeProvider', () => ({
  useTheme: () => ({ resolved: 'light' }),
}));

describe('WebDatePickerModal', () => {
  it('does not render when visible is false', () => {
    const { container } = render(
      <WebDatePickerModal
        visible={false}
        onClose={vi.fn()}
        onSelectDate={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders and displays years selection initially', () => {
    render(
      <WebDatePickerModal
        visible={true}
        onClose={vi.fn()}
        onSelectDate={vi.fn()}
      />,
    );

    expect(screen.getByText('Fecha de Nacimiento')).toBeInTheDocument();
    const currentYear = new Date().getFullYear();
    expect(screen.getByText(String(currentYear - 18))).toBeInTheDocument();
  });

  it('can navigate from year to month to day and select a date', () => {
    const onSelectDateMock = vi.fn();
    const onCloseMock = vi.fn();

    render(
      <WebDatePickerModal
        visible={true}
        onClose={onCloseMock}
        onSelectDate={onSelectDateMock}
      />,
    );

    // 1. Select a year (e.g. 2008, since max year is currentYear - 18)
    const currentYear = new Date().getFullYear();
    const targetYear = currentYear - 18;
    const yearButton = screen.getByText(String(targetYear));
    fireEvent.click(yearButton);

    // 2. Select a month (e.g. "Enero")
    const monthButton = screen.getByText('Enero');
    fireEvent.click(monthButton);

    // 3. Select a day (e.g. "15")
    const dayButton = screen.getByText('15');
    fireEvent.click(dayButton);

    // Verify it called onSelectDate with the correct format and closed
    expect(onSelectDateMock).toHaveBeenCalledWith(`${targetYear}-01-15`);
    expect(onCloseMock).toHaveBeenCalled();
  });

  it('pre-selects date if initialDate is provided', () => {
    render(
      <WebDatePickerModal
        visible={true}
        onClose={vi.fn()}
        onSelectDate={vi.fn()}
        initialDate="2000-05-20"
      />,
    );

    expect(screen.getAllByText('20')[0]).toBeInTheDocument();
  });

  it('handles leap years correctly', () => {
    render(
      <WebDatePickerModal
        visible={true}
        onClose={vi.fn()}
        onSelectDate={vi.fn()}
      />,
    );

    // Select leap year 2004
    fireEvent.click(screen.getByText('2004'));
    // Select Febrero
    fireEvent.click(screen.getByText('Febrero'));

    // Febrero 2004 has 29 days
    expect(screen.getByText('29')).toBeInTheDocument();
    expect(screen.queryByText('30')).toBeNull();
  });

  it('closes when clicking overlay', () => {
    const onCloseMock = vi.fn();
    const { container } = render(
      <WebDatePickerModal
        visible={true}
        onClose={onCloseMock}
        onSelectDate={vi.fn()}
      />,
    );

    const backdrop = container.firstChild;
    if (backdrop) {
      fireEvent.click(backdrop);
    }
    expect(onCloseMock).toHaveBeenCalled();
  });

  it('can navigate back and forth using tabs', () => {
    render(
      <WebDatePickerModal
        visible={true}
        onClose={vi.fn()}
        onSelectDate={vi.fn()}
        initialDate="2000-05-20"
      />,
    );

    // Click "Año" step tab
    fireEvent.click(screen.getByText('Año'));
    expect(screen.getAllByText('2000')[0]).toBeInTheDocument();

    // Click "Mes" step tab
    fireEvent.click(screen.getByText('Mes'));
    expect(screen.getAllByText('Mayo')[0]).toBeInTheDocument();
  });
});
