import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuth } from '@/store/AuthContext';
import type { AdminStackParamList } from '@/types';

import AdminProfileEditForm from './profile/AdminProfileEditForm';
import AdminProfileView from './profile/AdminProfileView';
import { useProfileColors } from './profile/profileColors';

type Nav = NativeStackNavigationProp<AdminStackParamList, 'AdminProfile'>;

interface Props {
  readonly navigation: Nav;
}

export default function AdminProfileScreen({
  navigation,
}: Props): React.JSX.Element {
  const { user } = useAuth();
  const c = useProfileColors();

  // ── UI state ───────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ── Render helpers ─────────────────────────────────────
  function renderViewMode(): React.JSX.Element {
    return (
      <AdminProfileView
        user={user}
      />
    );
  }

  function renderEditForm(): React.JSX.Element {
    return (
      <AdminProfileEditForm
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
          <Pressable
            onPress={() => {
              setIsEditing(true);
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              borderRadius: 14,
              backgroundColor: c.brand,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <MaterialCommunityIcons name="pencil" size={22} color={c.white} />
          </Pressable>
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
    </View>
  );
}
