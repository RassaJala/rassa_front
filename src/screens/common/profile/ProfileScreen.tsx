import React, { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { IconButton } from 'react-native-paper';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import DatePickerModal from '@/components/DatePickerModal';
import { useAuth } from '@/store/AuthContext';

import { useProfileColors } from './profileColors';
import ProfileEditForm from './ProfileEditForm';
import ProfileView from './ProfileView';

// ── Component ──────────────────────────────────────────
export default function ProfileScreen(): React.JSX.Element {
  const { user } = useAuth();
  const c = useProfileColors();
  const navigation = useNavigation();

  // ── UI state ───────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [pickerInitialDate, setPickerInitialDate] = useState('');
  const onDatePickedRef = useRef<(date: string) => void>(() => {});

  // ── Render helpers ─────────────────────────────────────
  function renderViewMode(): React.JSX.Element {
    return <ProfileView user={user} />;
  }

  function renderEditForm(): React.JSX.Element {
    return (
      <ProfileEditForm
        user={user}
        onUpdateSuccess={(msg) => {
          setIsEditing(false);
          setSuccessMessage(msg);
        }}
        onCancel={() => {
          setIsEditing(false);
          setErrorMessage(null);
          setSuccessMessage(null);
        }}
        onOpenDatePicker={(currentDate) => {
          setPickerInitialDate(currentDate);
          setIsDatePickerVisible(true);
        }}
        registerDatePicked={(fn) => {
          onDatePickedRef.current = fn;
        }}
      />
    );
  }

  function renderHeader(): React.JSX.Element {
    return (
      <View
        style={{
          paddingTop: 56,
          paddingHorizontal: 20,
          paddingBottom: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Pressable
          onPress={() => {
            if (isEditing) {
              setIsEditing(false);
              setErrorMessage(null);
              setSuccessMessage(null);
            } else {
              navigation.goBack();
            }
          }}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: c.border,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={c.fg} />
        </Pressable>
        <Text
          style={{
            fontSize: 22,
            fontWeight: '700',
            letterSpacing: -0.3,
            color: c.fg,
            flex: 1,
          }}
        >
          {isEditing ? 'Editar Perfil' : 'Mi Perfil'}
        </Text>
        {!isEditing ? (
          <IconButton
            icon="pencil"
            size={22}
            mode="contained"
            containerColor={c.brand}
            iconColor={c.white}
            onPress={() => {
              setIsEditing(true);
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
          />
        ) : null}
      </View>
    );
  }

  function renderFeedback(): React.JSX.Element | null {
    return (
      <>
        {successMessage ? (
          <View
            style={{
              marginBottom: 16,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: c.brand,
              backgroundColor: c.accentBg,
              padding: 14,
            }}
          >
            <Text
              style={{
                textAlign: 'center',
                fontSize: 14,
                fontWeight: '600',
                color: c.brand,
              }}
            >
              {successMessage}
            </Text>
          </View>
        ) : null}
        {errorMessage ? (
          <View
            style={{
              marginBottom: 16,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: c.errorColor,
              backgroundColor: c.errorBg,
              padding: 14,
            }}
          >
            <Text
              style={{
                textAlign: 'center',
                fontSize: 14,
                fontWeight: '600',
                color: c.errorColor,
              }}
            >
              {errorMessage}
            </Text>
          </View>
        ) : null}
      </>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {renderHeader()}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
      >
        {renderFeedback()}
        {isEditing ? renderEditForm() : renderViewMode()}
      </ScrollView>

      <DatePickerModal
        visible={isDatePickerVisible}
        onClose={() => setIsDatePickerVisible(false)}
        onSelectDate={(date) => {
          onDatePickedRef.current(date);
        }}
        initialDate={pickerInitialDate}
      />
    </View>
  );
}
