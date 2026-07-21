export interface Municipio {
  id_municipio: number;
  nombre: string;
}

export interface Localidad {
  id_localidad: number;
  nombre: string;
  municipio_id: number;
}

export interface ProfileForm {
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  email: string;
  telefono: string;
  fecha_nacimiento: string;
  genero: string;
  direccion: string;
  municipio_id: number | null;
  localidad_id: number | null;
  localidad_nombre: string;
  municipio_nombre: string;
}

export interface FieldErrors {
  nombre?: string;
  apellido_paterno?: string;
  apellido_materno?: string;
  telefono?: string;
  fecha_nacimiento?: string;
  genero?: string;
  direccion?: string;
  municipio_id?: string;
  localidad_id?: string;
}
