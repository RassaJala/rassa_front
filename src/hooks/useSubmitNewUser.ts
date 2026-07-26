import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import api from '@/services/api';
import type { UseRegistrationFormReturn } from '@/hooks/useRegistrationForm';
import { parseApiError } from '@/utils/apiErrors';
import { cleanPhoneNumber, validateRegistrationForm } from '@/utils/validation';

interface SubmitNewUserOptions {
  onSuccess?: () => void;
  onError?: (errorMsg: string) => void;
}

export function useSubmitNewUser(options?: SubmitNewUserOptions) {
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string>('');
  const submittingRef = useRef(false);

  const mutation = useMutation({
    mutationFn: async (form: UseRegistrationFormReturn) => {
      const payload = {
        email: form.email.trim(),
        password: form.password,
        telefono: cleanPhoneNumber(form.telefono),
        role: form.role,
        nombre: form.nombre.trim(),
        apellido_paterno: form.apellidoPaterno.trim(),
        apellido_materno: form.apellidoMaterno.trim() || null,
        fecha_nacimiento: form.fechaNacimiento,
        sexo: form.sexo,
        domicilio: form.domicilio.trim(),
        fk_localidad: form.catalog.localidadId as number,
      };

      const endpoint =
        form.role === 'farmer' ? '/auth/create-farmer/' : '/auth/register/';

      return api.post(endpoint, payload, { timeout: 10000 });
    },
    onSuccess: () => {
      submittingRef.current = false;
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      options?.onSuccess?.();
    },
    onError: (error) => {
      submittingRef.current = false;
      const parsedError = parseApiError(error, 'Error al crear el usuario.');
      setServerError(parsedError);
      options?.onError?.(parsedError);
    },
  });

  const submit = async (form: UseRegistrationFormReturn) => {
    if (submittingRef.current || mutation.isPending) return;

    setErrorMessage(null);
    setServerError('');

    const validationError = validateRegistrationForm({
      email: form.email,
      password: form.password,
      telefono: form.telefono,
      nombre: form.nombre,
      apellidoPaterno: form.apellidoPaterno,
      fechaNacimiento: form.fechaNacimiento,
      domicilio: form.domicilio,
      localidadId: form.catalog.localidadId,
    });

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    submittingRef.current = true;
    mutation.mutate(form);
  };

  return {
    submit,
    isSubmitting: mutation.isPending,
    errorMessage,
    serverError,
    setErrorMessage,
    setServerError,
  };
}
