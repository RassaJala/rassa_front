import { useState } from "react";
import { useTheme } from "~/providers/ThemeProvider";
import { getColors } from "~/constants/colors";

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

const FILTER_PASSWORD = /[^a-zA-Z0-9]/g;

function filterPasswordInput(value: string): string {
  return value.replace(FILTER_PASSWORD, "");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ProfileChangePasswordProps {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  passwordError: string | null;
  passwordSuccess: string | null;
  passwordSubmitting: boolean;
  onCurrentPasswordChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onPasswordErrorClear: () => void;
  onSubmit: () => void;
}

export function ProfileChangePassword({
  currentPassword,
  newPassword,
  confirmPassword,
  passwordError,
  passwordSuccess,
  passwordSubmitting,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onPasswordErrorClear,
  onSubmit,
}: ProfileChangePasswordProps) {
  const { resolved } = useTheme();
  const isDark = resolved === "dark";
  const colors = getColors(isDark);
  const { fg, muted, border, surface, bg, coral } = colors;
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const btnStyle = {
    height: 40,
    padding: "0 18px",
    borderRadius: 10,
    border: "none",
    fontSize: 14,
    fontWeight: 600,
    fontFamily: "inherit",
    cursor: "pointer",
    letterSpacing: "0.01em",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  } as const;

  function inputStyle(fieldName: string) {
    return {
      width: "100%" as const,
      height: 44,
      border: `1.5px solid ${focusedField === fieldName ? coral : border}`,
      borderRadius: 10,
      padding: "0 14px",
      fontSize: 15,
      fontFamily: "inherit",
      background: bg,
      color: fg,
      outline: "none",
      boxSizing: "border-box" as const,
    };
  }

  function renderField(label: string, fieldName: string) {
    const value =
      fieldName === "current"
        ? currentPassword
        : fieldName === "new"
          ? newPassword
          : confirmPassword;
    const onChange =
      fieldName === "current"
        ? (v: string) => {
            onCurrentPasswordChange(filterPasswordInput(v));
            onPasswordErrorClear();
          }
        : fieldName === "new"
          ? (v: string) => {
              onNewPasswordChange(filterPasswordInput(v));
              onPasswordErrorClear();
            }
          : (v: string) => {
              onConfirmPasswordChange(filterPasswordInput(v));
              onPasswordErrorClear();
            };

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <label
          style={{
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: muted,
          }}
        >
          {label}
        </label>
        <input
          type="password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={inputStyle(fieldName)}
          onFocus={() => setFocusedField(fieldName)}
          onBlur={() => setFocusedField(null)}
          required
        />
      </div>
    );
  }

  return (
    <div
      style={{
        background: surface,
        borderRadius: 16,
        border: `1px solid ${border}`,
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 18,
      }}
    >
      <h3
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: fg,
          margin: 0,
        }}
      >
        Cambiar Contraseña
      </h3>

      {passwordError && (
        <div
          style={{
            borderRadius: 10,
            border: "1px solid #fca5a5",
            background: isDark ? "#451a1a" : "#fef2f2",
            padding: 12,
            fontSize: 14,
            color: isDark ? "#fca5a5" : "#dc2626",
          }}
        >
          {passwordError}
        </div>
      )}

      {passwordSuccess && (
        <div
          style={{
            borderRadius: 10,
            border: "1px solid #86efac",
            background: isDark ? "#052e16" : "#f0fdf4",
            padding: 12,
            fontSize: 14,
            color: isDark ? "#86efac" : "#16a34a",
          }}
        >
          {passwordSuccess}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {renderField("Contraseña Actual *", "current")}
        {renderField(
          "Nueva Contraseña (8+ caracteres, solo letras y números, 1 mayúscula) *",
          "new",
        )}
        {renderField("Confirmar Nueva Contraseña *", "confirm")}
      </div>

      <div style={{ display: "flex", gap: 10, paddingTop: 8 }}>
        <button
          type="button"
          disabled={passwordSubmitting}
          onClick={onSubmit}
          style={{
            ...btnStyle,
            background: coral,
            color: "#fff",
            opacity: passwordSubmitting ? 0.6 : 1,
          }}
        >
          {passwordSubmitting ? "Cambiando..." : "Cambiar Contraseña"}
        </button>
      </div>
    </div>
  );
}
