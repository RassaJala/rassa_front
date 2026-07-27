import { useEffect, useState } from "react";
import { useTheme } from "~/providers/ThemeProvider";
import { getColors } from "~/constants/colors";
import { btnStyle as sharedBtnStyle } from "@/constants/styles";
import { LocationSelector } from "~/components/profile/LocationSelector";
import type {
  FieldErrors,
  Localidad,
  Municipio,
  ProfileFormData as ProfileFormType,
} from "~/components/profile/types";
import { generoOptions } from "~/components/profile/types";

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

const FILTER_NAME = /[^a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s'-]/g;
const FILTER_PHONE = /[^\d]/g;

// Fecha máxima: 18 años atrás (mayoría de edad)
const today = new Date();
const MAX_DATE = new Date(
  today.getFullYear() - 18,
  today.getMonth(),
  today.getDate(),
)
  .toISOString()
  .split("T")[0] as string;
const MIN_DATE = "1900-01-01";

function filterNameInput(value: string): string {
  return value.replace(FILTER_NAME, "");
}

function filterPhoneInput(value: string): string {
  return value.replace(FILTER_PHONE, "");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ProfileFormProps {
  profile: ProfileFormType;
  fieldErrors: FieldErrors;
  municipios: Municipio[];
  localidades: Localidad[];
  loadingMunicipios: boolean;
  loadingLocalidades: boolean;
  catalogError: string | null;
  loading: boolean;
  onChange: (updated: ProfileFormType) => void;
  onClearError: (field: keyof FieldErrors) => void;
  onSave: (e: React.FormEvent) => void;
  onCancel: () => void;
  onLoadMunicipios: () => void;
  onFetchLocalidades: (municipioId: number | null) => Promise<void>;
}

export function ProfileForm({
  profile,
  fieldErrors,
  municipios,
  localidades,
  loadingMunicipios,
  loadingLocalidades,
  catalogError,
  loading,
  onChange,
  onClearError,
  onSave,
  onCancel,
  onLoadMunicipios,
  onFetchLocalidades,
}: ProfileFormProps) {
  const { resolved } = useTheme();
  const isDark = resolved === "dark";
  const colors = getColors(isDark);
  const { fg, muted, border, bg, coral } = colors;
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const btnStyle = sharedBtnStyle;

  // Cargar municipios al montar el formulario de edición
  useEffect(() => {
    onLoadMunicipios();
    if (profile.municipio_id != null) {
      onFetchLocalidades(profile.municipio_id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps — solo al montar
  }, []);

  const handleMunicipioChange = (id: number | null) => {
    onChange({ ...profile, municipio_id: id, localidad_id: null });
    onClearError("municipio_id");
    onClearError("localidad_id");
    onFetchLocalidades(id);
  };

  const handleLocalidadChange = (id: number | null) => {
    onChange({ ...profile, localidad_id: id });
    onClearError("localidad_id");
  };

  function renderField(
    label: string,
    fieldName: string,
    input: React.ReactNode,
  ) {
    const err = fieldErrors[fieldName as keyof FieldErrors];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <label
          htmlFor={fieldName}
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
        {input}
        {err && (
          <p style={{ fontSize: 12, color: "#ef4444", margin: 0 }}>{err}</p>
        )}
      </div>
    );
  }

  function inputStyle(fieldName: string) {
    const err = fieldErrors[fieldName as keyof FieldErrors];
    return {
      width: "100%" as const,
      height: 44,
      border: `1.5px solid ${
        err ? "#ef4444" : focusedField === fieldName ? coral : border
      }`,
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

  return (
    <form
      onSubmit={onSave}
      style={{ display: "flex", flexDirection: "column", gap: 18 }}
    >
      <h3
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: fg,
          margin: 0,
        }}
      >
        Editar Información
      </h3>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 18,
        }}
      >
        {renderField(
          "Nombre *",
          "nombre",
          <input
            type="text"
            id="nombre"
            value={profile.nombre}
            maxLength={100}
            onChange={(e) => {
              onChange({ ...profile, nombre: filterNameInput(e.target.value) });
              onClearError("nombre");
            }}
            style={inputStyle("nombre")}
            onFocus={() => setFocusedField("nombre")}
            onBlur={() => setFocusedField(null)}
            required
          />,
        )}

        {renderField(
          "Apellido Paterno *",
          "apellido_paterno",
          <input
            type="text"
            id="apellido_paterno"
            value={profile.apellido_paterno}
            maxLength={100}
            onChange={(e) => {
              onChange({
                ...profile,
                apellido_paterno: filterNameInput(e.target.value),
              });
              onClearError("apellido_paterno");
            }}
            style={inputStyle("apellido_paterno")}
            onFocus={() => setFocusedField("apellido_paterno")}
            onBlur={() => setFocusedField(null)}
            required
          />,
        )}

        {renderField(
          "Apellido Materno",
          "apellido_materno",
          <input
            type="text"
            id="apellido_materno"
            value={profile.apellido_materno}
            maxLength={100}
            onChange={(e) => {
              onChange({
                ...profile,
                apellido_materno: filterNameInput(e.target.value),
              });
              onClearError("apellido_materno");
            }}
            style={inputStyle("apellido_materno")}
            onFocus={() => setFocusedField("apellido_materno")}
            onBlur={() => setFocusedField(null)}
          />,
        )}

        {renderField(
          "Teléfono *",
          "telefono",
          <input
            type="text"
            id="telefono"
            value={profile.telefono}
            maxLength={10}
            onChange={(e) => {
              onChange({
                ...profile,
                telefono: filterPhoneInput(e.target.value),
              });
              onClearError("telefono");
            }}
            style={inputStyle("telefono")}
            onFocus={() => setFocusedField("telefono")}
            onBlur={() => setFocusedField(null)}
            required
          />,
        )}

        {renderField(
          "Fecha de Nacimiento *",
          "fecha_nacimiento",
          <input
            type="date"
            id="fecha_nacimiento"
            value={profile.fecha_nacimiento}
            min={MIN_DATE}
            max={MAX_DATE}
            onChange={(e) => {
              onChange({ ...profile, fecha_nacimiento: e.target.value });
              onClearError("fecha_nacimiento");
            }}
            style={inputStyle("fecha_nacimiento")}
            onFocus={() => setFocusedField("fecha_nacimiento")}
            onBlur={() => setFocusedField(null)}
            required
          />,
        )}

        {renderField(
          "Género *",
          "genero",
          <select
            id="genero"
            value={profile.genero}
            onChange={(e) => {
              onChange({ ...profile, genero: e.target.value });
              onClearError("genero");
            }}
            style={{
              ...inputStyle("genero"),
              appearance: "auto" as const,
            }}
            onFocus={() => setFocusedField("genero")}
            onBlur={() => setFocusedField(null)}
            required
          >
            <option value="">Seleccionar...</option>
            {generoOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>,
        )}

        <div style={{ gridColumn: "1 / -1" }}>
          {renderField(
            "Dirección *",
            "direccion",
            <input
              type="text"
              id="direccion"
              value={profile.direccion}
              maxLength={255}
              onChange={(e) => {
                onChange({ ...profile, direccion: e.target.value });
                onClearError("direccion");
              }}
              style={inputStyle("direccion")}
              onFocus={() => setFocusedField("direccion")}
              onBlur={() => setFocusedField(null)}
              required
            />,
          )}
        </div>
      </div>

      {/* --- Municipio / Localidad --- */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 18,
        }}
      >
        <LocationSelector
          municipios={municipios}
          localidades={localidades}
          selectedMunicipioId={profile.municipio_id}
          selectedLocalidadId={profile.localidad_id}
          loadingMunicipios={loadingMunicipios}
          loadingLocalidades={loadingLocalidades}
          catalogError={catalogError}
          fieldErrors={fieldErrors}
          onMunicipioChange={handleMunicipioChange}
          onLocalidadChange={handleLocalidadChange}
          onRetryMunicipios={onLoadMunicipios}
        />
      </div>

      <div style={{ display: "flex", gap: 10, paddingTop: 8 }}>
        <button
          type="submit"
          disabled={loading}
          style={{
            ...btnStyle,
            background: coral,
            color: "#fff",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Guardando..." : "Guardar cambios"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            ...btnStyle,
            background: "transparent",
            border: `1.5px solid ${border}`,
            color: fg,
          }}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
