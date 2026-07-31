import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { getDaysInMonth, parseInitialDate, toDateString } from '@/common/waste';
import { colors } from '@/constants/colors';
import { MONTH_NAMES } from '@/constants/dates';

interface Props {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly onSelectDate: (iso: string) => void;
  readonly initialDate?: string;
  readonly surface: string;
  readonly fg: string;
  readonly muted: string;
  readonly brand: string;
  readonly segBg: string;
}

const YEARS_RANGE = 5;

export function MermaDateModal({
  visible,
  onClose,
  onSelectDate,
  initialDate,
  surface,
  fg,
  muted,
  brand,
  segBg,
}: Props): React.JSX.Element | null {
  const [step, setStep] = useState<'year' | 'month' | 'day'>('year');
  const [selYear, setSelYear] = useState<number | null>(null);
  const [selMonth, setSelMonth] = useState<number | null>(null);
  const [selDay, setSelDay] = useState<number | null>(null);

  useEffect(() => {
    if (visible) {
      const p = parseInitialDate(initialDate);
      if (p) {
        setSelYear(p.year);
        setSelMonth(p.month);
        setSelDay(p.day);
        setStep('day');
      } else {
        setSelYear(null);
        setSelMonth(null);
        setSelDay(null);
        setStep('year');
      }
    }
  }, [visible, initialDate]);

  if (!visible) return null;

  const today = new Date();
  const years = Array.from(
    { length: YEARS_RANGE + 1 },
    (_, i) => today.getFullYear() - i,
  );
  const months = MONTH_NAMES;
  const daysCount =
    selYear !== null && selMonth !== null
      ? getDaysInMonth(selYear, selMonth)
      : 31;
  // Do not allow future days in the current month.
  const isCurrentMonth =
    selYear === today.getFullYear() && selMonth === today.getMonth();
  const days = Array.from({ length: daysCount }, (_, i) => i + 1).filter(
    (d) => !(isCurrentMonth && d > today.getDate()),
  );
  const canConfirm = selYear !== null && selMonth !== null && selDay !== null;

  function handleSelectYear(y: number) {
    setSelYear(y);
    setSelMonth(null);
    setSelDay(null);
    setStep('month');
  }

  function handleSelectMonth(m: number) {
    setSelMonth(m);
    setSelDay(null);
    setStep('day');
  }

  function handleSelectDay(d: number) {
    setSelDay(d);
    if (selYear !== null && selMonth !== null) {
      onSelectDate(toDateString(selYear, selMonth, d));
      onClose();
    }
  }

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/50" onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: surface,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            padding: 20,
            maxHeight: '70%',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '700', color: fg }}>
              Seleccionar fecha
            </Text>
            <Pressable onPress={onClose}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: brand }}>
                Cancelar
              </Text>
            </Pressable>
          </View>

          <View
            style={{
              flexDirection: 'row',
              borderRadius: 12,
              backgroundColor: segBg,
              padding: 4,
              marginBottom: 16,
            }}
          >
            {(
              [
                { key: 'year', label: 'Año', value: selYear },
                {
                  key: 'month',
                  label: 'Mes',
                  value: selMonth !== null ? (months[selMonth] ?? '') : null,
                },
                { key: 'day', label: 'Día', value: selDay },
              ] as const
            ).map((tab) => (
              <Pressable
                key={tab.key}
                onPress={() => setStep(tab.key)}
                disabled={tab.key === 'month' && selYear === null}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  borderRadius: 8,
                  paddingVertical: 8,
                  backgroundColor:
                    step === tab.key ? surface : colors.transparent,
                  opacity: tab.key === 'month' && selYear === null ? 0.4 : 1,
                }}
              >
                <Text style={{ fontSize: 11, color: muted }}>{tab.label}</Text>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: step === tab.key ? brand : fg,
                  }}
                >
                  {tab.value ?? '---'}
                </Text>
              </Pressable>
            ))}
          </View>

          <ScrollView
            style={{ maxHeight: 280 }}
            showsVerticalScrollIndicator={false}
          >
            {step === 'year' && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {years.map((y) => (
                  <Pressable
                    key={y}
                    onPress={() => handleSelectYear(y)}
                    style={[
                      pickStyles.item,
                      { backgroundColor: selYear === y ? brand : segBg },
                    ]}
                  >
                    <Text
                      style={[
                        pickStyles.itemText,
                        { color: selYear === y ? colors.iconWhite : fg },
                      ]}
                    >
                      {y}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {step === 'month' && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {months.map((name, idx) => (
                  <Pressable
                    key={name}
                    onPress={() => handleSelectMonth(idx)}
                    style={[
                      pickStyles.item,
                      { backgroundColor: selMonth === idx ? brand : segBg },
                    ]}
                  >
                    <Text
                      style={[
                        pickStyles.itemText,
                        { color: selMonth === idx ? colors.iconWhite : fg },
                      ]}
                    >
                      {name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {step === 'day' && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {days.map((d) => (
                  <Pressable
                    key={d}
                    onPress={() => handleSelectDay(d)}
                    style={[
                      pickStyles.dayItem,
                      { backgroundColor: selDay === d ? brand : segBg },
                    ]}
                  >
                    <Text
                      style={[
                        pickStyles.itemText,
                        { color: selDay === d ? colors.iconWhite : fg },
                      ]}
                    >
                      {d}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </ScrollView>

          {canConfirm ? (
            <Pressable
              onPress={() => {
                if (selYear !== null && selMonth !== null && selDay !== null) {
                  onSelectDate(toDateString(selYear, selMonth, selDay));
                  onClose();
                }
              }}
              style={{
                marginTop: 16,
                borderRadius: 12,
                backgroundColor: brand,
                paddingVertical: 14,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '700',
                  color: colors.iconWhite,
                }}
              >
                Listo
              </Text>
            </Pressable>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const pickStyles = StyleSheet.create({
  item: {
    width: '30%',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  itemText: { fontSize: 15, fontWeight: '600' },
  dayItem: {
    width: '17%',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
});
