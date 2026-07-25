import { useEffect, useState } from 'react';
import { useTheme } from '../providers/ThemeProvider';
import { getColors } from '../constants/colors';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const YEARS_BACK = 103;

interface WebDatePickerModalProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly onSelectDate: (dateString: string) => void;
  readonly initialDate?: string;
}

export default function WebDatePickerModal({
  visible,
  onClose,
  onSelectDate,
  initialDate,
}: WebDatePickerModalProps) {
  const { resolved } = useTheme();
  const isDark = resolved === 'dark';
  const c = getColors(isDark);
  const { fg, muted, border, surface, bg, coral } = c;

  const currentYear = new Date().getFullYear();
  const maxAdultYear = currentYear - 18;
  const years = Array.from({ length: YEARS_BACK }, (_, i) => maxAdultYear - i);

  const [step, setStep] = useState<'year' | 'month' | 'day'>('year');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  useEffect(() => {
    if (visible) {
      if (initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate)) {
        const parts = initialDate.split('-').map(Number);
        const y = parts[0] ?? currentYear;
        const m = parts[1] ?? 1;
        const d = parts[2] ?? 1;
        setSelectedYear(y);
        setSelectedMonth(m - 1);
        setSelectedDay(d);
        setStep('day');
      } else {
        setSelectedYear(null);
        setSelectedMonth(null);
        setSelectedDay(null);
        setStep('year');
      }
    }
  }, [visible, initialDate, currentYear]);

  if (!visible) return null;

  const daysCount =
    selectedYear !== null && selectedMonth !== null
      ? new Date(selectedYear, selectedMonth + 1, 0).getDate()
      : 31;
  const daysArray = Array.from({ length: daysCount }, (_, i) => i + 1);

  function handleSelectYear(year: number) {
    setSelectedYear(year);
    setStep('month');
  }
  function handleSelectMonth(monthIndex: number) {
    setSelectedMonth(monthIndex);
    setStep('day');
  }
  function handleSelectDay(day: number) {
    setSelectedDay(day);
    if (selectedYear !== null && selectedMonth !== null) {
      const monthStr = String(selectedMonth + 1).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      onSelectDate(`${selectedYear}-${monthStr}-${dayStr}`);
      onClose();
    }
  }

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0,0,0,0.45)',
  };

  const cardStyle: React.CSSProperties = {
    width: '88%',
    maxWidth: 380,
    borderRadius: 16,
    background: surface,
    border: `1px solid ${border}`,
    padding: 24,
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
  };

  const tabBtn = (active: boolean, disabled?: boolean): React.CSSProperties => ({
    flex: 1,
    textAlign: 'center',
    padding: '8px 0',
    borderRadius: 8,
    border: 'none',
    background: active ? bg : 'transparent',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
  });

  const listItemStyle = (selected: boolean): React.CSSProperties => ({
    textAlign: 'center',
    padding: '10px 0',
    borderBottom: `1px solid ${border}`,
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 15,
    background: selected ? (isDark ? `${coral}22` : `${coral}11`) : 'transparent',
    color: selected ? coral : fg,
    borderRadius: selected ? 8 : 0,
  });

  const dayBoxStyle = (selected: boolean): React.CSSProperties => ({
    width: '18%',
    aspectRatio: '1',
    margin: '1%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    border: `1px solid ${selected ? coral : border}`,
    background: selected ? coral : bg,
    color: selected ? '#fff' : fg,
    fontWeight: 600,
    fontSize: 14,
    cursor: 'pointer',
  });

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={cardStyle} onClick={(e) => e.stopPropagation()}>
        <p style={{ textAlign: 'center', fontSize: 18, fontWeight: 700, color: fg, marginBottom: 16 }}>
          Fecha de Nacimiento
        </p>

        <div style={{ display: 'flex', gap: 4, background: bg, borderRadius: 10, padding: 4, marginBottom: 16 }}>
          <button type="button" style={tabBtn(step === 'year')} onClick={() => setStep('year')}>
            <div style={{ fontSize: 11, color: muted }}>Año</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: coral }}>{selectedYear ?? '----'}</div>
          </button>
          <button type="button" style={tabBtn(step === 'month', !selectedYear)} disabled={!selectedYear} onClick={() => setStep('month')}>
            <div style={{ fontSize: 11, color: muted }}>Mes</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: coral }}>{selectedMonth !== null ? MONTH_NAMES[selectedMonth] : '---'}</div>
          </button>
          <button type="button" style={tabBtn(step === 'day', selectedMonth === null)} disabled={selectedMonth === null} onClick={() => setStep('day')}>
            <div style={{ fontSize: 11, color: muted }}>Día</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: coral }}>{selectedDay ?? '--'}</div>
          </button>
        </div>

        <div style={{ height: 240, overflowY: 'auto' }}>
          {step === 'year' && years.map((y) => (
            <div key={y} style={listItemStyle(selectedYear === y)} onClick={() => handleSelectYear(y)}>
              {y}
            </div>
          ))}

          {step === 'month' && MONTH_NAMES.map((name, idx) => (
            <div key={name} style={listItemStyle(selectedMonth === idx)} onClick={() => handleSelectMonth(idx)}>
              {name}
            </div>
          ))}

          {step === 'day' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
              {daysArray.map((d) => (
                <div key={d} style={dayBoxStyle(selectedDay === d)} onClick={() => handleSelectDay(d)}>
                  {d}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, borderTop: `1px solid ${border}`, paddingTop: 12 }}>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 14, fontWeight: 500, color: muted, cursor: 'pointer', padding: '4px 8px' }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
