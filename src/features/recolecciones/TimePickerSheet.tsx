import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '@/constants/colors';

import BottomSheetModal from './BottomSheetModal';
import { hexWithAlpha } from './utils';

interface TimePickerSheetProps {
  readonly currentValue: string;
  readonly title: string;
  readonly fg: string;
  readonly muted: string;
  readonly border: string;
  readonly surface: string;
  readonly brand: string;
  readonly white: string;
  readonly redCoral: string;
  readonly onClose: () => void;
  readonly onSelect: (timeStr: string) => void;
}

export default function TimePickerSheet({
  currentValue,
  title,
  fg,
  muted,
  border,
  surface,
  brand,
  white,
  redCoral,
  onClose,
  onSelect,
}: TimePickerSheetProps): React.JSX.Element {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutesList = ['00', '15', '30', '45'];

  const brandAlpha = hexWithAlpha(brand, 0.1);

  const [selectedHour, setSelectedHour] = useState(
    currentValue ? parseInt(currentValue.split(':')[0] ?? '0', 10) : 8,
  );
  const [selectedMinute, setSelectedMinute] = useState(
    currentValue ? (currentValue.split(':')[1] ?? '00') : '00',
  );

  return (
    <BottomSheetModal
      title={title}
      maxHeight="60%"
      fg={fg}
      redCoral={redCoral}
      surface={surface}
      onClose={onClose}
    >
      <View style={{ flexDirection: 'row', height: 200 }}>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              textAlign: 'center',
              fontSize: 12,
              fontWeight: '600',
              color: muted,
              marginBottom: 8,
            }}
          >
            Hora
          </Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {hours.map((h) => (
              <TouchableOpacity
                key={h}
                onPress={() => setSelectedHour(h)}
                style={{
                  paddingVertical: 10,
                  alignItems: 'center',
                  borderRadius: 8,
                  marginVertical: 2,
                  backgroundColor:
                    selectedHour === h ? brandAlpha : colors.transparent,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: selectedHour === h ? brand : fg,
                  }}
                >
                  {String(h).padStart(2, '0')}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              textAlign: 'center',
              fontSize: 12,
              fontWeight: '600',
              color: muted,
              marginBottom: 8,
            }}
          >
            Minutos
          </Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {minutesList.map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => setSelectedMinute(m)}
                style={{
                  paddingVertical: 10,
                  alignItems: 'center',
                  borderRadius: 8,
                  marginVertical: 2,
                  backgroundColor:
                    selectedMinute === m ? brandAlpha : colors.transparent,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: selectedMinute === m ? brand : fg,
                  }}
                >
                  {m}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      <View
        style={{
          marginTop: 16,
          borderTopWidth: 1,
          borderTopColor: border,
          paddingTop: 12,
          alignItems: 'flex-end',
        }}
      >
        <TouchableOpacity
          onPress={() => {
            const h = String(selectedHour).padStart(2, '0');
            onSelect(`${h}:${selectedMinute}`);
          }}
          style={{
            borderRadius: 8,
            paddingHorizontal: 24,
            paddingVertical: 10,
            backgroundColor: brand,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: '700', color: white }}>
            Seleccionar
          </Text>
        </TouchableOpacity>
      </View>
    </BottomSheetModal>
  );
}
