# Rassa — Mobile App

App mobile para e-commerce donde agricultores venden sus productos directamente. Construida con Expo (React Native).

## Stack

- **Expo SDK 52** (React Native)
- **React Navigation** (navegación)
- **TanStack Query** (server state)
- **Axios** (HTTP client)
- **NativeWind** (Tailwind para RN)
- **React Native Paper** (UI components)

## Requisitos

- Node.js 18 o superior
- Expo Go (instalada en tu celular)
- (Opcional) `expo-cli` o `npx expo`

## Instalación

```bash
# 1. Clonar el repo (si no lo hiciste)
git clone <repo-url>
cd Rassa

# 2. Instalar dependencias
npm install
# o
yarn install
```

## Ejecutar

```bash
# Iniciar servidor de desarrollo
npx expo start
```

Esto abre Expo Developer Tools. Escaneá el QR con **Expo Go** en tu celular para ver la app al instante.

> Si querés correr en un emulador Android, apretá `a` en la terminal. Para iOS simulador, `i` (solo Mac).

## Configuración

Crear un archivo `.env` en la raíz:

```env
EXPO_PUBLIC_API_URL=http://localhost:8000/api
```

Si estás probando desde un celular físico, cambiá `localhost` por la IP de tu máquina:

```env
EXPO_PUBLIC_API_URL=http://192.168.x.x:8000/api
```

## Estructura

```
Rassa/
├── App.tsx                    # Entry point
├── src/
│   ├── navigation/           # Navegación por rol
│   ├── screens/
│   │   ├── auth/             # Login / Register
│   │   ├── buyer/            # Pantallas de comprador
│   │   ├── farmer/           # Pantallas de agricultor
│   │   ├── admin/            # Panel admin
│   │   └── common/           # Splash, etc.
│   ├── components/ui/        # Componentes reutilizables
│   ├── services/api.ts       # Axios instance con JWT
│   ├── store/AuthContext.tsx  # Estado de autenticación
│   ├── hooks/                # Custom hooks
│   ├── types/                # Tipos compartidos
│   └── constants/            # Colores, temas
├── package.json
├── app.json
└── tsconfig.json
```

## Comandos útiles

```bash
# TypeScript check
npx tsc --noEmit

# Limpiar caché de Expo
npx expo start -c
```
