import React, { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import DatePickerModal from '@/components/DatePickerModal';
import { useAuth } from '@/store/AuthContext';

import FeedbackBanner from './FeedbackBanner';
import { useProfileColors } from './profileColors';
import ProfileEditForm from './ProfileEditForm';
import ProfileView from './ProfileView';

// ── Component ──────────────────────────────────────────
export default function ProfileScreen(): React.JSX.Element {
  const { user } = useAuth();
  const c = useProfileColors();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // ── UI state ───────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [pickerInitialDate, setPickerInitialDate] = useState('');
  const onDatePickedRef = useRef<(date: string) => void>(() => {});

  // Stable callback — prevents unnecessary re-execution of ProfileEditForm's useEffect
  const handleRegisterDatePicked = useCallback(
    (fn: (date: string) => void) => {
      onDatePickedRef.current = fn;
    },
    [],
  );

  // ── Render helpers ─────────────────────────────────────
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
        registerDatePicked={handleRegisterDatePicked}
      />
    );
  }

  function renderHeader(): React.JSX.Element {
    return (
      <View
        style={{
          paddingTop: insets.top + 16,
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
            testID="edit-profile-button"
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
        <FeedbackBanner type="success" message={successMessage} colors={c} />
        <FeedbackBanner type="error" message={errorMessage} colors={c} />
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
        {isEditing ? renderEditForm() : <ProfileView user={user} />}
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
