import { getColors } from '~/constants/colors';
import { useTheme } from '~/providers/ThemeProvider';

import { ProfileChangePassword } from '~/components/profile/ProfileChangePassword';
import { ProfileForm } from '~/components/profile/ProfileForm';
import { ProfileView } from '~/components/profile/ProfileView';
import {
    usePasswordChange,
    useProfileCatalog,
    useProfileData,
} from '~/components/profile/hooks';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProfileComponent() {
  const { resolved } = useTheme();
  const isDark = resolved === 'dark';
  const colors = getColors(isDark);
  const { fg, muted, border, surface, bg, coral } = colors;

  const profile = useProfileData();
  const catalog = useProfileCatalog();
  const password = usePasswordChange();

  const btnStyle = {
    height: 40,
    padding: '0 18px',
    borderRadius: 10,
    border: 'none',
    fontSize: 14,
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer',
    letterSpacing: '0.01em',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  } as const;

  // --- Loading ---
  if (profile.fetching) {
    return (
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <h2
            style={{
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: '-0.01em',
              color: fg,
            }}
          >
            Mi Perfil
          </h2>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 0',
            color: muted,
            fontSize: 14,
          }}
        >
          Cargando perfil...
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <h2
          style={{
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: '-0.01em',
            color: fg,
          }}
        >
          Mi Perfil
        </h2>
        {!profile.editing && profile.profile && (
          <button
            onClick={profile.startEditing}
            style={{ ...btnStyle, background: coral, color: '#fff' }}
          >
            Editar perfil
          </button>
        )}
      </div>

      {/* Profile Card */}
      <div
        style={{
          background: surface,
          borderRadius: 16,
          border: `1px solid ${border}`,
          padding: 24,
          maxWidth: 672,
          margin: '0 auto',
        }}
      >
        {profile.error && (
          <div
            style={{
              borderRadius: 10,
              border: '1px solid #fca5a5',
              background: isDark ? '#451a1a' : '#fef2f2',
              padding: 12,
              fontSize: 14,
              color: isDark ? '#fca5a5' : '#dc2626',
              marginBottom: 16,
            }}
          >
            {profile.error}
          </div>
        )}

        {profile.success && (
          <div
            style={{
              borderRadius: 10,
              border: '1px solid #86efac',
              background: isDark ? '#052e16' : '#f0fdf4',
              padding: 12,
              fontSize: 14,
              color: isDark ? '#86efac' : '#16a34a',
              marginBottom: 16,
            }}
          >
            {profile.success}
          </div>
        )}

        {profile.editing && profile.profile ? (
          <ProfileForm
            profile={profile.profile}
            fieldErrors={profile.fieldErrors}
            municipios={catalog.municipios}
            localidades={catalog.localidades}
            loadingMunicipios={catalog.loadingMunicipios}
            loadingLocalidades={catalog.loadingLocalidades}
            catalogError={catalog.catalogError}
            loading={profile.loading}
            onChange={(updated) => profile.setProfile(updated)}
            onClearError={profile.onClearError}
            onSave={profile.handleSave}
            onCancel={profile.cancelEditing}
            onLoadMunicipios={catalog.loadMunicipios}
            onFetchLocalidades={catalog.fetchLocalidades}
          />
        ) : !profile.profile ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16,
              padding: '40px 0',
              textAlign: 'center',
            }}
          >
            <p style={{ color: muted, fontSize: 14 }}>
              No se pudo cargar el perfil.
            </p>
            <button
              onClick={profile.fetchProfile}
              style={{ ...btnStyle, background: coral, color: '#fff' }}
            >
              Reintentar
            </button>
          </div>
        ) : (
          <ProfileView profile={profile.profile} />
        )}
      </div>

      {/* Password change — bloque separado */}
      {password.showPasswordSection ? (
        <div
          style={{
            background: surface,
            borderRadius: 16,
            border: `1px solid ${border}`,
            padding: 24,
            maxWidth: 672,
            margin: '16px auto 0',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <ProfileChangePassword
              currentPassword={password.currentPassword}
              newPassword={password.newPassword}
              confirmPassword={password.confirmPassword}
              passwordError={password.passwordError}
              passwordSuccess={password.passwordSuccess}
              passwordSubmitting={password.passwordSubmitting}
              onCurrentPasswordChange={password.setCurrentPassword}
              onNewPasswordChange={password.setNewPassword}
              onConfirmPasswordChange={password.setConfirmPassword}
              onPasswordErrorClear={() => password.setPasswordError(null)}
              onSubmit={password.handlePasswordChange}
            />
            <button
              type="button"
              onClick={password.closePasswordSection}
              style={{
                ...btnStyle,
                background: 'transparent',
                border: `1.5px solid ${border}`,
                color: fg,
                alignSelf: 'flex-end',
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      ) : (
        !profile.editing &&
        profile.profile && (
          <div
            style={{
              maxWidth: 672,
              margin: '16px auto 0',
            }}
          >
            <button
              type="button"
              onClick={() => password.setShowPasswordSection(true)}
              style={{
                ...btnStyle,
                background: 'transparent',
                border: `1.5px solid ${border}`,
                color: fg,
              }}
            >
              Cambiar contraseña
            </button>
          </div>
        )
      )}
    </div>
  );
}
