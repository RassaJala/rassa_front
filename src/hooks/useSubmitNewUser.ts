import { useRef, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { UseRegistrationFormReturn } from '@/hooks/useRegistrationForm';
import api from '@/services/api';
import type { RegisterPayload } from '@/types';
import { parseApiError } from '@/utils/apiErrors';
import {
  buildRegistrationPayload,
  validateRegistrationForm,
} from '@/utils/validation';

interface SubmitNewUserOptions {
  readonly onSuccess?: () => void;
  readonly onError?: (errorMsg: string) => void;
  readonly submitFn?: (payload: RegisterPayload) => Promise<unknown>;
}

export interface UseSubmitNewUserReturn {
  readonly submit: (form: UseRegistrationFormReturn) => Promise<void>;
  readonly isSubmitting: boolean;
  readonly errorMessage: string | null;
  readonly serverError: string;
  readonly setErrorMessage: (msg: string | null) => void;
  readonly setServerError: (msg: string) => void;
}

export function useSubmitNewUser(
  options?: SubmitNewUserOptions,
): UseSubmitNewUserReturn {
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string>('');
  const submittingRef = useRef(false);

  const mutation = useMutation({
    mutationFn: async (form: UseRegistrationFormReturn) => {
      const payload = buildRegistrationPayload({
        email: form.email,
        password: form.password,
        role: form.role,
        telefono: form.telefono,
        nombre: form.nombre,
        apellidoPaterno: form.apellidoPaterno,
        apellidoMaterno: form.apellidoMaterno,
        fechaNacimiento: form.fechaNacimiento,
        sexo: form.sexo,
        domicilio: form.domicilio,
        localidadId: form.catalog.localidadId,
      }) as unknown as RegisterPayload;

      if (options?.submitFn) {
        return options.submitFn(payload);
      }

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
