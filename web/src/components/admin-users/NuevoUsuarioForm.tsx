import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { colors as webColors } from '../../constants/colors';
import { useCatalogs } from '../../hooks/useCatalogs';
import api from '../../services/api';
import { parseApiError } from '../../utils/apiErrors';
import {
  cleanAddress,
  cleanName,
  cleanPhoneNumber,
  validateRegistrationForm,
} from '../../utils/validation';
import UserFormActions from './UserFormActions';
import UserFormFields from './UserFormFields';
import UserRoleSelector from './UserRoleSelector';

interface FormColors {
  readonly fg: string;
  readonly muted: string;
  readonly border: string;
  readonly bg: string;
  readonly brand: string;
  readonly coral: string;
  readonly surface: string;
}

interface NuevoUsuarioFormProps {
  readonly colors: FormColors;
  readonly isDark: boolean;
  readonly onCreated: () => void;
  readonly showToast: (message: string, type: 'success' | 'error') => void;
}

export default function NuevoUsuarioForm({
  colors,
  isDark,
  onCreated,
  showToast,
}: NuevoUsuarioFormProps): React.JSX.Element {
  const { fg, muted, border, bg, brand, coral, surface } = colors;
  const queryClient = useQueryClient();
  const catalogs = useCatalogs();
  const [formNombre, setFormNombre] = useState('');
  const [formApePat, setFormApePat] = useState('');
  const [formApeMat, setFormApeMat] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formTelefono, setFormTelefono] = useState('');
  const [formFechaNac, setFormFechaNac] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [formSexo, setFormSexo] = useState<'M' | 'F' | 'O'>('M');
  const [formDomicilio, setFormDomicilio] = useState('');
  const [formRole, setFormRole] = useState<'farmer' | 'seller' | 'buyer'>(
    'buyer',
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [formFocused, setFormFocused] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api.post(
        formRole === 'farmer' ? '/auth/create-farmer/' : '/auth/register/',
        payload,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      showToast('Usuario creado correctamente', 'success');
      onCreated();
    },
    onError: (err: unknown) => {
      setFormError(parseApiError(err, 'Error al crear el usuario.'));
    },
  });

  function handleCreateUser() {
    if (createMutation.isPending) return;
    setFormError(null);

    const validationError = validateRegistrationForm({
      email: formEmail,
      password: formPassword,
      telefono: formTelefono,
      nombre: formNombre,
      apellidoPaterno: formApePat,
      fechaNacimiento: formFechaNac,
      domicilio: formDomicilio,
      localidadId: catalogs.localidadId,
    });
    if (validationError) {
      setFormError(validationError);
      return;
    }
    if (!formSexo) {
      setFormError('Seleccioná un género.');
      return;
    }

    const basePayload: Record<string, unknown> = {
      email: formEmail.trim(),
      password: formPassword,
      nombre: cleanName(formNombre),
      apellido_paterno: cleanName(formApePat),
      apellido_materno: formApeMat.trim() ? cleanName(formApeMat) : null,
      telefono: cleanPhoneNumber(formTelefono),
      fecha_nacimiento: formFechaNac,
      sexo: formSexo,
      domicilio: cleanAddress(formDomicilio),
      fk_localidad: catalogs.localidadId,
    };
    if (formRole !== 'farmer') basePayload.role = formRole;
    createMutation.mutate(basePayload);
  }

  return (
    <div
      style={{
        background: surface,
        borderRadius: 16,
        border: `1px solid ${border}`,
        padding: 20,
      }}
    >
      <h3
        style={{ fontSize: 18, fontWeight: 700, color: fg, marginBottom: 16 }}
      >
        Nuevo usuario
      </h3>

      <UserRoleSelector
        formRole={formRole}
        setFormRole={setFormRole}
        roleColors={{
          farmer: webColors.primary,
          seller: webColors.accent,
          buyer: webColors.info,
        }}
        muted={muted}
        border={border}
      />

      <UserFormFields
        formNombre={formNombre}
        setFormNombre={setFormNombre}
        formApePat={formApePat}
        setFormApePat={setFormApePat}
        formApeMat={formApeMat}
        setFormApeMat={setFormApeMat}
        formEmail={formEmail}
        setFormEmail={setFormEmail}
        formPassword={formPassword}
        setFormPassword={setFormPassword}
        formTelefono={formTelefono}
        setFormTelefono={setFormTelefono}
        formFechaNac={formFechaNac}
        setFormFechaNac={setFormFechaNac}
        formSexo={formSexo}
        setFormSexo={setFormSexo}
        formDomicilio={formDomicilio}
        setFormDomicilio={setFormDomicilio}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        showDatePicker={showDatePicker}
        setShowDatePicker={setShowDatePicker}
        formFocused={formFocused}
        setFormFocused={setFormFocused}
        formError={formError}
        isDark={isDark}
        fg={fg}
        muted={muted}
        border={border}
        bg={bg}
        brand={brand}
        coral={coral}
        catalogs={catalogs}
      />

      <UserFormActions
        isPending={createMutation.isPending}
        onSave={handleCreateUser}
        onCancel={onCreated}
        fg={fg}
        border={border}
        coral={coral}
      />
    </div>
  );
}
