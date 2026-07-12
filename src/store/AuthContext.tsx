/* globals console, setTimeout -- Required for React Native logging and timers */

import type { ReactNode } from 'react';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import axios from 'axios';
import type { AxiosError } from 'axios';

import api from '@/services/api';
import * as Storage from '@/services/storage';
import type { User, UserRole } from '@/types';

interface BackendUser {
  id_usuario: number;
  email: string;
  telefono: string | null;
  role: string;
  nombre: string;
  apellido_paterno: string | null;
  apellido_materno: string | null;
  fecha_nacimiento: string | null;
  genero: string | null;
  direccion: string | null;
  localidad: number | null;
  localidad_nombre: string | null;
}

interface LoginResponse {
  access: string;
  refresh: string;
}

const AUTH_LOGIN_ENDPOINT = '/token/';
const AUTH_PROFILE_ENDPOINT = '/auth/me/';

const ACCESS_TOKEN_KEY = Storage.ACCESS_TOKEN_KEY;
const REFRESH_TOKEN_KEY = Storage.REFRESH_TOKEN_KEY;

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (
    email: string,
    password: string,
  ) => Promise<void>;

  logout: () => Promise<void>;
}

interface AuthProviderProps {
  readonly children: ReactNode;
}

const AuthContext =
  createContext<AuthContextType | undefined>(
    undefined,
  );


const ROLE_MAP: Record<string, UserRole> = {

  admin: 'admin',
  administrator: 'admin',
  administrador: 'admin',

  farmer: 'farmer',
  agricultor: 'farmer',
  productor: 'farmer',

  seller: 'seller',
  vendedor: 'seller',

  buyer: 'buyer',
  cliente: 'buyer',
  comprador: 'buyer',

};


function normalizeRole(
  role?: string,
): UserRole {

  const normalized =
    role?.toLowerCase() ?? '';

  const mappedRole =
    ROLE_MAP[normalized];


  if (mappedRole) {
    return mappedRole;
  }


  const message =
    `Rol inválido: "${role}"`;


  console.warn(message);


  throw new Error(message);

}



function mapBackendUser(
  user: Readonly<BackendUser>,
): User {

  const nombre =
    user.nombre ?? '';


  const [
    firstName,
    ...lastNameParts
  ] =
    nombre
      .trim()
      .split(/\s+/);


  return {

    id: user.id_usuario,

    email: user.email,

    username: user.email,

    id_usuario: user.id_usuario,

    telefono: user.telefono,

    role: normalizeRole(
      user.role,
    ),

    first_name:
      firstName ?? '',

    last_name:
      lastNameParts.join(' '),

  };

}



function parseLoginError(
  axiosError: AxiosError<
    Record<string, unknown>
  >,
): string {


  const responseData =
    axiosError.response?.data;


  if (
    typeof responseData === 'string'
  ) {
    return responseData;
  }


  if (responseData?.detail) {
    return String(
      responseData.detail,
    );
  }


  if (
    Array.isArray(
      responseData?.non_field_errors,
    )
  ) {

    return responseData
      .non_field_errors
      .join(' ');

  }


  if (responseData?.message) {
    return String(
      responseData.message,
    );
  }


  return (
    axiosError.message ||
    'Error desconocido'
  );

}



export function AuthProvider(
  {
    children,
  }: Readonly<AuthProviderProps>,
): React.JSX.Element {


  const [
    state,
    setState,
  ] = useState<AuthState>({

    user: null,

    isLoading: true,

    isAuthenticated: false,

  });



  const clearSession =
    useCallback(
      async () => {


        await Promise.all([

          Storage.deleteItemAsync(
            ACCESS_TOKEN_KEY,
          ),

          Storage.deleteItemAsync(
            REFRESH_TOKEN_KEY,
          ),

        ]);


        setState((prev) => ({

          ...prev,

          user: null,

          isAuthenticated: false,

          isLoading: false,

        }));

      },
      [],
    );



  const restoreSession =
    useCallback(
      async () => {


        await new Promise<void>(
          (resolve) => {

            setTimeout(
              resolve,
              3000,
            );

          },
        );



        try {


          const token =
            await Storage.getItemAsync(
              ACCESS_TOKEN_KEY,
            );


          if (!token) {

            setState((prev) => ({

              ...prev,

              isLoading: false,

            }));

            return;

          }



          const {
            data,
          } =
            await api.get<{
              data: BackendUser;
            }>(
              AUTH_PROFILE_ENDPOINT,
            );



          const userData =
            mapBackendUser(
              data.data,
            );



          setState((prev) => ({

            ...prev,

            user: userData,

            isLoading: false,

            isAuthenticated: true,

          }));



        } catch (error) {


          if (
            axios.isAxiosError(error) &&
            error.response?.status === 401
          ) {

            await clearSession();

            return;

          }



          setState((prev) => ({

            ...prev,

            isLoading: false,

          }));

        }


      },
      [
        clearSession,
      ],
    );



  useEffect(() => {

    void restoreSession();

  }, [restoreSession]);





  const login =
    useCallback(
      async (
        email: string,
        password: string,
      ) => {


        try {


          const {
            data,
          } =
            await api.post<LoginResponse>(
              AUTH_LOGIN_ENDPOINT,
              {
                email,
                password,
              },
            );



          await Promise.all([

            Storage.setItemAsync(
              ACCESS_TOKEN_KEY,
              data.access,
            ),

            Storage.setItemAsync(
              REFRESH_TOKEN_KEY,
              data.refresh,
            ),

          ]);



          const {
            data: profile,
          } =
            await api.get<{
              data: BackendUser;
            }>(
              AUTH_PROFILE_ENDPOINT,
            );



          const userData =
            mapBackendUser(
              profile.data,
            );



          setState((prev) => ({

            ...prev,

            user: userData,

            isLoading: false,

            isAuthenticated: true,

          }));


        } catch (error) {


          if (
            axios.isAxiosError(error)
          ) {


            const message =
              parseLoginError(
                error as AxiosError<
                  Record<string, unknown>
                >,
              );



            console.error(message);



            throw new Error(
              message,
              {
                cause: error,
              },
            );

          }



          if (error instanceof Error) {

            throw new Error(
              error.message,
              {
                cause: error,
              },
            );

          }



          throw new Error(
            'Error desconocido de autenticación',
            {
              cause: error,
            },
          );


        }


      },
      [],
    );





  const logout =
    useCallback(
      async () => {

        await clearSession();

      },
      [
        clearSession,
      ],
    );





  return (

    <AuthContext.Provider

      value={
        useMemo(
          () => ({

            ...state,

            login,

            logout,

          }),

          [
            state,
            login,
            logout,
          ],

        )
      }

    >

      {children}

    </AuthContext.Provider>

  );

}




export function useAuth():
AuthContextType {


  const ctx =
    useContext(
      AuthContext,
    );


  if (!ctx) {

    throw new Error(
      'useAuth must be used within AuthProvider',
    );

  }


  return ctx;

}