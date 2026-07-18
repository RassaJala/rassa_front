import type { Dispatch, SetStateAction } from 'react';
import { useState } from 'react';

import { useCatalogs } from '@/hooks/useCatalogs';
import type { RegisterRole } from '@/types';

export interface UseRegistrationFormReturn {
  email: string;
  setEmail: Dispatch<SetStateAction<string>>;
  password: string;
  setPassword: Dispatch<SetStateAction<string>>;
  telefono: string;
  setTelefono: Dispatch<SetStateAction<string>>;
  role: RegisterRole;
  setRole: Dispatch<SetStateAction<RegisterRole>>;
  nombre: string;
  setNombre: Dispatch<SetStateAction<string>>;
  apellidoPaterno: string;
  setApellidoPaterno: Dispatch<SetStateAction<string>>;
  apellidoMaterno: string;
  setApellidoMaterno: Dispatch<SetStateAction<string>>;
  fechaNacimiento: string;
  setFechaNacimiento: Dispatch<SetStateAction<string>>;
  sexo: 'M' | 'F' | 'O';
  setSexo: Dispatch<SetStateAction<'M' | 'F' | 'O'>>;
  domicilio: string;
  setDomicilio: Dispatch<SetStateAction<string>>;
  catalog: ReturnType<typeof useCatalogs>;
  resetForm: () => void;
}

export function useRegistrationForm(options?: {
  readonly initialRole?: RegisterRole;
}): UseRegistrationFormReturn {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [telefono, setTelefono] = useState('');
  const [role, setRole] = useState<RegisterRole>(
    options?.initialRole ?? 'buyer',
  );
  const [nombre, setNombre] = useState('');
  const [apellidoPaterno, setApellidoPaterno] = useState('');
  const [apellidoMaterno, setApellidoMaterno] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [sexo, setSexo] = useState<'M' | 'F' | 'O'>('M');
  const [domicilio, setDomicilio] = useState('');

  const catalog = useCatalogs();

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setTelefono('');
    setNombre('');
    setApellidoPaterno('');
    setApellidoMaterno('');
    setFechaNacimiento('');
    setSexo('M');
    setDomicilio('');
    catalog.setLocalidadId(null);
    catalog.setLocalidadNombre('');
    catalog.setSelectedMunicipioId(null);
    catalog.setSelectedMunicipioNombre('');
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    telefono,
    setTelefono,
    role,
    setRole,
    nombre,
    setNombre,
    apellidoPaterno,
    setApellidoPaterno,
    apellidoMaterno,
    setApellidoMaterno,
    fechaNacimiento,
    setFechaNacimiento,
    sexo,
    setSexo,
    domicilio,
    setDomicilio,
    catalog,
    resetForm,
  };
}
